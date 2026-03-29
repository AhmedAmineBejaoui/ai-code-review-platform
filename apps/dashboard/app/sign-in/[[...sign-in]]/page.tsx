import { SignIn } from "@clerk/nextjs"

import { AuthShell } from "@/components/auth/auth-shell"
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance"
import { ClerkAuthWrapper } from "@/components/ui/animated-auth"

export default function SignInPage() {
  return (
    <AuthShell mode="sign-in">
      <ClerkAuthWrapper>
        <SignIn
          path="/sign-in"
          routing="path"
          forceRedirectUrl="/auth/role-redirect"
          fallbackRedirectUrl="/auth/role-redirect"
          signUpUrl="/sign-up"
          appearance={clerkAuthAppearance}
        />
      </ClerkAuthWrapper>
    </AuthShell>
  )
}
