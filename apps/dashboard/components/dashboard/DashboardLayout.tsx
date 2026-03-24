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
                <DocumentCheck strokeWidth={2} className={`h-[18px] w-[18px] ${isActive("/dashboard/reviewer/my-reviews") ? "text-white" : "text-[#64748b]"}`} />
                <span>My Reviews</span>
              </Link>

              <Link
                href="/dashboard/reviewer/analytics"
                className={`flex items-center gap-3 rounded-[12px] px-4 py-3 text-[14px] transition-colors ${
                  isActive("/dashboard/reviewer/analytics")
                    ? "bg-[#6b5ce7] font-semibold text-white shadow-[0_4px_14px_rgba(107,92,231,0.25)]"
                    : "font-medium text-[#64748b] hover:bg-[#f8f9fa] hover:text-[#1e293b]"
                }`}
              >
                <ChartBar strokeWidth={2} className={`h-[18px] w-[18px] ${isActive("/dashboard/reviewer/analytics") ? "text-white" : "text-[#64748b]"}`} />
                <span>Analytics</span>
              </Link>

              {isReviewerSeniorOrLeadRole && (
                <Link
                  href="/dashboard/reviewer/team-analytics"
                  className={`flex items-center gap-3 rounded-[12px] px-4 py-3 text-[14px] transition-colors ${
                    isActive("/dashboard/reviewer/team-analytics")
                      ? "bg-[#6b5ce7] font-semibold text-white shadow-[0_4px_14px_rgba(107,92,231,0.25)]"
                      : "font-medium text-[#64748b] hover:bg-[#f8f9fa] hover:text-[#1e293b]"
                  }`}
                >
                  <Activity strokeWidth={2} className={`h-[18px] w-[18px] ${isActive("/dashboard/reviewer/team-analytics") ? "text-white" : "text-[#64748b]"}`} />
                  <span>Team Analytics</span>
                </Link>
              )}

              {isReviewerSeniorOrLeadRole && (
                <Link
                  href="/dashboard/reviewer/templates"
                  className={`flex items-center gap-3 rounded-[12px] px-4 py-3 text-[14px] transition-colors ${
                    isActive("/dashboard/reviewer/templates")
                      ? "bg-[#6b5ce7] font-semibold text-white shadow-[0_4px_14px_rgba(107,92,231,0.25)]"
                      : "font-medium text-[#64748b] hover:bg-[#f8f9fa] hover:text-[#1e293b]"
                  }`}
                >
                  <DocumentDuplicate strokeWidth={2} className={`h-[18px] w-[18px] ${isActive("/dashboard/reviewer/templates") ? "text-white" : "text-[#64748b]"}`} />
                  <span>Templates</span>
                </Link>
              )}

              <Link
                href="/dashboard/reviewer/settings"
                className={`flex items-center gap-3 rounded-[12px] px-4 py-3 text-[14px] transition-colors ${
                  isActive("/dashboard/reviewer/settings")
                    ? "bg-[#6b5ce7] font-semibold text-white shadow-[0_4px_14px_rgba(107,92,231,0.25)]"
                    : "font-medium text-[#64748b] hover:bg-[#f8f9fa] hover:text-[#1e293b]"
                }`}
              >
                <Cog strokeWidth={2} className={`h-[18px] w-[18px] ${isActive("/dashboard/reviewer/settings") ? "text-white" : "text-[#64748b]"}`} />
                <span>Settings</span>
              </Link>
            </div>
          )}

          {isAdmin && (
            <div className="pt-6">
              <p className="mb-3 px-4 text-[12px] font-semibold uppercase tracking-widest text-[#94a3b8]">Administration</p>
              {adminNavigation.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-[12px] px-4 py-3 text-[14px] transition-colors ${
                      active
                        ? "bg-[#6b5ce7] font-semibold text-white shadow-[0_4px_14px_rgba(107,92,231,0.25)]"
                        : "font-medium text-[#64748b] hover:bg-[#f8f9fa] hover:text-[#1e293b]"
                    }`}
                  >
                    <Icon strokeWidth={2} className={`h-[18px] w-[18px] ${active ? "text-white" : "text-[#64748b]"}`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      <div className="ml-[260px] min-h-screen">
        <header className="sticky top-0 z-40 flex h-[84px] items-center justify-between border-b border-[#f1f5f9] bg-white px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search anything..."
              className="h-[42px] w-full rounded-full border border-[#e2e8f0] bg-[#f8f9fa] pl-10 pr-4 text-[14px] text-[#1e293b] outline-none transition-all placeholder:text-[#94a3b8] focus:border-[#6b5ce7] focus:bg-white focus:ring-1 focus:ring-[#6b5ce7]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-6 flex items-center gap-3 rounded-[12px] border border-transparent p-2 transition-colors hover:border-[#f1f5f9] hover:bg-[#f8f9fa]">
                <div className="hidden text-right sm:block">
                  <p className="text-[14px] font-semibold text-[#1e293b]">{currentUser.name}</p>
                  <p className="text-[12px] font-medium capitalize text-[#64748b]">{formatRoleLabel(currentUser.role)}</p>
                </div>
                <Avatar className="h-10 w-10 border border-[#e2e8f0]">
                  <AvatarFallback className="bg-[#f8f9fa] text-[14px] font-bold text-[#6b5ce7]">{currentUser.avatar}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-[#94a3b8]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-[12px] border border-[#f1f5f9] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
            >
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1 py-1">
                  <span className="text-[14px] font-semibold text-[#1e293b]">{currentUser.name}</span>
                  <span className="text-[12px] text-[#64748b]">{currentUser.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#f1f5f9]" />
              <DropdownMenuItem className="cursor-pointer text-[14px] text-[#334155] focus:bg-[#f8f9fa] focus:text-[#6b5ce7]">
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#f1f5f9]" />
              <SignOutButton>
                <DropdownMenuItem className="cursor-pointer text-[14px] text-[#d4183d] focus:bg-[#f8f9fa] focus:text-[#d4183d]">
                  Sign out
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-[1100px] p-8">{children}</main>
      </div>
    </div>
  )
}
