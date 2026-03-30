"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Folder,
  FolderOpen,
  GitBranch,
  Star,
  StarOff,
  Clock,
  Users,
  Code2,
  MoreHorizontal,
  Search,
  Plus,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Trash2,
  Archive,
  Eye,
  GitCommit,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for projects
const projectsData = [
  {
    id: 1,
    name: "API Gateway",
    description: "Main API gateway service for all microservices",
    language: "TypeScript",
    team: "Development",
    status: "active",
    starred: true,
    lastActivity: "2h ago",
    branches: 12,
    openIssues: 5,
    healthScore: 92,
    commits: 234,
    contributors: 8,
    coverage: 87,
  },
  {
    id: 2,
    name: "Authentication Service",
    description: "User authentication and authorization module",
    language: "Go",
    team: "Development",
    status: "active",
    starred: true,
    lastActivity: "4h ago",
    branches: 8,
    openIssues: 2,
    healthScore: 95,
    commits: 156,
    contributors: 5,
    coverage: 92,
  },
  {
    id: 3,
    name: "Dashboard UI",
    description: "Admin dashboard frontend application",
    language: "TypeScript",
    team: "Development",
    status: "active",
    starred: false,
    lastActivity: "1h ago",
    branches: 15,
    openIssues: 8,
    healthScore: 78,
    commits: 312,
    contributors: 6,
    coverage: 71,
  },
  {
    id: 4,
    name: "Data Pipeline",
    description: "ETL and data processing service",
    language: "Python",
    team: "DevOps",
    status: "active",
    starred: false,
    lastActivity: "6h ago",
    branches: 6,
    openIssues: 3,
    healthScore: 88,
    commits: 98,
    contributors: 4,
    coverage: 85,
  },
  {
    id: 5,
    name: "Mobile App",
    description: "Cross-platform mobile application",
    language: "Dart",
    team: "Development",
    status: "maintenance",
    starred: false,
    lastActivity: "2d ago",
    branches: 4,
    openIssues: 12,
    healthScore: 65,
    commits: 445,
    contributors: 7,
    coverage: 62,
  },
  {
    id: 6,
    name: "Notification Service",
    description: "Push notification and email service",
    language: "Node.js",
    team: "Development",
    status: "active",
    starred: true,
    lastActivity: "30m ago",
    branches: 5,
    openIssues: 1,
    healthScore: 96,
    commits: 87,
    contributors: 3,
    coverage: 94,
  },
]

const languageColors: Record<string, string> = {
  TypeScript: "bg-blue-500",
  Go: "bg-cyan-500",
  Python: "bg-yellow-500",
  Dart: "bg-teal-500",
  "Node.js": "bg-green-500",
}

const statusConfig = {
  active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  maintenance: { label: "Maintenance", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
}

function ProjectCard({ project, viewMode }: { project: typeof projectsData[0]; viewMode: "grid" | "list" }) {
  const [isStarred, setIsStarred] = useState(project.starred)
  const status = statusConfig[project.status as keyof typeof statusConfig]

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group"
      >
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Folder className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{project.name}</h3>
                  <div className={`h-2 w-2 rounded-full ${languageColors[project.language]}`} />
                  <span className="text-xs text-muted-foreground">{project.language}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{project.description}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GitBranch className="h-4 w-4" />
                  {project.branches}
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {project.openIssues}
                </span>
                <Badge variant="secondary" className={status.className}>
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
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
                      View Project
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className="hover:shadow-md transition-all h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Folder className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">{project.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-2 w-2 rounded-full ${languageColors[project.language]}`} />
                  <span className="text-xs text-muted-foreground">{project.language}</span>
                </div>
              </div>
            </div>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Health Score</span>
            <span className={`font-medium ${
              project.healthScore >= 90 ? "text-green-600" :
              project.healthScore >= 70 ? "text-yellow-600" : "text-red-600"
            }`}>
              {project.healthScore}%
            </span>
          </div>
          <Progress
            value={project.healthScore}
            className={`h-2 ${
              project.healthScore >= 90 ? "[&>div]:bg-green-500" :
              project.healthScore >= 70 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
            }`}
          />

          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-bold">{project.branches}</div>
              <div className="text-xs text-muted-foreground">Branches</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{project.commits}</div>
              <div className="text-xs text-muted-foreground">Commits</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{project.contributors}</div>
              <div className="text-xs text-muted-foreground">People</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant="secondary" className={status.className}>
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {project.lastActivity}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [teamFilter, setTeamFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filteredProjects = projectsData.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    const matchesTeam = teamFilter === "all" || project.team === teamFilter
    return matchesSearch && matchesStatus && matchesTeam
  })

  const starredProjects = filteredProjects.filter((p) => p.starred)
  const otherProjects = filteredProjects.filter((p) => !p.starred)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all your projects
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="DevOps">DevOps</SelectItem>
                <SelectItem value="QA">QA</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Starred Projects */}
      {starredProjects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Starred Projects
          </h2>
          <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {starredProjects.map((project, index) => (
              <ProjectCard key={project.id} project={project} viewMode={viewMode} />
            ))}
          </div>
        </div>
      )}

      {/* All Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Projects</h2>
        <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {otherProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} viewMode={viewMode} />
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your filters or create a new project
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
