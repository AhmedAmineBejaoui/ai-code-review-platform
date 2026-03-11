import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { createHash } from "node:crypto"
import { extractRoleFromClaims, normalizeRole, type AppRole } from "@/lib/roles"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
const GITHUB_API_BASE_URL = "https://api.github.com"

const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{6,64}$/
const REPO_PATTERN = /^[^/\s]+\/[^/\s]+$/

type CreateAnalysisBody = {
  repo?: unknown
  pr_number?: unknown
  commit_sha?: unknown
  diff_text?: unknown
  metadata?: unknown
}

type BackendAnalysisListItem = {
  analysis_id?: string
  repo?: string
  pr_number?: number | null
  commit_sha?: string | null
  status?: string
  created_at?: string
  updated_at?: string
  metadata?: Record<string, unknown>
}

type BackendAnalysisListResponse = {
  items?: BackendAnalysisListItem[]
}

type BackendAnalysisDetailsResponse = {
  findings?: Array<{
    severity?: string
  }>
}

type DashboardAnalysisListItem = {
  id: string
  repo: string
  prLabel: string
  commitSha: string | null
  author: string
  status: string
  createdAt: string
  updatedAt: string
  durationLabel: string
  blockerCount: number
  warnCount: number
  infoCount: number
}

type ParsedCreateAnalysisBody = {
  repo: string
  diffText: string | null
  prNumber: number | null
  commitSha: string | null
  metadata: Record<string, unknown>
}

type GithubPullDetails = {
  title?: string
  head?: { sha?: string } | null
  base?: { sha?: string } | null
}

type GithubCommitDetails = {
  sha?: string
}

type GithubDiffResolution = {
  diffText: string
  resolvedCommitSha: string | null
  metadataUpdates: Record<string, unknown>
}

function isUnifiedDiff(text: string): boolean {
  return text.includes("diff --git") || text.includes("@@")
}

function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") ?? ""
}

function normalizeRepo(rawRepo: string): { repo: string; normalized: boolean; originalRepo: string | null } {
  if (REPO_PATTERN.test(rawRepo)) {
    return { repo: rawRepo, normalized: false, originalRepo: null }
  }
  const segment = slugifySegment(rawRepo) || "manual-repo"
  return {
    repo: `local/${segment}`,
    normalized: true,
    originalRepo: rawRepo,
  }
}

function inferFilePathFromMetadata(metadata: Record<string, unknown>, fallbackRepo: string): string {
  const metadataFileName = metadata.imported_file_name
  if (typeof metadataFileName === "string" && metadataFileName.trim().length > 0) {
    return metadataFileName.trim().replace(/\\/g, "/")
  }
  const repoTail = fallbackRepo.split("/").pop() ?? "manual-change"
  return `${repoTail}.txt`
}

function synthesizeUnifiedDiff(content: string, filePath: string): string {
  const normalizedPath = filePath.replace(/^\/+/, "").replace(/\\/g, "/")
  const normalizedContent = content.replace(/\r\n/g, "\n")
  const rawLines = normalizedContent.split("\n")
  const safeLines = rawLines.length === 0 ? [""] : rawLines
  const additions = safeLines.map((line) => `+${line}`).join("\n")
  const lineCount = safeLines.length

  return [
    `diff --git a/${normalizedPath} b/${normalizedPath}`,
    "new file mode 100644",
    "index 0000000..1111111",
    "--- /dev/null",
    `+++ b/${normalizedPath}`,
    `@@ -0,0 +1,${lineCount} @@`,
    additions,
    "",
  ].join("\n")
}

function deriveCommitSha(diffText: string): string {
  return createHash("sha1").update(diffText).digest("hex").slice(0, 12)
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeOptionalObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function resolveUserRole(user: Awaited<ReturnType<typeof currentUser>>, claims: unknown): AppRole {
  const roleCandidate = user?.publicMetadata?.role ?? user?.unsafeMetadata?.role ?? user?.privateMetadata?.role
  if (typeof roleCandidate === "string" && roleCandidate.trim().length > 0) {
    return normalizeRole(roleCandidate)
  }
  return extractRoleFromClaims(claims)
}

function extractAuthorLabel(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) {
    return null
  }
  const candidates = [
    metadata.author_name,
    metadata.author,
    metadata.author_login,
    metadata.actor,
    metadata.user_name,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }
  return null
}

