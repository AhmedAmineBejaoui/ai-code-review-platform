import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/dashboard/reviewer/metrics
 *
 * Proxies to the backend /v1/reviews/metrics/personal endpoint.
 * Accepts ?period_days=30 (7–365).
 */
export async function GET(request: Request) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  const { searchParams } = new URL(request.url)
  const periodDays = searchParams.get("period_days") || "30"

  return proxyBackendRequest({
    method: "GET",
    path: `/v1/reviews/metrics/personal?period_days=${periodDays}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}
