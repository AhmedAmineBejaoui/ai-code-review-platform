import { authMiddleware } from "@clerk/nextjs"
import { NextResponse } from "next/server"

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 
  process.env.CLERK_PUBLISHABLE_KEY
)

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/terms",
  "/privacy",
  "/api/webhooks(.*)",
  "/api/dashboard/health(.*)",
]

// If Clerk is not configured, bypass authentication
if (!isClerkConfigured) {
  console.warn("⚠️  Clerk is not configured. Running in PUBLIC MODE (no authentication)")
  
  export default function middleware() {
    return NextResponse.next()
  }

  export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
  }
} else {
  // Clerk is configured, use normal authentication
  export default authMiddleware({
    publicRoutes,
    
    // Allow HTTP connections (disable secure cookie requirement for development/testing)
    // IMPORTANT: In production with HTTPS, remove this configuration
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
    
    afterAuth(auth, req) {
      // Allow public routes
      if (publicRoutes.some(route => {
        const pattern = new RegExp(`^${route.replace(/\(.*\)/, '.*')}$`)
        return pattern.test(req.nextUrl.pathname)
      })) {
        return NextResponse.next()
      }

      // Redirect to sign-in if not authenticated
      if (!auth.userId) {
        const signInUrl = new URL("/sign-in", req.url)
        signInUrl.searchParams.set("redirect_url", req.url)
        return NextResponse.redirect(signInUrl)
      }

      return NextResponse.next()
    },
  })

  export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
  }
}
