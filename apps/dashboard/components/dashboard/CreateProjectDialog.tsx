"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, GitBranch, Users, Settings, FolderGit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Types
interface Team {
  id: string
  name: string
  slug: string | null
}

interface GithubRepo {
  id: string
  fullName: string
  name: string
  description: string | null
  language: string | null
  defaultBranch: string
  isPrivate: boolean
}

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (projectId: string) => void
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const router = useRouter()
  
  // Form state
  const [name, setName] = useState("")
  const [fullName, setFullName] = useState("")
  const [description, setDescription] = useState("")
  const [language, setLanguage] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private" | "internal">("private")
  const [defaultBranch, setDefaultBranch] = useState("main")
  const [teamId, setTeamId] = useState<string>("")
  const [autoAnalysis, setAutoAnalysis] = useState(true)
  
  // GitHub repos
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([])
  const [selectedGithubRepo, setSelectedGithubRepo] = useState<string>("manual")
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false)
  
  // Teams
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  
  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Active tab
  const [activeTab, setActiveTab] = useState("basic")

  // Load GitHub repos when dialog opens
  useEffect(() => {
    if (open) {
      loadGithubRepos()
      loadTeams()
    }
  }, [open])

  // Update form when GitHub repo is selected
  useEffect(() => {
    if (selectedGithubRepo !== "manual") {
      const repo = githubRepos.find((r) => r.fullName === selectedGithubRepo)
      if (repo) {
        setName(repo.name)
        setFullName(repo.fullName)
        setDescription(repo.description || "")
        setLanguage(repo.language || "")
        setDefaultBranch(repo.defaultBranch)
        setVisibility(repo.isPrivate ? "private" : "public")
      }
    }
  }, [selectedGithubRepo, githubRepos])

  const loadGithubRepos = async () => {
    setLoadingGithubRepos(true)
    try {
      const response = await fetch("/api/dashboard/github/repos", {
        headers: { "Content-Type": "application/json" },
      })
      if (response.ok) {
        const data = await response.json()
        const items: GithubRepo[] = (data.items || []).map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ""),
          fullName: (r.fullName as string) ?? "",
          name: (r.name as string) ?? "",
          description: (r.description as string) ?? null,
          language: (r.language as string) ?? null,
          defaultBranch: (r.defaultBranch as string) ?? "main",
          isPrivate: r.private === true,
        }))
        setGithubRepos(items)
      } else {
        console.warn("Failed to load GitHub repos:", response.status, response.statusText)
        setGithubRepos([]) // Set empty array on error
      }
    } catch (err) {
      console.warn("Failed to load GitHub repos:", err)
      setGithubRepos([]) // Set empty array on error
    } finally {
      setLoadingGithubRepos(false)
    }
  }

  const loadTeams = async () => {
    setLoadingTeams(true)
    try {
      const response = await fetch("/api/v1/teams", {
        headers: { "Content-Type": "application/json" },
      })
      if (response.ok) {
        const data = await response.json()
        setTeams(data.items || [])
      } else {
        console.warn("Failed to load teams:", response.status, response.statusText)
        setTeams([]) // Set empty array on error
      }
    } catch (err) {
      console.warn("Failed to load teams:", err)
      setTeams([]) // Set empty array on error
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setError("Le nom du projet est requis")
      return
    }
    if (!fullName.trim()) {
      setError("Le nom complet (owner/repo) est requis")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          full_name: fullName.trim(),
          description: description.trim() || null,
          language: language.trim() || null,
          visibility,
          default_branch: defaultBranch,
          team_id: teamId || null,
          auto_analysis_enabled: autoAnalysis,
          branches: [
            { name: defaultBranch, is_default: true, is_protected: true, require_reviews: 1 },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        let errorMessage = "Erreur lors de la creation du projet"
        try {
          const parsed = JSON.parse(errorData)
          errorMessage = parsed.detail || errorMessage
        } catch {
          errorMessage = errorData || errorMessage
        }
        throw new Error(errorMessage)
      }

      const project = await response.json()
      
      // Reset form
      resetForm()
      onOpenChange(false)
      
      if (onSuccess) {
        onSuccess(project.id)
      } else {
        router.push(`/dashboard/projects/${encodeURIComponent(project.id)}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setName("")
    setFullName("")
    setDescription("")
    setLanguage("")
    setVisibility("private")
    setDefaultBranch("main")
    setTeamId("")
    setAutoAnalysis(true)
    setSelectedGithubRepo("manual")
    setError(null)
    setActiveTab("basic")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const goToAdvancedPage = () => {
    onOpenChange(false)
    router.push("/dashboard/projects/new")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderGit className="h-5 w-5 text-blue-500" />
            Nouveau Projet
          </DialogTitle>
          <DialogDescription>
            Creez un nouveau projet pour suivre et analyser votre code.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <FolderGit className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Parametres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* GitHub Repo Selection */}
            <div className="space-y-2">
              <Label>Importer depuis GitHub</Label>
              <Select value={selectedGithubRepo} onValueChange={setSelectedGithubRepo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un repository..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Saisie manuelle</SelectItem>
                  {loadingGithubRepos && (
                    <SelectItem value="loading" disabled>
                      <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                      Chargement...
                    </SelectItem>
                  )}
                  {githubRepos.map((repo) => (
                    <SelectItem key={repo.fullName} value={repo.fullName}>
                      <div className="flex items-center gap-2">
                        <span>{repo.fullName}</span>
                        {repo.language && (
                          <Badge variant="secondary" className="text-xs">
                            {repo.language}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mon-projet"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet (owner/repo) *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="organisation/mon-projet"
              />
              <p className="text-xs text-muted-foreground">
                Format: proprietaire/nom-du-repo
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du projet..."
                rows={3}
              />
            </div>

            {/* Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Langage principal</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TypeScript">TypeScript</SelectItem>
                    <SelectItem value="JavaScript">JavaScript</SelectItem>
                    <SelectItem value="Python">Python</SelectItem>
                    <SelectItem value="Go">Go</SelectItem>
                    <SelectItem value="Java">Java</SelectItem>
                    <SelectItem value="C#">C#</SelectItem>
                    <SelectItem value="PHP">PHP</SelectItem>
                    <SelectItem value="Ruby">Ruby</SelectItem>
                    <SelectItem value="Rust">Rust</SelectItem>
                    <SelectItem value="Other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibilite</Label>
                <Select value={visibility} onValueChange={(v: "public" | "private" | "internal") => setVisibility(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Prive</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Interne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4 mt-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select value={teamId} onValueChange={(value) => setTeamId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez une equipe..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune equipe</SelectItem>
                  {loadingTeams && (
                    <SelectItem value="loading" disabled>
                      <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                      Chargement...
                    </SelectItem>
                  )}
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                L'equipe aura acces a ce projet et recevra les notifications.
              </p>
            </div>

            <div className="rounded-lg border border-dashed p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Vous pourrez ajouter des membres supplementaires apres la creation du projet.
              </p>
              <Button variant="link" size="sm" onClick={goToAdvancedPage}>
                Configurer les membres maintenant
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* Default Branch */}
            <div className="space-y-2">
              <Label htmlFor="defaultBranch">Branche par defaut</Label>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="defaultBranch"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                La branche par defaut sera automatiquement protegee.
              </p>
            </div>

            {/* Auto Analysis */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Analyse automatique</Label>
                <p className="text-xs text-muted-foreground">
                  Lancer automatiquement une analyse a chaque push ou PR.
                </p>
              </div>
              <Switch
                checked={autoAnalysis}
                onCheckedChange={setAutoAnalysis}
              />
            </div>

            <div className="rounded-lg border border-dashed p-4 text-center">
              <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Plus d'options disponibles sur la page de creation avancee.
              </p>
              <Button variant="link" size="sm" onClick={goToAdvancedPage}>
                Configuration avancee
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creation...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Creer le projet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
