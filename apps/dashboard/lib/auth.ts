import "server-only"

import { auth, currentUser } from "@clerk/nextjs/server"
import { cache } from "react"

import type { DashboardAuthUser } from "@/lib/dashboard-user"
import { extractRoleFromClaims } from "@/lib/roles"

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

export const getAuthenticatedDashboardUser = cache(async (): Promise<DashboardAuthUser | null> => {
  const { userId, sessionClaims, orgId, orgRole, orgSlug } = await auth()
  if (!userId) {
    return null
  }

  const claims = (sessionClaims as Record<string, unknown> | null | undefined) ?? {}
  const baseRole = extractRoleFromClaims(claims)
  const claimName =
    firstString(
      claims.name,
      claims.full_name,
      claims.fullName,
      [claims.first_name, claims.last_name].filter(Boolean).join(" "),
      [claims.firstName, claims.lastName].filter(Boolean).join(" "),
      claims.username,
    ) ?? undefined
  const claimEmail =
    firstString(
      claims.email,
      claims.email_address,
      claims.emailAddress,
      claims.primary_email_address,
      claims.primaryEmailAddress,
    ) ?? undefined

  let user: Awaited<ReturnType<typeof currentUser>> | null = null
  if (!claimName || !claimEmail) {
    user = await currentUser()
  }

  const name =
    firstString(
      claimName,
      [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      user?.username,
    ) ?? "Utilisateur"

  const email =
    firstString(
      claimEmail,
      user?.emailAddresses?.find((address) => address.id === user?.primaryEmailAddressId)?.emailAddress,
      user?.emailAddresses?.[0]?.emailAddress,
    ) ?? "unknown@example.local"
  const role = ADMIN_EMAIL_OVERRIDES.has(email.trim().toLowerCase()) ? "admin" : baseRole

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
})
