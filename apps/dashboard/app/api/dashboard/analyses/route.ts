import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { createHash } from "node:crypto"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{6,64}$/
const REPO_PATTERN = /^[^/\s]+\/[^/\s]+$/

type CreateAnalysisBody = {
  repo?: unknown
  pr_number?: unknown
  commit_sha?: unknown
  diff_text?: unknown
  metadata?: unknown
}

type ParsedCreateAnalysisBody = {
  repo: string
  diffText: string
  prNumber: number | null
  commitSha: string | null
  metadata: Record<string, unknown>
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

function parseCreateAnalysisBody(rawBody: CreateAnalysisBody) {
  const repo = asNonEmptyString(rawBody.repo)
  const diffText = asNonEmptyString(rawBody.diff_text)
  if (!repo) {
    return { ok: false as const, error: "Le champ 'repo' est obligatoire." }
  }
  if (!diffText) {
    return { ok: false as const, error: "Le champ 'diff_text' est obligatoire." }
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
  let normalizedDiffText = parsed.value.diffText
  const metadata = {
    ...parsed.value.metadata,
  }
  if (!isUnifiedDiff(normalizedDiffText)) {
    const inferredPath = inferFilePathFromMetadata(metadata, repoNormalization.repo)
    normalizedDiffText = synthesizeUnifiedDiff(normalizedDiffText, inferredPath)
    metadata.diff_synthesized = true
    metadata.diff_synthesized_path = inferredPath
  }

  let commitSha = parsed.value.commitSha
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
