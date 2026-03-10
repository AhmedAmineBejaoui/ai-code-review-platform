import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { extractRoleFromClaims, normalizeRole, type AppRole } from "@/lib/roles"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

type BackendFinding = {
  id?: string
  source?: string
  file_path?: string | null
  line_start?: number | null
  line_end?: number | null
  severity?: string
  category?: string
  message?: string
  suggestion?: string | null
  rule_id?: string | null
}

type BackendHunkLine = {
  line_type?: "context" | "add" | "remove"
  content?: string
  old_line_no?: number | null
  new_line_no?: number | null
}

type BackendHunk = {
  id?: string
  old_start?: number
  old_lines?: number
  new_start?: number
  new_lines?: number
  header?: string | null
  lines?: BackendHunkLine[]
}

type BackendFile = {
  id?: string
  path_old?: string | null
  path_new?: string
  change_type?: "added" | "modified" | "deleted" | "renamed"
  is_binary?: boolean
  additions_count?: number
  deletions_count?: number
  hunks?: BackendHunk[]
}

type BackendAnalysisDetails = {
  analysis_id?: string
  repo?: string
  source?: string
  pr_number?: number | null
  commit_sha?: string | null
  diff_redacted?: string | null
  status?: string
  summary?: string | null
  created_at?: string
  updated_at?: string
  metadata?: Record<string, unknown>
  findings?: BackendFinding[]
  files_changed?: BackendFile[]
}

type DashboardFinding = {
  id: string
  source: string
  filePath: string
  lineStart: number | null
  lineEnd: number | null
  severity: string
  category: string
  message: string
  suggestion: string | null
  ruleId: string | null
}

type DashboardDiffLine = {
  lineType: "context" | "add" | "remove" | "header"
  content: string
  oldLineNo: number | null
  newLineNo: number | null
}

type DashboardDiffFile = {
  id: string
  pathOld: string | null
  pathNew: string
  changeType: "added" | "modified" | "deleted" | "renamed"
  isBinary: boolean
  additionsCount: number
  deletionsCount: number
  lines: DashboardDiffLine[]
}

type DashboardReviewDecision = {
  value: "APPROVE" | "WARN" | "BLOCK"
  comment: string | null
  decidedAt: string | null
  decidedBy: string | null
}

type DashboardAnalysisDetails = {
  id: string
  repo: string
  source: string
  prNumber: number | null
  prLabel: string
  commitSha: string | null
  diffText: string
  author: string
  status: string
  summary: string
  createdAt: string
  updatedAt: string
  reviewDecision: DashboardReviewDecision | null
  findings: DashboardFinding[]
  files: DashboardDiffFile[]
}

function normalizeOptionalObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function extractAuthorLabel(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) {
    return null
  }
  const candidates = [
    metadata.author_name,
    metadata.author,
    metadata.author_login,
    metadata.actor,
    metadata.user_name,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }
  return null
}

function isOwnedByUser(
  metadata: Record<string, unknown> | undefined,
  options: { userId: string; email: string | undefined },
): boolean {
  const { userId, email } = options
  if (!metadata) {
    return false
  }
  const idCandidates = [
    metadata.author_id,
    metadata.user_id,
    metadata.actor_id,
    metadata.clerk_user_id,
    metadata.github_actor_id,
  ]
  for (const candidate of idCandidates) {
    if (typeof candidate === "string" && candidate.trim() === userId) {
      return true
    }
  }
  if (email) {
    const emailCandidates = [metadata.author_email, metadata.user_email, metadata.actor_email]
    for (const candidate of emailCandidates) {
      if (typeof candidate === "string" && candidate.trim().toLowerCase() === email.toLowerCase()) {
        return true
      }
    }
  }
  return false
}

function hasOwnerIdentity(metadata: Record<string, unknown> | undefined): boolean {
  if (!metadata) {
    return false
  }
  const identityCandidates = [
    metadata.author_id,
    metadata.user_id,
    metadata.actor_id,
    metadata.clerk_user_id,
    metadata.github_actor_id,
    metadata.author_email,
    metadata.user_email,
    metadata.actor_email,
  ]
  return identityCandidates.some((candidate) => typeof candidate === "string" && candidate.trim().length > 0)
}

function resolveUserRole(user: Awaited<ReturnType<typeof currentUser>>, claims: unknown): AppRole {
  const roleCandidate = user?.publicMetadata?.role ?? user?.unsafeMetadata?.role ?? user?.privateMetadata?.role
  if (typeof roleCandidate === "string" && roleCandidate.trim().length > 0) {
    return normalizeRole(roleCandidate)
  }
  return extractRoleFromClaims(claims)
}

function normalizeStatus(status: string | undefined): string {
  const raw = (status ?? "").trim().toUpperCase()
  if (raw === "DONE") {
    return "COMPLETED"
  }
  if (raw === "RECEIVED" || raw === "QUEUED" || raw === "RUNNING" || raw === "COMPLETED" || raw === "FAILED") {
    return raw
  }
  return "QUEUED"
}

function normalizeReviewDecision(metadata: Record<string, unknown>): DashboardReviewDecision | null {
  const raw = normalizeOptionalObject(metadata.review_decision)
  const valueRaw = typeof raw.value === "string" ? raw.value.trim().toUpperCase() : ""
  const value =
    valueRaw === "APPROVE" || valueRaw === "WARN" || valueRaw === "BLOCK"
      ? (valueRaw as DashboardReviewDecision["value"])
      : null
  if (!value) {
    return null
  }
  return {
    value,
    comment: typeof raw.comment === "string" && raw.comment.trim().length > 0 ? raw.comment.trim() : null,
    decidedAt: typeof raw.decided_at === "string" ? raw.decided_at : null,
    decidedBy: typeof raw.decided_by === "string" ? raw.decided_by : null,
  }
}

