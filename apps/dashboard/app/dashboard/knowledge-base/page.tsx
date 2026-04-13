"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Database,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  BookOpen,
  Shield,
  Code2,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

type DocType = "markdown" | "policy" | "documentation" | "code"

interface DocTypeOption {
  id: DocType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  tags: string[]
}

const DOC_TYPES: DocTypeOption[] = [
  {
    id: "policy",
    label: "Bonnes pratiques / Politique",
    description: "Règles de code, conventions d'équipe, checklist sécurité",
    icon: Shield,
    tags: ["policy", "security"],
  },
  {
    id: "documentation",
    label: "Documentation technique",
    description: "Architecture, guides d'intégration, ADR (Architecture Decision Records)",
    icon: BookOpen,
    tags: ["documentation"],
  },
  {
    id: "markdown",
    label: "Fichier Markdown",
    description: "README, notes de release, wiki interne",
    icon: FileText,
    tags: ["markdown"],
  },
  {
    id: "code",
    label: "Extrait de code",
    description: "Exemples de code de référence, patterns approuvés",
    icon: Code2,
    tags: ["code"],
  },
]

interface KbRepo {
  repo_id: string
  chunks_count?: number
  files_indexed?: number
  last_indexed?: string
}

type WizardStep = 1 | 2 | 3

