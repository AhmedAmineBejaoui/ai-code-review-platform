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

  // If role is being updated, try to sync to Clerk publicMetadata
  // But don't fail if the user doesn't exist in Clerk (might be a local-only user)
  if (payload.role) {
    try {
      const client = await clerkClient()
      
      // Check if the userId looks like a Clerk ID (starts with "user_")
      const isClerkUserId = userId.startsWith("user_")
      
      if (isClerkUserId) {
        try {
          // First, get the current user to preserve existing publicMetadata
          const existingUser = await client.users.getUser(userId)
          const existingMetadata = (existingUser.publicMetadata as Record<string, unknown>) || {}
          
          // Merge existing metadata with the new role
          const updatedMetadata = {
            ...existingMetadata,
            role: payload.role,
          }
          
          // Update the user with merged metadata
          await client.users.updateUser(userId, {
            publicMetadata: updatedMetadata,
          })
          
          console.log(`[RBAC] Updated Clerk publicMetadata for user ${userId}: role=${payload.role}`)
        } catch (clerkError: unknown) {
          // Check if it's a "user not found" error (404)
          const isNotFoundError = 
            clerkError && 
            typeof clerkError === "object" && 
            "status" in clerkError && 
            clerkError.status === 404
          
          if (isNotFoundError) {
            // User doesn't exist in Clerk - this is OK, continue with backend update
            console.warn(`[RBAC] User ${userId} not found in Clerk, skipping metadata update`)
          } else {
            // Re-throw other Clerk errors
            throw clerkError
          }
        }
      } else {
        // Not a Clerk user ID - skip Clerk update
        console.log(`[RBAC] User ${userId} is not a Clerk user, skipping Clerk metadata update`)
      }
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
