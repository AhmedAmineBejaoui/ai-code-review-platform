import { NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/dashboard/repositories
 * 
 * Fetches list of repositories with their metadata, CI status, and recent activity.
 * Combines data from the backend and GitHub API.
 */
export async function GET(request: Request) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page") || "1"
  const limit = searchParams.get("limit") || "20"
  const language = searchParams.get("language") || ""
  const visibility = searchParams.get("visibility") || ""
  const search = searchParams.get("search") || ""

  // Build query string
  const queryParams = new URLSearchParams({
    page,
    limit,
    ...(language && { language }),
    ...(visibility && { visibility }),
    ...(search && { search }),
  })

  return proxyBackendRequest({
    method: "GET",
    path: `/api/v1/repositories?${queryParams.toString()}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}

/**
 * POST /api/dashboard/repositories
 * 
 * Import/register a new repository for analysis.
 */
export async function POST(request: Request) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  try {
    const body = await request.json()
    return proxyBackendRequest({
      method: "POST",
      path: "/api/v1/repositories",
      token: authContext.token,
      userId: authContext.userId,
      body,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
