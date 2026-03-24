"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  GitBranch,
  Calendar,
  ArrowUpDown,
  Eye,
  Play,
  UserPlus,
  MoreVertical,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

// Mock data - would be fetched from API
const mockQueueData = {
  assigned: [
    {
      id: "asg_001",
      analysis: {
        id: "ana_123",
        repo: "frontend/webapp",
        pr_label: "PR #456",
        author: "alice@company.com",
        findings_summary: { blocker: 2, warn: 5, info: 10 },
        complexity_score: 3.5,
      },
      priority: "high",
      assignment_type: "auto",
      assigned_at: "2026-03-24T08:30:00Z",
      due_at: "2026-03-24T18:00:00Z",
      status: "pending",
      wait_time_hours: 8.5,
      is_overdue: true,
    },
    {
      id: "asg_002",
      analysis: {
        id: "ana_124",
        repo: "backend/api",
        pr_label: "PR #789",
        author: "bob@company.com",
        findings_summary: { blocker: 0, warn: 3, info: 8 },
        complexity_score: 2.0,
      },
      priority: "medium",
      assignment_type: "manual",
      assigned_at: "2026-03-24T10:00:00Z",
      due_at: "2026-03-25T10:00:00Z",
      status: "pending",
      wait_time_hours: 6,
      is_overdue: false,
    },
  ],
  available: [
    {
      id: "asg_003",
      analysis: {
        id: "ana_125",
        repo: "mobile/ios",
        pr_label: "PR #321",
        author: "charlie@company.com",
        findings_summary: { blocker: 1, warn: 2, info: 4 },
        complexity_score: 1.5,
      },
      priority: "medium",
      assignment_type: "auto",
      assigned_at: "2026-03-24T14:00:00Z",
      due_at: "2026-03-25T14:00:00Z",
      status: "pending",
      wait_time_hours: 2,
      is_overdue: false,
    },
  ],
  stats: {
    pending_count: 5,
    in_progress_count: 2,
    overdue_count: 1,
  },
}

interface QueueFilters {
  status: string
  priority: string
  search: string
  sortBy: string
  sortOrder: "asc" | "desc"
}

export function ReviewQueue() {
  const [queueData, setQueueData] = useState(mockQueueData)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("assigned")
  const [filters, setFilters] = useState<QueueFilters>({
    status: "all",
    priority: "all",
    search: "",
    sortBy: "due_at",
    sortOrder: "asc",
  })

  // Filtered and sorted data
  const filteredAssigned = useMemo(() => {
    let items = queueData.assigned

    // Apply search filter
    if (filters.search) {
      const query = filters.search.toLowerCase()
      items = items.filter(
        (item) =>
          item.analysis.repo.toLowerCase().includes(query) ||
          item.analysis.author.toLowerCase().includes(query) ||
          item.analysis.pr_label.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filters.status !== "all") {
      items = items.filter((item) => item.status === filters.status)
    }

    // Apply priority filter
    if (filters.priority !== "all") {
      items = items.filter((item) => item.priority === filters.priority)
    }

    // Apply sorting
    items.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (filters.sortBy) {
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
          break
        case "wait_time":
          aValue = a.wait_time_hours
          bValue = b.wait_time_hours
          break
        case "complexity":
          aValue = a.analysis.complexity_score
          bValue = b.analysis.complexity_score
          break
        case "due_at":
        default:
          aValue = new Date(a.due_at).getTime()
          bValue = new Date(b.due_at).getTime()
          break
      }

      return filters.sortOrder === "asc" ? aValue - bValue : bValue - aValue
    })

    return items
  }, [queueData.assigned, filters])

  const handleClaimReview = async (assignmentId: string) => {
    setLoading(true)
    try {
      // await fetch(`/api/reviews/assignments/${assignmentId}/claim`, { method: 'POST' })
      // Refresh data
      console.log("Claiming assignment:", assignmentId)
    } catch (error) {
      console.error("Failed to claim review:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartReview = async (assignmentId: string, analysisId: string) => {
    // Navigate to review page and mark as started
    window.location.href = `/dashboard/review/${analysisId}?assignment=${assignmentId}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatTimeUntilDue = (dueAt: string) => {
    const now = new Date()
    const due = new Date(dueAt)
    const diffHours = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (diffHours < 0) return `${Math.abs(diffHours)}h overdue`
    if (diffHours === 0) return "Due now"
    if (diffHours < 24) return `${diffHours}h remaining`
    return `${Math.ceil(diffHours / 24)}d remaining`
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{queueData.stats.pending_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{queueData.stats.in_progress_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{queueData.stats.overdue_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center">
              <Button size="sm" onClick={() => window.location.reload()}>
                <Clock className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="assigned">
              Assigned to Me ({queueData.assigned.length})
            </TabsTrigger>
            <TabsTrigger value="available">
              Available ({queueData.available.length})
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search reviews..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-64"
            />
            <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value })}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_at">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="wait_time">Wait Time</SelectItem>
                <SelectItem value="complexity">Complexity</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" })}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="assigned">
          <Card>
            <CardHeader>
              <CardTitle>My Assigned Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Complexity</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssigned.map((item) => (
                    <TableRow key={item.id} className={item.is_overdue ? "bg-red-50" : ""}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`} />
                          <Badge
                            variant={
                              item.priority === "critical" ? "destructive" :
                              item.priority === "high" ? "destructive" :
                              item.priority === "medium" ? "default" : "secondary"
                            }
                          >
                            {item.priority}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Link
                            href={`/dashboard/review/${item.analysis.id}`}
                            className="font-medium hover:underline"
                          >
                            {item.analysis.repo}
                          </Link>
                          <p className="text-sm text-muted-foreground">{item.analysis.pr_label}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.analysis.author}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive" className="text-xs">
                            {item.analysis.findings_summary.blocker}
                          </Badge>
                          <Badge variant="default" className="text-xs">
                            {item.analysis.findings_summary.warn}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.analysis.findings_summary.info}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < Math.floor(item.analysis.complexity_score)
                                  ? "bg-orange-500"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                          <span className="text-xs ml-1">{item.analysis.complexity_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={item.wait_time_hours > 6 ? "text-red-600 font-medium" : ""}>
                          {item.wait_time_hours}h
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className={item.is_overdue ? "text-red-600 font-medium" : ""}>
                          {formatTimeUntilDue(item.due_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleStartReview(item.id, item.analysis.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                          <Link href={`/dashboard/review/${item.analysis.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Reassign</DropdownMenuItem>
                              <DropdownMenuItem>Change Priority</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Decline</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAssigned.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-muted-foreground">No assigned reviews found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available">
          <Card>
            <CardHeader>
              <CardTitle>Available for Self-Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Complexity</TableHead>
                    <TableHead>Estimated Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueData.available.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`} />
                          <Badge variant={item.priority === "high" ? "destructive" : "default"}>
                            {item.priority}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.analysis.repo}</p>
                          <p className="text-sm text-muted-foreground">{item.analysis.pr_label}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.analysis.author}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive" className="text-xs">
                            {item.analysis.findings_summary.blocker}
                          </Badge>
                          <Badge variant="default" className="text-xs">
                            {item.analysis.findings_summary.warn}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.analysis.findings_summary.info}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < Math.floor(item.analysis.complexity_score)
                                  ? "bg-orange-500"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                          <span className="text-xs ml-1">{item.analysis.complexity_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">~30 min</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleClaimReview(item.id)}
                            disabled={loading}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Claim
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {queueData.available.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-muted-foreground">No available reviews</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}