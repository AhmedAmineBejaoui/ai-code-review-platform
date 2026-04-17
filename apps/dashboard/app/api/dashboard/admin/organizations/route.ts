import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

import { requireBackendAuth } from "@/lib/backend-admin"
import { resolveGithubTokenForUser } from "@/lib/server/github/auth"
import {
  GITHUB_API_BASE_URL,
  buildGithubHeaders,
  normalizeGithubError,
  parseGithubResponse,
} from "@/lib/server/github/client"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

const BACKEND_FETCH_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.DASHBOARD_BACKEND_FETCH_TIMEOUT_MS ?? "15000") || 15_000,
)

export const dynamic = "force-dynamic"

type BackendTeam = {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  clerk_org_id?: string | null
  github_org_id?: string | null
  github_org_login?: string | null
  source?: string | null
  sync_status?: string | null
  member_count?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type GithubOrganizationSummary = {
  id: string
  login: string
  name: string
  description: string | null
  avatarUrl: string | null
  htmlUrl: string | null
}

type ClerkOrganizationSummary = {
  id: string
  name: string
  slug: string | null
  imageUrl: string | null
}

type CreateOrganizationBody = {
  mode?: "platform" | "github_import"
  name?: string
  slug?: string
  description?: string
  githubOrgLogin?: string
}

function slugify(value: string): string {
  const collapsed = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
  return collapsed || `organization-${Math.random().toString(36).slice(2, 8)}`
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

async function fetchBackendJson<T>(
  token: string,
  userId: string,
  path: string,
  init?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE"
    body?: unknown
  },
): Promise<{ ok: boolean; status: number; data: T | { error: string; detail?: string } | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-User-Id": userId,
        Accept: "application/json",
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    })

    const rawBody = await response.text()
    let parsed: unknown = null

    if (rawBody) {
      try {
        parsed = JSON.parse(rawBody)
      } catch {
        parsed = { detail: rawBody }
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data: (parsed as T | { error: string; detail?: string } | null) ?? null,
    }
  } catch {
    return {
      ok: false,
      status: 502,
      data: { error: "Backend unavailable" },
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function listGithubOrganizationsForUser(userId: string): Promise<GithubOrganizationSummary[]> {
  const token = await resolveGithubTokenForUser(userId)
  if (!token) {
    return []
  }

  const response = await fetch(`${GITHUB_API_BASE_URL}/user/orgs?per_page=100`, {
    headers: buildGithubHeaders(token),
    cache: "no-store",
  })
  const payload = await parseGithubResponse(response)

  if (!response.ok || !Array.isArray(payload)) {
    return []
  }

  return payload.map((item) => {
    const record = item as Record<string, unknown>
    return {
      id: String(record.id ?? ""),
      login: String(record.login ?? ""),
      name: asString(record.name) ?? String(record.login ?? ""),
      description: asString(record.description),
      avatarUrl: asString(record.avatar_url),
      htmlUrl: asString(record.html_url),
    }
  })
}

async function fetchGithubOrganizationDetails(
  userId: string,
  login: string,
): Promise<GithubOrganizationSummary> {
  const token = await resolveGithubTokenForUser(userId)
  if (!token) {
    throw new Error("GitHub account not connected")
  }

  const response = await fetch(`${GITHUB_API_BASE_URL}/orgs/${encodeURIComponent(login)}`, {
    headers: buildGithubHeaders(token),
    cache: "no-store",
  })
  const payload = await parseGithubResponse(response)

  if (!response.ok || !payload || typeof payload !== "object") {
    throw new Error(normalizeGithubError(payload, response.status, true))
  }

  const record = payload as Record<string, unknown>
  return {
    id: String(record.id ?? ""),
    login: String(record.login ?? login),
    name: asString(record.name) ?? String(record.login ?? login),
    description: asString(record.description),
    avatarUrl: asString(record.avatar_url),
    htmlUrl: asString(record.html_url),
  }
}

async function listClerkOrganizations(): Promise<ClerkOrganizationSummary[]> {
  const client = await clerkClient()
  const response = await client.organizations.getOrganizationList({ limit: 100 })
  const items = Array.isArray(response?.data) ? response.data : []

  return items.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug ?? null,
    imageUrl: org.imageUrl ?? null,
  }))
}

