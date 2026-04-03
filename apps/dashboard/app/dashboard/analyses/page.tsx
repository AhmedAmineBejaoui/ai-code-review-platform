"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { AnalysisTimeline } from "@/components/dashboard/AnalysisTimeline"
import { AnalysesPageHeader } from "@/components/dashboard/AnalysesPageHeader"
import { Loader2 } from "lucide-react"

function AnalysesContent() {
  const searchParams = useSearchParams()
  const filter = searchParams.get("filter") // today, week, pending, archived
  const status = searchParams.get("status") // in_progress, completed, attention
  const view = searchParams.get("view") // projects
  const action = searchParams.get("action") // new
  const period = searchParams.get("period") // 24h, week, month

  return (
    <div className="space-y-6">
      <AnalysesPageHeader 
        filter={filter} 
        status={status} 
        view={view}
        action={action}
      />
      <AnalysisTimeline period={period || undefined} />
    </div>
  )
}

export default function AnalysesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AnalysesContent />
    </Suspense>
  )
}
