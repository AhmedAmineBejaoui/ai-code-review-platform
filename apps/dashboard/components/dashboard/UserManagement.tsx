"use client"
/* eslint-disable react/no-unescaped-entities */

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Edit, Search, Shield, UserCog, UserPlus, Users, X } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { GroupedPermissions } from "./GroupedPermissions"

type AdminUser = {
  id: string
  email: string
  displayName: string | null
  isActive: boolean
  roles: string[]
  permissions: string[]
}

type PermissionCatalogItem = {
  code: string
  description: string
  userCount: number
}

type UsersPayload = {
  items?: AdminUser[]
  permissions?: PermissionCatalogItem[]
  stats?: {
    totalUsers?: number
    admins?: number
    reviewers?: number
    developers?: number
    activeUsers?: number
  }
}

type IntegrationsPayload = {
  ciToken?: {
    exists?: boolean
    prefix?: string | null
    createdAt?: string | null
    revoked?: boolean
  }
}

type RoleValue =
  | "admin"
  | "reviewer_lead"
  | "reviewer_senior"
  | "reviewer_junior"
  | "developer"
  | "viewer"

type RoleOption = {
  value: RoleValue
  label: string
  description: string
  chips: string[]
  dotClass: string
  badgeClass: string
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "viewer",
    label: "Viewer",
    description: "Accès en lecture seule aux projets et analyses.",
    chips: ["Consulter", "Surveiller"],
    dotClass: "bg-slate-400",
    badgeClass:
      "border-slate-300/70 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
  },
  {
    value: "developer",
    label: "Developer",
    description: "Peut soumettre des PRs pour analyse et consulter les résultats détaillés.",
    chips: ["Soumettre", "Consulter", "Commenter"],
    dotClass: "bg-emerald-400",
    badgeClass:
      "border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-200",
  },
  {
    value: "reviewer_junior",
    label: "Junior Reviewer",
    description: "Peut approuver les PRs, suggérer des changements et escalader les cas complexes.",
    chips: ["Approuver", "Suggérer", "Escalader"],
    dotClass: "bg-sky-400",
    badgeClass:
      "border-sky-500/25 bg-sky-500/15 text-sky-600 dark:text-sky-200",
  },
  {
    value: "reviewer_senior",
    label: "Senior Reviewer",
    description: "Peut approuver, bloquer les PRs et demander des changements obligatoires.",
    chips: ["Approuver", "Bloquer", "Demander changements"],
    dotClass: "bg-violet-400",
    badgeClass:
      "border-violet-500/25 bg-violet-500/15 text-violet-600 dark:text-violet-200",
  },
  {
    value: "reviewer_lead",
    label: "Lead Reviewer",
    description: "Accès complet pour gérer l’équipe, assigner les reviews et piloter les templates.",
    chips: ["Assigner", "Déléguer", "Templates", "Analytics équipe"],
    dotClass: "bg-amber-400",
    badgeClass:
      "border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-200",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Accès complet à toutes les fonctionnalités de la plateforme.",
    chips: ["Utilisateurs", "Intégrations", "Paramètres"],
    dotClass: "bg-rose-400",
    badgeClass:
      "border-rose-500/25 bg-rose-500/15 text-rose-600 dark:text-rose-200",
  },
]

const ROLE_LOOKUP = new Map(ROLE_OPTIONS.map((option) => [option.value, option]))

function normalizeRole(role: string): RoleValue {
  if (role === "admin") return "admin"
  if (role === "reviewer_lead") return "reviewer_lead"
  if (role === "reviewer_senior" || role === "reviewer") return "reviewer_senior"
  if (role === "reviewer_junior") return "reviewer_junior"
  if (role === "developer") return "developer"
  return "viewer"
}

