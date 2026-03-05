export const APP_ROLES = ["admin", "reviewer", "developer"] as const

export type AppRole = (typeof APP_ROLES)[number]

const ROLE_ALIASES: Record<string, AppRole> = {
  admin: "admin",
  administrator: "admin",
  superadmin: "admin",
  "super-admin": "admin",
  super_admin: "admin",
  reviewer: "reviewer",
  review: "reviewer",
  "code-reviewer": "reviewer",
  code_reviewer: "reviewer",
  developer: "developer",
  dev: "developer",
  member: "developer",
  user: "developer",
  viewer: "developer",
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  return value as Record<string, unknown>
}

function hasValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return value !== null && value !== undefined
}

export function normalizeRole(value: unknown): AppRole {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = normalizeRole(item)
      if (nested !== "developer") {
        return nested
      }
    }
    return "developer"
  }

  if (typeof value !== "string") {
    return "developer"
  }

  return ROLE_ALIASES[value.trim().toLowerCase()] ?? "developer"
}

export function extractRoleFromClaims(sessionClaims: unknown): AppRole {
  const claims = asRecord(sessionClaims)
  if (!claims) {
    return "developer"
  }

  const metadata = asRecord(claims.metadata)
  const publicMetadata = asRecord(claims.publicMetadata ?? claims.public_metadata)
  const appMetadata = asRecord(claims.appMetadata ?? claims.app_metadata)
  const unsafeMetadata = asRecord(claims.unsafeMetadata ?? claims.unsafe_metadata)

  const candidates: unknown[] = [
    claims.role,
    claims.roles,
    claims.org_role,
    metadata?.role,
    publicMetadata?.role,
    appMetadata?.role,
    unsafeMetadata?.role,
  ]

  for (const candidate of candidates) {
    if (!hasValue(candidate)) {
      continue
    }
    return normalizeRole(candidate)
  }

  return "developer"
}

export function getRoleHomePath(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin/knowledge-base"
    case "reviewer":
      return "/dashboard/analyses"
    default:
      return "/dashboard"
  }
}

export function formatRoleLabel(role: AppRole): string {
  switch (role) {
    case "admin":
      return "Admin"
    case "reviewer":
      return "Reviewer"
    default:
      return "Developer"
  }
}

