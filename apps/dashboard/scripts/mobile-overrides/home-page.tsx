"use client"

/**
 * Mobile Home Page
 * Replaces app/page.tsx for mobile builds
 * Simple landing page without heavy dependencies
 */

import { useEffect } from "react"
import { useAuth } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, GitBranch, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MobileHomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard")
    }
  }, [isSignedIn, isLoaded, router])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Mobile-optimized Hero Section with safe areas */}
      <section className="relative flex flex-1 flex-col overflow-hidden px-4 py-8 pt-safe pb-safe">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.100),white)] opacity-20" />
        
        {/* Scrollable content */}
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col justify-center text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center justify-center gap-2 self-center rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700">
              <Zap className="h-3 w-3" />
              Code Review for the AI Era
            </div>

            {/* Heading - Mobile optimized */}
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Ship Faster with
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI-Powered Code Review
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-4 max-w-lg px-2 text-base leading-7 text-gray-600">
              Get instant reviews with clear summaries and fixes. Catch bugs and security issues before they reach production.
            </p>

            {/* CTA Buttons - Full width on mobile */}
            <div className="mt-8 flex flex-col items-stretch gap-3 px-4">
              <Link href="/sign-up" className="w-full">
                <Button size="lg" className="w-full gap-2 text-base">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full">
                <Button size="lg" variant="outline" className="w-full text-base">
                  Go to Dashboard
                </Button>
              </Link>
            </div>

            {/* Stats - Compact on mobile */}
            <div className="mt-10 grid grid-cols-1 gap-4 px-4 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg bg-white/50 p-3 backdrop-blur-sm">
                <GitBranch className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">10x Faster</div>
                  <div className="text-xs text-gray-600">Review Speed</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white/50 p-3 backdrop-blur-sm">
                <Shield className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">99% Accuracy</div>
                  <div className="text-xs text-gray-600">Bug Detection</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white/50 p-3 backdrop-blur-sm">
                <Zap className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">5 Minutes</div>
                  <div className="text-xs text-gray-600">Setup Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
