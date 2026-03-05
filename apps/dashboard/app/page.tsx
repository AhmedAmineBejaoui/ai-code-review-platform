"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
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
import { Button } from "@/components/ui/button"
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
  { label: "Changelog", href: "#changelog", hasDropdown: false },
  { label: "Docs", href: "https://docs.trustreview.ai", hasDropdown: false },
  { label: "Pricing", href: "#pricing", hasDropdown: false },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="navbar-notch sticky top-0 z-50 border-b border-border/40 bg-background/95 shadow-sm backdrop-blur-xl dark:shadow-none"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 md:px-8">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-80">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 transition-transform hover:scale-105">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-[1.05rem] font-bold tracking-tight text-foreground">TrustReview</span>
          </Link>

          {/* ── Center nav – desktop ── */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="group inline-flex items-center gap-0.5 rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95"
              >
                {link.label}
                {link.hasDropdown && (
                  <ChevronDown className="h-3.5 w-3.5 opacity-50 transition-all duration-200 group-hover:rotate-180 group-hover:opacity-70" />
                )}
              </a>
            ))}
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="redirect">
                <button className="hidden rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95 sm:inline-flex">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background shadow-md transition-all hover:shadow-lg hover:opacity-90 active:scale-95 dark:shadow-white/10">
                  Dashboard
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/20">
                    <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/auth/role-redirect"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background shadow-md transition-all hover:shadow-lg hover:opacity-90 active:scale-95 dark:shadow-white/10"
              >
                Dashboard
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/20">
                  <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="ml-2 inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/40 bg-background/98 backdrop-blur-xl px-5 pb-4 shadow-md md:hidden"
          >
            <nav className="flex flex-col gap-1 pt-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="h-4 w-4 opacity-50" />}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-border/30 pt-4">
              <SignedOut>
                <SignInButton mode="redirect">
                  <button className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="redirect">
                  <button className="w-full rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-85">
                    Get Started Free
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* subtle dot grid background */}
        <div className="pointer-events-none absolute inset-0 bg-dots [background-size:20px_20px] opacity-60" />

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
                className="w-fit rounded-full border-blue-100 bg-blue-50 px-3.5 py-1 text-blue-700"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI-Powered Code Intelligence
              </Badge>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="max-w-xl text-balance text-5xl font-extrabold leading-[1.04] text-slate-900 md:text-[4.25rem]"
            >
              Ship code with
              <br />
              absolute
              <br />
              confidence.
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="max-w-lg text-lg leading-relaxed text-slate-500"
            >
              The enterprise-grade AI code review assistant that detects{" "}
              <strong className="text-slate-700">bugs</strong>,{" "}
              <strong className="text-slate-700">security flaws</strong>, and{" "}
              <strong className="text-slate-700">performance issues</strong> before you merge.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3">
            <SignedOut>
              <SignUpButton mode="redirect">
                <Button className="h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-7 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700">
                  Analyze My Repo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button
                asChild
                className="h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-7 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700"
              >
                <Link href="#preview">
                  Analyze My Repo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SignedIn>
              <Button variant="outline" className="h-12 rounded-2xl border-slate-300 px-7 text-base text-slate-800">
                View Demo
              </Button>
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
              {/* Animated iridescent organic blob */}
              <div className="hero-blob-wrap">
                <div className="hero-blob" />
                <div className="hero-blob-highlight-1" />
                <div className="hero-blob-highlight-2" />
              </div>
            </div>

            {/* Floating card – Security Risk */}
            <motion.div
              className="absolute left-[-3%] top-[16%] w-[72%]"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{ duration: 5, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            >
              <Card className="rounded-2xl border-white/70 bg-white/70 shadow-xl shadow-slate-900/10 backdrop-blur-[8px]">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-600">
                      <ShieldAlert className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-lg font-semibold leading-tight text-slate-900">Security Risk Detected</p>
                      <p className="text-sm text-slate-500">SQL Injection Vulnerability</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-rose-100">
                    <div className="h-1.5 w-4/5 rounded-full bg-rose-500" />
                  </div>
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
              <Card className="rounded-2xl border-white/70 bg-white/70 shadow-xl shadow-slate-900/10 backdrop-blur-[8px]">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-base font-medium text-slate-700">Code Quality Score</p>
                    <p className="text-2xl font-bold text-emerald-600">98/100</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">
                      Maintainability A+
                    </div>
                    <div className="rounded-lg bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-700">
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
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            Intelligent code reviews
            <br />
            without the bottleneck
          </h2>
          <p className="mt-3 text-slate-500">
            Empower your team to merge faster while maintaining the highest standards of code quality and security.
          </p>
        </div>
        <motion.div 
          className="grid gap-5 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={fadeInUp}>
              <Card className="h-full rounded-2xl border-slate-200 shadow-sm transition hover:shadow-md">
                <CardHeader className="space-y-4">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${feature.iconClass}`}>
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-xl text-slate-900">{feature.title}</CardTitle>
                    <CardDescription className="mt-2 leading-relaxed text-slate-500">
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
      <section className="relative overflow-hidden bg-[#0B0F19] py-24">
        {/* subtle plus/cross pattern */}
        <div className="plus-pattern pointer-events-none absolute inset-0 opacity-100" />
        <div className="relative mx-auto w-full max-w-6xl px-5 md:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-white">
              Reviews you can trust
            </h2>
            <p className="mt-3 text-slate-400">
              Every finding is grounded, cited, and policy-checked. Fewer false positives, faster merges.
            </p>
          </div>
          <motion.div 
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {trustLayerCards.map((card) => (
              <motion.div
                key={card.title}
                variants={fadeInUp}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:border-indigo-400/30 hover:bg-white/[0.07]"
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <card.icon className="h-5 w-5" />
                </span>
                <h3 className="mb-2 text-lg font-semibold text-white">{card.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{card.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section id="preview" className="mx-auto w-full max-w-6xl px-5 py-24 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            See every analysis, at a glance
          </h2>
          <p className="mt-3 text-slate-500">From parsing to decision in seconds. Monitor your entire pipeline.</p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeInUp}
          className="rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-indigo-50/60 to-white p-4 shadow-2xl shadow-violet-200/50 md:p-6"
        >
          {/* Outer card with subtle border */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg">

            {/* ── App Header ── */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
              <div className="flex items-center gap-2.5">
                {/* Purple hexagon icon */}
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-300/40">
                  <Hexagon className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm font-bold tracking-widest text-slate-800">CODEFLOW AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
                  <Search className="h-3 w-3" />
                  <span>Search</span>
                </div>
                {/* User avatar with notification dot */}
                <div className="relative">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-500">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" />
                </div>
              </div>
            </div>

            {/* ── Layout: sidebar + content ── */}
            <div className="grid md:grid-cols-[160px_1fr]">

              {/* Sidebar */}
              <aside className="border-r border-slate-100 bg-slate-50/60 px-2 py-4">
                <ul className="space-y-0.5 text-[13px]">
                  {[
                    { label: "Dashboard", icon: BookOpen },
                    { label: "Projects",  icon: Box },
                    { label: "Users",     icon: Users },
                    { label: "Settings",  icon: Cpu },
                  ].map((item) => (
                    <li key={item.label}>
                      <span className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                    </li>
                  ))}
                  {/* Active item */}
                  <li>
                    <span className="flex cursor-default items-center gap-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 px-3 py-2 font-semibold text-white shadow-sm shadow-violet-300/40">
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

      {/* ── CTA BANNER (Dark gradient) ── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeInUp}
          className="plus-pattern relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 px-6 py-16 text-center text-white md:px-10"
        >
          <h3 className="text-balance text-4xl font-bold md:text-5xl">
            Ready to elevate your code quality?
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-indigo-100">
            Join thousands of developers shipping cleaner, safer code every day.
            <br className="hidden md:inline" />
            Start your 14-day free trial — no credit card required.
          </p>
          <Button className="mt-8 h-12 rounded-2xl bg-white px-8 text-base font-semibold text-indigo-700 shadow-lg hover:bg-indigo-50">
            Get Started Now
          </Button>
          <p className="mt-5 text-sm text-indigo-200">Free for open source projects.</p>
        </motion.div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="mx-auto w-full max-w-6xl px-5 pb-28 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Simple, transparent pricing</h2>
          <p className="mt-3 text-slate-500">Start for free, upgrade when you need more.</p>
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
            <Card className="relative h-full overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-400 text-white shadow-xl shadow-indigo-200">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl bg-sky-300/80 px-3 py-1 text-xs font-medium text-white">
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
              <Button className="mt-8 h-12 w-full rounded-2xl bg-white text-indigo-600 shadow hover:bg-indigo-50">
                Start free
              </Button>
            </CardContent>
          </Card>
          </motion.div>

          {/* Team — Coming soon */}
          <motion.div variants={fadeInUp} className="h-full">
            <Card className="h-full rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-3xl">Team</CardTitle>
              <CardDescription>For teams that need advanced features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-5xl font-extrabold text-slate-900">Coming soon</p>
              <ul className="space-y-3.5 text-sm text-slate-700">
                {teamFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-indigo-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow hover:from-indigo-600 hover:to-purple-700">
                Join waitlist
              </Button>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mx-auto w-full max-w-6xl px-5 pb-10 pt-2 md:px-8">
        <div className="grid gap-10 border-b border-slate-200 pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="text-lg font-semibold">TrustReview</span>
            </div>
            <p className="max-w-xs text-sm text-slate-500">
              Automated, explainable code reviews powered by LLMs and grounded in your documentation.
            </p>
            <div className="mt-5 flex items-center gap-4 text-slate-400">
              <Twitter className="h-4 w-4 cursor-pointer transition hover:text-slate-600" />
              <Github className="h-4 w-4 cursor-pointer transition hover:text-slate-600" />
              <Linkedin className="h-4 w-4 cursor-pointer transition hover:text-slate-600" />
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-slate-900">Product</h4>
            <ul className="space-y-1.5 text-sm text-slate-500">
              <li className="cursor-pointer hover:text-slate-700">Features</li>
              <li className="cursor-pointer hover:text-slate-700">Integrations</li>
              <li className="cursor-pointer hover:text-slate-700">Pricing</li>
              <li className="cursor-pointer hover:text-slate-700">Changelog</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-slate-900">Resources</h4>
            <ul className="space-y-1.5 text-sm text-slate-500">
              <li className="cursor-pointer hover:text-slate-700">Documentation</li>
              <li className="cursor-pointer hover:text-slate-700">API Reference</li>
              <li className="cursor-pointer hover:text-slate-700">Blog</li>
              <li className="cursor-pointer hover:text-slate-700">Community</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-slate-900">Company</h4>
            <ul className="space-y-1.5 text-sm text-slate-500">
              <li className="cursor-pointer hover:text-slate-700">About</li>
              <li className="cursor-pointer hover:text-slate-700">Careers</li>
              <li className="cursor-pointer hover:text-slate-700">Legal</li>
              <li className="cursor-pointer hover:text-slate-700">Contact</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} TrustReview Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="cursor-pointer hover:text-slate-700">Privacy Policy</span>
            <span className="cursor-pointer hover:text-slate-700">Terms of Service</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
