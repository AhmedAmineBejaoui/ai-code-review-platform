"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import {
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  GitBranch,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Types matching the backend StatisticsResponse contract
// (apps/backend/app/api/http/statistics.py)
interface TrendDataPoint {
  date: string
  value: number
}

interface QualityMetrics {
  overall_score: number
  security_score: number
  maintainability_score: number
  reliability_score: number
  total_findings: number
  blocker_count: number
  critical_count: number
  major_count: number
  minor_count: number
  findings_by_category: Record<string, number>
  trend: TrendDataPoint[]
}

interface VelocityMetrics {
  avg_review_time_hours: number
  avg_time_to_first_review_hours: number
  reviews_per_day: number
  analyses_per_day: number
  total_reviews: number
  total_analyses: number
  completed_analyses: number
  failed_analyses: number
  trend: TrendDataPoint[]
}

interface TeamMetrics {
  active_reviewers: number
  total_team_members: number
  reviews_by_reviewer: Record<string, number>
  avg_reviews_per_member: number
  top_contributors: Array<{ reviewer_id: string; review_count: number; name?: string }>
  bottlenecks: Array<{ reviewer_id: string; pending_reviews: number }>
}

interface StatisticsData {
  time_range: string
  generated_at: string
  quality: QualityMetrics | null
  velocity: VelocityMetrics | null
  team: TeamMetrics | null
}

const CATEGORY_COLORS: Record<string, string> = {
  security: "bg-red-500",
  perf: "bg-orange-500",
  performance: "bg-orange-500",
  quality: "bg-blue-500",
  style: "bg-purple-500",
  maintainability: "bg-yellow-500",
  reliability: "bg-pink-500",
  other: "bg-gray-500",
}