export default function KnowledgeBasePage() {
  const [step, setStep] = useState<WizardStep>(1)
  const [repos, setRepos] = useState<KbRepo[]>([])
  const [reposLoading, setReposLoading] = useState(true)

  // Step 1 state
  const [selectedDocType, setSelectedDocType] = useState<DocType | null>(null)

  // Step 2 state
  const [repoId, setRepoId] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  // Step 3 state
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestResult, setIngestResult] = useState<{ success: boolean; message: string; chunksCount?: number } | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ title: string; score: number; content: string; chunk_type: string | null }>>([])
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    fetchRepos()
  }, [])

  async function fetchRepos() {
    setReposLoading(true)
    try {
      const res = await fetch("/api/dashboard/admin/knowledge-base/repos?limit=50", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json() as { repos?: KbRepo[] }
        setRepos(Array.isArray(data.repos) ? data.repos : [])
      }
    } catch {
      // ignore — repos panel degrades gracefully
    } finally {
      setReposLoading(false)
    }
  }

  async function handleIngest() {
    if (!repoId.trim() || !title.trim() || !content.trim() || !selectedDocType) return
    setIngestLoading(true)
    setIngestResult(null)
    const docTypeOption = DOC_TYPES.find((d) => d.id === selectedDocType)
    try {
      const res = await fetch("/api/dashboard/admin/knowledge-base/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_id: repoId.trim(),
          title: title.trim(),
          source_type: selectedDocType,
          content: content.trim(),
          tags: docTypeOption?.tags ?? [],
        }),
      })
      const data = await res.json() as { chunks_count?: number; error?: string }
      if (res.ok) {
        setIngestResult({
          success: true,
          message: "Document indexé avec succès dans la Knowledge Base.",
          chunksCount: data.chunks_count,
        })
        fetchRepos()
      } else {
        setIngestResult({ success: false, message: data.error ?? "Erreur lors de l'indexation." })
      }
    } catch {
      setIngestResult({ success: false, message: "Impossible de contacter le backend." })
    } finally {
      setIngestLoading(false)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !repoId.trim()) return
    setSearchLoading(true)
    setSearchResults([])
    try {
      const res = await fetch("/api/dashboard/admin/knowledge-base/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId.trim(), query: searchQuery.trim(), limit: 5 }),
      })
      const data = await res.json() as { results?: Array<{ title: string; score: number; content: string; chunk_type: string | null }> }
      setSearchResults(Array.isArray(data.results) ? data.results : [])
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const canProceedStep2 = selectedDocType !== null
  const canIngest = repoId.trim().length > 0 && title.trim().length > 0 && content.trim().length > 10

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground mb-1">
          Knowledge Base
        </h1>
        <p className="text-muted-foreground">
          Alimentez la base documentaire utilisée par le système RAG pour contextualiser les reviews de code.
        </p>
      </motion.div>

      {/* KB Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-orange" />
              Repos indexés
              {reposLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repos.length === 0 && !reposLoading ? (
              <p className="text-sm text-muted-foreground">Aucun repo indexé pour l&apos;instant.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {repos.slice(0, 6).map((repo) => (
                  <div
                    key={repo.repo_id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background/60 p-2.5 transition-colors hover:border-orange-accent"
                    onClick={() => setRepoId(repo.repo_id)}
                  >
                    <span className="truncate font-mono text-sm text-foreground">{repo.repo_id}</span>
                    {typeof repo.chunks_count === "number" && (
                      <Badge variant="outline" className="text-xs ml-2 shrink-0">
                        {repo.chunks_count} chunks
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Wizard */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-4">
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    step === s
                    ? "bg-orange text-white"
                    : step > s
                    ? "bg-green-status text-white"
                    : "bg-background text-muted-foreground"
                  }`}
                >
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
              <span className={`text-sm ${step === s ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? "Type de doc" : s === 2 ? "Contenu" : "Indexation"}
              </span>
              {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Choose doc type */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="border-border bg-card/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base">Étape 1 — Choisissez le type de document</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DOC_TYPES.map((docType) => (
                      <motion.div
                        key={docType.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                          selectedDocType === docType.id
                            ? "border-orange-accent bg-orange/10"
                            : "border-border hover:border-orange-accent/70"
                        }`}
                        onClick={() => setSelectedDocType(docType.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-2 ${selectedDocType === docType.id ? "bg-orange text-white" : "bg-background text-muted-foreground"}`}>
                            <docType.icon className={`h-4 w-4 ${selectedDocType === docType.id ? "text-white" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{docType.label}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{docType.description}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={() => setStep(2)} disabled={!canProceedStep2} className="gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Enter content */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="border-border bg-card/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base">Étape 2 — Renseignez le document</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Repo ID <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="ex: myorg/myrepo"
                      value={repoId}
                      onChange={(e) => setRepoId(e.target.value)}
                      className="font-mono"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Identifiant du repository concerné par ce document.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Titre du document <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="ex: Guide de sécurité API, Convention de nommage..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Contenu <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      placeholder="Collez ici le contenu du document (Markdown, texte, code...)..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {content.length} caractères — Le document sera découpé en chunks et vectorisé.
                    </p>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Retour
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!canIngest} className="gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Confirm and ingest */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="border-border bg-card/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base">Étape 3 — Indexation dans la Knowledge Base</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="space-y-2 rounded-xl border border-border bg-background/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Repo</span>
                      <span className="font-mono text-sm text-foreground">{repoId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Titre</span>
                      <span className="text-sm text-foreground">{title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="outline" className="text-xs">{selectedDocType}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Taille</span>
                      <span className="text-sm text-foreground">{content.length} caractères</span>
                    </div>
                  </div>

                  {ingestLoading && (
                    <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-teal">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Découpage en chunks et vectorisation en cours...
                    </div>
                      <Progress value={undefined} className="h-1.5 animate-pulse" />
                    </div>
                  )}

                  {ingestResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-start gap-3 rounded-xl border p-4 ${
                        ingestResult.success
                          ? "border-green-status/20 bg-green-status/10"
                          : "border-red-500/20 bg-red-500/10"
                      }`}
                    >
                      {ingestResult.success ? (
                        <CheckCircle2 className="flex-shrink-0 mt-0.5 h-5 w-5 text-green-status" />
                      ) : (
                        <AlertCircle className="flex-shrink-0 mt-0.5 h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${ingestResult.success ? "text-green-status" : "text-destructive"}`}>
                          {ingestResult.message}
                        </p>
                        {ingestResult.chunksCount !== undefined && (
                          <p className="mt-0.5 text-xs text-green-status">
                            {ingestResult.chunksCount} chunk(s) indexé(s) dans Qdrant.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(2)} disabled={ingestLoading}>
                      Retour
                    </Button>
                    <div className="flex gap-2">
                      {ingestResult?.success && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStep(1)
                            setSelectedDocType(null)
                            setTitle("")
                            setContent("")
                            setIngestResult(null)
                          }}
                        >
                          Indexer un autre doc
                        </Button>
                      )}
                      {!ingestResult?.success && (
                <Button onClick={handleIngest} disabled={ingestLoading} className="gap-2">
                  {ingestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Indexer dans la KB
                </Button>
              )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search KB */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-border bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-teal" />
                  Recherche dans la Knowledge Base
                </CardTitle>
              </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Requête (ex: comment gérer les secrets, validation des entrées...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || !repoId.trim() || searchLoading}
                className="gap-2 shrink-0"
              >
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Chercher
              </Button>
            </div>
            {!repoId.trim() && (
              <p className="text-xs text-[color:var(--orange)] dark:text-amber-400">Saisissez un Repo ID ci-dessus pour activer la recherche.</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 mt-2">
                {searchResults.map((result, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-lg border border-border bg-background/60 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{result.title ?? "Sans titre"}</span>
                      <span className="rounded px-1.5 py-0.5 font-mono text-xs bg-orange/10 text-orange">
                        {Math.round((result.score ?? 0) * 100)}%
                      </span>
                      {result.chunk_type && (
                        <Badge variant="outline" className="text-xs">{result.chunk_type}</Badge>
                      )}
                    </div>
                    <p className="line-clamp-3 font-mono text-xs text-muted-foreground">
                      {result.content?.slice(0, 200) ?? ""}...
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searchLoading && (
              <p className="py-2 text-center text-sm text-muted-foreground">Aucun résultat trouvé.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
