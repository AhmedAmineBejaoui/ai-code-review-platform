"use client"
/* eslint-disable react/no-unescaped-entities */

import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  Copy,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  BookOpen,
  ChevronRight,
  Loader2,
  Plus,
  MessageCircle,
  FileCode,
} from "lucide-react"
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider"
import {
  fetchDashboardAnalysisDetails,
  type DashboardAnalysisDetails,
  type DashboardAnalysisDiffFile,
} from "@/lib/dashboard-analysis-details"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InlineCommentForm } from "@/components/review/InlineCommentForm"
import { CommentThread } from "@/components/review/CommentThread"
import { PendingReviewBanner } from "@/components/review/PendingReviewBanner"
import { ReviewSubmissionDialog } from "@/components/review/ReviewSubmissionDialog"
import type { PendingComment, ReviewComment, CommentAuthor, ReviewVerdict } from "@/lib/review-types"

function severityIcon(severity: string) {
  if (severity === "BLOCKER") {
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }
  if (severity === "WARN") {
    return <AlertTriangle className="h-4 w-4 text-orange-500" />
  }
  return <Info className="h-4 w-4 text-blue-500" />
}

function severityBadge(severity: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    BLOCKER: "destructive",
    WARN: "secondary",
    INFO: "outline",
  }
  return <Badge variant={variants[severity] ?? "outline"}>{severity}</Badge>
}

function lineClass(lineType: "context" | "add" | "remove" | "header"): string {
  if (lineType === "add") {
    return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
  }
  if (lineType === "remove") {
    return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
  }
  if (lineType === "header") {
    return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 font-semibold"
  }
  return "text-gray-700 dark:text-gray-300"
}

function linePrefix(lineType: "context" | "add" | "remove" | "header"): string {
  if (lineType === "add") {
    return "+"
  }
  if (lineType === "remove") {
    return "-"
  }
  return " "
}

function normalizePathForComparison(value: string | null | undefined): string {
  return (value ?? "").trim().replaceAll("\\", "/").replace(/^\/+/, "")
}

function severityRank(severity: string): number {
  if (severity === "BLOCKER") {
    return 0
  }
  if (severity === "WARN") {
    return 1
  }
  return 2
}

function formatFindingSource(source: string): string {
  const labels: Record<string, string> = {
    SECURITY_SCAN: "Security scan",
    STATIC_RUFF: "Ruff",
    STATIC_SEMGREP: "Semgrep",
    STATIC_CLEAN_CODE: "Clean Code",
    LLM_GROUNDED: "AI grounded",
    MANUAL: "Manual",
  }
  return labels[source.toUpperCase()] ?? source.replaceAll("_", " ")
}

