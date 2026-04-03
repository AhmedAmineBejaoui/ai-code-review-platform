"use client";
/* eslint-disable react/no-unescaped-entities */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Upload,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Loader2,
  Plus,
  ShieldAlert,
  GitPullRequest,
  ChevronDown,
  ExternalLink,
  Copy,
  Code2,
  FileCode,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import { emptyDashboardInsights, fetchDashboardInsights, type DashboardRole } from "@/lib/dashboard-insights";
import { isReviewer } from "@/lib/roles";
import {
  fetchDashboardAnalyses,
  hasActiveDashboardAnalysis,
  type DashboardAnalysisItem,
} from "@/lib/dashboard-analyses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedCounter } from "@/components/ui/animated-counter";

// ── types ──────────────────────────────────────────────────────────────────────
type LaunchAnalysisResponse = {
  analysis_id?: string;
  status?: string;
  task_id?: string | null;
  error?: string;
  backend_response?: { message?: string; detail?: string };
};

type GithubRepoOption = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string | null;
  defaultBranch: string | null;
  ownerLogin: string | null;
  updatedAt: string | null;
};

type GithubReposResponse = {
  connected?: boolean;
  items?: GithubRepoOption[];
  error?: string | null;
};

type ImportedProjectFile = { path: string; content: string };

type ImportedProjectSummary = {
  folderName: string;
  importedFiles: number;
  ignoredFiles: number;
  totalBytes: number;
  diffBytes: number;
};

// ── import helpers ─────────────────────────────────────────────────────────────
const IMPORT_EXCLUDED_DIRECTORIES = new Set([
  ".git", ".next", ".nuxt", ".turbo", ".vercel", "node_modules", "dist",
  "build", "coverage", ".ruff_cache", "__pycache__", ".pytest_cache",
  ".mypy_cache", ".idea", ".vscode",
]);
const IMPORT_EXCLUDED_FILES = new Set([
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock",
  "semgrep_out.json", "semgrep_err.txt", "Thumbs.db",
]);
const IMPORT_SUPPORTED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".java", ".kt", ".go",
  ".rs", ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".hpp", ".swift", ".sql",
  ".json", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".env", ".md",
  ".txt", ".css", ".scss", ".less", ".html", ".xml", ".sh", ".ps1", ".bat",
]);
const IMPORT_SUPPORTED_BASENAMES = new Set([".env", ".env.example", ".gitignore", "Dockerfile", "Makefile"]);
const MAX_IMPORTED_PROJECT_FILES = 400;
const MAX_IMPORTED_FILE_BYTES = 200_000;
const MAX_IMPORTED_TOTAL_BYTES = 1_500_000;
const MAX_SYNTHETIC_DIFF_BYTES = 1_850_000;
const textEncoder = new TextEncoder();

function normalizeImportPath(rawPath: string): string {
  return rawPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}
function getFolderImportPath(file: File): { rootFolderName: string; relativePath: string } | null {
  const rawPath = normalizeImportPath(file.webkitRelativePath || file.name);
  const parts = rawPath.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { rootFolderName: parts[0], relativePath: parts[0] };
  return { rootFolderName: parts[0], relativePath: parts.slice(1).join("/") };
}
function shouldIgnoreImportedPath(relativePath: string): boolean {
  const parts = normalizeImportPath(relativePath).split("/").filter(Boolean);
  if (parts.length === 0) return true;
  if (parts.some((p) => IMPORT_EXCLUDED_DIRECTORIES.has(p))) return true;
  const fileName = parts[parts.length - 1];
  if (IMPORT_EXCLUDED_FILES.has(fileName)) return true;
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  return !(IMPORT_SUPPORTED_EXTENSIONS.has(extension) || IMPORT_SUPPORTED_BASENAMES.has(fileName));
}
function isTextContent(content: string): boolean {
  return !content.includes("\u0000");
}
function synthesizeFolderSnapshotDiff(files: ImportedProjectFile[]): string {
  return files.map(({ path, content }) => {
    const normalizedPath = normalizeImportPath(path);
    const normalizedContent = content.replace(/\r\n/g, "\n");
    const lines = normalizedContent.length > 0 ? normalizedContent.split("\n") : [];
    const additions = lines.map((line) => `+${line}`).join("\n");
    const hunkHeader = lines.length > 0 ? `@@ -0,0 +1,${lines.length} @@` : "@@ -0,0 +0,0 @@";
    return [
      `diff --git a/${normalizedPath} b/${normalizedPath}`,
      "new file mode 100644",
      "index 0000000..1111111",
      "--- /dev/null",
      `+++ b/${normalizedPath}`,
      hunkHeader,
      additions,
      "",
    ].join("\n");
  }).join("\n");
}
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── chart sample data ──────────────────────────────────────────────────────────
const chartData = [
  { day: "Lun", issues: 12, resolved: 8 },
  { day: "Mar", issues: 18, resolved: 15 },
  { day: "Mer", issues: 7, resolved: 6 },
  { day: "Jeu", issues: 24, resolved: 20 },
  { day: "Ven", issues: 15, resolved: 14 },
  { day: "Sam", issues: 3, resolved: 3 },
  { day: "Dim", issues: 9, resolved: 7 },
];

