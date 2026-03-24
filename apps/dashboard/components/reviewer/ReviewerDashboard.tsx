"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  TrendingUp,
  Calendar,
  Alert,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

// Static data for now - would be fetched from API
const mockDashboardData = {
  kpis: {
    pending_reviews: 5,
    in_progress_reviews: 2,
    completed_this_week: 12,
    overdue_reviews: 1,
    avg_review_time_minutes: 42,
    sla_compliance_rate: 0.96,
  },
  activeReviews: [
    {
      id: "rev_001",
      analysis: {
        id: "ana_123",
        repo: "frontend/webapp",
        pr_label: "PR #456",
        author: "alice@company.com",
      },
      priority: "high",
      started_at: "2026-03-24T14:30:00Z",
      due_at: "2026-03-25T10:00:00Z",
    },
    {
      id: "rev_002",
      analysis: {
        id: "ana_124",
        repo: "backend/api",
        pr_label: "PR #789",
        author: "bob@company.com",
      },
      priority: "medium",
      started_at: "2026-03-24T16:45:00Z",
      due_at: "2026-03-25T12:00:00Z",
    },
  ],
  recentActivity: [
    { type: "completed", repo: "frontend/components", time: "2h ago" },
    { type: "comment", repo: "backend/auth", time: "4h ago" },
    { type: "assigned", repo: "mobile/ios", time: "6h ago" },
  ],
}

export function ReviewerDashboard() {
  const [dashboardData, setDashboardData] = useState(mockDashboardData)
  const [loading, setLoading] = useState(false)

  // In real implementation, this would fetch from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      // await fetch('/api/dashboard/reviewer')
      // setDashboardData(response)
      setLoading(false)
    }
    fetchData()
  }, [])

  const { kpis, activeReviews, recentActivity } = dashboardData

  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{kpis.pending_reviews}</p>
                </div>
                {kpis.overdue_reviews > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {kpis.overdue_reviews} overdue
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{kpis.in_progress_reviews}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">{kpis.completed_this_week}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Time</p>
                  <p className="text-2xl font-bold">{kpis.avg_review_time_minutes}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SLA Compliance</p>
                  <p className="text-2xl font-bold">{Math.round(kpis.sla_compliance_rate * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center">
                <Link href="/dashboard/reviewer/queue">
                  <Button size="sm" className="w-full">
                    View Queue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Reviews */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Active Reviews</span>
                <Badge variant="outline">{activeReviews.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeReviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No active reviews</p>
                  <p className="text-sm">Great job staying on top of your queue!</p>
                </div>
              ) : (
                activeReviews.map((review) => {
                  const timeElapsed = Math.floor(
                    (new Date().getTime() - new Date(review.started_at).getTime()) / (1000 * 60)
                  )
                  const timeUntilDue = Math.floor(
                    (new Date(review.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60)
                  )
                  const isUrgent = timeUntilDue < 2

                  return (
                    <div
                      key={review.id}
                      className={`p-4 border rounded-lg ${isUrgent ? "border-red-200 bg-red-50" : "border-gray-200"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/dashboard/review/${review.analysis.id}`}
                            className="font-medium hover:underline"
                          >
                            {review.analysis.repo}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {review.analysis.pr_label} by {review.analysis.author}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge
                              variant={review.priority === "high" ? "destructive" : review.priority === "medium" ? "default" : "secondary"}
                            >
                              {review.priority}
                            </Badge>
                            {isUrgent && (
                              <Badge variant="destructive">
                                <Alert className="h-3 w-3 mr-1" />
                                Due in {timeUntilDue}h
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{timeElapsed}m elapsed</p>
                          <Link href={`/dashboard/review/${review.analysis.id}`}>
                            <Button size="sm" variant="outline" className="mt-2">
                              Resume
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <Link href="/dashboard/reviewer/my-reviews">
                <Button variant="outline" size="sm" className="w-full">
                  View All My Reviews
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity & Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="space-y-4">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === "completed" ? "bg-green-500" :
                      activity.type === "comment" ? "bg-blue-500" : "bg-orange-500"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium capitalize">{activity.type}</span> review for{" "}
                        <span className="font-medium">{activity.repo}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/reviewer/queue">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Review Queue
                  </Button>
                </Link>
                <Link href="/dashboard/reviewer/queue?tab=available">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Available Reviews
                  </Button>
                </Link>
                <Link href="/dashboard/reviewer/analytics">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    My Analytics
                  </Button>
                </Link>
                <Link href="/dashboard/reviewer/templates">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    review Templates
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}