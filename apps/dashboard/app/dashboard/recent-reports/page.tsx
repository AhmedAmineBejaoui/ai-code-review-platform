"use client"

import { EnhancedRecentReports } from "@/components/dashboard/EnhancedRecentReports"

export default function RecentReportsPage() {
  return (
    <div className="container mx-auto py-8">
      <EnhancedRecentReports limit={50} showHeader={true} />
    </div>
  )
}