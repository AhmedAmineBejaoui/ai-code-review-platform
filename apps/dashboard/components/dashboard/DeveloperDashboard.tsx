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
import { fetchDashboardAnalyses, type DashboardAnalysisItem } from "@/lib/dashboard-analyses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    let cancelled = false;
    setInsightsLoading(true);
    Promise.all([fetchDashboardInsights(), fetchDashboardAnalyses()])
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
    const interval = setInterval(async () => {
      const analysesPayload = await fetchDashboardAnalyses();
      if (!cancelled) {
        setAnalysisRows(analysesPayload);
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const input = projectFolderInputRef.current;
    if (!input) {
      return;
    }
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

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

  const refreshDashboardData = async () => {
    setInsightsLoading(true);
    try {
      const [insightsPayload, analysesPayload] = await Promise.all([
        fetchDashboardInsights(),
        fetchDashboardAnalyses(),
      ]);
      setInsights(insightsPayload);
      setAnalysisRows(analysesPayload);
    } finally {
      setInsightsLoading(false);
    }
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
    if (!normalizedDiff) {
      setFormError("Importez un dossier de code ou collez un diff avant de lancer l'analyse.");
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
          diff_text: normalizedDiff,
          metadata: {
            triggered_from: "developer_dashboard",
            imported_diff: true,
            imported_file_name: importedProjectSummary?.folderName ?? null,
            import_mode: importedProjectSummary ? "folder" : "manual_diff",
            workspace_source: importedProjectSummary ? "imported_folder_snapshot" : "manual_diff",
            imported_folder_name: importedProjectSummary?.folderName ?? null,
            imported_files_count: importedProjectSummary?.importedFiles ?? null,
            ignored_files_count: importedProjectSummary?.ignoredFiles ?? null,
            imported_text_bytes: importedProjectSummary?.totalBytes ?? null,
            synthetic_diff_bytes: importedProjectSummary?.diffBytes ?? null,
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
      await refreshDashboardData();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de lancer l'analyse.";
      setFormError(message);
    } finally {
      setIsSubmittingAnalysis(false);
    }
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex justify-between items-start">
        <div>
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Dashboard
          </motion.h1>
          <motion.p 
            className="text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {currentUser.role === 'reviewer' || currentUser.role === 'admin' 
              ? 'Vue d\'ensemble des analyses de l\'Ã©quipe' 
              : 'Suivi de vos analyses'}
          </motion.p>
        </div>
        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              className="gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600"
              onClick={openImportDialog}
              disabled={isImportingProject || isSubmittingAnalysis}
            >
              {isImportingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isImportingProject ? "Import..." : "Importer"}
            </Button>
            <input
              ref={projectFolderInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleProjectFolderImport}
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25"
              onClick={openLaunchDialog}
              disabled={isSubmittingAnalysis}
            >
              {isSubmittingAnalysis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Lancer une analyse
            </Button>
          </motion.div>
        </div>
      </motion.div>

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

      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lancer une nouvelle analyse</DialogTitle>
            <DialogDescription>
              Importez un dossier de code complet. Le dashboard genere un snapshot diff multi-fichiers puis le backend reconstruit un workspace temporaire pour l'analyse.
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
              <Label htmlFor="analysis-repo">Repository</Label>
              <Input
                id="analysis-repo"
                placeholder="ex: backend-api"
                value={repoInput}
                onChange={(event) => setRepoInput(event.target.value)}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="analysis-pr">Numero PR (optionnel)</Label>
                <Input
                  id="analysis-pr"
                  placeholder="ex: 456"
                  value={prNumberInput}
                  onChange={(event) => setPrNumberInput(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="analysis-commit">Commit SHA (optionnel)</Label>
                <Input
                  id="analysis-commit"
                  placeholder="ex: a1b2c3d4"
                  value={commitShaInput}
                  onChange={(event) => setCommitShaInput(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="analysis-diff">Diff technique genere a partir du dossier</Label>
              <Textarea
                id="analysis-diff"
                value={diffInput}
                onChange={(event) => setDiffInput(event.target.value)}
                placeholder="Importez un dossier ou collez ici un diff unifie (.patch/.diff)"
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

      {/* Stats Cards */}
      <motion.div className="grid md:grid-cols-3 gap-6" variants={item}>
        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="relative overflow-hidden border-red-500/20 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Security BLOCKER</CardTitle>
              <motion.div 
                className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <AlertCircle className="h-5 w-5 text-white" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold bg-gradient-to-br from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                {atRiskPRs.reduce((acc, a) => acc + a.blockerCount, 0)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {atRiskPRs.length} PR Ã  risque
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="relative overflow-hidden border-orange-500/20 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Quality WARN</CardTitle>
              <motion.div 
                className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <AlertTriangle className="h-5 w-5 text-white" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold bg-gradient-to-br from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 bg-clip-text text-transparent">
                {analysisRows.reduce((acc, analysis) => acc + analysis.warnCount, 0)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Warnings dÃ©tectÃ©s
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="relative overflow-hidden border-green-500/20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyses rÃ©ussies</CardTitle>
              <motion.div 
                className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <CheckCircle2 className="h-5 w-5 text-white" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                {analysisRows.filter((analysis) => normalizeStatus(analysis.status) === "COMPLETED").length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Sur {analysisRows.length} analyses
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* LLM PR Summaries */}
      <motion.div variants={item}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              {currentUser.role === "developer"
                ? "Descriptions LLM de vos PRs"
                : "Descriptions LLM des PRs recentes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Chargement des descriptions...</p>
            ) : recentPrSummaries.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Aucune description PR disponible pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {recentPrSummaries.map((summary) => (
                  <div
                    key={summary.analysisId}
                    className="rounded-xl border border-gray-200/60 bg-white/60 p-4 dark:border-gray-700/60 dark:bg-gray-900/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{summary.repo}</Badge>
                      <Badge variant="secondary">
                        {summary.prNumber ? `PR #${summary.prNumber}` : (summary.commitSha ?? "Commit")}
                      </Badge>
                      <Badge variant="outline">{summary.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{summary.summary}</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {summary.authorLabel ? `${summary.authorLabel} · ` : ""}
                      {summary.createdAt ? new Date(summary.createdAt).toLocaleString("fr-FR") : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Repository</label>
                <Select defaultValue="all">
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les repos</SelectItem>
                    <SelectItem value="backend-api">backend-api</SelectItem>
                    <SelectItem value="frontend-app">frontend-app</SelectItem>
                    <SelectItem value="mobile-app">mobile-app</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">PÃ©riode</label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 derniers jours</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">SÃ©vÃ©ritÃ©</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="BLOCKER">BLOCKER uniquement</SelectItem>
                    <SelectItem value="WARN">WARN et plus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Analyses */}
      <motion.div variants={item}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Analyses rÃ©centes
              </CardTitle>
              <Link href="/dashboard/analyses">
                <Button variant="ghost" size="sm" className="gap-2 group">
                  Voir tout
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAnalyses.map((analysis, index) => (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4, scale: 1.01 }}
                  className="group"
                >
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                    <div className="flex-shrink-0">
                      {getStatusIcon(analysis.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{analysis.repo}</span>
                        <span className="text-gray-400">â€¢</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">{analysis.prLabel}</span>
                        {getStatusBadge(analysis.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{analysis.author}</span>
                        <span>â€¢</span>
                        <span>{new Date(analysis.createdAt).toLocaleString('fr-FR', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                        <span>â€¢</span>
                        <span>{analysis.durationLabel}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {analysis.blockerCount > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {analysis.blockerCount}
                        </Badge>
                      )}
                      {analysis.warnCount > 0 && (
                        <Badge className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          <AlertTriangle className="h-3 w-3" />
                          {analysis.warnCount}
                        </Badge>
                      )}
                      {analysis.infoCount > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Info className="h-3 w-3" />
                          {analysis.infoCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {normalizeStatus(analysis.status) === "COMPLETED" &&
                        analysis.blockerCount + analysis.warnCount + analysis.infoCount > 0 && (
                        <>
                          <Link href={`/dashboard/report/${analysis.id}`}>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button variant="outline" size="sm">
                                Rapport
                              </Button>
                            </motion.div>
                          </Link>
                          <Link href={`/dashboard/diff/${analysis.id}`}>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                Voir le diff
                              </Button>
                            </motion.div>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
