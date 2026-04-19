"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Filter, SlidersHorizontal, ChevronDown, ChevronUp,
  Eye, Trash2, RotateCw, GitCompare, AlertCircle, AlertTriangle,
  Info, Clock, CheckCircle2, XCircle, Loader2, Plus, CalendarDays,
  FolderGit2, GitBranch, BarChart3, Activity, Zap, ArrowUpDown,
  ArrowUp, ArrowDown, ListFilter, RefreshCw, Terminal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnalysesPageHeader } from "@/components/dashboard/AnalysesPageHeader"
import {
  deleteDashboardAnalysis,
  fetchDashboardAnalyses,
  hasActiveDashboardAnalysis,
  type DashboardAnalysisItem,
} from "@/lib/dashboard-analyses"
import { normalizeAnalysisStatus as normalizeStatus } from "@/lib/domain/analysis-status"
import AgentPlan from "@/components/ui/agent-plan"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: string) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

type SortField = "created_at" | "status" | "repo" | "findings"
type SortDir = "asc" | "desc"

// ─── Status UI helpers ────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType; dot: string }> = {
  COMPLETED:  { label: "Terminé",     color: "text-emerald-400", icon: CheckCircle2, dot: "bg-emerald-500" },
  FAILED:     { label: "Échoué",      color: "text-red-400",     icon: XCircle,      dot: "bg-red-500" },
  RUNNING:    { label: "En cours",    color: "text-violet-400",  icon: Loader2,      dot: "bg-violet-500" },
  QUEUED:     { label: "En attente",  color: "text-amber-400",   icon: Clock,        dot: "bg-amber-500" },
  RECEIVED:   { label: "Reçu",        color: "text-blue-400",    icon: Activity,     dot: "bg-blue-500" },
  PENDING:    { label: "Pending",     color: "text-zinc-400",    icon: Clock,        dot: "bg-zinc-500" },
}

