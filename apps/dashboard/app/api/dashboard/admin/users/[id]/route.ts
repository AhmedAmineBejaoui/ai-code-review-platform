import { NextResponse } from "next/server"

import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const userId = context.params.id
  if (!userId || userId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
  }

  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  return proxyBackendRequest({
    method: "PATCH",
    path: `/v1/admin/users/${encodeURIComponent(userId)}`,
    token: authContext.token,
    userId: authContext.userId,
    body: payload,
  })
}