export function AnnotatedDiff() {
  const currentUser = useDashboardUser()
  const params = useParams<{ id: string | string[] }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [analysis, setAnalysis] = useState<DashboardAnalysisDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [resolvedFindings, setResolvedFindings] = useState<Set<string>>(new Set())
  const [copiedFindingId, setCopiedFindingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"files" | "conversation">("files")

  // Review state
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([])
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Comments from API
  const [existingComments, setExistingComments] = useState<ReviewComment[]>([])
  const [commentAuthors, setCommentAuthors] = useState<Map<string, CommentAuthor>>(new Map())

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setAnalysis(null)
      setLoading(false)
      return () => {
        cancelled = true
      }
    }
    setLoading(true)
    fetchDashboardAnalysisDetails(id)
      .then((payload) => {
        if (cancelled) {
          return
        }
        setAnalysis(payload)
        if (payload && payload.files.length > 0) {
          setSelectedFilePath(payload.files[0].pathNew)
        } else {
          setSelectedFilePath(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Fetch existing comments for the analysis
  useEffect(() => {
    if (!id) return

    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/reviews/comments?analysis_id=${id}`)
        if (response.ok) {
          const data = await response.json()
          setExistingComments(data.comments || [])
          // Extract authors
          const authors = new Map<string, CommentAuthor>()
          for (const comment of data.comments || []) {
            if (comment.author && !authors.has(comment.author.id)) {
              authors.set(comment.author.id, comment.author)
            }
          }
          setCommentAuthors(authors)
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error)
      }
    }

    fetchComments()
  }, [id])

  const selectedFile = useMemo<DashboardAnalysisDiffFile | null>(() => {
    if (!analysis || !selectedFilePath) {
      return null
    }
    return analysis.files.find((file) => file.pathNew === selectedFilePath) ?? null
  }, [analysis, selectedFilePath])

  const visibleFindings = useMemo(() => {
    if (!analysis) {
      return []
    }

    const selectedPaths = new Set(
      [selectedFile?.pathNew, selectedFile?.pathOld, selectedFilePath]
        .map((value) => normalizePathForComparison(value))
        .filter((value) => value.length > 0),
    )

    const matchingFindings =
      selectedPaths.size > 0
        ? analysis.findings.filter((finding) => selectedPaths.has(normalizePathForComparison(finding.filePath)))
        : []

    const candidates = matchingFindings.length > 0 ? matchingFindings : analysis.findings
    return [...candidates].sort((left, right) => {
      const severityDelta = severityRank(left.severity) - severityRank(right.severity)
      if (severityDelta !== 0) {
        return severityDelta
      }
      return (left.lineStart ?? Number.MAX_SAFE_INTEGER) - (right.lineStart ?? Number.MAX_SAFE_INTEGER)
    })
  }, [analysis, selectedFile, selectedFilePath])

  // Group comments by line for the selected file
  const commentsByLine = useMemo(() => {
    const map = new Map<number, ReviewComment[]>()
    const normalizedPath = normalizePathForComparison(selectedFilePath)

    for (const comment of existingComments) {
      if (normalizePathForComparison(comment.file_path) === normalizedPath && !comment.parent_id) {
        const line = comment.line_start
        if (!map.has(line)) {
          map.set(line, [])
        }
        map.get(line)!.push(comment)
      }
    }

    return map
  }, [existingComments, selectedFilePath])

  // Get replies for a comment
  const getReplies = useCallback((parentId: string) => {
    return existingComments.filter((c) => c.parent_id === parentId)
  }, [existingComments])

  const showingAllFindings = Boolean(
    analysis &&
      analysis.findings.length > 0 &&
      selectedFilePath &&
      visibleFindings.length === analysis.findings.length &&
      !analysis.findings.some((finding) => normalizePathForComparison(finding.filePath) === normalizePathForComparison(selectedFilePath)),
  )

  const ragReferenceCount = analysis?.reviewOutput?.contextReferences.length ?? 0

  const isReviewer = currentUser.role === "reviewer" || currentUser.role === "admin"

  const toggleResolved = (findingId: string) => {
    const next = new Set(resolvedFindings)
    if (next.has(findingId)) {
      next.delete(findingId)
    } else {
      next.add(findingId)
    }
    setResolvedFindings(next)
  }

  const copyFinding = async (finding: DashboardAnalysisDetails["findings"][number]) => {
    const location =
      typeof finding.lineStart === "number"
        ? `${finding.filePath}:${finding.lineStart}${typeof finding.lineEnd === "number" ? `-${finding.lineEnd}` : ""}`
        : finding.filePath
    const payload = [finding.message, location, finding.suggestion ? `Suggestion: ${finding.suggestion}` : null]
      .filter((item): item is string => Boolean(item))
      .join("\n")

    try {
      await navigator.clipboard.writeText(payload)
      setCopiedFindingId(finding.id)
      window.setTimeout(() => {
        setCopiedFindingId((current) => (current === finding.id ? null : current))
      }, 1500)
    } catch {
      setCopiedFindingId(null)
    }
  }

  // Handle adding a pending comment
  const handleAddPendingComment = (comment: PendingComment) => {
    setPendingComments((prev) => [...prev, comment])
    setActiveCommentLine(null)
  }

  // Handle removing a pending comment
  const handleRemovePendingComment = (commentId: string) => {
    setPendingComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  // Handle clearing all pending comments
  const handleClearAllPendingComments = () => {
    setPendingComments([])
  }

  // Handle submitting the review
  const handleSubmitReview = async (verdict: ReviewVerdict, summary: string) => {
    if (!id) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/reviews/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: id,
          verdict,
          summary,
          comments: pendingComments,
        }),
      })

      if (response.ok) {
        setPendingComments([])
        setShowSubmitDialog(false)
        // Refresh comments
        const commentsResponse = await fetch(`/api/reviews/comments?analysis_id=${id}`)
        if (commentsResponse.ok) {
          const data = await commentsResponse.json()
          setExistingComments(data.comments || [])
        }
      }
    } catch (error) {
      console.error("Failed to submit review:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle resolving/unresolving a comment
  const handleResolveComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/reviews/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      })

      if (response.ok) {
        setExistingComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, status: "resolved" } : c))
        )
      }
    } catch (error) {
      console.error("Failed to resolve comment:", error)
    }
  }

  const handleUnresolveComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/reviews/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      })

      if (response.ok) {
        setExistingComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, status: "open" } : c))
        )
      }
    } catch (error) {
      console.error("Failed to unresolve comment:", error)
    }
  }

  // Handle replying to a comment
  const handleReplyToComment = async (parentId: string, content: string) => {
    if (!id) return

    const parentComment = existingComments.find((c) => c.id === parentId)
    if (!parentComment) return

    try {
      const response = await fetch(`/api/reviews/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: id,
          parent_id: parentId,
          file_path: parentComment.file_path,
          line_start: parentComment.line_start,
          content,
          comment_type: "comment",
        }),
      })

      if (response.ok) {
        const newComment = await response.json()
        setExistingComments((prev) => [...prev, newComment])
      }
    } catch (error) {
      console.error("Failed to reply to comment:", error)
    }
  }

  // Get code snippet for a line
  const getCodeSnippet = (lineNumber: number): string | undefined => {
    if (!selectedFile) return undefined
    const line = selectedFile.lines.find((l) => (l.newLineNo ?? l.oldLineNo) === lineNumber)
    return line?.content
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500 dark:text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Chargement de l'analyse...
      </div>
    )
  }

  if (!analysis) {
    return <div>Analyse non trouvee</div>
  }

  return (
    <motion.div className="max-w-[1800px] mx-auto space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="flex justify-between items-start" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2">
            Diff annote
          </h1>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span className="font-medium">{analysis.repo}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-blue-600 dark:text-blue-400">{analysis.prLabel}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-mono text-sm">{analysis.commitSha ?? "-"}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/history/${id}`}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                Historique
              </Button>
            </motion.div>
          </Link>
          <Link href={`/dashboard/report/${id}`}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Rapport global
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Tabs for Conversation / Files Changed */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "files" | "conversation")} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Files changed
            <Badge variant="secondary" className="ml-1">
              {analysis.files.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="conversation" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Conversation
            <Badge variant="secondary" className="ml-1">
              {existingComments.filter((c) => !c.parent_id).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <div className="grid grid-cols-12 gap-6">
            <motion.div className="col-span-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Fichiers modifies</h3>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-1">
                      {analysis.files.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Aucun fichier detaille.</p>
                      ) : (
                        analysis.files.map((file, index) => (
                          <motion.button
                            key={file.id}
                            onClick={() => setSelectedFilePath(file.pathNew)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full text-left text-sm p-3 rounded-lg transition-all ${
                              selectedFilePath === file.pathNew
                                ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-700/50"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <div className="truncate font-medium">{file.pathNew.split("/").pop()}</div>
                            <div className="text-xs mt-1 flex gap-2">
                              <span className="text-green-600 dark:text-green-400">+{file.additionsCount}</span>
                              <span className="text-red-600 dark:text-red-400">-{file.deletionsCount}</span>
                            </div>
                          </motion.button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div className="col-span-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-800/50 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                  <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                    {selectedFile?.pathNew ?? "No file selected"}
                  </span>
                </div>
                <ScrollArea className="h-[600px]">
                  <pre className="p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900/50">
                    {!selectedFile || selectedFile.lines.length === 0 ? (
                      <div className="text-gray-500 dark:text-gray-400">Aucun diff detaille disponible pour ce fichier.</div>
                    ) : (
                      selectedFile.lines.map((line, idx) => {
                        const lineNumber = line.newLineNo ?? line.oldLineNo ?? idx + 1
                        const hasComments = commentsByLine.has(lineNumber)
                        const hasPendingComment = pendingComments.some(
                          (c) => c.file_path === selectedFilePath && c.line_start === lineNumber
                        )

                        return (
                          <div key={`${selectedFile.id}-${idx}`}>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.005 }}
                              className={`group relative flex ${lineClass(line.lineType)}`}
                              onMouseEnter={() => setHoveredLine(lineNumber)}
                              onMouseLeave={() => setHoveredLine(null)}
                            >
                              {/* Line number with add comment button */}
                              <span className="inline-flex items-center w-12 text-right pr-2 text-gray-400 dark:text-gray-600 select-none relative">
                                {isReviewer && hoveredLine === lineNumber && activeCommentLine !== lineNumber && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute -left-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                                    onClick={() => setActiveCommentLine(lineNumber)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                                <span className="ml-auto">{lineNumber}</span>
                                {(hasComments || hasPendingComment) && (
                                  <MessageSquare className="h-3 w-3 ml-1 text-blue-500" />
                                )}
                              </span>
                              <span className="pl-2">
                                {line.lineType !== "header" ? linePrefix(line.lineType) : ""}
                                {line.content}
                              </span>
                            </motion.div>

                            {/* Inline comment form */}
                            <AnimatePresence>
                              {activeCommentLine === lineNumber && (
                                <InlineCommentForm
                                  analysisId={id!}
                                  filePath={selectedFilePath!}
                                  lineStart={lineNumber}
                                  codeSnippet={getCodeSnippet(lineNumber)}
                                  onSubmit={handleAddPendingComment}
                                  onCancel={() => setActiveCommentLine(null)}
                                />
                              )}
                            </AnimatePresence>

                            {/* Existing comment threads for this line */}
                            {commentsByLine.get(lineNumber)?.map((comment) => (
                              <div key={comment.id} className="mx-4 my-2">
                                <CommentThread
                                  rootComment={comment}
                                  replies={getReplies(comment.id)}
                                  authors={commentAuthors}
                                  currentUserId={currentUser.id}
                                  onReply={handleReplyToComment}
                                  onResolve={handleResolveComment}
                                  onUnresolve={handleUnresolveComment}
                                />
                              </div>
                            ))}
                          </div>
                        )
                      })
                    )}
                  </pre>
                </ScrollArea>
              </Card>
            </motion.div>

            <motion.div className="col-span-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    Commentaires IA
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {visibleFindings.length}
                    </Badge>
                  </h3>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4 pr-4">
                      {analysis.findings.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun finding pour cette analyse.</p>
                      ) : (
                        <>
                          {showingAllFindings ? (
                            <div className="rounded-lg border border-amber-200/50 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                              Aucun finding n'est rattache explicitement au fichier affiche. La liste montre tous les commentaires de l'analyse.
                            </div>
                          ) : null}

                          {visibleFindings.map((finding, index) => (
                          <motion.div
                            key={finding.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            className={`p-4 rounded-xl border transition-all ${
                              resolvedFindings.has(finding.id)
                                ? "bg-green-50/50 dark:bg-green-900/10 border-green-200/50 dark:border-green-800/50 opacity-60"
                                : "bg-white dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50"
                            }`}
                          >
                            <div className="flex items-start gap-2 mb-3">
                              {severityIcon(finding.severity)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {finding.ruleId ?? `${finding.category.toUpperCase()} finding`}
                                  </span>
                                  {resolvedFindings.has(finding.id) && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="p-1 rounded-full bg-green-500">
                                      <Check className="h-3 w-3 text-white" />
                                    </motion.div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  {severityBadge(finding.severity)}
                                  <Badge variant="outline" className="text-xs">
                                    {finding.category}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {formatFindingSource(finding.source)}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-mono mb-3">
                                  {finding.filePath}:{finding.lineStart ?? "-"}
                                  {typeof finding.lineEnd === "number" ? `-${finding.lineEnd}` : ""}
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{finding.message}</p>

                            {finding.suggestion && (
                              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-3 rounded-lg mb-3 border border-blue-200/50 dark:border-blue-800/50">
                                <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">Suggestion: </span>
                                <span className="text-sm text-blue-800 dark:text-blue-200 ml-1">{finding.suggestion}</span>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 mb-3">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant={resolvedFindings.has(finding.id) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleResolved(finding.id)}
                                  className="gap-1"
                                >
                                  {resolvedFindings.has(finding.id) ? (
                                    <>
                                      <X className="h-3 w-3" />
                                      Annuler
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-3 w-3" />
                                      Resolu
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                              {ragReferenceCount > 0 ? (
                                <Link href={`/dashboard/rag/${id}`}>
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button variant="outline" size="sm" className="gap-1">
                                      <BookOpen className="h-3 w-3" />
                                      Source ({ragReferenceCount})
                                    </Button>
                                  </motion.div>
                                </Link>
                              ) : (
                                <Button variant="outline" size="sm" className="gap-1" disabled>
                                  <BookOpen className="h-3 w-3" />
                                  Pas de source RAG
                                </Button>
                              )}
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => void copyFinding(finding)}>
                                  <Copy className="h-3 w-3" />
                                  {copiedFindingId === finding.id ? "Copie" : "Copier"}
                                </Button>
                              </motion.div>
                            </div>

                            {isReviewer && (
                              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-2">
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Actions Reviewer</div>
                                <Textarea
                                  placeholder="Ajouter un commentaire..."
                                  className="text-sm min-h-[60px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                />
                                <div className="flex gap-2">
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button size="sm" className="bg-green-500 hover:bg-green-600">
                                      Accept
                                    </Button>
                                  </motion.div>
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50">
                                      Reject
                                    </Button>
                                  </motion.div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="conversation">
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                All Conversations
              </h3>
              {existingComments.filter((c) => !c.parent_id).length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm mt-1">Comments will appear here when added to the code</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {existingComments
                    .filter((c) => !c.parent_id)
                    .map((comment) => (
                      <CommentThread
                        key={comment.id}
                        rootComment={comment}
                        replies={getReplies(comment.id)}
                        authors={commentAuthors}
                        currentUserId={currentUser.id}
                        onReply={handleReplyToComment}
                        onResolve={handleResolveComment}
                        onUnresolve={handleUnresolveComment}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pending Review Banner */}
      <AnimatePresence>
        {pendingComments.length > 0 && (
          <PendingReviewBanner
            pendingComments={pendingComments}
            onFinishReview={() => setShowSubmitDialog(true)}
            onClearAll={handleClearAllPendingComments}
            onRemoveComment={handleRemovePendingComment}
          />
        )}
      </AnimatePresence>

      {/* Review Submission Dialog */}
      <ReviewSubmissionDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        analysisId={id!}
        pendingComments={pendingComments}
        onSubmit={handleSubmitReview}
        onRemoveComment={handleRemovePendingComment}
        isSubmitting={isSubmitting}
      />
    </motion.div>
  )
}
