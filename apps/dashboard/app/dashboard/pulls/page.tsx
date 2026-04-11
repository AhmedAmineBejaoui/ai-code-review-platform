"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  GitPullRequest,
  GitMerge,
  MessageSquare,
  FileCode2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderGit2,
  Eye,
  SquarePen,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ── Types ───────────────────────────────────────────────────────────────────

interface PullRequest {
  number: number
  title: string
  state: string
  user: { login: string; avatar_url: string }
  created_at: string
  updated_at: string
  head: { ref: string; sha: string }
  base: { ref: string }
  body: string | null
  mergeable: boolean | null
  mergeable_state: string
  html_url: string
  additions: number
  deletions: number
  changed_files: number
  draft: boolean
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PullRequestsPage() {
  const router = useRouter()

  // Repo
  const [repoInput, setRepoInput] = useState("")
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")

  // PR list
  const [prs, setPrs] = useState<PullRequest[]>([])
  const [prFilter, setPrFilter] = useState<"open" | "closed" | "all">("open")
  const [prsLoading, setPrsLoading] = useState(false)
  const [prsError, setPrsError] = useState("")

  // Selected PR detail
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null)
  const [prFiles, setPrFiles] = useState<PRFile[]>([])
  const [prComments, setPrComments] = useState<{
    reviewComments: PRComment[]
    issueComments: PRComment[]
  }>({ reviewComments: [], issueComments: [] })
  const [detailLoading, setDetailLoading] = useState(false)