function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const record = payload as {
    message?: unknown
    detail?: unknown
    error?: unknown
  }

  if (typeof record.message === "string" && record.message.trim().length > 0) {
    return record.message
  }

  if (typeof record.detail === "string" && record.detail.trim().length > 0) {
    return record.detail
  }

  if (typeof record.error === "string" && record.error.trim().length > 0) {
    return record.error
  }

  if (record.error && typeof record.error === "object") {
    const nested = record.error as { message?: unknown; detail?: unknown; code?: unknown }
    if (typeof nested.message === "string" && nested.message.trim().length > 0) {
      return nested.message
    }
    if (typeof nested.detail === "string" && nested.detail.trim().length > 0) {
      return nested.detail
    }
    if (typeof nested.code === "string" && nested.code.trim().length > 0) {
      return nested.code
    }
  }

  return fallback
}

function initials(nameOrEmail: string): string {
  const cleaned = nameOrEmail.trim()
  if (!cleaned) {
    return "US"
  }
  const parts = cleaned.split(" ").filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return cleaned.slice(0, 2).toUpperCase()
}

function displayNameOf(user: AdminUser): string {
  return user.displayName && user.displayName.trim().length > 0 ? user.displayName : user.email
}

function primaryRole(user: AdminUser): RoleValue {
  if (user.roles.includes("admin")) {
    return "admin"
  }
  if (user.roles.includes("reviewer_lead")) {
    return "reviewer_lead"
  }
  if (user.roles.includes("reviewer_senior") || user.roles.includes("reviewer")) {
    return "reviewer_senior"
  }
  if (user.roles.includes("reviewer_junior")) {
    return "reviewer_junior"
  }
  if (user.roles.includes("developer")) {
    return "developer"
  }
  return normalizeRole(user.roles[0] ?? "viewer")
}

function getRoleMeta(role: string) {
  return ROLE_LOOKUP.get(normalizeRole(role)) ?? ROLE_OPTIONS[0]
}

