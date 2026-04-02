"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth, useClerk } from "@clerk/nextjs"

import { CircuitLoader } from "@/components/ui/circuit-loader"

const CLERK_INVITATION_QUERY_KEYS = ["__clerk_ticket", "__clerk_invitation_token"] as const

function hasInvitationToken(searchParams: URLSearchParams): boolean {
  return CLERK_INVITATION_QUERY_KEYS.some((key) => {
    const value = searchParams.get(key)
    return typeof value === "string" && value.trim().length > 0
  })
}

function buildSignUpUrlWithTicket(searchParams: URLSearchParams): string {
  const forwardedParams = new URLSearchParams()

  searchParams.forEach((value, key) => {
    // Forward all __clerk_* params and redirect_url
    if (key.startsWith("__clerk_") || key === "redirect_url" || key === "redirectUrl") {
      forwardedParams.append(key, value)
    }
  })

  const query = forwardedParams.toString()
  return query ? `/sign-up?${query}` : "/sign-up"
}

export default function AcceptInvitationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoaded, userId } = useAuth()
  const { signOut } = useClerk()
  const didInitiate = useRef(false)
  const [status, setStatus] = useState<"checking" | "signing-out" | "redirecting">("checking")

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) {
      return
    }

    // Prevent double execution
    if (didInitiate.current) {
      return
    }

    // Validate invitation token
    if (!hasInvitationToken(searchParams)) {
      // No valid invitation token - redirect to sign-up without ticket
      router.replace("/sign-up")
      return
    }

    didInitiate.current = true
    const signUpUrl = buildSignUpUrlWithTicket(searchParams)

    // If user is already signed in, sign them out first
    // This is critical: the invited user needs their OWN session, not the inviter's
    if (userId) {
      setStatus("signing-out")
      // Sign out and redirect back to sign-up with the invitation token preserved
      void signOut({ redirectUrl: signUpUrl })
    } else {
      // No active session - proceed directly to sign-up with invitation token
      setStatus("redirecting")
      router.replace(signUpUrl)
    }
  }, [isLoaded, userId, searchParams, router, signOut])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4">
      {/* Subtle glow effects */}
      <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Circuit Loader */}
      <section className="relative w-full max-w-4xl">
        <CircuitLoader text="Traitement de l'invitation..." />
      </section>

      {/* Text below loader */}
      <div className="relative z-10 mt-8 text-center">
        <p className="text-lg font-semibold text-white">
          {status === "checking" && "Verification de l'invitation..."}
          {status === "signing-out" && "Preparation de votre session..."}
          {status === "redirecting" && "Redirection vers l'inscription..."}
        </p>
        <p className="mt-2 text-sm text-gray-400">
          {status === "signing-out"
            ? "Nous vous deconnectons pour creer votre propre compte."
            : "Vous allez etre redirige vers la page d'inscription."}
        </p>
      </div>
    </main>
  )
}
