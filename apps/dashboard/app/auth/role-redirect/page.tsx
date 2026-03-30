"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { getRoleHomePath, normalizeRole } from "@/lib/roles"
import { CircuitLoader } from "@/components/ui/circuit-loader"

type SyncResponse = {
  roles?: string[]
}

export default function RoleRedirectPage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!userId) {
      router.replace("/sign-in")
      return
    }

    let cancelled = false

    const syncAndRedirect = async (): Promise<void> => {
      let role = normalizeRole("developer")

      try {
        const response = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (response.ok) {
          const payload = (await response.json()) as SyncResponse
          role = normalizeRole(payload.roles ?? [])
        } else {
          await response.json().catch(() => ({}))
        }
      } catch {
        // Continue with developer default route if sync call fails.
      }

      if (!cancelled) {
        router.replace(getRoleHomePath(role))
      }
    }

    void syncAndRedirect()

    return () => {
      cancelled = true
    }
  }, [isLoaded, router, userId])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4">
      {/* Subtle glow effects */}
      <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Circuit Loader */}
      <section className="relative w-full max-w-4xl">
        <CircuitLoader text="Synchronisation..." />
      </section>

      {/* Text below loader */}
      <div className="relative z-10 mt-8 text-center">
        <p className="text-lg font-semibold text-white">Synchronisation du compte...</p>
        <p className="mt-2 text-sm text-gray-400">
          Nous appliquons vos permissions et preparons votre interface.
        </p>
      </div>
    </main>
  )
}
