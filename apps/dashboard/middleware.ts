import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { extractRoleFromClaims, getRoleHomePath } from "@/lib/roles"

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/auth/role-redirect(.*)"])
const isAdminRoute = createRouteMatcher(["/dashboard/admin(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth()
    const role = extractRoleFromClaims(sessionClaims)

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
