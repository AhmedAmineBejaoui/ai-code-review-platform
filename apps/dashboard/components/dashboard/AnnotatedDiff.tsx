"use client"
/* eslint-disable react/no-unescaped-entities */

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
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

function getScoreColor(score: number): string {
  if (score >= 80) return "#56d364"
  if (score >= 60) return "#e3b341"
  return "#ff7b72"
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
}: {
  line: DashboardAnalysisDiffFile["lines"][number]
  lineNumber: number
  findings: DashboardAnalysisDetails["findings"]
  dismissedFindings: Set<string>
  onDismiss: (id: string) => void
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
        className="flex"
        style={{ background: bgColor, borderLeft: `3px solid ${borderColor}` }}
      >
        {/* Line number */}
        <span
          className="w-[52px] text-right pr-3 select-none text-[11px] flex-shrink-0"
          style={{ color: lineNumColor }}
        >
          {line.lineType !== "header" ? lineNumber : ""}
        </span>
        {/* Prefix */}
        <span className="w-4 text-[12px] font-mono select-none flex-shrink-0" style={{ color: prefixColor }}>
          {prefix}
        </span>
        {/* Content */}
        <span
          className="flex-1 text-[12px] font-mono whitespace-pre"
          style={{ color: line.lineType === "remove" ? "#ff7b72" : line.lineType === "header" ? "#79c0ff" : "#e6edf3" }}
        >
          {line.content}
        </span>
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
  const [activeTab, setActiveTab] = useState<"files" | "conversation">("files")

  // Review state
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([])
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Comments from API
  const [existingComments, setExistingComments] = useState<ReviewComment[]>([])
  const [commentAuthors, setCommentAuthors] = useState<Map<string, CommentAuthor>>(new Map())

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
  const ragReferenceCount = analysis?.reviewOutput?.contextReferences.length ?? 0

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

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#7f77dd]" />
        <span className="ml-3 text-[#8b949e] text-sm">Chargement de l'analyse...</span>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0d1117] flex items-center justify-center">
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
  const prBranch = analysis.prLabel ?? "feat/branch"
  const selectedFileInfo = selectedFilePath ? getFileInfo(selectedFilePath) : null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden select-none"
      style={{ background: "#0d1117", color: "#e6edf3", fontFamily: "Inter, sans-serif" }}
    >

      {/* ── MenuBar ──────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center px-2 border-b"
        style={{ height: 32, background: "#161b22", borderColor: "#30363d" }}
      >
        {/* macOS dots */}
        <div className="flex items-center gap-[6px] mr-6">
          <Link href="/dashboard">
            <div className="rounded-full cursor-pointer hover:opacity-80" style={{ width: 12, height: 12, background: "#ff5f57" }} />
          </Link>
          <div className="rounded-full" style={{ width: 12, height: 12, background: "#febc2e" }} />
          <div className="rounded-full" style={{ width: 12, height: 12, background: "#28c840" }} />
        </div>
        {/* Menu items */}
        {["File", "Edit", "Selection", "View", "Go", "Run", "Terminal"].map((item) => (
          <span key={item} className="text-[12px] mr-4 cursor-pointer hover:text-white" style={{ color: "#8b949e" }}>
            {item}
          </span>
        ))}
        <span className="text-[12px] mr-4 cursor-pointer font-semibold" style={{ color: "#7f77dd" }}>
          Review
        </span>
        <span className="text-[12px] mr-4 cursor-pointer hover:text-white" style={{ color: "#8b949e" }}>
          Help
        </span>
        {/* PR Badge */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-2 rounded"
            style={{ background: "#21262e", height: 20 }}
          >
            <span className="text-[11px]" style={{ color: "#8b949e" }}>
              {prBranch}
            </span>
            <div className="rounded-sm" style={{ width: 8, height: 8, background: "#56d364" }} />
            <span className="text-[11px] font-medium" style={{ color: "#56d364" }}>Open</span>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── ActivityBar ─────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col items-center pt-2 border-r"
          style={{ width: 48, background: "#161b22", borderColor: "#30363d" }}
        >
          <div className="relative mb-1">
            <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-r" style={{ background: "#7f77dd" }} />
            <button className="flex items-center justify-center text-[18px] mt-1 rounded w-8 h-8" style={{ color: "#7f77dd" }}>⊞</button>
          </div>
          {["⌕", "⎇", "⚙", "◉", "⬡"].map((icon, i) => (
            <button key={i} className="flex items-center justify-center text-[18px] mt-1 rounded w-8 h-8 hover:text-white" style={{ color: "#6e7681" }}>
              {icon}
            </button>
          ))}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col border-r overflow-hidden"
          style={{ width: 220, background: "#161b22", borderColor: "#30363d" }}
        >
          {/* Explorer header */}
          <div className="flex items-center justify-between px-2 py-2 border-b" style={{ borderColor: "#30363d" }}>
            <span className="text-[10px] font-semibold" style={{ color: "#6e7681" }}>EXPLORER</span>
            <button className="text-[13px]" style={{ color: "#8b949e" }}>⟳</button>
          </div>

          {/* Changed files */}
          <div className="flex-shrink-0">
            <div className="px-3 py-1.5 border-b" style={{ borderColor: "#30363d" }}>
              <span className="text-[9px] font-semibold" style={{ color: "#6e7681" }}>CHANGED FILES</span>
            </div>
            {analysis.files.map((file) => {
              const info = getFileInfo(file.pathNew)
              const isActive = selectedFilePath === file.pathNew
              const hasAdditions = (file.additionsCount ?? 0) > 0
              const hasDeletions = (file.deletionsCount ?? 0) > 0
              const statusChar = hasAdditions && hasDeletions ? "M" : hasAdditions ? "A" : hasDeletions ? "D" : "M"
              const statusColor = statusChar === "A" ? "#56d364" : "#e3b341"
              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedFilePath(file.pathNew)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-90"
                  style={{ background: isActive ? "#7f77dd" : "transparent" }}
                >
                  <ExtBadge ext={info.ext} color={info.extColor} />
                  <span
                    className="flex-1 text-[11px] truncate"
                    style={{ color: isActive ? "#fff" : "#8b949e" }}
                  >
                    {info.filename}
                  </span>
                  <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: isActive ? "#fff" : statusColor }}>
                    {statusChar}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="border-t my-1" style={{ borderColor: "#30363d" }} />

          {/* Outline */}
          <div className="flex-shrink-0 overflow-hidden">
            <div className="px-3 py-1.5">
              <span className="text-[9px] font-semibold" style={{ color: "#6e7681" }}>OUTLINE</span>
            </div>
            {fileFindings.slice(0, 5).map((f, i) => {
              const colors = ["#d2a8ff", "#ffa657", "#d2a8ff", "#56d364", "#d2a8ff"]
              return (
                <div key={f.id} className="flex items-center gap-2 px-3 py-0.5">
                  <span className="text-[9px] font-semibold" style={{ color: colors[i % colors.length] }}>fn</span>
                  <span className="text-[11px] truncate" style={{ color: "#8b949e" }}>
                    {f.ruleId ?? f.category}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex-1" />

          {/* Git Blame */}
          <div className="border-t px-3 py-2" style={{ borderColor: "#30363d" }}>
            <div className="text-[9px] font-semibold mb-1" style={{ color: "#6e7681" }}>GIT BLAME</div>
            <div className="text-[11px] font-medium" style={{ color: "#8b949e" }}>{currentUser.name ?? "Developer"}</div>
            <div className="text-[10px]" style={{ color: "#6e7681" }}>
              {analysis.commitSha ? `${analysis.commitSha.slice(0, 7)}` : "latest commit"}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="rounded-sm" style={{ width: 6, height: 6, background: "#56d364" }} />
              <span className="text-[10px] font-medium" style={{ color: "#56d364" }}>up to date</span>
            </div>
          </div>
        </div>

        {/* ── Editor + Right panel ─────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Editor column ──────────────────────────────────────── */}
          <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "#0d1117" }}>

            {/* TabBar */}
            <div
              className="flex-shrink-0 flex items-end border-b overflow-hidden"
              style={{ height: 34, background: "#161b22", borderColor: "#30363d" }}
            >
              {analysis.files.map((file, idx) => {
                const info = getFileInfo(file.pathNew)
                const isActive = selectedFilePath === file.pathNew
                const hasChanges = (file.additionsCount ?? 0) + (file.deletionsCount ?? 0) > 0
                return (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFilePath(file.pathNew)}
                    className="flex items-center gap-1.5 px-3 h-full border-r flex-shrink-0"
                    style={{
                      background: isActive ? "#0d1117" : "#161b22",
                      borderColor: "#30363d",
                      borderTop: isActive ? "2px solid #7f77dd" : "2px solid transparent",
                      minWidth: idx === 0 ? 160 : 140,
                    }}
                  >
                    <ExtBadge ext={info.ext} color={info.extColor} />
                    <span className="text-[11px]" style={{ color: isActive ? "#e6edf3" : "#8b949e" }}>
                      {info.filename}
                    </span>
                    {hasChanges && (
                      <div className="rounded-sm ml-1 flex-shrink-0" style={{ width: 7, height: 7, background: "#e3b341" }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Breadcrumb + toolbar */}
            <div
              className="flex-shrink-0 flex items-center px-3 border-b"
              style={{ height: 26, background: "#0d1117", borderColor: "#30363d" }}
            >
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-[10px] flex-1">
                {selectedFilePath?.split("/").map((part, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    <span style={{ color: i === arr.length - 1 ? "#79c0ff" : "#6e7681" }}>{part}</span>
                    {i < arr.length - 1 && <span style={{ color: "#6e7681" }}>›</span>}
                  </span>
                ))}
              </div>
              {/* Tool buttons */}
              <div className="flex items-center gap-1">
                {[
                  { label: "Split", bg: "#21262e", color: "#8b949e" },
                  { label: "Diff ✓", bg: "rgba(127,119,221,0.18)", color: "#7f77dd" },
                  { label: "Format", bg: "#21262e", color: "#8b949e" },
                  { label: "⌘ Save", bg: "rgba(86,211,100,0.15)", color: "#56d364" },
                  { label: "▶ Run", bg: "rgba(210,168,255,0.15)", color: "#d2a8ff" },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    className="text-[9px] font-semibold px-2 rounded"
                    style={{ background: btn.bg, color: btn.color, height: 18 }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code area + minimap */}
            <div className="flex flex-1 overflow-hidden">

              {/* Code */}
              <div className="flex-1 overflow-auto" style={{ background: "#0d1117" }}>
                {!selectedFile || selectedFile.lines.length === 0 ? (
                  <div className="p-8 text-[13px]" style={{ color: "#6e7681" }}>
                    Aucun diff détaillé disponible pour ce fichier.
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
                          />
                          {/* Existing comment threads */}
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
                          {/* Inline comment form */}
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

              {/* Minimap */}
              <div
                className="flex-shrink-0 border-l pt-2 overflow-hidden"
                style={{ width: 78, background: "#10151c", borderColor: "#30363d" }}
              >
                {/* Viewport indicator */}
                <div className="rounded mx-1 mb-1" style={{ height: 60, background: "rgba(255,255,255,0.06)" }} />
                {/* Mini lines */}
                {fileFindings.slice(0, 12).map((f, i) => {
                  const color =
                    f.severity === "BLOCKER"
                      ? "rgba(255,123,114,0.5)"
                      : f.severity === "WARN"
                      ? "rgba(227,179,65,0.5)"
                      : "rgba(127,119,221,0.5)"
                  const width = 20 + Math.random() * 30
                  return (
                    <div
                      key={f.id}
                      className="rounded mx-2 mb-[5px]"
                      style={{ height: 3, width: `${width}px`, background: color }}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Right Panel ────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 flex flex-col border-l overflow-y-auto"
            style={{ width: 240, background: "#161b22", borderColor: "#30363d" }}
          >
            <div className="p-3">

              {/* Code Quality */}
              <div className="text-[9px] font-semibold mb-2" style={{ color: "#6e7681" }}>CODE QUALITY</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[32px] font-bold leading-none" style={{ color: "#e6edf3" }}>{qualityScore}</span>
                <span className="text-[12px]" style={{ color: "#6e7681" }}>/ 100</span>
              </div>
              {/* Score bar */}
              <div className="rounded h-[5px] mb-3" style={{ background: "#21262e" }}>
                <div
                  className="rounded h-full"
                  style={{ width: `${qualityScore}%`, background: scoreColor }}
                />
              </div>
              {/* Metrics */}
              {[
                { label: "Errors", value: String(errorCount), color: errorCount > 0 ? "#ff7b72" : "#56d364" },
                { label: "Warnings", value: String(warningCount), color: warningCount > 0 ? "#e3b341" : "#56d364" },
                { label: "Complexity", value: warningCount > 2 ? "High" : errorCount > 0 ? "Medium" : "Low", color: "#79c0ff" },
                { label: "Coverage", value: `${Math.max(50, 95 - errorCount * 5)}%`, color: "#56d364" },
              ].map((m) => (
                <div key={m.label} className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px]" style={{ color: "#8b949e" }}>{m.label}</span>
                  <span className="text-[11px] font-semibold" style={{ color: m.color }}>{m.value}</span>
                </div>
              ))}

              {/* Divider */}
              <div className="border-t my-3" style={{ borderColor: "#30363d" }} />

              {/* RAG Issues */}
              <div className="text-[9px] font-semibold mb-2" style={{ color: "#6e7681" }}>RAG ISSUES</div>
              {fileFindings.slice(0, 5).map((f) => {
                const dotColor = f.severity === "BLOCKER" ? "#ff7b72" : "#e3b341"
                return (
                  <div key={f.id} className="flex items-start gap-2 mb-2">
                    <div className="rounded-sm flex-shrink-0 mt-1" style={{ width: 7, height: 7, background: dotColor }} />
                    <span className="text-[10px] leading-snug" style={{ color: "#8b949e" }}>
                      {f.message.length > 30 ? f.message.slice(0, 30) + "…" : f.message}
                      {f.lineStart != null && ` l.${f.lineStart}`}
                    </span>
                  </div>
                )
              })}
              {fileFindings.length === 0 && (
                <p className="text-[10px]" style={{ color: "#6e7681" }}>No issues detected.</p>
              )}

              {/* Divider */}
              <div className="border-t my-3" style={{ borderColor: "#30363d" }} />

              {/* PR Info */}
              <div className="text-[9px] font-semibold mb-2" style={{ color: "#6e7681" }}>PR INFO</div>
              {[
                { label: "+lines", value: `+${totalAdditions}`, color: "#56d364" },
                { label: "-lines", value: `-${totalDeletions}`, color: "#ff7b72" },
                { label: "Files", value: String(analysis.files.length), color: "#79c0ff" },
                { label: "Reviewer", value: "RAG Bot", color: "#d2a8ff" },
              ].map((m) => (
                <div key={m.label} className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px]" style={{ color: "#8b949e" }}>{m.label}</span>
                  <span className="text-[11px] font-semibold" style={{ color: m.color }}>{m.value}</span>
                </div>
              ))}

              {/* Divider */}
              <div className="border-t my-3" style={{ borderColor: "#30363d" }} />

              {/* Action buttons */}
              <button
                className="w-full flex items-center justify-center gap-1 rounded text-[12px] font-semibold mb-2 cursor-pointer"
                style={{ background: "rgba(86,211,100,0.15)", color: "#56d364", height: 32, border: "1px solid rgba(86,211,100,0.3)" }}
              >
                ✓ Save changes
              </button>
              {canReview && (
                <>
                  <button
                    onClick={() => setShowSubmitDialog(true)}
                    className="w-full flex items-center justify-center gap-1 rounded text-[12px] font-semibold mb-2 cursor-pointer"
                    style={{ background: "rgba(127,119,221,0.15)", color: "#7f77dd", height: 32, border: "1px solid rgba(127,119,221,0.3)" }}
                  >
                    ⬡ Approve PR
                  </button>
                  <button
                    className="w-full flex items-center justify-center gap-1 rounded text-[12px] font-medium cursor-pointer"
                    style={{ background: "#21262e", color: "#8b949e", height: 32 }}
                  >
                    ⚑ Request changes
                  </button>
                </>
              )}

              {/* Links */}
              <div className="mt-3 flex flex-col gap-1">
                <Link
                  href={`/dashboard/report/${id}`}
                  className="text-[10px] text-center py-1 rounded hover:opacity-80"
                  style={{ color: "#79c0ff", background: "rgba(121,192,255,0.08)" }}
                >
                  Rapport global →
                </Link>
                <Link
                  href={`/dashboard/history/${id}`}
                  className="text-[10px] text-center py-1 rounded hover:opacity-80"
                  style={{ color: "#8b949e", background: "#21262e" }}
                >
                  Historique
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── StatusBar ────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center px-3 border-t gap-2"
        style={{ height: 24, background: "#10141a", borderColor: "#30363d" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="rounded-sm" style={{ width: 8, height: 8, background: "#56d364" }} />
          <span className="text-[10px] font-medium" style={{ color: "#56d364" }}>RAG connected</span>
        </div>
        <span style={{ color: "#6e7681" }}>|</span>
        <span className="text-[10px]" style={{ color: "#6e7681" }}>
          {selectedFileInfo?.ext === "TS" || selectedFileInfo?.ext === "TX" ? "TypeScript 5.4" :
           selectedFileInfo?.ext === "PY" ? "Python 3.11" : selectedFileInfo?.filename?.split(".").pop() ?? "Text"}
        </span>
        <span style={{ color: "#6e7681" }}>|</span>
        <span className="text-[10px]" style={{ color: "#6e7681" }}>UTF-8 LF</span>
        <span style={{ color: "#6e7681" }}>|</span>
        <span className="text-[10px]" style={{ color: "#6e7681" }}>Spaces: 2</span>
        <div className="flex-1" />
        {(errorCount > 0 || warningCount > 0) && (
          <span className="text-[10px] font-medium" style={{ color: "#e3b341" }}>
            {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? "s" : ""}` : ""}
            {errorCount > 0 && warningCount > 0 ? " · " : ""}
            {warningCount > 0 ? `${warningCount} warning${warningCount > 1 ? "s" : ""}` : ""}
          </span>
        )}
        <span style={{ color: "#6e7681" }}>|</span>
        <span className="text-[10px]" style={{ color: "#8b949e" }}>
          {analysis.prLabel ?? prBranch}
        </span>
        <span style={{ color: "#6e7681" }}>|</span>
        <span className="text-[10px]" style={{ color: "#8b949e" }}>
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
