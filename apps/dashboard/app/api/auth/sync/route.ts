import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { extractRoleFromClaims } from "@/lib/roles"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
const BACKEND_SYNC_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.DASHBOARD_BACKEND_SYNC_TIMEOUT_MS ?? "15000") || 15_000,
)

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
  const roleCandidate = extractRoleFromClaims(sessionClaims)
  const claims = (sessionClaims as Record<string, unknown> | null | undefined) ?? {}
  const orgNameCandidate = firstNonEmpty(
    typeof claims.org_name === "string" ? claims.org_name : undefined,
    typeof claims.organization_name === "string" ? claims.organization_name : undefined,
  )

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BACKEND_SYNC_TIMEOUT_MS)
  let backendResponse: Response
  try {
    backendResponse = await fetch(`${BACKEND_API_BASE_URL}/v1/auth/sync`, {
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
      signal: controller.signal,
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      {
        error: "Backend auth sync timeout",
        backend_timeout_ms: BACKEND_SYNC_TIMEOUT_MS,
      },
      { status: 504 },
    )
  } finally {
    clearTimeout(timeout)
  }

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
