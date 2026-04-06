"use client"

/**
 * Mobile-compatible Admin Layout
 * 
 * This version uses client-side auth checking via Clerk hooks
 * instead of server-side auth which is incompatible with static export.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/clerk-react"

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Checking permissions...</p>
      </div>
    </div>
  )
}

export default function AdminRoutesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push("/sign-in")
      return
    }

    // For mobile, we allow access to admin routes
    // The backend API will enforce actual permissions
    setIsLoading(false)
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || isLoading) {
    return <LoadingState />
  }

  return <>{children}</>
}