function toDashboardDetails(payload: BackendAnalysisDetails): DashboardAnalysisDetails | null {
  if (typeof payload.analysis_id !== "string" || typeof payload.repo !== "string") {
    return null
  }
  const metadata = normalizeOptionalObject(payload.metadata)
  const author = extractAuthorLabel(metadata) ?? "Unknown"

  const findings = Array.isArray(payload.findings)
    ? payload.findings.map((finding, index) => ({
        id: typeof finding.id === "string" ? finding.id : `${payload.analysis_id}-finding-${index}`,
        source: typeof finding.source === "string" ? finding.source : "unknown",
        filePath: typeof finding.file_path === "string" ? finding.file_path : "unknown",
        lineStart: typeof finding.line_start === "number" ? finding.line_start : null,
        lineEnd: typeof finding.line_end === "number" ? finding.line_end : null,
        severity: typeof finding.severity === "string" ? finding.severity.toUpperCase() : "INFO",
        category: typeof finding.category === "string" ? finding.category : "quality",
        message: typeof finding.message === "string" ? finding.message : "No message",
        suggestion: typeof finding.suggestion === "string" ? finding.suggestion : null,
        ruleId: typeof finding.rule_id === "string" ? finding.rule_id : null,
      }))
    : []

  const files = Array.isArray(payload.files_changed)
    ? payload.files_changed
        .filter((file) => typeof file.path_new === "string")
        .map((file, fileIndex) => {
          const lines: DashboardDiffLine[] = []
          const hunks = Array.isArray(file.hunks) ? file.hunks : []
          for (const hunk of hunks) {
            if (typeof hunk.header === "string" && hunk.header.trim().length > 0) {
              lines.push({
                lineType: "header",
                content: hunk.header,
                oldLineNo: null,
                newLineNo: null,
              })
            }
            const hunkLines = Array.isArray(hunk.lines) ? hunk.lines : []
            for (const line of hunkLines) {
              lines.push({
                lineType:
                  line.line_type === "add" || line.line_type === "remove" || line.line_type === "context"
                    ? line.line_type
                    : "context",
                content: typeof line.content === "string" ? line.content : "",
                oldLineNo: typeof line.old_line_no === "number" ? line.old_line_no : null,
                newLineNo: typeof line.new_line_no === "number" ? line.new_line_no : null,
              })
            }
          }
          return {
            id: typeof file.id === "string" ? file.id : `${payload.analysis_id}-file-${fileIndex}`,
            pathOld: typeof file.path_old === "string" ? file.path_old : null,
            pathNew: file.path_new as string,
            changeType:
              file.change_type === "added" ||
              file.change_type === "modified" ||
              file.change_type === "deleted" ||
              file.change_type === "renamed"
                ? file.change_type
                : "modified",
            isBinary: Boolean(file.is_binary),
            additionsCount: typeof file.additions_count === "number" ? file.additions_count : 0,
            deletionsCount: typeof file.deletions_count === "number" ? file.deletions_count : 0,
            lines,
          } satisfies DashboardDiffFile
        })
    : []

  return {
    id: payload.analysis_id,
    repo: payload.repo,
    source: typeof payload.source === "string" ? payload.source : "unknown",
    prNumber: typeof payload.pr_number === "number" ? payload.pr_number : null,
    prLabel: typeof payload.pr_number === "number" ? `PR #${payload.pr_number}` : "Commit",
    commitSha: typeof payload.commit_sha === "string" ? payload.commit_sha : null,
    diffText:
      typeof payload.diff_redacted === "string" && payload.diff_redacted.trim().length > 0
        ? payload.diff_redacted
        : "",
    author,
    status: normalizeStatus(payload.status),
    summary: typeof payload.summary === "string" && payload.summary.trim().length > 0 ? payload.summary : "Summary unavailable.",
    createdAt: typeof payload.created_at === "string" ? payload.created_at : "",
    updatedAt: typeof payload.updated_at === "string" ? payload.updated_at : "",
    reviewDecision: normalizeReviewDecision(metadata),
    findings,
    files,
  }
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  const analysisId = context.params.id
  if (!analysisId || analysisId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid analysis id" }, { status: 400 })
  }

  const { userId, getToken, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [token, user] = await Promise.all([getToken(), currentUser()])
  const role = resolveUserRole(user, sessionClaims)
  const email =
    user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress

  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  headers["X-User-Id"] = userId

  let response: Response
  try {
    response = await fetch(`${BACKEND_API_BASE_URL}/v1/analyses/${analysisId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Analysis not found" }, { status: response.status })
  }

  const payload = (await response.json()) as BackendAnalysisDetails
  const metadata = normalizeOptionalObject(payload.metadata)

  if (
    role === "developer" &&
    hasOwnerIdentity(metadata) &&
    !isOwnedByUser(metadata, {
      userId,
      email: email ?? undefined,
    })
  ) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 })
  }

  const details = toDashboardDetails(payload)
  if (!details) {
    return NextResponse.json({ error: "Invalid backend payload" }, { status: 502 })
  }

  return NextResponse.json(details, { status: 200 })
}
