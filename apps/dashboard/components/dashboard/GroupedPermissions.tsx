"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ChevronDown, 
  ChevronRight, 
  Shield, 
  Users, 
  FileCode, 
  MessageSquare, 
  ClipboardList, 
  BarChart3,
  FileTemplate,
  Settings,
  Lock
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type PermissionCatalogItem = {
  code: string
  description: string
  userCount: number
}

type PermissionGroup = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permissions: PermissionCatalogItem[]
  gradient: string
}

// Map permission prefixes to groups
const PERMISSION_GROUPS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; gradient: string }> = {
  reviews: { label: "Reviews", icon: FileCode, gradient: "from-purple-500 to-pink-500" },
  comments: { label: "Comments", icon: MessageSquare, gradient: "from-blue-500 to-cyan-500" },
  threads: { label: "Discussions", icon: Users, gradient: "from-indigo-500 to-purple-500" },
  assignments: { label: "Assignments", icon: ClipboardList, gradient: "from-amber-500 to-orange-500" },
  metrics: { label: "Metrics", icon: BarChart3, gradient: "from-green-500 to-emerald-500" },
  templates: { label: "Templates", icon: FileTemplate, gradient: "from-rose-500 to-red-500" },
  analyses: { label: "Analyses", icon: Settings, gradient: "from-teal-500 to-cyan-500" },
  admin: { label: "Administration", icon: Shield, gradient: "from-red-500 to-orange-500" },
  other: { label: "Other", icon: Lock, gradient: "from-gray-500 to-slate-500" },
}

function groupPermissions(permissions: PermissionCatalogItem[]): PermissionGroup[] {
  const groups: Record<string, PermissionCatalogItem[]> = {}

  for (const permission of permissions) {
    const prefix = permission.code.split(".")[0] || "other"
    if (!groups[prefix]) {
      groups[prefix] = []
    }
    groups[prefix].push(permission)
  }

  const result: PermissionGroup[] = []
  for (const [prefix, perms] of Object.entries(groups)) {
    const config = PERMISSION_GROUPS_CONFIG[prefix] || PERMISSION_GROUPS_CONFIG.other
    result.push({
      id: prefix,
      label: config.label,
      icon: config.icon,
      permissions: perms.sort((a, b) => a.code.localeCompare(b.code)),
      gradient: config.gradient,
    })
  }

  // Sort groups by label
  return result.sort((a, b) => a.label.localeCompare(b.label))
}

type PermissionGroupCardProps = {
  group: PermissionGroup
  isExpanded: boolean
  onToggle: () => void
}

function PermissionGroupCard({ group, isExpanded, onToggle }: PermissionGroupCardProps) {
  const Icon = group.icon
  const totalUsers = group.permissions.reduce((sum, p) => sum + p.userCount, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
    >
      {/* Group Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-4 transition-colors",
          "bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent",
          "hover:from-gray-100 hover:to-gray-50/50 dark:hover:from-gray-800 dark:hover:to-gray-800/30"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${group.gradient}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <span className="font-medium text-gray-900 dark:text-white">{group.label}</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {group.permissions.length} permission{group.permissions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono">
            {totalUsers} user{totalUsers !== 1 ? "s" : ""}
          </Badge>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </motion.div>
        </div>
      </button>

      {/* Permission List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ScrollArea className="max-h-[300px]">
              <div className="p-2 space-y-1 bg-white/50 dark:bg-gray-900/30">
                {group.permissions.map((permission, index) => (
                  <motion.div
                    key={permission.code}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      "hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 font-mono">
                          {permission.code}
                        </code>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {permission.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-4 shrink-0">
                      {permission.userCount}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

type GroupedPermissionsProps = {
  permissions: PermissionCatalogItem[]
  title?: string
  className?: string
}

export function GroupedPermissions({ permissions, title = "Permissions disponibles", className }: GroupedPermissionsProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const groups = useMemo(() => groupPermissions(permissions), [permissions])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedGroups(new Set(groups.map((g) => g.id)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const totalPermissions = permissions.length
  const totalUsers = permissions.reduce((sum, p) => sum + p.userCount, 0)

  return (
    <Card className={cn("bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-500" />
          <CardTitle>{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {totalPermissions} permissions
          </Badge>
          <Badge variant="outline">
            {totalUsers} total assignations
          </Badge>
          <div className="flex gap-1 ml-2">
            <button
              onClick={expandAll}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Expand all
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Collapse all
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Aucune permission chargée.</p>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {groups.map((group) => (
                <PermissionGroupCard
                  key={group.id}
                  group={group}
                  isExpanded={expandedGroups.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
