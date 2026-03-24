"use client"

import type { ReactNode } from "react"
import { SignOutButton } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Building2,
  ChevronDown,
  Database,
  LayoutDashboard,
  List,
  Plug,
  Settings,
  Shield,
  Users,
  ClipboardCheck,
  QueueList,
  DocumentCheck,
  ChartBar,
  DocumentDuplicate,
  Cog,
} from "lucide-react"

import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputSearch } from "@/components/ui/input"
import { formatRoleLabel, getRoleHomePath, isReviewer, isReviewerSeniorOrLead } from "@/lib/roles"
import { cn } from "@/components/ui/utils"

export function DashboardLayout({ children }: { children: ReactNode }) {
  const currentUser = useDashboardUser()
  const pathname = usePathname()

  const roleHomePath = getRoleHomePath(currentUser.role)
  const dashboardHref = currentUser.role === "developer" ? "/dashboard" : roleHomePath

  const navigation = [
    { name: "Dashboard", href: dashboardHref, icon: LayoutDashboard },
    { name: "Analyses", href: "/dashboard/analyses", icon: List },
    { name: "Workspace", href: "/dashboard/organization", icon: Building2 },
  ]

  const adminNavigation = [
    { name: "Base de Connaissance", href: "/dashboard/admin/knowledge-base", icon: Database },
    { name: "Policies & Rules", href: "/dashboard/admin/policies", icon: Shield },
    { name: "Utilisateurs", href: "/dashboard/admin/users", icon: Users },
    { name: "Organizations", href: "/dashboard/admin/organization", icon: Building2 },
    { name: "Observabilite", href: "/dashboard/admin/observability", icon: Activity },
    { name: "Integrations", href: "/dashboard/admin/integrations", icon: Plug },
  ]

  const isActive = (href: string) => {
    if (href === dashboardHref) return pathname === dashboardHref
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const isAdmin = currentUser.role === "admin"
  const isReviewerRole = isReviewer(currentUser.role)
  const isReviewerSeniorOrLeadRole = isReviewerSeniorOrLead(currentUser.role)

  // Mock data for badges - would come from API
  const pendingReviewsCount = 5
  const overdueCount = 1

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar - Enhanced with 280px width and professional design */}
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-border bg-sidebar shadow-pro-sm">
        {/* Logo Header */}
        <div className="flex h-[72px] items-center border-b border-border px-6">
          <Link href={dashboardHref} className="flex items-center gap-3 transition-transform duration-300 hover:scale-105">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-lg font-bold text-white shadow-glow">
              A
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">AI Review</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {navigation.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {/* Glow effect on hover for active items */}
                {active && (
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
                <Icon
                  strokeWidth={2}
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform duration-300",
                    active ? "text-white scale-110" : "text-muted-foreground group-hover:scale-105"
                  )}
                />
                <span className="relative z-10">{item.name}</span>
              </Link>
            )
          })}

          {/* Reviewer Navigation */}
          {isReviewerRole && (
            <div className="pt-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Review Management
              </p>
              <Link
                href="/dashboard/reviewer"
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                  isActive("/dashboard/reviewer") && pathname === "/dashboard/reviewer"
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive("/dashboard/reviewer") && pathname === "/dashboard/reviewer" && (
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
                <ClipboardCheck
                  strokeWidth={2}
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform duration-300",
                    isActive("/dashboard/reviewer") && pathname === "/dashboard/reviewer"
                      ? "text-white scale-110"
                      : "text-muted-foreground group-hover:scale-105"
                  )}
                />
                <span className="relative z-10">Dashboard</span>
                {pendingReviewsCount > 0 && (
                  <span className="relative z-10 ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-pro-sm animate-pulse-glow">
                    {pendingReviewsCount}
                  </span>
                )}
              </Link>

              <Link
                href="/dashboard/reviewer/queue"
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                  isActive("/dashboard/reviewer/queue")
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive("/dashboard/reviewer/queue") && (
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
                <QueueList
                  strokeWidth={2}
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform duration-300",
                    isActive("/dashboard/reviewer/queue") ? "text-white scale-110" : "text-muted-foreground group-hover:scale-105"
                  )}
                />
                <span className="relative z-10">Review Queue</span>
                {overdueCount > 0 && (
                  <span className="relative z-10 ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-pro-sm animate-pulse-glow">
                    {overdueCount}
                  </span>
                )}
              </Link>

              <Link
                href="/dashboard/reviewer/my-reviews"
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                  isActive("/dashboard/reviewer/my-reviews")
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive("/dashboard/reviewer/my-reviews") && (
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
                <DocumentCheck
                  strokeWidth={2}
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform duration-300",
                    isActive("/dashboard/reviewer/my-reviews") ? "text-white scale-110" : "text-muted-foreground group-hover:scale-105"
                  )}
                />
                <span className="relative z-10">My Reviews</span>
              </Link>

              <Link
                href="/dashboard/reviewer/analytics"
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                  isActive("/dashboard/reviewer/analytics")
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive("/dashboard/reviewer/analytics") && (
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
                <ChartBar
                  strokeWidth={2}
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform duration-300",
                    isActive("/dashboard/reviewer/analytics") ? "text-white scale-110" : "text-muted-foreground group-hover:scale-105"
                  )}
                />
                <span className="relative z-10">Analytics</span>
              </Link>

              {isReviewerSeniorOrLeadRole && (
                <Link
                  href="/dashboard/reviewer/team-analytics"
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                    isActive("/dashboard/reviewer/team-analytics")
                      ? "bg-gradient-primary text-white shadow-glow"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {isActive("/dashboard/reviewer/team-analytics") && (
                    <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  )}
                  <Activity
                    strokeWidth={2}
                    className={cn(
                      "relative z-10 h-5 w-5 transition-transform duration-300",
                      isActive("/dashboard/reviewer/team-analytics") ? "text-white scale-110" : "text-muted-foreground group-hover:scale-105"
                    )}
                  />
                  <span className="relative z-10">Team Analytics</span>
                </Link>
              )}

              {isReviewerSeniorOrLeadRole && (
                <Link
                  href="/dashboard/reviewer/templates"
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                    isActive("/dashboard/reviewer/templates")
                      ? "bg-gradient-primary text-white shadow-glow"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {isActive("/dashboard/reviewer/templates") && (
                    <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  )}
                  <DocumentDuplicate
                    strokeWidth={2}
                    className={cn(
                      "relative z-10 h-5 w-5 transition-transform duration-300",
                      isActive("/dashboard/reviewer/templates") ? "text-white scale-110" : "text-muted-foreground group-hover:scale-105"
                    )}
                  />
                  <span className="relative z-10">Templates</span>
                </Link>
              )}

              <Link
                href="/dashboard/reviewer/settings"
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                  isActive("/dashboard/reviewer/settings")
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive("/dashboard/reviewer/settings") && (
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                )}
                <Cog
                  strokeWidth={2}
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform duration-300",
                    isActive("/dashboard/reviewer/settings") ? "text-white scale-110" : "text-muted-foreground group-hover:scale-105"
                  )}
                />
                <span className="relative z-10">Settings</span>
              </Link>
            </div>
          )}

          {/* Admin Navigation */}
          {isAdmin && (
            <div className="pt-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Administration
              </p>
              {adminNavigation.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                      active
                        ? "bg-gradient-primary text-white shadow-glow"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {active && (
                      <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    )}
                    <Icon
                      strokeWidth={2}
                      className={cn(
                        "relative z-10 h-5 w-5 transition-transform duration-300",
                        active ? "text-white scale-110" : "text-muted-foreground group-hover:scale-105"
                      )}
                    />
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content - Adjusted for 280px sidebar */}
      <div className="ml-[280px] min-h-screen">
        {/* Header - Redesigned with professional look */}
        <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-border bg-sidebar/95 backdrop-blur-md px-8 shadow-pro-sm">
          {/* Search Bar with new InputSearch component */}
          <div className="w-full max-w-md">
            <InputSearch placeholder="Search anything..." />
          </div>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-6 flex items-center gap-3 rounded-2xl border border-transparent p-2 transition-all duration-300 hover:border-border hover:bg-sidebar-accent hover:shadow-pro-sm">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-sidebar-foreground">{currentUser.name}</p>
                  <p className="text-xs font-medium capitalize text-muted-foreground">{formatRoleLabel(currentUser.role)}</p>
                </div>
                <Avatar className="h-10 w-10 border-2 border-primary/20 ring-2 ring-transparent transition-all duration-300 hover:ring-primary/30">
                  <AvatarFallback className="bg-gradient-primary text-sm font-bold text-white">
                    {currentUser.avatar}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-2xl border border-border bg-card shadow-pro-lg animate-scale-in-fade"
            >
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1.5 py-2">
                  <span className="text-sm font-semibold text-card-foreground">{currentUser.name}</span>
                  <span className="text-xs text-muted-foreground">{currentUser.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="cursor-pointer rounded-xl text-sm text-card-foreground transition-all duration-200 focus:bg-sidebar-accent focus:text-primary">
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <SignOutButton>
                <DropdownMenuItem className="cursor-pointer rounded-xl text-sm text-destructive transition-all duration-200 focus:bg-destructive/10 focus:text-destructive">
                  Sign out
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main content with better spacing */}
        <main className="mx-auto w-full max-w-[1200px] p-8">
          <div className="animate-fade-in-up">{children}</div>
        </main>
      </div>
    </div>
  )
}