function isOwnedByUser(
  metadata: Record<string, unknown> | undefined,
  options: { userId: string; email: string | undefined },
): boolean {
  const { userId, email } = options
  if (!metadata) {
    return false
  }
  const idCandidates = [
    metadata.author_id,
    metadata.user_id,
    metadata.actor_id,
    metadata.clerk_user_id,
    metadata.github_actor_id,
  ]
  for (const candidate of idCandidates) {
    if (typeof candidate === "string" && candidate.trim() === userId) {
      return true
    }
  }
  if (email) {
    const emailCandidates = [metadata.author_email, metadata.user_email, metadata.actor_email]
    for (const candidate of emailCandidates) {
      if (typeof candidate === "string" && candidate.trim().toLowerCase() === email.toLowerCase()) {
        return true
      }
    }
  }
  return false
}

function hasOwnerIdentity(metadata: Record<string, unknown> | undefined): boolean {
  if (!metadata) {
    return false
  }
  const identityCandidates = [
    metadata.author_id,
    metadata.user_id,
    metadata.actor_id,
    metadata.clerk_user_id,
    metadata.github_actor_id,
    metadata.author_email,
    metadata.user_email,
    metadata.actor_email,
  ]
  return identityCandidates.some((candidate) => typeof candidate === "string" && candidate.trim().length > 0)
}

function normalizeAnalysisStatus(status: string | undefined): string {
  const raw = (status ?? "").trim().toUpperCase()
  if (raw === "DONE") {
    return "COMPLETED"
  }
  if (raw === "RUNNING" || raw === "FAILED" || raw === "QUEUED" || raw === "RECEIVED" || raw === "COMPLETED") {
    return raw
  }
  return "QUEUED"
}

function safeDateValue(input: string | undefined): Date | null {
  if (!input) {
    return null
  }
  const candidate = new Date(input)
  if (Number.isNaN(candidate.getTime())) {
    return null
  }
  return candidate
}

function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) {
    return `${seconds}s`
  }
  return `${minutes}m ${seconds}s`
}

function resolveDurationLabel(createdAt: string | undefined, updatedAt: string | undefined, status: string): string {
  const created = safeDateValue(createdAt)
  if (!created) {
    return "-"
  }
  const updated = safeDateValue(updatedAt)
  const now = new Date()
  const terminal = status === "FAILED" || status === "COMPLETED"
  const end = terminal && updated ? updated : now
  return formatDurationMs(end.getTime() - created.getTime())
}

async function fetchBackendJSON<T>(path: string, token: string | null, userId: string): Promise<T | null> {
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (userId) {
    headers["X-User-Id"] = userId
  }
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    })
    if (!response.ok) {
      return null
    }
    return (await response.json()) as T
  } catch {
    return null
  }
}

function normalizeGithubApiError(raw: unknown): string {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim()
  }
  if (typeof raw === "object" && raw !== null) {
    const message = (raw as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim()
    }
  }
  return "GitHub request failed"
}

async function getGithubOauthAccessToken(userId: string): Promise<string | null> {
  const client = await clerkClient()
  try {
    const oauthTokens = await client.users.getUserOauthAccessToken(userId, "github")
    const tokenCandidate = Array.isArray(oauthTokens?.data)
      ? oauthTokens.data.find((item) => typeof item?.token === "string" && item.token.trim().length > 0)
      : null
    if (tokenCandidate) {
      return tokenCandidate.token
    }
  } catch {
    // Fall through to legacy provider format.
  }

  try {
    const oauthTokens = await client.users.getUserOauthAccessToken(userId, "oauth_github")
    const tokenCandidate = Array.isArray(oauthTokens?.data)
      ? oauthTokens.data.find((item) => typeof item?.token === "string" && item.token.trim().length > 0)
      : null
    if (tokenCandidate) {
      return tokenCandidate.token
    }
  } catch {
    // Ignore and return null below.
  }
  return null
}

