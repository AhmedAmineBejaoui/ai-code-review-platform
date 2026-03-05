import type { AppRole } from "@/lib/roles"

export interface DashboardAuthUser {
  id: string
  name: string
  email: string
  role: AppRole
  avatar: string
}

