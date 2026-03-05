"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { getRoleHomePath, normalizeRole } from "@/lib/roles"

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
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Synchronisation du compte...</p>
    </main>
  )
}

