import { redirect } from "next/navigation"

import { DashboardLayout } from "@/components/dashboard/DashboardLayout"
import { DashboardUserProvider } from "@/components/dashboard/dashboard-user-provider"
import { getAuthenticatedDashboardUser } from "@/lib/auth"
import { isClerkConfigured } from "@/lib/clerk-runtime"

export default async function DashboardRoutesLayout({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured()) {
    redirect("/")
  }

  const user = await getAuthenticatedDashboardUser()
  if (!user) {
    redirect("/")
  }

  return (
    <DashboardUserProvider user={user}>
      <DashboardLayout>{children}</DashboardLayout>
    </DashboardUserProvider>
  )
}
