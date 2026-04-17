/**
 * Simplified role system: admin, reviewer, developer
 * - admin: Full access, can manage organizations, projects, teams, and users
 * - reviewer: Can review code, approve/reject PRs, manage reviews
 * - developer: Can submit code for review, view own analyses
 */

export const APP_ROLES = ["admin", "reviewer", "developer"] as const

export type AppRole = (typeof APP_ROLES)[number]

// Roles that can perform reviews
export const REVIEW_ROLES = ["admin", "reviewer"] as const
export type ReviewRole = (typeof REVIEW_ROLES)[number]

// Roles that can modify project settings
export const PROJECT_SETTINGS_WRITE_ROLES = ["admin"] as const
export type ProjectSettingsWriteRole = (typeof PROJECT_SETTINGS_WRITE_ROLES)[number]

// Helper functions
export function isReviewer(role: AppRole): boolean {
  return role === "reviewer" || role === "admin"
}

export function canReview(role: AppRole): boolean {
  return REVIEW_ROLES.includes(role as ReviewRole)
}

export function canModifyProjectSettings(role: AppRole): boolean {
  return role === "admin"
}

export function isAdmin(role: AppRole): boolean {
  return role === "admin"
}

export function isReviewerLead(role: AppRole): boolean {
  return role === "admin"
}

/**
 * Role aliases for normalization
 * Maps various role strings to the simplified role system
 */
const ROLE_ALIASES: Record<string, AppRole> = {
  // Admin aliases
  admin: "admin",
  administrator: "admin",
  owner: "admin",
  superadmin: "admin",
  "super-admin": "admin",
  super_admin: "admin",
  tech_lead: "admin", // Legacy: tech_lead → admin
  "tech-lead": "admin",
  techlead: "admin",
  lead: "admin",
  team_lead: "admin",
  "team-lead": "admin",

  // Reviewer aliases (all reviewer levels map to reviewer)
  reviewer: "reviewer",
  review: "reviewer",
  "code-reviewer": "reviewer",
  code_reviewer: "reviewer",
  reviewer_lead: "reviewer", // Legacy
  "reviewer-lead": "reviewer",
  lead_reviewer: "reviewer",
  "lead-reviewer": "reviewer",
  reviewer_senior: "reviewer", // Legacy
  "reviewer-senior": "reviewer",
  senior_reviewer: "reviewer",
  "senior-reviewer": "reviewer",
  reviewer_junior: "reviewer", // Legacy
  "reviewer-junior": "reviewer",
  junior_reviewer: "reviewer",
  "junior-reviewer": "reviewer",

  // Developer aliases
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

  let normalized = value.trim().toLowerCase()
  if (normalized.startsWith("org:")) {
    normalized = normalized.slice(4)
  }

  return ROLE_ALIASES[normalized] ?? "developer"
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
      return "/dashboard/reviewer"
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

/**
 * Get role priority for comparison (higher = more privileged)
 */
export function getRolePriority(role: AppRole): number {
  switch (role) {
    case "admin":
      return 100
    case "reviewer":
      return 50
    case "developer":
      return 10
    default:
      return 0
  }
}

/**
 * Compare two roles and return the higher privileged one
 */
export function getHigherRole(role1: AppRole, role2: AppRole): AppRole {
  return getRolePriority(role1) >= getRolePriority(role2) ? role1 : role2
}