function normalizeTeam(team: BackendTeam) {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug ?? null,
    description: team.description ?? null,
    memberCount: team.member_count ?? 0,
    createdAt: team.created_at ?? null,
    updatedAt: team.updated_at ?? null,
    clerkOrgId: team.clerk_org_id ?? null,
    githubOrgId: team.github_org_id ?? null,
    githubOrgLogin: team.github_org_login ?? null,
    source: team.source ?? "platform",
    syncStatus: team.sync_status ?? "local_only",
  }
}

async function ensureClerkOrganization(args: {
  userId: string
  name: string
  slug: string
  description: string | null
  githubOrg: GithubOrganizationSummary | null
}) {
  const client = await clerkClient()
  const existing = await client.organizations.getOrganizationList({ limit: 100 })
  const match = Array.isArray(existing?.data)
    ? existing.data.find((item) => item.slug === args.slug)
    : null

  if (match) {
    await client.organizations.updateOrganization(match.id, {
      name: args.name,
      slug: args.slug,
      publicMetadata: {
        github_org_login: args.githubOrg?.login ?? null,
        github_org_id: args.githubOrg?.id ?? null,
        description: args.description,
      },
    })
    return { organization: match, created: false }
  }

  const created = await client.organizations.createOrganization({
    name: args.name,
    slug: args.slug,
    createdBy: args.userId,
    publicMetadata: {
      github_org_login: args.githubOrg?.login ?? null,
      github_org_id: args.githubOrg?.id ?? null,
      description: args.description,
    },
  })

  try {
    await client.organizations.createOrganizationMembership({
      organizationId: created.id,
      userId: args.userId,
      role: "org:admin",
    })
  } catch {
    // Creator is often already a member in Clerk.
  }

  return { organization: created, created: true }
}

/**
 * GET /api/dashboard/admin/organizations
 *
 * Returns the linked platform organizations plus available GitHub orgs and Clerk orgs.
 */
export async function GET(request: NextRequest) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  const search = asString(request.nextUrl.searchParams.get("search"))

  const [backendResponse, githubOrganizations, clerkOrganizations] = await Promise.all([
    fetchBackendJson<{ items?: BackendTeam[] }>(
      authContext.token,
      authContext.userId,
      "/api/v1/teams",
      { method: "GET" },
    ),
    listGithubOrganizationsForUser(authContext.userId),
    listClerkOrganizations().catch(() => []),
  ])

  // Gracefully degrade: return empty list when backend is unavailable
  const teams = backendResponse.ok && Array.isArray((backendResponse.data as { items?: BackendTeam[] } | null)?.items)
    ? (backendResponse.data as { items?: BackendTeam[] }).items ?? []
    : []

  const organizations = teams
    .map(normalizeTeam)
    .filter((org) => {
      if (!search) {
        return true
      }
      const haystack = [org.name, org.slug, org.githubOrgLogin, org.clerkOrgId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(search.toLowerCase())
    })

  return NextResponse.json({
    organizations,
    githubOrganizations,
    clerkOrganizations,
    capabilities: {
      canCreateGithubOrganizations: false,
      githubCreationReason:
        "GitHub organizations must already exist. This workflow creates the platform + Clerk organization, then links an existing GitHub organization.",
    },
  })
}

/**
 * POST /api/dashboard/admin/organizations
 *
 * Creates a platform organization, a Clerk organization, and optionally links an existing GitHub organization.
 */