function hasReviewerRole(user: AdminUser): boolean {
  return user.roles.some((role) => role === "reviewer" || role.startsWith("reviewer_"))
}

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [permissions, setPermissions] = useState<PermissionCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [tokenBusy, setTokenBusy] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<IntegrationsPayload["ciToken"] | null>(null)
  const [lastRotatedToken, setLastRotatedToken] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    reviewers: 0,
    developers: 0,
    activeUsers: 0,
  })
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleValue>("viewer")

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      await fetch("/api/auth/sync", {
        method: "POST",
        cache: "no-store",
        headers: { Accept: "application/json" },
      }).catch(() => null)

      const usersResponse = await fetch("/api/dashboard/admin/users?limit=250", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      const usersPayload = (await usersResponse.json().catch(() => ({}))) as UsersPayload
      if (!usersResponse.ok) {
        throw new Error(extractApiErrorMessage(usersPayload, "Impossible de charger les utilisateurs."))
      }

      const items = Array.isArray(usersPayload.items) ? usersPayload.items : []
      const permissionItems = Array.isArray(usersPayload.permissions) ? usersPayload.permissions : []
      const payloadStats = usersPayload.stats ?? {}

      setUsers(items)
      setPermissions(permissionItems)
      setStats({
        totalUsers: Number(payloadStats.totalUsers ?? items.length),
        admins: Number(payloadStats.admins ?? items.filter((item) => primaryRole(item) === "admin").length),
        reviewers: Number(payloadStats.reviewers ?? items.filter((item) => hasReviewerRole(item)).length),
        developers: Number(payloadStats.developers ?? items.filter((item) => primaryRole(item) === "developer").length),
        activeUsers: Number(payloadStats.activeUsers ?? items.filter((item) => item.isActive).length),
      })

      const integrationsResponse = await fetch("/api/dashboard/admin/integrations", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      const integrationsPayload = (await integrationsResponse.json().catch(() => ({}))) as IntegrationsPayload
      if (integrationsResponse.ok) {
        setTokenInfo(integrationsPayload.ciToken ?? null)
      } else {
        setActionMessage(
          extractApiErrorMessage(
            integrationsPayload,
            "Les utilisateurs sont chargés, mais les informations d'intégration CI sont indisponibles.",
          ),
        )
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Impossible de charger les utilisateurs."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => Number(right.isActive) - Number(left.isActive)),
    [users],
  )

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return sortedUsers
    }
    return sortedUsers.filter((user) => {
      const primary = primaryRole(user)
      const roleMeta = getRoleMeta(primary)
      const haystack = [displayNameOf(user), user.email, primary, roleMeta.label, ...user.permissions]
      return haystack.some((value) => value.toLowerCase().includes(query))
    })
  }, [searchQuery, sortedUsers])

  const selectedRoleMeta = useMemo(() => getRoleMeta(selectedRole), [selectedRole])

  const patchUser = async (userId: string, body: { role?: string; isActive?: boolean }) => {
    setBusyUserId(userId)
    setActionMessage(null)
    try {
      const response = await fetch(`/api/dashboard/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; item?: AdminUser }
      if (!response.ok || !payload.item) {
        throw new Error(extractApiErrorMessage(payload, "Mise à jour utilisateur impossible."))
      }
      setUsers((previous) => previous.map((user) => (user.id === userId ? payload.item! : user)))
      setActionMessage("Utilisateur mis à jour.")
      await loadData()
      return true
    } catch (updateError) {
      setActionMessage(updateError instanceof Error ? updateError.message : "Mise à jour utilisateur impossible.")
      return false
    } finally {
      setBusyUserId(null)
    }
  }

  const openRoleDialog = (user: AdminUser) => {
    setSelectedUser(user)
    setSelectedRole(normalizeRole(primaryRole(user)))
    setRoleDialogOpen(true)
  }

  const saveRole = async () => {
    if (!selectedUser || !selectedRole) return
    const updated = await patchUser(selectedUser.id, { role: selectedRole })
    if (updated) {
      setRoleDialogOpen(false)
      setSelectedUser(null)
    }
  }

  const rotateCiToken = async () => {
    setTokenBusy(true)
    setActionMessage(null)
    try {
      const response = await fetch("/api/dashboard/admin/integrations/ci-token", {
        method: "POST",
        headers: { Accept: "application/json" },
      })
      const payload = (await response.json().catch(() => ({}))) as {
        token?: string
        prefix?: string
        createdAt?: string
        error?: string
      }
      if (!response.ok || typeof payload.token !== "string") {
        throw new Error(extractApiErrorMessage(payload, "Rotation du token impossible."))
      }
      setLastRotatedToken(payload.token)
      setTokenInfo({
        exists: true,
        prefix: payload.prefix ?? payload.token.slice(0, 12),
        createdAt: payload.createdAt ?? new Date().toISOString(),
        revoked: false,
      })
      setActionMessage("Nouveau token généré. Copiez-le maintenant.")
    } catch (rotateError) {
      setActionMessage(rotateError instanceof Error ? rotateError.message : "Rotation du token impossible.")
    } finally {
      setTokenBusy(false)
    }
  }

  const revokeCiToken = async () => {
    setTokenBusy(true)
    setActionMessage(null)
    try {
      const response = await fetch("/api/dashboard/admin/integrations/ci-token", {
        method: "DELETE",
        headers: { Accept: "application/json" },
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(payload, "Revocation du token impossible."))
      }
      setLastRotatedToken(null)
      setTokenInfo((previous) => ({
        ...(previous ?? {}),
        exists: false,
        revoked: true,
      }))
      setActionMessage("Token CI révoqué.")
    } catch (revokeError) {
      setActionMessage(revokeError instanceof Error ? revokeError.message : "Revocation du token impossible.")
    } finally {
      setTokenBusy(false)
    }
  }

  const statsCards = [
    { label: "Total utilisateurs", value: stats.totalUsers, icon: Users, gradient: "from-violet-500 to-fuchsia-500" },
    { label: "Admins", value: stats.admins, icon: Shield, gradient: "from-rose-500 to-orange-500" },
    { label: "Reviewers", value: stats.reviewers, icon: CheckCircle2, gradient: "from-amber-500 to-yellow-500" },
    { label: "Développeurs", value: stats.developers, icon: UserCog, gradient: "from-emerald-500 to-teal-500" },
  ]

  return (
    <motion.div className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 lg:px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500 ring-1 ring-violet-500/20 dark:bg-violet-400/15 dark:text-violet-300">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-foreground md:text-[2.5rem]">Gestion des utilisateurs</h1>
            <p className="text-sm text-muted-foreground">Gestion des accès et permissions (RBAC)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-full border-border/70 bg-white/95 px-5 text-sm font-medium text-slate-900 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-50"
          >
            <Link href="/dashboard/admin/organization">Gérer les invitations organization</Link>
          </Button>
          <Button className="h-11 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-medium text-white shadow-[0_16px_35px_rgba(124,58,237,0.35)] hover:from-violet-500 hover:to-fuchsia-500">
            <UserPlus className="h-4 w-4" />
            Ajouter utilisateur
          </Button>
        </div>
      </motion.div>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-200">{error}</div>}
      {actionMessage && <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-600 dark:text-sky-200">{actionMessage}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ y: -4, scale: 1.01 }}
          >
            <Card className="relative overflow-hidden rounded-[28px] border border-border/70 bg-white/75 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b1016]/75 dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
              <div className={`absolute -right-6 -top-8 size-28 rounded-full bg-gradient-to-br ${stat.gradient} opacity-15 blur-2xl`} />
              <CardContent className="relative z-10 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground/80">{stat.label}</p>
                    <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">{stat.value}</p>
                  </div>
                  <div className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-[0_12px_25px_rgba(0,0,0,0.18)]`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="rounded-[28px] border border-border/70 bg-white/70 p-3 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b1016]/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              type="search"
              placeholder="Rechercher un utilisateur, un email, un rôle ou une permission"
              className="h-12 w-full rounded-[20px] border border-border/70 bg-background/85 pl-11 pr-11 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500/50 focus:bg-background dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/10"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
              {filteredUsers.length} visibles
            </span>
            <span className="hidden md:inline">sur {sortedUsers.length} utilisateurs</span>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="rounded-[30px] border border-border/70 bg-white/75 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0a0f16]/80 dark:shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-[1.15rem] font-semibold tracking-[-0.02em] text-foreground">Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/50 dark:border-white/10 dark:bg-white/5">
              <Table className="border-separate border-spacing-0">
                <TableHeader>
                  <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/5">
                    <TableHead className="px-6 py-4 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Utilisateur</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Email</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Rôle</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">
                        Chargement des utilisateurs...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">
                        {searchQuery ? "Aucun utilisateur ne correspond à cette recherche." : "Aucun utilisateur RBAC trouvé."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, index) => {
                      const role = primaryRole(user)
                      const roleMeta = getRoleMeta(role)
                      const isBusy = busyUserId === user.id
                      const permissionPreview = user.permissions.slice(0, 5)
                      const extraPermissions = Math.max(0, user.permissions.length - permissionPreview.length)
                      const avatarGradient =
                        role === "admin"
                          ? "from-rose-500 to-orange-500"
                          : role === "reviewer_lead"
                            ? "from-amber-500 to-orange-500"
                            : role === "reviewer_senior"
                              ? "from-violet-500 to-fuchsia-500"
                              : role === "reviewer_junior"
                                ? "from-sky-500 to-cyan-500"
                                : role === "developer"
                                  ? "from-emerald-500 to-teal-500"
                                  : "from-slate-500 to-slate-700"

                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.03 }}
                          className="group border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/25 dark:border-white/5 dark:hover:bg-white/5"
                        >
                          <TableCell className="px-6 py-5 align-top">
                            <div className="flex items-start gap-3">
                              <motion.div whileHover={{ scale: 1.05 }}>
                                <Avatar className="size-11 border border-border/60 ring-2 ring-transparent ring-offset-2 ring-offset-background transition group-hover:ring-violet-500/40 dark:border-white/10 dark:ring-offset-[#0a0f16]">
                                  <AvatarFallback className={`bg-gradient-to-br ${avatarGradient} font-semibold text-white`}>
                                    {initials(displayNameOf(user))}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                              <div className="space-y-1 pt-0.5">
                                <p className="font-medium tracking-[-0.01em] text-foreground">{displayNameOf(user)}</p>
                                <p className={`text-xs font-medium ${user.isActive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                                  {user.isActive ? "Active" : "Desactive"}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-6 py-5 align-top text-sm text-muted-foreground">{user.email}</TableCell>

                          <TableCell className="px-6 py-5 align-top">
                            <div className="flex items-center gap-2">
                              <Badge className={`rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide ${roleMeta.badgeClass}`}>
                                {roleMeta.label}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRoleDialog(user)}
                                disabled={isBusy}
                                className="size-8 rounded-full border border-border/70 bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell className="px-6 py-5 align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {permissionPreview.length === 0 ? (
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-mono text-muted-foreground dark:border-white/10 dark:bg-white/5">
                                  aucune
                                </span>
                              ) : (
                                permissionPreview.map((permission) => (
                                  <span
                                    key={permission}
                                    className="inline-flex items-center rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-mono text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                  >
                                    {permission}
                                  </span>
                                ))
                              )}
                              {extraPermissions > 0 && (
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-mono text-muted-foreground dark:border-white/10 dark:bg-white/5">
                                  +{extraPermissions}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <GroupedPermissions permissions={permissions} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
        <Card className="rounded-[28px] border border-border/70 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b1016]/80">
          <CardHeader>
            <CardTitle className="text-[1.05rem] font-semibold tracking-[-0.02em]">Gestion des tokens CI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ce token sert à l&apos;intégration CI/CD (rotation et révocation réelles).
            </p>
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm text-foreground">
                État token:{" "}
                {tokenInfo?.exists && !tokenInfo?.revoked ? (
                  <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                    Actif ({tokenInfo?.prefix ?? "prefix inconnu"})
                  </span>
                ) : (
                  <span className="font-semibold text-[color:var(--orange)] dark:text-amber-400">Aucun token actif</span>
                )}
              </p>
              {tokenInfo?.createdAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Dernière rotation: {new Date(tokenInfo.createdAt).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
            {lastRotatedToken && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <p className="mb-1 text-xs text-emerald-700 dark:text-emerald-200">
                  Nouveau token (affiché une seule fois):
                </p>
                <code className="break-all text-xs text-emerald-900 dark:text-emerald-100">{lastRotatedToken}</code>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="bg-background/80 text-foreground dark:bg-white/5" onClick={() => void rotateCiToken()} disabled={tokenBusy}>
                  Générer nouveau token
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="bg-background/80 text-foreground dark:bg-white/5" onClick={() => void revokeCiToken()} disabled={tokenBusy}>
                  Révoquer le token actif
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-[28px] border border-border/70 bg-white/95 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#131821]/95 dark:shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-[1.55rem] font-semibold tracking-[-0.03em] text-foreground">
              Modifier le rôle de l&apos;utilisateur
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Sélectionnez le nouveau rôle pour {selectedUser ? displayNameOf(selectedUser) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(normalizeRole(value))}>
              <SelectTrigger className="h-14 w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-left text-sm shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className={`size-3 rounded-full ${selectedRoleMeta.dotClass}`} />
                  <span className="font-medium text-foreground">{selectedRoleMeta.label}</span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-[24px] border border-border/70 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#1d2229]">
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem
                    key={role.value}
                    value={role.value}
                    className="rounded-xl px-4 py-3 text-sm text-foreground data-[highlighted]:bg-muted/80 data-[highlighted]:text-foreground dark:data-[highlighted]:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`size-2.5 rounded-full ${role.dotClass}`} />
                      <span>{role.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-[22px] border border-border/70 bg-muted/40 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${selectedRoleMeta.dotClass}`} />
                <p className="text-base font-semibold tracking-[-0.02em] text-foreground">{selectedRoleMeta.label}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedRoleMeta.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedRoleMeta.chips.map((chip) => (
                  <Badge
                    key={chip}
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    {chip}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              className="rounded-full border-border/70 bg-background/70 text-foreground hover:bg-background dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              onClick={() => void saveRole()}
              disabled={!selectedRole || busyUserId === selectedUser?.id}
              className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