function formatHours(hours: number): string {
  if (!hours || hours < 0.05) return "0h"
  if (hours < 1) return `${Math.round(hours * 60)}min`
  return `${hours.toFixed(1)}h`
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  change: number
  trend: "up" | "down"
  icon: React.ElementType
  description?: string
}) {
  const isPositive = trend === "up"
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center gap-1 text-xs">
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-destructive" />
            )}
            <span className={isPositive ? "text-green-500" : "text-destructive"}>
              {Math.abs(change)}%
            </span>
            <span className="text-muted-foreground">from last period</span>
          </div>
          {description && (
            <p className="mt-2 text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
        <div
          className={`absolute bottom-0 left-0 right-0 h-1 ${
            isPositive ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </Card>
    </motion.div>
  )
}

function CodeQualityTrends({ data }: { data: QualityMetrics | null }) {
  if (!data) {
    return <EmptyState message="Aucune donnee de qualite disponible pour cette periode." />
  }

  const trend = data.trend
  const maxTrend = Math.max(1, ...trend.map((t) => t.value))
  const categoryEntries = Object.entries(data.findings_by_category)
  const maxCategoryCount = Math.max(1, ...categoryEntries.map(([, c]) => c))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Score Qualite"
          value={`${Math.round(data.overall_score)}%`}
          change={0}
          trend="up"
          icon={Target}
          description="Score global calcule a partir des findings"
        />
        <StatCard
          title="Problemes Trouves"
          value={data.total_findings}
          change={0}
          trend="up"
          icon={AlertTriangle}
          description="Total des findings sur la periode"
        />
        <StatCard
          title="Bloquants"
          value={data.blocker_count}
          change={0}
          trend="down"
          icon={CheckCircle2}
          description="Findings de severite BLOCKER"
        />
        <StatCard
          title="Score Securite"
          value={`${Math.round(data.security_score)}%`}
          change={0}
          trend="up"
          icon={Shield}
          description="Score base sur les findings security"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Findings par jour
            </CardTitle>
            <CardDescription>
              Volume de findings detectes au fil du temps
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <EmptyState message="Aucune donnee de tendance." />
            ) : (
              <div className="h-[300px] flex items-end justify-between gap-1">
                {trend.map((item, index) => (
                  <motion.div
                    key={item.date}
                    className="flex-1 flex flex-col items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md"
                      style={{ height: `${(item.value / maxTrend) * 250}px` }}
                      title={`${item.date}: ${item.value}`}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Problemes par Categorie
            </CardTitle>
            <CardDescription>
              Distribution des findings par categorie
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryEntries.length === 0 ? (
              <EmptyState message="Aucune categorie a afficher." />
            ) : (
              <div className="space-y-4">
                {categoryEntries.map(([name, count], index) => (
                  <motion.div
                    key={name}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className={`h-3 w-3 rounded-full ${CATEGORY_COLORS[name] || "bg-gray-500"}`} />
                    <span className="flex-1 text-sm capitalize">{name}</span>
                    <span className="text-sm font-medium">{count}</span>
                    <Progress
                      value={(count / maxCategoryCount) * 100}
                      className="w-24"
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReviewVelocity({ data }: { data: VelocityMetrics | null }) {
  if (!data) {
    return <EmptyState message="Aucune donnee de velocite disponible pour cette periode." />
  }

  const trend = data.trend
  const maxTrend = Math.max(1, ...trend.map((t) => t.value))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Reviews"
          value={data.total_reviews}
          change={0}
          trend="up"
          icon={GitBranch}
          description="Reviews completees sur la periode"
        />
        <StatCard
          title="Temps Review Moyen"
          value={formatHours(data.avg_review_time_hours)}
          change={0}
          trend="down"
          icon={Clock}
          description="Du moment de l'assignation a la completion"
        />
        <StatCard
          title="Analyses / jour"
          value={data.analyses_per_day.toFixed(1)}
          change={0}
          trend="up"
          icon={Zap}
          description="Debit moyen d'analyses"
        />
        <StatCard
          title="Analyses Echec"
          value={data.failed_analyses}
          change={0}
          trend="down"
          icon={Activity}
          description={`${data.completed_analyses} completees / ${data.total_analyses} totales`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analyses par jour
          </CardTitle>
          <CardDescription>
            Volume d'analyses creees au fil du temps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <EmptyState message="Aucune donnee de tendance." />
          ) : (
            <div className="h-[300px] flex items-end justify-between gap-1">
              {trend.map((item, index) => (
                <motion.div
                  key={item.date}
                  className="flex-1 flex flex-col items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-md"
                    style={{ height: `${(item.value / maxTrend) * 250}px` }}
                    title={`${item.date}: ${item.value}`}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TeamPerformance({ data }: { data: TeamMetrics | null }) {
  if (!data) {
    return <EmptyState message="Aucune donnee d'equipe disponible pour cette periode." />
  }

  const contributors = data.top_contributors
  const maxReviews = Math.max(1, ...contributors.map((c) => c.review_count))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Membres Equipe"
          value={data.total_team_members}
          change={0}
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Reviewers Actifs"
          value={data.active_reviewers}
          change={0}
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Reviews / Membre"
          value={data.avg_reviews_per_member.toFixed(1)}
          change={0}
          trend="up"
          icon={GitBranch}
        />
        <StatCard
          title="Bottlenecks"
          value={data.bottlenecks.length}
          change={0}
          trend="down"
          icon={Target}
          description="Reviewers avec plus de 3 reviews en attente"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Contributors
          </CardTitle>
          <CardDescription>
            Reviewers les plus actifs sur la periode
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contributors.length === 0 ? (
            <EmptyState message="Aucun reviewer actif sur la periode." />
          ) : (
            <div className="space-y-3">
              {contributors.map((member, index) => {
                const display = member.name || member.reviewer_id
                const initials = display
                  .split(/[\s_-]+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0]?.toUpperCase() || "")
                  .join("") || "?"
                return (
                  <motion.div
                    key={member.reviewer_id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium truncate">{display}</h4>
                      <span className="text-xs text-muted-foreground">
                        {member.review_count} reviews
                      </span>
                    </div>
                    <Progress
                      value={(member.review_count / maxReviews) * 100}
                      className="w-32"
                    />
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {data.bottlenecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[color:var(--orange)]" />
              Bottlenecks
            </CardTitle>
            <CardDescription>
              Reviewers avec une charge importante de reviews en attente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.bottlenecks.map((b) => (
                <div
                  key={b.reviewer_id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span className="font-medium">{b.reviewer_id}</span>
                  <Badge variant="secondary">{b.pending_reviews} en attente</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function StatisticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Chargement des statistiques...</div>}>
      <StatisticsPageInner />
    </Suspense>
  )
}

function StatisticsPageInner() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "quality"
  const [timeRange, setTimeRange] = useState("30d")
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/dashboard/statistics?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const statsData: StatisticsData = await response.json()
      setData(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [timeRange])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-muted-foreground">Chargement des statistiques...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-destructive mb-2">
                Erreur de chargement
              </h3>
              <p className="text-destructive mb-4">
                {error || "Impossible de charger les statistiques"}
              </p>
              <Button onClick={fetchStatistics} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="card-heading text-foreground">Statistiques</h1>
          <p className="text-muted-foreground mt-1">
            Analyses completes et metriques de performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
              <SelectItem value="1y">Derniere annee</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchStatistics} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Qualite
          </TabsTrigger>
          <TabsTrigger value="velocity" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Vitesse
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quality">
          <CodeQualityTrends data={data.quality} />
        </TabsContent>

        <TabsContent value="velocity">
          <ReviewVelocity data={data.velocity} />
        </TabsContent>

        <TabsContent value="team">
          <TeamPerformance data={data.team} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Genere a {new Date(data.generated_at).toLocaleString()}
      </p>
    </div>
  )
}
