import { SignUp } from "@clerk/nextjs"

import { AuthShell } from "@/components/auth/auth-shell"
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance"

export default function SignUpPage() {
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
