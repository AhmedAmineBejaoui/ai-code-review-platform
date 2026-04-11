import { NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/notifications
 * 
 * Fetches user notifications with optional filtering.
 */
export async function GET(request: Request) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unread_only") || "false"
  const limit = searchParams.get("limit") || "20"
  const offset = searchParams.get("offset") || "0"

  const queryParams = new URLSearchParams({
    unread_only: unreadOnly,
    limit,
    offset,
  })

  return proxyBackendRequest({
    method: "GET",
    path: `/api/v1/notifications?${queryParams.toString()}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}

/**
 * DELETE /api/notifications
 *
 * Deletes all notifications for current user.
 */
export async function DELETE() {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  return proxyBackendRequest({
    method: "DELETE",
    path: "/api/v1/notifications",
    token: authContext.token,
    userId: authContext.userId,
  })
}
