import { SignUp } from "@clerk/nextjs"

import { AuthShell } from "@/components/auth/auth-shell"
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance"
import { LocalInvitationSessionGuard } from "@/components/auth/local-invitation-session-guard"
import { ClerkAuthWrapper } from "@/components/ui/animated-auth"
import { buildPathWithForwardedClerkAuthParamsFromRecord } from "@/lib/clerk-invitation"

// Required for static export with optional catch-all routes
export function generateStaticParams() { return [{ 'sign-up': [] }] }
export const dynamic = 'force-static'
export const dynamicParams = true

type SignUpPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined
  }
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  const signInUrl = buildPathWithForwardedClerkAuthParamsFromRecord("/sign-in", searchParams)

  return (
    <AuthShell mode="sign-up">
      <LocalInvitationSessionGuard />
      <ClerkAuthWrapper>
        <SignUp
          path="/sign-up"
          routing="path"
          forceRedirectUrl="/auth/role-redirect"
          fallbackRedirectUrl="/auth/role-redirect"
          signInUrl={signInUrl}
          appearance={clerkAuthAppearance}
        />
      </ClerkAuthWrapper>
    </AuthShell>
  )
}
