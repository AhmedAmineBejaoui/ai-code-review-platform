"use client"

/**
 * Sign In Page - Graphite Design System
 * Compatible with Next.js static export (output: export)
 * 
 * Uses Clerk hooks instead of pre-built components for static compatibility
 */

import { useEffect, useState } from "react"
import { useSignIn, useAuth } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Hexagon Logo Component
function HexagonLogo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      className={className}
    >
      <path 
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="none"
      />
      <path 
        d="M16 6L24 11V21L16 26L8 21V11L16 6Z" 
        stroke="currentColor" 
        strokeWidth="1" 
        opacity="0.6"
        fill="none"
      />
    </svg>
  )
}

// GitHub Icon
function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

// Trust logos data
const trustLogos = [
  { name: "shopify", logo: "/landing/logos/shopify.svg" },
  { name: "snowflake", logo: "/landing/logos/snowflake.svg" },
  { name: "figma", logo: "/landing/logos/figma.svg" },
  { name: "datadog", logo: "/landing/logos/datadog.svg" },
  { name: "harvey", logo: "/landing/logos/harvey.svg" },
  { name: "duolingo", logo: "/landing/logos/duolingo.svg" },
  { name: "ramp", logo: "/landing/logos/ramp.svg" },
  { name: "asana", logo: "/landing/logos/asana.svg" },
]

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard")
    }
  }, [isSignedIn, router])

  const handleGitHubSignIn = async () => {
    if (!isLoaded || !signIn) return
    
    setIsLoading(true)
    setError("")
    
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_github",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during sign in"
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return
    
    setIsLoading(true)
    setError("")
    
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during sign in"
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0C0C0D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#E8713A]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0C0C0D] flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Card with corner decorators */}
          <div className="relative">
            {/* Corner decorators */}
            <span className="absolute -top-3 -left-3 text-[#4A4A54] text-lg font-light">+</span>
            <span className="absolute -top-3 -right-3 text-[#4A4A54] text-lg font-light">+</span>
            <span className="absolute -bottom-3 -left-3 text-[#4A4A54] text-lg font-light">+</span>
            <span className="absolute -bottom-3 -right-3 text-[#4A4A54] text-lg font-light">+</span>
            
            {/* Dashed border box */}
            <div className="border border-dashed border-[#2A2A2E] rounded-lg p-6 sm:p-8">
              {/* Logo and brand */}
              <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
                <HexagonLogo size={28} className="text-[#A0A0A8]" />
                <span className="text-lg sm:text-xl font-semibold text-[#F5F5F5]">AI Code Review</span>
              </div>

              {/* Welcome text */}
              <h1 className="text-lg sm:text-xl font-medium text-[#F5F5F5] text-center mb-6 sm:mb-8">
                Welcome back to AI Code Review
              </h1>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Sign in buttons */}
              <div className="space-y-3">
                {/* GitHub button (primary) */}
                <button
                  onClick={handleGitHubSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 sm:py-4 bg-[#4285F4] hover:bg-[#3574E2] text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  <GitHubIcon className="w-5 h-5" />
                  {isLoading ? "Signing in..." : "Log in with GitHub"}
                </button>

                {/* Google button (secondary) */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 sm:py-4 bg-[#222226] hover:bg-[#2A2A2E] text-[#F5F5F5] border border-[#2A2A2E] rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isLoading ? "Signing in..." : "Log in with Google"}
                </button>
              </div>

              {/* Sign up link */}
              <p className="text-center text-[#6B6B75] text-sm mt-6">
                Don&apos;t have an account yet?{" "}
                <Link href="/sign-up" className="text-[#E8713A] hover:text-[#F09456] font-medium transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Trust logos section */}
          <div className="mt-8 sm:mt-12">
            <div className="relative">
              {/* Corner decorators */}
              <span className="absolute -top-3 -left-3 text-[#4A4A54] text-lg font-light">+</span>
              <span className="absolute -top-3 -right-3 text-[#4A4A54] text-lg font-light">+</span>
              <span className="absolute -bottom-3 -left-3 text-[#4A4A54] text-lg font-light">+</span>
              <span className="absolute -bottom-3 -right-3 text-[#4A4A54] text-lg font-light">+</span>
              
              <div className="border border-dashed border-[#2A2A2E] rounded-lg p-4 sm:p-6">
                <p className="text-center text-[#6B6B75] text-sm mb-4">Trusted by</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {trustLogos.map((logo) => (
                    <div 
                      key={logo.name}
                      className="flex items-center justify-center h-8"
                    >
                      <img 
                        src={logo.logo} 
                        alt={logo.name} 
                        className="h-4 sm:h-5 w-auto opacity-50 hover:opacity-80 transition-opacity"
                        style={{ filter: "invert(0.6)" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center">
        <p className="text-[#6B6B75] text-xs sm:text-sm leading-relaxed">
          By signing in you acknowledge that you read and agree to our{" "}
          <Link href="/terms" className="text-[#A0A0A8] hover:text-[#F5F5F5] underline transition-colors">
            Terms of Service
          </Link>
          {" "}and{" "}
          <Link href="/privacy" className="text-[#A0A0A8] hover:text-[#F5F5F5] underline transition-colors">
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </div>
  )
}
