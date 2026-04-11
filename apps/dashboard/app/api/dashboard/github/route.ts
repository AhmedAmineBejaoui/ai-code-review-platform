import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

import {
  addIssueComment,
  createBranch,
  createFolder,
  createOrUpdateFile,
  createPullRequest,
  createPullRequestInlineComment,
  createPullRequestReview,
  deleteFile,
  deletePath,
  fetchFileContent,
  getGithubUser,
  getPullRequest,
  getPullRequestFiles,
  getRepository,
  getRepoTree,
  isUserAllowedInScope,
  listBranches,
  listPRComments,
  listPullRequests,
  mergePullRequest,
  renamePath,
  resolveGithubTokenForUser,
} from "../../../../lib/github-client"

export const dynamic = "force-dynamic"

type ScopeContext = {
  orgId: string | null
  orgSlug: string | null
}

function envFlag(value: string | null | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase())
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback
}

function num(v: unknown): number {
  if (typeof v === "number") return v
  const n = Number(v)
  return Number.isFinite(n) ? n : Number.NaN
}

function parseTeamOwnerMap(raw: string): Map<string, Set<string>> {
  const entries = raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const map = new Map<string, Set<string>>()
  for (const entry of entries) {
    const [key, ownersRaw] = entry.split("=").map((part) => part.trim())
    if (!key || !ownersRaw) continue
    const owners = ownersRaw
      .split("|")
      .map((owner) => owner.trim().toLowerCase())
      .filter(Boolean)
    if (!owners.length) continue
    map.set(key.toLowerCase(), new Set(owners))
  }
  return map
}

const REQUIRE_ORG_CONTEXT = envFlag(
  process.env.DASHBOARD_GITHUB_REQUIRE_ORG_CONTEXT ??
    process.env.CLERK_ORGANIZATIONS_ENFORCED,
)
const ENFORCE_OWNER_MATCH = envFlag(
  process.env.DASHBOARD_GITHUB_ENFORCE_OWNER_MATCH,
)
const TEAM_OWNER_MAP = parseTeamOwnerMap(
  process.env.DASHBOARD_GITHUB_TEAM_OWNER_MAP ?? "",
)

function permissionError(message: string): Error & { status?: number } {
  const err: Error & { status?: number } = new Error(message)
  err.status = 403
  return err
}

function resolveAllowedOwners(scope: ScopeContext): Set<string> | null {
  const orgId = scope.orgId?.toLowerCase()
  const orgSlug = scope.orgSlug?.toLowerCase()

  if (orgId && TEAM_OWNER_MAP.has(orgId)) {
    return TEAM_OWNER_MAP.get(orgId) ?? null
  }
  if (orgSlug && TEAM_OWNER_MAP.has(orgSlug)) {
    return TEAM_OWNER_MAP.get(orgSlug) ?? null
  }
  return null
}

function assertOwnerAllowedInScope(owner: string, scope: ScopeContext): void {
  if (REQUIRE_ORG_CONTEXT && !scope.orgId) {
    throw permissionError(
      "Organization context is required to access GitHub repositories.",
    )
  }

  const normalizedOwner = owner.trim().toLowerCase()
  const allowedOwners = resolveAllowedOwners(scope)
  if (allowedOwners && !allowedOwners.has(normalizedOwner)) {
    throw permissionError(
      `Repository owner ${owner} is outside the current team scope.`,
    )
  }

  if (
    !allowedOwners &&
    ENFORCE_OWNER_MATCH &&
    scope.orgSlug &&
    normalizedOwner !== scope.orgSlug.trim().toLowerCase()
  ) {
    throw permissionError(
      `Repository owner ${owner} does not match the active organization ${scope.orgSlug}.`,
    )
  }
}

function hasRepositoryWritePermission(repository: Awaited<ReturnType<typeof getRepository>>): boolean {
  const permissions = repository.permissions
  if (!permissions) {
    return true
  }
  return Boolean(permissions.admin || permissions.maintain || permissions.push)
}