// ── score helpers ──────────────────────────────────────────────────────────────
function normalizeStatus(status: string): string {
  const raw = status.trim().toUpperCase();
  if (raw === "DONE") return "COMPLETED";
  if (["RUNNING", "FAILED", "QUEUED", "RECEIVED", "COMPLETED"].includes(raw)) return raw;
  return "QUEUED";
}

function computeScore(analysis: DashboardAnalysisItem): number {
  const s = normalizeStatus(analysis.status);
  if (s === "RUNNING" || s === "QUEUED" || s === "RECEIVED") return 0;
  if (s === "FAILED") return 15;
  if (analysis.blockerCount > 0) return Math.max(15, 50 - analysis.blockerCount * 6);
  if (analysis.warnCount > 0) return Math.max(55, 95 - analysis.warnCount * 2);
  return 96;
}

// ── ScoreRing ──────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const color =
    score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : score > 0 ? "#ef4444" : "#3f3f46";
  const glowColor =
    score >= 80 ? "rgba(34,197,94,0.3)" : score >= 50 ? "rgba(234,179,8,0.3)" : score > 0 ? "rgba(239,68,68,0.3)" : "transparent";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272a" strokeWidth={3} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ color }}>
        {score > 0 ? score : "—"}
      </span>
    </div>
  );
}

