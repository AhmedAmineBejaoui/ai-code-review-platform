"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Filter,
  CheckmarkOutline,
  InProgress,
  Warning,
  Time,
  Code,
  ChevronRight,
  Star,
  StarFilled,
} from "@carbon/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

// Mock data for reviews
const mockReviews = [
  {
    id: "REV-001",
    title: "Add authentication middleware",
    project: "Backend API",
    repository: "api-gateway",
    branch: "feature/auth-middleware",
    status: "completed",
    priority: "high",
    createdAt: "2024-03-15",
    completedAt: "2024-03-16",
    linesChanged: 245,
    comments: 8,
    starred: true,
  },
  {
    id: "REV-002",
    title: "Fix memory leak in data processor",
    project: "Data Pipeline",
    repository: "data-processor",
    branch: "bugfix/memory-leak",
    status: "in_progress",
    priority: "critical",
    createdAt: "2024-03-18",
    completedAt: null,
    linesChanged: 89,
    comments: 3,
    starred: false,
  },
  {
    id: "REV-003",
    title: "Update user dashboard UI",
    project: "Frontend",
    repository: "web-app",
    branch: "feature/dashboard-redesign",
    status: "completed",
    priority: "medium",
    createdAt: "2024-03-10",
    completedAt: "2024-03-12",
    linesChanged: 512,
    comments: 15,
    starred: true,
  },
  {
    id: "REV-004",
    title: "Implement caching layer",
    project: "Backend API",
    repository: "api-gateway",
    branch: "feature/redis-cache",
    status: "pending",
    priority: "medium",
    createdAt: "2024-03-19",
    completedAt: null,
    linesChanged: 156,
    comments: 0,
    starred: false,
  },
  {
    id: "REV-005",
    title: "Add unit tests for auth module",
    project: "Backend API",
    repository: "api-gateway",
    branch: "test/auth-unit-tests",
    status: "completed",
    priority: "low",
    createdAt: "2024-03-14",
    completedAt: "2024-03-15",
    linesChanged: 320,
    comments: 5,
    starred: false,
  },
]

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckmarkOutline,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  in_progress: {
    label: "In Progress",
    icon: InProgress,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  pending: {
    label: "Pending",
    icon: Time,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
}

const priorityConfig = {
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

export default function MyReviewsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [reviews, setReviews] = useState(mockReviews)

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.repository.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || review.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const toggleStar = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, starred: !r.starred } : r))
    )
  }

  const stats = {
    total: reviews.length,
    completed: reviews.filter((r) => r.status === "completed").length,
    inProgress: reviews.filter((r) => r.status === "in_progress").length,
    pending: reviews.filter((r) => r.status === "pending").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all your code review assignments
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {stats.completed}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {stats.inProgress}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => {
                  const status = statusConfig[review.status as keyof typeof statusConfig]
                  const priority = priorityConfig[review.priority as keyof typeof priorityConfig]
                  const StatusIcon = status.icon

                  return (
                    <TableRow
                      key={review.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStar(review.id)
                          }}
                          className="text-muted-foreground hover:text-yellow-500 transition-colors"
                        >
                          {review.starred ? (
                            <StarFilled className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{review.title}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Code className="h-3 w-3" />
                            {review.branch}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{review.project}</span>
                          <span className="text-xs text-muted-foreground">
                            {review.repository}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={status.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={priority.className}>
                          {priority.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        +{review.linesChanged}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {review.comments}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {filteredReviews.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Warning className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No reviews found</h3>
                <p className="text-muted-foreground mt-1">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
