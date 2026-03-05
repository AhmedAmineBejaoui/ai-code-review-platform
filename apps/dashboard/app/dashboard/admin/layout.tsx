import { redirect } from "next/navigation"

import { getAuthenticatedDashboardUser } from "@/lib/auth"
import { getRoleHomePath } from "@/lib/roles"

export default async function AdminRoutesLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedDashboardUser()

  if (!user) {
    redirect("/sign-in")
  }

  if (user.role !== "admin") {
    redirect(getRoleHomePath(user.role))
  }

  return <>{children}</>
}

