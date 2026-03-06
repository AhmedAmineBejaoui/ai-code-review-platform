"use client"

import { useEffect } from "react"
import Script from "next/script"
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js"
        type="module"
        strategy="afterInteractive"
      />

      <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-violet-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-64 w-64 rounded-full bg-cyan-200/60 blur-3xl" />

      <section className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white/85 p-6 text-center shadow-2xl shadow-slate-900/10 backdrop-blur-sm sm:p-8">
        <div className="mx-auto mb-2 flex items-center justify-center rounded-2xl bg-slate-100/70 p-3">
          <dotlottie-wc
            src="https://lottie.host/c97f33c5-f14c-448a-ab6a-de94d8cb9147/V5NroLPnwq.lottie"
            style={{ width: "300px", height: "300px" }}
            autoplay
            loop
          />
        </div>
        <p className="text-base font-semibold text-slate-800">Synchronisation du compte...</p>
        <p className="mt-1 text-sm text-slate-500">
          Nous appliquons vos permissions et preparons votre interface.
        </p>
      </section>
    </main>
  )
}

