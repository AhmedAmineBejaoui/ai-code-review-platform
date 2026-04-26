"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { getRoleHomePath, normalizeRole } from "@/lib/roles"
import { CircuitLoader } from "@/components/ui/circuit-loader"

type SyncResponse = {
  canonical_role?: string
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
          role = normalizeRole(payload.canonical_role ?? payload.roles ?? [])
        } else {
          await response.json().catch(() => ({}))
        }
      } catch {
        // Continue with developer default route if sync call fails.
      }

      if (!cancelled) {
        let redirectPath = getRoleHomePath(role)

        try {
          const { Capacitor } = await import("@capacitor/core")
          if (Capacitor.isNativePlatform()) {
            redirectPath = "/mobile/prs"
          }
        } catch {
          // Keep the role-based web redirect outside Capacitor.
        }

        router.replace(redirectPath)
      }
    }

    void syncAndRedirect()

    return () => {
      cancelled = true
    }
  }, [isLoaded, router, userId])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-orange/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-64 w-64 rounded-full bg-teal/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(73,82,127,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(73,82,127,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <CircuitLoader text="Synchronisation GitHub..." />
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Synchronisation du compte...</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Nous appliquons vos permissions et préparons votre interface.
          </p>
        </div>
      </div>
    </main>
  )
}