function getStatusMeta(raw: string) {
  const normalized = normalizeStatus(raw)?.toUpperCase() ?? raw?.toUpperCase() ?? "PENDING"
  return STATUS_META[normalized] ?? STATUS_META["PENDING"]
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function FindingsBadge({ blockers = 0, warns = 0, infos = 0 }: { blockers?: number; warns?: number; infos?: number }) {
  if (blockers === 0 && warns === 0 && infos === 0)
    return <span className="text-xs text-zinc-600">—</span>
  return (
    <div className="flex items-center gap-1">
      {blockers > 0 && (
        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-red-400">
          <AlertCircle className="h-3 w-3" />{blockers}
        </span>
      )}
      {warns > 0 && (
        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-400">
          <AlertTriangle className="h-3 w-3" />{warns}
        </span>
      )}
      {infos > 0 && (
        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-blue-400">
          <Info className="h-3 w-3" />{infos}
        </span>
      )}
    </div>
  )
}

// ─── Sidebar filters ──────────────────────────────────────────────────────────

const FILTER_SECTIONS = [
  {
    key: "time",
    label: "Période",
    icon: CalendarDays,
    options: [
      { value: "today",   label: "Aujourd'hui" },
      { value: "week",    label: "Cette semaine" },
      { value: "month",   label: "Ce mois" },
      { value: "all",     label: "Tout" },
    ],
  },
  {
    key: "status",
    label: "Statut",
    icon: Activity,
    options: [
      { value: "COMPLETED", label: "Terminé" },
      { value: "RUNNING",   label: "En cours" },
      { value: "QUEUED",    label: "En attente" },
      { value: "FAILED",    label: "Échoué" },
      { value: "RECEIVED",  label: "Reçu" },
    ],
  },
  {
    key: "severity",
    label: "Sévérité",
    icon: AlertTriangle,
    options: [
      { value: "blocker",  label: "Bloquants" },
      { value: "warn",     label: "Avertissements" },
      { value: "info",     label: "Informatifs" },
      { value: "clean",    label: "Sans findings" },
    ],
  },
]

function SidebarFilter({
  activeTime, activeStatuses, activeSeverity,
  onTimeChange, onStatusToggle, onSeverityToggle,
}: {
  activeTime: string
  activeStatuses: string[]
  activeSeverity: string[]
  onTimeChange: (v: string) => void
  onStatusToggle: (v: string) => void
  onSeverityToggle: (v: string) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  return (
    <aside className="w-56 flex-shrink-0 border-r border-zinc-800/60 bg-zinc-950/40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <ListFilter className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Filtres</span>
        </div>
        <button
          onClick={() => { onTimeChange("all"); activeStatuses.forEach(onStatusToggle); activeSeverity.forEach(onSeverityToggle) }}
          className="text-[10px] text-zinc-600 hover:text-violet-400 transition-colors"
        >
          Reset
        </button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="py-2">
          {FILTER_SECTIONS.map((section) => {
            const isCollapsed = collapsed[section.key]
            return (
              <div key={section.key} className="mb-1">
                <button
                  className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  onClick={() => setCollapsed((p) => ({ ...p, [section.key]: !p[section.key] }))}
                >
                  <div className="flex items-center gap-2">
                    <section.icon className="h-3.5 w-3.5" />
                    {section.label}
                  </div>
                  {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </button>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-2 space-y-0.5">
                        {section.options.map((opt) => {
                          const isTime = section.key === "time"
                          const isStatus = section.key === "status"
                          const isActive = isTime
                            ? activeTime === opt.value
                            : isStatus
                            ? activeStatuses.includes(opt.value)
                            : activeSeverity.includes(opt.value)

                          const toggle = isTime
                            ? () => onTimeChange(opt.value)
                            : isStatus
                            ? () => onStatusToggle(opt.value)
                            : () => onSeverityToggle(opt.value)

                          return (
                            <button
                              key={opt.value}
                              onClick={toggle}
                              className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-all ${
                                isActive
                                  ? "bg-violet-500/15 text-violet-300 font-medium"
                                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                              }`}
                            >
                              {!isTime && (
                                <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                  isActive ? "bg-violet-400" : "bg-zinc-700"
                                }`} />
                              )}
                              {isTime && (
                                <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                  isActive ? "bg-violet-500" : "border border-zinc-700"
                                }`} />
                              )}
                              {opt.label}
                              {section.key === "status" && STATUS_META[opt.value] && (
                                <span className={`ml-auto h-1.5 w-1.5 rounded-full ${STATUS_META[opt.value].dot}`} />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mx-4 border-t border-zinc-800/40" />
              </div>
            )
          })}

          {/* Recent filters section */}
          <div className="px-4 pt-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Vues rapides</p>
            {[
              { label: "En cours d'analyse", icon: Loader2, action: () => onStatusToggle("RUNNING") },
              { label: "Nécessite attention", icon: AlertCircle, action: () => onStatusToggle("FAILED") },
              { label: "Archivé", icon: FolderGit2, action: () => onTimeChange("all") },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}

// ─── Sort header cell ─────────────────────────────────────────────────────────

function SortHeader({ field, label, current, dir, onSort }: {
  field: SortField; label: string; current: SortField; dir: SortDir
  onSort: (f: SortField) => void
}) {
  const active = field === current
  return (
    <button
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"
      }`}
      onClick={() => onSort(field)}
    >
      {label}
      {active ? (
        dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

function AnalysisRow({
  item, selected, onSelect, onDelete, index,
}: {
  item: DashboardAnalysisItem; selected: boolean
  onSelect: () => void; onDelete: () => void; index: number
}) {
  const status = getStatusMeta(item.status)
  const StatusIcon = status.icon
  const projectTargetId = item.projectId && item.projectId.trim().length > 0 ? item.projectId : item.id
  const isActive = ["RUNNING", "QUEUED", "RECEIVED"].includes(
    normalizeStatus(item.status)?.toUpperCase() ?? ""
  )

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`group border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/60 ${
        selected ? "bg-violet-500/5" : ""
      }`}
    >
      {/* Checkbox */}
      <td className="w-10 pl-4 pr-2 py-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          className="border-zinc-700 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
        />
      </td>

      {/* Status */}
      <td className="py-3 pr-4 w-28">
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${status.dot} ${isActive ? "animate-pulse" : ""}`} />
          <StatusIcon className={`h-3.5 w-3.5 ${status.color} ${isActive ? "animate-spin" : ""} flex-shrink-0`}
            style={isActive && StatusIcon !== Loader2 ? {} : undefined}
          />
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
      </td>

      {/* Repo + PR */}
      <td className="py-3 pr-4 min-w-0">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <FolderGit2 className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
            <span className="text-sm font-medium text-zinc-200 truncate">
              {item.repo || "—"}
            </span>
          </div>
          {item.prLabel && item.prLabel !== "Commit" && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <GitBranch className="h-3 w-3" />
              <span className="truncate">{item.prLabel}</span>
            </div>
          )}
        </div>
      </td>

      {/* Findings */}
      <td className="py-3 pr-4 w-32">
        <FindingsBadge
          blockers={item.blockerCount}
          warns={item.warnCount}
          infos={item.infoCount}
        />
      </td>

      {/* Date */}
      <td className="py-3 pr-4 w-32">
        <span className="text-xs text-zinc-500">{formatDate(item.createdAt)}</span>
      </td>

      {/* Actions */}
      <td className="py-3 pr-4 w-32">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/dashboard/projects/${encodeURIComponent(projectTargetId)}`}>
            <Button
              size="icon"
              variant="ghost"
              title="Voir le projet"
              className="h-7 w-7 text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href={`/dashboard/diff/${encodeURIComponent(item.id)}`}>
            <Button
              size="icon"
              variant="ghost"
              title="Voir le diff"
              className="h-7 w-7 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            >
              <GitCompare className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            title="Supprimer"
            onClick={onDelete}
            className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </motion.tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AnalysesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-derived state
  const filter = searchParams.get("filter") ?? "all"
  const status = searchParams.get("status") ?? ""
  const action = searchParams.get("action") ?? ""

  // Data state
  const [analyses, setAnalyses] = useState<DashboardAnalysisItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null)
  const analysesRef = useRef<DashboardAnalysisItem[]>(analyses)
  analysesRef.current = analyses

  // UI state
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeTime, setActiveTime] = useState(filter !== "all" ? filter : "all")
  const [activeStatuses, setActiveStatuses] = useState<string[]>(status ? [status.toUpperCase()] : [])
  const [activeSeverity, setActiveSeverity] = useState<string[]>([])
  const [showAgentPlan, setShowAgentPlan] = useState(false)
  const [hasActive, setHasActive] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchDashboardAnalyses({ size: 200 })
      setAnalyses(data)
      setHasActive(hasActiveDashboardAnalysis(data))
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Poll when there are active analyses
  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(async () => {
      const data = await fetchDashboardAnalyses({ size: 200 }).catch(() => analysesRef.current)
      setAnalyses(data)
      setHasActive(hasActiveDashboardAnalysis(data))
    }, 8_000)
    return () => clearInterval(id)
  }, [hasActive])

  // Show agent plan when active analysis exists
  useEffect(() => {
    setShowAgentPlan(hasActive)
  }, [hasActive])

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("desc") }
  }

  const toggleStatus = (s: string) =>
    setActiveStatuses((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])

  const toggleSeverity = (s: string) =>
    setActiveSeverity((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette analyse ?")) return
    setDeleteBusy(id)
    await deleteDashboardAnalysis(id).catch(() => {})
    setAnalyses((p) => p.filter((a) => a.id !== id))
    setDeleteBusy(null)
  }

  // Filtering + sorting
  const filtered = useMemo(() => {
    let list = [...analyses]

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          (a.repo ?? "").toLowerCase().includes(q) ||
          (a.prLabel ?? "").toLowerCase().includes(q) ||
          (a.author ?? "").toLowerCase().includes(q)
      )
    }

    // Time filter
    const now = Date.now()
    if (activeTime === "today") {
      list = list.filter((a) => now - new Date(a.createdAt).getTime() < 86_400_000)
    } else if (activeTime === "week") {
      list = list.filter((a) => now - new Date(a.createdAt).getTime() < 7 * 86_400_000)
    } else if (activeTime === "month") {
      list = list.filter((a) => now - new Date(a.createdAt).getTime() < 30 * 86_400_000)
    }

    // Status filter
    if (activeStatuses.length > 0) {
      list = list.filter((a) =>
        activeStatuses.includes(normalizeStatus(a.status)?.toUpperCase() ?? a.status?.toUpperCase() ?? "")
      )
    }

    // Severity filter
    if (activeSeverity.length > 0) {
      list = list.filter((a) => {
        if (activeSeverity.includes("blocker") && (a.blockerCount ?? 0) > 0) return true
        if (activeSeverity.includes("warn") && (a.warnCount ?? 0) > 0) return true
        if (activeSeverity.includes("info") && (a.infoCount ?? 0) > 0) return true
        if (activeSeverity.includes("clean") && (a.blockerCount ?? 0) === 0 && (a.warnCount ?? 0) === 0 && (a.infoCount ?? 0) === 0) return true
        return false
      })
    }

    // Sort
    list.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0
      if (sortField === "created_at") { av = a.createdAt ?? ""; bv = b.createdAt ?? "" }
      if (sortField === "status") { av = a.status ?? ""; bv = b.status ?? "" }
      if (sortField === "repo") { av = a.repo ?? ""; bv = b.repo ?? "" }
      if (sortField === "findings") { av = (a.blockerCount ?? 0) * 100 + (a.warnCount ?? 0); bv = (b.blockerCount ?? 0) * 100 + (b.warnCount ?? 0) }
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })

    return list
  }, [analyses, search, activeTime, activeStatuses, activeSeverity, sortField, sortDir])

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id))
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map((a) => a.id)))
  }

  const stats = useMemo(() => ({
    total: analyses.length,
    completed: analyses.filter((a) => normalizeStatus(a.status)?.toUpperCase() === "COMPLETED").length,
    running: analyses.filter((a) => ["RUNNING","QUEUED","RECEIVED"].includes(normalizeStatus(a.status)?.toUpperCase() ?? "")).length,
    failed: analyses.filter((a) => normalizeStatus(a.status)?.toUpperCase() === "FAILED").length,
  }), [analyses])

  return (
    <div className="flex h-full flex-col">
      {/* Header with new analysis button */}
      <div className="px-6 pt-5 pb-3">
        <AnalysesPageHeader filter={filter} status={status} view={null} action={action} />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 px-6 pb-3">
        {[
          { label: "Total", value: stats.total, icon: BarChart3, color: "text-zinc-400", glow: "border-zinc-700/50" },
          { label: "Terminées", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400", glow: "border-emerald-500/20" },
          { label: "En cours", value: stats.running, icon: Activity, color: "text-violet-400", glow: "border-violet-500/20" },
          { label: "Échouées", value: stats.failed, icon: XCircle, color: "text-red-400", glow: "border-red-500/20" },
        ].map((s) => (
          <motion.div
            key={s.label}
            className={`flex items-center gap-3 rounded-xl border ${s.glow} bg-zinc-900/60 px-4 py-3`}
            whileHover={{ scale: 1.02, borderColor: "rgba(139,92,246,0.3)" }}
            transition={{ duration: 0.15 }}
          >
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <div>
              <p className="text-xl font-bold text-zinc-100">{s.value}</p>
              <p className="text-[11px] text-zinc-500">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Body: sidebar + table */}
      <div className="flex flex-1 overflow-hidden border-t border-zinc-800/60">
        {/* Sidebar */}
        <SidebarFilter
          activeTime={activeTime}
          activeStatuses={activeStatuses}
          activeSeverity={activeSeverity}
          onTimeChange={setActiveTime}
          onStatusToggle={toggleStatus}
          onSeverityToggle={toggleSeverity}
        />

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-2.5 bg-zinc-950/30">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Rechercher une analyse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-9 text-sm bg-zinc-900/60 border-zinc-700/60 focus:border-violet-500/50 focus:ring-violet-500/20 placeholder:text-zinc-600"
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              {hasActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAgentPlan((p) => !p)}
                  className={`h-8 gap-1.5 text-xs border-zinc-700/60 ${
                    showAgentPlan
                      ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                      : "text-zinc-400 hover:text-violet-300"
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  Pipeline
                  {hasActive && <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={load}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

              {selected.size > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm(`Supprimer ${selected.size} analyses ?`)) return
                    for (const id of Array.from(selected)) await deleteDashboardAnalysis(id).catch(() => {})
                    setAnalyses((p) => p.filter((a) => !selected.has(a.id)))
                    setSelected(new Set())
                  }}
                  className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {selected.size}
                </Button>
              )}
            </div>

            {/* Active filter pills */}
            {(activeStatuses.length > 0 || activeSeverity.length > 0 || (activeTime !== "all" && activeTime !== "")) && (
              <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
                {activeStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/20 transition-colors"
                  >
                    {STATUS_META[s]?.label ?? s}
                    <XCircle className="h-2.5 w-2.5" />
                  </button>
                ))}
                {activeTime !== "all" && activeTime !== "" && (
                  <button
                    onClick={() => setActiveTime("all")}
                    className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    {FILTER_SECTIONS[0].options.find((o) => o.value === activeTime)?.label ?? activeTime}
                    <XCircle className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Agent Plan panel (slide-in) */}
          <AnimatePresence>
            {showAgentPlan && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 280, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0.65, 0.3, 0.9] }}
                className="overflow-hidden border-b border-zinc-800/60"
              >
                <AgentPlan />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-10 w-10">
                    <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" />
                    <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
                  </div>
                  <p className="text-sm text-zinc-500">Chargement des analyses…</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 gap-4"
              >
                <div className="rounded-full bg-zinc-800/60 p-4">
                  <GitCompare className="h-8 w-8 text-zinc-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-400">Aucune analyse trouvée</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {search ? "Essayez d'autres termes de recherche" : "Lancez votre première analyse avec le bouton +"}
                  </p>
                </div>
              </motion.div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/60 bg-zinc-950/40">
                    <th className="w-10 pl-4 pr-2 py-2.5">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        className="border-zinc-700 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                      />
                    </th>
                    <th className="py-2.5 pr-4 text-left w-28">
                      <SortHeader field="status" label="Statut" current={sortField} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="py-2.5 pr-4 text-left">
                      <SortHeader field="repo" label="Repo / PR" current={sortField} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="py-2.5 pr-4 text-left w-32">
                      <SortHeader field="findings" label="Findings" current={sortField} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="py-2.5 pr-4 text-left w-32">
                      <SortHeader field="created_at" label="Date" current={sortField} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="py-2.5 pr-4 w-32" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <AnalysisRow
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onSelect={() => {
                        setSelected((p) => {
                          const next = new Set(p)
                          next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                          return next
                        })
                      }}
                      onDelete={() => handleDelete(item.id)}
                      index={i}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-zinc-800/60 px-4 py-2 text-xs text-zinc-600">
              <span>{selected.size > 0 ? `${selected.size} sélectionnée(s) · ` : ""}{filtered.length} analyse(s)</span>
              <span className="text-zinc-700">
                {analyses.length} au total
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AnalysesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    }>
      <AnalysesContent />
    </Suspense>
  )
}
