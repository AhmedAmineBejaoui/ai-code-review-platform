"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  GitBranch,
  Search,
  Shield,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  GitMerge,
  Filter,
  Star,
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
import { useProjectBranches } from "@/hooks/use-project"
import { cn } from "@/lib/utils"
import { type BranchInfo } from "@/types/project"

// Branch type configuration
const BRANCH_TYPE_CONFIG = {
  main: {
    label: "Main",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  feature: {
    label: "Feature",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  release: {
    label: "Release",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  hotfix: {
    label: "Hotfix",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  other: {
    label: "Other",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

// Branch status configuration
const BRANCH_STATUS_CONFIG = {
  active: {
    label: "Active",
    className: "text-green-600",
  },
  stale: {
    label: "Stale",
    className: "text-yellow-600",
  },
  merged: {
    label: "Merged",
    className: "text-purple-600",
  },
}

// Branch card component
function BranchCard({ branch }: { branch: BranchInfo }) {
  const typeConfig = BRANCH_TYPE_CONFIG[branch.type]
  const statusConfig = branch.status ? BRANCH_STATUS_CONFIG[branch.status] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Branch Info */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                branch.isDefault ? "bg-primary/10" : "bg-muted"
              )}>
                <GitBranch className={cn(
                  "h-5 w-5",
                  branch.isDefault ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate">{branch.name}</h3>
                  {branch.isDefault && (
                    <Badge variant="default" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                  {branch.isProtected && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Shield className="h-3 w-3" />
                      Protected
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <Badge variant="outline" className={cn("text-xs", typeConfig.className)}>
                    {typeConfig.label}
                  </Badge>
                  {statusConfig && (
                    <span className={cn("text-xs font-medium", statusConfig.className)}>
                      {statusConfig.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ahead/Behind */}
            {branch.aheadBehind && !branch.isDefault && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-sm">
                  <ArrowUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{branch.aheadBehind.ahead}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowDown className="h-4 w-4 text-red-500" />
                  <span className="font-medium">{branch.aheadBehind.behind}</span>
                </div>
              </div>
            )}
          </div>

          {/* Last Commit */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {branch.lastCommit.author.charAt(0).toUpperCase()}
              </div>
              <span className="text-muted-foreground truncate flex-1">
                {branch.lastCommit.message}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono">
                  {branch.lastCommit.sha.slice(0, 7)}
                </code>
                <span>by {branch.lastCommit.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(branch.lastCommit.date).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ProjectBranchesPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { branches, loading, error } = useProjectBranches(projectId)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("recent")

  // Filter and sort branches
  const filteredBranches = branches
    .filter((branch) => {
      const matchesSearch = branch.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "all" || branch.type === typeFilter
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.lastCommit.date).getTime() - new Date(a.lastCommit.date).getTime()
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      }
      if (sortBy === "ahead") {
        return (b.aheadBehind?.ahead || 0) - (a.aheadBehind?.ahead || 0)
      }
      return 0
    })

  // Group branches by type for stats
  const stats = {
    total: branches.length,
    protected: branches.filter((b) => b.isProtected).length,
    feature: branches.filter((b) => b.type === "feature").length,
    stale: branches.filter((b) => b.status === "stale").length,
  }

  if (loading) {
    return <BranchesPageSkeleton />
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
                <p className="text-sm text-muted-foreground">Total Branches</p>
              </div>
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.protected}</p>
                <p className="text-sm text-muted-foreground">Protected</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.feature}</p>
                <p className="text-sm text-muted-foreground">Feature</p>
              </div>
              <GitMerge className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.stale}</p>
                <p className="text-sm text-muted-foreground">Stale</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
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
                placeholder="Search branches..."
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
                <SelectItem value="main">Main</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="release">Release</SelectItem>
                <SelectItem value="hotfix">Hotfix</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="ahead">Most Ahead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Branches List */}
      {filteredBranches.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No branches found</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "No branches available for this project"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredBranches.map((branch) => (
            <BranchCard key={branch.name} branch={branch} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function BranchesPageSkeleton() {
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

      {/* Branches Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
