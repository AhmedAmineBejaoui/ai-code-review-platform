"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  GitPullRequest, GitMerge, MessageSquare, FileCode2, CheckCircle2,
  XCircle, Loader2, AlertCircle, RefreshCw, Send, ChevronDown,
  ChevronRight, ExternalLink, FolderGit2, Eye, SquarePen,
  Plus, Settings, Search, User, Tag, Link2, CheckCheck,
  Clock, GitBranch, X, Circle, AlertTriangle, Check,
  ChevronUp, List, Copy, Layers,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { extractApiErrorMessage } from "@/lib/display"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

interface PullRequest {
  number: number
  title: string
  state: string
  merged_at: string | null
  user: { login: string; avatar_url: string }
  created_at: string
  updated_at: string
  head: { ref: string; sha: string; repo?: { full_name?: string } | null }
  base: { ref: string; repo?: { full_name?: string } | null }
  body: string | null
  mergeable: boolean | null
  mergeable_state: string
  html_url: string
  additions: number
  deletions: number
  changed_files: number
  draft: boolean
  labels: Array<{ name: string; color: string }>
  assignees: Array<{ login: string; avatar_url: string }>
  requested_reviewers: Array<{ login: string; avatar_url: string }>
  review_comments: number
  comments: number
}

interface PRFile {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch?: string
}

interface PRComment {
  id: number
  user: { login: string; avatar_url: string }
  body: string
  created_at: string
  path?: string
  line?: number
  start_line?: number
}

interface PRReview {
  id: number
  user: { login: string; avatar_url: string }
  state: string
  submitted_at: string
  body: string
}

interface CheckRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  html_url: string
  app?: { name?: string; slug?: string }
  details_url?: string
}

interface GithubRepo {
  full_name: string
  name: string
  owner: { login: string }
  private: boolean
  pushed_at: string
  description: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return new Date(dateStr).toLocaleDateString()
}

function parseRepoInput(value: string): { owner: string; repo: string } | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/\s?#]+?)(?:\.git)?$/i)
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2].replace(/\.git$/i, "") }
  try {
    const url = new URL(trimmed)
    if (url.hostname.replace(/^www\./, "") === "github.com") {
      const [o, r] = url.pathname.split("/").filter(Boolean)
      if (o && r) return { owner: o, repo: r.replace(/\.git$/i, "") }
    }
  } catch { /* not a URL */ }
  const parts = trimmed.replace(/^(?:www\.)?github\.com\//i, "").split("/").filter(Boolean)
  if (parts.length >= 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") }
  return null
}

function categorizePRs(prs: PullRequest[], reviews: Map<number, PRReview[]>, currentUser: string) {
  const categories = {
    needs_review: [] as PullRequest[],
    returned: [] as PullRequest[],
    approved: [] as PullRequest[],
    waiting_reviewers: [] as PullRequest[],
    drafts: [] as PullRequest[],
    merged: [] as PullRequest[],
    waiting_author: [] as PullRequest[],
  }

  for (const pr of prs) {
    if (pr.state === "closed" && pr.merged_at) {
      categories.merged.push(pr)
      continue
    }
    if (pr.draft) { categories.drafts.push(pr); continue }

    const prReviews = reviews.get(pr.number) ?? []
    const isRequestedReviewer = pr.requested_reviewers.some(r => r.login === currentUser)
    const myReview = prReviews.find(r => r.user?.login === currentUser)

    if (isRequestedReviewer && !myReview) { categories.needs_review.push(pr); continue }
    if (myReview?.state === "CHANGES_REQUESTED") { categories.returned.push(pr); continue }
    if (myReview?.state === "APPROVED") { categories.approved.push(pr); continue }
    if (pr.requested_reviewers.length > 0) { categories.waiting_reviewers.push(pr); continue }
    categories.waiting_author.push(pr)
  }

  return categories
}

// ── Check run icon ────────────────────────────────────────────────────────────

function CheckIcon({ conclusion, status }: { conclusion: string | null; status: string }) {
  if (status === "in_progress" || status === "queued") {
    return <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
  }
  if (conclusion === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  if (conclusion === "failure" || conclusion === "cancelled") return <XCircle className="h-3.5 w-3.5 text-red-400" />
  if (conclusion === "skipped") return <Circle className="h-3.5 w-3.5 text-muted-foreground" />
  return <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
}

// ── Label pill ────────────────────────────────────────────────────────────────

function LabelPill({ label }: { label: { name: string; color: string } }) {
  const hex = label.color.startsWith("#") ? label.color : `#${label.color}`
  return (
    <span
      className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `${hex}22`, color: hex, border: `1px solid ${hex}44` }}
    >
      {label.name}
    </span>
  )
}

// ── Repo Selector Modal ───────────────────────────────────────────────────────

