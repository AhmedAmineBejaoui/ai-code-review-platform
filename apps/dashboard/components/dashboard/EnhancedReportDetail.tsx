"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Share2,
  MoreVertical,
  Search,
  Filter,
  FileCode,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  GitPullRequest,
  GitCommit,
  BarChart3,
  Zap,
  Shield,
  Database,
  Server,
  Code2,
  Layout,
  Terminal,
  Layers,
  Package,
  Lightbulb,
  ArrowRight,
  Tag,
  MessageSquare,
  BookOpen,
  Cpu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Types
export type FindingSeverity = "BLOCKER" | "WARN" | "INFO"
export type FindingCategory =
  | "security"
  | "performance"
  | "best-practice"
  | "style"
  | "logic"
  | "documentation"

export interface Finding {
  id: string
  severity: FindingSeverity
  category: FindingCategory
  message: string
  description?: string
  filePath: string
  lineNumber?: number
  codeSnippet?: string
  cwe?: string
  owasp?: string
  suggestion?: string
  runbook?: string
}

export interface FileAnalysis {
  path: string
  changeType: "added" | "modified" | "deleted"
  additions: number
  deletions: number
  findings: Finding[]
  language?: string
}

export interface ReportDetails {
  id: string
  repo: string
  prLabel: string
  commitSha: string
  status: string
  createdAt: string
  completedAt?: string
  duration: string
  author: string
  branch?: string
  files: FileAnalysis[]
  summary: {
    totalFindings: number
    blocker: number
    warn: number
    info: number
    securityScore: number
    codeQuality: number
  }
  metadata?: Record<string, unknown>
}

// Colors for severity
const severityStyles = {
  BLOCKER: {
    color: "#ef4444",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: AlertTriangle,
  },
  WARN: {
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: AlertCircle,
  },
  INFO: {
    color: "#3b82f6",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: Info,
  },
}

