"use client"

/**
 * Mobile-optimized Landing Page
 * Replaces (marketing)/page.tsx for mobile builds
 */

import { useEffect } from "react"
import { useAuth } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, GitBranch, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isCapacitor } from "@/lib/capacitor"

export default function MobileLandingPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/auth/role-redirect")
    }
  }, [isSignedIn, isLoaded, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Mobile-optimized Hero Section */}
      <section className="relative overflow-hidden px-4 py-12 pb-safe safe-bottom">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.blue.100),white)] opacity-20" />
        
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700"
            >
              <Zap className="h-3 w-3" />
              Code Review for the AI Era
            </motion.div>

            {/* Heading - Smaller for mobile */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl"
            >
              Ship Faster with
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI-Powered Code Review
              </span>
            </motion.h1>

            {/* Description - Shorter for mobile */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mx-auto mt-4 max-w-lg text-base leading-7 text-gray-600"
            >
              Get instant reviews with clear summaries and fixes. Catch bugs and security issues before they reach production.
            </motion.p>

            {/* CTA Buttons - Stacked on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center"
            >
              <Link href="/sign-up" className="w-full sm:w-auto">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  View Dashboard
                </Button>
              </Link>
            </motion.div>

            {/* Stats - Vertical on small screens */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 grid grid-cols-1 gap-6 text-sm sm:grid-cols-3 sm:gap-8"
            >
              <div className="flex items-center justify-center gap-3 sm:flex-col sm:gap-2">
                <GitBranch className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="text-left sm:text-center">
                  <div className="font-semibold text-gray-900">10x Faster</div>
                  <div className="text-gray-600">Review Speed</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 sm:flex-col sm:gap-2">
                <Shield className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="text-left sm:text-center">
                  <div className="font-semibold text-gray-900">99% Accuracy</div>
                  <div className="text-gray-600">Bug Detection</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 sm:flex-col sm:gap-2">
                <Zap className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="text-left sm:text-center">
                  <div className="font-semibold text-gray-900">5 Minutes</div>
                  <div className="text-gray-600">Setup Time</div>
                </div>
              </div>
            </motion.div>

            {/* Mobile app indicator */}
            {isCapacitor() && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 text-xs text-gray-500"
              >
                📱 Running on mobile app
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Extra padding at bottom for safe area */}
        <div className="h-8 sm:h-0" />
      </section>
    </div>
  )
}