// ── TypewriterText ─────────────────────────────────────────────────────────────
function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {started && displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          className="inline-block w-[2px] h-3.5 bg-violet-400 ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

// ── AnalysisRow ────────────────────────────────────────────────────────────────
interface AnalysisRowProps {
  analysis: DashboardAnalysisItem;
  index: number;
  aiSummary?: string;
}

function AnalysisRow({ analysis, index, aiSummary }: AnalysisRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const score = computeScore(analysis);
  const s = normalizeStatus(analysis.status);

  const statusConfig = {
    COMPLETED: { dot: "bg-emerald-400", label: "Complété", badgeBg: "bg-emerald-500/15 text-emerald-400" },
    RUNNING:   { dot: "bg-blue-400 animate-pulse", label: "En cours", badgeBg: "bg-blue-500/15 text-blue-400" },
    FAILED:    { dot: "bg-red-400", label: "Échoué", badgeBg: "bg-red-500/15 text-red-400" },
    QUEUED:    { dot: "bg-zinc-500", label: "En attente", badgeBg: "bg-zinc-500/15 text-zinc-400" },
    RECEIVED:  { dot: "bg-zinc-500", label: "Reçu", badgeBg: "bg-zinc-500/15 text-zinc-400" },
  } as Record<string, { dot: string; label: string; badgeBg: string }>;

  const cfg = statusConfig[s] ?? statusConfig["QUEUED"];

  // Build mini AI insights list
  const insights: string[] = [];
  if (analysis.blockerCount > 0) insights.push(`⚠️ ${analysis.blockerCount} problème(s) bloquant(s) détecté(s)`);
  if (analysis.warnCount > 0)    insights.push(`⚠️ ${analysis.warnCount} avertissement(s) à corriger`);
  if (analysis.infoCount > 0)    insights.push(`💡 ${analysis.infoCount} suggestion(s) d'amélioration`);
  if (s === "COMPLETED" && analysis.blockerCount === 0 && analysis.warnCount === 0) {
    insights.push("✅ Code de qualité excellente, aucun problème critique détecté");
  }
  if (aiSummary) insights.unshift(`🤖 ${aiSummary}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="group"
    >
      <motion.div
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) setTimeout(() => setShowInsights(true), 300);
          else setShowInsights(false);
        }}
        whileHover={{ backgroundColor: "rgba(39, 39, 42, 0.3)" }}
        className={`grid grid-cols-[1fr_90px_70px_70px_80px_48px_32px] items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${expanded ? "bg-zinc-800/50" : ""}`}
      >
        {/* Repo info */}
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-block size-2 rounded-full shrink-0 ${cfg.dot}`} />
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`size-7 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                s === "FAILED" ? "bg-red-500/15 text-red-400" : "bg-violet-500/15 text-violet-300"
              }`}
            >
              {(analysis.author?.slice(0, 2) ?? "??").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white truncate">{analysis.repo}</span>
                {analysis.prLabel && analysis.prLabel !== "Commit" && (
                  <Badge className="bg-violet-500/10 text-violet-300 border-0 text-[10px] px-1.5 py-0">
                    {analysis.prLabel}
                  </Badge>
                )}
                <Badge className={`${cfg.badgeBg} border-0 text-[10px] px-1.5 py-0`}>
                  {cfg.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                <GitPullRequest className="size-3" />
                <span className="font-mono text-zinc-600 truncate">
                  {analysis.commitSha ? analysis.commitSha.slice(0, 8) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Author */}
        <span className="text-xs text-zinc-500 truncate">{analysis.author}</span>

        {/* Blockers */}
        <div className="flex items-center gap-1.5">
          {analysis.blockerCount > 0 ? (
            <motion.div
              className="flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-full"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <ShieldAlert className="size-3 text-red-400" />
              <span className="text-[11px] text-red-400">{analysis.blockerCount}</span>
            </motion.div>
          ) : (
            <span className="text-xs text-zinc-700">—</span>
          )}
        </div>

        {/* Warnings */}
        <div className="flex items-center gap-1.5">
          {analysis.warnCount > 0 ? (
            <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="size-3 text-amber-400" />
              <span className="text-[11px] text-amber-400">{analysis.warnCount}</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-700">—</span>
          )}
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Clock className="size-3" />
          {analysis.durationLabel ?? "—"}
        </div>

        <ScoreRing score={score} />

        <motion.div
          className="flex justify-center"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </motion.div>
      </motion.div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 bg-zinc-800/30 border-t border-zinc-800/40">
              <div className="grid grid-cols-12 gap-5 mt-2">
                {/* AI Analysis panel */}
                <div className="col-span-7">
                  <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="size-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <Sparkles className="size-3.5 text-violet-400" />
                      </div>
                      <span className="text-xs text-violet-300 uppercase tracking-wider">Analyse IA</span>
                      <div className="ml-auto flex items-center gap-1">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="size-1.5 rounded-full bg-violet-400"
                        />
                        <span className="text-[10px] text-violet-400/60">RAG</span>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                      {aiSummary ?? "Revue du code par intelligence artificielle avec contexte RAG."}
                    </p>

                    {showInsights && insights.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-zinc-800/60">
                        {insights.map((insight, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed"
                          >
                            <TypewriterText text={insight} delay={i * 400} />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats panel */}
                <div className="col-span-5 space-y-3">
                  <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <Code2 className="size-4 text-zinc-500" />
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">Résultats</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-zinc-950/60 rounded-lg p-3 text-center"
                      >
                        <ShieldAlert className="size-4 text-red-400 mx-auto mb-1" />
                        <p className="text-lg text-white">{analysis.blockerCount}</p>
                        <p className="text-[9px] text-zinc-600 uppercase">Bloquants</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-zinc-950/60 rounded-lg p-3 text-center"
                      >
                        <AlertTriangle className="size-4 text-amber-400 mx-auto mb-1" />
                        <p className="text-lg text-amber-400">{analysis.warnCount}</p>
                        <p className="text-[9px] text-zinc-600 uppercase">Warnings</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-zinc-950/60 rounded-lg p-3 text-center"
                      >
                        <FileCode className="size-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-lg text-blue-400">{analysis.infoCount}</p>
                        <p className="text-[9px] text-zinc-600 uppercase">Infos</p>
                      </motion.div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/dashboard/analyses/${analysis.id}`} className="flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs border-zinc-700/60 hover:bg-zinc-700/50 text-zinc-400"
                      >
                        <ExternalLink className="size-3 mr-1.5" />
                        Voir le rapport
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-zinc-700/60 hover:bg-zinc-700/50 text-zinc-400"
                      onClick={() => navigator.clipboard.writeText(analysis.id)}
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── DeveloperDashboard ─────────────────────────────────────────────────────────
export function DeveloperDashboard() {
  const router = useRouter();
  const currentUser = useDashboardUser();
  const insightsRole: DashboardRole = currentUser.role === "admin" ? "admin" : isReviewer(currentUser.role) ? "reviewer" : "developer";

  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insights, setInsights] = useState(() => emptyDashboardInsights(insightsRole));
  const [analysisRows, setAnalysisRows] = useState<DashboardAnalysisItem[]>([]);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [githubRepoSelection, setGithubRepoSelection] = useState("manual");
  const [githubRepos, setGithubRepos] = useState<GithubRepoOption[]>([]);
  const [isLoadingGithubRepos, setIsLoadingGithubRepos] = useState(false);
  const [githubReposError, setGithubReposError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [prNumberInput, setPrNumberInput] = useState("");
  const [commitShaInput, setCommitShaInput] = useState("");
  const [diffInput, setDiffInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isImportingProject, setIsImportingProject] = useState(false);
  const [isSubmittingAnalysis, setIsSubmittingAnalysis] = useState(false);
  const [importedProjectSummary, setImportedProjectSummary] = useState<ImportedProjectSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoaded, setIsLoaded] = useState(false);
  const projectFolderInputRef = useRef<HTMLInputElement | null>(null);

  // ── derived metrics ────────────────────────────────────────────────────────
  const totalErrors = analysisRows.reduce((a, b) => a + b.blockerCount, 0);
  const totalWarnings = analysisRows.reduce((a, b) => a + b.warnCount, 0);
  const completedCount = analysisRows.filter((a) => normalizeStatus(a.status) === "COMPLETED").length;
  const scores = analysisRows.filter((a) => computeScore(a) > 0).map((a) => computeScore(a));
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const filteredRows =
    statusFilter === "all"
      ? analysisRows
      : analysisRows.filter((a) => normalizeStatus(a.status) === statusFilter.toUpperCase());

  // Build pie data from real analyses
  const pieData = [
    { name: "Bloquant", value: totalErrors, color: "#ef4444" },
    { name: "Warning", value: totalWarnings, color: "#eab308" },
    { name: "Info", value: analysisRows.reduce((a, b) => a + b.infoCount, 0), color: "#22c55e" },
    { name: "OK", value: analysisRows.filter((a) => normalizeStatus(a.status) === "COMPLETED" && a.blockerCount === 0 && a.warnCount === 0).length, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  const summaryByAnalysisId = Object.fromEntries(
    insights.prSummaries.map((s) => [s.analysisId, s.summary])
  );

  const metrics = [
    { label: "Score moyen", value: avgScore, suffix: "/100", icon: TrendingUp, color: "text-violet-400", bg: "from-violet-500/10 to-violet-500/5", glow: "shadow-violet-500/5", trend: "+12%", trendUp: true },
    { label: "Erreurs critiques", value: totalErrors, icon: ShieldAlert, color: "text-red-400", bg: "from-red-500/10 to-red-500/5", glow: "shadow-red-500/5", trend: `-${totalErrors > 0 ? 1 : 0}`, trendUp: true },
    { label: "Warnings", value: totalWarnings, icon: AlertTriangle, color: "text-amber-400", bg: "from-amber-500/10 to-amber-500/5", glow: "shadow-amber-500/5", trend: `+${totalWarnings}`, trendUp: false },
    { label: "Analyses OK", value: completedCount, suffix: `/${analysisRows.length}`, icon: CheckCircle2, color: "text-emerald-400", bg: "from-emerald-500/10 to-emerald-500/5", glow: "shadow-emerald-500/5", trend: `${analysisRows.length > 0 ? Math.round((completedCount / analysisRows.length) * 100) : 0}%`, trendUp: true },
  ];

  // ── effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoaded(true);
    let cancelled = false;
    setInsightsLoading(true);
    Promise.all([fetchDashboardInsights(), fetchDashboardAnalyses({ force: true, size: 40 })])
      .then(([insightsPayload, analysesPayload]) => {
        if (cancelled) return;
        setInsights(insightsPayload);
        setAnalysisRows(analysesPayload);
      })
      .finally(() => { if (!cancelled) setInsightsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let isRefreshing = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const refreshAnalyses = async () => {
      if (cancelled || isRefreshing) return;
      let latestItems = analysisRows;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        timeoutId = setTimeout(() => { void refreshAnalyses(); }, 30_000);
        return;
      }
      isRefreshing = true;
      try {
        const payload = await fetchDashboardAnalyses({ force: true, size: 40 });
        latestItems = payload;
        if (!cancelled) setAnalysisRows(payload);
      } finally {
        isRefreshing = false;
        if (!cancelled) {
          const delay = hasActiveDashboardAnalysis(latestItems) ? 10_000 : 30_000;
          timeoutId = setTimeout(() => { void refreshAnalyses(); }, delay);
        }
      }
    };
    timeoutId = setTimeout(() => { void refreshAnalyses(); }, hasActiveDashboardAnalysis(analysisRows) ? 10_000 : 30_000);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [analysisRows]);

  useEffect(() => {
    const input = projectFolderInputRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!analysisDialogOpen) return;
    void loadGithubRepos();
  }, [analysisDialogOpen]);

  useEffect(() => {
    if (githubRepoSelection === "manual") return;
    const stillExists = githubRepos.some((repo) => repo.fullName === githubRepoSelection);
    if (!stillExists) setGithubRepoSelection("manual");
  }, [githubRepoSelection, githubRepos]);

  // ── handlers ───────────────────────────────────────────────────────────────
  const openLaunchDialog = () => {
    setFormError(null);
    setActionMessage(null);
    setAnalysisDialogOpen(true);
  };

  const openImportDialog = () => {
    setFormError(null);
    setActionMessage(null);
    projectFolderInputRef.current?.click();
  };

  const handleProjectFolderImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;
    setIsImportingProject(true);
    setFormError(null);
    try {
      const acceptedFiles: ImportedProjectFile[] = [];
      let ignoredFiles = 0;
      let totalBytes = 0;
      let folderName = "local-project";
      for (const file of selectedFiles) {
        const importPath = getFolderImportPath(file);
        if (!importPath) { ignoredFiles++; continue; }
        folderName = importPath.rootFolderName || folderName;
        if (shouldIgnoreImportedPath(importPath.relativePath) || file.size > MAX_IMPORTED_FILE_BYTES || acceptedFiles.length >= MAX_IMPORTED_PROJECT_FILES) { ignoredFiles++; continue; }
        const nextTotal = totalBytes + file.size;
        if (nextTotal > MAX_IMPORTED_TOTAL_BYTES) { ignoredFiles++; continue; }
        const text = await file.text();
        if (!isTextContent(text)) { ignoredFiles++; continue; }
        acceptedFiles.push({ path: importPath.relativePath, content: text });
        totalBytes = nextTotal;
      }
      if (acceptedFiles.length === 0) throw new Error("Aucun fichier texte exploitable n'a ete trouve dans le dossier selectionne.");
      const syntheticDiff = synthesizeFolderSnapshotDiff(acceptedFiles);
      const diffBytes = textEncoder.encode(syntheticDiff).length;
      if (diffBytes > MAX_SYNTHETIC_DIFF_BYTES) throw new Error(`Le snapshot du dossier depasse la taille maximale analysee (${formatBytes(diffBytes)} > ${formatBytes(MAX_SYNTHETIC_DIFF_BYTES)}).`);
      setDiffInput(syntheticDiff);
      setImportedProjectSummary({ folderName, importedFiles: acceptedFiles.length, ignoredFiles, totalBytes, diffBytes });
      if (!repoInput.trim()) {
        const inferred = folderName.replace(/\s+/g, "-");
        if (inferred.trim()) setRepoInput(inferred.trim());
      }
      setAnalysisDialogOpen(true);
      setActionMessage(`Dossier importe: ${folderName} (${acceptedFiles.length} fichiers, ${formatBytes(totalBytes)} de texte utile).`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Import du dossier impossible.");
    } finally {
      setIsImportingProject(false);
    }
  };

  const handleLaunchAnalysis = async () => {
    setFormError(null);
    setActionMessage(null);
    const normalizedRepo = repoInput.trim();
    const normalizedDiff = diffInput.trim();
    const normalizedPrNumber = prNumberInput.trim();
    const normalizedCommitSha = commitShaInput.trim();
    if (!normalizedRepo) { setFormError("Le repository est obligatoire."); return; }
    let parsedPrNumber: number | null = null;
    if (normalizedPrNumber.length > 0) {
      const asNumber = Number(normalizedPrNumber);
      if (!Number.isInteger(asNumber) || asNumber < 1) { setFormError("Le numero de PR doit etre un entier positif."); return; }
      parsedPrNumber = asNumber;
    }
    if (normalizedCommitSha.length > 0 && !/^[0-9a-fA-F]{6,64}$/.test(normalizedCommitSha)) { setFormError("Le commit SHA doit contenir 6 a 64 caracteres hexadecimaux."); return; }
    const isGithubRemoteMode = githubRepoSelection !== "manual" && importedProjectSummary === null;
    const hasGithubTarget = parsedPrNumber !== null || normalizedCommitSha.length > 0;
    const githubRemoteTargetMode = isGithubRemoteMode
      ? parsedPrNumber !== null ? "pr" : normalizedCommitSha.length > 0 ? "commit" : "repo_snapshot"
      : null;
    if (!normalizedDiff && !isGithubRemoteMode) { setFormError("Importez un dossier de code ou collez un diff avant de lancer l'analyse."); return; }
    setIsSubmittingAnalysis(true);
    try {
      const response = await fetch("/api/dashboard/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          repo: normalizedRepo,
          pr_number: parsedPrNumber,
          commit_sha: normalizedCommitSha.length > 0 ? normalizedCommitSha : null,
          diff_text: normalizedDiff.length > 0 ? normalizedDiff : null,
          metadata: {
            triggered_from: "developer_dashboard",
            imported_diff: true,
            imported_file_name: importedProjectSummary?.folderName ?? null,
            import_mode: importedProjectSummary ? "folder" : isGithubRemoteMode ? "github_remote" : "manual_diff",
            analysis_input_mode: importedProjectSummary ? "local_folder_snapshot" : isGithubRemoteMode ? "github_remote" : "manual_diff",
            workspace_source: importedProjectSummary ? "imported_folder_snapshot" : isGithubRemoteMode ? "github_remote" : "manual_diff",
            imported_folder_name: importedProjectSummary?.folderName ?? null,
            imported_files_count: importedProjectSummary?.importedFiles ?? null,
            ignored_files_count: importedProjectSummary?.ignoredFiles ?? null,
            imported_text_bytes: importedProjectSummary?.totalBytes ?? null,
            synthetic_diff_bytes: importedProjectSummary?.diffBytes ?? null,
            repo_selected_from_github: githubRepoSelection !== "manual",
            selected_github_repo: githubRepoSelection !== "manual" ? githubRepoSelection : null,
            github_remote_target_mode: githubRemoteTargetMode,
            github_remote_has_pr_or_commit: hasGithubTarget,
          },
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as LaunchAnalysisResponse;
      if (!response.ok) {
        const msg = payload?.backend_response?.message ?? payload?.backend_response?.detail ?? payload?.error ?? "Le backend a refuse la creation de l'analyse.";
        throw new Error(msg);
      }
      const analysisId = typeof payload.analysis_id === "string" ? payload.analysis_id : null;
      setActionMessage(analysisId ? `Analyse lancee avec succes. ID: ${analysisId}` : "Analyse lancee avec succes.");
      setAnalysisDialogOpen(false);
      setPrNumberInput("");
      setCommitShaInput("");
      setImportedProjectSummary(null);
      setGithubRepoSelection("manual");
      await refreshDashboardData();
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible de lancer l'analyse.");
    } finally {
      setIsSubmittingAnalysis(false);
    }
  };

  const refreshDashboardData = async () => {
    setInsightsLoading(true);
    try {
      const [insightsPayload, analysesPayload] = await Promise.all([fetchDashboardInsights(), fetchDashboardAnalyses({ force: true, size: 40 })]);
      setInsights(insightsPayload);
      setAnalysisRows(analysesPayload);
    } finally {
      setInsightsLoading(false);
    }
  };

  const loadGithubRepos = async () => {
    setIsLoadingGithubRepos(true);
    setGithubReposError(null);
    try {
      const response = await fetch("/api/dashboard/github/repos", { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Impossible de recuperer les repositories GitHub.");
      const payload = (await response.json().catch(() => ({}))) as GithubReposResponse;
      const items = Array.isArray(payload.items) ? payload.items : [];
      setGithubRepos(items);
      setGithubConnected(payload.connected === true);
      if (typeof payload.error === "string" && payload.error.trim().length > 0) setGithubReposError(payload.error);
    } catch (error) {
      setGithubRepos([]);
      setGithubConnected(false);
      setGithubReposError(error instanceof Error ? error.message : "Chargement des repositories GitHub impossible.");
    } finally {
      setIsLoadingGithubRepos(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
            {isReviewer(currentUser.role) || currentUser.role === "admin"
              ? "Vue d'ensemble de l'équipe"
              : "Tableau de bord développeur"}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Analysez votre code avec l'IA — RAG-powered · Résultats en temps réel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="sm"
              onClick={openImportDialog}
              disabled={isImportingProject || isSubmittingAnalysis}
              variant="outline"
              className="border-zinc-700/60 hover:bg-zinc-800 text-zinc-300 h-8 text-xs"
            >
              {isImportingProject ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}
              {isImportingProject ? "Import..." : "Importer"}
            </Button>
            <input ref={projectFolderInputRef} type="file" multiple className="hidden" onChange={handleProjectFolderImport} />
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="sm"
              onClick={openLaunchDialog}
              disabled={isSubmittingAnalysis}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-violet-500/20 h-8 text-xs"
            >
              <Plus className="size-3.5 mr-1.5" />
              Nouvelle analyse
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* ── Success/Error Messages ── */}
        {(formError || actionMessage) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${formError ? "bg-red-500/10 border border-red-500/20 text-red-300" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"}`}>
              {formError ? <AlertCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
              {formError ?? actionMessage}
            </div>
          </motion.div>
        )}

        {/* ── Metrics ── */}
        <div className="grid grid-cols-4 gap-4">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isLoaded ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className={`bg-gradient-to-br ${metric.bg} border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/60 transition-all shadow-lg ${metric.glow} cursor-default`}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div whileHover={{ rotate: 12 }} transition={{ type: "spring", stiffness: 300 }}>
                  <metric.icon className={`size-5 ${metric.color}`} />
                </motion.div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${metric.trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {metric.trendUp ? "↗" : "↘"} {metric.trend}
                </span>
              </div>
              <div className="text-3xl text-white flex items-baseline gap-0.5">
                <AnimatedCounter value={metric.value} duration={1200} />
                {metric.suffix && <span className="text-lg text-zinc-500">{metric.suffix}</span>}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">{metric.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Charts + Activity ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* Area chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={isLoaded ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.4 }}
            className="col-span-5 bg-zinc-950/50 border border-zinc-800/60 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm text-white">Activité semaine</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Issues détectés vs résolus</p>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-violet-500" /><span className="text-zinc-500">Issues</span></div>
                <div className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /><span className="text-zinc-500">Résolus</span></div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="issuesG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="resolvedG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "10px", fontSize: "11px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} labelStyle={{ color: "#a1a1aa" }} />
                <Area type="monotone" dataKey="issues" stroke="#8b5cf6" fill="url(#issuesG)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="url(#resolvedG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={isLoaded ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.4, duration: 0.4 }}
            className="col-span-3 bg-zinc-950/50 border border-zinc-800/60 rounded-2xl p-5"
          >
            <h3 className="text-sm text-white mb-1">Sévérité</h3>
            <p className="text-[11px] text-zinc-500 mb-2">Répartition des issues</p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-zinc-500">{item.name}</span>
                      <span className="text-[10px] ml-auto" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[130px] text-xs text-zinc-600">
                Aucune donnée
              </div>
            )}
          </motion.div>

          {/* Live activity feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={isLoaded ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5, duration: 0.4 }}
            className="col-span-4 bg-zinc-950/50 border border-zinc-800/60 rounded-2xl p-5 overflow-hidden"
          >
            <LiveActivityFeed />
          </motion.div>
        </div>

        {/* ── Analyses Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={isLoaded ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-zinc-950/50 border border-zinc-800/60 rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60">
            <div className="flex items-center gap-3">
              <GitPullRequest className="size-4 text-violet-400" />
              <h3 className="text-sm text-white">
                {isReviewer(currentUser.role) || currentUser.role === "admin"
                  ? "Analyses de l'équipe"
                  : "Vos analyses"}
              </h3>
              <Badge className="bg-zinc-800 text-zinc-400 border-0 text-[10px]">
                {insightsLoading ? "..." : filteredRows.length}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="bg-zinc-800/50 h-7">
                  <TabsTrigger value="all" className="text-[11px] h-5 px-2.5 data-[state=active]:bg-zinc-700">Tous</TabsTrigger>
                  <TabsTrigger value="completed" className="text-[11px] h-5 px-2.5 data-[state=active]:bg-zinc-700">✓ Complétés</TabsTrigger>
                  <TabsTrigger value="running" className="text-[11px] h-5 px-2.5 data-[state=active]:bg-zinc-700">◌ En cours</TabsTrigger>
                  <TabsTrigger value="failed" className="text-[11px] h-5 px-2.5 data-[state=active]:bg-zinc-700">✗ Échoués</TabsTrigger>
                </TabsList>
              </Tabs>
              <Link href="/dashboard/analyses">
                <Button size="sm" variant="outline" className="text-[11px] h-7 border-zinc-700/60 hover:bg-zinc-800 text-zinc-400">
                  Voir tout <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_90px_70px_70px_80px_48px_32px] items-center gap-4 px-5 py-2 text-[10px] text-zinc-600 uppercase tracking-widest border-b border-zinc-800/30">
            <span>Repository / Commit</span>
            <span>Auteur</span>
            <span>Bloquants</span>
            <span>Warnings</span>
            <span>Durée</span>
            <span>Score</span>
            <span />
          </div>

          {/* Rows */}
          {insightsLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-600">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-sm">Chargement des analyses...</span>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/30">
              <AnimatePresence mode="popLayout">
                {filteredRows.slice(0, 20).map((analysis, i) => (
                  <AnalysisRow
                    key={analysis.id}
                    analysis={analysis}
                    index={i}
                    aiSummary={summaryByAnalysisId[analysis.id]}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {!insightsLoading && filteredRows.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-sm text-zinc-600">
              Aucune analyse trouvée pour ce filtre
            </motion.div>
          )}
        </motion.div>

        {/* ── AI PR Descriptions ── */}
        {insights.prSummaries.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={isLoaded ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.7, duration: 0.4 }}>
            <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800/60">
                <div className="size-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Sparkles className="size-3.5 text-violet-400" />
                </div>
                <h3 className="text-sm text-white">
                  {currentUser.role === "developer" ? "Descriptions IA de vos PRs" : "Descriptions IA des PRs récentes"}
                </h3>
              </div>
              <div className="divide-y divide-zinc-800/30">
                {insights.prSummaries.slice(0, 5).map((summary, i) => (
                  <motion.div
                    key={summary.analysisId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="px-5 py-4 hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-violet-500/10 text-violet-300 border-0 text-[10px] px-2">{summary.repo}</Badge>
                      <Badge className="bg-zinc-800 text-zinc-400 border-0 text-[10px] px-2">
                        {summary.prNumber ? `PR #${summary.prNumber}` : (summary.commitSha ?? "Commit")}
                      </Badge>
                      <Badge className={`border-0 text-[10px] px-2 capitalize ${summary.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-400" : summary.status === "FAILED" ? "bg-red-500/15 text-red-400" : "bg-zinc-700 text-zinc-400"}`}>
                        {summary.status?.toLowerCase() ?? "—"}
                      </Badge>
                      {summary.createdAt && (
                        <span className="text-[10px] text-zinc-600 ml-auto">
                          {new Date(summary.createdAt).toLocaleString("fr-FR")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{summary.summary}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Launch Analysis Dialog ── */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-3xl bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Lancer une nouvelle analyse</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Deux modes disponibles: import local (dossier/diff) ou analyse distante GitHub (PR/commit ou repo complet).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {importedProjectSummary && (
              <div className="rounded-lg border border-violet-800/40 bg-violet-500/10 px-3 py-2 text-sm text-violet-300">
                <p className="font-medium">{importedProjectSummary.folderName}</p>
                <p className="text-xs text-violet-400/70 mt-0.5">
                  {importedProjectSummary.importedFiles} fichiers importes, {importedProjectSummary.ignoredFiles} ignores,{" "}
                  {formatBytes(importedProjectSummary.totalBytes)} lus, diff genere: {formatBytes(importedProjectSummary.diffBytes)}.
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="analysis-repo-select" className="text-zinc-300">Repository GitHub (compte connecte)</Label>
              <Select
                value={githubRepoSelection}
                onValueChange={(value) => {
                  setGithubRepoSelection(value);
                  if (value !== "manual") setRepoInput(value);
                }}
              >
                <SelectTrigger id="analysis-repo-select" className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder={isLoadingGithubRepos ? "Chargement des repositories GitHub..." : "Choisir un repository GitHub"} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="manual" className="text-zinc-200">Saisie manuelle</SelectItem>
                  {githubRepos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.fullName} className="text-zinc-200">
                      {repo.fullName}{repo.private ? " (prive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {githubReposError && <p className="text-xs text-amber-400">{githubReposError}</p>}
              {githubConnected === false && !githubReposError && (
                <p className="text-xs text-zinc-500">Aucun compte GitHub connecte detecte pour cet utilisateur.</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="analysis-repo" className="text-zinc-300">Repository</Label>
              <Input
                id="analysis-repo"
                placeholder="ex: owner/repo ou backend-api"
                value={repoInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setRepoInput(next);
                  if (githubRepoSelection !== "manual" && next.trim() !== githubRepoSelection) setGithubRepoSelection("manual");
                }}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-600"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="analysis-pr" className="text-zinc-300">Numero PR (optionnel)</Label>
                <Input id="analysis-pr" placeholder="ex: 456" value={prNumberInput} onChange={(e) => setPrNumberInput(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-600" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="analysis-commit" className="text-zinc-300">Commit SHA (optionnel)</Label>
                <Input id="analysis-commit" placeholder="ex: a1b2c3d4" value={commitShaInput} onChange={(e) => setCommitShaInput(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-600" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="analysis-diff" className="text-zinc-300">Diff technique (optionnel en mode GitHub distant)</Label>
              <Textarea
                id="analysis-diff"
                value={diffInput}
                onChange={(e) => setDiffInput(e.target.value)}
                placeholder="Importez un dossier ou collez un diff unifie (.patch/.diff)."
                className="min-h-[200px] font-mono text-xs bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-600"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={openImportDialog} disabled={isImportingProject || isSubmittingAnalysis} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
              <Upload className="size-4 mr-1.5" />
              Importer un dossier
            </Button>
            <Button onClick={handleLaunchAnalysis} disabled={isSubmittingAnalysis || isImportingProject} className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0">
              {isSubmittingAnalysis ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Play className="size-4 mr-1.5" />}
              {isSubmittingAnalysis ? "Lancement..." : "Lancer une analyse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
