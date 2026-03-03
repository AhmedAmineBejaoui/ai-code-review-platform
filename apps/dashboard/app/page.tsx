"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Box,
  Check,
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
  { project: "Payment API", file: "1.5", changes: "Change Requested", author: "206.90", lastUpdated: "Approved", status: "Approved" },
  { project: "Auth Service", file: "1.85", changes: "Approved", author: "200.50", lastUpdated: "Approved", status: "Approved" },
  { project: "Web Dashboard", file: "1.67", changes: "Advising", author: "205.80", lastUpdated: "Approved", status: "Changed" },
  { project: "School Rosik", file: "3.10", changes: "Adprening", author: "255.80", lastUpdated: "Awaiting", status: "Pending" },
]

const completedReviews = [
  { project: "SDK Client", file: "2.5", changes: "Change Requested", author: "204.60", lastUpdated: "Approved", status: "Approved" },
  { project: "Worker Queue", file: "1.86", changes: "Approved", author: "204.60", lastUpdated: "Approved", status: "Approved" },
  { project: "Knowledge Base", file: "1.88", changes: "Rest.Int", author: "158.80", lastUpdated: "Approved", status: "Changed" },
  { project: "Rebuad Davis", file: "3.85", changes: "Change Requested", author: "158.80", lastUpdated: "Approved", status: "Pending" },
  { project: "Interbid Data", file: "4.55", changes: "Rest.Int", author: "135.80", lastUpdated: "Approved", status: "Pending" },
  { project: "Printed Data", file: "5.85", changes: "Rest.Int", author: "158.80", lastUpdated: "Approved", status: "Pending" },
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
  if (status === "Approved") return "bg-emerald-100 text-emerald-700"
  if (status === "Pending") return "bg-amber-100 text-amber-700"
  if (status === "Changed") return "bg-violet-100 text-violet-700"
  return "bg-slate-100 text-slate-600"
}

/* ─── SUB-COMPONENTS ─── */

function ReviewsTable({
  title,
  rows,
}: {
  title: string
  rows: typeof pendingReviews
}) {
  return (
    <div className="rounded-2xl border border-violet-200/70 bg-white p-3 shadow-sm">
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Project</th>
              <th className="px-2 py-1.5 text-left font-medium">File</th>
              <th className="px-2 py-1.5 text-left font-medium">Author</th>
              <th className="px-2 py-1.5 text-left font-medium">Last Updated</th>
              <th className="px-2 py-1.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${title}-${i}`} className="border-t border-slate-100">
                <td className="px-2 py-1.5 text-slate-700">{row.project}</td>
                <td className="px-2 py-1.5 text-slate-600">{row.file}</td>
                <td className="px-2 py-1.5 text-slate-600">{row.author}</td>
                <td className="px-2 py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(row.lastUpdated)}`}>
                    {row.lastUpdated}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(row.status)}`}>
                    {row.status}
                  </span>
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

export default function HomePage() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }
  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ── NAVBAR ── */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xl font-semibold tracking-tight">TrustReview</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-900">Features</a>
            <a href="#preview" className="transition hover:text-slate-900">Product</a>
            <a href="#pricing" className="transition hover:text-slate-900">Pricing</a>
            <a href="https://docs.trustreview.ai" className="transition hover:text-slate-900">Docs</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/auth" className="hidden text-sm font-medium text-slate-700 transition hover:text-slate-900 sm:inline">
              Sign In
            </Link>
            <Button
              asChild
              className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700"
            >
              <Link href="/auth">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* subtle dot grid background */}
        <div className="pointer-events-none absolute inset-0 bg-dots [background-size:20px_20px] opacity-60" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 pb-14 pt-16 md:px-8 lg:grid-cols-2 lg:items-center lg:py-24">
          {/* Left – text */}
          <div className="space-y-7">
            <Badge
              variant="secondary"
              className="w-fit rounded-full border-blue-100 bg-blue-50 px-3.5 py-1 text-blue-700"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI-Powered Code Intelligence
            </Badge>

            <h1 className="max-w-xl text-balance text-5xl font-extrabold leading-[1.04] text-slate-900 md:text-[4.25rem]">
              Ship code with
              <br />
              absolute
              <br />
              confidence.
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-slate-500">
              The enterprise-grade AI code review assistant that detects{" "}
              <strong className="text-slate-700">bugs</strong>,{" "}
              <strong className="text-slate-700">security flaws</strong>, and{" "}
              <strong className="text-slate-700">performance issues</strong> before you merge.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-7 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700"
              >
                <Link href="/auth">
                  Analyze My Repo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl border-slate-300 px-7 text-base text-slate-800">
                View Demo
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4">
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
            </div>
          </div>

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
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="rounded-2xl border-slate-200 shadow-sm transition hover:shadow-md">
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
          ))}
        </div>
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trustLayerCards.map((card) => (
              <div
                key={card.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:border-indigo-400/30 hover:bg-white/[0.07]"
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <card.icon className="h-5 w-5" />
                </span>
                <h3 className="mb-2 text-lg font-semibold text-white">{card.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{card.description}</p>
              </div>
            ))}
          </div>
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

        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-indigo-50/80 p-4 shadow-xl shadow-indigo-100/60 md:p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            {/* Mock header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Hexagon className="h-4 w-4" />
                </span>
                <span className="font-semibold text-slate-800">CODEFLOW AI</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-400 sm:flex">
                  <Search className="h-3.5 w-3.5" />
                  Search
                </div>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-[170px_1fr]">
              <aside className="border-r border-slate-100 bg-slate-50/80 p-3">
                <ul className="space-y-1.5 text-sm">
                  {[
                    { label: "Dashboard", icon: BookOpen },
                    { label: "Projects", icon: Box },
                    { label: "Users", icon: Users },
                    { label: "Settings", icon: Cpu },
                    { label: "Code Review", icon: Sparkles, active: true },
                  ].map((item) => (
                    <li key={item.label}>
                      <span
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                          item.active
                            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="space-y-4 p-3 md:p-4">
                <ReviewsTable title="Pending Reviews" rows={pendingReviews} />
                <ReviewsTable title="Completed Reviews" rows={completedReviews} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER (Dark gradient) ── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        <div className="plus-pattern relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 px-6 py-16 text-center text-white md:px-10">
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
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="mx-auto w-full max-w-6xl px-5 pb-28 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Simple, transparent pricing</h2>
          <p className="mt-3 text-slate-500">Start for free, upgrade when you need more.</p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Community — Free */}
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-400 text-white shadow-xl shadow-indigo-200">
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

          {/* Team — Coming soon */}
          <Card className="rounded-3xl border-slate-200 shadow-sm">
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
        </div>
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
