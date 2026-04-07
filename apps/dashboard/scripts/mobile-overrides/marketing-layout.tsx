"use client"

/**
 * Mobile-optimized Marketing Layout
 * Replaces (marketing)/layout.tsx for mobile builds
 */

import { useEffect } from "react"
import { useAuth } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"

export default function MobileMarketingLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/auth/role-redirect")
    }
  }, [isSignedIn, isLoaded, router])

  return children
}
