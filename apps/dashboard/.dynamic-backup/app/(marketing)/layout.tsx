import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  
  // Redirect authenticated users to dashboard
  if (user) {
    redirect("/auth/role-redirect")
  }

  return children
}
