import { Metadata } from "next"
import { Suspense } from "react"

import { AutoAnalysisToggle } from "@/components/settings/AutoAnalysisToggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = {
  title: "Project Settings | AI Code Review",
  description: "Configure project-level settings for AI code review",
}

interface ProjectSettingsPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { projectId } = await params
  
  // Decode the project ID (it may be URL encoded, e.g., "owner%2Frepo")
  const decodedProjectId = decodeURIComponent(projectId)

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Configure settings for <code className="rounded bg-muted px-1.5 py-0.5">{decodedProjectId}</code>
        </p>
      </div>

      <Tabs defaultValue="code-analysis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="code-analysis">Code Analysis</TabsTrigger>
          <TabsTrigger value="notifications" disabled>
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" disabled>
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code-analysis" className="space-y-6">
          <Suspense fallback={<SettingsSkeleton />}>
            <AutoAnalysisToggle projectId={decodedProjectId} />
          </Suspense>

          {/* Future settings can be added here */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle>Analysis Quality Settings</CardTitle>
              <CardDescription>
                Configure analysis depth and coverage options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Configure analysis strictness, ignored paths, and custom rules.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications about code reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Connect with external services and tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  )
}
