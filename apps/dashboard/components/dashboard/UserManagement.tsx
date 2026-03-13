"use client"
/* eslint-disable react/no-unescaped-entities */

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Users, Plus, Trash2, Edit, Shield, Sparkles } from "lucide-react"

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

function primaryRole(user: AdminUser): string {
  if (user.roles.includes("admin")) {
    return "admin"
  }
  if (user.roles.includes("reviewer")) {
    return "reviewer"
  }
  if (user.roles.includes("developer")) {
    return "developer"
  }
  return user.roles[0] ?? "viewer"
}

function roleToUi(role: string): "admin" | "reviewer" | "dev" | "viewer" {
  if (role === "admin") {
    return "admin"
  }
  if (role === "reviewer") {
    return "reviewer"
  }
  if (role === "developer") {
    return "dev"
  }
  return "viewer"
}

function roleGradient(role: string): string {
  if (role === "admin") {
    return "from-red-500 to-orange-500"
  }
  if (role === "reviewer") {
    return "from-purple-500 to-pink-500"
  }
  if (role === "developer") {
    return "from-blue-500 to-cyan-500"
  }
  return "from-gray-500 to-slate-500"
}

const ROLE_CYCLE = ["developer", "reviewer", "admin", "viewer"] as const

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
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    reviewers: 0,
    developers: 0,
    activeUsers: 0,
  })

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Keep backend RBAC profile in sync with Clerk session before admin API calls.
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
        reviewers: Number(payloadStats.reviewers ?? items.filter((item) => primaryRole(item) === "reviewer").length),
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
            "Les utilisateurs sont charges, mais les informations d'integration CI sont indisponibles.",
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

  const getRoleBadge = (role: string) => {
    const normalizedRole = roleToUi(role)
    if (normalizedRole === "admin") {
      return <Badge variant="destructive">admin</Badge>
    }
    if (normalizedRole === "reviewer") {
      return <Badge variant="secondary">reviewer</Badge>
    }
    if (normalizedRole === "dev") {
      return <Badge variant="outline">dev</Badge>
    }
    return <Badge variant="outline">viewer</Badge>
  }

  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => Number(right.isActive) - Number(left.isActive)),
    [users],
  )

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
        throw new Error(extractApiErrorMessage(payload, "Mise a jour utilisateur impossible."))
      }
      setUsers((previous) => previous.map((user) => (user.id === userId ? payload.item! : user)))
      setActionMessage("Utilisateur mis a jour.")
      await loadData()
    } catch (updateError) {
      setActionMessage(updateError instanceof Error ? updateError.message : "Mise a jour utilisateur impossible.")
    } finally {
      setBusyUserId(null)
    }
  }

  const rotateRole = async (user: AdminUser) => {
    const current = primaryRole(user)
    const index = ROLE_CYCLE.indexOf(current as (typeof ROLE_CYCLE)[number])
    const nextRole = ROLE_CYCLE[(index + 1 + ROLE_CYCLE.length) % ROLE_CYCLE.length]
    await patchUser(user.id, { role: nextRole })
  }

  const toggleActive = async (user: AdminUser) => {
    await patchUser(user.id, { isActive: !user.isActive })
  }

  const deactivate = async (user: AdminUser) => {
    if (!user.isActive) {
      setActionMessage("Utilisateur deja desactive.")
      return
    }
    await patchUser(user.id, { isActive: false })
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
      setActionMessage("Nouveau token genere. Copiez-le maintenant.")
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
      setActionMessage("Token CI revoque.")
    } catch (revokeError) {
      setActionMessage(revokeError instanceof Error ? revokeError.message : "Revocation du token impossible.")
    } finally {
      setTokenBusy(false)
    }
  }

  const statsCards = [
    { label: "Total utilisateurs", value: stats.totalUsers, icon: Users, gradient: "from-blue-500 to-cyan-500" },
    { label: "Admins", value: stats.admins, icon: Shield, gradient: "from-red-500 to-orange-500" },
    { label: "Reviewers", value: stats.reviewers, icon: Shield, gradient: "from-orange-500 to-yellow-500" },
    { label: "Developpeurs", value: stats.developers, icon: Users, gradient: "from-green-500 to-emerald-500" },
  ]

  return (
    <motion.div className="max-w-6xl mx-auto space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="flex justify-between items-start" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-100 dark:to-purple-100 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <Users className="h-10 w-10 text-indigo-500" />
            Gestion des utilisateurs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Gestion des acces et permissions (RBAC)</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button asChild className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
            <Link href="/dashboard/admin/organization">
              <Plus className="h-4 w-4" />
              Ajouter utilisateur
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {actionMessage && (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">{actionMessage}</div>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }} whileHover={{ y: -4, scale: 1.02 }}>
            <Card className="relative overflow-hidden bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-20 rounded-full blur-2xl`} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                  <motion.div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`} whileHover={{ scale: 1.1, rotate: 360 }} transition={{ duration: 0.5 }}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle>Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Chargement des utilisateurs...
                      </TableCell>
                    </TableRow>
                  ) : sortedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Aucun utilisateur RBAC trouve.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedUsers.map((user, index) => {
                      const role = primaryRole(user)
                      const gradient = roleGradient(role)
                      const isBusy = busyUserId === user.id
                      return (
                        <motion.tr key={user.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.03 }} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <motion.div whileHover={{ scale: 1.1 }}>
                                <Avatar className="ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-transparent group-hover:ring-blue-500/50 transition-all">
                                  <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-semibold`}>
                                    {initials(displayNameOf(user))}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                              <div>
                                <span className="font-medium text-gray-900 dark:text-white">{displayNameOf(user)}</span>
                                {!user.isActive && <p className="text-xs text-red-400">Desactive</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">{user.email}</TableCell>
                          <TableCell>{getRoleBadge(role)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.permissions.length === 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  aucune
                                </Badge>
                              ) : (
                                user.permissions.map((permission) => (
                                  <Badge key={permission} variant="outline" className="text-xs">
                                    {permission}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon" onClick={() => void rotateRole(user)} disabled={isBusy}>
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon" onClick={() => void toggleActive(user)} disabled={isBusy}>
                                  <Shield className="h-4 w-4 text-purple-600" />
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                                <Button variant="ghost" size="icon" onClick={() => void deactivate(user)} disabled={isBusy}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </motion.div>
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
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Permissions disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {permissions.map((permission, index) => (
                <motion.div key={permission.code} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + index * 0.04 }} whileHover={{ x: 4 }} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{permission.description}</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Permission ID:{" "}
                        <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700">
                          {permission.code}
                        </code>
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{permission.userCount} utilisateur(s)</Badge>
                </motion.div>
              ))}
              {permissions.length === 0 && <p className="text-sm text-gray-500">Aucune permission chargee.</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 backdrop-blur-xl border-purple-200/50 dark:border-purple-800/50">
          <CardHeader>
            <CardTitle>Gestion des tokens CI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ce token sert a l'integration CI/CD (rotation et revocation reelles).
            </p>
            <div className="rounded-lg border border-purple-300/30 bg-white/60 dark:bg-gray-900/40 px-4 py-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Etat token:{" "}
                {tokenInfo?.exists && !tokenInfo?.revoked ? (
                  <span className="font-semibold text-emerald-400">Actif ({tokenInfo?.prefix ?? "prefix inconnu"})</span>
                ) : (
                  <span className="font-semibold text-amber-400">Aucun token actif</span>
                )}
              </p>
              {tokenInfo?.createdAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Derniere rotation: {new Date(tokenInfo.createdAt).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
            {lastRotatedToken && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                <p className="text-xs text-emerald-200 mb-1">Nouveau token (affiche une seule fois):</p>
                <code className="text-xs break-all">{lastRotatedToken}</code>
              </div>
            )}
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="bg-white dark:bg-gray-800" onClick={() => void rotateCiToken()} disabled={tokenBusy}>
                  Generer nouveau token
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="bg-white dark:bg-gray-800" onClick={() => void revokeCiToken()} disabled={tokenBusy}>
                  Revoquer le token actif
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
