import { NextResponse } from "next/server"

import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/notifications/preferences
 * Fetch current user's notification preferences.
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
 * Update current user's notification preferences.
 */
export async function PUT(request: Request) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  try {
    const body = await request.json()
    return proxyBackendRequest({
      method: "PUT",
      path: "/api/v1/notifications/preferences",
      token: authContext.token,
      userId: authContext.userId,
      body,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

/**
 * PATCH /api/notifications/preferences
 * Partial update for current user's notification preferences.
 */
export async function PATCH(request: Request) {
  return PUT(request)
}

/**
 * POST /api/notifications/preferences
 * Compatibility endpoint used by existing UI for resetting preferences.
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
    body: {},
  })
}

