import { NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/dashboard/statistics
 * 
 * Fetches comprehensive statistics for the dashboard including:
 * - Code quality trends
 * - Review velocity metrics
 * - Team performance data
 * - Issue distribution
 */
export async function GET(request: Request) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  const { searchParams } = new URL(request.url)
  const timeRange = searchParams.get("timeRange") || "30d"
  const category = searchParams.get("category") || "all" // quality, velocity, team

  const queryParams = new URLSearchParams({
    time_range: timeRange,
    category,
  })

  return proxyBackendRequest({
    method: "GET",
    path: `/api/v1/statistics?${queryParams.toString()}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}
