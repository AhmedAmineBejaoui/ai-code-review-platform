"use client"

import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  TestTube,
  GitBranch,
  Code2,
  Lock,
  RefreshCw,
  TrendingUp,
  Bug,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectQuality, useProjectDetail } from "@/hooks/use-project"
import { cn } from "@/lib/utils"

// Quality score gauge component
function QualityGauge({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getColor = () => {
    if (score >= 80) return { stroke: "stroke-green-500", text: "text-green-500", label: "Excellent" }
    if (score >= 60) return { stroke: "stroke-yellow-500", text: "text-yellow-500", label: "Good" }
    if (score >= 40) return { stroke: "stroke-orange-500", text: "text-orange-500", label: "Fair" }
    return { stroke: "stroke-red-500", text: "text-red-500", label: "Needs Work" }
  }

  const color = getColor()

  return (
    <div className="relative flex flex-col items-center">
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className={color.stroke}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: "stroke-dashoffset 0.8s ease-in-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold", color.text)}>{score}%</span>
        <span className="text-sm text-muted-foreground">{color.label}</span>
      </div>
    </div>
  )
}

// Checklist item component
function ChecklistItem({
  checked,
  label,
  description,
  value,
}: {
  checked: boolean
  label: string
  description?: string
  value?: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div
        className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          checked ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
        )}
      >
        {checked ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm">{label}</p>
          {value && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {value}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

// Security issue card
function SecurityIssueCard({
  severity,
  count,
  icon: Icon,
}: {
  severity: string
  count: number
  icon: React.ElementType
}) {
  const config = {
    critical: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600", border: "border-red-200" },
    high: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600", border: "border-orange-200" },
    medium: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-600", border: "border-yellow-200" },
    low: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600", border: "border-blue-200" },
  }[severity] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted" }

  return (
    <div className={cn("p-4 rounded-lg border", config.border, config.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", config.text)} />
          <span className="font-medium capitalize">{severity}</span>
        </div>
        <span className={cn("text-2xl font-bold", config.text)}>{count}</span>
      </div>
    </div>
  )
}

export default function ProjectQualityPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { quality, loading, error, refresh } = useProjectQuality(projectId)
  const { profile } = useProjectDetail(projectId)

  if (loading) {
    return <QualityPageSkeleton />
  }

  if (!quality) {
    return (
      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Quality Data</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Quality metrics are not available for this project yet. Run an analysis to get
            insights about code quality, test coverage, and security.
          </p>
          <Button onClick={() => void refresh()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Main Quality Score */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quality Score
            </CardTitle>
            <CardDescription>
              Overall code quality assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <QualityGauge score={quality.overallScore} />
          </CardContent>
        </Card>

        {/* Quality Metrics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quality Metrics</CardTitle>
            <CardDescription>
              Detailed breakdown of quality indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quality.metrics?.testCoverage !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Test Coverage</span>
                  <span className="text-sm text-muted-foreground">
                    {quality.metrics.testCoverage}%
                  </span>
                </div>
                <Progress value={quality.metrics.testCoverage} className="h-2" />
              </div>
            )}
            {quality.metrics?.codeComplexity !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Code Complexity</span>
                  <span className="text-sm text-muted-foreground">
                    {quality.metrics.codeComplexity}%
                  </span>
                </div>
                <Progress value={quality.metrics.codeComplexity} className="h-2" />
              </div>
            )}
            {quality.metrics?.maintainability !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Maintainability</span>
                  <span className="text-sm text-muted-foreground">
                    {quality.metrics.maintainability}%
                  </span>
                </div>
                <Progress value={quality.metrics.maintainability} className="h-2" />
              </div>
            )}
            {quality.metrics?.documentation !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Documentation</span>
                  <span className="text-sm text-muted-foreground">
                    {quality.metrics.documentation}%
                  </span>
                </div>
                <Progress value={quality.metrics.documentation} className="h-2" />
              </div>
            )}
            {quality.metrics?.security !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Security</span>
                  <span className="text-sm text-muted-foreground">
                    {quality.metrics.security}%
                  </span>
                </div>
                <Progress value={quality.metrics.security} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklist and Security */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quality Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Quality Checklist
            </CardTitle>
            <CardDescription>
              Essential quality practices for your project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistItem
              checked={quality.checklist.hasTests}
              label="Unit Tests"
              description="Project has automated unit tests"
              value={profile?.quality?.test_framework}
            />
            <ChecklistItem
              checked={quality.checklist.hasCICD}
              label="CI/CD Pipeline"
              description="Continuous integration and deployment configured"
              value={profile?.quality?.ci_cd_platform}
            />
            <ChecklistItem
              checked={quality.checklist.hasDocumentation}
              label="Documentation"
              description="Project has README and code documentation"
            />
            <ChecklistItem
              checked={quality.checklist.hasLinting}
              label="Code Linting"
              description="Static code analysis tools configured"
              value={profile?.quality?.linting_tools?.join(", ")}
            />
            <ChecklistItem
              checked={quality.checklist.hasSecurityScanning}
              label="Security Scanning"
              description="Automated security vulnerability scanning"
            />
          </CardContent>
        </Card>

        {/* Security Vulnerabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Vulnerabilities
            </CardTitle>
            <CardDescription>
              Known security issues in your codebase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <SecurityIssueCard
                severity="critical"
                count={quality.securityIssues.critical}
                icon={AlertTriangle}
              />
              <SecurityIssueCard
                severity="high"
                count={quality.securityIssues.high}
                icon={AlertTriangle}
              />
              <SecurityIssueCard
                severity="medium"
                count={quality.securityIssues.medium}
                icon={Bug}
              />
              <SecurityIssueCard
                severity="low"
                count={quality.securityIssues.low}
                icon={Bug}
              />
            </div>

            {quality.securityIssues.critical + quality.securityIssues.high > 0 ? (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Action Required
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                      You have critical or high severity vulnerabilities that should be addressed immediately.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Looking Good
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300 mt-0.5">
                      No critical or high severity vulnerabilities detected.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Suggestions to improve your code quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!quality.checklist.hasDocumentation && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                <FileText className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Add Documentation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Consider adding a comprehensive README.md and inline code documentation
                    to improve maintainability and onboarding.
                  </p>
                </div>
              </div>
            )}
            {(quality.metrics?.testCoverage || 0) < 80 && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                <TestTube className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Increase Test Coverage</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your test coverage is below 80%. Consider adding more unit and integration
                    tests to improve code reliability.
                  </p>
                </div>
              </div>
            )}
            {!quality.checklist.hasSecurityScanning && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                <Lock className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Enable Security Scanning</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set up automated security scanning with tools like Snyk, Dependabot,
                    or CodeQL to detect vulnerabilities early.
                  </p>
                </div>
              </div>
            )}
            {quality.checklist.hasTests && quality.checklist.hasCICD && 
             quality.checklist.hasDocumentation && quality.checklist.hasLinting && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Great Job!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your project follows most quality best practices. Keep up the good work!
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function QualityPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Skeleton className="h-40 w-40 rounded-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
