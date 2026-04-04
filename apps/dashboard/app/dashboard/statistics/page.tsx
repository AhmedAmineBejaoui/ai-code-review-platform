"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "motion/react"
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  GitBranch,
  Code2,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
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

// Types for statistics data
interface QualityTrendsData {
  month: string
  score: number
  issues: number
  resolved: number
}

interface VelocityData {
  week: string
  reviews: number
  avgTime: number
}

interface TeamData {
  name: string
  reviews: number
  avgScore: number
  efficiency: number
}

interface IssueCategory {
  name: string
  count: number
  color: string
}

interface StatisticsData {
  quality: {
    trends: QualityTrendsData[]
    categories: IssueCategory[]
  }
  velocity: VelocityData[]
  team: TeamData[]
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
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
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

function CodeQualityTrends({ data }: { data: { trends: QualityTrendsData[], categories: IssueCategory[] } }) {
  const { trends, categories } = data

  // Default values if no data
  const displayTrends = trends.length > 0 ? trends : [
    { month: "Jan", score: 72, issues: 45, resolved: 38 },
    { month: "Feb", score: 75, issues: 52, resolved: 48 },
  ]
  
  const displayCategories = categories.length > 0 ? categories : [
    { name: "Securite", count: 12, color: "bg-red-500" },
    { name: "Performance", count: 28, color: "bg-orange-500" },
    { name: "Style Code", count: 45, color: "bg-blue-500" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Score Qualite"
          value="88%"
          change={12}
          trend="up"
          icon={Target}
          description="Evaluation globale de qualite du code"
        />
        <StatCard
          title="Problemes Trouves"
          value="135"
          change={-23}
          trend="down"
          icon={AlertTriangle}
          description="Total des problemes ce mois"
        />
        <StatCard
          title="Problemes Resolus"
          value="128"
          change={18}
          trend="up"
          icon={CheckCircle2}
          description="Corriges ce mois"
        />
        <StatCard
          title="Temps Resolution Moyen"
          value="2.4h"
          change={-15}
          trend="down"
          icon={Clock}
          description="Temps pour corriger les problemes"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Evolution Score Qualite
            </CardTitle>
            <CardDescription>
              Progression mensuelle du score de qualite du code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between gap-2">
              {displayTrends.map((item, index) => (
                <motion.div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-2"
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md"
                    style={{ height: `${item.score * 2.5}px` }}
                  />
                  <span className="text-xs font-medium">{item.month}</span>
                  <span className="text-xs text-muted-foreground">{item.score}%</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Problemes par Categorie
            </CardTitle>
            <CardDescription>
              Distribution des problemes de code par type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayCategories.map((category, index) => (
                <motion.div
                  key={category.name}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={`h-3 w-3 rounded-full ${category.color}`} />
                  <span className="flex-1 text-sm">{category.name}</span>
                  <span className="text-sm font-medium">{category.count}</span>
                  <Progress
                    value={(category.count / 50) * 100}
                    className="w-24"
                  />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReviewVelocity({ data }: { data: VelocityData[] }) {
  const displayData = data.length > 0 ? data : [
    { week: "S1", reviews: 24, avgTime: 4.2 },
    { week: "S2", reviews: 32, avgTime: 3.8 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Reviews Cette Semaine"
          value="36"
          change={28}
          trend="up"
          icon={GitBranch}
        />
        <StatCard
          title="Temps Review Moyen"
          value="3.2h"
          change={-18}
          trend="down"
          icon={Clock}
        />
        <StatCard
          title="Debit Reviews"
          value="8.2/jour"
          change={15}
          trend="up"
          icon={Zap}
        />
        <StatCard
          title="Reviews en Attente"
          value="12"
          change={-5}
          trend="down"
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Volume Reviews Hebdomadaire
            </CardTitle>
            <CardDescription>
              Nombre de reviews completees par semaine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between gap-4">
              {displayData.map((item, index) => (
                <motion.div
                  key={item.week}
                  className="flex-1 flex flex-col items-center gap-2"
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-md relative"
                    style={{ height: `${item.reviews * 6}px` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">
                      {item.reviews}
                    </span>
                  </div>
                  <span className="text-xs font-medium">{item.week}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Temps Review Moyen
            </CardTitle>
            <CardDescription>
              Heures depensees par review par semaine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between gap-4">
              {displayData.map((item, index) => (
                <motion.div
                  key={item.week}
                  className="flex-1 flex flex-col items-center gap-2"
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t-md relative"
                    style={{ height: `${item.avgTime * 50}px` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium">
                      {item.avgTime}h
                    </span>
                  </div>
                  <span className="text-xs font-medium">{item.week}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TeamPerformance({ data }: { data: TeamData[] }) {
  const displayData = data.length > 0 ? data : [
    { name: "Alice Chen", reviews: 45, avgScore: 92, efficiency: 95 },
    { name: "Bob Smith", reviews: 38, avgScore: 88, efficiency: 87 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Membres Equipe"
          value="5"
          change={0}
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Reviews/Personne Moyen"
          value="42"
          change={8}
          trend="up"
          icon={GitBranch}
        />
        <StatCard
          title="Efficacite Equipe"
          value="91%"
          change={5}
          trend="up"
          icon={Target}
        />
        <StatCard
          title="Score Collaboration"
          value="87"
          change={12}
          trend="up"
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ventilation Performance Equipe
          </CardTitle>
          <CardDescription>
            Metriques individuelles et performance des reviewers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {displayData.map((member, index) => (
              <motion.div
                key={member.name}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{member.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {member.reviews} reviews
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Score: {member.avgScore}%
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    Efficacite: {member.efficiency}%
                  </div>
                  <Progress value={member.efficiency} className="w-24 mt-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function StatisticsPage() {
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
      
      // Try to fetch from API
      const response = await fetch(`/api/statistics?range=${timeRange}`)
      if (response.ok) {
        const statsData = await response.json()
        setData(statsData)
      } else {
        // Return default empty data if API not available
        const defaultData: StatisticsData = {
          quality: {
            trends: [],
            categories: []
          },
          velocity: [],
          team: []
        }
        setData(defaultData)
      }
    } catch (err) {
      // Return default empty data if API not available
      const defaultData: StatisticsData = {
        quality: {
          trends: [],
          categories: []
        },
        velocity: [],
        team: []
      }
      setData(defaultData)
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
          <span className="ml-3 text-gray-600">Chargement des statistiques...</span>
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
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                Erreur de chargement
              </h3>
              <p className="text-red-600 dark:text-red-300 mb-4">
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
          <h1 className="text-3xl font-bold">Statistiques</h1>
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
    </div>
  )
}
