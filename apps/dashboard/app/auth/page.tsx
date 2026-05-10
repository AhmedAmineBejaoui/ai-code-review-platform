import { redirect } from "next/navigation"

import { getAuthenticatedDashboardUser } from "@/lib/auth"
import { isClerkConfigured } from "@/lib/clerk-runtime"

export default async function AuthRedirectPage() {
  if (!isClerkConfigured()) {
    redirect("/")
  }

  const user = await getAuthenticatedDashboardUser()
  if (user) {
    redirect("/auth/role-redirect")
  }

  redirect("/sign-in")
}
