import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { extractRoleFromClaims, normalizeRole, type AppRole } from "@/lib/roles"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

type BackendAnalysisListResponse = {
  items?: Array<{
    analysis_id?: string
    repo?: string
    pr_number?: number | null
    commit_sha?: string | null
    status?: string
    summary?: string | null
    created_at?: string
    metadata?: Record<string, unknown>
  }>
}

type BackendRepoProfilesResponse = {
  items?: Array<{
    repo_id?: string
    indexed_commit?: string | null
    updated_at?: string | null
    profile?: Record<string, unknown>
  }>
}

type RepoOverviewDTO = {
  repoId: string
  summary: string
  highlights: string[]
  indexedCommit?: string | null
  updatedAt?: string | null
  source: string
  fallbackUsed: boolean
}

type PrSummaryDTO = {
  analysisId: string
  repo: string
  prNumber: number | null
  commitSha: string | null
  status: string
  summary: string
  createdAt: string
  authorLabel: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  return value as Record<string, unknown>
}

function normalizeUserRole(userRoleCandidate: unknown, claims: unknown): AppRole {
  if (typeof userRoleCandidate === "string" && userRoleCandidate.trim().length > 0) {
    return normalizeRole(userRoleCandidate)
  }
  return extractRoleFromClaims(claims)
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

function toPrSummaries(
  payload: BackendAnalysisListResponse | null,
  role: AppRole,
  userId: string,
  email: string | undefined,
): PrSummaryDTO[] {
  const items = Array.isArray(payload?.items) ? payload!.items! : []
  const mapped = items
    .filter((item) => typeof item.analysis_id === "string" && typeof item.repo === "string")
    .map((item) => {
      const metadata = asRecord(item.metadata ?? {})
      return {
        analysisId: item.analysis_id as string,
        repo: item.repo as string,
        prNumber: typeof item.pr_number === "number" ? item.pr_number : null,
        commitSha: typeof item.commit_sha === "string" ? item.commit_sha : null,
        status: typeof item.status === "string" ? item.status : "UNKNOWN",
        summary: typeof item.summary === "string" && item.summary.trim().length > 0 ? item.summary.trim() : "Summary unavailable.",
        createdAt: typeof item.created_at === "string" ? item.created_at : "",
        authorLabel: extractAuthorLabel(metadata ?? undefined),
        metadata,
      }
    })
    .sort((left, right) => (right.createdAt || "").localeCompare(left.createdAt || ""))

  if (role !== "developer") {
    return mapped.map(({ metadata: _metadata, ...value }) => value).slice(0, 25)
  }

  const own = mapped.filter(
    (item) =>
      isOwnedByUser(item.metadata ?? undefined, {
        userId,
        email,
      }) || !hasOwnerIdentity(item.metadata ?? undefined),
  )
  const selected = own.length > 0 ? own : mapped.slice(0, 10)
  return selected.map(({ metadata: _metadata, ...value }) => value).slice(0, 10)
}

function toRepoOverviews(payload: BackendRepoProfilesResponse | null): RepoOverviewDTO[] {
  const items = Array.isArray(payload?.items) ? payload!.items! : []
  const result: RepoOverviewDTO[] = []

  for (const item of items) {
    if (typeof item.repo_id !== "string" || item.repo_id.trim().length === 0) {
      continue
    }
    const profile = asRecord(item.profile ?? {})
    const llmOverview = asRecord(profile?.llm_overview)
    const summary =
      (typeof llmOverview?.summary === "string" && llmOverview.summary.trim().length > 0
        ? llmOverview.summary
        : typeof profile?.summary === "string"
          ? profile.summary
          : null) ?? "Repository overview unavailable."
    const highlights = Array.isArray(llmOverview?.highlights)
      ? llmOverview.highlights
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      : []
    const source = typeof llmOverview?.source === "string" ? llmOverview.source : "unknown"
    const fallbackUsed = Boolean(llmOverview?.fallback_used)

    result.push({
      repoId: item.repo_id.trim(),
      summary: summary.trim(),
      highlights: highlights.slice(0, 6),
      indexedCommit: typeof item.indexed_commit === "string" ? item.indexed_commit : null,
      updatedAt: typeof item.updated_at === "string" ? item.updated_at : null,
      source,
      fallbackUsed,
    })
  }

  return result
}

export async function GET() {
  const { userId, getToken, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [token, user] = await Promise.all([getToken(), currentUser()])
  const userRoleCandidate =
    user?.publicMetadata?.role ?? user?.unsafeMetadata?.role ?? user?.privateMetadata?.role
  const role = normalizeUserRole(userRoleCandidate, sessionClaims)
  const email =
    user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress
  const warnings: string[] = []

  const [analysesPayload, profilesPayload] = await Promise.all([
    fetchBackendJSON<BackendAnalysisListResponse>("/v1/analyses?page=1&size=100", token, userId),
    fetchBackendJSON<BackendRepoProfilesResponse>("/v1/kb/repos/profiles?limit=100", token, userId),
  ])

  if (!analysesPayload) {
    warnings.push("analyses_unavailable")
  }
  if (!profilesPayload) {
    warnings.push("repo_profiles_unavailable")
  }

  const prSummaries = toPrSummaries(analysesPayload, role, userId, email ?? undefined)
  const repoOverviews = toRepoOverviews(profilesPayload)

  return NextResponse.json(
    {
      role,
      prSummaries,
      repoOverviews,
      warnings,
      generatedAt: new Date().toISOString(),
    },
    { status: 200 },
  )
}
