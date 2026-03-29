"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
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

// Mock data for charts
const qualityTrendsData = [
  { month: "Jan", score: 72, issues: 45, resolved: 38 },
  { month: "Feb", score: 75, issues: 52, resolved: 48 },
  { month: "Mar", score: 78, issues: 38, resolved: 35 },
  { month: "Apr", score: 82, issues: 31, resolved: 30 },
  { month: "May", score: 85, issues: 28, resolved: 27 },
  { month: "Jun", score: 88, issues: 22, resolved: 21 },
]

const velocityData = [
  { week: "W1", reviews: 24, avgTime: 4.2 },
  { week: "W2", reviews: 32, avgTime: 3.8 },
  { week: "W3", reviews: 28, avgTime: 4.5 },
  { week: "W4", reviews: 36, avgTime: 3.2 },
]

const teamData = [
  { name: "Alice Chen", reviews: 45, avgScore: 92, efficiency: 95 },
  { name: "Bob Smith", reviews: 38, avgScore: 88, efficiency: 87 },
  { name: "Carol Williams", reviews: 52, avgScore: 94, efficiency: 92 },
  { name: "David Brown", reviews: 41, avgScore: 86, efficiency: 89 },
  { name: "Eva Martinez", reviews: 35, avgScore: 91, efficiency: 94 },
]

const issueCategories = [
  { name: "Security", count: 12, color: "bg-red-500" },
  { name: "Performance", count: 28, color: "bg-orange-500" },
  { name: "Code Style", count: 45, color: "bg-blue-500" },
  { name: "Best Practices", count: 32, color: "bg-green-500" },
  { name: "Documentation", count: 18, color: "bg-purple-500" },
]

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

function CodeQualityTrends() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Quality Score"
          value="88%"
          change={12}
          trend="up"
          icon={Target}
          description="Overall code quality rating"
        />
        <StatCard
          title="Issues Found"
          value="135"
          change={-23}
          trend="down"
          icon={AlertTriangle}
          description="Total issues this month"
        />
        <StatCard
          title="Issues Resolved"
          value="128"
          change={18}
          trend="up"
          icon={CheckCircle2}
          description="Fixed this month"
        />
        <StatCard
          title="Avg Resolution Time"
          value="2.4h"
          change={-15}
          trend="down"
          icon={Clock}
          description="Time to fix issues"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Quality Score Trend
            </CardTitle>
            <CardDescription>
              Monthly code quality score progression
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between gap-2">
              {qualityTrendsData.map((item, index) => (
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
              Issues by Category
            </CardTitle>
            <CardDescription>
              Distribution of code issues by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issueCategories.map((category, index) => (
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

function ReviewVelocity() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Reviews This Week"
          value="36"
          change={28}
          trend="up"
          icon={GitBranch}
        />
        <StatCard
          title="Avg Review Time"
          value="3.2h"
          change={-18}
          trend="down"
          icon={Clock}
        />
        <StatCard
          title="Review Throughput"
          value="8.2/day"
          change={15}
          trend="up"
          icon={Zap}
        />
        <StatCard
          title="Pending Reviews"
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
              Weekly Review Volume
            </CardTitle>
            <CardDescription>
              Number of reviews completed per week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between gap-4">
              {velocityData.map((item, index) => (
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
              Average Review Time
            </CardTitle>
            <CardDescription>
              Hours spent per review by week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-between gap-4">
              {velocityData.map((item, index) => (
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

function TeamPerformance() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Team Members"
          value="5"
          change={0}
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Avg Reviews/Person"
          value="42"
          change={8}
          trend="up"
          icon={GitBranch}
        />
        <StatCard
          title="Team Efficiency"
          value="91%"
          change={5}
          trend="up"
          icon={Target}
        />
        <StatCard
          title="Collaboration Score"
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
            Team Performance Breakdown
          </CardTitle>
          <CardDescription>
            Individual reviewer metrics and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {teamData.map((member, index) => (
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
                    Efficiency: {member.efficiency}%
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="velocity" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Velocity
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quality">
          <CodeQualityTrends />
        </TabsContent>

        <TabsContent value="velocity">
          <ReviewVelocity />
        </TabsContent>

        <TabsContent value="team">
          <TeamPerformance />
        </TabsContent>
      </Tabs>
    </div>
  )
}
