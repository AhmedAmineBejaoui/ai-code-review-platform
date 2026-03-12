"use client"
/* eslint-disable react/no-unescaped-entities */

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Database, FileText, Globe, RefreshCw, Trash2, Edit, Search, Upload, Plus, Sparkles, Code2, FileCode2, Link2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { emptyDashboardInsights, fetchDashboardInsights } from "@/lib/dashboard-insights"

type RepoProfileItem = {
  repo_id: string
  repo_path?: string | null
  indexed_commit?: string | null
  default_branch?: string | null
  profile?: Record<string, unknown>
  updated_at?: string | null
}

type RepoProfilesPayload = {
  items?: RepoProfileItem[]
}

type QueryChunk = {
  path?: string
  score?: number
  chunk_index?: number
  start_line?: number | null
  end_line?: number | null
  content?: string
}

type QueryResponse = {
  chunks?: QueryChunk[]
}

type SourceType = "pdf" | "web" | "markdown" | "code" | "sql"

const SOURCE_TYPES: Array<{
  value: SourceType
  label: string
  hint: string
}> = [
  { value: "pdf", label: "PDF", hint: "Importer un ou plusieurs fichiers PDF" },
  { value: "web", label: "Pages web", hint: "Indexer une URL publique" },
  { value: "markdown", label: "Documentation markdown", hint: "Fichiers .md/.mdx" },
  { value: "code", label: "Code source", hint: "Repository local ou distant" },
  { value: "sql", label: "Base SQL", hint: "Dump SQL ou description de schema" },
]

