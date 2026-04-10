import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import {
  resolveGithubTokenForUser,
  getGithubUser,
  isUserAllowedInScope,
  createBranch,
  createOrUpdateFile,
  createPullRequest,
  listPullRequests,
  createPullRequestReview,
  createPullRequestInlineComment,
  addIssueComment,
} from "../../../../lib/github-client"

export const dynamic = "force-dynamic"

async function ensureWriteAccess(token: string | null) {
  if (!token) {
    const err: any = new Error("GitHub token not available")
    err.status = 403
    throw err
  }
  const ghUser = await getGithubUser(token).catch((e) => {
    const err: any = new Error("Unable to resolve GitHub user from token")
    err.status = 403
    throw err
  })
  const username = (ghUser as any)?.login
  if (!username) {
    const err: any = new Error("GitHub user missing login")
    err.status = 403
    throw err
  }
  const allowed = await isUserAllowedInScope(token, username)
  if (!allowed) {
    const err: any = new Error("User is not a member of allowed team/org")
    err.status = 403
    throw err
  }
  return username
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const action = (body as any).action as string | undefined
    const payload = (body as any).payload as Record<string, unknown> | undefined
    if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 })

    const token = await resolveGithubTokenForUser(userId)
    if (!token) {
      return NextResponse.json({ error: "GitHub token not available. Connect your GitHub account in profile settings." }, { status: 403 })
    }

    switch (action) {
      case "create_branch": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const newBranch = String(payload?.newBranch ?? "").trim()
        const baseBranch = payload?.baseBranch ? String(payload.baseBranch) : undefined
        if (!owner || !repo || !newBranch) {
          return NextResponse.json({ error: "Missing fields: owner, repo, newBranch" }, { status: 400 })
        }
        await ensureWriteAccess(token)
        const result = await createBranch({ owner, repo, newBranch, baseBranch, token })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "commit_file": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const path = String(payload?.path ?? "").trim()
        const content = typeof payload?.content === "string" ? payload.content : undefined
        const branch = String(payload?.branch ?? "").trim()
        const message = payload?.message ? String(payload.message) : undefined

        if (!owner || !repo || !path || !content || !branch) {
          return NextResponse.json({ error: "Missing fields: owner, repo, path, content, branch" }, { status: 400 })
        }

        await ensureWriteAccess(token)
        try {          const result = await createOrUpdateFile({ owner, repo, path, content, branch, message, token })          return NextResponse.json({ ok: true, result }, { status: 200 })        } catch (e: any) {          if (e?.body?.conflict) {            return NextResponse.json({ error: "conflict", details: e.body }, { status: 409 })          }          throw e        }
      }

      case "force_commit_file": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const path = String(payload?.path ?? "").trim()
        const content = typeof payload?.content === "string" ? payload.content : undefined
        const newBranch = payload?.newBranch ? String(payload.newBranch) : undefined
        const message = payload?.message ? String(payload.message) : undefined
        if (!owner || !repo || !path || !content) {
          return NextResponse.json({ error: "Missing fields: owner, repo, path, content" }, { status: 400 })
        }
        // ensure user can write and obtain username for branch naming
        const username = await ensureWriteAccess(token)
        const branchName = newBranch || `ai-edit/${username}/${Date.now()}`
        try {
          await createBranch({ owner, repo, newBranch: branchName, token })
        } catch (e: any) {
          // if branch already exists, proceed
          if (e?.status && e.status >= 400 && e.status < 500) {
            // ignore create branch error and proceed to commit
          } else {
            throw e
          }
        }
        const result = await createOrUpdateFile({ owner, repo, path, content, branch: branchName, message: message ?? `Force commit ${path}`, token })
        return NextResponse.json({ ok: true, branch: branchName, result }, { status: 201 })
      }

      case "create_pr": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const title = String(payload?.title ?? "").trim()
        const head = String(payload?.head ?? "").trim()
        const base = payload?.base ? String(payload.base) : undefined
        const bodyText = payload?.body ? String(payload.body) : undefined

        if (!owner || !repo || !title || !head) {
          return NextResponse.json({ error: "Missing fields: owner, repo, title, head" }, { status: 400 })
        }

        await ensureWriteAccess(token)
        const result = await createPullRequest({ owner, repo, title, head, base, body: bodyText, token })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "add_comment": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const issueNumberRaw = payload?.issueNumber
        const bodyText = payload?.body ? String(payload.body) : undefined

        const issueNumber = typeof issueNumberRaw === "number" ? issueNumberRaw : issueNumberRaw ? Number(issueNumberRaw) : NaN
        if (!owner || !repo || !Number.isFinite(issueNumber) || !bodyText) {
          return NextResponse.json({ error: "Missing fields: owner, repo, issueNumber, body" }, { status: 400 })
        }

        await ensureWriteAccess(token)
        const result = await addIssueComment({ owner, repo, issueNumber, body: bodyText, token })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "list_prs": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const state = String(payload?.state ?? "open").trim()
        if (!owner || !repo) {
          return NextResponse.json({ error: "Missing fields: owner, repo" }, { status: 400 })
        }
        await ensureWriteAccess(token)
        const result = await listPullRequests(owner, repo, state, token)
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "submit_pr_review": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const pullNumberRaw = payload?.pullNumber
        const event = String(payload?.event ?? "").trim()
        const bodyText = payload?.body ? String(payload.body) : undefined
        const pullNumber = typeof pullNumberRaw === "number" ? pullNumberRaw : pullNumberRaw ? Number(pullNumberRaw) : NaN
        if (!owner || !repo || !Number.isFinite(pullNumber) || !event) {
          return NextResponse.json({ error: "Missing fields: owner, repo, pullNumber, event" }, { status: 400 })
        }
        await ensureWriteAccess(token)
        const result = await createPullRequestReview({ owner, repo, pullNumber, event, body: bodyText, token })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "pr_inline_comment": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const pullNumberRaw = payload?.pullNumber
        const path = String(payload?.path ?? "").trim()
        const startLineRaw = payload?.startLine
        const endLineRaw = payload?.endLine
        const bodyText = payload?.body ? String(payload.body) : undefined
        const pullNumber = typeof pullNumberRaw === "number" ? pullNumberRaw : pullNumberRaw ? Number(pullNumberRaw) : NaN
        const startLine = typeof startLineRaw === "number" ? startLineRaw : startLineRaw ? Number(startLineRaw) : undefined
        const endLine = typeof endLineRaw === "number" ? endLineRaw : endLineRaw ? Number(endLineRaw) : undefined
        if (!owner || !repo || !Number.isFinite(pullNumber) || !path || !bodyText) {
          return NextResponse.json({ error: "Missing fields: owner, repo, pullNumber, path, body" }, { status: 400 })
        }
        await ensureWriteAccess(token)
        const result = await createPullRequestInlineComment({ owner, repo, pullNumber, path, startLine, endLine, body: bodyText, token })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${String(action)}` }, { status: 400 })
    }
  } catch (e: any) {
    console.error("Error in github POST:", e?.message ?? e)
    const status = e?.status ?? 500
    const message = e?.message ?? "Internal server error"
    const details = e?.body ?? null
    return NextResponse.json({ error: message, details }, { status })
  }
}
