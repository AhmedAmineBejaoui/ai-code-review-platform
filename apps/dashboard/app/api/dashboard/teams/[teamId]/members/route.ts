import { NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/dashboard/teams/[teamId]/members
 * 
 * Get all members of a team.
 */
export async function GET(
  _request: Request,
  { params }: { params: { teamId: string } },
) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) return authContext.response

  return proxyBackendRequest({
    method: "GET",
    path: `/api/v1/teams/${encodeURIComponent(params.teamId)}/members`,
    token: authContext.token,
    userId: authContext.userId,
  })
}

/**
 * POST /api/dashboard/teams/[teamId]/members
 * Body: { user_id: string, role: string, permissions?: string[] }
 * 
 * Add a member to a team.
 */
export async function POST(
  request: Request,
  { params }: { params: { teamId: string } },
) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) return authContext.response

  try {
    const body = await request.json()
    return proxyBackendRequest({
      method: "POST",
      path: `/api/v1/teams/${encodeURIComponent(params.teamId)}/members`,
      token: authContext.token,
      userId: authContext.userId,
      body,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
