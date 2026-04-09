"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Users,
  UserPlus,
  Star,
  Activity,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TeamMember {
  user_id: string
  email: string
  display_name: string | null
  role: "owner" | "admin" | "member" | "viewer"
  joined_at: string
  reviews_completed: number
  avg_review_time_hours: number | null
}

interface Team {
  id: string
  name: string
  slug: string | null
  description: string | null
  member_count: number
  members: TeamMember[]
  total_reviews: number
  active_reviews: number
  avg_review_time_hours: number | null
  created_at: string
  updated_at: string
}

interface TeamListResponse {
  items: Team[]
  total: number
}

function initialsOf(name: string | null, email: string): string {
  const source = (name || email || "?").trim()
  const parts = source.split(/[\s.@_-]+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatHours(h: number | null): string {
  if (h === null || h === undefined) return "—"
  return `${h.toFixed(1)}h`
}

function TeamOverview({ team }: { team: Team }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.member_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.active_reviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.total_reviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Review Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(team.avg_review_time_hours)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
            {team.members.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No members in this team yet.
              </div>
            ) : (
              <div className="space-y-3">
                {team.members.map((member, index) => (
                  <motion.div
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs">
                        {initialsOf(member.display_name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {member.display_name || member.email}
                        </span>
                        {(member.role === "owner" || member.role === "admin") && (
                          <Star className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-medium">{member.reviews_completed} reviews</div>
                      <div className="text-muted-foreground">{formatHours(member.avg_review_time_hours)}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{team.total_reviews} reviews completed</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {team.active_reviews} currently in progress
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Created {new Date(team.created_at).toLocaleDateString()} · Updated{" "}
                {new Date(team.updated_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <TeamsPageInner />
    </Suspense>
  )
}

function TeamsPageInner() {
  const searchParams = useSearchParams()
  const teamParam = searchParams.get("team") || ""
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [reloadTick, setReloadTick] = useState(0)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [settingsName, setSettingsName] = useState("")
  const [settingsDesc, setSettingsDesc] = useState("")
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/dashboard/teams")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: TeamListResponse = await res.json()
        if (cancelled) return
        setTeams(data.items || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load teams")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [reloadTick])

  const currentTeam = useMemo(() => {
    if (teams.length === 0) return null
    if (selectedTeamId) {
      const match = teams.find((t) => t.id === selectedTeamId)
      if (match) return match
    }
    if (teamParam) {
      const match = teams.find(
        (t) =>
          t.id === teamParam ||
          t.slug === teamParam ||
          t.name.toLowerCase() === teamParam.toLowerCase(),
      )
      if (match) return match
    }
    return teams[0]
  }, [teams, teamParam, selectedTeamId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Loading teams...
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load teams</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (teams.length === 0 || !currentTeam) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No teams yet</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Create a team to start organizing members and reviews.
          </p>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentTeam.name}</h1>
          <p className="text-muted-foreground mt-1">
            {currentTeam.description || `${currentTeam.member_count} member${currentTeam.member_count === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSettingsName(currentTeam.name)
              setSettingsDesc(currentTeam.description || "")
              setSettingsMsg(null)
              setSettingsOpen(true)
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Team Settings
          </Button>
          <Button
            onClick={() => {
              setInviteEmail("")
              setInviteRole("member")
              setInviteMsg(null)
              setInviteOpen(true)
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member to {currentTeam.name}</DialogTitle>
            <DialogDescription>
              An invitation email will be sent via Clerk. They&apos;ll join this team after signing up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviteBusy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={inviteBusy}
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {inviteMsg && (
              <p className="text-sm text-muted-foreground">{inviteMsg}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteBusy}>
              Cancel
            </Button>
            <Button
              disabled={inviteBusy || !inviteEmail.trim()}
              onClick={async () => {
                setInviteBusy(true)
                setInviteMsg(null)
                try {
                  const res = await fetch("/api/dashboard/teams/invite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      team_id: currentTeam.id,
                      email: inviteEmail.trim(),
                      role: inviteRole,
                    }),
                  })
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok) {
                    setInviteMsg(data?.error || `HTTP ${res.status}`)
                  } else if (data?.status === "already_exists") {
                    setInviteMsg(data.message || "User already has an account.")
                  } else {
                    setInviteMsg("Invitation sent.")
                    setTimeout(() => setInviteOpen(false), 800)
                  }
                } catch (e) {
                  setInviteMsg(e instanceof Error ? e.message : "Failed to send invitation")
                } finally {
                  setInviteBusy(false)
                }
              }}
            >
              {inviteBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team settings</DialogTitle>
            <DialogDescription>Update the team name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                disabled={settingsBusy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-desc">Description</Label>
              <Input
                id="team-desc"
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                disabled={settingsBusy}
              />
            </div>
            {settingsMsg && (
              <p className="text-sm text-muted-foreground">{settingsMsg}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)} disabled={settingsBusy}>
              Cancel
            </Button>
            <Button
              disabled={settingsBusy || !settingsName.trim()}
              onClick={async () => {
                setSettingsBusy(true)
                setSettingsMsg(null)
                try {
                  const res = await fetch(
                    `/api/dashboard/teams/${encodeURIComponent(currentTeam.id)}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: settingsName.trim(),
                        description: settingsDesc.trim() || null,
                      }),
                    },
                  )
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok) {
                    setSettingsMsg(data?.error || `HTTP ${res.status}`)
                  } else {
                    setSettingsMsg("Saved.")
                    setReloadTick((t) => t + 1)
                    setTimeout(() => setSettingsOpen(false), 600)
                  }
                } catch (e) {
                  setSettingsMsg(e instanceof Error ? e.message : "Failed to save")
                } finally {
                  setSettingsBusy(false)
                }
              }}
            >
              {settingsBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {teams.length > 1 && (
        <Tabs
          value={currentTeam.id}
          onValueChange={setSelectedTeamId}
          className="space-y-6"
        >
          <TabsList className="flex flex-wrap">
            {teams.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <TeamOverview team={currentTeam} />
    </div>
  )
}
