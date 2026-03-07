"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle2, FileCode2, ScanSearch, ShieldAlert, ShieldCheck } from "lucide-react"

type AuthMode = "sign-in" | "sign-up"

type AuthShellProps = {
  children: ReactNode
  mode: AuthMode
}

const modeCopy: Record<AuthMode, { title: string; subtitle: string }> = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to continue your secure review workflow.",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Get started with AI-powered code review in minutes.",
  },
}

export function AuthShell({ children, mode }: AuthShellProps) {
  const copy = modeCopy[mode]

  return (
    <main className="min-h-screen bg-[#f4f7fc] px-4 py-4 sm:px-6 md:py-6">
      <div className="mx-auto grid w-full max-w-[1240px] gap-5 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[460px_1fr]">
        <motion.section
          initial={{ opacity: 0, x: -32, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.35)] sm:p-8"
        >
          <div className="mb-7 flex items-center">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="text-[1.75rem] font-semibold tracking-tight text-slate-900">
                TrustReview
              </span>
            </Link>
          </div>

          <div className="mb-5 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{copy.title}</h1>
            <p className="text-sm leading-6 text-slate-500">{copy.subtitle}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_30px_-22px_rgba(15,23,42,0.32)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 via-indigo-400 to-cyan-300" />
            <div className="w-full p-1">{children}</div>
          </motion.div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Copyright {new Date().getFullYear()} TrustReview Corporation
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 32, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.58, ease: "easeOut", delay: 0.08 }}
          className="relative hidden overflow-hidden rounded-[28px] border border-sky-100/80 bg-white lg:flex lg:flex-col lg:items-center lg:justify-center"
        >
          <div className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full border border-sky-200/70" />
          <div className="pointer-events-none absolute -left-16 bottom-6 h-44 w-44 rounded-full border border-indigo-100/80" />
          <div className="pointer-events-none absolute left-16 top-24 grid grid-cols-6 gap-2 opacity-60">
            {Array.from({ length: 30 }).map((_, idx) => (
              <span key={`dot-${idx}`} className="h-1.5 w-1.5 rounded-full bg-sky-200" />
            ))}
          </div>

          <div className="relative z-10 max-w-[640px] px-10 text-center">
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.52 }}
              className="text-balance text-[56px] font-semibold leading-[1.08] tracking-tight text-slate-800"
            >
              Review Code Faster And Ship Safer With{" "}
              <span className="text-[#2f80ed]">TrustReview!</span>
            </motion.p>

            <div className="relative mx-auto mt-12 h-[360px] w-full max-w-[560px]">
              <div className="pointer-events-none absolute inset-x-16 bottom-5 h-10 rounded-full bg-slate-900/10 blur-2xl" />

              <motion.div
                initial={{ opacity: 0, y: 20, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.22, duration: 0.6, ease: "easeOut" }}
                className="absolute inset-x-8 top-10 overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-[0_20px_38px_-24px_rgba(30,41,59,0.5)]"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-xs font-medium text-slate-500">analysis.ts</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-600">
                    <ScanSearch className="h-3.5 w-3.5" />
                    Scanning
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
                  <div className="space-y-2.5">
                    <div className="h-2.5 w-11/12 rounded-full bg-slate-100" />
                    <div className="h-2.5 w-8/12 rounded-full bg-slate-100" />
                    <div className="h-2.5 w-10/12 rounded-full bg-slate-100" />
                    <div className="h-2.5 w-6/12 rounded-full bg-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <span className="block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                      Quality A
                    </span>
                    <span className="block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                      2 Warnings
                    </span>
                    <span className="block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                      Security
                    </span>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      animate={{ x: ["-25%", "260%", "-25%"] }}
                      transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      className="h-full w-24 rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-cyan-400"
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="absolute left-3 top-3 rounded-xl border border-rose-100 bg-white px-3 py-2 shadow-sm"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                  <ShieldAlert className="h-4 w-4" />
                  SQL Injection blocked
                </span>
              </motion.div>

              <motion.div
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.2 }}
                className="absolute bottom-2 right-8 rounded-xl border border-emerald-100 bg-white px-3 py-2 shadow-sm"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Policy PASS
                </span>
              </motion.div>

              <motion.div
                animate={{ rotate: [0, 4, 0, -4, 0] }}
                transition={{ duration: 5.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="absolute -right-1 bottom-24 rounded-xl border border-indigo-100 bg-white px-3 py-2 shadow-sm"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                  <FileCode2 className="h-4 w-4" />
                  Diff + Docs synced
                </span>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}
