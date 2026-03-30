import { Metadata } from "next"
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"

import { LandingHero } from "@/components/marketing/LandingHero"
import { ReviewEverywhereSection } from "@/components/marketing/ReviewEverywhereSection"
import { AIEraSection } from "@/components/marketing/AIEraSection"
import { WorkflowSection } from "@/components/marketing/WorkflowSection"
import { CTASection } from "@/components/marketing/CTASection"

export const metadata: Metadata = {
  title: "AI Code Review Platform - Sourcery for Modern Teams",
  description: "Instant code reviews with clear summaries and fixes. Catch bugs, enforce standards, and stop vulnerabilities early.",
}

export default async function MarketingLandingPage() {
  const user = await currentUser()
  
  // Redirect authenticated users to dashboard
  if (user) {
    redirect("/auth/role-redirect")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <LandingHero />
      <ReviewEverywhereSection />
      <AIEraSection />
      <WorkflowSection />
      <CTASection />
    </div>
  )
}
