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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-1">
          Knowledge Base
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Alimentez la base documentaire utilisée par le système RAG pour contextualiser les reviews de code.
        </p>
      </motion.div>

      {/* KB Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-blue-500" />
              Repos indexés
              {reposLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repos.length === 0 && !reposLoading ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Aucun repo indexé pour l&apos;instant.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {repos.slice(0, 6).map((repo) => (
                  <div
                    key={repo.repo_id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:border-blue-200 dark:hover:border-blue-700 transition-colors"
                    onClick={() => setRepoId(repo.repo_id)}
                  >
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{repo.repo_id}</span>
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
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : step > s
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm ${step === s ? "font-semibold text-gray-900 dark:text-white" : "text-gray-400"}`}>
                {s === 1 ? "Type de doc" : s === 2 ? "Contenu" : "Indexation"}
              </span>
              {s < 3 && <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />}
            </div>
          ))}
        </div>

        {/* Step 1: Choose doc type */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
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
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                        }`}
                        onClick={() => setSelectedDocType(docType.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${selectedDocType === docType.id ? "bg-blue-500" : "bg-gray-100 dark:bg-gray-800"}`}>
                            <docType.icon className={`h-4 w-4 ${selectedDocType === docType.id ? "text-white" : "text-gray-500"}`} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-900 dark:text-white">{docType.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{docType.description}</div>
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
              <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-base">Étape 2 — Renseignez le document</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Repo ID <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="ex: myorg/myrepo"
                      value={repoId}
                      onChange={(e) => setRepoId(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">Identifiant du repository concerné par ce document.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Titre du document <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="ex: Guide de sécurité API, Convention de nommage..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Contenu <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      placeholder="Collez ici le contenu du document (Markdown, texte, code...)..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">
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
              <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-base">Étape 3 — Indexation dans la Knowledge Base</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Repo</span>
                      <span className="font-mono text-sm text-gray-900 dark:text-white">{repoId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Titre</span>
                      <span className="text-sm text-gray-900 dark:text-white">{title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Type</span>
                      <Badge variant="outline" className="text-xs">{selectedDocType}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Taille</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{content.length} caractères</span>
                    </div>
                  </div>

                  {ingestLoading && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
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
                      className={`flex items-start gap-3 p-4 rounded-xl border ${
                        ingestResult.success
                          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                      }`}
                    >
                      {ingestResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${ingestResult.success ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}>
                          {ingestResult.message}
                        </p>
                        {ingestResult.chunksCount !== undefined && (
                          <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
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
                        <Button onClick={handleIngest} disabled={ingestLoading} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
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
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-purple-500" />
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
              <p className="text-xs text-amber-600 dark:text-amber-400">Saisissez un Repo ID ci-dessus pour activer la recherche.</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 mt-2">
                {searchResults.map((result, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{result.title ?? "Sans titre"}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {Math.round((result.score ?? 0) * 100)}%
                      </span>
                      {result.chunk_type && (
                        <Badge variant="outline" className="text-xs">{result.chunk_type}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 font-mono">
                      {result.content?.slice(0, 200) ?? ""}...
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searchLoading && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">Aucun résultat trouvé.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
