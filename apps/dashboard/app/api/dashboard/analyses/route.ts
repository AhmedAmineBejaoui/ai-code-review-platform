import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

const COMMIT_SHA_PATTERN = /^[0-9a-fA-F]{6,64}$/

type CreateAnalysisBody = {
  repo?: unknown
  pr_number?: unknown
  commit_sha?: unknown
  diff_text?: unknown
  metadata?: unknown
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
    },
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

  const metadata = {
    ...parsed.value.metadata,
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
      repo: parsed.value.repo,
      pr_number: parsed.value.prNumber,
      commit_sha: parsed.value.commitSha,
      diff_text: parsed.value.diffText,
      metadata,
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

