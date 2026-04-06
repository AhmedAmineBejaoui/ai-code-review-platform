import { NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * POST /api/v1/projects
 *
 * Create a new project.
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
      path: "/api/v1/projects",
      token: authContext.token,
      userId: authContext.userId,
      body,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

/**
 * GET /api/v1/projects
 *
 * List projects.
 */
export async function GET(request: Request) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  const { searchParams } = new URL(request.url)
  const queryParams = new URLSearchParams()
  for (const [key, value] of searchParams) {
    queryParams.set(key, value)
  }

  return proxyBackendRequest({
    method: "GET",
    path: `/api/v1/projects?${queryParams.toString()}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}