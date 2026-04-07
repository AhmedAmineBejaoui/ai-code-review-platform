/**
 * Mobile-compatible Auth utilities
 * 
 * This is a stub version for mobile builds.
 * Server-side auth is not available in static export.
 * All auth checks should use Clerk's client-side hooks.
 */

import type { DashboardAuthUser } from "@/lib/dashboard-user"

/**
 * This function is not available in mobile builds.
 * Use Clerk's useAuth() hook for client-side auth checks instead.
 * 
 * @throws Error when called in mobile build
 */
export async function getAuthenticatedDashboardUser(): Promise<DashboardAuthUser | null> {
  // This function should never be called in mobile builds
  // All layouts that use this have been replaced with client-side versions
  console.warn(
    "[Mobile Build] getAuthenticatedDashboardUser() called - this is a mobile build stub. " +
    "Use Clerk's useAuth() hook for client-side auth checks."
  )
  
  return null
}
