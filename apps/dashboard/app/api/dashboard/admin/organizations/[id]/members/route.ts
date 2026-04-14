import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

import { requireBackendAuth } from "@/lib/backend-admin"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

const TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.DASHBOARD_BACKEND_FETCH_TIMEOUT_MS ?? "15000") || 15_000,
)

export const dynamic = "force-dynamic"

async function fetchBackend<T>(
  token: string,
  userId: string,
  path: string,
  init?: { method?: "GET" | "POST" | "DELETE"; body?: unknown },
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
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
    const raw = await res.text()
    let parsed: unknown = null
    if (raw) { try { parsed = JSON.parse(raw) } catch { parsed = { detail: raw } } }
    return { ok: res.ok, status: res.status, data: parsed as T | null }
  } catch {
    return { ok: false, status: 502, data: null }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * GET /api/dashboard/admin/organizations/[id]/members
 * Returns the member list for this organization (from backend + Clerk pending invitations).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireBackendAuth()
  if (!auth.ok) return auth.response

  const orgId = params.id

  // Backend members
  const backendRes = await fetchBackend<{ members?: unknown[] }>(
    auth.token,
    auth.userId,
    `/api/v1/teams/${encodeURIComponent(orgId)}`,
  )

  const backendMembers = Array.isArray(
    (backendRes.data as { members?: unknown[] } | null)?.members,
  )
    ? (backendRes.data as { members: unknown[] }).members
    : []

  // Pending Clerk invitations (best-effort)
  let pendingInvitations: { id: string; emailAddress: string; role: string; createdAt: number }[] = []
  try {
    const clerkOrgId = (backendRes.data as { clerk_org_id?: string } | null)?.clerk_org_id
    if (clerkOrgId && !clerkOrgId.startsWith("org_local_")) {
      const client = await clerkClient()
      const invs = await client.organizations.getOrganizationInvitationList({
        organizationId: clerkOrgId,
        status: ["pending"],
      })
      pendingInvitations = (invs.data ?? []).map((inv) => ({
        id: inv.id,
        emailAddress: inv.emailAddress,
        role: inv.role,
        createdAt: inv.createdAt,
      }))
    }
  } catch {
    // Clerk invitations unavailable — not fatal
  }

  return NextResponse.json({ members: backendMembers, pendingInvitations })
}

/**
 * POST /api/dashboard/admin/organizations/[id]/members
 * Invite a user by email via Clerk + add to backend team.
 *
 * Body: { email: string, role?: "admin" | "member" | "viewer" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireBackendAuth()
  if (!auth.ok) return auth.response

  const orgId = params.id

  let body: { email?: string; role?: string }
  try {
    body = (await request.json()) as { email?: string; role?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 })
  }

  const role = (body.role as "admin" | "member" | "viewer") ?? "member"

  // Fetch team to get clerkOrgId
  const teamRes = await fetchBackend<{
    id: string
    clerk_org_id?: string | null
  }>(auth.token, auth.userId, `/api/v1/teams/${encodeURIComponent(orgId)}`)

  if (!teamRes.ok || !teamRes.data) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  const clerkOrgId = teamRes.data.clerk_org_id

  let clerkInvitation: { id: string; emailAddress: string } | null = null
  let clerkWarning: string | null = null

  // Send Clerk invitation if org is linked to a real Clerk org
  if (clerkOrgId && !clerkOrgId.startsWith("org_local_")) {
    try {
      const client = await clerkClient()
      const clerkRole = role === "admin" ? "org:admin" : "org:member"
      const inv = await client.organizations.createOrganizationInvitation({
        organizationId: clerkOrgId,
        emailAddress: email,
        role: clerkRole,
        inviterUserId: auth.userId,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/dashboard`,
      })
      clerkInvitation = { id: inv.id, emailAddress: inv.emailAddress }
    } catch (clerkError) {
      clerkWarning =
        clerkError instanceof Error
          ? `Clerk invitation failed: ${clerkError.message}`
          : "Clerk invitation could not be sent"
    }
  } else {
    clerkWarning = "Clerk organization not linked — invitation email was not sent via Clerk. Link Clerk first to enable email invitations."
  }

  // Try to find the user in the backend by email and add them to the team.
  // If they don't exist yet (pending invite), we record it differently.
  let backendMember: unknown = null
  try {
    // Look up user by email
    const usersRes = await fetchBackend<{ items?: Array<{ id: string; email: string }> }>(
      auth.token,
      auth.userId,
      `/v1/admin/users?limit=500`,
    )
    const users = Array.isArray(
      (usersRes.data as { items?: unknown[] } | null)?.items,
    )
      ? (usersRes.data as { items: Array<{ id: string; email: string }> }).items
      : []

    const found = users.find((u) => u.email?.toLowerCase() === email)
    if (found) {
      const addRes = await fetchBackend(
        auth.token,
        auth.userId,
        `/api/v1/teams/${encodeURIComponent(orgId)}/members`,
        { method: "POST", body: { user_id: found.id, role } },
      )
      if (addRes.ok) backendMember = addRes.data
    }
  } catch {
    // Non-fatal: user may not exist yet (pending invitation)
  }

  return NextResponse.json(
    {
      success: true,
      clerkInvitation,
      backendMember,
      warnings: clerkWarning ? [clerkWarning] : [],
    },
    { status: 201 },
  )
}

/**
 * DELETE /api/dashboard/admin/organizations/[id]/members?userId=xxx
 * Remove a member from the organization.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireBackendAuth()
  if (!auth.ok) return auth.response

  const orgId = params.id
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "userId query param is required" }, { status: 400 })
  }

  const res = await fetchBackend(
    auth.token,
    auth.userId,
    `/api/v1/teams/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  )

  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: "Failed to remove member" }, { status: res.status })
  }

  return new Response(null, { status: 204 })
}
