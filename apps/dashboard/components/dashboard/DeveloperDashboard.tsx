"use client";
/* eslint-disable react/no-unescaped-entities */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Play,
  Upload,
  Info,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider";
import { emptyDashboardInsights, fetchDashboardInsights } from "@/lib/dashboard-insights";
import {
  fetchDashboardAnalyses,
  hasActiveDashboardAnalysis,
  type DashboardAnalysisItem,
} from "@/lib/dashboard-analyses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
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

type LaunchAnalysisResponse = {
  analysis_id?: string;
  status?: string;
  task_id?: string | null;
  error?: string;
  backend_response?: {
    message?: string;
    detail?: string;
  };
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

type ImportedProjectFile = {
  path: string;
  content: string;
};

type ImportedProjectSummary = {
  folderName: string;
  importedFiles: number;
  ignoredFiles: number;
  totalBytes: number;
  diffBytes: number;
};

const IMPORT_EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".turbo",
  ".vercel",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".ruff_cache",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".idea",
  ".vscode",
]);

const IMPORT_EXCLUDED_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "poetry.lock",
  "semgrep_out.json",
  "semgrep_err.txt",
  "Thumbs.db",
]);

const IMPORT_SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".kt",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".swift",
  ".sql",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".env",
  ".md",
  ".txt",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".xml",
  ".sh",
  ".ps1",
  ".bat",
]);

const IMPORT_SUPPORTED_BASENAMES = new Set([
  ".env",
  ".env.example",
  ".gitignore",
  "Dockerfile",
  "Makefile",
]);

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
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    return {
      rootFolderName: parts[0],
      relativePath: parts[0],
    };
  }
  return {
    rootFolderName: parts[0],
    relativePath: parts.slice(1).join("/"),
  };
}

function shouldIgnoreImportedPath(relativePath: string): boolean {
  const parts = normalizeImportPath(relativePath).split("/").filter(Boolean);
  if (parts.length === 0) {
    return true;
  }
  if (parts.some((part) => IMPORT_EXCLUDED_DIRECTORIES.has(part))) {
    return true;
  }
  const fileName = parts[parts.length - 1];
  if (IMPORT_EXCLUDED_FILES.has(fileName)) {
    return true;
  }
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  return !(IMPORT_SUPPORTED_EXTENSIONS.has(extension) || IMPORT_SUPPORTED_BASENAMES.has(fileName));
}

function isTextContent(content: string): boolean {
  return !content.includes("\u0000");
}

