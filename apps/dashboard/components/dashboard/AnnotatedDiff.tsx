"use client"
/* eslint-disable react/no-unescaped-entities */

import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileDiff,
  Files,
  GitBranch,
  GitPullRequest,
  Loader2,
  MessageSquarePlus,
  Play,
  Save,
  Search,
  Settings,
  Shield,
  SplitSquareHorizontal,
} from "lucide-react"
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider"
import { isReviewer } from "@/lib/roles"
import {
  fetchDashboardAnalysisDetails,
  type DashboardAnalysisDetails,
  type DashboardAnalysisDiffFile,
} from "@/lib/dashboard-analysis-details"
import { InlineCommentForm } from "@/components/review/InlineCommentForm"
import { CommentThread } from "@/components/review/CommentThread"
import { PendingReviewBanner } from "@/components/review/PendingReviewBanner"
import { ReviewSubmissionDialog } from "@/components/review/ReviewSubmissionDialog"
import { CodeEditor } from "@/components/editor/CodeEditor"
import type { PendingComment, ReviewComment, CommentAuthor, ReviewVerdict } from "@/lib/review-types"

// ─── helpers ────────────────────────────────────────────────────────────────

function getFileInfo(path: string) {
  const filename = path.split("/").pop() ?? path
  const ext = filename.split(".").pop()?.toUpperCase() ?? ""
  const extColors: Record<string, string> = {
    TS: "#3178c5", TSX: "#3178c5",
    JS: "#e3b341", JSX: "#e3b341",
    PY: "#3572a5",
    JSON: "#e3b341",
    MD: "#79c0ff",
    CSS: "#79c0ff",
    HTML: "#e67e22",
    RS: "#b7410e",
    GO: "#00acd7",
  }
  return {
    filename,
    ext: ext.slice(0, 2) || "??",
    extColor: extColors[ext] ?? "#6e7681",
  }
}

function calculateQualityScore(findings: DashboardAnalysisDetails["findings"]): number {
  const blockers = findings.filter((f) => f.severity === "BLOCKER").length
  const warnings = findings.filter((f) => f.severity === "WARN").length
  return Math.max(0, 100 - blockers * 15 - warnings * 5)
}

function normalizePathForComparison(value: string | null | undefined): string {
  return (value ?? "").trim().replaceAll("\\", "/").replace(/^\/+/, "")
}

function severityRank(severity: string): number {
  if (severity === "BLOCKER") return 0
  if (severity === "WARN") return 1
  return 2
}

const SOURCE_LABEL: Record<string, string> = {
  STATIC_RUFF: "Ruff",
  STATIC_SEMGREP: "Semgrep",
  STATIC_CLEAN_CODE: "CleanCode",
  STATIC_ESLINT: "ESLint",
  STATIC_STYLELINT: "Stylelint",
  STATIC_RUBOCOP: "RuboCop",
  STATIC_STATICCHECK: "Staticcheck",
  STATIC_SQLFLUFF: "SQLFluff",
  RAG: "AI Review",
}

function toolLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source.replace("STATIC_", "").toLowerCase()
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#56d364"
  if (score >= 60) return "#e3b341"
  return "#ff7b72"
}

type RepoCoordinates = {
  owner: string
  repo: string
}

function parseRepoCoordinates(value: string | null | undefined): RepoCoordinates | null {
  const raw = (value ?? "").trim()
  if (!raw) return null

  const normalized = raw
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")

  const parts = normalized.split("/").filter((part) => part.length > 0)
  if (parts.length < 2) return null

  return {
    owner: parts[0],
    repo: parts[1],
  }
}

// ─── sub-components ─────────────────────────────────────────────────────────

function ExtBadge({ ext, color }: { ext: string; color: string }) {
  return (
    <span
      className="inline-flex items-center justify-center text-white text-[8px] font-bold rounded-sm flex-shrink-0"
      style={{ background: color, width: 18, height: 14 }}
    >
      {ext}
    </span>
  )
}

