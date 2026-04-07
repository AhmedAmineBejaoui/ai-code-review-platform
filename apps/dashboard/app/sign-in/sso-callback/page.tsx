"use client"

/**
 * SSO Callback Page for Sign In
 * Handles OAuth redirects from providers like GitHub and Google
 */

import { useEffect } from "react"
import { useSignIn, useAuth } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"

export default function SSOCallback() {
  const { signIn, isLoaded } = useSignIn()
  const { isSignedIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return

    // If already signed in, redirect to dashboard
    if (isSignedIn) {
      router.push("/dashboard")
      return
    }

    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        // Get the OAuth result from the URL
        const result = await signIn?.handleRedirectCallback()
        
        if (result?.status === "complete") {
          router.push("/dashboard")
        }
      } catch (error) {
        console.error("SSO callback error:", error)
        router.push("/sign-in")
      }
    }

    handleCallback()
  }, [isLoaded, isSignedIn, signIn, router])

  return (
    <div className="min-h-screen bg-[#0C0C0D] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E8713A] mx-auto mb-4" />
        <p className="text-[#A0A0A8] text-sm">Completing sign in...</p>
      </div>
    </div>
  )
}
