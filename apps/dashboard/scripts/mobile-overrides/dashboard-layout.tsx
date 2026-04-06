"use client"

/**
 * Mobile-compatible Dashboard Layout
 * 
 * This version uses client-side auth checking via Clerk hooks
 * instead of server-side auth which is incompatible with static export.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { DashboardLayout } from "@/components/dashboard/DashboardLayout"
import { DashboardUserProvider } from "@/components/dashboard/dashboard-user-provider"
import type { DashboardAuthUser } from "@/lib/dashboard-user"

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

export default function DashboardRoutesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isLoaded, isSignedIn, userId } = useAuth()
  const [user, setUser] = useState<DashboardAuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push("/sign-in")
      return
    }

    // Create a basic user object for mobile
    // The full user data will be fetched from the API in the dashboard components
    const mobileUser: DashboardAuthUser = {
      id: userId || "mobile-user",
      name: "User",
      email: "user@mobile.local",
      role: "developer",
      avatar: "US",
      organization: null,
    }

    setUser(mobileUser)
    setIsLoading(false)
  }, [isLoaded, isSignedIn, userId, router])

  if (!isLoaded || isLoading || !user) {
    return <LoadingState />
  }

  return (
    <DashboardUserProvider user={user}>
      <DashboardLayout>{children}</DashboardLayout>
    </DashboardUserProvider>
  )
}
