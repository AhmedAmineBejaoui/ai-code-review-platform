import { NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string } },
) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) return authContext.response

  try {
    const body = await request.json()
    return proxyBackendRequest({
      method: "PATCH",
      path: `/api/v1/teams/${encodeURIComponent(params.teamId)}`,
      token: authContext.token,
      userId: authContext.userId,
      body,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { teamId: string } },
) {
  const authContext = await requireBackendAuth()
  if (!authContext.ok) return authContext.response

  return proxyBackendRequest({
    method: "GET",
    path: `/api/v1/teams/${encodeURIComponent(params.teamId)}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}
