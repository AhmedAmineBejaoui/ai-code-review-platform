"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { AnalysisList } from "@/components/dashboard/AnalysisList"
import { AnalysesPageHeader } from "@/components/dashboard/AnalysesPageHeader"

function AnalysesContent() {
  const searchParams = useSearchParams()
  const filter = searchParams.get("filter") // today, week, pending, archived
  const status = searchParams.get("status") // in_progress, completed, attention
  const view = searchParams.get("view") // projects
  const action = searchParams.get("action") // new

  return (
    <div className="space-y-6">
      <AnalysesPageHeader 
        filter={filter} 
        status={status} 
        view={view}
        action={action}
      />
      <AnalysisList />
    </div>
  )
}

export default function AnalysesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalysesContent />
    </Suspense>
  )
}
