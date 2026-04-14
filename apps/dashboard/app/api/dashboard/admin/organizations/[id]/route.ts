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
  linkClerk?: boolean
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

  // Fetch current state from backend to know if Clerk is already linked.
  const currentResponse = await fetchBackendJson<BackendTeam>(
    authContext.token,
    authContext.userId,
    `/api/v1/teams/${encodeURIComponent(orgId)}`,
    { method: "GET" },
  )
  const currentTeam = currentResponse.ok ? (currentResponse.data as BackendTeam | null) : null
  // Use ONLY the actual DB value — never infer from the org ID prefix.
  const existingClerkId = currentTeam?.clerk_org_id ?? null

  // If linkClerk is requested and Clerk is not yet linked, resolve a Clerk id now.
  let resolvedClerkId: string | null = existingClerkId
  let clerkWarning: string | null = null

  if (body.linkClerk && !existingClerkId) {
    // Case 1: the team was originally created with a Clerk org id as its primary id.
    //         Re-use it directly — no need to call Clerk API.
    if (orgId.startsWith("org_")) {
      resolvedClerkId = orgId
    } else {
      // Case 2: try to create/find a Clerk org for this platform team.
      const name = asString(body.name) ?? currentTeam?.name ?? orgId
      const rawSlug = asString(body.slug) ?? currentTeam?.slug ?? orgId.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)
      const slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || `org-${orgId.slice(0, 8)}`
      const description = body.description === "" ? null : asString(body.description) ?? currentTeam?.description ?? null

      try {
        const client = await clerkClient()

        // Reuse an existing Clerk org if slug or name already matches.
        const existing = await client.organizations.getOrganizationList({ limit: 100 })
        const match = Array.isArray(existing?.data)
          ? existing.data.find((item) => item.slug === slug || item.name === name)
          : null

        if (match) {
          resolvedClerkId = match.id
        } else {
          const created = await client.organizations.createOrganization({
            name,
            slug,
            createdBy: authContext.userId,
            publicMetadata: { description },
          })
          try {
            await client.organizations.createOrganizationMembership({
              organizationId: created.id,
              userId: authContext.userId,
              role: "org:admin",
            })
          } catch {
            // Creator may already be a member.
          }
          resolvedClerkId = created.id
        }
      } catch (clerkError) {
        const msg = clerkError instanceof Error ? clerkError.message : "Unknown Clerk error"
        console.warn("[organizations] Clerk org creation failed:", msg)
        // Clerk Organizations unavailable on this plan — use a stable local id.
        const { randomUUID } = await import("crypto")
        resolvedClerkId = `org_local_${randomUUID().replace(/-/g, "").slice(0, 20)}`
        clerkWarning = `Clerk organization could not be created (${msg}). A local identifier was used instead.`
      }
    }
  }

  const backendPayload: Record<string, unknown> = {
    name: asString(body.name) ?? undefined,
    slug: asString(body.slug) ?? undefined,
    description: body.description === "" ? "" : asString(body.description) ?? undefined,
    github_org_login:
      body.githubOrgLogin === "" ? null : asString(body.githubOrgLogin) ?? undefined,
    github_org_id: body.githubOrgId === "" ? null : asString(body.githubOrgId) ?? undefined,
    source: asString(body.source) ?? undefined,
  }

  // Apply the resolved Clerk id and compute sync_status.
  if (resolvedClerkId && resolvedClerkId !== existingClerkId) {
    backendPayload.clerk_org_id = resolvedClerkId
    const hasGithub = !!(
      (body.githubOrgLogin && body.githubOrgLogin !== "") ||
      currentTeam?.github_org_login
    )
    backendPayload.sync_status = hasGithub ? "linked" : "clerk_only"
  } else if (asString(body.syncStatus)) {
    backendPayload.sync_status = asString(body.syncStatus)
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
  const finalClerkId = updatedTeam.clerk_org_id ?? resolvedClerkId

  // Sync name/slug/metadata to existing Clerk org (if any).
  if (finalClerkId && !body.linkClerk) {
    try {
      const client = await clerkClient()
      await client.organizations.updateOrganization(finalClerkId, {
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

  return NextResponse.json(
    {
      organization: normalizeTeam(updatedTeam),
      ...(clerkWarning ? { warning: clerkWarning } : {}),
    },
    { status: 200 },
  )
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
