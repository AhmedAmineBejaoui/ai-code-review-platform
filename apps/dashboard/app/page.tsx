"use client"

import { useRef, useState } from "react"
import { motion, useScroll, useSpring, useTransform } from "framer-motion"
import Link from "next/link"
import { SignedIn, SignedOut, useClerk } from "@clerk/nextjs"
import {
  ArrowRight,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  Circle,
  Cloud,
  Cpu,
  Eye,
  FileCode2,
  GitBranch,
  Github,
  Hexagon,
  Linkedin,
  Lock,
  Menu,
  Quote,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Triangle,
  Twitter,
  User,
  Users,
  X,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/* ─── DATA ─── */

const trustedLogos = [
  { name: "Vercel", icon: Triangle },
  { name: "Dropbox", icon: Box },
  { name: "Linear", icon: Hexagon },
  { name: "CircleCI", icon: Circle },
  { name: "Cloudflare", icon: Cloud },
]

const features = [
  {
    title: "Real-time Analysis",
    description:
      "Instant feedback on every pull request. No more waiting for human reviewers for basic style and syntax checks.",
    icon: Zap,
    iconClass: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Security Hardening",
    description:
      "Proactively identify vulnerabilities, exposed secrets, and dependency risks before they reach production.",
    icon: Lock,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Context Awareness",
    description:
      "Our AI understands your project's architecture, preventing logic errors that standard linters miss.",
    icon: GitBranch,
    iconClass: "bg-rose-50 text-rose-600",
  },
]

const trustLayerCards = [
  {
    title: "Grounded Findings",
    description: "Every finding is mapped to exact file + line in the changed diff. No guesswork.",
    icon: FileCode2,
  },
  {
    title: "Citations & Evidence",
    description: "RAG-powered citations from your own docs and knowledge base. Verifiable feedback.",
    icon: Quote,
  },
  {
    title: "Policy Gating",
    description: "Enforce PASS / WARN / FAIL decisions via configurable severity rules and blockers.",
    icon: ShieldCheck,
  },
  {
    title: "Low False Positives",
    description: "Dedup + Top-N filtering keeps noise low. Only actionable findings surface.",
    icon: Target,
  },
]

const pendingReviews = [
  { project: "Project",     file: "2.5",  changes: "Changes Requested", author: "206.90", lastUpdated: "Approved", status1: "Approved", status2: "Approved" },
  { project: "Tronjet",    file: "1.85", changes: "Approved",          author: "200.90", lastUpdated: "Approved", status1: "Approved", status2: "Approved" },
  { project: "Morescat",   file: "1.67", changes: "Advising",          author: "205.80", lastUpdated: "Approved", status1: "Charged",  status2: "Pending" },
  { project: "School Rosik",file: "3.10",changes: "Adprening",         author: "255.80", lastUpdated: "Awaiting", status1: "Pending",  status2: "Pending" },
]

const completedReviews = [
  { project: "Project",      file: "2.5",  changes: "Changes Requested", author: "204.60", lastUpdated: "Approved", status1: "Approved", status2: "Approved" },
  { project: "Tronjet",      file: "1.99", changes: "Approved",          author: "204.80", lastUpdated: "Approved", status1: "Approved", status2: "Approved" },
  { project: "CybeerTon",    file: "1.88", changes: "Rest.Int",          author: "150.90", lastUpdated: "Approved", status1: "Charged",  status2: "Charged" },
  { project: "Rebuad Daus",  file: "3.85", changes: "Changes Requested", author: "158.80", lastUpdated: "Approved", status1: "Approved", status2: "Pending" },
  { project: "Interbid Daus",file: "4.55", changes: "Rest.Int",          author: "105.80", lastUpdated: "Approved", status1: "Approved", status2: "Pending" },
  { project: "Printed Daus", file: "5.85", changes: "Rest.Int",          author: "138.80", lastUpdated: "Approved", status1: "Approved", status2: "Charged" },
]

const communityFeatures = [
  "Unlimited public repositories",
  "5 private repositories",
  "Basic static analysis (Ruff, Semgrep)",
  "Secret detection & redaction",
  "Community support",
  "GitHub Actions integration",
]

const teamFeatures = [
  "Everything in Community",
  "Unlimited private repositories",
  "Advanced AI review with RAG",
  "Custom policy engine",
  "Priority support",
  "SSO & RBAC",
]

/* ─── HELPERS ─── */

function statusClass(status: string): string {
  if (status === "Approved") return "bg-emerald-400 text-white"
  if (status === "Pending")  return "bg-amber-400 text-white"
  if (status === "Charged")  return "bg-violet-500 text-white"
  if (status === "Awaiting") return "bg-slate-300 text-slate-700"
  return "bg-slate-200 text-slate-600"
}

/* ─── SUB-COMPONENTS ─── */

function ReviewsTable({
  title,
  rows,
}: {
  readonly title: string
  readonly rows: typeof pendingReviews
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200/60 bg-white shadow-sm">
      <div className="border-b border-violet-100 px-4 py-2.5">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">File</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Author</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Last Updated</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Last Updated</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={`${title}-${i}`} className="hover:bg-violet-50/40 transition-colors">
                <td className="px-3 py-2 font-medium text-slate-700">{row.project}</td>
                <td className="px-3 py-2 text-slate-500">{row.file}</td>
                <td className="px-3 py-2 text-slate-500">{row.author}</td>
                <td className="px-3 py-2 text-slate-500">{row.changes}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(row.lastUpdated)}`}>
                    {row.lastUpdated}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(row.status1)}`}>
                      {row.status1}
                    </span>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(row.status2)}`}>
                      {row.status2}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ━━━━━━━━━━━━━━━━━ LANDING PAGE ━━━━━━━━━━━━━━━━━ */

const NAV_LINKS = [
  { label: "Features", href: "#features", hasDropdown: true },
  { label: "Product", href: "#preview", hasDropdown: true },
  { label: "Changelog", href: "/changelog", hasDropdown: false },
  { label: "Docs", href: "/documentation", hasDropdown: false },
  { label: "Pricing", href: "#pricing", hasDropdown: false },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { signOut } = useClerk()
  const { scrollY } = useScroll()
  const navbarScale = useSpring(useTransform(scrollY, [0, 260], [1, 0.992]), {
    stiffness: 140,
    damping: 26,
    mass: 0.28,
  })
  const navbarShadow = useTransform(
    scrollY,
    [0, 60, 260],
    [
      "0 1px 3px rgba(0,0,0,0.04)",
      "0 12px 30px rgba(15,23,42,0.08)",
      "0 14px 34px rgba(15,23,42,0.1)",
    ],
  )
  const previewRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress: previewProgressRaw } = useScroll({
    target: previewRef,
    offset: ["start end", "center center"],
  })
  const previewProgress = useSpring(previewProgressRaw, {
    stiffness: 120,
    damping: 24,
    mass: 0.35,
  })
  const previewRotateX = useTransform(previewProgress, [0, 1], [76, 0])
  const previewTranslateY = useTransform(previewProgress, [0, 1], [170, 0])
  const previewOpacity = useTransform(previewProgress, [0, 0.15, 1], [0.12, 0.75, 1])
  const previewScale = useTransform(previewProgress, [0, 1], [0.86, 1])

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }
  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* ── NAVBAR ── */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="navbar-notch sticky top-0 z-50 w-full px-4 pt-3 sm:px-6 lg:px-10"
      >
        <motion.div
          style={{ scale: navbarScale, boxShadow: navbarShadow, transformOrigin: "center top" }}
          className="mx-auto flex w-full max-w-[1240px] items-center justify-between overflow-hidden rounded-[16px] border border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur md:px-5"
        >

          {/* ── Logo ── */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">TrustReview</span>
          </Link>

          {/* ── Center nav – desktop ── */}
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="group inline-flex items-center gap-1 text-sm font-normal text-slate-800 transition-colors hover:text-black"
              >
                {link.label}
                {link.hasDropdown && (
                  <ChevronDown className="h-3 w-3 text-slate-500 transition-transform duration-200 group-hover:rotate-180" />
                )}
              </a>
            ))}
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link href="/sign-in" className="hidden text-sm font-normal text-slate-800 transition-colors hover:text-black sm:inline-flex">
                Sign in
              </Link>
              <Link href="/sign-up" className="inline-flex items-center gap-1 rounded-[10px] border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50">
                Dashboard
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Link>
            </SignedOut>
            <SignedIn>
              <button
                type="button"
                onClick={() => void signOut()}
                className="hidden text-sm font-normal text-slate-800 transition-colors hover:text-black sm:inline-flex"
              >
                Sign out
              </button>
              <Link
                href="/auth/role-redirect"
                className="inline-flex items-center gap-1 rounded-[10px] border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
              >
                Dashboard
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Link>
            </SignedIn>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="ml-1 inline-flex items-center justify-center rounded-md p-1.5 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>

        {/* ── Mobile menu ── */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden"
          >
            <nav className="flex flex-col gap-1 pt-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-normal text-slate-800 hover:bg-slate-50"
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="h-4 w-4 text-slate-500" />}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
              <SignedOut>
                <Link href="/sign-in" className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-normal text-slate-800 hover:bg-slate-50">
                  Sign in
                </Link>
                <Link href="/sign-up" className="w-full rounded-[10px] border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50">
                  Dashboard
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/auth/role-redirect"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-[10px] border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-normal text-slate-800 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </SignedIn>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Modern mesh gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-dots [background-size:20px_20px] opacity-30" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 pb-14 pt-16 md:px-8 lg:grid-cols-2 lg:items-center lg:py-24">
          {/* Left – text */}
          <motion.div 
            className="space-y-7"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.div variants={fadeInUp}>
              <Badge
                variant="secondary"
                className="w-fit animate-glow-pulse rounded-full border-indigo-200/50 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-1.5 text-indigo-700 shadow-glow dark:border-indigo-500/30 dark:from-indigo-950/50 dark:to-purple-950/50 dark:text-indigo-300"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 animate-pulse text-indigo-600 dark:text-indigo-400" />
                AI-Powered Code Intelligence
              </Badge>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="max-w-xl text-balance text-5xl font-extrabold leading-[1.04] md:text-[4.25rem]"
            >
              <span className="hero-title-gradient bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                Ship code with
              </span>
              <br />
              <span className="hero-title-gradient-strong bg-gradient-to-r from-indigo-700 via-purple-700 to-cyan-700 bg-clip-text text-transparent">
                absolute
              </span>
              <br />
              <span className="hero-title-gradient-strong bg-gradient-to-r from-indigo-700 via-purple-700 to-cyan-700 bg-clip-text text-transparent">
                confidence.
              </span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-400"
            >
              The enterprise-grade AI code review assistant that detects{" "}
              <strong className="text-slate-800 dark:text-slate-200">bugs</strong>,{" "}
              <strong className="text-slate-800 dark:text-slate-200">security flaws</strong>, and{" "}
              <strong className="text-slate-800 dark:text-slate-200">performance issues</strong> before you merge.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3">
            <SignedOut>
              <Link 
                href="/sign-up" 
                className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 px-8 text-base font-semibold text-white shadow-glow transition-all duration-500 hover:bg-right hover:shadow-glow-strong hover:scale-105"
              >
                <span className="relative z-10">Analyze My Repo</span>
                <ArrowRight className="relative z-10 ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </SignedOut>
            <SignedIn>
              <Link 
                href="#preview" 
                className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 px-8 text-base font-semibold text-white shadow-glow transition-all duration-500 hover:bg-right hover:shadow-glow-strong hover:scale-105"
              >
                <span className="relative z-10">Analyze My Repo</span>
                <ArrowRight className="relative z-10 ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </SignedIn>
              <Link 
                href="#preview" 
                className="group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 border-slate-300 bg-white/80 px-7 text-base font-medium text-slate-800 backdrop-blur transition-all duration-300 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-indigo-500"
              >
                View Demo
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeInUp} className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[
                  { initials: "AL", color: "from-cyan-400 to-blue-500" },
                  { initials: "SK", color: "from-fuchsia-400 to-purple-500" },
                  { initials: "MJ", color: "from-amber-400 to-orange-500" },
                ].map((avatar) => (
                  <span
                    key={avatar.initials}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-[10px] font-semibold text-white ${avatar.color}`}
                  >
                    {avatar.initials}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">4.9/5</span> from 10k+ engineers
              </p>
            </motion.div>
          </motion.div>

          {/* Right – Abstract 3D illustration */}
          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="relative flex h-[430px] items-center justify-center">
              <div className="hero-blob-orbit hero-blob-orbit--outer" />
              <div className="hero-blob-orbit hero-blob-orbit--inner" />
              <div className="hero-scan-beam" />

              {/* Animated iridescent organic blob */}
              <div className="hero-blob-wrap">
                <div className="hero-blob" />
                <div className="hero-blob-highlight-1" />
                <div className="hero-blob-highlight-2" />
                <div className="hero-blob-core" />
              </div>
            </div>

            <motion.div
              className="absolute right-[3%] top-[22%]"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: [0, -6, 0] }}
              transition={{ duration: 4.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
            >
              <div className="glass-card rounded-full border-cyan-300/50 bg-gradient-to-r from-cyan-50 to-blue-50 px-4 py-1.5 text-xs font-semibold text-cyan-800 shadow-glow-cyan">
                PR #842 reviewed
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-[18%] right-[-1%]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: [0, 6, 0] }}
              transition={{ duration: 4.8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
            >
              <div className="glass-card rounded-full border-emerald-300/50 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-1.5 text-xs font-semibold text-emerald-800 shadow-lg shadow-emerald-500/20">
                7 issues auto-fixed
              </div>
            </motion.div>

            {/* Floating card – Security Risk */}
            <motion.div
              className="absolute left-[-3%] top-[16%] w-[72%]"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{ duration: 5, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            >
              <Card className="glass-card group rounded-2xl border-indigo-200/50 bg-white/80 shadow-pro-lg backdrop-blur-xl transition-all hover:border-indigo-300 hover:shadow-pro-xl dark:bg-slate-900/60">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 to-rose-200 text-rose-600 shadow-sm">
                      <ShieldAlert className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-lg font-semibold leading-tight text-slate-900 dark:text-slate-100">Security Risk Detected</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">SQL Injection in auth/login.ts</p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-rose-100 dark:bg-rose-950">
                    <div className="hero-risk-bar h-2 w-4/5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 shadow-sm" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              className="absolute right-[6%] top-[52%] w-[44%]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: [0, 6, 0] }}
              transition={{ duration: 4.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, delay: 0.15 }}
            >
              <Card className="glass-card rounded-2xl border-cyan-200/50 bg-white/80 shadow-pro-lg backdrop-blur-xl dark:bg-slate-900/60">
                <CardContent className="space-y-2 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">AI Review Engine</p>
                    <span className="animate-pulse rounded-full bg-gradient-to-r from-cyan-100 to-cyan-200 px-2 py-0.5 text-[10px] font-semibold text-cyan-800 shadow-sm">Live</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">142 files analyzed</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">3 critical • 5 warnings • 12 suggestions</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Floating card – Code Quality */}
            <motion.div
              className="absolute bottom-[10%] left-[-10%] w-[74%]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: [0, 8, 0] }}
              transition={{ duration: 5.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, delay: 0.3 }}
            >
              <Card className="glass-card rounded-2xl border-emerald-200/50 bg-white/80 shadow-pro-lg backdrop-blur-xl dark:bg-slate-900/60">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-base font-medium text-slate-700 dark:text-slate-300">Code Quality Score</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">98/100</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 px-3 py-2 text-center text-sm font-semibold text-emerald-700 shadow-sm dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-300">
                      Maintainability A+
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 px-3 py-2 text-center text-sm font-semibold text-indigo-700 shadow-sm dark:from-indigo-950 dark:to-indigo-900 dark:text-indigo-300">
                      Reliability A
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
        <p className="mb-8 text-center text-xs uppercase tracking-[0.3em] text-slate-400">
          TRUSTED BY ENGINEERING TEAMS AT
        </p>
        <div className="trusted-marquee relative">
          <div className="trusted-marquee-track">
            {[...trustedLogos, ...trustedLogos].map((logo, index) => (
              <div key={`${logo.name}-${index}`} className="flex shrink-0 items-center gap-2.5 px-7 text-slate-400 md:px-10">
                <logo.icon className="h-5 w-5" />
                <span className="text-2xl font-medium leading-none tracking-tight">{logo.name}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent md:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent md:w-24" />
        </div>
      </section>

      {/* ── FEATURES — "Intelligent code reviews" ── */}
      <section id="features" className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
            Intelligent code reviews
            <br />
            without the bottleneck
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Empower your team to merge faster while maintaining the highest standards of code quality and security.
          </p>
        </div>
        <motion.div 
          className="grid gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          {features.map((feature, idx) => (
            <motion.div key={feature.title} variants={fadeInUp}>
              <Card className="group h-full rounded-2xl border-indigo-200/50 bg-gradient-to-br from-white to-slate-50/50 shadow-pro-md transition-all duration-300 hover:border-indigo-300 hover:shadow-pro-lg hover:-translate-y-1 dark:from-slate-900 dark:to-slate-800/50 dark:border-indigo-500/30">
                <CardHeader className="space-y-4 p-6">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.iconClass} shadow-sm transition-transform group-hover:scale-110`}>
                    <feature.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">{feature.title}</CardTitle>
                    <CardDescription className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── DARK SECTION — Trust Layer ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950 py-24">
        {/* Animated mesh gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="plus-pattern pointer-events-none absolute inset-0 opacity-40" />
        
        <div className="relative mx-auto w-full max-w-6xl px-5 md:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
              Reviews you can trust
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Every finding is grounded, cited, and policy-checked. Fewer false positives, faster merges.
            </p>
          </div>
          <motion.div 
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {trustLayerCards.map((card, idx) => (
              <motion.div
                key={card.title}
                variants={fadeInUp}
                className="group relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900/80 to-slate-800/50 p-6 backdrop-blur-xl transition-all duration-300 hover:border-indigo-400/50 hover:shadow-glow hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-indigo-300 shadow-glow-purple transition-transform group-hover:scale-110">
                  <card.icon className="h-6 w-6" />
                </span>
                <h3 className="relative mb-3 text-lg font-bold text-white">{card.title}</h3>
                <p className="relative text-sm leading-relaxed text-slate-300">{card.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section id="preview" className="mx-auto w-full max-w-6xl px-5 py-24 [perspective:1600px] md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
            See every analysis, at a glance
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">From parsing to decision in seconds. Monitor your entire pipeline.</p>
        </div>

        <motion.div
          ref={previewRef}
          style={{
            rotateX: previewRotateX,
            y: previewTranslateY,
            opacity: previewOpacity,
            scale: previewScale,
            transformOrigin: "center bottom",
          }}
          className="group rounded-3xl border border-indigo-300/50 bg-gradient-to-br from-indigo-50 via-purple-50/60 to-white p-4 [transform-style:preserve-3d] shadow-pro-xl transition-shadow duration-300 hover:shadow-glow md:p-6 dark:from-slate-900 dark:via-indigo-950/50 dark:to-slate-900 dark:border-indigo-500/30"
        >
          {/* Outer card with glassmorphism */}
          <div className="overflow-hidden rounded-2xl border border-indigo-200/50 bg-white/95 shadow-pro-lg backdrop-blur-sm dark:border-indigo-500/30 dark:bg-slate-900/95">

            {/* ── App Header ── */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white to-indigo-50/30 px-5 py-3 dark:from-slate-900 dark:to-indigo-950/30 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                {/* Modern gradient icon */}
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-glow">
                  <Hexagon className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm font-bold tracking-widest text-slate-800 dark:text-slate-200">CODEFLOW AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200/50 bg-indigo-50/50 px-3 py-1.5 text-xs text-slate-600 backdrop-blur-sm dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-slate-300">
                  <Search className="h-3 w-3" />
                  <span>Search</span>
                </div>
                {/* User avatar with glow */}
                <div className="relative">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 shadow-sm dark:from-indigo-950 dark:to-purple-950 dark:text-indigo-400">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="absolute right-0 top-0 h-2 w-2 animate-pulse rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
              </div>
            </div>

            {/* ── Layout: sidebar + content ── */}
            <div className="grid md:grid-cols-[160px_1fr]">

              {/* Sidebar */}
              <aside className="border-r border-slate-100 bg-slate-50/80 px-2 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <ul className="space-y-0.5 text-[13px]">
                  {[
                    { label: "Dashboard", icon: BookOpen },
                    { label: "Projects",  icon: Box },
                    { label: "Users",     icon: Users },
                    { label: "Settings",  icon: Cpu },
                  ].map((item) => (
                    <li key={item.label}>
                      <span className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                    </li>
                  ))}
                  {/* Active item */}
                  <li>
                    <span className="flex cursor-default items-center gap-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 font-semibold text-white shadow-glow">
                      <Sparkles className="h-4 w-4" />
                      Code Review
                    </span>
                  </li>
                </ul>
              </aside>

              {/* Main content */}
              <div className="space-y-5 p-4 md:p-5">
                <ReviewsTable title="Pending Reviews"   rows={pendingReviews} />
                <ReviewsTable title="Completed Reviews" rows={completedReviews} />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeInUp}
          className="plus-pattern group relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 bg-size-200 px-6 py-16 text-center text-white shadow-glow transition-all duration-500 hover:bg-right hover:shadow-glow-strong md:px-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-20" />
          <h3 className="relative text-balance text-4xl font-bold md:text-5xl">
            Ready to elevate your code quality?
          </h3>
          <p className="relative mx-auto mt-4 max-w-2xl text-lg text-indigo-100">
            Join thousands of developers shipping cleaner, safer code every day.
            <br className="hidden md:inline" />
            Start your 14-day free trial — no credit card required.
          </p>
          <SignedOut>
            <Link href="/sign-up" className="relative z-10 mt-8 inline-flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-10 text-base font-semibold text-indigo-700 shadow-pro-lg transition-all duration-300 hover:bg-indigo-50 hover:scale-105 hover:shadow-pro-xl">
              Get Started Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/auth/role-redirect" className="relative z-10 mt-8 inline-flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-10 text-base font-semibold text-indigo-700 shadow-pro-lg transition-all duration-300 hover:bg-indigo-50 hover:scale-105 hover:shadow-pro-xl">
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </SignedIn>
          <p className="relative mt-5 text-sm text-indigo-200">Free for open source projects.</p>
        </motion.div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="mx-auto w-full max-w-6xl px-5 pb-28 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Start for free, upgrade when you need more.</p>
        </div>

        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2"
        >
          {/* Community — Free */}
          <motion.div variants={fadeInUp} className="h-full">
            <Card className="group relative h-full overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 text-white shadow-glow transition-all duration-500 hover:bg-right hover:shadow-glow-strong hover:scale-[1.02]">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-1 text-xs font-semibold text-white shadow-md">
              Most popular
            </div>
            <CardHeader className="pt-10">
              <CardTitle className="text-3xl text-white">Community</CardTitle>
              <CardDescription className="text-indigo-100">
                Perfect for open source and personal projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-5xl font-extrabold">Free</p>
              <ul className="space-y-3.5 text-sm">
                {communityFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <SignedOut>
                <Link href="/sign-up" className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white font-semibold text-indigo-600 shadow-lg transition-all duration-300 hover:bg-indigo-50 hover:scale-105">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/auth/role-redirect" className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white font-semibold text-indigo-600 shadow-lg transition-all duration-300 hover:bg-indigo-50 hover:scale-105">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </SignedIn>
            </CardContent>
          </Card>
          </motion.div>

          {/* Team — Coming soon */}
          <motion.div variants={fadeInUp} className="h-full">
            <Card className="group h-full rounded-3xl border-indigo-200/50 bg-gradient-to-br from-white to-indigo-50/30 shadow-pro-md transition-all duration-300 hover:border-indigo-300 hover:shadow-pro-lg hover:-translate-y-1 dark:from-slate-900 dark:to-indigo-950/20 dark:border-indigo-500/30">
            <CardHeader>
              <CardTitle className="text-3xl text-slate-900 dark:text-slate-100">Team</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">For teams that need advanced features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-5xl font-extrabold text-slate-900 dark:text-slate-100">Coming soon</p>
              <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
                {teamFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-glow transition-all duration-300 hover:from-indigo-700 hover:to-purple-700 hover:scale-105">
                Join waitlist
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative overflow-hidden border-t border-slate-200 bg-gradient-to-b from-white to-slate-50/50 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-12 md:px-8">
          <div className="grid gap-10 border-b border-slate-200 pb-10 dark:border-slate-800 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-glow">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">TrustReview</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Automated, explainable code reviews powered by LLMs and grounded in your documentation.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TrustReview on X"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TrustReview on GitHub"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TrustReview on LinkedIn"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/features" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Features</Link></li>
                <li><Link href="/integrations" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Integrations</Link></li>
                <li><Link href="/pricing" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Pricing</Link></li>
                <li><Link href="/changelog" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/documentation" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Documentation</Link></li>
                <li><Link href="/api-reference" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">API Reference</Link></li>
                <li><Link href="/blog" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Blog</Link></li>
                <li><Link href="/community" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Community</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/about" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">About</Link></li>
                <li><Link href="/careers" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Careers</Link></li>
                <li><Link href="/legal" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Legal</Link></li>
                <li><Link href="/contact" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-7 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
            <p>&copy; {new Date().getFullYear()} TrustReview Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Privacy Policy</Link>
              <Link href="/terms" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
