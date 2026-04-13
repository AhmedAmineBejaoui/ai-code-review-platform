"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  FileCode2,
  GitPullRequest,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { BrandMark } from "@/components/marketing/premium-landing/brand-mark"

type AuthMode = "sign-in" | "sign-up"

type AuthShellProps = {
  children: ReactNode
  mode: AuthMode
}

type AuthCopy = {
  eyebrow: string
  title: string
  subtitle: string
}

const modeCopy: Record<AuthMode, AuthCopy> = {
  "sign-in": {
    eyebrow: "[ REAL GITHUB SYNC ]",
    title: "Welcome back",
    subtitle:
      "Sign in to continue a dashboard-grade review workflow with every action tied to GitHub.",
  },
  "sign-up": {
    eyebrow: "[ TEAM WORKSPACE ]",
    title: "Create your account",
    subtitle:
      "Set up a connected review workspace in minutes and keep file edits, PRs, and rules in sync.",
  },
}

const featureCards = [
  {
    icon: GitPullRequest,
    title: "GitHub sync",
    text: "Every file change, PR note, and review action stays attached to the connected repository.",
  },
  {
    icon: FileCode2,
    title: "Editor-grade flow",
    text: "File, folder, and branch operations feel like a real code editor, not a simulated workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Team context",
    text: "Roles, policies, and permissions remain scoped to the current team and repo boundaries.",
  },
] as const

export function AuthShell({ children, mode }: AuthShellProps) {
  const copy = modeCopy[mode]

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(73,82,127,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(73,82,127,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-orange/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-teal/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-[1440px] gap-6 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <motion.section
          initial={{ opacity: 0, x: -24, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[28px] border border-border bg-card/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,113,58,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(23,240,196,0.08),transparent_28%)]" />

          <div className="relative z-10 flex h-full flex-col gap-10">
            <div className="flex items-center justify-between gap-6">
              <Link href="/" className="inline-flex items-center gap-3">
                <BrandMark className="size-11" tone="dark" />
                <div>
                  <p className="text-[1.7rem] font-semibold tracking-[-0.04em]">
                    Codebase AI
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    GitHub-connected review workspace
                  </p>
                </div>
              </Link>

              <div className="hidden items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-xs font-medium text-muted-foreground sm:flex">
                <Sparkles className="h-3.5 w-3.5 text-orange" />
                Real-time sync
              </div>
            </div>

            <div className="max-w-2xl">
              <p className="font-mono text-sm uppercase tracking-[0.3em] text-orange">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                {copy.subtitle}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {featureCards.map((card, index) => {
                const Icon = card.icon

                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.08, duration: 0.35 }}
                    className="rounded-[20px] border border-border bg-background/60 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange/10 text-orange">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {card.title}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {card.text}
                    </p>
                  </motion.div>
                )
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-border bg-[#111114] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-teal">
                      Connected workflow
                    </p>
                    <p className="mt-1 text-sm text-foreground/90">
                      Every correction creates a real commit.
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-teal" />
                </div>

                <div className="mt-4 space-y-3 font-mono text-sm leading-6 text-zinc-300">
                  <p>&gt; review new file changes</p>
                  <p className="text-orange">
                    commit created • branch updated • PR comment synced
                  </p>
                  <p className="text-zinc-500">git status --short</p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[20px] border border-border bg-background/60 p-4">
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                    100%
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    GitHub-backed actions
                  </p>
                </div>
                <div className="rounded-[20px] border border-border bg-background/60 p-4">
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                    Real
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No mock workflows
                  </p>
                </div>
              </div>
            </div>

            <p className="font-mono text-xs uppercase tracking-[0.26em] text-muted-foreground">
              No local-only state. No fake review flow.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 24, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.58, ease: "easeOut", delay: 0.08 }}
          className="relative overflow-hidden rounded-[28px] border border-border bg-card/90 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-5 lg:min-h-full lg:p-6"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(232,113,58,0.08),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(23,240,196,0.08),transparent_30%)]" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between rounded-[18px] border border-border bg-background/60 px-4 py-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-orange">
                  Authentication
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode === "sign-in" ? "Secure sign-in" : "Secure sign-up"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-teal">
                <CheckCircle2 className="h-4 w-4" />
                GitHub verified
              </div>
            </div>

            <div className="mt-5 flex flex-1 items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.14 }}
                className="w-full max-w-[560px] rounded-[24px] border border-border bg-background/80 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              >
                <div className="overflow-hidden rounded-[20px] border border-border bg-card/90 p-1">
                  {children}
                </div>
              </motion.div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-border bg-background/60 p-4">
                <p className="text-sm font-medium text-foreground">Editor-grade</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  File, folder, and branch actions stay in sync.
                </p>
              </div>
              <div className="rounded-[18px] border border-border bg-background/60 p-4">
                <p className="text-sm font-medium text-foreground">Real PRs</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reviews are posted to the connected repository.
                </p>
              </div>
              <div className="rounded-[18px] border border-border bg-background/60 p-4">
                <p className="text-sm font-medium text-foreground">Team scoped</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Access stays inside the authenticated team.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}
