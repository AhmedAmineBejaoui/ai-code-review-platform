"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  GitPullRequest,
  GitCommit,
  GitBranch,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjectAnalyses } from "@/hooks/use-project"
import { cn } from "@/lib/utils"
import { type AnalysisSummary } from "@/types/project"

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    iconClassName: "",
  },
  in_progress: {
    label: "In Progress",
    icon: Loader2,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    iconClassName: "animate-spin",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    iconClassName: "",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    iconClassName: "",
  },
}

// Type icon mapping
const TYPE_ICONS = {
  pull_request: GitPullRequest,
  commit: GitCommit,
  branch: GitBranch,
}

// Findings severity badge
function FindingsBadge({ findings }: { findings: AnalysisSummary["findings"] }) {
  const total = findings.critical + findings.high + findings.medium + findings.low + findings.info
  
  if (total === 0) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        No Issues
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {findings.critical > 0 && (
        <Badge variant="destructive" className="text-xs px-1.5">
          {findings.critical}C
        </Badge>
      )}
      {findings.high > 0 && (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs px-1.5">
          {findings.high}H
        </Badge>
      )}
      {findings.medium > 0 && (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs px-1.5">
          {findings.medium}M
        </Badge>
      )}
      {findings.low > 0 && (
        <Badge variant="secondary" className="text-xs px-1.5">
          {findings.low}L
        </Badge>
      )}
    </div>
  )
}

// Analysis row component
function AnalysisRow({ analysis }: { analysis: AnalysisSummary }) {
  const router = useRouter()
  const status = STATUS_CONFIG[analysis.status]
  const TypeIcon = TYPE_ICONS[analysis.type]

  const handleClick = () => {
    router.push(`/dashboard/review/${analysis.id}`)
  }

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleClick}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">{analysis.title}</p>
            <p className="text-xs text-muted-foreground">
              {analysis.type === "pull_request" ? `PR #${analysis.referenceId}` : 
               analysis.type === "commit" ? analysis.referenceId.slice(0, 7) :
               analysis.referenceId}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn("gap-1", status.className)}>
          <status.icon className={cn("h-3 w-3", status.iconClassName)} />
          {status.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <span className="font-medium">{analysis.filesChanged}</span>
          <span className="text-muted-foreground"> files</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="text-green-600">+{analysis.linesAdded}</span>
          {" / "}
          <span className="text-red-600">-{analysis.linesRemoved}</span>
        </div>
      </TableCell>
      <TableCell>
        <FindingsBadge findings={analysis.findings} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {analysis.author?.avatarUrl ? (
            <img
              src={analysis.author.avatarUrl}
              alt={analysis.author.name}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
              {analysis.author?.name?.charAt(0) || "?"}
            </div>
          )}
          <span className="text-sm text-muted-foreground">
            {analysis.author?.name || "Unknown"}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(analysis.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" className="gap-1">
          View
          <ArrowRight className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

// Mock data for development
const MOCK_ANALYSES: AnalysisSummary[] = [
  {
    id: "1",
    projectId: "1",
    type: "pull_request",
    referenceId: "142",
    title: "feat: Add user authentication flow",
    status: "completed",
    filesChanged: 12,
    linesAdded: 458,
    linesRemoved: 23,
    findings: { critical: 0, high: 1, medium: 3, low: 5, info: 2 },
    author: { name: "John Doe" },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    projectId: "1",
    type: "pull_request",
    referenceId: "141",
    title: "fix: Resolve memory leak in data processing",
    status: "in_progress",
    filesChanged: 3,
    linesAdded: 45,
    linesRemoved: 12,
    findings: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    author: { name: "Jane Smith" },
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    projectId: "1",
    type: "commit",
    referenceId: "a1b2c3d4e5f6",
    title: "refactor: Optimize database queries",
    status: "completed",
    filesChanged: 8,
    linesAdded: 156,
    linesRemoved: 89,
    findings: { critical: 0, high: 0, medium: 2, low: 1, info: 4 },
    author: { name: "Bob Wilson" },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    projectId: "1",
    type: "pull_request",
    referenceId: "140",
    title: "chore: Update dependencies",
    status: "failed",
    filesChanged: 2,
    linesAdded: 234,
    linesRemoved: 198,
    findings: { critical: 2, high: 3, medium: 1, low: 0, info: 0 },
    author: { name: "Alice Brown" },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export default function ProjectAnalysesPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const { analyses: fetchedAnalyses, loading, error } = useProjectAnalyses(projectId)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // Use mock data if no real data available
  const analyses = fetchedAnalyses.length > 0 ? fetchedAnalyses : MOCK_ANALYSES

  // Filter analyses
  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesSearch = 
      analysis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.referenceId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || analysis.status === statusFilter
    const matchesType = typeFilter === "all" || analysis.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  // Stats
  const stats = {
    total: analyses.length,
    completed: analyses.filter((a) => a.status === "completed").length,
    inProgress: analyses.filter((a) => a.status === "in_progress").length,
    failed: analyses.filter((a) => a.status === "failed").length,
  }

  if (loading) {
    return <AnalysesPageSkeleton />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Analyses</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <Loader2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search analyses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pull_request">Pull Requests</SelectItem>
                <SelectItem value="commit">Commits</SelectItem>
                <SelectItem value="branch">Branches</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analyses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
          <CardDescription>
            View and manage all code analyses for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAnalyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No analyses found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Run an analysis to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Analysis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnalyses.map((analysis) => (
                  <AnalysisRow key={analysis.id} analysis={analysis} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AnalysesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
