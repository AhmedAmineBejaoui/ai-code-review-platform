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
  GitBranch,
  Github,
  Hexagon,
  Linkedin,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  Triangle,
  Twitter,
  User,
  Users,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
    description: "Instant feedback on every pull request. No more waiting for human reviewers on basic checks.",
    icon: Zap,
    iconClass: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Security Hardening",
    description: "Proactively identify vulnerabilities, exposed secrets, and dependency risks before production.",
    icon: Lock,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Context Awareness",
    description: "AI understands your project's architecture and highlights only relevant issues.",
    icon: GitBranch,
    iconClass: "bg-rose-50 text-rose-600",
  },
]

const pendingReviews = [
  { project: "Payment API", file: "1.5", author: "206.90", status: "Approved" },
  { project: "Auth Service", file: "2.3", author: "188.40", status: "Changed" },
  { project: "Web Dashboard", file: "0.9", author: "159.20", status: "Pending" },
]

const completedReviews = [
  { project: "SDK Client", file: "2.1", author: "184.22", status: "Approved" },
  { project: "Worker Queue", file: "3.0", author: "166.83", status: "Pending" },
  { project: "Knowledge Base", file: "1.2", author: "203.10", status: "Approved" },
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

function statusClass(status: string): string {
  if (status === "Approved") {
    return "bg-emerald-100 text-emerald-700"
  }
  if (status === "Pending") {
    return "bg-amber-100 text-amber-700"
  }
  return "bg-violet-100 text-violet-700"
}

function ReviewsTable({
  title,
  rows,
}: {
  title: string
  rows: Array<{ project: string; file: string; author: string; status: string }>
}) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-3 shadow-sm">
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Project</th>
              <th className="px-2 py-1.5 text-left font-medium">File</th>
              <th className="px-2 py-1.5 text-left font-medium">Author</th>
              <th className="px-2 py-1.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.project}`} className="border-t border-slate-100">
                <td className="px-2 py-1.5 text-slate-700">{row.project}</td>
                <td className="px-2 py-1.5 text-slate-600">{row.file}</td>
                <td className="px-2 py-1.5 text-slate-600">{row.author}</td>
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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Cpu className="h-4 w-4" />
            </span>
            <span className="text-xl font-semibold tracking-tight">CodeGuardian</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm font-medium text-slate-700 transition hover:text-slate-900">
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
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-14 px-5 pb-14 pt-14 md:px-8 lg:grid-cols-2 lg:items-center lg:py-20">
        <div className="space-y-7">
          <Badge variant="secondary" className="w-fit rounded-full border-blue-100 bg-blue-50 px-3.5 py-1 text-blue-700">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            AI-Powered Code Intelligence
          </Badge>

          <h1 className="max-w-xl text-balance text-5xl font-extrabold leading-[1.04] text-slate-900 md:text-7xl">
            Ship code with absolute confidence.
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-slate-500">
            The enterprise-grade AI code review assistant that detects bugs, security flaws, and performance issues
            before you merge.
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

        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="relative h-[430px] overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-[#eef3fb]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_55%,rgba(45,212,191,0.2),transparent_45%),radial-gradient(circle_at_45%_45%,rgba(129,140,248,0.4),transparent_42%),radial-gradient(circle_at_55%_60%,rgba(196,181,253,0.35),transparent_48%)]" />
            <div className="absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-[46%_54%_56%_44%/47%_40%_60%_53%] bg-[radial-gradient(circle_at_30%_30%,#67e8f9_0%,#4f46e5_30%,#7c3aed_55%,#0f172a_85%)] shadow-[0_42px_70px_-30px_rgba(30,64,175,0.46)] after:absolute after:inset-[14px] after:rounded-[inherit] after:border after:border-white/35 after:content-['']" />
            <div className="absolute left-[58%] top-[58%] h-8 w-8 rounded-full bg-cyan-300/70 blur-[2px]" />
            <div className="absolute left-[38%] top-[36%] h-7 w-7 rounded-full bg-violet-300/70 blur-[2px]" />
          </div>

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
                    <p className="text-sm text-slate-500">SQL injection vulnerability</p>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-rose-100">
                  <div className="h-1.5 w-4/5 rounded-full bg-rose-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

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
      </section>

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

      <section className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Intelligent code reviews without the bottleneck</h2>
          <p className="mt-3 text-slate-500">
            Empower your team to merge faster while maintaining the highest standards of code quality and security.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="space-y-4">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${feature.iconClass}`}>
                  <feature.icon className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-xl text-slate-900">{feature.title}</CardTitle>
                  <CardDescription className="mt-2 leading-relaxed text-slate-500">{feature.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">See every analysis, at a glance</h2>
          <p className="mt-3 text-slate-500">From parsing to decision in seconds. Monitor your entire pipeline.</p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 shadow-xl shadow-indigo-100/60 md:p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
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

      <section className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Simple, transparent pricing</h2>
          <p className="mt-3 text-slate-500">Start for free, upgrade when you need more.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-xl shadow-indigo-200">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl bg-sky-300 px-3 py-1 text-xs font-medium text-white">
              Most popular
            </div>
            <CardHeader className="pt-10">
              <CardTitle className="text-3xl text-white">Community</CardTitle>
              <CardDescription className="text-indigo-100">Perfect for open source and personal projects</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-5xl font-extrabold">Free</p>
              <ul className="space-y-3.5 text-sm">
                {communityFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 h-12 w-full rounded-2xl bg-white text-indigo-600 hover:bg-indigo-50">Start free</Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <Badge variant="outline" className="w-fit rounded-full">
                Coming soon
              </Badge>
              <CardTitle className="mt-2 text-3xl">Team</CardTitle>
              <CardDescription>For teams that need advanced features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-5xl font-extrabold text-slate-900">Coming soon</p>
              <ul className="space-y-3.5 text-sm text-slate-700">
                {teamFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-indigo-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
                Join waitlist
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
        <div className="plus-pattern rounded-3xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-6 py-16 text-center text-white md:px-10">
          <h3 className="text-balance text-4xl font-bold md:text-5xl">Ready to elevate your code quality?</h3>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-indigo-100">
            Join thousands of developers shipping cleaner, safer code every day. Start your 14-day free trial.
          </p>
          <Button className="mt-8 h-12 rounded-2xl bg-white px-8 text-base text-indigo-700 hover:bg-indigo-50">
            Get Started Now
          </Button>
          <p className="mt-5 text-sm text-indigo-100">Free for open source projects.</p>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-10 pt-2 md:px-8">
        <div className="grid gap-10 border-b border-slate-200 pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <Hexagon className="h-4 w-4" />
              </span>
              <span className="text-lg font-semibold">TrustReview</span>
            </div>
            <p className="max-w-xs text-slate-500">
              Automated, explainable code reviews powered by LLMs and grounded in your documentation.
            </p>
            <div className="mt-5 flex items-center gap-4 text-slate-400">
              <Twitter className="h-4 w-4" />
              <Github className="h-4 w-4" />
              <Linkedin className="h-4 w-4" />
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Product</h4>
            <ul className="space-y-1.5 text-slate-500">
              <li>Features</li>
              <li>Integrations</li>
              <li>Pricing</li>
              <li>Changelog</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Resources</h4>
            <ul className="space-y-1.5 text-slate-500">
              <li>Documentation</li>
              <li>API Reference</li>
              <li>Blog</li>
              <li>Community</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Company</h4>
            <ul className="space-y-1.5 text-slate-500">
              <li>About</li>
              <li>Careers</li>
              <li>Legal</li>
              <li>Contact</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2025 TrustReview Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
