import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: { notificationId: string }
}

/**
 * DELETE /api/notifications/:notificationId
 * Delete a notification for current user.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  return proxyBackendRequest({
    method: "DELETE",
    path: `/api/v1/notifications/${encodeURIComponent(context.params.notificationId)}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}
