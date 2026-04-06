import { NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/notifications/preferences
 * 
 * Fetches user notification preferences.
 */
export async function GET() {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  return proxyBackendRequest({
    method: "GET",
    path: "/api/v1/notifications/preferences",
    token: authContext.token,
    userId: authContext.userId,
  })
}

/**
 * PUT /api/notifications/preferences
 * 
 * Updates user notification preferences.
 */
export async function PUT(request: Request) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  return proxyBackendRequest({
    method: "PUT",
    path: "/api/v1/notifications/preferences",
    token: authContext.token,
    userId: authContext.userId,
    body,
  })
}

/**
 * POST /api/notifications/preferences (reset)
 * 
 * Resets user notification preferences to defaults.
 */
export async function POST() {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  return proxyBackendRequest({
    method: "POST",
    path: "/api/v1/notifications/preferences/reset",
    token: authContext.token,
    userId: authContext.userId,
  })
}
