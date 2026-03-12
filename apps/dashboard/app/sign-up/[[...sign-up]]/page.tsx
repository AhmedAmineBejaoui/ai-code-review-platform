import { SignUp } from "@clerk/nextjs"
import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance"
import {
  buildPathWithDevBrowserJwt,
  hasDevBrowserJwt,
  requestDevBrowserJwtForLocalDevelopment,
} from "@/lib/clerk-dev-browser"

type SignUpPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  if (!hasDevBrowserJwt(searchParams)) {
    const token = await requestDevBrowserJwtForLocalDevelopment()
    if (token) {
      redirect(buildPathWithDevBrowserJwt("/sign-up", searchParams, token))
    }
  }

  return (
    <AuthShell mode="sign-up">
      <SignUp
        path="/sign-up"
        routing="path"
        forceRedirectUrl="/auth/role-redirect"
        fallbackRedirectUrl="/auth/role-redirect"
        signInUrl="/sign-in"
        appearance={clerkAuthAppearance}
      />
    </AuthShell>
  )
}
