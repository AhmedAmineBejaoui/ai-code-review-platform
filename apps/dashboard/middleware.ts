import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { extractRoleFromClaims, getRoleHomePath } from "@/lib/roles"

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/auth/role-redirect(.*)"])
const isAdminRoute = createRouteMatcher(["/dashboard/admin(.*)"])

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

function extractEmailFromClaims(claims: unknown): string | null {
  if (typeof claims !== "object" || claims === null) {
    return null
  }

  const record = claims as Record<string, unknown>
  const directEmail = record.email ?? record.email_address
  if (typeof directEmail === "string" && directEmail.trim().length > 0) {
    return directEmail.trim().toLowerCase()
  }

  const emailAddresses = record.email_addresses
  if (Array.isArray(emailAddresses)) {
    for (const item of emailAddresses) {
      if (typeof item !== "object" || item === null) {
        continue
      }
      const candidate = (item as Record<string, unknown>).email_address ?? (item as Record<string, unknown>).email
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim().toLowerCase()
      }
    }
  }

  return null
}

const ADMIN_EMAIL_OVERRIDES = parseAdminEmails(
  process.env.DASHBOARD_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS,
)

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth()
    const claimsEmail = extractEmailFromClaims(sessionClaims)
    const role =
      claimsEmail && ADMIN_EMAIL_OVERRIDES.has(claimsEmail)
        ? "admin"
        : extractRoleFromClaims(sessionClaims)

    if (role !== "admin") {
      return NextResponse.redirect(new URL(getRoleHomePath(role), req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
