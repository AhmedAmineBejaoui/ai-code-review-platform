"use client"

import { Suspense } from "react"
import { OrganizationWorkspace } from "@/components/dashboard/OrganizationWorkspace"
import { GitHubOrganizationData } from "@/components/dashboard/GitHubOrganizationData"

export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      <OrganizationWorkspace
        profilePath="/dashboard/organization"
        showOrganizationProfile={false}
      />
      
      <Suspense fallback={<div className="p-6 text-muted-foreground">Loading GitHub organization data...</div>}>
        <GitHubOrganizationData />
      </Suspense>
    </div>
  )
}