function synthesizeFolderSnapshotDiff(files: ImportedProjectFile[]): string {
  return files
    .map(({ path, content }) => {
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
    })
    .join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DeveloperDashboard() {
  const router = useRouter();
  const currentUser = useDashboardUser();
  const [timeFilter, setTimeFilter] = useState("7");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insights, setInsights] = useState(() => emptyDashboardInsights(currentUser.role));
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
  const projectFolderInputRef = useRef<HTMLInputElement | null>(null);

  const recentAnalyses = analysisRows.slice(0, 5);
  const atRiskPRs = analysisRows.filter((analysis) => analysis.blockerCount > 0);
  const recentPrSummaries = insights.prSummaries.slice(0, currentUser.role === "developer" ? 5 : 8);

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // All the effects and functions
  useEffect(() => {
    let cancelled = false;
    setInsightsLoading(true);
    Promise.all([fetchDashboardInsights(), fetchDashboardAnalyses({ force: true, size: 40 })])
      .then(([insightsPayload, analysesPayload]) => {
        if (cancelled) {
          return;
        }
        setInsights(insightsPayload);
        setAnalysisRows(analysesPayload);
      })
      .finally(() => {
        if (!cancelled) {
          setInsightsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let isRefreshing = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refreshAnalyses = async () => {
      if (cancelled || isRefreshing) {
        return;
      }
      let latestItems = analysisRows;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        timeoutId = setTimeout(() => {
          void refreshAnalyses();
        }, 30_000);
        return;
      }
      isRefreshing = true;
      try {
        const analysesPayload = await fetchDashboardAnalyses({ force: true, size: 40 });
        latestItems = analysesPayload;
        if (!cancelled) {
          setAnalysisRows(analysesPayload);
        }
      } finally {
        isRefreshing = false;
        if (!cancelled) {
          const nextDelay = hasActiveDashboardAnalysis(latestItems) ? 10_000 : 30_000;
          timeoutId = setTimeout(() => {
            void refreshAnalyses();
          }, nextDelay);
        }
      }
    };

    timeoutId = setTimeout(() => {
      void refreshAnalyses();
    }, hasActiveDashboardAnalysis(analysisRows) ? 10_000 : 30_000);

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [analysisRows]);

  useEffect(() => {
    const input = projectFolderInputRef.current;
    if (!input) {
      return;
    }
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!analysisDialogOpen) {
      return;
    }
    void loadGithubRepos();
  }, [analysisDialogOpen]);

  useEffect(() => {
    if (githubRepoSelection === "manual") {
      return;
    }
    const stillExists = githubRepos.some((repo) => repo.fullName === githubRepoSelection);
    if (!stillExists) {
      setGithubRepoSelection("manual");
    }
  }, [githubRepoSelection, githubRepos]);

  const normalizeStatus = (status: string) => {
    const raw = status.trim().toUpperCase();
    if (raw === "DONE") {
      return "COMPLETED";
    }
    if (raw === "RUNNING" || raw === "FAILED" || raw === "QUEUED" || raw === "RECEIVED" || raw === "COMPLETED") {
      return raw;
    }
    return "QUEUED";
  };

  const getStatusIcon = (status: string) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "RUNNING":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const normalized = normalizeStatus(status);
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      COMPLETED: 'default',
      RUNNING: 'secondary',
      FAILED: 'destructive',
      QUEUED: 'outline',
      RECEIVED: 'outline',
    };
    return <Badge variant={variants[normalized] || 'outline'}>{normalized}</Badge>;
  };

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
    if (selectedFiles.length === 0) {
      return;
    }

    setIsImportingProject(true);
    setFormError(null);

    try {
      const acceptedFiles: ImportedProjectFile[] = [];
      let ignoredFiles = 0;
      let totalBytes = 0;
      let folderName = "local-project";

      for (const file of selectedFiles) {
        const importPath = getFolderImportPath(file);
        if (!importPath) {
          ignoredFiles += 1;
          continue;
        }

        folderName = importPath.rootFolderName || folderName;

        if (
          shouldIgnoreImportedPath(importPath.relativePath) ||
          file.size > MAX_IMPORTED_FILE_BYTES ||
          acceptedFiles.length >= MAX_IMPORTED_PROJECT_FILES
        ) {
          ignoredFiles += 1;
          continue;
        }

        const nextTotalBytes = totalBytes + file.size;
        if (nextTotalBytes > MAX_IMPORTED_TOTAL_BYTES) {
          ignoredFiles += 1;
          continue;
        }

        const importedText = await file.text();
        if (!isTextContent(importedText)) {
          ignoredFiles += 1;
          continue;
        }

        acceptedFiles.push({
          path: importPath.relativePath,
          content: importedText,
        });
        totalBytes = nextTotalBytes;
      }

      if (acceptedFiles.length === 0) {
        throw new Error("Aucun fichier texte exploitable n'a ete trouve dans le dossier selectionne.");
      }

      const syntheticDiff = synthesizeFolderSnapshotDiff(acceptedFiles);
      const diffBytes = textEncoder.encode(syntheticDiff).length;
      if (diffBytes > MAX_SYNTHETIC_DIFF_BYTES) {
        throw new Error(
          `Le snapshot du dossier depasse la taille maximale analysee (${formatBytes(diffBytes)} > ${formatBytes(MAX_SYNTHETIC_DIFF_BYTES)}).`,
        );
      }

      setDiffInput(syntheticDiff);
      setImportedProjectSummary({
        folderName,
        importedFiles: acceptedFiles.length,
        ignoredFiles,
        totalBytes,
        diffBytes,
      });
      if (!repoInput.trim()) {
        const inferredRepo = folderName.replace(/\s+/g, "-");
        if (inferredRepo.trim()) {
          setRepoInput(inferredRepo.trim());
        }
      }

      setAnalysisDialogOpen(true);
      setActionMessage(
        `Dossier importe: ${folderName} (${acceptedFiles.length} fichiers, ${formatBytes(totalBytes)} de texte utile).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import du dossier impossible.";
      setFormError(message);
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

    if (!normalizedRepo) {
      setFormError("Le repository est obligatoire.");
      return;
    }

    let parsedPrNumber: number | null = null;
    if (normalizedPrNumber.length > 0) {
      const asNumber = Number(normalizedPrNumber);
      if (!Number.isInteger(asNumber) || asNumber < 1) {
        setFormError("Le numero de PR doit etre un entier positif.");
        return;
      }
      parsedPrNumber = asNumber;
    }

    if (normalizedCommitSha.length > 0 && !/^[0-9a-fA-F]{6,64}$/.test(normalizedCommitSha)) {
      setFormError("Le commit SHA doit contenir 6 a 64 caracteres hexadecimaux.");
      return;
    }

    const isGithubRemoteMode = githubRepoSelection !== "manual" && importedProjectSummary === null;
    const hasGithubTarget = parsedPrNumber !== null || normalizedCommitSha.length > 0;
    const githubRemoteTargetMode = isGithubRemoteMode
      ? parsedPrNumber !== null
        ? "pr"
        : normalizedCommitSha.length > 0
          ? "commit"
          : "repo_snapshot"
      : null;

    if (!normalizedDiff && !isGithubRemoteMode) {
      setFormError("Importez un dossier de code ou collez un diff avant de lancer l'analyse.");
      return;
    }

    setIsSubmittingAnalysis(true);
    try {
      const response = await fetch("/api/dashboard/analyses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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
            analysis_input_mode: importedProjectSummary
              ? "local_folder_snapshot"
              : isGithubRemoteMode
                ? "github_remote"
                : "manual_diff",
            workspace_source: importedProjectSummary
              ? "imported_folder_snapshot"
              : isGithubRemoteMode
                ? "github_remote"
                : "manual_diff",
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
        const backendMessage =
          payload?.backend_response?.message ??
          payload?.backend_response?.detail ??
          payload?.error ??
          "Le backend a refuse la creation de l'analyse.";
        throw new Error(backendMessage);
      }

      const analysisId = typeof payload.analysis_id === "string" ? payload.analysis_id : null;
      setActionMessage(
        analysisId
          ? `Analyse lancee avec succes. ID: ${analysisId}`
          : "Analyse lancee avec succes.",
      );
      setAnalysisDialogOpen(false);
      setPrNumberInput("");
      setCommitShaInput("");
      setImportedProjectSummary(null);
      setGithubRepoSelection("manual");
      await refreshDashboardData();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de lancer l'analyse.";
      setFormError(message);
    } finally {
      setIsSubmittingAnalysis(false);
    }
  };

  const refreshDashboardData = async () => {
    setInsightsLoading(true);
    try {
      const [insightsPayload, analysesPayload] = await Promise.all([
        fetchDashboardInsights(),
        fetchDashboardAnalyses({ force: true, size: 40 }),
      ]);
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
      const response = await fetch("/api/dashboard/github/repos", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Impossible de recuperer les repositories GitHub.");
      }

      const payload = (await response.json().catch(() => ({}))) as GithubReposResponse;
      const items = Array.isArray(payload.items) ? payload.items : [];
      setGithubRepos(items);
      setGithubConnected(payload.connected === true);
      if (typeof payload.error === "string" && payload.error.trim().length > 0) {
        setGithubReposError(payload.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chargement des repositories GitHub impossible.";
      setGithubRepos([]);
      setGithubConnected(false);
      setGithubReposError(message);
    } finally {
      setIsLoadingGithubRepos(false);
    }
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Hero Section - Professional design with gradient background */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-3xl bg-gradient-hero p-8 shadow-pro-lg"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white/10 backdrop-blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/20 backdrop-blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">
                    AI Code Review
                  </h1>
                  <p className="text-lg text-white/80">
                    {currentUser.role === 'reviewer' || currentUser.role === 'admin'
                      ? 'Vue d\'ensemble des analyses de l\'équipe'
                      : 'Tableau de bord développeur'}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.p
              className="text-white/70 max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Analysez votre code avec l'intelligence artificielle pour détecter les vulnérabilités,
              améliorer la qualité et accélérer vos revues.
            </motion.p>
          </div>

          <div className="flex gap-4">
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="glass"
                size="lg"
                className="gap-2 text-white border-white/20 hover:border-white/40"
                onClick={openImportDialog}
                disabled={isImportingProject || isSubmittingAnalysis}
              >
                {isImportingProject ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                {isImportingProject ? "Import en cours..." : "Importer projet"}
              </Button>
              <input
                ref={projectFolderInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleProjectFolderImport}
              />
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="shine"
                size="lg"
                className="gap-2 bg-white text-primary hover:bg-white/90 shadow-pro-md"
                onClick={openLaunchDialog}
                disabled={isSubmittingAnalysis}
              >
                {isSubmittingAnalysis ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Nouvelle analyse
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Error/Success Messages */}
      {(formError || actionMessage) && (
        <motion.div variants={item}>
          <Card className={formError ? "border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20" : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20"}>
            <CardContent className="pt-4">
              {formError ? (
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{formError}</p>
              ) : (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{actionMessage}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Professional Stats Cards with animation */}
      <motion.div className="grid gap-6 md:grid-cols-3" variants={item}>
        <StatCard
          title="Security Issues"
          value={atRiskPRs.reduce((acc, a) => acc + a.blockerCount, 0)}
          icon={AlertCircle}
          iconColor="red"
          trend={{ value: atRiskPRs.length, label: "PRs à risque" }}
          variant="elevated"
        />

        <StatCard
          title="Quality Warnings"
          value={analysisRows.reduce((acc, analysis) => acc + analysis.warnCount, 0)}
          icon={AlertTriangle}
          iconColor="amber"
          trend={{ value: 0, label: "Warnings détectés" }}
          variant="elevated"
        />

        <StatCard
          title="Analyses réussies"
          value={analysisRows.filter((analysis) => normalizeStatus(analysis.status) === "COMPLETED").length}
          icon={CheckCircle2}
          iconColor="green"
          trend={{ value: analysisRows.length, label: `sur ${analysisRows.length} analyses` }}
          variant="elevated"
        />
      </motion.div>

      {/* Enhanced Recent Analyses Section */}
      <motion.div variants={item} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Analyses récentes</h2>
            <p className="text-muted-foreground">
              Suivez l'évolution de vos analyses de code en temps réel
            </p>
          </div>
          <Link href="/dashboard/analyses">
            <Button variant="outline" className="gap-2">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {recentAnalyses.map((analysis, index) => (
            <motion.div
              key={analysis.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-pro-lg transition-all duration-300 border-border shadow-pro-md hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(analysis.status)}
                        <h3 className="font-semibold">{analysis.repo}</h3>
                        {analysis.prNumber && (
                          <Badge variant="outline">PR #{analysis.prNumber}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {analysis.commitSha ? `Commit ${analysis.commitSha.slice(0, 8)}` : 'Analyse complète'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {analysis.blockerCount > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">{analysis.blockerCount}</span>
                        </div>
                      )}
                      {analysis.warnCount > 0 && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">{analysis.warnCount}</span>
                        </div>
                      )}
                      {getStatusBadge(analysis.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* LLM PR Summaries - Enhanced */}
      <motion.div variants={item}>
        <Card className="glass-pro border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              {currentUser.role === "developer"
                ? "Descriptions IA de vos PRs"
                : "Descriptions IA des PRs récentes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des descriptions...
              </div>
            ) : recentPrSummaries.length === 0 ? (
              <p className="text-muted-foreground">Aucune description PR disponible pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {recentPrSummaries.map((summary) => (
                  <motion.div
                    key={summary.analysisId}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-muted/40 shadow-pro-sm hover:shadow-pro-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{summary.repo}</Badge>
                          <Badge variant="secondary">
                            {summary.prNumber ? `PR #${summary.prNumber}` : (summary.commitSha ?? "Commit")}
                          </Badge>
                          <Badge variant="outline" className="capitalize">{summary.status}</Badge>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed mb-3">{summary.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {summary.authorLabel ? `${summary.authorLabel} · ` : ""}
                          {summary.createdAt ? new Date(summary.createdAt).toLocaleString("fr-FR") : ""}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Complete Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lancer une nouvelle analyse</DialogTitle>
            <DialogDescription>
              Deux modes sont disponibles: import local (dossier/diff) ou analyse distante GitHub (PR/commit ou repo complet).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {importedProjectSummary && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                <p className="font-medium">{importedProjectSummary.folderName}</p>
                <p>
                  {importedProjectSummary.importedFiles} fichiers importes, {importedProjectSummary.ignoredFiles} ignores,{" "}
                  {formatBytes(importedProjectSummary.totalBytes)} lus, diff genere: {formatBytes(importedProjectSummary.diffBytes)}.
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="analysis-repo-select">Repository GitHub (compte connecte)</Label>
              <Select
                value={githubRepoSelection}
                onValueChange={(value) => {
                  setGithubRepoSelection(value);
                  if (value !== "manual") {
                    setRepoInput(value);
                  }
                }}
              >
                <SelectTrigger
                  id="analysis-repo-select"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  <SelectValue
                    placeholder={
                      isLoadingGithubRepos
                        ? "Chargement des repositories GitHub..."
                        : "Choisir un repository GitHub"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Saisie manuelle</SelectItem>
                  {githubRepos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.fullName}>
                      {repo.fullName}{repo.private ? " (prive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {githubReposError && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{githubReposError}</p>
              )}
              {githubConnected === false && !githubReposError && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Aucun compte GitHub connecte detecte pour cet utilisateur.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="analysis-repo">Repository</Label>
              <Input
                id="analysis-repo"
                placeholder="ex: owner/repo ou backend-api"
                value={repoInput}
                onChange={(event) => {
                  const next = event.target.value;
                  setRepoInput(next);
                  if (githubRepoSelection !== "manual" && next.trim() !== githubRepoSelection) {
                    setGithubRepoSelection("manual");
                  }
                }}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="analysis-pr">Numero PR (optionnel)</Label>
                <Input
                  id="analysis-pr"
                  placeholder="ex: 456 (laisser vide = repo complet)"
                  value={prNumberInput}
                  onChange={(event) => setPrNumberInput(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="analysis-commit">Commit SHA (optionnel)</Label>
                <Input
                  id="analysis-commit"
                  placeholder="ex: a1b2c3d4 (laisser vide = repo complet)"
                  value={commitShaInput}
                  onChange={(event) => setCommitShaInput(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="analysis-diff">Diff technique (optionnel en mode GitHub distant)</Label>
              <Textarea
                id="analysis-diff"
                value={diffInput}
                onChange={(event) => setDiffInput(event.target.value)}
                placeholder="Importez un dossier ou collez un diff unifie (.patch/.diff). En mode GitHub distant, laissez vide (PR/commit ou repo complet)."
                className="min-h-[220px] font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={openImportDialog}
              disabled={isImportingProject || isSubmittingAnalysis}
            >
              <Upload className="h-4 w-4" />
              Importer un dossier
            </Button>
            <Button onClick={handleLaunchAnalysis} disabled={isSubmittingAnalysis || isImportingProject}>
              {isSubmittingAnalysis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isSubmittingAnalysis ? "Lancement..." : "Lancer une analyse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}