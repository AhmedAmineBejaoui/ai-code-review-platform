"use client"

/**
 * Custom 404 / Not Found Page
 * 
 * For mobile builds (Capacitor), this page acts as a universal fallback.
 * When users navigate to dynamic routes (like /dashboard/projects/123),
 * this page will handle the routing by:
 * 1. Checking if we're in Capacitor
 * 2. For known route patterns, using router.replace to trigger client navigation
 * 3. For unknown routes, showing a 404 message
 * 
 * This approach avoids the need to import dynamic route components directly,
 * which would fail during static export when those files are backed up.
 */

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { isCapacitor } from "@/lib/capacitor"

// Known route patterns that should be handled by SPA navigation
const KNOWN_ROUTE_PATTERNS = [
  /^\/dashboard\/projects\/[^/]+$/,
  /^\/dashboard\/projects\/[^/]+\/analyses$/,
  /^\/dashboard\/projects\/[^/]+\/branches$/,
  /^\/dashboard\/projects\/[^/]+\/dependencies$/,
  /^\/dashboard\/projects\/[^/]+\/quality$/,
  /^\/dashboard\/diff\/[^/]+$/,
  /^\/dashboard\/history\/[^/]+$/,
  /^\/dashboard\/rag\/[^/]+$/,
  /^\/dashboard\/report\/[^/]+$/,
  /^\/dashboard\/review\/[^/]+$/,
  /^\/dashboard\/admin\/projects\/[^/]+\/settings$/,
  /^\/dashboard\/organization(\/.*)?$/,
  /^\/dashboard\/admin\/organization(\/.*)?$/,
  /^\/sign-in(\/.*)?$/,
  /^\/sign-up(\/.*)?$/,
]

function NotFoundContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

function isKnownRoute(pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, '') || '/'
  return KNOWN_ROUTE_PATTERNS.some(pattern => pattern.test(normalizedPath))
}

export default function NotFound() {
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [showNotFound, setShowNotFound] = useState(false)

  useEffect(() => {
    const handleRouting = async () => {
      const mobile = await isCapacitor()
      const normalizedPath = pathname?.replace(/\/$/, '') || '/'
      
      if (mobile && isKnownRoute(normalizedPath)) {
        // On mobile with a known route pattern, we're in the SPA fallback scenario
        // The route should be handled by the app's routing, but since we landed
        // on 404, it means we need to navigate client-side
        
        // For mobile, we'll try to refresh the route which should now work
        // because the app is loaded and can handle client-side routing
        console.log('[Mobile Fallback] Handling route:', normalizedPath)
        
        // Small delay to ensure the app is fully loaded
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Try to navigate to the route - this should work now that the app shell is loaded
        window.location.href = normalizedPath
        return
      }
      
      // Not mobile or not a known route - show 404
      setIsChecking(false)
      setShowNotFound(true)
    }

    handleRouting()
  }, [pathname, router])

  if (isChecking) {
    return <LoadingState />
  }

  if (showNotFound) {
    return <NotFoundContent />
  }

  return <LoadingState />
}