function RepoSelectorModal({
  open,
  onClose,
  currentRepos,
  onSync,
  ghPost,
}: {
  open: boolean
  onClose: () => void
  currentRepos: string[]
  onSync: (repos: string[]) => void
  ghPost: (action: string, payload: Record<string, unknown>) => Promise<unknown>
}) {
  const [search, setSearch] = useState("")
  const [allRepos, setAllRepos] = useState<GithubRepo[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(currentRepos))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    ghPost("list_user_repos", {})
      .then((data) => {
        const repos = (data as { result?: GithubRepo[] }).result ?? []
        setAllRepos(repos)
      })
      .catch(() => setAllRepos([]))
      .finally(() => setLoading(false))
  }, [open, ghPost])

  useEffect(() => { setSelected(new Set(currentRepos)) }, [currentRepos])

  const filtered = allRepos.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )
  const selectedList = filtered.filter(r => selected.has(r.full_name))
  const suggestedList = filtered.filter(r => !selected.has(r.full_name))

  const toggle = (fullName: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(fullName)) next.delete(fullName)
      else next.add(fullName)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="p-5 border-b border-border">
          <p className="text-sm font-semibold">Select repositories to sync</p>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search repositories"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading repositories…
            </div>
          ) : (
            <>
              {selectedList.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs text-muted-foreground font-medium">Selected</p>
                  {selectedList.map(r => (
                    <button
                      key={r.full_name}
                      className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted/40 text-sm text-left"
                      onClick={() => toggle(r.full_name)}
                    >
                      <div className="h-4 w-4 rounded border border-primary bg-primary flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                      {r.full_name}
                    </button>
                  ))}
                </div>
              )}
              {suggestedList.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs text-muted-foreground font-medium">Suggested</p>
                  {suggestedList.map(r => (
                    <button
                      key={r.full_name}
                      className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted/40 text-sm text-left"
                      onClick={() => toggle(r.full_name)}
                    >
                      <div className="h-4 w-4 rounded border border-border shrink-0" />
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-border space-y-2">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(new Set())}
          >
            <X className="h-3 w-3" /> Clear all
          </button>
          <Button
            className="w-full h-9 gap-2"
            onClick={() => { onSync([...selected]); onClose() }}
          >
            Sync repositories
          </Button>
          <button className="w-full text-xs text-muted-foreground hover:text-foreground py-1" onClick={onClose}>
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── PR card (inbox list item) ────────────────────────────────────────────────

function PRCard({
  pr,
  repoFullName,
  checks,
  reviews,
  onClick,
}: {
  pr: PullRequest
  repoFullName: string
  checks: CheckRun[]
  reviews: PRReview[]
  onClick: () => void
}) {
  const failedChecks = checks.filter(c => c.conclusion === "failure" || c.conclusion === "cancelled")
  const successChecks = checks.filter(c => c.conclusion === "success")
  const pendingChecks = checks.filter(c => c.status === "in_progress" || c.status === "queued")
  const approved = reviews.some(r => r.state === "APPROVED")
  const changesRequested = reviews.some(r => r.state === "CHANGES_REQUESTED")

  const overallCheck = failedChecks.length > 0 ? "failure"
    : pendingChecks.length > 0 ? "pending"
    : successChecks.length > 0 ? "success"
    : null

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/30 border-b border-border/40 text-left transition-colors group"
    >
      {/* Avatar */}
      <img
        src={pr.user.avatar_url}
        alt={pr.user.login}
        className="h-7 w-7 rounded-full mt-0.5 shrink-0"
        onError={e => { (e.target as HTMLImageElement).src = "" }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between">
          <p className="text-sm font-medium text-foreground leading-5 truncate pr-4">{pr.title}</p>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(pr.updated_at)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {pr.user.login} · {repoFullName}·#{pr.number}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {pr.labels.map(l => <LabelPill key={l.name} label={l} />)}
        </div>
      </div>

      {/* Right meta */}
      <div className="flex items-center gap-2 shrink-0 mt-1">
        {/* CI check */}
        {overallCheck === "failure" && <XCircle className="h-3.5 w-3.5 text-red-400" />}
        {overallCheck === "pending" && <Clock className="h-3.5 w-3.5 text-amber-400" />}
        {overallCheck === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}

        {/* Review status */}
        {approved && <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />}
        {changesRequested && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}

        {/* Merge icon */}
        {pr.state === "closed" && pr.merged_at
          ? <GitMerge className="h-3.5 w-3.5 text-purple-400" />
          : pr.state === "closed"
          ? <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
          : null}

        {/* Comments */}
        {(pr.review_comments + pr.comments) > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {pr.review_comments + pr.comments}
          </span>
        )}

        {/* Changes */}
        <span className="text-xs font-mono text-muted-foreground">
          <span className="text-emerald-400">+{pr.additions}</span>
          <span className="text-red-400">-{pr.deletions}</span>
        </span>
      </div>
    </button>
  )
}

// ── AI Summary parser ─────────────────────────────────────────────────────────

function parseDescription(body: string | null): { motivation: string; description: string; testing: string } {
  if (!body) return { motivation: "", description: "", testing: "" }

  const lines = body.split("\n")
  let motivation = ""
  let description = ""
  let testing = ""
  let current: "none" | "motivation" | "description" | "testing" = "none"

  for (const line of lines) {
    const lower = line.toLowerCase().trim()
    if (lower.startsWith("## motivation") || lower === "motivation") { current = "motivation"; continue }
    if (lower.startsWith("## description") || lower === "description") { current = "description"; continue }
    if (lower.startsWith("## test") || lower === "testing") { current = "testing"; continue }
    if (lower.startsWith("## ")) { current = "none"; continue }

    if (current === "motivation") motivation += line + "\n"
    else if (current === "description") description += line + "\n"
    else if (current === "testing") testing += line + "\n"
  }

  // If no sections found, put whole body in description
  if (!motivation && !description && !testing) {
    description = body
  }

  return {
    motivation: motivation.trim(),
    description: description.trim(),
    testing: testing.trim(),
  }
}

// ── File overview table ───────────────────────────────────────────────────────

function getFileOverview(file: PRFile): string {
  if (file.status === "added") return `New file added with ${file.additions} line${file.additions !== 1 ? "s" : ""}.`
  if (file.status === "removed") return `File removed (had ${file.deletions} line${file.deletions !== 1 ? "s" : ""}).`
  if (file.changes === 0) return "File renamed or moved with no content changes."
  const net = file.additions - file.deletions
  const direction = net > 0 ? `+${net}` : `${net}`
  return `Modified: ${file.additions} additions, ${file.deletions} deletions (net ${direction}).`
}

// ── PR Detail view ────────────────────────────────────────────────────────────

function PRDetail({
  pr,
  repoFullName,
  owner,
  repo,
  files,
  comments,
  reviews,
  checks,
  loadingDetail,
  commentText,
  setCommentText,
  commenting,
  handleAddComment,
  reviewEvent,
  setReviewEvent,
  reviewBody,
  setReviewBody,
  submittingReview,
  handleSubmitReview,
  mergeDialogOpen,
  setMergeDialogOpen,
  mergeMethod,
  setMergeMethod,
  merging,
  handleMerge,
  onBack,
  openInEditor,
}: {
  pr: PullRequest
  repoFullName: string
  owner: string
  repo: string
  files: PRFile[]
  comments: { reviewComments: PRComment[]; issueComments: PRComment[] }
  reviews: PRReview[]
  checks: CheckRun[]
  loadingDetail: boolean
  commentText: string
  setCommentText: (v: string) => void
  commenting: boolean
  handleAddComment: () => void
  reviewEvent: "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
  setReviewEvent: (v: "APPROVE" | "REQUEST_CHANGES" | "COMMENT") => void
  reviewBody: string
  setReviewBody: (v: string) => void
  submittingReview: boolean
  handleSubmitReview: () => void
  mergeDialogOpen: boolean
  setMergeDialogOpen: (v: boolean) => void
  mergeMethod: "merge" | "squash" | "rebase"
  setMergeMethod: (v: "merge" | "squash" | "rebase") => void
  merging: boolean
  handleMerge: () => void
  onBack: () => void
  openInEditor: (file?: string) => void
}) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [showStack, setShowStack] = useState(true)
  const [descExpanded, setDescExpanded] = useState(true)

  const desc = parseDescription(pr.body)
  const allComments = [
    ...comments.issueComments.map(c => ({ ...c, type: "issue" as const })),
    ...comments.reviewComments.map(c => ({ ...c, type: "review" as const })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const isMerged = pr.state === "closed" && !!pr.merged_at
  const isOpen = pr.state === "open"

  const latestReviewByUser = new Map<string, PRReview>()
  for (const r of reviews) {
    if (r.user?.login) latestReviewByUser.set(r.user.login, r)
  }
  const approvers = [...latestReviewByUser.values()].filter(r => r.state === "APPROVED")
  const changers = [...latestReviewByUser.values()].filter(r => r.state === "CHANGES_REQUESTED")

  const failedChecks = checks.filter(c => c.conclusion === "failure" || c.conclusion === "cancelled")
  const successChecks = checks.filter(c => c.conclusion === "success")
  const pendingChecks = checks.filter(c => c.status === "in_progress" || c.status === "queued")

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left panel (main content) ── */}
      <div className="flex-1 overflow-y-auto">
        {/* PR header */}
        <div className="px-5 py-4 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={onBack}>
              ← Inbox
            </Button>
            <span className="text-muted-foreground text-xs">{repoFullName} #{pr.number}</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground leading-7">{pr.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <img src={pr.user.avatar_url} alt="" className="h-4 w-4 rounded-full" />
              <span>{pr.user.login}</span>
            </div>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {pr.head.ref} → {pr.base.ref}
            </span>
            <span>{pr.changed_files} file{pr.changed_files !== 1 ? "s" : ""}</span>
            <span className="text-emerald-400">+{pr.additions}</span>
            <span className="text-red-400">-{pr.deletions}</span>
            <span>Updated {timeAgo(pr.updated_at)}</span>
            <a
              href={pr.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> GitHub
            </a>
          </div>
        </div>

        <div className="p-5 space-y-4 max-w-4xl">
          {/* Stack section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              onClick={() => setShowStack(v => !v)}
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              Stack
              <span className="ml-1 text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">1 of 1</span>
              {showStack ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
            </button>
            {showStack && (
              <div className="border-t border-border px-4 py-2 bg-muted/10">
                <div className="flex items-center gap-2 text-sm py-1">
                  <div className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                  <span className="font-medium">#{pr.number} {pr.title}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {isMerged ? "Merged" : isOpen ? "Open" : "Closed"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 pl-3.5">
                  <div className="h-4 w-px bg-border" />
                  main (trunk)
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {pr.body && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
                onClick={() => setDescExpanded(v => !v)}
              >
                Description
                {descExpanded ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
              </button>
              {descExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-4">
                  {desc.motivation && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Motivation</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-6">
                        {desc.motivation.split("\n").map((line, i) =>
                          line.startsWith("- ") || line.startsWith("• ") ? (
                            <p key={i} className="flex gap-2 items-start"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />{line.slice(2)}</p>
                          ) : line.trim() ? <p key={i}>{line}</p> : null
                        )}
                      </div>
                    </div>
                  )}
                  {desc.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-6">
                        {desc.description.split("\n").map((line, i) =>
                          line.startsWith("- ") || line.startsWith("• ") ? (
                            <p key={i} className="flex gap-2 items-start"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />{line.slice(2)}</p>
                          ) : line.trim() ? <p key={i}>{line}</p> : null
                        )}
                      </div>
                    </div>
                  )}
                  {desc.testing && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Testing</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-6">
                        {desc.testing.split("\n").map((line, i) =>
                          line.startsWith("- ") || line.startsWith("• ") ? (
                            <p key={i} className="flex gap-2 items-start"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />{line.slice(2)}</p>
                          ) : line.trim() ? <p key={i}>{line}</p> : null
                        )}
                      </div>
                    </div>
                  )}
                  {!desc.motivation && !desc.description && !desc.testing && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pr.body}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File overview table */}
          {files.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <h3 className="text-sm font-semibold">Changed Files</h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground w-2/5">Filename</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Overview</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(file => (
                    <tr key={file.filename} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1 py-0 h-4",
                              file.status === "added" ? "text-emerald-400 border-emerald-400/30" :
                              file.status === "removed" ? "text-red-400 border-red-400/30" :
                              "text-amber-400 border-amber-400/30"
                            )}
                          >
                            {file.status.slice(0,1).toUpperCase()}
                          </Badge>
                          <button
                            className="font-mono text-foreground hover:text-primary text-[11px] truncate max-w-[200px] text-left"
                            onClick={() => openInEditor(file.filename)}
                            title={file.filename}
                          >
                            {file.filename}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground leading-5">
                        {getFileOverview(file)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Diff with expand/collapse */}
          {files.some(f => f.patch) && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Diff</h3>
                <span className="text-xs text-muted-foreground">{files.filter(f => f.patch).length} file{files.filter(f => f.patch).length !== 1 ? "s" : ""} with changes</span>
              </div>
              <div className="divide-y divide-border/40">
                {files.filter(f => f.patch).map(file => (
                  <div key={file.filename}>
                    <button
                      className="flex items-center w-full px-4 py-2.5 text-left text-sm hover:bg-muted/30 gap-2"
                      onClick={() => setExpandedFiles(prev => {
                        const next = new Set(prev)
                        if (next.has(file.filename)) next.delete(file.filename)
                        else next.add(file.filename)
                        return next
                      })}
                    >
                      {expandedFiles.has(file.filename) ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <span className="font-mono text-xs truncate">{file.filename}</span>
                      <span className="ml-auto flex items-center gap-1.5 text-xs shrink-0">
                        <span className="text-emerald-400">+{file.additions}</span>
                        <span className="text-red-400">-{file.deletions}</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={e => { e.stopPropagation(); openInEditor(file.filename) }}>
                          <SquarePen className="h-3 w-3 mr-1" />Edit
                        </Button>
                      </span>
                    </button>
                    {expandedFiles.has(file.filename) && file.patch && (
                      <div className="border-t border-border/40 bg-muted/10 overflow-x-auto">
                        <pre className="text-xs font-mono p-3 leading-5">
                          {file.patch.split("\n").map((line, i) => (
                            <div key={i} className={cn(
                              line.startsWith("+") ? "bg-emerald-500/8 text-emerald-400" :
                              line.startsWith("-") ? "bg-red-500/8 text-red-400" :
                              line.startsWith("@@") ? "text-teal-400" : "text-muted-foreground"
                            )}>
                              {line}
                            </div>
                          ))}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {allComments.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments Outside Diff ({allComments.length})
                </h3>
              </div>
              <div className="divide-y divide-border/40">
                {allComments.map(comment => (
                  <div key={`${comment.type}-${comment.id}`} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <img src={comment.user.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                      <span className="text-sm font-medium">{comment.user.login}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                      {comment.type === "review" && comment.path && (
                        <Badge variant="outline" className="text-[10px]">{comment.path}{comment.line ? `:${comment.line}` : ""}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add comment */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Add Comment</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Leave a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                disabled={commenting}
              />
              <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim() || commenting} className="gap-1">
                {commenting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Review actions */}
          {isOpen && (
            <div className="border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Submit Review
              </h3>
              <textarea
                className="w-full border border-border rounded p-2 text-sm min-h-[80px] bg-background resize-y"
                placeholder="Review body (optional)"
                value={reviewBody}
                onChange={e => setReviewBody(e.target.value)}
                disabled={submittingReview}
              />
              <div className="flex items-center gap-2 mt-2">
                <Select value={reviewEvent} onValueChange={v => setReviewEvent(v as typeof reviewEvent)}>
                  <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMMENT">Comment</SelectItem>
                    <SelectItem value="APPROVE">✅ Approve</SelectItem>
                    <SelectItem value="REQUEST_CHANGES">❌ Request Changes</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleSubmitReview} disabled={submittingReview} className="gap-1">
                  {submittingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Submit Review
                </Button>
                <div className="ml-auto">
                  <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700" onClick={() => setMergeDialogOpen(true)}>
                    <GitMerge className="h-3.5 w-3.5" /> Merge
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-64 shrink-0 border-l border-border overflow-y-auto bg-background">
        {/* Status */}
        <div className="p-4 border-b border-border">
          {isMerged ? (
            <div className="flex items-center gap-2 text-purple-400">
              <GitMerge className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Merged</p>
                <p className="text-[11px] text-muted-foreground">Successfully merged</p>
              </div>
            </div>
          ) : isOpen ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <GitPullRequest className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Open</p>
                <p className="text-[11px] text-muted-foreground">{pr.draft ? "Draft" : "Ready for review"}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Closed</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Review */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-5 w-5 rounded bg-purple-500/20 flex items-center justify-center">
                <Eye className="h-3 w-3 text-purple-400" />
              </div>
              <span className="font-medium text-foreground">Review with AI</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openInEditor()}>
              Review
            </Button>
          </div>
        </div>

        {/* Checks */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-foreground">Checks</p>
            <a href={pr.html_url + "/checks"} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              View all <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          {checks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No checks</p>
          ) : (
            <div className="space-y-1.5">
              {checks.slice(0, 6).map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <CheckIcon conclusion={c.conclusion} status={c.status} />
                  <a
                    href={c.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground truncate flex-1"
                    title={c.name}
                  >
                    {c.app?.name ?? c.name}
                  </a>
                  {(c.conclusion === "failure" || c.conclusion === "cancelled") && (
                    <span className="text-[9px] text-red-400 bg-red-400/10 rounded px-1">✕</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviewers */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-foreground">Reviewers</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          {pr.requested_reviewers.length === 0 && approvers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reviewers</p>
          ) : (
            <div className="space-y-1.5">
              {pr.requested_reviewers.map(r => (
                <div key={r.login} className="flex items-center gap-2">
                  <img src={r.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                  <span className="text-xs text-foreground">{r.login}</span>
                  <Clock className="h-3 w-3 text-muted-foreground ml-auto" />
                </div>
              ))}
              {approvers.map(r => (
                <div key={r.user.login} className="flex items-center gap-2">
                  <img src={r.user.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                  <span className="text-xs text-foreground">{r.user.login}</span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-auto" />
                </div>
              ))}
              {changers.map(r => (
                <div key={r.user.login} className="flex items-center gap-2">
                  <img src={r.user.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                  <span className="text-xs text-foreground">{r.user.login}</span>
                  <AlertTriangle className="h-3 w-3 text-amber-400 ml-auto" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labels */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-foreground">Labels</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          {pr.labels.length === 0 ? (
            <p className="text-xs text-muted-foreground">No labels</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {pr.labels.map(l => <LabelPill key={l.name} label={l} />)}
            </div>
          )}
        </div>

        {/* Assignees */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-foreground">Assignees</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          {pr.assignees.length === 0 ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              No assignees · <button className="text-primary hover:underline">Assign yourself</button>
            </p>
          ) : (
            <div className="space-y-1.5">
              {pr.assignees.map(a => (
                <div key={a.login} className="flex items-center gap-2">
                  <img src={a.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                  <span className="text-xs">{a.login}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related tasks */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-foreground">Related tasks</p>
          </div>
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Link2 className="h-3 w-3" /> Connect task tracker
          </button>
        </div>
      </div>

      {/* Merge dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Pull Request</DialogTitle>
            <DialogDescription>Merge #{pr.number}: {pr.title}</DialogDescription>
          </DialogHeader>
          <Select value={mergeMethod} onValueChange={v => setMergeMethod(v as typeof mergeMethod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="squash">Squash and merge</SelectItem>
              <SelectItem value="merge">Create a merge commit</SelectItem>
              <SelectItem value="rebase">Rebase and merge</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
            <Button className="gap-1 bg-purple-600 hover:bg-purple-700" onClick={handleMerge} disabled={merging}>
              {merging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Category sidebar items ────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "needs_review", label: "Needs your review" },
  { id: "returned", label: "Returned to you" },
  { id: "approved", label: "Approved" },
  { id: "waiting_reviewers", label: "Waiting for reviewers" },
  { id: "drafts", label: "Drafts" },
  { id: "merged", label: "Merging and recently merged" },
  { id: "waiting_author", label: "Waiting for author" },
] as const

type CategoryId = typeof CATEGORIES[number]["id"]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PullRequestsPage() {
  const router = useRouter()

  // Repos
  const [trackedRepos, setTrackedRepos] = useState<Array<{ owner: string; repo: string }>>([])
  const [repoSyncOpen, setRepoSyncOpen] = useState(false)

  // PR data
  const [allPRs, setAllPRs] = useState<Map<string, PullRequest[]>>(new Map())
  const [allChecks, setAllChecks] = useState<Map<number, CheckRun[]>>(new Map())
  const [allReviews, setAllReviews] = useState<Map<number, PRReview[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Selected category and PR
  const [activeCategory, setActiveCategory] = useState<CategoryId>("merged")
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null)

  // PR detail state
  const [prFiles, setPrFiles] = useState<PRFile[]>([])
  const [prComments, setPrComments] = useState<{ reviewComments: PRComment[]; issueComments: PRComment[] }>({ reviewComments: [], issueComments: [] })
  const [prChecks, setPrChecks] = useState<CheckRun[]>([])
  const [prReviews, setPrReviews] = useState<PRReview[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commenting, setCommenting] = useState(false)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("squash")
  const [merging, setMerging] = useState(false)
  const [reviewEvent, setReviewEvent] = useState<"APPROVE" | "REQUEST_CHANGES" | "COMMENT">("COMMENT")
  const [reviewBody, setReviewBody] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  const ghPost = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const res = await fetch("/api/dashboard/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(extractApiErrorMessage(data, `Action ${action} failed`))
    return data
  }, [])

  const loadAllPRs = useCallback(async (repos: Array<{ owner: string; repo: string }>) => {
    if (!repos.length) return
    setLoading(true)
    setError("")
    try {
      const prMap = new Map<string, PullRequest[]>()
      const checksMap = new Map<number, CheckRun[]>()
      const reviewsMap = new Map<number, PRReview[]>()

      await Promise.all(repos.map(async ({ owner, repo }) => {
        try {
          const [openData, closedData] = await Promise.all([
            ghPost("list_prs", { owner, repo, state: "open" }),
            ghPost("list_prs", { owner, repo, state: "closed" }),
          ])
          const openPRs = (Array.isArray(openData.result) ? openData.result : []) as PullRequest[]
          const closedPRs = (Array.isArray(closedData.result) ? closedData.result : []) as PullRequest[]
          const allForRepo = [...openPRs, ...closedPRs.slice(0, 20)]
          prMap.set(`${owner}/${repo}`, allForRepo)

          // Fetch checks & reviews for first 10 PRs
          await Promise.all(allForRepo.slice(0, 10).map(async pr => {
            try {
              const [checksData, reviewsData] = await Promise.all([
                ghPost("get_pr_checks", { owner, repo, ref: pr.head.sha }).catch(() => ({ checkRuns: [] })),
                ghPost("get_pr_reviews", { owner, repo, pullNumber: pr.number }).catch(() => ({ result: [] })),
              ])
              checksMap.set(pr.number, (checksData as { checkRuns?: CheckRun[] }).checkRuns ?? [])
              reviewsMap.set(pr.number, (reviewsData as { result?: PRReview[] }).result ?? [])
            } catch { /* skip */ }
          }))
        } catch { /* skip failed repos */ }
      }))

      setAllPRs(prMap)
      setAllChecks(checksMap)
      setAllReviews(reviewsMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pull requests")
    } finally {
      setLoading(false)
    }
  }, [ghPost])

  useEffect(() => {
    if (trackedRepos.length > 0) void loadAllPRs(trackedRepos)
  }, [trackedRepos, loadAllPRs])

  const handleSelectPR = useCallback(async (pr: PullRequest, owner: string, repo: string) => {
    setSelectedPR(pr)
    setSelectedRepo({ owner, repo })
    setDetailLoading(true)
    try {
      const [filesData, commentsData, checksData, reviewsData] = await Promise.all([
        ghPost("get_pr_files", { owner, repo, pullNumber: pr.number }),
        ghPost("list_pr_comments", { owner, repo, pullNumber: pr.number }),
        ghPost("get_pr_checks", { owner, repo, ref: pr.head.sha }).catch(() => ({ checkRuns: [] })),
        ghPost("get_pr_reviews", { owner, repo, pullNumber: pr.number }).catch(() => ({ result: [] })),
      ])
      setPrFiles(Array.isArray(filesData.result) ? filesData.result : [])
      setPrComments({
        reviewComments: Array.isArray(commentsData.reviewComments) ? commentsData.reviewComments : [],
        issueComments: Array.isArray(commentsData.issueComments) ? commentsData.issueComments : [],
      })
      setPrChecks((checksData as { checkRuns?: CheckRun[] }).checkRuns ?? [])
      setPrReviews((reviewsData as { result?: PRReview[] }).result ?? [])
    } catch (err) {
      console.error("Failed to load PR detail:", err)
    } finally {
      setDetailLoading(false)
    }
  }, [ghPost])

  const handleAddComment = useCallback(async () => {
    if (!selectedPR || !selectedRepo || !commentText.trim()) return
    setCommenting(true)
    try {
      await ghPost("add_comment", { owner: selectedRepo.owner, repo: selectedRepo.repo, issueNumber: selectedPR.number, body: commentText.trim() })
      setCommentText("")
      const commentsData = await ghPost("list_pr_comments", { owner: selectedRepo.owner, repo: selectedRepo.repo, pullNumber: selectedPR.number })
      setPrComments({
        reviewComments: Array.isArray(commentsData.reviewComments) ? commentsData.reviewComments : [],
        issueComments: Array.isArray(commentsData.issueComments) ? commentsData.issueComments : [],
      })
    } catch (err) { console.error(err) }
    finally { setCommenting(false) }
  }, [selectedPR, selectedRepo, commentText, ghPost])

  const handleSubmitReview = useCallback(async () => {
    if (!selectedPR || !selectedRepo) return
    setSubmittingReview(true)
    try {
      await ghPost("submit_pr_review", { owner: selectedRepo.owner, repo: selectedRepo.repo, pullNumber: selectedPR.number, event: reviewEvent, body: reviewBody.trim() || undefined })
      setReviewBody("")
      const [prData, reviewsData] = await Promise.all([
        ghPost("get_pr", { owner: selectedRepo.owner, repo: selectedRepo.repo, pullNumber: selectedPR.number }),
        ghPost("get_pr_reviews", { owner: selectedRepo.owner, repo: selectedRepo.repo, pullNumber: selectedPR.number }).catch(() => ({ result: [] })),
      ])
      setSelectedPR(prData.result)
      setPrReviews((reviewsData as { result?: PRReview[] }).result ?? [])
    } catch (err) { console.error(err) }
    finally { setSubmittingReview(false) }
  }, [selectedPR, selectedRepo, reviewEvent, reviewBody, ghPost])

  const handleMerge = useCallback(async () => {
    if (!selectedPR || !selectedRepo) return
    setMerging(true)
    try {
      await ghPost("merge_pr", { owner: selectedRepo.owner, repo: selectedRepo.repo, pullNumber: selectedPR.number, mergeMethod })
      setMergeDialogOpen(false)
      const prData = await ghPost("get_pr", { owner: selectedRepo.owner, repo: selectedRepo.repo, pullNumber: selectedPR.number })
      setSelectedPR(prData.result)
    } catch (err) { console.error(err) }
    finally { setMerging(false) }
  }, [selectedPR, selectedRepo, mergeMethod, ghPost])

  const openInEditor = useCallback((filePath?: string) => {
    if (!selectedPR || !selectedRepo) return
    const params = new URLSearchParams({ repo: `${selectedRepo.owner}/${selectedRepo.repo}`, branch: selectedPR.head.ref })
    if (filePath) params.set("file", filePath)
    router.push(`/dashboard/editor?${params.toString()}`)
  }, [selectedPR, selectedRepo, router])

  // Flatten all PRs
  const flatPRs = [...allPRs.entries()].flatMap(([repoKey, prs]) =>
    prs.map(pr => ({ pr, repoKey }))
  )

  // Categorize
  const categories = categorizePRs(
    flatPRs.map(x => x.pr),
    allReviews,
    ""
  )

  const activePRs = flatPRs.filter(({ pr }) => {
    const list = categories[activeCategory] as PullRequest[]
    return list.some(p => p.number === pr.number)
  })

  const counts: Record<CategoryId, number> = {
    needs_review: categories.needs_review.length,
    returned: categories.returned.length,
    approved: categories.approved.length,
    waiting_reviewers: categories.waiting_reviewers.length,
    drafts: categories.drafts.length,
    merged: categories.merged.length,
    waiting_author: categories.waiting_author.length,
  }

  // ── No repos selected ─────────────────────────────────────────────────────
  if (!trackedRepos.length) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h1 className="text-lg font-semibold">Inbox</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mx-auto">
              <GitPullRequest className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Set up your inbox</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select repositories to track pull requests across your work.
              </p>
            </div>
            <Button onClick={() => setRepoSyncOpen(true)} className="gap-2">
              <FolderGit2 className="h-4 w-4" />
              Select repositories
            </Button>
          </div>
        </div>
        <RepoSelectorModal
          open={repoSyncOpen}
          onClose={() => setRepoSyncOpen(false)}
          currentRepos={trackedRepos.map(r => `${r.owner}/${r.repo}`)}
          onSync={(repos) => setTrackedRepos(repos.map(r => {
            const [o, re] = r.split("/")
            return { owner: o, repo: re }
          }))}
          ghPost={ghPost}
        />
      </div>
    )
  }

  // ── PR Detail ─────────────────────────────────────────────────────────────
  if (selectedPR && selectedRepo) {
    return (
      <PRDetail
        pr={selectedPR}
        repoFullName={`${selectedRepo.owner}/${selectedRepo.repo}`}
        owner={selectedRepo.owner}
        repo={selectedRepo.repo}
        files={prFiles}
        comments={prComments}
        reviews={prReviews}
        checks={prChecks}
        loadingDetail={detailLoading}
        commentText={commentText}
        setCommentText={setCommentText}
        commenting={commenting}
        handleAddComment={handleAddComment}
        reviewEvent={reviewEvent}
        setReviewEvent={setReviewEvent}
        reviewBody={reviewBody}
        setReviewBody={setReviewBody}
        submittingReview={submittingReview}
        handleSubmitReview={handleSubmitReview}
        mergeDialogOpen={mergeDialogOpen}
        setMergeDialogOpen={setMergeDialogOpen}
        mergeMethod={mergeMethod}
        setMergeMethod={setMergeMethod}
        merging={merging}
        handleMerge={handleMerge}
        onBack={() => { setSelectedPR(null); setSelectedRepo(null) }}
        openInEditor={openInEditor}
      />
    )
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Left category sidebar ── */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="text-base font-semibold">Inbox</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => loadAllPRs(trackedRepos)} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRepoSyncOpen(true)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 py-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center justify-between w-full px-4 py-2 text-sm transition-colors rounded-none",
                activeCategory === cat.id
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <span>{cat.label}</span>
              {counts[cat.id] > 0 && (
                <span className={cn(
                  "text-xs rounded-full px-1.5 min-w-[18px] text-center",
                  activeCategory === cat.id ? "bg-foreground/10 text-foreground" : "text-muted-foreground"
                )}>
                  {counts[cat.id]}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-border">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" /> Add section
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {CATEGORIES.find(c => c.id === activeCategory)?.label}
              {counts[activeCategory] > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">{counts[activeCategory]}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setRepoSyncOpen(true)}>
              <FolderGit2 className="h-3.5 w-3.5" />
              {trackedRepos.length} repo{trackedRepos.length !== 1 ? "s" : ""} selected
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="m-4 flex items-center gap-2 rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading pull requests…
          </div>
        ) : activePRs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No pull requests in this category</p>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            {/* Group by section header */}
            <div className="px-4 py-2 border-b border-border/40 bg-muted/10">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {CATEGORIES.find(c => c.id === activeCategory)?.label} &nbsp;{counts[activeCategory]}
              </p>
            </div>
            {activePRs.map(({ pr, repoKey }) => {
              const [o, r] = repoKey.split("/")
              return (
                <PRCard
                  key={`${repoKey}-${pr.number}`}
                  pr={pr}
                  repoFullName={repoKey}
                  checks={allChecks.get(pr.number) ?? []}
                  reviews={allReviews.get(pr.number) ?? []}
                  onClick={() => handleSelectPR(pr, o, r)}
                />
              )
            })}
          </div>
        )}
      </div>

      <RepoSelectorModal
        open={repoSyncOpen}
        onClose={() => setRepoSyncOpen(false)}
        currentRepos={trackedRepos.map(r => `${r.owner}/${r.repo}`)}
        onSync={(repos) => {
          const parsed = repos.map(r => {
            const [o, re] = r.split("/")
            return { owner: o, repo: re }
          }).filter(r => r.owner && r.repo)
          setTrackedRepos(parsed)
        }}
        ghPost={ghPost}
      />
    </div>
  )
}
