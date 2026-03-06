import type { AppRole } from "@/lib/roles"

export interface DashboardOrganizationContext {
  id: string
  slug?: string
  name?: string
  role?: string
}

export interface DashboardAuthUser {
  id: string
  name: string
  email: string
  role: AppRole
  avatar: string
  organization: DashboardOrganizationContext | null
}