function buildGithubHeaders(token: string | null, accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function fetchGithubJson<T>(token: string | null, path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    method: "GET",
    headers: buildGithubHeaders(token, "application/vnd.github+json"),
    cache: "no-store",
  })
  if (!response.ok) {
    const rawBody = await response.text()
    let parsedBody: unknown = rawBody
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        parsedBody = rawBody
      }
    }
    throw new Error(normalizeGithubApiError(parsedBody))
  }
  return (await response.json()) as T
}

async function fetchGithubDiffText(token: string | null, path: string): Promise<string> {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    method: "GET",
    headers: buildGithubHeaders(token, "application/vnd.github.v3.diff"),
    cache: "no-store",
  })
  if (!response.ok) {
    const rawBody = await response.text()
    let parsedBody: unknown = rawBody
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        parsedBody = rawBody
      }
    }
    throw new Error(normalizeGithubApiError(parsedBody))
  }
  return await response.text()
}

async function resolveGithubDiff(options: {
  token: string | null
  repo: string
  prNumber: number | null
  commitSha: string | null
}): Promise<GithubDiffResolution> {
  const { token, repo, prNumber, commitSha } = options
  if (prNumber !== null) {
    const pullPath = `/repos/${repo}/pulls/${prNumber}`
    const [pullDetails, diffText] = await Promise.all([
      fetchGithubJson<GithubPullDetails>(token, pullPath),
      fetchGithubDiffText(token, pullPath),
    ])
    return {
      diffText,
      resolvedCommitSha:
        typeof pullDetails?.head?.sha === "string" && pullDetails.head.sha.trim().length > 0
          ? pullDetails.head.sha
          : commitSha,
      metadataUpdates: {
        github_pr_number: prNumber,
        github_pr_title: typeof pullDetails?.title === "string" ? pullDetails.title : null,
        github_head_sha:
          typeof pullDetails?.head?.sha === "string" && pullDetails.head.sha.trim().length > 0
            ? pullDetails.head.sha
            : null,
        github_base_sha:
          typeof pullDetails?.base?.sha === "string" && pullDetails.base.sha.trim().length > 0
            ? pullDetails.base.sha
            : null,
        diff_source: "github_pr",
      },
    }
  }

  if (commitSha) {
    const commitPath = `/repos/${repo}/commits/${commitSha}`
    const [commitDetails, diffText] = await Promise.all([
      fetchGithubJson<GithubCommitDetails>(token, commitPath),
      fetchGithubDiffText(token, commitPath),
    ])
    const normalizedSha =
      typeof commitDetails?.sha === "string" && commitDetails.sha.trim().length > 0 ? commitDetails.sha : commitSha
    return {
      diffText,
      resolvedCommitSha: normalizedSha,
      metadataUpdates: {
        github_commit_sha: normalizedSha,
        diff_source: "github_commit",
      },
    }
  }

  throw new Error("PR number or commit SHA is required for GitHub remote analysis.")
}

