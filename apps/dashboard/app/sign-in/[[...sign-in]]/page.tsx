import { SignIn } from "@clerk/nextjs"
import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance"
import {
  buildPathWithDevBrowserJwt,
  hasDevBrowserJwt,
  requestDevBrowserJwtForLocalDevelopment,
} from "@/lib/clerk-dev-browser"

type SignInPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  if (!hasDevBrowserJwt(searchParams)) {
    const token = await requestDevBrowserJwtForLocalDevelopment()
    if (token) {
      redirect(buildPathWithDevBrowserJwt("/sign-in", searchParams, token))
    }
  }

  return (
    <AuthShell mode="sign-in">
      <SignIn
        path="/sign-in"
        routing="path"
        forceRedirectUrl="/auth/role-redirect"
        fallbackRedirectUrl="/auth/role-redirect"
        signUpUrl="/sign-up"
        appearance={clerkAuthAppearance}
      />
    </AuthShell>
  )
}
