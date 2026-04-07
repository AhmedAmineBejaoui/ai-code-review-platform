"use client"

/**
 * Mobile-compatible Dashboard Page
 * 
 * This version uses client-side auth checking via Clerk hooks
 * instead of server-side auth which is incompatible with static export.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/clerk-react"

import { DashboardContent } from "@/components/dashboard/new-dashboard/DashboardContent"

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push("/sign-in")
      return
    }

    // For mobile, we show the dashboard content directly
    // Role-based redirects will be handled by the dashboard components
    setIsReady(true)
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isReady) {
    return <LoadingState />
  }

  return <DashboardContent />
}