function parseCreateAnalysisBody(rawBody: CreateAnalysisBody) {
  const repo = asNonEmptyString(rawBody.repo)
  const diffText = asNonEmptyString(rawBody.diff_text)
  if (!repo) {
    return { ok: false as const, error: "Le champ 'repo' est obligatoire." }
  }

  let prNumber: number | null = null
  if (rawBody.pr_number !== undefined && rawBody.pr_number !== null && rawBody.pr_number !== "") {
    const candidate =
      typeof rawBody.pr_number === "number" ? rawBody.pr_number : Number(String(rawBody.pr_number))
    if (!Number.isInteger(candidate) || candidate < 1) {
      return { ok: false as const, error: "Le champ 'pr_number' doit etre un entier positif." }
    }
    prNumber = candidate
  }

  let commitSha: string | null = null
  if (rawBody.commit_sha !== undefined && rawBody.commit_sha !== null && rawBody.commit_sha !== "") {
    const normalizedCommit = asNonEmptyString(rawBody.commit_sha)
    if (!normalizedCommit || !COMMIT_SHA_PATTERN.test(normalizedCommit)) {
      return {
        ok: false as const,
        error: "Le champ 'commit_sha' doit contenir entre 6 et 64 caracteres hexadecimaux.",
      }
    }
    commitSha = normalizedCommit
  }

  return {
    ok: true as const,
    value: {
      repo,
      diffText,
      prNumber,
      commitSha,
      metadata: normalizeOptionalObject(rawBody.metadata),
    } satisfies ParsedCreateAnalysisBody,
  }
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

export async function GET() {
  const { userId, getToken, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [token, user] = await Promise.all([getToken(), currentUser()])
  const role = resolveUserRole(user, sessionClaims)
  const email =
    user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress

  const listPayload = await fetchBackendJSON<BackendAnalysisListResponse>("/v1/analyses?page=1&size=100", token, userId)
  if (!listPayload || !Array.isArray(listPayload.items)) {
    return NextResponse.json({ items: [] }, { status: 200 })
  }

  const baseItems = listPayload.items
    .filter((item) => typeof item.analysis_id === "string" && typeof item.repo === "string")
    .map((item) => {
      const metadata = normalizeOptionalObject(item.metadata)
      const author = extractAuthorLabel(metadata) ?? "Unknown"
      const status = normalizeAnalysisStatus(item.status)
      return {
        id: item.analysis_id as string,
        repo: item.repo as string,
        prLabel: typeof item.pr_number === "number" ? `PR #${item.pr_number}` : "Commit",
        commitSha: typeof item.commit_sha === "string" ? item.commit_sha : null,
        author,
        status,
        createdAt: typeof item.created_at === "string" ? item.created_at : "",
        updatedAt: typeof item.updated_at === "string" ? item.updated_at : "",
        durationLabel: resolveDurationLabel(item.created_at, item.updated_at, status),
        metadata,
      }
    })
    .sort((left, right) => (right.createdAt || "").localeCompare(left.createdAt || ""))

  const scopedItems =
    role === "developer"
      ? baseItems.filter((item) =>
          isOwnedByUser(item.metadata, {
            userId,
            email: email ?? undefined,
          }) || !hasOwnerIdentity(item.metadata),
        )
      : baseItems

  const selectedItems = scopedItems.slice(0, 100)
  const enrichedItems = await Promise.all(
    selectedItems.map(async (item) => {
      const shouldFetchFindings = item.status === "COMPLETED" || item.status === "FAILED"
      const details = shouldFetchFindings
        ? await fetchBackendJSON<BackendAnalysisDetailsResponse>(`/v1/analyses/${item.id}`, token, userId)
        : null
      const findings = Array.isArray(details?.findings) ? details.findings : []
      let blockerCount = 0
      let warnCount = 0
      let infoCount = 0
      for (const finding of findings) {
        const severity = (finding?.severity ?? "").toUpperCase()
        if (severity === "BLOCKER") {
          blockerCount += 1
        } else if (severity === "WARN") {
          warnCount += 1
        } else if (severity === "INFO") {
          infoCount += 1
        }
      }
      const responseItem: DashboardAnalysisListItem = {
        id: item.id,
        repo: item.repo,
        prLabel: item.prLabel,
        commitSha: item.commitSha,
        author: item.author,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        durationLabel: item.durationLabel,
        blockerCount,
        warnCount,
        infoCount,
      }
      return responseItem
    }),
  )

  return NextResponse.json({ items: enrichedItems }, { status: 200 })
}

export async function POST(request: NextRequest) {
  const { userId, getToken, orgId, orgRole, orgSlug, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Missing Clerk token" }, { status: 401 })
  }

  let rawBody: CreateAnalysisBody
  try {
    rawBody = (await request.json()) as CreateAnalysisBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = parseCreateAnalysisBody(rawBody)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const repoNormalization = normalizeRepo(parsed.value.repo)
  let commitSha = parsed.value.commitSha
  const metadata = {
    ...parsed.value.metadata,
  }

  const analysisInputMode = typeof metadata.analysis_input_mode === "string" ? metadata.analysis_input_mode : null
  const wantsGithubRemoteDiff =
    analysisInputMode === "github_remote" ||
    (metadata.repo_selected_from_github === true && parsed.value.diffText === null)

  let normalizedDiffText = wantsGithubRemoteDiff ? "" : (parsed.value.diffText ?? "")
  if (wantsGithubRemoteDiff) {
    if (repoNormalization.normalized) {
      return NextResponse.json(
        {
          error: "Le repository GitHub doit respecter le format owner/repo.",
        },
        { status: 400 },
      )
    }
    if (parsed.value.prNumber === null && !commitSha) {
      return NextResponse.json(
        {
          error: "Pour une analyse distante GitHub, renseignez PR number ou commit SHA.",
        },
        { status: 400 },
      )
    }

    const githubOauthToken = await getGithubOauthAccessToken(userId)
    metadata.github_auth_mode = githubOauthToken ? "oauth" : "public_unauthenticated"

    try {
      const githubDiff = await resolveGithubDiff({
        token: githubOauthToken,
        repo: repoNormalization.repo,
        prNumber: parsed.value.prNumber,
        commitSha,
      })
      normalizedDiffText = githubDiff.diffText
      if (!commitSha && githubDiff.resolvedCommitSha) {
        commitSha = githubDiff.resolvedCommitSha
      }
      metadata.diff_fetched_from_github = true
      metadata.workspace_source = "github_remote"
      metadata.github_repo = repoNormalization.repo
      Object.assign(metadata, githubDiff.metadataUpdates)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de recuperer le diff depuis GitHub."
      const appended =
        githubOauthToken === null
          ? `${message}. Aucun token OAuth GitHub detecte: pour les repos prives, reconnectez GitHub dans Clerk.`
          : message
      return NextResponse.json({ error: appended }, { status: 400 })
    }
  }

  if (!normalizedDiffText.trim()) {
    return NextResponse.json(
      {
        error: "Aucun diff disponible. Importez un dossier local ou utilisez PR/commit GitHub.",
      },
      { status: 400 },
    )
  }

  if (!isUnifiedDiff(normalizedDiffText)) {
    if (metadata.diff_fetched_from_github === true) {
      return NextResponse.json(
        {
          error: "GitHub n'a pas retourne un diff unifie exploitable pour ce PR/commit.",
        },
        { status: 400 },
      )
    }
    const inferredPath = inferFilePathFromMetadata(metadata, repoNormalization.repo)
    normalizedDiffText = synthesizeUnifiedDiff(normalizedDiffText, inferredPath)
    metadata.diff_synthesized = true
    metadata.diff_synthesized_path = inferredPath
  }

  if (parsed.value.prNumber === null && !commitSha) {
    commitSha = deriveCommitSha(normalizedDiffText)
    metadata.commit_sha_autogenerated = true
  }
  if (repoNormalization.normalized) {
    metadata.original_repo_input = repoNormalization.originalRepo
    metadata.repo_normalized = repoNormalization.repo
  }

  const user = await currentUser()
  const primaryEmail =
    user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress
  const displayName = firstNonEmpty(
    [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    user?.fullName ?? undefined,
    user?.username ?? undefined,
  )
  const claims = (sessionClaims as Record<string, unknown> | null | undefined) ?? {}
  const orgNameCandidate = firstNonEmpty(
    typeof claims.org_name === "string" ? claims.org_name : undefined,
    typeof claims.organization_name === "string" ? claims.organization_name : undefined,
  )

  const enrichedMetadata = {
    ...metadata,
    trigger: "dashboard_manual",
    author_id: userId,
    author_email: primaryEmail ?? null,
    author_name: displayName ?? null,
    clerk_user_id: userId,
    org_id: orgId ?? null,
    org_slug: orgSlug ?? null,
    org_name: orgNameCandidate ?? null,
    org_role: orgRole ?? null,
  }

  const backendResponse = await fetch(`${BACKEND_API_BASE_URL}/v1/analyses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-User-Id": userId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "manual",
      repo: repoNormalization.repo,
      pr_number: parsed.value.prNumber,
      commit_sha: commitSha,
      diff_text: normalizedDiffText,
      metadata: enrichedMetadata,
    }),
    cache: "no-store",
  })

  const rawBackendBody = await backendResponse.text()
  let parsedBackendBody: unknown = {}
  if (rawBackendBody) {
    try {
      parsedBackendBody = JSON.parse(rawBackendBody)
    } catch {
      parsedBackendBody = { detail: rawBackendBody }
    }
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        error: "Failed to create analysis",
        backend_status: backendResponse.status,
        backend_response: parsedBackendBody,
      },
      { status: backendResponse.status },
    )
  }

  return NextResponse.json(parsedBackendBody, { status: backendResponse.status })
}
