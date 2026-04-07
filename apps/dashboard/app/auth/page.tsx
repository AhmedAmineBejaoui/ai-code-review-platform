"use client"

/**
 * Mobile-compatible Auth Page
 * 
 * This version uses client-side auth checking via Clerk hooks
 * instead of server-side auth which is incompatible with static export.
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/clerk-react"

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    </div>
  )
}

export default function AuthRedirectPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn) {
      router.push("/auth/role-redirect")
    } else {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  return <LoadingState />
}