async function ensureRepositoryAccess(params: {
  token: string | null
  owner: string
  repo: string
  scope: ScopeContext
  requireWrite?: boolean
}) {
  const { token, owner, repo, scope, requireWrite = false } = params
  if (!token) {
    throw permissionError(
      "GitHub token not available. Connect your GitHub account in profile settings.",
    )
  }

  const githubUser = await getGithubUser(token)
  const username = githubUser?.login
  if (!username) {
    throw permissionError("GitHub user login could not be resolved.")
  }

  const allowed = await isUserAllowedInScope(token, username)
  if (!allowed) {
    throw permissionError("User is not a member of the allowed GitHub scope.")
  }

  assertOwnerAllowedInScope(owner, scope)

  const repository = await getRepository(owner, repo, token)
  if (requireWrite && !hasRepositoryWritePermission(repository)) {
    throw permissionError(
      `Write access is required on ${owner}/${repo} for this action.`,
    )
  }

  return {
    repository,
    username,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId, orgSlug } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const action = str((body as Record<string, unknown>).action)
    const payload = ((body as Record<string, unknown>).payload ?? {}) as Record<
      string,
      unknown
    >
    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 })
    }

    const token = await resolveGithubTokenForUser(userId)
    const scope: ScopeContext = {
      orgId: orgId ?? null,
      orgSlug: orgSlug ?? null,
    }

    switch (action) {
      case "get_tree": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        if (!owner || !repo) {
          return NextResponse.json(
            { error: "Missing: owner, repo" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const ref = str(payload.ref) || repository.default_branch || "main"
        const tree = await getRepoTree(owner, repo, ref, token)
        return NextResponse.json({ ok: true, tree }, { status: 200 })
      }

      case "get_file": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const path = str(payload.path)
        if (!owner || !repo || !path) {
          return NextResponse.json(
            { error: "Missing: owner, repo, path" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const ref = str(payload.ref) || repository.default_branch || "main"
        const result = await fetchFileContent(owner, repo, path, ref, token)
        return NextResponse.json({ ok: true, ...result }, { status: 200 })
      }

      case "commit_file": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const path = str(payload.path)
        const content =
          typeof payload.content === "string" ? payload.content : undefined
        if (!owner || !repo || !path || content === undefined) {
          return NextResponse.json(
            { error: "Missing: owner, repo, path, content" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const branch = str(payload.branch) || repository.default_branch || "main"
        const message = str(payload.message) || undefined

        try {
          const result = await createOrUpdateFile({
            owner,
            repo,
            path,
            content,
            branch,
            message,
            token,
          })
          return NextResponse.json({ ok: true, result }, { status: 200 })
        } catch (error: unknown) {
          const err = error as { body?: { conflict?: boolean }; status?: number }
          if (err?.body?.conflict) {
            return NextResponse.json(
              { error: "conflict", details: err.body },
              { status: 409 },
            )
          }
          throw error
        }
      }

      case "delete_file": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const path = str(payload.path)
        if (!owner || !repo || !path) {
          return NextResponse.json(
            { error: "Missing: owner, repo, path" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const branch = str(payload.branch) || repository.default_branch || "main"
        const message = str(payload.message) || undefined

        const result = await deleteFile({
          owner,
          repo,
          path,
          branch,
          message,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "force_commit_file": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const path = str(payload.path)
        const content =
          typeof payload.content === "string" ? payload.content : undefined
        if (!owner || !repo || !path || content === undefined) {
          return NextResponse.json(
            { error: "Missing: owner, repo, path, content" },
            { status: 400 },
          )
        }

        const { repository, username } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const newBranch =
          str(payload.newBranch) || `ai-edit/${username}/${Date.now()}`
        const message = str(payload.message) || `Update ${path}`

        try {
          await createBranch({
            owner,
            repo,
            newBranch,
            baseBranch: repository.default_branch || "main",
            token,
          })
        } catch (error: unknown) {
          const err = error as { status?: number }
          if (!err?.status || err.status < 400 || err.status >= 500) {
            throw error
          }
        }

        const result = await createOrUpdateFile({
          owner,
          repo,
          path,
          content,
          branch: newBranch,
          message,
          token,
        })

        return NextResponse.json(
          { ok: true, branch: newBranch, result },
          { status: 201 },
        )
      }

      case "create_folder": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const path = str(payload.path)
        if (!owner || !repo || !path) {
          return NextResponse.json(
            { error: "Missing: owner, repo, path" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const branch = str(payload.branch) || repository.default_branch || "main"
        const message = str(payload.message) || undefined

        const result = await createFolder({
          owner,
          repo,
          path,
          branch,
          message,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "rename_path": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const oldPath = str(payload.oldPath)
        const newPath = str(payload.newPath)
        if (!owner || !repo || !oldPath || !newPath) {
          return NextResponse.json(
            { error: "Missing: owner, repo, oldPath, newPath" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const branch = str(payload.branch) || repository.default_branch || "main"
        const message = str(payload.message) || undefined

        const result = await renamePath({
          owner,
          repo,
          oldPath,
          newPath,
          branch,
          message,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "delete_path": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const path = str(payload.path)
        if (!owner || !repo || !path) {
          return NextResponse.json(
            { error: "Missing: owner, repo, path" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const branch = str(payload.branch) || repository.default_branch || "main"
        const message = str(payload.message) || undefined

        const result = await deletePath({
          owner,
          repo,
          path,
          branch,
          message,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "create_branch": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const newBranch = str(payload.newBranch)
        if (!owner || !repo || !newBranch) {
          return NextResponse.json(
            { error: "Missing: owner, repo, newBranch" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const baseBranch =
          str(payload.baseBranch) || repository.default_branch || "main"

        const result = await createBranch({
          owner,
          repo,
          newBranch,
          baseBranch,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "list_branches": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        if (!owner || !repo) {
          return NextResponse.json(
            { error: "Missing: owner, repo" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const result = await listBranches(owner, repo, token)
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "create_pr": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const title = str(payload.title)
        const head = str(payload.head)
        if (!owner || !repo || !title || !head) {
          return NextResponse.json(
            { error: "Missing: owner, repo, title, head" },
            { status: 400 },
          )
        }

        const { repository } = await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const base = str(payload.base) || repository.default_branch || "main"
        const bodyText = str(payload.body) || undefined

        const result = await createPullRequest({
          owner,
          repo,
          title,
          head,
          base,
          body: bodyText,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "list_prs": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const state = str(payload.state) || "open"
        if (!owner || !repo) {
          return NextResponse.json(
            { error: "Missing: owner, repo" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const result = await listPullRequests(owner, repo, state, token)
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "get_pr": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const pullNumber = num(payload.pullNumber)
        if (!owner || !repo || !Number.isFinite(pullNumber)) {
          return NextResponse.json(
            { error: "Missing: owner, repo, pullNumber" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const result = await getPullRequest(owner, repo, pullNumber, token)
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "get_pr_files": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const pullNumber = num(payload.pullNumber)
        if (!owner || !repo || !Number.isFinite(pullNumber)) {
          return NextResponse.json(
            { error: "Missing: owner, repo, pullNumber" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const result = await getPullRequestFiles(owner, repo, pullNumber, token)
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "merge_pr": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const pullNumber = num(payload.pullNumber)
        const mergeMethod = (str(payload.mergeMethod) || "merge") as
          | "merge"
          | "squash"
          | "rebase"
        const commitTitle = str(payload.commitTitle) || undefined
        if (!owner || !repo || !Number.isFinite(pullNumber)) {
          return NextResponse.json(
            { error: "Missing: owner, repo, pullNumber" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
          requireWrite: true,
        })
        const result = await mergePullRequest({
          owner,
          repo,
          pullNumber,
          mergeMethod,
          commitTitle,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "submit_pr_review": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const pullNumber = num(payload.pullNumber)
        const event = str(payload.event)
        const bodyText = str(payload.body) || undefined
        if (!owner || !repo || !Number.isFinite(pullNumber) || !event) {
          return NextResponse.json(
            { error: "Missing: owner, repo, pullNumber, event" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const result = await createPullRequestReview({
          owner,
          repo,
          pullNumber,
          event,
          body: bodyText,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "add_comment": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const issueNumber = num(payload.issueNumber)
        const bodyText = str(payload.body)
        if (!owner || !repo || !Number.isFinite(issueNumber) || !bodyText) {
          return NextResponse.json(
            { error: "Missing: owner, repo, issueNumber, body" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const result = await addIssueComment({
          owner,
          repo,
          issueNumber,
          body: bodyText,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "pr_inline_comment": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const pullNumber = num(payload.pullNumber)
        const path = str(payload.path)
        const startLine = payload.startLine ? num(payload.startLine) : undefined
        const endLine = payload.endLine ? num(payload.endLine) : undefined
        const bodyText = str(payload.body)
        if (
          !owner ||
          !repo ||
          !Number.isFinite(pullNumber) ||
          !path ||
          !bodyText
        ) {
          return NextResponse.json(
            { error: "Missing: owner, repo, pullNumber, path, body" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const result = await createPullRequestInlineComment({
          owner,
          repo,
          pullNumber,
          path,
          startLine,
          endLine,
          body: bodyText,
          token,
        })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "list_pr_comments": {
        const owner = str(payload.owner)
        const repo = str(payload.repo)
        const pullNumber = num(payload.pullNumber)
        if (!owner || !repo || !Number.isFinite(pullNumber)) {
          return NextResponse.json(
            { error: "Missing: owner, repo, pullNumber" },
            { status: 400 },
          )
        }

        await ensureRepositoryAccess({
          token,
          owner,
          repo,
          scope,
        })
        const result = await listPRComments(owner, repo, pullNumber, token)
        return NextResponse.json({ ok: true, ...result }, { status: 200 })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; body?: unknown }
    console.error("dashboard github route error", err?.message ?? error)
    return NextResponse.json(
      {
        error: err?.message ?? "Internal server error",
        details: err?.body ?? null,
      },
      { status: err?.status ?? 500 },
    )
  }
}
