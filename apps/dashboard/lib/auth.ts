import "server-only"

import { auth, currentUser } from "@clerk/nextjs/server"

import type { DashboardAuthUser } from "@/lib/dashboard-user"
import { extractRoleFromClaims, normalizeRole } from "@/lib/roles"

function parseAdminEmails(rawValue: string | undefined): Set<string> {
  if (!rawValue || rawValue.trim().length === 0) {
    return new Set()
  }
  return new Set(
    rawValue
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )
}

const ADMIN_EMAIL_OVERRIDES = parseAdminEmails(
  process.env.DASHBOARD_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS,
)

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
  const { userId, sessionClaims, orgId, orgRole, orgSlug } = await auth()
  if (!userId) {
    return null
  }

  const user = await currentUser()
  
  // IMPORTANT: Prioritize publicMetadata.role over sessionClaims
  // sessionClaims are cached in JWT and may be stale after role updates
  // publicMetadata is fetched fresh from Clerk and reflects the latest role
  const userRoleCandidate =
    user?.publicMetadata?.role ?? user?.unsafeMetadata?.role ?? user?.privateMetadata?.role

  const metadataRole = typeof userRoleCandidate === "string" ? normalizeRole(userRoleCandidate) : "developer"
  
  // Only fall back to sessionClaims if publicMetadata doesn't have a role
  const claimsRole = metadataRole === "developer" ? extractRoleFromClaims(sessionClaims) : "developer"
  const baseRole = metadataRole !== "developer" ? metadataRole : claimsRole
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
  const role = ADMIN_EMAIL_OVERRIDES.has(email.trim().toLowerCase()) ? "admin" : baseRole

  const claims = (sessionClaims as Record<string, unknown> | null | undefined) ?? {}
  const orgNameCandidate =
    (typeof claims.org_name === "string" ? claims.org_name : undefined) ??
    (typeof claims.organization_name === "string" ? claims.organization_name : undefined)
  const normalizedOrgRole = (() => {
    if (typeof orgRole !== "string" || orgRole.trim().length === 0) {
      return undefined
    }
    const raw = orgRole.trim().toLowerCase()
    return raw.startsWith("org:") ? raw.slice(4) : raw
  })()

  const organization =
    orgId != null
      ? {
          id: orgId,
          slug: orgSlug ?? undefined,
          name: orgNameCandidate ?? undefined,
          role: normalizedOrgRole,
        }
      : null

  return {
    id: userId,
    name,
    email,
    role,
    avatar: initials(name, email),
    organization,
  }
}
