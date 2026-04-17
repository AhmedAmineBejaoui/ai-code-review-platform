import { NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/dashboard/teams/[teamId]/members/[userId]
 * Body: { role?: string, permissions?: string[] }
 * 
 * Update a team member's role or permissions.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string; userId: string } },
) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) return authContext.response

  try {
    const body = await request.json()
    return proxyBackendRequest({
      method: "PATCH",
      path: `/api/v1/teams/${encodeURIComponent(params.teamId)}/members/${encodeURIComponent(params.userId)}`,
      token: authContext.token,
      userId: authContext.userId,
      body,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

/**
 * DELETE /api/dashboard/teams/[teamId]/members/[userId]
 * 
 * Remove a member from a team.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { teamId: string; userId: string } },
) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) return authContext.response

  return proxyBackendRequest({
    method: "DELETE",
    path: `/api/v1/teams/${encodeURIComponent(params.teamId)}/members/${encodeURIComponent(params.userId)}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}
