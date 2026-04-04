"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  ArrowLeft,
  FolderGit,
  GitBranch,
  Users,
  Settings,
  Shield,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Types
interface Team {
  id: string
  name: string
  slug: string | null
  members: TeamMember[]
}

interface TeamMember {
  user_id: string
  email: string
  display_name: string | null
  role: string
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

interface BranchConfig {
  name: string
  isDefault: boolean
  isProtected: boolean
  requireReviews: number
}

interface ProjectMember {
  userId: string
  email: string
  displayName: string | null
  role: string
}

export default function NewProjectPage() {
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
  
  // Branches
  const [branches, setBranches] = useState<BranchConfig[]>([
    { name: "main", isDefault: true, isProtected: true, requireReviews: 1 },
  ])
  const [newBranchName, setNewBranchName] = useState("")
  
  // Members
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState("developer")
  
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
  const [success, setSuccess] = useState(false)

  // Load data on mount
  useEffect(() => {
    loadGithubRepos()
    loadTeams()
  }, [])

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
        // Update default branch in branches
        setBranches((prev) => {
          const newBranches = prev.filter((b) => !b.isDefault)
          return [
            { name: repo.defaultBranch, isDefault: true, isProtected: true, requireReviews: 1 },
            ...newBranches,
          ]
        })
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
      const response = await fetch("/api/dashboard/teams", {
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

  const addBranch = () => {
    if (!newBranchName.trim()) return
    if (branches.some((b) => b.name === newBranchName.trim())) return
    
    setBranches([
      ...branches,
      { name: newBranchName.trim(), isDefault: false, isProtected: false, requireReviews: 0 },
    ])
    setNewBranchName("")
  }

  const removeBranch = (branchName: string) => {
    setBranches(branches.filter((b) => b.name !== branchName || b.isDefault))
  }

  const toggleBranchProtection = (branchName: string) => {
    setBranches(
      branches.map((b) =>
        b.name === branchName ? { ...b, isProtected: !b.isProtected } : b
      )
    )
  }

  const updateBranchReviews = (branchName: string, reviews: number) => {
    setBranches(
      branches.map((b) =>
        b.name === branchName ? { ...b, requireReviews: reviews } : b
      )
    )
  }

  const addMember = () => {
    if (!newMemberEmail.trim()) return
    if (members.some((m) => m.email === newMemberEmail.trim())) return
    
    setMembers([
      ...members,
      {
        userId: `temp_${Date.now()}`,
        email: newMemberEmail.trim(),
        displayName: null,
        role: newMemberRole,
      },
    ])
    setNewMemberEmail("")
    setNewMemberRole("developer")
  }

  const removeMember = (email: string) => {
    setMembers(members.filter((m) => m.email !== email))
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
          branches: branches.map((b) => ({
            name: b.name,
            is_default: b.isDefault,
            is_protected: b.isProtected,
            require_reviews: b.requireReviews,
          })),
          members: members.map((m) => ({
            user_id: m.userId,
            email: m.email,
            role: m.role,
          })),
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
      setSuccess(true)
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/dashboard/projects/${encodeURIComponent(project.id)}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Projet cree avec succes !</h2>
          <p className="text-muted-foreground">Redirection vers le projet...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nouveau Projet</h1>
          <p className="text-muted-foreground">
            Configurez votre projet avec toutes les options avancees
          </p>
        </div>
      </div>

      {/* GitHub Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderGit className="h-5 w-5 text-blue-500" />
            Importer depuis GitHub
          </CardTitle>
          <CardDescription>
            Selectionnez un repository existant ou saisissez les informations manuellement
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mon-projet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet (owner/repo) *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="organisation/mon-projet"
              />
            </div>
          </div>

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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Langage principal</Label>
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibilite</Label>
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
            <div className="space-y-2">
              <Label>Branche par defaut</Label>
              <Input
                value={defaultBranch}
                onChange={(e) => {
                  setDefaultBranch(e.target.value)
                  setBranches((prev) =>
                    prev.map((b) =>
                      b.isDefault ? { ...b, name: e.target.value } : b
                    )
                  )
                }}
                placeholder="main"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Equipe
          </CardTitle>
          <CardDescription>
            Assignez ce projet a une equipe et ajoutez des membres
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Equipe</Label>
            <Select value={teamId} onValueChange={(value) => setTeamId(value === "none" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionnez une equipe..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune equipe</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Membres du projet</Label>
            <div className="flex gap-2">
              <Input
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="flex-1"
              />
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addMember} disabled={!newMemberEmail.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {members.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.email}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{member.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember(member.email)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Branches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-green-500" />
            Branches
          </CardTitle>
          <CardDescription>
            Configurez les branches et leurs regles de protection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Nom de la branche (ex: develop)"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addBranch()}
            />
            <Button onClick={addBranch} disabled={!newBranchName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branche</TableHead>
                <TableHead>Protection</TableHead>
                <TableHead>Reviews requises</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.name}>
                  <TableCell className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    {branch.name}
                    {branch.isDefault && (
                      <Badge variant="secondary">Par defaut</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={branch.isProtected}
                        onCheckedChange={() => toggleBranchProtection(branch.name)}
                      />
                      {branch.isProtected && (
                        <Shield className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(branch.requireReviews)}
                      onValueChange={(v) => updateBranchReviews(branch.name, parseInt(v))}
                      disabled={!branch.isProtected}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {!branch.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBranch(branch.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            Parametres d'analyse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Analyse automatique</Label>
              <p className="text-sm text-muted-foreground">
                Lancer automatiquement une analyse a chaque push ou PR
              </p>
            </div>
            <Switch
              checked={autoAnalysis}
              onCheckedChange={setAutoAnalysis}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creation en cours...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Creer le projet
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