function filesIndexed(item: RepoProfileItem): number {
  const profile = item.profile ?? {}
  const raw = profile.files_indexed
  if (typeof raw === "number") {
    return raw
  }
  if (typeof raw === "string") {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

function repoStatus(item: RepoProfileItem): "indexed" | "outdated" {
  if (!item.updated_at) {
    return "outdated"
  }
  const updatedAt = new Date(item.updated_at)
  if (Number.isNaN(updatedAt.getTime())) {
    return "outdated"
  }
  const ageMs = Date.now() - updatedAt.getTime()
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
  return ageMs <= fourteenDaysMs ? "indexed" : "outdated"
}

function displaySource(item: RepoProfileItem): string {
  if (item.repo_path && item.repo_path.trim().length > 0) {
    return item.repo_path
  }
  if (item.default_branch && item.default_branch.trim().length > 0) {
    return `branch:${item.default_branch}`
  }
  return "unknown"
}

export function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("")
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [repoOverviews, setRepoOverviews] = useState(() => emptyDashboardInsights("admin").repoOverviews)

  const [repos, setRepos] = useState<RepoProfileItem[]>([])
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [selectedRepoId, setSelectedRepoId] = useState<string>("")
  const [retrievalQuery, setRetrievalQuery] = useState("")
  const [queryResults, setQueryResults] = useState<QueryChunk[]>([])
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [showSourceForm, setShowSourceForm] = useState(false)
  const [sourceType, setSourceType] = useState<SourceType>("code")
  const [sourceName, setSourceName] = useState("")
  const [sourceLocation, setSourceLocation] = useState("")
  const [sourceNotes, setSourceNotes] = useState("")
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true)
    setActionMessage(null)
    try {
      const response = await fetch("/api/dashboard/admin/knowledge-base/repos?limit=200", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      const payload = (await response.json().catch(() => ({}))) as RepoProfilesPayload & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de charger les sources KB.")
      }
      const items = Array.isArray(payload.items) ? payload.items : []
      setRepos(items)
      setSelectedRepoId((previous) => previous || items[0]?.repo_id || "")
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Impossible de charger les sources KB.")
    } finally {
      setLoadingRepos(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setInsightsLoading(true)
    fetchDashboardInsights()
      .then((payload) => {
        if (cancelled) {
          return
        }
        setRepoOverviews(payload.repoOverviews)
      })
      .finally(() => {
        if (!cancelled) {
          setInsightsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void loadRepos()
  }, [loadRepos])

  const filteredRepos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return repos
    }
    return repos.filter((item) => {
      const source = displaySource(item).toLowerCase()
      return item.repo_id.toLowerCase().includes(query) || source.includes(query)
    })
  }, [repos, searchQuery])

  const stats = useMemo(() => {
    const total = repos.length
    const totalFiles = repos.reduce((accumulator, item) => accumulator + filesIndexed(item), 0)
    const indexedCount = repos.filter((item) => repoStatus(item) === "indexed").length
    const outdatedCount = repos.filter((item) => repoStatus(item) === "outdated").length
    return [
      { label: "Sources", value: total, icon: Database, gradient: "from-blue-500 to-cyan-500" },
      { label: "Fichiers indexes", value: totalFiles, icon: Database, gradient: "from-green-500 to-emerald-500" },
      { label: "A jour", value: indexedCount, icon: Database, gradient: "from-purple-500 to-pink-500" },
      { label: "A reindexer", value: outdatedCount, icon: Database, gradient: "from-orange-500 to-red-500" },
    ]
  }, [repos])

  const queueReindex = async (repoId: string, repoPath?: string | null) => {
    setBusyAction(`reindex:${repoId}`)
    setActionMessage(null)
    try {
      const response = await fetch("/api/dashboard/admin/knowledge-base/reindex", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          repoId,
          repoPath: repoPath ?? undefined,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { taskId?: string; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Reindexation impossible.")
      }
      setActionMessage(`Reindexation en file pour ${repoId} (task: ${payload.taskId ?? "n/a"}).`)
      await loadRepos()
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Reindexation impossible.")
    } finally {
      setBusyAction(null)
    }
  }

  const deleteRepo = async (repoId: string) => {
    setBusyAction(`delete:${repoId}`)
    setActionMessage(null)
    try {
      const response = await fetch(`/api/dashboard/admin/knowledge-base/repos/${encodeURIComponent(repoId)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Suppression source impossible.")
      }
      setActionMessage(`Source ${repoId} supprimee.`)
      setQueryResults([])
      if (selectedRepoId === repoId) {
        setSelectedRepoId("")
      }
      await loadRepos()
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Suppression source impossible.")
    } finally {
      setBusyAction(null)
    }
  }

  const resetSourceForm = () => {
    setSourceName("")
    setSourceLocation("")
    setSourceNotes("")
    setDroppedFiles([])
  }

  const openSourceForm = (kind: SourceType = "code") => {
    setSourceType(kind)
    setShowSourceForm(true)
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) {
      return
    }
    const accepted = Array.from(files)
    setDroppedFiles((previous) => [...previous, ...accepted].slice(0, 10))
  }

  const createSource = async () => {
    const normalizedName = sourceName.trim()
    const normalizedLocation = sourceLocation.trim()

    if (!normalizedName) {
      setActionMessage("Donnez un identifiant de source.")
      return
    }

    if (sourceType === "code") {
      await queueReindex(normalizedName, normalizedLocation || undefined)
      setShowSourceForm(false)
      resetSourceForm()
      return
    }

    const fileNames = droppedFiles.map((file) => file.name)
    const details = [
      `type=${sourceType}`,
      normalizedLocation ? `location=${normalizedLocation}` : null,
      fileNames.length > 0 ? `fichiers=${fileNames.join(",")}` : null,
      sourceNotes.trim() ? `notes=${sourceNotes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" | ")

    setActionMessage(`Source ${normalizedName} enregistree (${details || "sans details"}). Ajoutez un worker d'ingestion dedie pour indexation automatique de ce type.`)
    setShowSourceForm(false)
    resetSourceForm()
  }

  const editSource = async (item: RepoProfileItem) => {
    const repoPath = window.prompt("Nouveau chemin local du repo:", item.repo_path ?? "")
    if (repoPath === null) {
      return
    }
    await queueReindex(item.repo_id, repoPath.trim())
  }

  const runRetrievalTest = async () => {
    if (!selectedRepoId) {
      setActionMessage("Selectionnez une source avant le test retrieval.")
      return
    }
    if (!retrievalQuery.trim()) {
      setActionMessage("Entrez une requete de retrieval.")
      return
    }
    setBusyAction("retrieval")
    setActionMessage(null)
    try {
      const response = await fetch("/api/dashboard/admin/knowledge-base/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          repo_id: selectedRepoId,
          query: retrievalQuery.trim(),
          limit: 8,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as QueryResponse & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Test retrieval impossible.")
      }
      setQueryResults(Array.isArray(payload.chunks) ? payload.chunks : [])
      setActionMessage(`Retrieval termine sur ${selectedRepoId}.`)
    } catch (error) {
      setQueryResults([])
      setActionMessage(error instanceof Error ? error.message : "Test retrieval impossible.")
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <motion.div className="max-w-6xl mx-auto space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="flex justify-between items-start" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-emerald-900 to-teal-900 dark:from-white dark:via-emerald-100 dark:to-teal-100 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <Database className="h-10 w-10 text-emerald-500" />
            Base de Connaissance
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Gestion des sources indexees pour le RAG</p>
        </div>
        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl" onClick={() => openSourceForm("pdf")} disabled={busyAction !== null}>
              <Upload className="h-4 w-4" />
              Importer
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" onClick={() => openSourceForm("code")} disabled={busyAction !== null}>
              <Plus className="h-4 w-4" />
              Ajouter source
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {actionMessage && (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          {actionMessage}
        </div>
      )}

      {showSourceForm && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-white/60 dark:bg-gray-900/60 border-emerald-400/40">
            <CardHeader>
              <CardTitle>Zone d'insertion des sources KB</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Type de source</label>
                  <Select value={sourceType} onValueChange={(value: SourceType) => setSourceType(value)}>
                    <SelectTrigger className="bg-white dark:bg-gray-800">
                      <SelectValue placeholder="Selectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {SOURCE_TYPES.find((item) => item.value === sourceType)?.hint}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Identifiant source</label>
                  <Input
                    value={sourceName}
                    onChange={(event) => setSourceName(event.target.value)}
                    placeholder="ex: org/repo, docs-interne, sql-prod"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Chemin local backend ou URL</label>
                <Input
                  value={sourceLocation}
                  onChange={(event) => setSourceLocation(event.target.value)}
                  placeholder="ex: /srv/repos/mon-repo OU https://docs.exemple.com"
                  className="bg-white dark:bg-gray-800"
                />
              </div>

              <div
                className="rounded-xl border border-dashed border-emerald-400/40 bg-emerald-500/5 p-4"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  handleFiles(event.dataTransfer.files)
                }}
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <Upload className="h-4 w-4" />
                  Drag & drop des fichiers
                </div>
                <p className="text-xs text-gray-400">Sources possibles : PDF, pages web, documentation markdown, code source, base SQL.</p>
                <Input
                  className="mt-3 bg-white dark:bg-gray-800"
                  type="file"
                  multiple
                  onChange={(event) => handleFiles(event.target.files)}
                />
                {droppedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {droppedFiles.map((file) => (
                      <Badge key={`${file.name}-${file.lastModified}`} variant="secondary">
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Notes / contexte</label>
                <Textarea
                  value={sourceNotes}
                  onChange={(event) => setSourceNotes(event.target.value)}
                  placeholder="Décrivez le contenu à indexer..."
                  className="bg-white dark:bg-gray-800"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600" onClick={() => void createSource()} disabled={busyAction !== null}>
                  {sourceType === "code" ? <Code2 className="h-4 w-4" /> : sourceType === "pdf" ? <FileText className="h-4 w-4" /> : sourceType === "markdown" ? <FileCode2 className="h-4 w-4" /> : sourceType === "web" ? <Globe className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  Enregistrer la source
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSourceForm(false)
                    resetSourceForm()
                  }}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }} whileHover={{ y: -4, scale: 1.02 }}>
            <Card className="relative overflow-hidden bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-20 rounded-full blur-2xl`} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                  <motion.div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`} whileHover={{ scale: 1.1, rotate: 360 }} transition={{ duration: 0.5 }}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 backdrop-blur-xl border-emerald-200/50 dark:border-emerald-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Operations d'ingestion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" onClick={() => void (selectedRepoId ? queueReindex(selectedRepoId) : openSourceForm("code"))} disabled={busyAction !== null}>
                <RefreshCw className="h-4 w-4" />
                Lancer re-indexation
              </Button>
              <Button variant="outline" onClick={() => void loadRepos()} disabled={busyAction !== null || loadingRepos}>
                Actualiser liste
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Apercu initial des repos (Ollama)</CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Chargement des apercus...</p>
            ) : repoOverviews.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Aucun apercu de repo disponible.</p>
            ) : (
              <div className="space-y-3">
                {repoOverviews.slice(0, 8).map((overview) => (
                  <div key={overview.repoId} className="rounded-xl border border-gray-200/60 bg-white/70 p-4 dark:border-gray-700/60 dark:bg-gray-900/60">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{overview.repoId}</Badge>
                      <Badge variant={overview.fallbackUsed ? "secondary" : "default"}>{overview.source}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{overview.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <CardTitle className="flex-1">Sources indexees</CardTitle>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Rechercher une source..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10 bg-white dark:bg-gray-800" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <TableHead>Source</TableHead>
                    <TableHead>Chemin/branche</TableHead>
                    <TableHead>Derniere indexation</TableHead>
                    <TableHead>Fichiers</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRepos ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Chargement des sources...
                      </TableCell>
                    </TableRow>
                  ) : filteredRepos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Aucune source indexee.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRepos.map((item, index) => {
                      const status = repoStatus(item)
                      const rowBusy = busyAction === `reindex:${item.repo_id}` || busyAction === `delete:${item.repo_id}`
                      return (
                        <motion.tr key={item.repo_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + index * 0.03 }} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <TableCell className="font-medium text-gray-900 dark:text-white">{item.repo_id}</TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">{displaySource(item)}</TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400 text-sm">{item.updated_at ? new Date(item.updated_at).toLocaleDateString("fr-FR") : "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{filesIndexed(item)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status === "indexed" ? "default" : "secondary"}>{status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon" onClick={() => void editSource(item)} disabled={rowBusy}>
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.2, rotate: 180 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon" onClick={() => void queueReindex(item.repo_id, item.repo_path)} disabled={rowBusy}>
                                  <RefreshCw className="h-4 w-4 text-purple-600" />
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedRepoId(item.repo_id)} disabled={rowBusy}>
                                  <Search className="h-4 w-4 text-emerald-600" />
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon" onClick={() => void deleteRepo(item.repo_id)} disabled={rowBusy}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </motion.div>
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Tester le retrieval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Source</label>
                <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Selectionner un repo indexe" />
                  </SelectTrigger>
                  <SelectContent>
                    {repos.map((item) => (
                      <SelectItem key={item.repo_id} value={item.repo_id}>
                        {item.repo_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Requete</label>
                <Input placeholder="Ex: SQL injection prevention" value={retrievalQuery} onChange={(event) => setRetrievalQuery(event.target.value)} className="bg-white dark:bg-gray-800" />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={() => void runRetrievalTest()} disabled={busyAction === "retrieval"}>
                <Search className="h-4 w-4" />
                Tester
              </Button>
            </motion.div>
            {queryResults.length > 0 && (
              <div className="space-y-2 rounded-xl border border-gray-200/60 bg-white/70 p-4 dark:border-gray-700/60 dark:bg-gray-900/60">
                {queryResults.slice(0, 6).map((chunk, index) => (
                  <div key={`${chunk.path ?? "chunk"}-${index}`} className="rounded-lg border border-gray-200/50 p-3 dark:border-gray-700/50">
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <Badge variant="outline">{chunk.path ?? "unknown"}</Badge>
                      <Badge variant="secondary">score {(chunk.score ?? 0).toFixed(2)}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">{chunk.content ?? ""}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
