"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  Folder,
  GitBranch,
  Star,
  StarOff,
  Clock,
  MoreHorizontal,
  Search,
  Plus,
  Grid3X3,
  List,
  AlertTriangle,
  Settings,
  Archive,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog"

// Types for projects
interface Project {
  id: string
  name: string
  description: string
  language: string
  team: string
  status: "active" | "maintenance" | "archived"
  starred: boolean
  lastActivity: string
  branches: number
  openIssues: number
  healthScore: number
  commits: number
  contributors: number
  coverage: number
}

const languageColors: Record<string, string> = {
  TypeScript: "bg-blue-500",
  Go: "bg-cyan-500",
  Python: "bg-yellow-500",
  Dart: "bg-teal-500",
  "Node.js": "bg-green-500",
}

const statusConfig = {
  active: { label: "Actif", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  maintenance: { label: "Maintenance", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  archived: { label: "Archive", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
}

interface ProjectCardProps {
  project: typeof projectsData[0]
  viewMode: "grid" | "list"
  onClick: () => void
}

function ProjectCard({ project, viewMode, onClick }: ProjectCardProps) {
  const [isStarred, setIsStarred] = useState(project.starred)
  const status = statusConfig[project.status as keyof typeof statusConfig]

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsStarred(!isStarred)
  }

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group"
      >
        <Card 
          className="hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
          onClick={onClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Folder className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium hover:text-primary transition-colors">{project.name}</h3>
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
                  onClick={handleStarClick}
                >
                  {isStarred ? (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={handleDropdownClick}>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onClick}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir le Projet
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Parametres
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archiver
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
      <Card 
        className="hover:shadow-md transition-all h-full cursor-pointer hover:border-primary/50"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Folder className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <CardTitle className="text-base group-hover:text-primary transition-colors">
                  {project.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{project.language}</span>
                </div>
              </div>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStarClick}
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
            <span className="text-muted-foreground">Score Sante</span>
            <span className={cn(
              "font-medium",
              project.healthScore >= 90 ? "text-green-600" :
              project.healthScore >= 70 ? "text-yellow-600" : "text-red-600"
            )}>
              {project.healthScore}%
            </span>
          </div>
          <Progress
            value={project.healthScore}
            className={cn(
              "h-2",
              project.healthScore >= 90 ? "[&>div]:bg-green-500" :
              project.healthScore >= 70 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
            )}
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
              <div className="text-xs text-muted-foreground">Personnes</div>
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
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [teamFilter, setTeamFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to fetch from API
      const response = await fetch('/api/v1/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.items || []) // API returns {items: [...], total: ...}
      } else {
        // Return empty array if API not available
        console.warn("Projects API not available:", response.status, response.statusText)
        setProjects([])
      }
    } catch (err) {
      // Return empty array if API not available
      console.warn("Failed to fetch projects:", err)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    const matchesTeam = teamFilter === "all" || project.team === teamFilter
    return matchesSearch && matchesStatus && matchesTeam
  })

  const starredProjects = filteredProjects.filter((p) => p.starred)
  const otherProjects = filteredProjects.filter((p) => !p.starred)

  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`)
  }

  const handleNewProject = () => {
    setCreateDialogOpen(true)
  }

  const handleProjectCreated = (projectId: string) => {
    fetchProjects() // Refresh list
    router.push(`/dashboard/projects/${encodeURIComponent(projectId)}`)
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Chargement des projets...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                Erreur de chargement
              </h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
              <Button onClick={fetchProjects} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projets</h1>
          <p className="text-muted-foreground mt-1">
            Gerer et surveiller tous vos projets
          </p>
        </div>
        <Button className="gap-2" onClick={handleNewProject}>
          <Plus className="h-4 w-4" />
          Nouveau Projet
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des projets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les Statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="archived">Archive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les Equipes</SelectItem>
                <SelectItem value="Development">Developpement</SelectItem>
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
            Projets Favoris
          </h2>
          <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {starredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                viewMode={viewMode}
                onClick={() => handleProjectClick(project.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Projects */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Tous les Projets</h2>
        <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {otherProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              viewMode={viewMode}
              onClick={() => handleProjectClick(project.id)}
            />
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucun projet trouve</h3>
            <p className="text-muted-foreground mt-1">
              Essayez d'ajuster vos filtres ou creez un nouveau projet
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />
    </div>
  )
}
