"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Filter,
  Search,
  ChevronRight,
  Eye,
  Share2,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCompactRelativeTime as formatDate } from "@/lib/domain/dates"

// Mock data for reports
const reportsData = [
  {
    id: "RPT-001",
    name: "Weekly Code Quality Summary",
    type: "quality",
    status: "completed",
    createdAt: "2024-03-28T10:30:00",
    size: "2.4 MB",
    author: "System",
    issues: { critical: 2, high: 5, medium: 12, low: 8 },
  },
  {
    id: "RPT-002",
    name: "Security Vulnerability Report",
    type: "security",
    status: "completed",
    createdAt: "2024-03-28T08:15:00",
    size: "1.8 MB",
    author: "Alice Chen",
    issues: { critical: 1, high: 3, medium: 7, low: 4 },
  },
  {
    id: "RPT-003",
    name: "Performance Analysis - API Gateway",
    type: "performance",
    status: "processing",
    createdAt: "2024-03-28T14:45:00",
    size: "—",
    author: "Bob Smith",
    issues: { critical: 0, high: 2, medium: 8, low: 15 },
  },
  {
    id: "RPT-004",
    name: "Sprint 23 Review Summary",
    type: "review",
    status: "completed",
    createdAt: "2024-03-27T16:20:00",
    size: "3.2 MB",
    author: "Carol Williams",
    issues: { critical: 0, high: 1, medium: 4, low: 6 },
  },
  {
    id: "RPT-005",
    name: "Database Migration Analysis",
    type: "quality",
    status: "failed",
    createdAt: "2024-03-27T11:00:00",
    size: "—",
    author: "David Brown",
    issues: { critical: 5, high: 8, medium: 12, low: 3 },
  },
  {
    id: "RPT-006",
    name: "Authentication Module Review",
    type: "security",
    status: "completed",
    createdAt: "2024-03-26T09:30:00",
    size: "1.5 MB",
    author: "Eva Martinez",
    issues: { critical: 0, high: 2, medium: 5, low: 9 },
  },
  {
    id: "RPT-007",
    name: "Frontend Performance Audit",
    type: "performance",
    status: "completed",
    createdAt: "2024-03-25T14:00:00",
    size: "2.1 MB",
    author: "Alice Chen",
    issues: { critical: 1, high: 4, medium: 11, low: 7 },
  },
  {
    id: "RPT-008",
    name: "Code Coverage Report",
    type: "quality",
    status: "completed",
    createdAt: "2024-03-22T10:15:00",
    size: "892 KB",
    author: "System",
    issues: { critical: 0, high: 0, medium: 3, low: 12 },
  },
]

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  processing: {
    label: "Processing",
    icon: Clock,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
}

const typeConfig = {
  quality: { label: "Quality", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  security: { label: "Security", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  performance: { label: "Performance", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  review: { label: "Review", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
}

function isWithinPeriod(dateString: string, period: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  switch (period) {
    case "24h":
      return diffHours <= 24
    case "week":
      return diffDays <= 7
    case "month":
      return diffDays <= 30
    default:
      return true
  }
}

function ReportCard({ report }: { report: typeof reportsData[0] }) {
  const status = statusConfig[report.status as keyof typeof statusConfig]
  const type = typeConfig[report.type as keyof typeof typeConfig]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary/50 hover:border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium truncate">{report.name}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={status.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <Badge variant="secondary" className={type.className}>
                  {type.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(report.createdAt)}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  View Report
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {report.status === "completed" && (
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {report.issues.critical} Critical
              </span>
              <span className="flex items-center gap-1 text-orange-600">
                {report.issues.high} High
              </span>
              <span className="flex items-center gap-1 text-yellow-600">
                {report.issues.medium} Medium
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                {report.issues.low} Low
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const periodParam = searchParams.get("period") || "all"
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredReports = useMemo(() => {
    return reportsData.filter((report) => {
      const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "all" || report.type === typeFilter
      const matchesStatus = statusFilter === "all" || report.status === statusFilter
      const matchesPeriod = periodParam === "all" || isWithinPeriod(report.createdAt, periodParam)
      return matchesSearch && matchesType && matchesStatus && matchesPeriod
    })
  }, [searchQuery, typeFilter, statusFilter, periodParam])

  const stats = {
    total: reportsData.length,
    completed: reportsData.filter((r) => r.status === "completed").length,
    processing: reportsData.filter((r) => r.status === "processing").length,
    failed: reportsData.filter((r) => r.status === "failed").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recent Reports</h1>
          <p className="text-muted-foreground mt-1">
            {periodParam === "24h" && "Reports from the last 24 hours"}
            {periodParam === "week" && "Reports from this week"}
            {periodParam === "month" && "Reports from this month"}
            {periodParam === "all" && "All generated reports and analyses"}
          </p>
        </div>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Generate New Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
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
                placeholder="Search reports..."
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
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="review">Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredReports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <ReportCard report={report} />
          </motion.div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No reports found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your filters or generate a new report
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
