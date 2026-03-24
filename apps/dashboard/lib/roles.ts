export const APP_ROLES = [
  "admin",
  "reviewer_lead",
  "reviewer_senior",
  "reviewer_junior",
  "developer"
] as const

export type AppRole = (typeof APP_ROLES)[number]

// Reviewer levels for easier checking
export const REVIEWER_ROLES = ["reviewer_lead", "reviewer_senior", "reviewer_junior"] as const
export type ReviewerRole = (typeof REVIEWER_ROLES)[number]

// Helper functions
export function isReviewer(role: AppRole): role is ReviewerRole {
  return REVIEWER_ROLES.includes(role as ReviewerRole)
}

export function isReviewerSeniorOrLead(role: AppRole): boolean {
  return role === "reviewer_senior" || role === "reviewer_lead"
}

export function isReviewerLead(role: AppRole): boolean {
  return role === "reviewer_lead"
}

const ROLE_ALIASES: Record<string, AppRole> = {
  // Admin aliases
  admin: "admin",
  administrator: "admin",
  owner: "admin",
  superadmin: "admin",
  "super-admin": "admin",
  super_admin: "admin",

  // Reviewer level aliases
  reviewer_lead: "reviewer_lead",
  "reviewer-lead": "reviewer_lead",
  lead_reviewer: "reviewer_lead",
  "lead-reviewer": "reviewer_lead",

  reviewer_senior: "reviewer_senior",
  "reviewer-senior": "reviewer_senior",
  senior_reviewer: "reviewer_senior",
  "senior-reviewer": "reviewer_senior",

  reviewer_junior: "reviewer_junior",
  "reviewer-junior": "reviewer_junior",
  junior_reviewer: "reviewer_junior",
  "junior-reviewer": "reviewer_junior",

  // Generic reviewer (maps to senior for backward compatibility)
  reviewer: "reviewer_senior",
  review: "reviewer_senior",
  "code-reviewer": "reviewer_senior",
  code_reviewer: "reviewer_senior",

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
    case "reviewer_lead":
    case "reviewer_senior":
    case "reviewer_junior":
      return "/dashboard/reviewer"
    default:
      return "/dashboard"
  }
}

export function formatRoleLabel(role: AppRole): string {
  switch (role) {
    case "admin":
      return "Admin"
    case "reviewer_lead":
      return "Lead Reviewer"
    case "reviewer_senior":
      return "Senior Reviewer"
    case "reviewer_junior":
      return "Junior Reviewer"
    default:
      return "Developer"
  }
}
