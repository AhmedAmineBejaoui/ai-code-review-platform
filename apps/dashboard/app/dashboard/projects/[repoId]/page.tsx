"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Folder, GitBranch, AlertTriangle, Clock, Users, ExternalLink, Github } from "lucide-react"

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

interface GithubRepo {
  id: number
  name: string
  fullName: string
  private: boolean
  htmlUrl: string | null
  defaultBranch: string | null
  ownerLogin: string | null
  updatedAt: string | null
  description?: string | null
  language?: string | null
  stars?: number
  forks?: number
}

interface GithubOrgInfo {
  name: string | null
  login: string | null
  description: string | null
  avatarUrl: string | null
  htmlUrl: string | null
  publicRepos: number | null
  members: GithubMember[]
}

interface GithubMember {
  login: string
  avatarUrl: string | null
  htmlUrl: string | null
  role?: string
}

interface ProjectDetails extends Project {
  githubRepos: GithubRepo[]
  githubOrgInfo: GithubOrgInfo | null
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.repoId as string

  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([])
  const [githubOrgInfo, setGithubOrgInfo] = useState<GithubOrgInfo | null>(null)
  const [loadingGithub, setLoadingGithub] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to fetch from API
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
        const response = await fetch(`${backendUrl}/api/v1/projects/${encodeURIComponent(projectId)}/details`, {
          cache: 'no-store'
        })

        if (response.ok) {
          const data = await response.json()
          setProject(data)
        } else {
          setError(`Failed to load project: ${response.status}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    const fetchGithubInfo = async () => {
      if (!projectId) return

      try {
        setLoadingGithub(true)

        // Fetch GitHub repos for this project/organization
        const reposResponse = await fetch(`/api/dashboard/github/repos?account=${encodeURIComponent(projectId)}&type=user`, {
          cache: 'no-store'
        })

        if (reposResponse.ok) {
          const reposData = await reposResponse.json()
          if (reposData.items) {
            setGithubRepos(reposData.items)
          }
        }

        // Try to fetch organization info if this looks like an org
        if (projectId.includes('/')) {
          const orgName = projectId.split('/')[0]
          try {
            const orgResponse = await fetch(`/api/dashboard/github/org/${encodeURIComponent(orgName)}`)
            if (orgResponse.ok) {
              const orgData = await orgResponse.json()
              setGithubOrgInfo(orgData)
            }
          } catch (orgErr) {
            // Organization fetch failed, continue without org info
            console.log('Could not fetch organization info:', orgErr)
          }
        }

      } catch (err) {
        console.log('Could not fetch GitHub information:', err)
      } finally {
        setLoadingGithub(false)
      }
    }

    if (projectId) {
      fetchProject()
      fetchGithubInfo()
    }
  }, [projectId])

  const handleBack = () => {
    router.push('/dashboard/projects')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Loading project...</span>
        </div>
      </div>
    )
  }

  if (loadingGithub && project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Folder className="h-8 w-8 text-blue-500" />
              {project.name}
            </h1>
            <p className="text-muted-foreground mt-1">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Loading GitHub information...</span>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                Project not found
              </h3>
              <p className="text-red-600 dark:text-red-300 mb-4">
                {error || "The requested project could not be found."}
              </p>
              <Button onClick={handleBack} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusConfig = {
    active: { label: "Actif", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    maintenance: { label: "Maintenance", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    archived: { label: "Archive", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  }

  const status = statusConfig[project.status as keyof typeof statusConfig]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={handleBack} variant="outline" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Folder className="h-8 w-8 text-blue-500" />
            {project.name}
          </h1>
          <p className="text-muted-foreground mt-1">{project.description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Project Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="secondary" className={statusConfig[project.status].className}>
                {statusConfig[project.status].label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Language</span>
              <Badge variant="outline">{project.language || "N/A"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Team</span>
              <span className="text-sm font-medium">{project.team || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">GitHub Repos</span>
              <span className="text-sm font-medium">{githubRepos.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Health Score */}
        <Card>
          <CardHeader>
            <CardTitle>Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-4xl font-bold ${
                project.healthScore >= 90 ? "text-green-600" :
                project.healthScore >= 70 ? "text-yellow-600" : "text-red-600"
              }`}>
                {project.healthScore}%
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      project.healthScore >= 90 ? "bg-green-500" :
                      project.healthScore >= 70 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${project.healthScore}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GitHub Organization */}
        {githubOrgInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                GitHub Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {githubOrgInfo.avatarUrl && (
                  <img
                    src={githubOrgInfo.avatarUrl}
                    alt={githubOrgInfo.name || githubOrgInfo.login || "Organization"}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{githubOrgInfo.name || githubOrgInfo.login}</h3>
                  <p className="text-sm text-muted-foreground">{githubOrgInfo.description}</p>
                </div>
                {githubOrgInfo.htmlUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={githubOrgInfo.htmlUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Public Repos</span>
                <span className="font-medium">{githubOrgInfo.publicRepos || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Members</span>
                <span className="font-medium">{githubOrgInfo.members.length}</span>
              </div>
              {githubOrgInfo.members.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Team Members:</span>
                  <div className="flex flex-wrap gap-2">
                    {githubOrgInfo.members.slice(0, 6).map((member) => (
                      <div key={member.login} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full px-3 py-1">
                        {member.avatarUrl && (
                          <img
                            src={member.avatarUrl}
                            alt={member.login}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className="text-sm">{member.login}</span>
                        {member.role && member.role !== 'member' && (
                          <Badge variant="secondary" className="text-xs">
                            {member.role}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {githubOrgInfo.members.length > 6 && (
                      <span className="text-sm text-muted-foreground px-3 py-1">
                        +{githubOrgInfo.members.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <GitBranch className="h-4 w-4" />
                Branches
              </span>
              <span className="font-medium">{project.branches}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Open Issues
              </span>
              <span className="font-medium">{project.openIssues}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Commits</span>
              <span className="font-medium">{project.commits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contributors</span>
              <span className="font-medium">{project.contributors}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GitHub Repositories */}
      {githubRepos.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Repositories ({githubRepos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {githubRepos.map((repo) => (
                <Card key={repo.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm truncate">{repo.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {repo.ownerLogin && `${repo.ownerLogin}/`}{repo.name}
                        </p>
                      </div>
                      {repo.htmlUrl && (
                        <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                          <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {repo.language && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          {repo.language}
                        </div>
                      )}
                      {repo.private !== undefined && (
                        <Badge variant={repo.private ? "secondary" : "outline"} className="text-xs">
                          {repo.private ? "Private" : "Public"}
                        </Badge>
                      )}
                    </div>
                    {repo.updatedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Updated {new Date(repo.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Knowledge Base Section */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <p className="text-sm text-muted-foreground">
            Index and manage knowledge sources for this project
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Knowledge Base Management</h3>
            <p className="text-muted-foreground mb-4">
              Index repositories, documents, and other sources to build the knowledge base for AI-powered code reviews.
            </p>
            <Button variant="outline">
              Manage Knowledge Base
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}