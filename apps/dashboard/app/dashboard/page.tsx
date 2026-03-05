import { redirect } from "next/navigation"

import { DeveloperDashboard } from "@/components/dashboard/DeveloperDashboard"
import { getAuthenticatedDashboardUser } from "@/lib/auth"
import { getRoleHomePath } from "@/lib/roles"

export default async function DashboardPage() {
  const user = await getAuthenticatedDashboardUser()
  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "developer") {
    redirect(getRoleHomePath(user.role))
  }

  return <DeveloperDashboard />
}
