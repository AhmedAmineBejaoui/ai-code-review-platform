import { redirect } from "next/navigation"

import { getAuthenticatedDashboardUser } from "@/lib/auth"

export default async function AuthRedirectPage() {
  const user = await getAuthenticatedDashboardUser()
  if (user) {
    redirect("/auth/role-redirect")
  }

  redirect("/sign-in")
}
