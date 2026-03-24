"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import {
  TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Target,
  Award, MessageCircle, FileEdit, Calendar
} from "lucide-react"

interface PersonalMetrics {
  reviewer_id: string
  period: {
    start: string
    end: string
    days: number
  }
  current_period: {
    reviews_completed: number
    avg_review_time_minutes: number
    avg_comments_per_review: number
    sla_compliance_rate: number
    approvals: number
    warnings: number
    blocks: number
    findings_identified: number
  }
  trends: {
    dates: string[]
    reviews_completed: number[]
    avg_review_time: number[]
    sla_compliance: number[]
    avg_comments: number[]
  }
  rankings: {
    reviews_count: number
    quality_score: number
    response_time: number
  }
}

export default function ReviewerAnalyticsPage() {
  const [metrics, setMetrics] = useState<PersonalMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/reviews/metrics/personal?period_days=${period}`)

      if (!response.ok) {
        throw new Error("Failed to fetch metrics")
      }

      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [period])

  const formatTrendData = () => {
    if (!metrics) return []

    return metrics.trends.dates.map((date, index) => ({
      date: new Date(date).toLocaleDateString("fr-FR", {
        month: "short",
        day: "numeric"
      }),
      reviews: metrics.trends.reviews_completed[index] || 0,
      avgTime: metrics.trends.avg_review_time[index] || 0,
      slaCompliance: metrics.trends.sla_compliance[index] || 0,
      avgComments: metrics.trends.avg_comments[index] || 0,
    }))
  }

  const decisionData = [
    { name: "Approvals", value: metrics?.current_period.approvals || 0, color: "#10b981" },
    { name: "Warnings", value: metrics?.current_period.warnings || 0, color: "#f59e0b" },
    { name: "Blocks", value: metrics?.current_period.blocks || 0, color: "#ef4444" },
  ]

  const getSLAStatus = (rate: number) => {
    if (rate >= 0.95) return { label: "Excellent", color: "bg-green-500", icon: TrendingUp }
    if (rate >= 0.90) return { label: "Good", color: "bg-blue-500", icon: CheckCircle }
    if (rate >= 0.80) return { label: "Average", color: "bg-yellow-500", icon: AlertTriangle }
    return { label: "Needs Improvement", color: "bg-red-500", icon: TrendingDown }
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Error Loading Metrics</h3>
                <p className="text-sm text-gray-600 mt-2">{error}</p>
              </div>
              <Button onClick={fetchMetrics} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  const slaStatus = getSLAStatus(metrics.current_period.sla_compliance_rate)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Performance metrics for the last {metrics.period.days} days
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reviews Completed</p>
                <div className="flex items-center mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {metrics.current_period.reviews_completed}
                  </span>
                  {metrics.rankings.reviews_count > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      #{metrics.rankings.reviews_count}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Review Time</p>
                <div className="flex items-center mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatMinutes(metrics.current_period.avg_review_time_minutes)}
                  </span>
                  {metrics.rankings.response_time > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      #{metrics.rankings.response_time}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SLA Compliance</p>
                <div className="flex items-center mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(metrics.current_period.sla_compliance_rate * 100)}%
                  </span>
                  <Badge className={`ml-2 text-white ${slaStatus.color}`}>
                    {slaStatus.label}
                  </Badge>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Comments Per Review</p>
                <div className="flex items-center mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {metrics.current_period.avg_comments_per_review.toFixed(1)}
                  </span>
                  {metrics.rankings.quality_score > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      #{metrics.rankings.quality_score}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reviews Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Review Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formatTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="reviews"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Decision Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-green-600" />
              Review Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={decisionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {decisionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-purple-600" />
              Review Time Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formatTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [formatMinutes(value as number), "Avg Time"]} />
                <Line
                  type="monotone"
                  dataKey="avgTime"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SLA Compliance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-600" />
              SLA Compliance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formatTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "SLA Compliance"]} />
                <Area
                  type="monotone"
                  dataKey="slaCompliance"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileEdit className="h-5 w-5 mr-2 text-indigo-600" />
            Detailed Performance Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.current_period.approvals}
              </div>
              <div className="text-sm text-gray-600 mt-1">Approvals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {metrics.current_period.warnings}
              </div>
              <div className="text-sm text-gray-600 mt-1">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {metrics.current_period.blocks}
              </div>
              <div className="text-sm text-gray-600 mt-1">Blocks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.current_period.findings_identified}
              </div>
              <div className="text-sm text-gray-600 mt-1">Findings Identified</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}