  // Actions
  const [commentText, setCommentText] = useState("")
  const [commenting, setCommenting] = useState(false)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">(
    "squash",
  )
  const [merging, setMerging] = useState(false)

  // Expanded files in diff view
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  // Review
  const [reviewEvent, setReviewEvent] = useState<
    "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
  >("COMMENT")
  const [reviewBody, setReviewBody] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  // ── GitHub API helper ─────────────────────────────────────────────────

  const ghPost = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const res = await fetch("/api/dashboard/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Action ${action} failed`)
      return data
    },
    [],
  )

  // ── Load PRs ──────────────────────────────────────────────────────────

  const loadPRs = useCallback(
    async (o: string, r: string, state: string) => {
      setPrsLoading(true)
      setPrsError("")
      try {
        const data = await ghPost("list_prs", { owner: o, repo: r, state })
        setPrs(Array.isArray(data.result) ? data.result : [])
      } catch (err) {
        setPrsError(err instanceof Error ? err.message : "Failed to load PRs")
        setPrs([])
      } finally {
        setPrsLoading(false)
      }
    },
    [ghPost],
  )

  // ── Load PR detail ────────────────────────────────────────────────────

  const loadPRDetail = useCallback(
    async (o: string, r: string, pullNumber: number) => {
      setDetailLoading(true)
      try {
        const [prData, filesData, commentsData] = await Promise.all([
          ghPost("get_pr", { owner: o, repo: r, pullNumber }),
          ghPost("get_pr_files", { owner: o, repo: r, pullNumber }),
          ghPost("list_pr_comments", { owner: o, repo: r, pullNumber }),
        ])
        setSelectedPR(prData.result)
        setPrFiles(Array.isArray(filesData.result) ? filesData.result : [])
        setPrComments({
          reviewComments: Array.isArray(commentsData.reviewComments)
            ? commentsData.reviewComments
            : [],
          issueComments: Array.isArray(commentsData.issueComments)
            ? commentsData.issueComments
            : [],
        })
        setExpandedFiles(new Set())
      } catch (err) {
        console.error("Failed to load PR detail:", err)
      } finally {
        setDetailLoading(false)
      }
    },
    [ghPost],
  )

  // ── Connect to repo ─────────────────────────────────────────────────

  const handleConnect = useCallback(() => {
    const parts = repoInput.trim().split("/")
    if (parts.length !== 2 || !parts[0] || !parts[1]) return
    setOwner(parts[0])
    setRepo(parts[1])
    setSelectedPR(null)
  }, [repoInput])

  // Load PRs on repo/filter change
  useEffect(() => {
    if (owner && repo) {
      loadPRs(owner, repo, prFilter)
    }
  }, [owner, repo, prFilter, loadPRs])

  // ── Add comment ───────────────────────────────────────────────────────

  const handleAddComment = useCallback(async () => {
    if (!selectedPR || !commentText.trim()) return
    setCommenting(true)
    try {
      await ghPost("add_comment", {
        owner,
        repo,
        issueNumber: selectedPR.number,
        body: commentText.trim(),
      })
      setCommentText("")
      // Reload comments
      const commentsData = await ghPost("list_pr_comments", {
        owner,
        repo,
        pullNumber: selectedPR.number,
      })
      setPrComments({
        reviewComments: Array.isArray(commentsData.reviewComments)
          ? commentsData.reviewComments
          : [],
        issueComments: Array.isArray(commentsData.issueComments)
          ? commentsData.issueComments
          : [],
      })
    } catch (err) {
      console.error("Failed to add comment:", err)
    } finally {
      setCommenting(false)
    }
  }, [selectedPR, commentText, owner, repo, ghPost])

  // ── Submit review ─────────────────────────────────────────────────────

  const handleSubmitReview = useCallback(async () => {
    if (!selectedPR) return
    setSubmittingReview(true)
    try {
      await ghPost("submit_pr_review", {
        owner,
        repo,
        pullNumber: selectedPR.number,
        event: reviewEvent,
        body: reviewBody.trim() || undefined,
      })
      setReviewBody("")
      // Reload PR to get updated state
      await loadPRDetail(owner, repo, selectedPR.number)
    } catch (err) {
      console.error("Failed to submit review:", err)
    } finally {
      setSubmittingReview(false)
    }
  }, [selectedPR, owner, repo, reviewEvent, reviewBody, ghPost, loadPRDetail])

  // ── Merge PR ──────────────────────────────────────────────────────────

  const handleMerge = useCallback(async () => {
    if (!selectedPR) return
    setMerging(true)
    try {
      await ghPost("merge_pr", {
        owner,
        repo,
        pullNumber: selectedPR.number,
        mergeMethod,
      })
      setMergeDialogOpen(false)
      // Reload PR and list
      await Promise.all([
        loadPRDetail(owner, repo, selectedPR.number),
        loadPRs(owner, repo, prFilter),
      ])
    } catch (err) {
      console.error("Failed to merge PR:", err)
    } finally {
      setMerging(false)
    }
  }, [selectedPR, owner, repo, mergeMethod, ghPost, loadPRDetail, loadPRs, prFilter])

  // ── Toggle file expansion ─────────────────────────────────────────────

  const toggleFile = useCallback((filename: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }, [])

  const openInEditor = useCallback(
    (filePath?: string) => {
      if (!selectedPR) return
      const params = new URLSearchParams({
        repo: `${owner}/${repo}`,
        branch: selectedPR.head.ref,
      })
      if (filePath) {
        params.set("file", filePath)
      }
      router.push(`/dashboard/editor?${params.toString()}`)
    },
    [owner, repo, router, selectedPR],
  )

  // ── No repo selected ─────────────────────────────────────────────────

  if (!owner || !repo) {
    return (
      <div className="flex items-center justify-center h-full min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <GitPullRequest className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-lg font-semibold">Pull Requests</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter a GitHub repository to view pull requests
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="owner/repo"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className="flex-1"
              />
              <Button
                onClick={handleConnect}
                disabled={!repoInput.includes("/")}
              >
                Open
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── PR Detail View ────────────────────────────────────────────────────

  if (selectedPR) {
    const allComments = [
      ...prComments.issueComments.map((c) => ({ ...c, type: "issue" as const })),
      ...prComments.reviewComments.map((c) => ({
        ...c,
        type: "review" as const,
      })),
    ].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* PR header */}
        <div className="px-4 py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedPR(null)}
            >
              ← Back
            </Button>
            <Badge
              variant={selectedPR.state === "open" ? "default" : "secondary"}
              className="gap-1"
            >
              {selectedPR.state === "open" ? (
                <GitPullRequest className="h-3 w-3" />
              ) : selectedPR.state === "closed" ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <GitMerge className="h-3 w-3" />
              )}
              {selectedPR.state}
            </Badge>
            {selectedPR.draft && (
              <Badge variant="outline" className="text-xs">
                Draft
              </Badge>
            )}
          </div>
          <h2 className="text-lg font-semibold">
            {selectedPR.title}{" "}
            <span className="text-muted-foreground font-normal">
              #{selectedPR.number}
            </span>
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>
              {selectedPR.head.ref} → {selectedPR.base.ref}
            </span>
            <span>by {selectedPR.user.login}</span>
            <span>{timeAgo(selectedPR.created_at)}</span>
            <a
              href={selectedPR.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> GitHub
            </a>
          </div>
        </div>

        {/* PR content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 space-y-4">
            {/* PR description */}
            {selectedPR.body && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedPR.body}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="flex gap-3">
              <Badge variant="outline" className="gap-1">
                <FileCode2 className="h-3 w-3" />
                {selectedPR.changed_files ?? prFiles.length} files
              </Badge>
              <Badge
                variant="outline"
                className="gap-1 text-green-600 border-green-200"
              >
                +{selectedPR.additions ?? 0}
              </Badge>
              <Badge
                variant="outline"
                className="gap-1 text-red-600 border-red-200"
              >
                -{selectedPR.deletions ?? 0}
              </Badge>
            </div>

            {selectedPR.state === "open" && (
              <Card>
                <CardContent className="pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Real correction flow
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Open the PR head branch in the editor to change the real file,
                      create a real commit, and push the fix directly to GitHub.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => openInEditor()}
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                    Open Branch in Editor
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Changed files with diffs */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Changed Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : prFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No changed files
                  </p>
                ) : (
                  prFiles.map((file) => (
                    <div key={file.filename} className="border rounded">
                      <button
                        className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                        onClick={() => toggleFile(file.filename)}
                      >
                        {expandedFiles.has(file.filename) ? (
                          <ChevronDown className="h-3.5 w-3.5 mr-2 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mr-2 shrink-0" />
                        )}
                        <Badge
                          variant="outline"
                          className={`mr-2 text-[10px] ${
                            file.status === "added"
                              ? "text-green-600 border-green-200"
                              : file.status === "removed"
                                ? "text-red-600 border-red-200"
                                : "text-yellow-600 border-yellow-200"
                          }`}
                        >
                          {file.status}
                        </Badge>
                        <span className="font-mono text-xs truncate flex-1">
                          {file.filename}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          <span className="text-green-600">+{file.additions}</span>{" "}
                          <span className="text-red-600">-{file.deletions}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-7 px-2 text-xs"
                          onClick={(event) => {
                            event.stopPropagation()
                            openInEditor(file.filename)
                          }}
                        >
                          <SquarePen className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </button>
                      {expandedFiles.has(file.filename) && file.patch && (
                        <div className="border-t bg-muted/20 overflow-x-auto">
                          <pre className="text-xs font-mono p-3 leading-5">
                            {file.patch.split("\n").map((line, i) => (
                              <div
                                key={i}
                                className={`${
                                  line.startsWith("+")
                                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                    : line.startsWith("-")
                                      ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                      : line.startsWith("@@")
                                        ? "text-blue-600 dark:text-blue-400"
                                        : ""
                                }`}
                              >
                                {line}
                              </div>
                            ))}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({allComments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allComments.map((comment) => (
                  <div
                    key={`${comment.type}-${comment.id}`}
                    className="border rounded p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {comment.user.login}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(comment.created_at)}
                      </span>
                      {comment.type === "review" && comment.path && (
                        <Badge variant="outline" className="text-[10px]">
                          {comment.path}
                          {comment.line ? `:${comment.line}` : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))}

                {/* Add comment */}
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleAddComment()
                    }
                    className="flex-1"
                    disabled={commenting}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || commenting}
                    className="gap-1"
                  >
                    {commenting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Review actions */}
            {selectedPR.state === "open" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Submit Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    className="w-full border rounded p-2 text-sm min-h-[80px] bg-background resize-y"
                    placeholder="Review body (optional)"
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    disabled={submittingReview}
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      value={reviewEvent}
                      onValueChange={(v) =>
                        setReviewEvent(
                          v as "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
                        )
                      }
                    >
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMMENT">Comment</SelectItem>
                        <SelectItem value="APPROVE">
                          ✅ Approve
                        </SelectItem>
                        <SelectItem value="REQUEST_CHANGES">
                          ❌ Request Changes
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="gap-1"
                    >
                      {submittingReview ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Submit Review
                    </Button>

                    <div className="ml-auto">
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700"
                        onClick={() => setMergeDialogOpen(true)}
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                        Merge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Merge dialog */}
        <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge Pull Request</DialogTitle>
              <DialogDescription>
                Merge #{selectedPR.number}: {selectedPR.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Select
                value={mergeMethod}
                onValueChange={(v) =>
                  setMergeMethod(v as "merge" | "squash" | "rebase")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="squash">Squash and merge</SelectItem>
                  <SelectItem value="merge">Create a merge commit</SelectItem>
                  <SelectItem value="rebase">Rebase and merge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMergeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="gap-1 bg-green-600 hover:bg-green-700"
                onClick={handleMerge}
                disabled={merging}
              >
                {merging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GitMerge className="h-3.5 w-3.5" />
                )}
                Confirm Merge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ── PR List View ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 text-sm font-mono">
            <FolderGit2 className="h-3.5 w-3.5" />
            {owner}/{repo}
          </Badge>

          <Select
            value={prFilter}
            onValueChange={(v) => setPrFilter(v as "open" | "closed" | "all")}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => loadPRs(owner, repo, prFilter)}
            disabled={prsLoading}
          >
            {prsLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>

          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setOwner("")
                setRepo("")
                setPrs([])
              }}
            >
              Change Repo
            </Button>
          </div>
        </div>
      </div>

      {/* PR list */}
      <div className="flex-1 overflow-y-auto">
        {prsError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-sm text-destructive">{prsError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1"
                onClick={() => loadPRs(owner, repo, prFilter)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          </div>
        ) : prsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading pull requests...
          </div>
        ) : prs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <GitPullRequest className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No {prFilter} pull requests</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {prs.map((pr) => (
              <button
                key={pr.number}
                className="flex items-start gap-3 w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                onClick={() => loadPRDetail(owner, repo, pr.number)}
              >
                <div className="mt-0.5">
                  {pr.state === "open" ? (
                    <GitPullRequest className="h-5 w-5 text-green-600" />
                  ) : pr.state === "closed" ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <GitMerge className="h-5 w-5 text-purple-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {pr.title}
                    </span>
                    {pr.draft && (
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0"
                      >
                        Draft
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>#{pr.number}</span>
                    <span>by {pr.user.login}</span>
                    <span>{timeAgo(pr.created_at)}</span>
                    <span className="font-mono text-[10px]">
                      {pr.head.ref} → {pr.base.ref}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