function RagComment({
  finding,
  onApply,
  onDismiss,
}: {
  finding: DashboardAnalysisDetails["findings"][number]
  onApply?: () => void
  onDismiss?: () => void
}) {
  const isCritical = finding.severity === "BLOCKER"
  const borderColor = isCritical ? "rgba(127,119,221,0.8)" : "rgba(227,179,65,0.7)"
  const bgColor = isCritical ? "rgba(127,119,221,0.08)" : "rgba(227,179,65,0.06)"
  const avatarBg = isCritical ? "#7f77dd" : "rgba(227,179,65,0.9)"
  const avatarText = isCritical ? "#fff" : "#403805"
  const nameColor = isCritical ? "#d2a8ff" : "#e3b341"
  const badgeColor = isCritical ? "#ff7b72" : "#e3b341"
  const badgeBg = isCritical ? "rgba(255,123,114,0.15)" : "rgba(227,179,65,0.15)"
  const label = isCritical ? "critical" : "warning"
  const location = finding.lineStart != null ? `· ligne ${finding.lineStart}${finding.lineEnd != null ? `–${finding.lineEnd}` : ""} · ${label}` : `· ${label}`

  return (
    <div
      className="relative pl-[3px]"
      style={{ background: bgColor, borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="py-2 px-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="flex items-center justify-center text-[10px] font-bold rounded-full flex-shrink-0"
            style={{ background: avatarBg, color: avatarText, width: 28, height: 28 }}
          >
            AI
          </div>
          <span className="text-[11px] font-semibold" style={{ color: nameColor }}>RAG Reviewer</span>
          <span className="text-[11px]" style={{ color: "#6e7681" }}>{location}</span>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{ color: badgeColor, background: badgeBg }}
          >
            {label}
          </span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{
              color: "#8b949e",
              background: "rgba(255,255,255,0.06)",
              fontFamily: "monospace",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {toolLabel(finding.source)}
          </span>
        </div>
        {/* Message */}
        <p className="text-[11px] ml-9 mb-2" style={{ color: "#8b949e" }}>
          {finding.message}
          {finding.suggestion && ` → ${finding.suggestion}`}
        </p>
        {/* Actions */}
        <div className="flex gap-2 ml-9">
          <button
            className="text-[9px] font-semibold text-white px-3 py-1 rounded"
            style={{ background: "rgba(127,119,221,0.9)" }}
            onClick={onApply}
          >
            Appliquer correction
          </button>
          <button
            className="text-[9px] px-3 py-1 rounded"
            style={{ background: "#21262e", color: "#8b949e" }}
          >
            Commenter
          </button>
          <button
            className="text-[9px] px-3 py-1 rounded"
            style={{ background: "#21262e", color: "#8b949e" }}
            onClick={onDismiss}
          >
            Ignorer
          </button>
        </div>
      </div>
    </div>
  )
}

function DiffLine({
  line,
  lineNumber,
  findings,
  dismissedFindings,
  onDismiss,
  onComment,
  isCommenting,
}: {
  line: DashboardAnalysisDiffFile["lines"][number]
  lineNumber: number
  findings: DashboardAnalysisDetails["findings"]
  dismissedFindings: Set<string>
  onDismiss: (id: string) => void
  onComment: (lineNumber: number) => void
  isCommenting: boolean
}) {
  const lineFindings = findings.filter(
    (f) =>
      !dismissedFindings.has(f.id) &&
      f.lineStart != null &&
      f.lineStart <= lineNumber &&
      (f.lineEnd == null || f.lineEnd >= lineNumber) &&
      // Only show at the start line
      f.lineStart === lineNumber
  )

  let bgColor = "transparent"
  let borderColor = "transparent"
  let prefixColor = "#8b949e"
  let prefix = " "

  if (line.lineType === "add") {
    bgColor = "rgba(86,211,100,0.1)"
    borderColor = "rgba(86,211,100,0.5)"
    prefixColor = "#56d364"
    prefix = "+"
  } else if (line.lineType === "remove") {
    bgColor = "rgba(255,123,114,0.1)"
    borderColor = "rgba(255,123,114,0.5)"
    prefixColor = "#ff7b72"
    prefix = "-"
  } else if (line.lineType === "header") {
    bgColor = "rgba(121,192,255,0.07)"
    borderColor = "rgba(121,192,255,0.3)"
    prefix = "@"
    prefixColor = "#79c0ff"
  }

  const lineNumColor = line.lineType === "header" ? "#79c0ff" : "#6e7681"

  return (
    <>
      <div
        className="group flex items-stretch"
        style={{ background: bgColor, borderLeft: `3px solid ${borderColor}` }}
      >
        {/* Old line number */}
        <span
          className="w-[42px] text-right pr-2 select-none text-[11px] flex-shrink-0 border-r"
          style={{ color: lineNumColor, borderColor: "rgba(48,54,61,0.6)" }}
        >
          {line.lineType !== "header" ? (line.oldLineNo ?? "") : ""}
        </span>
        {/* New line number */}
        <span
          className="w-[42px] text-right pr-2 select-none text-[11px] flex-shrink-0 border-r"
          style={{ color: lineNumColor, borderColor: "rgba(48,54,61,0.6)" }}
        >
          {line.lineType !== "header" ? (line.newLineNo ?? "") : ""}
        </span>
        {/* Prefix */}
        <span className="w-4 text-[12px] font-mono select-none flex-shrink-0 ml-1" style={{ color: prefixColor }}>
          {prefix}
        </span>
        {/* Content */}
        <span
          className="flex-1 text-[12px] font-mono whitespace-pre overflow-x-auto"
          style={{ color: line.lineType === "remove" ? "#ff7b72" : line.lineType === "header" ? "#79c0ff" : "#e6edf3" }}
        >
          {line.content}
        </span>
        {/* Inline comment trigger */}
        {line.lineType !== "header" && (
          <button
            onClick={() => onComment(lineNumber)}
            className="mr-2 my-0.5 h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition"
            style={{
              color: isCommenting ? "#0d1117" : "#79c0ff",
              background: isCommenting ? "#79c0ff" : "rgba(121,192,255,0.12)",
              border: "1px solid rgba(121,192,255,0.3)",
            }}
            title="Comment this line"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* RAG comments after this line */}
      {lineFindings.map((finding) => (
        <RagComment
          key={finding.id}
          finding={finding}
          onDismiss={() => onDismiss(finding.id)}
        />
      ))}
    </>
  )
}

// ─── main component ─────────────────────────────────────────────────────────

export function AnnotatedDiff() {
  const currentUser = useDashboardUser()
  const params = useParams<{ id: string | string[] }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [analysis, setAnalysis] = useState<DashboardAnalysisDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [dismissedFindings, setDismissedFindings] = useState<Set<string>>(new Set())

  // Review state
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([])
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Comments from API
  const [existingComments, setExistingComments] = useState<ReviewComment[]>([])
  const [commentAuthors, setCommentAuthors] = useState<Map<string, CommentAuthor>>(new Map())

  // Real GitHub editing/review state
  const [viewMode, setViewMode] = useState<"diff" | "edit">("edit")
  const [activeBranch, setActiveBranch] = useState("main")
  const [branchLoading, setBranchLoading] = useState(false)
  const [editorSaveTrigger, setEditorSaveTrigger] = useState(0)
  const [githubActionMessage, setGithubActionMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)
  const [isSubmittingGitHubReview, setIsSubmittingGitHubReview] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!id) { setAnalysis(null); setLoading(false); return }
    setLoading(true)
    fetchDashboardAnalysisDetails(id)
      .then((payload) => {
        if (cancelled) return
        setAnalysis(payload)
        if (payload && payload.files.length > 0) {
          setSelectedFilePath(payload.files[0].pathNew)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!id) return
    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/reviews/comments?analysis_id=${id}`)
        if (response.ok) {
          const data = await response.json()
          setExistingComments(data.comments || [])
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
    if (!analysis || !selectedFilePath) return null
    return analysis.files.find((f) => f.pathNew === selectedFilePath) ?? null
  }, [analysis, selectedFilePath])

  const repoCoordinates = useMemo(
    () => parseRepoCoordinates(analysis?.repo),
    [analysis?.repo],
  )

  useEffect(() => {
    let cancelled = false

    const resolveBranch = async () => {
      if (!analysis || !repoCoordinates) {
        setActiveBranch("main")
        return
      }

      setBranchLoading(true)
      try {
        const listBranchesResponse = await fetch("/api/dashboard/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "list_branches",
            payload: {
              owner: repoCoordinates.owner,
              repo: repoCoordinates.repo,
            },
          }),
        })
        const listBranchesData = await listBranchesResponse.json().catch(() => ({}))
        if (!listBranchesResponse.ok) {
          throw new Error(
            typeof listBranchesData?.error === "string"
              ? listBranchesData.error
              : "Failed to resolve repository branches",
          )
        }
        const branches = Array.isArray(listBranchesData?.result)
          ? listBranchesData.result
          : []
        const branchNames = branches
          .map((branch) =>
            typeof branch?.name === "string" ? branch.name.trim() : "",
          )
          .filter((name): name is string => name.length > 0)
        const defaultBranch =
          branchNames.find((name) => name === "main") ??
          branchNames.find((name) => name === "master") ??
          branchNames[0] ??
          "main"

        if (!analysis.prNumber) {
          if (!cancelled) {
            setActiveBranch(defaultBranch)
          }
          return
        }

        const response = await fetch("/api/dashboard/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_pr",
            payload: {
              owner: repoCoordinates.owner,
              repo: repoCoordinates.repo,
              pullNumber: analysis.prNumber,
            },
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "Failed to resolve PR branch",
          )
        }

        const prHeadRef =
          typeof data?.result?.head?.ref === "string"
            ? data.result.head.ref.trim()
            : ""
        const prBaseRef =
          typeof data?.result?.base?.ref === "string"
            ? data.result.base.ref.trim()
            : ""
        const resolvedBranch = prHeadRef || prBaseRef || defaultBranch
        if (!cancelled) {
          setActiveBranch(resolvedBranch)
        }
      } catch (error) {
        console.error("Failed to resolve PR branch:", error)
        if (!cancelled) {
          setActiveBranch("main")
          setGithubActionMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Failed to resolve PR branch",
          })
        }
      } finally {
        if (!cancelled) {
          setBranchLoading(false)
        }
      }
    }

    void resolveBranch()
    return () => {
      cancelled = true
    }
  }, [analysis, repoCoordinates])

  const fileFindings = useMemo(() => {
    if (!analysis) return []
    const selectedPaths = new Set(
      [selectedFile?.pathNew, selectedFile?.pathOld, selectedFilePath]
        .map((v) => normalizePathForComparison(v))
        .filter((v) => v.length > 0),
    )
    const matching = selectedPaths.size > 0
      ? analysis.findings.filter((f) => selectedPaths.has(normalizePathForComparison(f.filePath)))
      : []
    return [...(matching.length > 0 ? matching : analysis.findings)].sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity) || (a.lineStart ?? 9999) - (b.lineStart ?? 9999)
    )
  }, [analysis, selectedFile, selectedFilePath])

  const commentsByLine = useMemo(() => {
    const map = new Map<number, ReviewComment[]>()
    const normalizedPath = normalizePathForComparison(selectedFilePath)
    for (const comment of existingComments) {
      if (normalizePathForComparison(comment.file_path) === normalizedPath && !comment.parent_id) {
        const line = comment.line_start
        if (!map.has(line)) map.set(line, [])
        map.get(line)!.push(comment)
      }
    }
    return map
  }, [existingComments, selectedFilePath])

  const getReplies = useCallback((parentId: string) => {
    return existingComments.filter((c) => c.parent_id === parentId)
  }, [existingComments])

  const canReview = isReviewer(currentUser.role) || currentUser.role === "admin"

  const handleAddPendingComment = (comment: PendingComment) => {
    setPendingComments((prev) => [...prev, comment])
    setActiveCommentLine(null)
  }
  const handleRemovePendingComment = (commentId: string) => {
    setPendingComments((prev) => prev.filter((c) => c.id !== commentId))
  }
  const handleClearAllPendingComments = () => setPendingComments([])

  const handleSubmitReview = async (verdict: ReviewVerdict, summary: string) => {
    if (!id) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/reviews/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: id, verdict, summary, comments: pendingComments }),
      })
      if (response.ok) {
        setPendingComments([])
        setShowSubmitDialog(false)
        const res = await fetch(`/api/reviews/comments?analysis_id=${id}`)
        if (res.ok) {
          const data = await res.json()
          setExistingComments(data.comments || [])
        }
      }
    } catch (error) {
      console.error("Failed to submit review:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResolveComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/reviews/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      })
      if (response.ok) {
        setExistingComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, status: "resolved" } : c)))
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
        setExistingComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, status: "open" } : c)))
      }
    } catch (error) {
      console.error("Failed to unresolve comment:", error)
    }
  }

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

  const handleEditorSaved = useCallback(() => {
    if (!selectedFilePath) return
    setGithubActionMessage({
      type: "success",
      text: `Committed ${selectedFilePath} to ${activeBranch}.`,
    })
  }, [selectedFilePath, activeBranch])

  const handleToolbarSave = useCallback(() => {
    if (!repoCoordinates) {
      setGithubActionMessage({
        type: "error",
        text: "Repository information is missing (owner/repo).",
      })
      return
    }
    if (!selectedFilePath) {
      setGithubActionMessage({
        type: "error",
        text: "Select a file before saving.",
      })
      return
    }
    setEditorSaveTrigger((value) => value + 1)
  }, [repoCoordinates, selectedFilePath])

  const submitGitHubReview = useCallback(
    async (event: "APPROVE" | "REQUEST_CHANGES") => {
      if (!analysis?.prNumber) {
        setGithubActionMessage({
          type: "error",
          text: "This analysis is not linked to a pull request.",
        })
        return
      }
      if (!repoCoordinates) {
        setGithubActionMessage({
          type: "error",
          text: "Repository information is missing (owner/repo).",
        })
        return
      }

      setIsSubmittingGitHubReview(true)
      setGithubActionMessage({
        type: "info",
        text:
          event === "APPROVE"
            ? "Submitting GitHub approval..."
            : "Submitting GitHub change request...",
      })

      try {
        const response = await fetch("/api/dashboard/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit_pr_review",
            payload: {
              owner: repoCoordinates.owner,
              repo: repoCoordinates.repo,
              pullNumber: analysis.prNumber,
              event,
              body:
                event === "APPROVE"
                  ? "Approved from AI Code Review Platform."
                  : "Changes requested from AI Code Review Platform.",
            },
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "Failed to submit GitHub review",
          )
        }
        setGithubActionMessage({
          type: "success",
          text:
            event === "APPROVE"
              ? `PR #${analysis.prNumber} approved on GitHub.`
              : `Changes requested on PR #${analysis.prNumber}.`,
        })
      } catch (error) {
        console.error("Failed to submit GitHub review:", error)
        setGithubActionMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to submit GitHub review",
        })
      } finally {
        setIsSubmittingGitHubReview(false)
      }
    },
    [analysis?.prNumber, repoCoordinates],
  )

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center rounded-xl border" style={{ background: "#070c16", borderColor: "#23304a" }}>
        <Loader2 className="h-6 w-6 animate-spin text-[#7f77dd]" />
        <span className="ml-3 text-[#8b949e] text-sm">Chargement de l'analyse...</span>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center rounded-xl border" style={{ background: "#070c16", borderColor: "#23304a" }}>
        <span className="text-[#8b949e]">Analyse non trouvée</span>
      </div>
    )
  }

  const qualityScore = calculateQualityScore(analysis.findings)
  const scoreColor = getScoreColor(qualityScore)
  const errorCount = analysis.findings.filter((f) => f.severity === "BLOCKER").length
  const warningCount = analysis.findings.filter((f) => f.severity === "WARN").length
  const totalAdditions = analysis.files.reduce((s, f) => s + (f.additionsCount ?? 0), 0)
  const totalDeletions = analysis.files.reduce((s, f) => s + (f.deletionsCount ?? 0), 0)
  const prBranch = branchLoading ? "resolving..." : activeBranch
  const selectedFileInfo = selectedFilePath ? getFileInfo(selectedFilePath) : null
  const coverage = Math.max(52, 96 - errorCount * 6 - warningCount * 2)
  const complexity = fileFindings.length > 16 ? "High" : fileFindings.length > 8 ? "Medium" : "Low"
  const openThreadCount = existingComments.filter((comment) => !comment.parent_id && comment.status !== "resolved").length
  const tabFiles = (() => {
    if (analysis.files.length <= 3) return analysis.files
    const active = analysis.files.find((file) => file.pathNew === selectedFilePath)
    const picked: DashboardAnalysisDiffFile[] = []
    if (active) picked.push(active)
    for (const file of analysis.files) {
      if (picked.some((entry) => entry.id === file.id)) continue
      picked.push(file)
      if (picked.length >= 3) break
    }
    return picked
  })()

  return (
    <div
      className="relative flex min-h-[calc(100vh-10rem)] w-full flex-col overflow-hidden rounded-xl border"
      style={{ background: "#0d1117", color: "#e6edf3", fontFamily: "Inter, sans-serif" }}
    >

      <div
        className="flex h-8 flex-shrink-0 items-center border-b px-2"
        style={{ background: "#0d1424", borderColor: "#23304a" }}
      >
        <div className="mr-5 flex items-center gap-[6px]">
          <Link href="/dashboard">
            <div className="h-3 w-3 cursor-pointer rounded-full hover:opacity-80" style={{ background: "#ff5f57" }} />
          </Link>
          <div className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        {["File", "Edit", "Selection", "View", "Go", "Run", "Terminal"].map((item) => (
          <span key={item} className="mr-4 cursor-pointer text-[12px]" style={{ color: "#8ea1c7" }}>
            {item}
          </span>
        ))}
        <span className="mr-4 cursor-pointer text-[12px] font-semibold" style={{ color: "#7f9dff" }}>
          Review
        </span>
        <span className="cursor-pointer text-[12px]" style={{ color: "#8ea1c7" }}>
          Help
        </span>
        <div className="ml-auto flex items-center gap-2 rounded-md border px-2 py-0.5" style={{ borderColor: "#2f4166", background: "#121c30" }}>
          <GitPullRequest className="h-3.5 w-3.5" style={{ color: "#7f9dff" }} />
          <span className="text-[11px]" style={{ color: "#9eb1d8" }}>
            {prBranch}
          </span>
          <div className="h-2 w-2 rounded-full" style={{ background: "#4bd38b" }} />
          <span className="text-[11px] font-semibold" style={{ color: "#4bd38b" }}>
            Open
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className="flex w-11 flex-shrink-0 flex-col items-center border-r py-2"
          style={{ background: "#0d1424", borderColor: "#23304a" }}
        >
          <button
            className="mb-1 flex h-8 w-8 items-center justify-center rounded-md"
            style={{ background: "rgba(127,157,255,0.16)", color: "#7f9dff" }}
            title="Explorer"
          >
            <Files className="h-4.5 w-4.5" />
          </button>
          {[
            { icon: Search, label: "Search" },
            { icon: GitBranch, label: "Source control" },
            { icon: Shield, label: "Security" },
            { icon: Settings, label: "Settings" },
          ].map((entry) => (
            <button
              key={entry.label}
              className="mt-1 flex h-8 w-8 items-center justify-center rounded-md"
              style={{ color: "#60739a" }}
              title={entry.label}
            >
              <entry.icon className="h-4.5 w-4.5" />
            </button>
          ))}
        </div>

        <aside
          className="hidden w-[250px] flex-shrink-0 flex-col border-r md:flex"
          style={{ background: "#111a2d", borderColor: "#23304a" }}
        >
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "#23304a" }}>
            <span className="text-[10px] font-semibold tracking-[0.08em]" style={{ color: "#7a8fb8" }}>
              EXPLORER
            </span>
            <Search className="h-3.5 w-3.5" style={{ color: "#7a8fb8" }} />
          </div>

          <div className="border-b px-3 py-1.5" style={{ borderColor: "#23304a" }}>
            <span className="text-[9px] font-semibold tracking-[0.08em]" style={{ color: "#6881b1" }}>
              CHANGED FILES
            </span>
          </div>

          <div className="max-h-[44%] overflow-y-auto py-1">
            {analysis.files.map((file) => {
              const info = getFileInfo(file.pathNew)
              const isActive = selectedFilePath === file.pathNew
              const hasAdditions = (file.additionsCount ?? 0) > 0
              const hasDeletions = (file.deletionsCount ?? 0) > 0
              const statusChar = hasAdditions && hasDeletions ? "M" : hasAdditions ? "A" : hasDeletions ? "D" : "M"
              const statusColor = statusChar === "A" ? "#4bd38b" : statusChar === "D" ? "#ff8e8e" : "#f3c969"
              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedFilePath(file.pathNew)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  style={{ background: isActive ? "#4d56a526" : "transparent" }}
                >
                  <ExtBadge ext={info.ext} color={info.extColor} />
                  <span className="flex-1 truncate text-[11px]" style={{ color: isActive ? "#eef4ff" : "#9cb0d7" }}>
                    {info.filename}
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: statusColor }}>
                    {statusChar}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="border-y px-3 py-1.5" style={{ borderColor: "#23304a" }}>
            <span className="text-[9px] font-semibold tracking-[0.08em]" style={{ color: "#6881b1" }}>
              OUTLINE
            </span>
          </div>
          <div className="space-y-1 px-3 py-2">
            {fileFindings.slice(0, 5).map((finding) => (
              <div key={finding.id} className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5" style={{ color: "#7f9dff" }} />
                <span className="truncate text-[11px]" style={{ color: "#8ea1c7" }}>
                  {finding.ruleId ?? finding.category}
                </span>
              </div>
            ))}
            {fileFindings.length === 0 && (
              <span className="text-[11px]" style={{ color: "#5f7197" }}>
                No indexed symbols
              </span>
            )}
          </div>

          <div className="mt-auto border-t px-3 py-2" style={{ borderColor: "#23304a" }}>
            <div className="text-[9px] font-semibold tracking-[0.08em]" style={{ color: "#6881b1" }}>
              GIT BLAME
            </div>
            <div className="mt-1 text-[11px] font-medium" style={{ color: "#a7b8da" }}>
              {currentUser.name ?? "Developer"}
            </div>
            <div className="text-[10px]" style={{ color: "#60739a" }}>
              {analysis.commitSha ? analysis.commitSha.slice(0, 7) : "latest commit"}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col" style={{ background: "#070c16" }}>
            <div className="flex h-9 items-end overflow-x-auto border-b" style={{ background: "#0f182b", borderColor: "#23304a" }}>
              {tabFiles.map((file) => {
                const info = getFileInfo(file.pathNew)
                const isActive = selectedFilePath === file.pathNew
                const changedCount = (file.additionsCount ?? 0) + (file.deletionsCount ?? 0)
                return (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFilePath(file.pathNew)}
                    className="flex h-full min-w-[180px] items-center gap-2 border-r px-3"
                    style={{
                      background: isActive ? "#070c16" : "#0f182b",
                      borderColor: "#23304a",
                      borderTop: isActive ? "2px solid #7f9dff" : "2px solid transparent",
                    }}
                  >
                    <ExtBadge ext={info.ext} color={info.extColor} />
                    <span className="truncate text-[11px]" style={{ color: isActive ? "#e8efff" : "#90a3cc" }}>
                      {info.filename}
                    </span>
                    {changedCount > 0 && (
                      <span className="ml-auto text-[10px]" style={{ color: "#f3c969" }}>
                        {changedCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex h-8 items-center border-b px-2" style={{ background: "#0a1222", borderColor: "#23304a" }}>
              <div className="flex items-center gap-1 overflow-hidden text-[10px]" style={{ color: "#7f8cab" }}>
                <Search className="h-3.5 w-3.5 flex-shrink-0" />
                <div className="truncate">
                  {selectedFilePath?.split("/").map((part, index, arr) => (
                    <span key={`${part}-${index}`}>
                      <span style={{ color: index === arr.length - 1 ? "#7f9dff" : "#6f82a8" }}>{part}</span>
                      {index < arr.length - 1 && <span className="mx-1">/</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button className="flex h-6 items-center gap-1 rounded px-2 text-[10px]" style={{ background: "#152036", color: "#8ea1c7" }}>
                  <SplitSquareHorizontal className="h-3.5 w-3.5" />
                  Split
                </button>
                <button
                  onClick={() => setViewMode("diff")}
                  className="flex h-6 items-center gap-1 rounded px-2 text-[10px]"
                  style={{
                    background: viewMode === "diff" ? "#253056" : "#152036",
                    color: viewMode === "diff" ? "#9bb1df" : "#8ea1c7",
                  }}
                >
                  <FileDiff className="h-3.5 w-3.5" />
                  Diff
                </button>
                <button
                  onClick={() => setViewMode("edit")}
                  className="flex h-6 items-center gap-1 rounded px-2 text-[10px]"
                  style={{
                    background: viewMode === "edit" ? "#253056" : "#152036",
                    color: viewMode === "edit" ? "#9bb1df" : "#8ea1c7",
                  }}
                >
                  <Play className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleToolbarSave}
                  disabled={
                    viewMode !== "edit" ||
                    !selectedFilePath ||
                    !repoCoordinates ||
                    branchLoading
                  }
                  className="flex h-6 items-center gap-1 rounded px-2 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#193024", color: "#63d69c" }}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
                <button className="flex h-6 items-center gap-1 rounded px-2 text-[10px]" style={{ background: "#2b2346", color: "#c0a9ff" }}>
                  <Play className="h-3.5 w-3.5" />
                  Run
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1">
              {viewMode === "edit" ? (
                <div className="min-w-0 flex-1">
                  {!repoCoordinates ? (
                    <div className="p-8 text-[13px]" style={{ color: "#ff8e8e" }}>
                      Cannot open editor: repository format is invalid.
                    </div>
                  ) : (
                    <CodeEditor
                      owner={repoCoordinates.owner}
                      repo={repoCoordinates.repo}
                      branch={activeBranch}
                      filePath={selectedFilePath}
                      onSaved={handleEditorSaved}
                      saveTrigger={editorSaveTrigger}
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1 overflow-auto" style={{ background: "#070c16" }}>
                    {!selectedFile || selectedFile.lines.length === 0 ? (
                      <div className="p-8 text-[13px]" style={{ color: "#60739a" }}>
                        No detailed diff is available for this file.
                      </div>
                    ) : (
                      <div className="py-1">
                        {selectedFile.lines.map((line, idx) => {
                          const lineNumber = line.newLineNo ?? line.oldLineNo ?? idx + 1
                          return (
                            <div key={`${selectedFile.id}-${idx}`}>
                              <DiffLine
                                line={line}
                                lineNumber={lineNumber}
                                findings={fileFindings}
                                dismissedFindings={dismissedFindings}
                                onDismiss={(fid) => setDismissedFindings((prev) => new Set([...prev, fid]))}
                                onComment={(targetLine) => setActiveCommentLine((prev) => (prev === targetLine ? null : targetLine))}
                                isCommenting={activeCommentLine === lineNumber}
                              />
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
                              <AnimatePresence>
                                {activeCommentLine === lineNumber && (
                                  <InlineCommentForm
                                    analysisId={id!}
                                    filePath={selectedFilePath!}
                                    lineStart={lineNumber}
                                    codeSnippet={line.content}
                                    onSubmit={handleAddPendingComment}
                                    onCancel={() => setActiveCommentLine(null)}
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="w-[82px] flex-shrink-0 overflow-hidden border-l px-1.5 pt-2" style={{ background: "#0a1222", borderColor: "#23304a" }}>
                    <div className="mb-2 h-14 rounded-md" style={{ background: "rgba(255,255,255,0.05)" }} />
                    {fileFindings.slice(0, 14).map((finding, index) => {
                      const color =
                        finding.severity === "BLOCKER"
                          ? "rgba(255,132,132,0.55)"
                          : finding.severity === "WARN"
                            ? "rgba(243,201,105,0.55)"
                            : "rgba(127,157,255,0.55)"
                      const width = 24 + (((finding.lineStart ?? index + 1) * 17) % 34)
                      return (
                        <div
                          key={finding.id}
                          className="mb-[6px] rounded"
                          style={{ height: 3, width: `${width}px`, background: color }}
                        />
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <aside
            className="hidden w-[280px] flex-shrink-0 flex-col overflow-y-auto border-l lg:flex"
            style={{ background: "#111a2d", borderColor: "#23304a" }}
          >
            <div className="p-4">
              <div className="mb-2 text-[9px] font-semibold tracking-[0.08em]" style={{ color: "#7a8fb8" }}>
                CODE QUALITY
              </div>
              <div className="mb-2 flex items-end gap-1">
                <span className="text-[36px] font-bold leading-none" style={{ color: "#f0f5ff" }}>
                  {qualityScore}
                </span>
                <span className="mb-1 text-[12px]" style={{ color: "#7085af" }}>
                  / 100
                </span>
              </div>
              <div className="mb-3 h-[6px] rounded" style={{ background: "#1e2a43" }}>
                <div className="h-full rounded" style={{ width: `${qualityScore}%`, background: scoreColor }} />
              </div>

              {[
                { label: "Errors", value: String(errorCount), color: errorCount > 0 ? "#ff8e8e" : "#4bd38b" },
                { label: "Warnings", value: String(warningCount), color: warningCount > 0 ? "#f3c969" : "#4bd38b" },
                { label: "Complexity", value: complexity, color: "#8fb1ff" },
                { label: "Coverage", value: `${coverage}%`, color: "#4bd38b" },
              ].map((metric) => (
                <div key={metric.label} className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: "#8ea1c7" }}>
                    {metric.label}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: metric.color }}>
                    {metric.value}
                  </span>
                </div>
              ))}

              <div className="my-3 border-t" style={{ borderColor: "#23304a" }} />

              <div className="mb-2 text-[9px] font-semibold tracking-[0.08em]" style={{ color: "#7a8fb8" }}>
                RAG ISSUES
              </div>
              <div className="space-y-2">
                {fileFindings.slice(0, 6).map((finding) => (
                  <div key={finding.id} className="flex items-start gap-2">
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: finding.severity === "BLOCKER" ? "#ff8e8e" : "#f3c969" }}
                    />
                    <span className="text-[10px] leading-snug" style={{ color: "#95a8d0" }}>
                      {finding.message.length > 46 ? `${finding.message.slice(0, 46)}...` : finding.message}
                      {finding.lineStart != null && ` l.${finding.lineStart}`}
                    </span>
                  </div>
                ))}
                {fileFindings.length === 0 && (
                  <span className="text-[10px]" style={{ color: "#60739a" }}>
                    No open findings on this file.
                  </span>
                )}
              </div>

              <div className="my-3 border-t" style={{ borderColor: "#23304a" }} />

              <div className="mb-2 text-[9px] font-semibold tracking-[0.08em]" style={{ color: "#7a8fb8" }}>
                PR INFO
              </div>
              {[
                { label: "+lines", value: `+${totalAdditions}`, color: "#4bd38b" },
                { label: "-lines", value: `-${totalDeletions}`, color: "#ff8e8e" },
                { label: "Files", value: String(analysis.files.length), color: "#8fb1ff" },
                { label: "Threads", value: String(openThreadCount), color: "#c4b0ff" },
              ].map((metric) => (
                <div key={metric.label} className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: "#8ea1c7" }}>
                    {metric.label}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: metric.color }}>
                    {metric.value}
                  </span>
                </div>
              ))}

              <div className="my-3 border-t" style={{ borderColor: "#23304a" }} />

              <div className="mb-2 rounded-md border px-2 py-2 text-[10px]" style={{ borderColor: "#2f4166", background: "#0d1424", color: "#9db1da" }}>
                Branch: <span className="font-semibold" style={{ color: "#d6ddff" }}>{prBranch}</span>
                {repoCoordinates ? (
                  <span> · {repoCoordinates.owner}/{repoCoordinates.repo}</span>
                ) : (
                  <span style={{ color: "#ff8e8e" }}> · invalid repository</span>
                )}
              </div>

              {githubActionMessage && (
                <div
                  className="mb-2 rounded-md border px-2 py-2 text-[10px]"
                  style={{
                    borderColor:
                      githubActionMessage.type === "error"
                        ? "rgba(255,142,142,0.45)"
                        : githubActionMessage.type === "success"
                          ? "rgba(75,211,139,0.45)"
                          : "rgba(143,177,255,0.45)",
                    background:
                      githubActionMessage.type === "error"
                        ? "rgba(255,142,142,0.08)"
                        : githubActionMessage.type === "success"
                          ? "rgba(75,211,139,0.08)"
                          : "rgba(143,177,255,0.08)",
                    color:
                      githubActionMessage.type === "error"
                        ? "#ffb3b3"
                        : githubActionMessage.type === "success"
                          ? "#9ef0c4"
                          : "#b6c9f0",
                  }}
                >
                  {githubActionMessage.text}
                </div>
              )}

              <button
                onClick={handleToolbarSave}
                disabled={
                  viewMode !== "edit" ||
                  !selectedFilePath ||
                  !repoCoordinates ||
                  branchLoading
                }
                className="mb-2 flex h-9 w-full items-center justify-center gap-1 rounded-md text-[12px] font-semibold"
                style={{
                  background: "#1f6a46",
                  color: "#d4ffe8",
                  border: "1px solid #2f9b66",
                  opacity:
                    viewMode !== "edit" ||
                    !selectedFilePath ||
                    !repoCoordinates ||
                    branchLoading
                      ? 0.5
                      : 1,
                }}
              >
                <Save className="h-3.5 w-3.5" />
                Save changes
              </button>
              {canReview && (
                <>
                  <button
                    onClick={() => void submitGitHubReview("APPROVE")}
                    disabled={
                      isSubmittingGitHubReview ||
                      !analysis.prNumber ||
                      !repoCoordinates
                    }
                    className="mb-2 flex h-9 w-full items-center justify-center gap-1 rounded-md text-[12px] font-semibold"
                    style={{
                      background: "#2b2f68",
                      color: "#d6ddff",
                      border: "1px solid #4f56a5",
                      opacity:
                        isSubmittingGitHubReview ||
                        !analysis.prNumber ||
                        !repoCoordinates
                          ? 0.5
                          : 1,
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve PR
                  </button>
                  <button
                    onClick={() => void submitGitHubReview("REQUEST_CHANGES")}
                    disabled={
                      isSubmittingGitHubReview ||
                      !analysis.prNumber ||
                      !repoCoordinates
                    }
                    className="flex h-9 w-full items-center justify-center gap-1 rounded-md text-[12px] font-medium"
                    style={{
                      background: "#1e2a43",
                      color: "#9db1da",
                      border: "1px solid #2f4166",
                      opacity:
                        isSubmittingGitHubReview ||
                        !analysis.prNumber ||
                        !repoCoordinates
                          ? 0.5
                          : 1,
                    }}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Request changes
                  </button>
                  <button
                    onClick={() => setShowSubmitDialog(true)}
                    className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-md text-[11px] font-medium"
                    style={{ background: "#172033", color: "#90a3cc", border: "1px solid #2f4166" }}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Internal review notes
                  </button>
                </>
              )}

              <div className="mt-3 flex flex-col gap-1.5">
                <Link
                  href={`/dashboard/report/${id}`}
                  className="rounded px-2 py-1 text-center text-[10px]"
                  style={{ background: "#1e2a43", color: "#8fb1ff" }}
                >
                  Open full report
                </Link>
                <Link
                  href={`/dashboard/history/${id}`}
                  className="rounded px-2 py-1 text-center text-[10px]"
                  style={{ background: "#172033", color: "#90a3cc" }}
                >
                  View history
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── StatusBar ────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 border-t px-3"
        style={{ height: 24, background: "#0d1424", borderColor: "#23304a" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm" style={{ background: "#4bd38b" }} />
          <span className="text-[10px] font-medium" style={{ color: "#4bd38b" }}>
            RAG connected
          </span>
        </div>
        <span style={{ color: "#60739a" }}>|</span>
        <span className="text-[10px]" style={{ color: "#60739a" }}>
          {selectedFileInfo?.ext === "TS" || selectedFileInfo?.ext === "TX"
            ? "TypeScript 5.4"
            : selectedFileInfo?.ext === "PY"
              ? "Python 3.11"
              : selectedFileInfo?.filename?.split(".").pop() ?? "Text"}
        </span>
        <span style={{ color: "#60739a" }}>|</span>
        <span className="text-[10px]" style={{ color: "#60739a" }}>
          UTF-8 LF
        </span>
        <span style={{ color: "#60739a" }}>|</span>
        <span className="text-[10px]" style={{ color: "#60739a" }}>
          Spaces: 2
        </span>
        <div className="flex-1" />
        {(errorCount > 0 || warningCount > 0) && (
          <span className="text-[10px] font-medium" style={{ color: "#f3c969" }}>
            {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? "s" : ""}` : ""}
            {errorCount > 0 && warningCount > 0 ? " · " : ""}
            {warningCount > 0 ? `${warningCount} warning${warningCount > 1 ? "s" : ""}` : ""}
          </span>
        )}
        <span style={{ color: "#60739a" }}>|</span>
        <span className="text-[10px]" style={{ color: "#8ea1c7" }}>
          {analysis.prNumber ? `${analysis.prLabel} · ${prBranch}` : prBranch}
        </span>
        <span style={{ color: "#60739a" }}>|</span>
        <span className="text-[10px]" style={{ color: "#8ea1c7" }}>
          {analysis.commitSha ? `${analysis.commitSha.slice(0, 7)}` : "Ln 1, Col 1"}
        </span>
      </div>

      {/* ── Review dialogs ───────────────────────────────────────────── */}
      <AnimatePresence>
        {pendingComments.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <PendingReviewBanner
              pendingComments={pendingComments}
              onFinishReview={() => setShowSubmitDialog(true)}
              onClearAll={handleClearAllPendingComments}
              onRemoveComment={handleRemovePendingComment}
            />
          </div>
        )}
      </AnimatePresence>

      <ReviewSubmissionDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        analysisId={id!}
        pendingComments={pendingComments}
        onSubmit={handleSubmitReview}
        onRemoveComment={handleRemovePendingComment}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
