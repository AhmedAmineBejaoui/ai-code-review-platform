"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

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

export function AuthShell({ children, mode }: AuthShellProps) {
  const copy = modeCopy[mode]

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-4 text-foreground sm:px-6 lg:px-8">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(73,82,127,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(73,82,127,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-orange/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-teal/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-[1440px] gap-6 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        
        {/* Left Panel - Visual Side */}
        <motion.section
          initial={{ opacity: 0, x: -24, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative overflow-hidden p-6 sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,113,58,0.06),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(23,240,196,0.06),transparent_28%)]" />

          <div className="relative z-10 flex h-full flex-col gap-10">
            {/* Header */}
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

            {/* Text Content */}
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

            {/* Video Container - Corrected */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="relative flex-1 overflow-hidden rounded-[28px] bg-[#0a0a0d] flex items-center justify-center shadow-inner border border-white/5"
              style={{ minHeight: "320px" }}
            >
              <div className="relative w-full h-full max-w-[560px] max-h-[340px] overflow-hidden rounded-3xl">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/videos/login.mp4" type="video/mp4" />
                </video>

                {/* Overlay for better look */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Bottom bar */}
                <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex items-center justify-between z-10">
                  <p className="font-mono text-xs uppercase tracking-[0.26em] text-white/60">
                    NO LOCAL-ONLY STATE. NO FAKE REVIEW FLOW.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-teal/70">LIVE</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Right Panel - Auth Form */}
        <motion.section
          initial={{ opacity: 0, x: 24, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.58, ease: "easeOut", delay: 0.08 }}
          className="relative flex flex-col overflow-hidden p-3 sm:p-5 lg:min-h-full lg:p-6"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(232,113,58,0.06),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(23,240,196,0.06),transparent_30%)]" />

          <div className="relative z-10 flex h-full flex-1 flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.14 }}
              className="w-full max-w-[480px]"
            >
              {children}
            </motion.div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}