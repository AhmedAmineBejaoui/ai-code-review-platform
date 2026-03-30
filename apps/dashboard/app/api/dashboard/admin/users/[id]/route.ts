import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

type UpdatePayload = {
  role?: string
  isActive?: boolean
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const userId = context.params.id
  if (!userId || userId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
  }

  const authContext = await requireBackendAuth()
  if (!authContext.ok) {
    return authContext.response
  }

  let payload: UpdatePayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  // If role is being updated, sync to Clerk publicMetadata first
  if (payload.role) {
    try {
      const client = await clerkClient()
      await client.users.updateUser(userId, {
        publicMetadata: {
          role: payload.role,
        },
      })
    } catch (clerkError) {
      console.error("Failed to update Clerk user metadata:", clerkError)
      return NextResponse.json(
        {
          error: "Failed to update role in authentication system",
          details: clerkError instanceof Error ? clerkError.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  }

  // Then proxy to backend to update PostgreSQL
  return proxyBackendRequest({
    method: "PATCH",
    path: `/v1/admin/users/${encodeURIComponent(userId)}`,
    token: authContext.token,
    userId: authContext.userId,
    body: payload,
  })
}