// Colors for category
const categoryStyles: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  security: { color: "#ef4444", bg: "bg-red-500/10", icon: Shield },
  performance: { color: "#8b5cf6", bg: "bg-violet-500/10", icon: Zap },
  "best-practice": { color: "#3b82f6", bg: "bg-blue-500/10", icon: CheckCircle2 },
  style: { color: "#6b7280", bg: "bg-gray-500/10", icon: Layout },
  logic: { color: "#f59e0b", bg: "bg-amber-500/10", icon: Cpu },
  documentation: { color: "#10b981", bg: "bg-emerald-500/10", icon: BookOpen },
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "-"
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Finding Card Component
function FindingCard({
  finding,
  index,
}: {
  finding: Finding
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const style = severityStyles[finding.severity]
  const catStyle = categoryStyles[finding.category] || categoryStyles["style"]
  const Icon = style.icon
  const CatIcon = catStyle.icon

  const handleCopy = () => {
    navigator.clipboard.writeText(finding.codeSnippet || finding.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        "rounded-lg border bg-card/50 backdrop-blur-sm transition-all",
        "hover:bg-card/80"
      )}
      style={{ borderColor: expanded ? style.color : "rgba(255,255,255,0.06)" }}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              style.bg
            )}
            style={{ color: style.color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                  style.bg
                )}
                style={{ color: style.color }}
              >
                {finding.severity}
              </span>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1",
                  catStyle.bg
                )}
                style={{ color: catStyle.color }}
              >
                <CatIcon className="h-3 w-3" />
                {finding.category}
              </span>
            </div>
            
            <p className="text-sm font-medium mt-2 line-clamp-2">
              {finding.message}
            </p>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="font-mono">{finding.filePath}</span>
              {finding.lineNumber && (
                <span className="font-mono">:{finding.lineNumber}</span>
              )}
            </div>
          </div>
          
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="text-muted-foreground/40"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4">
              {finding.description && (
                <p className="text-sm text-muted-foreground">
                  {finding.description}
                </p>
              )}

              {finding.codeSnippet && (
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-muted/50 overflow-x-auto text-xs font-mono">
                    <code>{finding.codeSnippet}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy()
                    }}
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {finding.cwe && (
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    CWE-{finding.cwe}
                  </Badge>
                )}
                {finding.owasp && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    OWASP {finding.owasp}
                  </Badge>
                )}
              </div>

              {finding.suggestion && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1">
                    <Lightbulb className="h-3 w-3" />
                    Suggestion
                  </div>
                  <p className="text-sm text-emerald-700">
                    {finding.suggestion}
                  </p>
                </div>
              )}

              {finding.runbook && (
                <Button variant="outline" size="sm" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  View Runbook
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// File Row Component
function FileRow({
  file,
  index,
}: {
  file: FileAnalysis
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const hasFindings = file.findings.length > 0

  return (
    <div className="rounded-lg border bg-card/50 overflow-hidden">
      <div
        className="p-3 cursor-pointer flex items-center gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                file.changeType === "added" &&
                  "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
                file.changeType === "deleted" &&
                  "text-red-500 border-red-500/30 bg-red-500/10",
                file.changeType === "modified" &&
                  "text-amber-500 border-amber-500/30 bg-amber-500/10"
              )}
            >
              {file.changeType === "added"
                ? "A"
                : file.changeType === "deleted"
                ? "D"
                : "M"}
            </Badge>
            <span className="font-mono text-sm truncate">{file.path}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-xs">
          {hasFindings && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {file.findings.length}
            </Badge>
          )}
          <span className="text-emerald-500">+{file.additions}</span>
          <span className="text-red-500">-{file.deletions}</span>
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            className="text-muted-foreground/40"
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="border-t border-border/50"
          >
            <div className="p-3 space-y-2">
              {file.findings.map((finding, i) => (
                <FindingCard key={finding.id} finding={finding} index={i} />
              ))}
              {file.findings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No issues found in this file
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Main Report Detail Component
export function EnhancedReportDetail() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [report, setReport] = useState<ReportDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Mock data - replace with actual API call
  useEffect(() => {
    setLoading(true)
    // Simulated API call
    setTimeout(() => {
      setReport({
        id: id || "report-1",
        repo: "owner/repo",
        prLabel: "PR #42",
        commitSha: "a1b2c3d4e5f6",
        status: "completed",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
        duration: "2m 34s",
        author: "johndoe",
        branch: "feature/add-validation",
        files: [
          {
            path: "src/auth/validate.ts",
            changeType: "modified",
            additions: 45,
            deletions: 12,
            language: "typescript",
            findings: [
              {
                id: "find-1",
                severity: "BLOCKER",
                category: "security",
                message: "SQL injection vulnerability detected in user input",
                description:
                  "The query uses string concatenation to build SQL statements. This allows attackers to inject malicious SQL code through user input.",
                filePath: "src/auth/validate.ts",
                lineNumber: 45,
                codeSnippet: `const query = "SELECT * FROM users WHERE id = '" + userId + "'";`,
                cwe: "89",
                suggestion:
                  "Use parameterized queries or an ORM to prevent SQL injection.",
              },
              {
                id: "find-2",
                severity: "WARN",
                category: "best-practice",
                message: "Missing input validation on function parameter",
                filePath: "src/auth/validate.ts",
                lineNumber: 12,
                suggestion: "Add type checking and validation for all parameters.",
              },
            ],
          },
          {
            path: "src/api/routes.ts",
            changeType: "modified",
            additions: 23,
            deletions: 5,
            language: "typescript",
            findings: [
              {
                id: "find-3",
                severity: "INFO",
                category: "style",
                message: "Inconsistent naming convention",
                description: "Use camelCase for function names",
                filePath: "src/api/routes.ts",
                lineNumber: 8,
                suggestion: "Rename to use camelCase.",
              },
            ],
          },
        ],
        summary: {
          totalFindings: 3,
          blocker: 1,
          warn: 1,
          info: 1,
          securityScore: 72,
          codeQuality: 85,
        },
      })
      setLoading(false)
    }, 1000)
  }, [id])

  const stats = useMemo(() => {
    if (!report) return null

    const filesWithFindings = report.files.filter((f) => f.findings.length > 0)
    const totalFindings = report.files.reduce(
      (sum, f) => sum + f.findings.length,
      0
    )

    return {
      filesAnalyzed: report.files.length,
      filesWithFindings: filesWithFindings.length,
      totalFindings,
      blocker: report.summary.blocker,
      warn: report.summary.warn,
      info: report.summary.info,
      securityScore: report.summary.securityScore,
      codeQuality: report.summary.codeQuality,
      languages: [...new Set(report.files.map((f) => f.language).filter(Boolean))],
    }
  }, [report])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Report not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="gap-1">
              <GitPullRequest className="h-3 w-3" />
              {report.prLabel}
            </Badge>
            <Badge variant="outline" className="gap-1 font-mono">
              <GitCommit className="h-3 w-3" />
              {report.commitSha?.slice(0, 7)}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Completed
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{report.repo}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyzed {formatTimeAgo(report.createdAt)} · {report.duration}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-run
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">Security Score</span>
              </div>
              <div className="text-3xl font-bold">{stats.securityScore}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileCode className="h-4 w-4" />
                <span className="text-xs">Files</span>
              </div>
              <div className="text-3xl font-bold">{stats.filesAnalyzed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Findings</span>
              </div>
              <div className="text-3xl font-bold">{stats.totalFindings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Code2 className="h-4 w-4" />
                <span className="text-xs">Quality</span>
              </div>
              <div className="text-3xl font-bold">{stats.codeQuality}</div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="findings">Findings ({stats?.totalFindings || 0})</TabsTrigger>
          <TabsTrigger value="files">Files ({report.files.length})</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Finding Summary */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-500 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">Blockers</span>
                  </div>
                  <div className="text-3xl font-bold text-red-500">{stats.blocker}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Must fix before merge
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-500 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Warnings</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-500">{stats.warn}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Should address
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-500 mb-2">
                    <Info className="h-5 w-5" />
                    <span className="font-semibold">Info</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-500">{stats.info}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggestions
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Severity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Finding Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {report.files.map((file) =>
                  file.findings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      index={0}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-2">
          <ScrollArea className="h-[600px]">
            {report.files.map((file, index) => (
              <FileRow key={file.path} file={file} index={index} />
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="findings" className="space-y-2">
          <ScrollArea className="h-[600px]">
            {report.files
              .flatMap((f) => f.findings)
              .map((finding, index) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  index={index}
                />
              ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="changes">
          <Card>
            <CardContent className="p-8 text-center">
              <Code2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Full diff view coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}