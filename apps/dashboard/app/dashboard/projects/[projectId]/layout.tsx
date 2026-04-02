"use client"

import { useParams } from "next/navigation"
import { ProjectHeader } from "@/components/dashboard/project-header"
import { useProjectDetail } from "@/hooks/use-project"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProjectLayoutProps {
  children: React.ReactNode
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams()
  const projectId = params.projectId as string

  const {
    project,
    loading,
    error,
    refresh,
    runAnalysis,
    toggleStar,
  } = useProjectDetail(projectId)

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Failed to load project</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              {error.message || "An unexpected error occurred"}
            </p>
            <Button onClick={() => void refresh()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        loading={loading}
        onRunAnalysis={runAnalysis}
        onToggleStar={toggleStar}
      />
      {children}
    </div>
  )
}
