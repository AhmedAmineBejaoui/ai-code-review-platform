import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

function firstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

export async function POST() {
  const { userId, getToken, orgId, orgRole, orgSlug, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [token, user] = await Promise.all([getToken(), currentUser()])
  if (!token) {
    return NextResponse.json({ error: "Missing Clerk token" }, { status: 401 })
  }

  const primaryEmail =
    user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress
  const displayName = firstNonEmpty(
    [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    user?.fullName ?? undefined,
    user?.username ?? undefined,
  )
  const roleCandidate = firstNonEmpty(
    typeof user?.publicMetadata?.role === "string" ? user.publicMetadata.role : undefined,
    typeof user?.unsafeMetadata?.role === "string" ? user.unsafeMetadata.role : undefined,
    typeof user?.privateMetadata?.role === "string" ? user.privateMetadata.role : undefined,
  )
  const claims = (sessionClaims as Record<string, unknown> | null | undefined) ?? {}
  const orgNameCandidate = firstNonEmpty(
    typeof claims.org_name === "string" ? claims.org_name : undefined,
    typeof claims.organization_name === "string" ? claims.organization_name : undefined,
  )

  const backendResponse = await fetch(`${BACKEND_API_BASE_URL}/v1/auth/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: primaryEmail,
      display_name: displayName,
      role: roleCandidate,
      org_id: orgId,
      org_slug: orgSlug,
      org_name: orgNameCandidate,
      org_role: orgRole,
    }),
    cache: "no-store",
  })

  const rawBody = await backendResponse.text()
  let parsedBody: unknown = {}

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      parsedBody = { detail: rawBody }
    }
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        error: "Failed to sync user with backend",
        backend_status: backendResponse.status,
        backend_response: parsedBody,
      },
      { status: backendResponse.status },
    )
  }

  return NextResponse.json(parsedBody, { status: 200 })
}
