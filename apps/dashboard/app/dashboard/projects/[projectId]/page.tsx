"use client"

import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  FileText,
  Code2,
  Layers,
  GitBranch,
  Users,
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  Play,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { useProjectDetail } from "@/hooks/use-project"
import { ProjectOverview } from "@/components/dashboard/project-overview"
import { cn } from "@/lib/utils"
import { ROLE_CONFIG, type ProjectTeamMember } from "@/types/project"

// Team member card component
function TeamMemberCard({ member }: { member: ProjectTeamMember }) {
  const roleConfig = ROLE_CONFIG[member.role]
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          member.name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{member.name}</p>
        {member.organization && (
          <p className="text-xs text-muted-foreground truncate">
            {member.organization.name}
          </p>
        )}
      </div>
      <Badge variant="secondary" className={cn("text-xs shrink-0", roleConfig.color)}>
        {roleConfig.label}
      </Badge>
    </div>
  )
}

// Quick stats card
function QuickStatsCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { project, profile, loading, runAnalysis } = useProjectDetail(projectId)

  if (loading) {
    return <ProjectOverviewSkeleton />
  }

  // If no profile exists, show empty state with CTA to analyze
  if (!profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Analysis Available</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              This project hasn&apos;t been analyzed yet. Run an analysis to get insights
              about your codebase, including structure, quality metrics, and recommendations.
            </p>
            <Button onClick={() => void runAnalysis()} className="gap-2">
              <Play className="h-4 w-4" />
              Run First Analysis
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatsCard
          icon={GitBranch}
          label="Branches"
          value={project?.branches || 0}
        />
        <QuickStatsCard
          icon={Activity}
          label="Commits"
          value={project?.commits || 0}
        />
        <QuickStatsCard
          icon={Users}
          label="Contributors"
          value={project?.contributors || 0}
        />
        <QuickStatsCard
          icon={Code2}
          label="Code Files"
          value={profile.structure?.code_files_count || 0}
          subValue={`${profile.structure?.total_files || 0} total files`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Project Profile (2 cols) */}
        <div className="lg:col-span-2">
          <ProjectOverview
            profile={profile}
            onRefresh={() => void runAnalysis()}
          />
        </div>

        {/* Right Column - Team & Activity */}
        <div className="space-y-6">
          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4" />
                Team Members
              </CardTitle>
              <CardDescription>
                {project?.teamMembers?.length || 0} members assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project?.teamMembers && project.teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {project.teamMembers.map((member) => (
                    <TeamMemberCard key={member.id} member={member} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No team members assigned yet
                  </p>
                  <Button variant="link" size="sm" className="mt-2">
                    Add Team Members
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-4 w-4" />
                Analysis Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={
                    profile.analysis_status === "completed"
                      ? "default"
                      : profile.analysis_status === "analyzing"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {profile.analysis_status === "completed" && (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  {profile.analysis_status === "analyzing" && (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  {profile.analysis_status === "failed" && (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {profile.analysis_status}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Context Version</span>
                  <span className="font-medium">v{profile.context_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Analyzed</span>
                  <span className="font-medium">
                    {new Date(profile.last_analyzed_at).toLocaleDateString()}
                  </span>
                </div>
                {profile.last_context_update_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Context Updated</span>
                    <span className="font-medium">
                      {new Date(profile.last_context_update_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quality Preview */}
          {profile.quality && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-4 w-4" />
                  Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">
                      {profile.quality.code_quality_score}%
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        profile.quality.code_quality_score >= 80
                          ? "text-green-500"
                          : profile.quality.code_quality_score >= 60
                          ? "text-yellow-500"
                          : "text-red-500"
                      )}
                    >
                      {profile.quality.code_quality_score >= 80
                        ? "Good"
                        : profile.quality.code_quality_score >= 60
                        ? "Fair"
                        : "Needs Work"}
                    </span>
                  </div>
                  <Progress value={profile.quality.code_quality_score} />

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {profile.quality.has_tests ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>Tests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.quality.has_ci_cd ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>CI/CD</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.quality.has_documentation ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>Docs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.quality.linting_tools.length > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>Linting</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ProjectOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Quick Stats Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
