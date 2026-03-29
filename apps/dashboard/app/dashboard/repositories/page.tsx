"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  Star,
  StarOff,
  Eye,
  Code2,
  ExternalLink,
  Clock,
  Users,
  MoreHorizontal,
  Search,
  Plus,
  Filter,
  RefreshCw,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Settings,
  Copy,
  Download,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
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

// Mock data for repositories
const repositoriesData = [
  {
    id: 1,
    name: "api-gateway",
    fullName: "company/api-gateway",
    description: "Main API gateway service",
    language: "TypeScript",
    visibility: "private",
    starred: true,
    lastPush: "2h ago",
    branches: 12,
    openPRs: 3,
    issues: 5,
    stars: 24,
    forks: 8,
    watchers: 15,
    size: "45.2 MB",
    defaultBranch: "main",
    lastCommit: {
      message: "feat: add rate limiting middleware",
      author: "Alice Chen",
      sha: "a1b2c3d",
      time: "2h ago",
    },
    ciStatus: "passing",
  },
  {
    id: 2,
    name: "auth-service",
    fullName: "company/auth-service",
    description: "Authentication and authorization service",
    language: "Go",
    visibility: "private",
    starred: true,
    lastPush: "4h ago",
    branches: 8,
    openPRs: 1,
    issues: 2,
    stars: 18,
    forks: 5,
    watchers: 12,
    size: "28.7 MB",
    defaultBranch: "main",
    lastCommit: {
      message: "fix: token refresh race condition",
      author: "Bob Smith",
      sha: "d4e5f6g",
      time: "4h ago",
    },
    ciStatus: "passing",
  },
  {
    id: 3,
    name: "dashboard-ui",
    fullName: "company/dashboard-ui",
    description: "Admin dashboard frontend",
    language: "TypeScript",
    visibility: "private",
    starred: false,
    lastPush: "1h ago",
    branches: 15,
    openPRs: 5,
    issues: 8,
    stars: 32,
    forks: 12,
    watchers: 20,
    size: "112.4 MB",
    defaultBranch: "develop",
    lastCommit: {
      message: "style: update theme colors",
      author: "Carol Williams",
      sha: "h7i8j9k",
      time: "1h ago",
    },
    ciStatus: "failing",
  },
  {
    id: 4,
    name: "data-pipeline",
    fullName: "company/data-pipeline",
    description: "ETL and data processing",
    language: "Python",
    visibility: "private",
    starred: false,
    lastPush: "6h ago",
    branches: 6,
    openPRs: 2,
    issues: 3,
    stars: 15,
    forks: 4,
    watchers: 8,
    size: "34.1 MB",
    defaultBranch: "main",
    lastCommit: {
      message: "perf: optimize batch processing",
      author: "David Brown",
      sha: "l0m1n2o",
      time: "6h ago",
    },
    ciStatus: "passing",
  },
  {
    id: 5,
    name: "mobile-app",
    fullName: "company/mobile-app",
    description: "Cross-platform mobile application",
    language: "Dart",
    visibility: "public",
    starred: false,
    lastPush: "2d ago",
    branches: 4,
    openPRs: 0,
    issues: 12,
    stars: 156,
    forks: 45,
    watchers: 89,
    size: "87.3 MB",
    defaultBranch: "main",
    lastCommit: {
      message: "docs: update README",
      author: "Eva Martinez",
      sha: "p3q4r5s",
      time: "2d ago",
    },
    ciStatus: "passing",
  },
]

const languageColors: Record<string, string> = {
  TypeScript: "bg-blue-500",
  Go: "bg-cyan-500",
  Python: "bg-yellow-500",
  Dart: "bg-teal-500",
}

const ciStatusConfig = {
  passing: { icon: CheckCircle2, className: "text-green-500" },
  failing: { icon: AlertCircle, className: "text-red-500" },
  pending: { icon: RefreshCw, className: "text-yellow-500 animate-spin" },
}

function RepositoryRow({ repo }: { repo: typeof repositoriesData[0] }) {
  const [isStarred, setIsStarred] = useState(repo.starred)
  const CiIcon = ciStatusConfig[repo.ciStatus as keyof typeof ciStatusConfig].icon

  return (
    <TableRow className="group hover:bg-muted/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Code2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{repo.name}</span>
              {repo.visibility === "private" ? (
                <Lock className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Unlock className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{repo.description}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${languageColors[repo.language]}`} />
          <span className="text-sm">{repo.language}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <CiIcon className={`h-4 w-4 ${ciStatusConfig[repo.ciStatus as keyof typeof ciStatusConfig].className}`} />
          <span className="text-sm capitalize">{repo.ciStatus}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <GitBranch className="h-4 w-4" />
            {repo.branches}
          </span>
          <span className="flex items-center gap-1">
            <GitPullRequest className="h-4 w-4" />
            {repo.openPRs}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            {repo.stars}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p className="truncate max-w-[200px]">{repo.lastCommit.message}</p>
          <p className="text-xs text-muted-foreground">
            {repo.lastCommit.author} • {repo.lastCommit.time}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsStarred(!isStarred)}
          >
            {isStarred ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Repository
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Clone URL
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in GitHub
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function RepositoriesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [languageFilter, setLanguageFilter] = useState("all")
  const [visibilityFilter, setVisibilityFilter] = useState("all")

  const filteredRepos = repositoriesData.filter((repo) => {
    const matchesSearch = repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLanguage = languageFilter === "all" || repo.language === languageFilter
    const matchesVisibility = visibilityFilter === "all" || repo.visibility === visibilityFilter
    return matchesSearch && matchesLanguage && matchesVisibility
  })

  const stats = {
    total: repositoriesData.length,
    private: repositoriesData.filter((r) => r.visibility === "private").length,
    public: repositoriesData.filter((r) => r.visibility === "public").length,
    totalStars: repositoriesData.reduce((acc, r) => acc + r.stars, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repositories</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage code repositories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Import Repository
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Private
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.private}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Unlock className="h-3 w-3" />
              Public
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.public}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3" />
              Total Stars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStars}</div>
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
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="TypeScript">TypeScript</SelectItem>
                <SelectItem value="Go">Go</SelectItem>
                <SelectItem value="Python">Python</SelectItem>
                <SelectItem value="Dart">Dart</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Repositories Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Repository</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>CI Status</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Last Commit</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepos.map((repo) => (
                <RepositoryRow key={repo.id} repo={repo} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredRepos.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No repositories found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your filters or import a new repository
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
