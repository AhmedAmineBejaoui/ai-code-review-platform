import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

const BACKEND_FETCH_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.DASHBOARD_BACKEND_FETCH_TIMEOUT_MS ?? "15000") || 15_000,
)

export const dynamic = "force-dynamic"

/**
 * PATCH /api/dashboard/admin/organizations/{id}
 *
 * Updates an organization.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Missing Clerk token" }, { status: 401 })
  }

  const orgId = params.id
  if (!orgId) {
    return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS)

  let backendResponse: Response
  try {
    backendResponse = await fetch(`${BACKEND_API_BASE_URL}/api/v1/admin/organizations/${orgId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-User-Id": userId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    return NextResponse.json(
      { error: "Backend timeout while updating organization" },
      { status: 504 },
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: backendResponse.status },
    )
  }

  let rawBody: unknown
  try {
    rawBody = await backendResponse.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid response from backend" },
      { status: 502 },
    )
  }

  return NextResponse.json(rawBody, { status: 200 })
}

/**
 * DELETE /api/dashboard/admin/organizations/{id}
 *
 * Deletes an organization.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Missing Clerk token" }, { status: 401 })
  }

  const orgId = params.id
  if (!orgId) {
    return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS)

  let backendResponse: Response
  try {
    backendResponse = await fetch(`${BACKEND_API_BASE_URL}/api/v1/admin/organizations/${orgId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-User-Id": userId,
        Accept: "application/json",
      },
      signal: controller.signal,
    })
  } catch {
    return NextResponse.json(
      { error: "Backend timeout while deleting organization" },
      { status: 504 },
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: backendResponse.status },
    )
  }

  return new Response(null, { status: 204 })
}