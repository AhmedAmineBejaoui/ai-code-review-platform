"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GitBranch,
  Code2,
  Star,
  MoreHorizontal,
  Search,
  Filter,
  ChevronRight,
  Activity,
  Target,
  Clock,
  CheckCircle2,
  Settings,
  Trash2,
  Edit,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Mock data for teams
const teamsData = {
  dev: {
    name: "Development Team",
    description: "Core development and feature implementation",
    lead: "Alice Chen",
    memberCount: 8,
    activeProjects: 5,
    completedReviews: 156,
    avgReviewTime: "3.2h",
    members: [
      { id: 1, name: "Alice Chen", role: "Team Lead", email: "alice@company.com", reviews: 45, score: 94, avatar: "AC", status: "active" },
      { id: 2, name: "Bob Smith", role: "Senior Developer", email: "bob@company.com", reviews: 38, score: 91, avatar: "BS", status: "active" },
      { id: 3, name: "Carol Williams", role: "Developer", email: "carol@company.com", reviews: 32, score: 88, avatar: "CW", status: "active" },
      { id: 4, name: "David Brown", role: "Junior Developer", email: "david@company.com", reviews: 25, score: 85, avatar: "DB", status: "away" },
      { id: 5, name: "Eva Martinez", role: "Developer", email: "eva@company.com", reviews: 28, score: 89, avatar: "EM", status: "active" },
      { id: 6, name: "Frank Lee", role: "Developer", email: "frank@company.com", reviews: 30, score: 87, avatar: "FL", status: "active" },
      { id: 7, name: "Grace Kim", role: "Junior Developer", email: "grace@company.com", reviews: 18, score: 82, avatar: "GK", status: "offline" },
      { id: 8, name: "Henry Wilson", role: "Developer", email: "henry@company.com", reviews: 35, score: 90, avatar: "HW", status: "active" },
    ],
    recentActivity: [
      { action: "Completed review", user: "Alice Chen", project: "API Gateway", time: "2h ago" },
      { action: "Merged PR", user: "Bob Smith", project: "Auth Module", time: "4h ago" },
      { action: "Started review", user: "Carol Williams", project: "Dashboard UI", time: "5h ago" },
    ],
  },
  qa: {
    name: "QA Team",
    description: "Quality assurance and testing",
    lead: "Sarah Johnson",
    memberCount: 5,
    activeProjects: 4,
    completedReviews: 98,
    avgReviewTime: "4.1h",
    members: [
      { id: 1, name: "Sarah Johnson", role: "QA Lead", email: "sarah@company.com", reviews: 32, score: 96, avatar: "SJ", status: "active" },
      { id: 2, name: "Mike Thompson", role: "Senior QA", email: "mike@company.com", reviews: 28, score: 93, avatar: "MT", status: "active" },
      { id: 3, name: "Lisa Anderson", role: "QA Engineer", email: "lisa@company.com", reviews: 22, score: 90, avatar: "LA", status: "away" },
      { id: 4, name: "Tom Garcia", role: "QA Engineer", email: "tom@company.com", reviews: 20, score: 88, avatar: "TG", status: "active" },
      { id: 5, name: "Nina Patel", role: "Junior QA", email: "nina@company.com", reviews: 15, score: 85, avatar: "NP", status: "active" },
    ],
    recentActivity: [
      { action: "Completed test cycle", user: "Sarah Johnson", project: "Mobile App", time: "1h ago" },
      { action: "Reported bug", user: "Mike Thompson", project: "API Gateway", time: "3h ago" },
      { action: "Verified fix", user: "Lisa Anderson", project: "Auth Module", time: "6h ago" },
    ],
  },
  devops: {
    name: "DevOps Team",
    description: "Infrastructure and deployment automation",
    lead: "James Miller",
    memberCount: 4,
    activeProjects: 3,
    completedReviews: 67,
    avgReviewTime: "2.8h",
    members: [
      { id: 1, name: "James Miller", role: "DevOps Lead", email: "james@company.com", reviews: 25, score: 95, avatar: "JM", status: "active" },
      { id: 2, name: "Emily Davis", role: "Senior DevOps", email: "emily@company.com", reviews: 22, score: 92, avatar: "ED", status: "active" },
      { id: 3, name: "Chris Taylor", role: "DevOps Engineer", email: "chris@company.com", reviews: 18, score: 89, avatar: "CT", status: "active" },
      { id: 4, name: "Rachel White", role: "DevOps Engineer", email: "rachel@company.com", reviews: 15, score: 87, avatar: "RW", status: "offline" },
    ],
    recentActivity: [
      { action: "Deployed to production", user: "James Miller", project: "Main Platform", time: "30m ago" },
      { action: "Updated CI/CD", user: "Emily Davis", project: "Build Pipeline", time: "2h ago" },
      { action: "Scaled infrastructure", user: "Chris Taylor", project: "AWS Cluster", time: "4h ago" },
    ],
  },
}

const statusColors = {
  active: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-gray-400",
}

function TeamOverview({ team }: { team: typeof teamsData.dev }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.memberCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.activeProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reviews Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.completedReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Review Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.avgReviewTime}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <Button size="sm" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {team.members.map((member, index) => (
                <motion.div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                        statusColors[member.status as keyof typeof statusColors]
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{member.name}</span>
                      {member.role.includes("Lead") && (
                        <Star className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{member.role}</span>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-medium">{member.reviews} reviews</div>
                    <div className="text-muted-foreground">Score: {member.score}%</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {team.recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>{" "}
                      <span className="text-muted-foreground">{activity.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.project} • {activity.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function TeamsPage() {
  const searchParams = useSearchParams()
  const teamParam = searchParams.get("team") || "dev"
  const [searchQuery, setSearchQuery] = useState("")

  const currentTeam = teamsData[teamParam as keyof typeof teamsData] || teamsData.dev

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentTeam.name}</h1>
          <p className="text-muted-foreground mt-1">{currentTeam.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Team Settings
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Team Tabs */}
      <Tabs defaultValue={teamParam} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dev" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Development
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            QA
          </TabsTrigger>
          <TabsTrigger value="devops" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            DevOps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dev">
          <TeamOverview team={teamsData.dev} />
        </TabsContent>

        <TabsContent value="qa">
          <TeamOverview team={teamsData.qa} />
        </TabsContent>

        <TabsContent value="devops">
          <TeamOverview team={teamsData.devops} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