export async function POST(request: NextRequest) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  let body: CreateOrganizationBody
  try {
    body = (await request.json()) as CreateOrganizationBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const mode = body.mode === "github_import" ? "github_import" : "platform"
  // In platform mode, GitHub org is entirely optional and ignored even if the
  // dropdown still holds a value from a previous interaction.
  const selectedGithubLogin = mode === "github_import" ? asString(body.githubOrgLogin) : null

  let githubOrg: GithubOrganizationSummary | null = null
  if (mode === "github_import") {
    if (!selectedGithubLogin) {
      return NextResponse.json(
        { error: "A GitHub organization must be selected for import." },
        { status: 400 },
      )
    }

    try {
      githubOrg = await fetchGithubOrganizationDetails(authContext.userId, selectedGithubLogin)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch GitHub organization" },
        { status: 400 },
      )
    }
  }

  const name =
    asString(body.name) ??
    githubOrg?.name ??
    githubOrg?.login ??
    null

  if (!name) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
  }

  const slug =
    asString(body.slug) ??
    (githubOrg ? slugify(githubOrg.login) : slugify(name))

  const description = asString(body.description) ?? githubOrg?.description ?? null

  const existingTeamsResponse = await fetchBackendJson<{ items?: BackendTeam[] }>(
    authContext.token,
    authContext.userId,
    "/api/v1/teams",
    { method: "GET" },
  )

  const existingTeams = existingTeamsResponse.ok && Array.isArray((existingTeamsResponse.data as { items?: BackendTeam[] } | null)?.items)
    ? (existingTeamsResponse.data as { items?: BackendTeam[] }).items ?? []
    : []

  if (githubOrg) {
    const duplicateGithubLink = existingTeams.find(
      (team) => team.github_org_login?.toLowerCase() === githubOrg?.login.toLowerCase(),
    )
    if (duplicateGithubLink) {
      return NextResponse.json(
        { error: `This GitHub organization is already linked to '${duplicateGithubLink.name}'.` },
        { status: 409 },
      )
    }
  }

  const duplicateSlug = existingTeams.find((team) => team.slug?.toLowerCase() === slug.toLowerCase())
  if (duplicateSlug) {
    return NextResponse.json(
      { error: `Slug '${slug}' is already used by '${duplicateSlug.name}'.` },
      { status: 409 },
    )
  }

  let createdClerkOrganizationId: string | null = null
  let clerkOrg: { id: string; name: string; slug: string | null; imageUrl: string | null } | null = null
  const warnings: string[] = []

  // Attempt Clerk organization creation — non-blocking.
  // Clerk Organizations may be unavailable (plan restriction, missing permissions, etc.).
  // In that case we fall back to a local UUID so the platform team can still be created.
  try {
    const { organization: clerkOrganization, created } = await ensureClerkOrganization({
      userId: authContext.userId,
      name,
      slug,
      description,
      githubOrg,
    })

    createdClerkOrganizationId = created ? clerkOrganization.id : null
    clerkOrg = {
      id: clerkOrganization.id,
      name: clerkOrganization.name,
      slug: clerkOrganization.slug ?? null,
      imageUrl: clerkOrganization.imageUrl ?? null,
    }
  } catch (clerkError) {
    // Log for observability but do not abort — create a platform-only organization.
    console.warn(
      "[organizations] Clerk org creation skipped:",
      clerkError instanceof Error ? clerkError.message : clerkError,
    )
    warnings.push(
      "Clerk organization could not be created automatically. " +
        "This may be due to plan restrictions or permissions. " +
        "The platform organization was still created.",
    )
  }

  // Use the Clerk org id when available, otherwise generate a stable local id.
  const { randomUUID } = await import("crypto")
  const orgId = clerkOrg?.id ?? randomUUID()

  try {
    const backendPayload = {
      id: orgId,
      name,
      slug,
      description,
      clerk_org_id: clerkOrg?.id ?? null,
      github_org_id: githubOrg?.id ?? null,
      github_org_login: githubOrg?.login ?? null,
      source: githubOrg ? "github_import" : "platform",
      sync_status: clerkOrg
        ? githubOrg
          ? "linked"
          : "clerk_only"
        : "local_only",
    }

    const backendResponse = await fetchBackendJson<BackendTeam>(
      authContext.token,
      authContext.userId,
      "/api/v1/teams",
      {
        method: "POST",
        body: backendPayload,
      },
    )

    if (!backendResponse.ok || !backendResponse.data) {
      // Roll back Clerk org if we created one.
      if (createdClerkOrganizationId) {
        try {
          const client = await clerkClient()
          await client.organizations.deleteOrganization(createdClerkOrganizationId)
        } catch {
          // Best-effort rollback.
        }
      }

      return NextResponse.json(
        backendResponse.data ?? { error: "Failed to create organization" },
        { status: backendResponse.status },
      )
    }

    if (!githubOrg) {
      warnings.push(
        "GitHub organization creation is not automatic. Link an existing GitHub organization later if needed.",
      )
    }

    return NextResponse.json(
      {
        organization: normalizeTeam(backendResponse.data as BackendTeam),
        clerkOrganization: clerkOrg,
        githubOrganization: githubOrg,
        warnings,
      },
      { status: 201 },
    )
  } catch (error) {
    // Roll back Clerk org if we created one.
    if (createdClerkOrganizationId) {
      try {
        const client = await clerkClient()
        await client.organizations.deleteOrganization(createdClerkOrganizationId)
      } catch {
        // Best-effort rollback.
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create organization" },
      { status: 500 },
    )
  }
}
