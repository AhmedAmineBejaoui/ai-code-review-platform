"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ArrowUpCircle,
  Shield,
  Filter,
  Download,
  RefreshCw,
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
import { useProjectDependencies, useProjectDetail } from "@/hooks/use-project"
import { cn } from "@/lib/utils"
import { type DependencyInfo } from "@/types/project"

// Dependency type badge colors
const TYPE_COLORS = {
  production: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  dev: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  peer: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

// Vulnerability severity colors
const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
}

// Dependency row component
function DependencyRow({ dependency }: { dependency: DependencyInfo }) {
  const hasUpdate = dependency.latestVersion && dependency.version !== dependency.latestVersion
  
  return (
    <TableRow className={cn(dependency.hasVulnerability && "bg-red-50/50 dark:bg-red-900/10")}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center",
            dependency.hasVulnerability ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"
          )}>
            <Package className={cn(
              "h-4 w-4",
              dependency.hasVulnerability ? "text-red-600" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="font-medium text-sm">{dependency.name}</p>
            <p className="text-xs text-muted-foreground">{dependency.packageManager}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <code className="text-sm bg-muted px-2 py-0.5 rounded">
            {dependency.version}
          </code>
          {hasUpdate && (
            <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200">
              <ArrowUpCircle className="h-3 w-3" />
              {dependency.latestVersion}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn("text-xs", TYPE_COLORS[dependency.type])}>
          {dependency.type}
        </Badge>
      </TableCell>
      <TableCell>
        {dependency.hasVulnerability && dependency.vulnerabilitySeverity ? (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs gap-1",
              SEVERITY_COLORS[dependency.vulnerabilitySeverity]
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            {dependency.vulnerabilitySeverity}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Safe
          </span>
        )}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <a 
            href={`https://www.npmjs.com/package/${dependency.name}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </a>
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function ProjectDependenciesPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { dependencies: summary, dependenciesList, loading, error, refresh } = useProjectDependencies(projectId)
  const { profile } = useProjectDetail(projectId)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showVulnerable, setShowVulnerable] = useState(false)

  // Use real dependencies list from API
  const dependencies = dependenciesList || []

  // Filter dependencies
  const filteredDependencies = dependencies.filter((dep) => {
    const matchesSearch = dep.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || dep.type === typeFilter
    const matchesVulnerable = !showVulnerable || dep.hasVulnerability
    return matchesSearch && matchesType && matchesVulnerable
  })

  // Calculate stats from real data
  const stats = {
    total: summary?.totalCount || dependencies.length,
    production: summary?.productionCount || dependencies.filter((d) => d.type === "production").length,
    dev: summary?.devCount || dependencies.filter((d) => d.type === "dev").length,
    outdated: summary?.outdatedCount || dependencies.filter((d) => d.latestVersion && d.version !== d.latestVersion).length,
    vulnerable: summary?.vulnerableCount || dependencies.filter((d) => d.hasVulnerability).length,
  }

  if (loading) {
    return <DependenciesPageSkeleton />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary?.totalCount || stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{summary?.productionCount || stats.production}</p>
                <p className="text-sm text-muted-foreground">Production</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{summary?.devCount || stats.dev}</p>
                <p className="text-sm text-muted-foreground">Dev</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{summary?.outdatedCount || stats.outdated}</p>
                <p className="text-sm text-muted-foreground">Outdated</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{summary?.vulnerableCount || stats.vulnerable}</p>
                <p className="text-sm text-muted-foreground">Vulnerable</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerability Summary */}
      {(summary?.vulnerableCount || stats.vulnerable) > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Security Alert
            </CardTitle>
            <CardDescription>
              Vulnerabilities detected in your dependencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30">
                <p className="text-2xl font-bold text-red-600">
                  {summary?.vulnerabilities?.critical || 
                   dependencies.filter(d => d.vulnerabilitySeverity === "critical").length}
                </p>
                <p className="text-sm text-red-600">Critical</p>
              </div>
              <div className="p-4 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <p className="text-2xl font-bold text-orange-600">
                  {summary?.vulnerabilities?.high ||
                   dependencies.filter(d => d.vulnerabilitySeverity === "high").length}
                </p>
                <p className="text-sm text-orange-600">High</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <p className="text-2xl font-bold text-yellow-600">
                  {summary?.vulnerabilities?.medium ||
                   dependencies.filter(d => d.vulnerabilitySeverity === "medium").length}
                </p>
                <p className="text-sm text-yellow-600">Medium</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <p className="text-2xl font-bold text-blue-600">
                  {summary?.vulnerabilities?.low ||
                   dependencies.filter(d => d.vulnerabilitySeverity === "low").length}
                </p>
                <p className="text-sm text-blue-600">Low</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package Managers */}
      {(summary?.packageManagers || profile?.dependencies?.dependency_managers)?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Package Managers</CardTitle>
            <CardDescription>
              Dependency management tools used in this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(summary?.packageManagers || profile?.dependencies?.dependency_managers || []).map((pm) => (
                <Badge key={pm} variant="secondary" className="text-sm gap-1">
                  <Download className="h-3 w-3" />
                  {pm}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search dependencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="dev">Development</SelectItem>
                <SelectItem value="peer">Peer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showVulnerable ? "destructive" : "outline"}
              onClick={() => setShowVulnerable(!showVulnerable)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {showVulnerable ? "Show All" : "Vulnerable Only"}
            </Button>
            <Button variant="outline" onClick={() => void refresh()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dependencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dependencies</CardTitle>
          <CardDescription>
            {filteredDependencies.length} of {dependencies.length} dependencies shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDependencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No dependencies found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || typeFilter !== "all" || showVulnerable
                  ? "Try adjusting your filters"
                  : "No dependencies available for this project"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDependencies.map((dep) => (
                  <DependencyRow key={dep.name} dependency={dep} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DependenciesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Skeleton */}
      <div className="grid gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-20" />
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
            <Skeleton className="h-10 w-[140px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
