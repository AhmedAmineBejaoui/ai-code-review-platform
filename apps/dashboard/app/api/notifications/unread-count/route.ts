import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/notifications/unread-count
 * 
 * Fetches the count of unread notifications for the current user.
 */
export async function GET() {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  return proxyBackendRequest({
    method: "GET",
    path: "/api/v1/notifications/unread-count",
    token: authContext.token,
    userId: authContext.userId,
  })
}
