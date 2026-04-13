import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

import { requireBackendAuth } from "@/lib/backend-admin"

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

type UpdateBody = {
  name?: string
  slug?: string
  description?: string
  githubOrgLogin?: string | null
  githubOrgId?: string | null
  source?: string | null
  syncStatus?: string | null
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
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

async function fetchBackendJson<T>(
  token: string,
  userId: string,
  path: string,
  init?: {
    method?: "GET" | "PATCH" | "DELETE"
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

    if (response.status === 204) {
      return { ok: true, status: 204, data: null }
    }

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

/**
 * PATCH /api/dashboard/admin/organizations/{id}
 *
 * Updates the linked platform organization and its Clerk organization.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  const orgId = params.id
  if (!orgId) {
    return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
  }

  let body: UpdateBody
  try {
    body = (await request.json()) as UpdateBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const backendPayload = {
    name: asString(body.name) ?? undefined,
    slug: asString(body.slug) ?? undefined,
    description: body.description === "" ? "" : asString(body.description) ?? undefined,
    github_org_login:
      body.githubOrgLogin === "" ? null : asString(body.githubOrgLogin) ?? undefined,
    github_org_id: body.githubOrgId === "" ? null : asString(body.githubOrgId) ?? undefined,
    source: asString(body.source) ?? undefined,
    sync_status: asString(body.syncStatus) ?? undefined,
  }

  const backendResponse = await fetchBackendJson<BackendTeam>(
    authContext.token,
    authContext.userId,
    `/api/v1/teams/${encodeURIComponent(orgId)}`,
    {
      method: "PATCH",
      body: backendPayload,
    },
  )

  if (!backendResponse.ok || !backendResponse.data) {
    return NextResponse.json(
      backendResponse.data ?? { error: "Failed to update organization" },
      { status: backendResponse.status },
    )
  }

  const updatedTeam = backendResponse.data as BackendTeam
  const clerkOrgId = updatedTeam.clerk_org_id ?? (orgId.startsWith("org_") ? orgId : null)

  if (clerkOrgId) {
    try {
      const client = await clerkClient()
      await client.organizations.updateOrganization(clerkOrgId, {
        ...(asString(body.name) ? { name: asString(body.name)! } : {}),
        ...(asString(body.slug) ? { slug: asString(body.slug)! } : {}),
        publicMetadata: {
          github_org_login:
            body.githubOrgLogin === "" ? null : asString(body.githubOrgLogin) ?? updatedTeam.github_org_login ?? null,
          github_org_id:
            body.githubOrgId === "" ? null : asString(body.githubOrgId) ?? updatedTeam.github_org_id ?? null,
          description:
            body.description === "" ? null : asString(body.description) ?? updatedTeam.description ?? null,
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Platform updated, but Clerk sync failed: ${error.message}`
              : "Platform updated, but Clerk sync failed",
        },
        { status: 502 },
      )
    }
  }

  return NextResponse.json({ organization: normalizeTeam(updatedTeam) }, { status: 200 })
}

/**
 * DELETE /api/dashboard/admin/organizations/{id}
 *
 * Archives the local organization and deletes the linked Clerk organization when possible.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  const orgId = params.id
  if (!orgId) {
    return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
  }

  const current = await fetchBackendJson<BackendTeam>(
    authContext.token,
    authContext.userId,
    `/api/v1/teams/${encodeURIComponent(orgId)}`,
    { method: "GET" },
  )

  if (!current.ok || !current.data) {
    return NextResponse.json(
      current.data ?? { error: "Organization not found" },
      { status: current.status },
    )
  }

  const deleteResponse = await fetchBackendJson<null>(
    authContext.token,
    authContext.userId,
    `/api/v1/teams/${encodeURIComponent(orgId)}`,
    { method: "DELETE" },
  )

  if (!deleteResponse.ok) {
    return NextResponse.json(
      deleteResponse.data ?? { error: "Failed to delete organization" },
      { status: deleteResponse.status },
    )
  }

  const team = current.data as BackendTeam
  const clerkOrgId = team.clerk_org_id ?? (orgId.startsWith("org_") ? orgId : null)
  if (clerkOrgId) {
    try {
      const client = await clerkClient()
      await client.organizations.deleteOrganization(clerkOrgId)
    } catch {
      // Keep local delete successful even if Clerk org was already removed.
    }
  }

  return new Response(null, { status: 204 })
}
