import "server-only"

import { auth, currentUser } from "@clerk/nextjs/server"

import type { DashboardAuthUser } from "@/lib/dashboard-user"
import { extractRoleFromClaims, normalizeRole } from "@/lib/roles"

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

function initials(name: string, email: string): string {
  const words = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return email.slice(0, 2).toUpperCase() || "US"
}

export async function getAuthenticatedDashboardUser(): Promise<DashboardAuthUser | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    return null
  }

  const user = await currentUser()
  const claimsRole = extractRoleFromClaims(sessionClaims)

  const userRoleCandidate =
    user?.publicMetadata?.role ?? user?.unsafeMetadata?.role ?? user?.privateMetadata?.role

  const role = typeof userRoleCandidate === "string" ? normalizeRole(userRoleCandidate) : claimsRole
  const primaryEmailAddressId = user?.primaryEmailAddressId
  const primaryEmail =
    user?.emailAddresses.find((address) => address.id === primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress

  const name =
    firstString(
      [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      user?.username,
      (sessionClaims as Record<string, unknown> | null | undefined)?.name,
    ) ?? "Utilisateur"

  const email =
    firstString(
      primaryEmail,
      (sessionClaims as Record<string, unknown> | null | undefined)?.email,
      (sessionClaims as Record<string, unknown> | null | undefined)?.email_address,
    ) ?? "unknown@example.local"

  return {
    id: userId,
    name,
    email,
    role,
    avatar: initials(name, email),
  }
}
