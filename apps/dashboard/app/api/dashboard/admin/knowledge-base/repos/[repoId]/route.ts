import { NextResponse } from "next/server"

import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

export async function DELETE(_request: Request, context: { params: { repoId: string } }) {
  const repoId = context.params.repoId
  if (!repoId || repoId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid repo id" }, { status: 400 })
  }

  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  return proxyBackendRequest({
    method: "DELETE",
    path: `/v1/kb/repos/${encodeURIComponent(repoId)}`,
    token: authContext.token,
    userId: authContext.userId,
  })
}
