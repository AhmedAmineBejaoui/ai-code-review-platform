import {
  ArrowRight,
  Check,
  CircleDot,
  Flame,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  Stars,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const featureCards = [
  {
    title: "Real-time analysis",
    description:
      "Run secure, fast inspections on every PR with structured findings and clear severities.",
    icon: LineChart,
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    title: "Security hardening",
    description:
      "Detect secret exposure, high-risk patterns, and risky shell calls before they reach production.",
    icon: Lock,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Context-aware review",
    description:
      "Summaries, categories, and diff-aware insights keep reviewers focused on what actually changed.",
    icon: Sparkles,
    color: "bg-rose-100 text-rose-700",
  },
]

const logos = ["Vercel", "GigaLayer", "Cloud 42", "CodeLifter"]

const tableRows = [
  { repo: "frontend/web", status: "Running", risk: "Medium", summary: "Feature rollout with auth hooks" },
  { repo: "backend/api", status: "Completed", risk: "Low", summary: "Refactor + summary generation" },
  { repo: "infra/worker", status: "Queued", risk: "High", summary: "Secret detection and queue tuning" },
  { repo: "mobile/app", status: "Completed", risk: "Low", summary: "UI polish and crash fixes" },
]

const starterItems = [
  "PR-by-PR deep inspection",
  "Secret scan + redaction",
  "Unified diff parsing",
  "Summaries and categories",
  "Email support",
]

const teamItems = [
  "Policy engine and RBAC",
  "Inline comments and triage",
  "Knowledge base + vector RAG",
  "SLA support",
]

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f5f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-indigo-100/70 to-transparent" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-20 pt-6 md:px-10">
        <header className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-700">CodeGuardian</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-500 md:flex">
            <a href="#features" className="transition hover:text-slate-900">
              Product
            </a>
            <a href="#dashboard" className="transition hover:text-slate-900">
              Dashboard
            </a>
            <a href="#pricing" className="transition hover:text-slate-900">
              Pricing
            </a>
          </nav>
          <Button size="sm">Try it free</Button>
        </header>

        <section className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <Badge variant="secondary" className="rounded-full px-3">
              Built for modern CI pipelines
            </Badge>
            <h1 className="max-w-lg text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Ship code with absolute confidence.
            </h1>
            <p className="max-w-lg text-pretty text-base leading-relaxed text-slate-500">
              Review faster, catch real risks, and preserve release velocity. CodeGuardian blends static analysis,
              secure diff parsing, and AI summaries into one focused review flow.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="gap-2">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg">
                Watch demo
              </Button>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {["AL", "SB", "MK"].map((initial) => (
                  <span
                    key={initial}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    {initial}
                  </span>
                ))}
              </div>
              <span>Trusted by 1,800+ engineering teams</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[460px]">
            <Card className="overflow-hidden border-indigo-100 bg-white/80 backdrop-blur">
              <CardHeader className="space-y-2 border-b border-slate-100 pb-4">
                <CardDescription className="text-xs uppercase tracking-[0.16em] text-slate-400">Risk snapshot</CardDescription>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>Example PR analyzed</span>
                  <Badge className="bg-rose-500">High Risk</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="relative mb-5 h-52 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-200 via-violet-300 to-cyan-200">
                  <div className="absolute inset-0 bg-dots opacity-60" />
                  <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#7c3aed_35%,#312e81_72%)] shadow-2xl" />
                  <div className="absolute left-[18%] top-[20%] h-12 w-12 rounded-full bg-cyan-300/70 blur-sm" />
                  <div className="absolute right-[16%] top-[18%] h-10 w-10 rounded-full bg-fuchsia-300/70 blur-sm" />
                  <div className="absolute bottom-[16%] right-[24%] h-12 w-12 rounded-full bg-indigo-400/70 blur-sm" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Security findings</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">07</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Time saved / PR</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">+32m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-16">
          <p className="mb-4 text-center text-xs uppercase tracking-[0.22em] text-slate-400">Trusted by engineering teams at</p>
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-5 backdrop-blur md:grid-cols-4">
            {logos.map((logo) => (
              <div key={logo} className="text-center text-sm font-semibold tracking-wide text-slate-500">
                {logo}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mt-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Intelligent code reviews without the bottleneck</h2>
            <p className="mt-3 text-slate-500">
              Focus on true engineering decisions. We handle noisy checks, risk triage, and structured summaries.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {featureCards.map((feature) => (
              <Card key={feature.title} className="border-slate-200/80 bg-white">
                <CardHeader>
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${feature.color}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-slate-500">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="dashboard" className="mt-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">See every analysis, at a glance</h2>
            <p className="mt-3 text-slate-500">From pending to resolved in seconds. Monitor PR status across every repo.</p>
          </div>
          <div className="rounded-[30px] border border-indigo-100 bg-gradient-to-br from-indigo-100/80 via-violet-100/70 to-cyan-100/70 p-3 shadow-panel md:p-6">
            <Card className="overflow-hidden border-indigo-100">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Pipeline overview</span>
                  <Badge variant="secondary">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Repository</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Risk</th>
                        <th className="px-4 py-3">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <tr key={row.repo} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-800">{row.repo}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                              <CircleDot className="h-3 w-3" />
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                row.risk === "High"
                                  ? "bg-rose-100 text-rose-700"
                                  : row.risk === "Medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {row.risk}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{row.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-20">
          <div className="rounded-3xl bg-indigo-700 p-10 text-center text-white shadow-panel">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wider">
              <Stars className="h-3.5 w-3.5" />
              Ready for your next sprint
            </p>
            <h3 className="mx-auto max-w-2xl text-3xl font-semibold">Ready to elevate your code quality?</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-indigo-100">
              Join teams already shipping safer and faster with one focused review dashboard.
            </p>
            <Button className="mt-6 bg-white text-indigo-700 hover:bg-indigo-50">Get started now</Button>
          </div>
        </section>

        <section id="pricing" className="mt-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-3 text-slate-500">Start free for early-stage teams. Upgrade when your review volume grows.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-indigo-200 bg-gradient-to-b from-indigo-500 to-indigo-600 text-white">
              <CardHeader>
                <Badge className="w-fit bg-white/15 text-white">Community</Badge>
                <CardTitle className="mt-3 text-2xl">Free</CardTitle>
                <CardDescription className="text-indigo-100">Great for personal projects and small teams.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {starterItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4" />
                    {item}
                  </div>
                ))}
                <Button className="mt-4 w-full bg-white text-indigo-700 hover:bg-indigo-50">Start free</Button>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Team
                </Badge>
                <CardTitle className="mt-3 text-2xl">Coming soon</CardTitle>
                <CardDescription>For organizations managing critical pipelines and compliance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-indigo-500" />
                    {item}
                  </div>
                ))}
                <Button variant="secondary" className="mt-4 w-full">
                  Join waitlist
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="mt-20 border-t border-slate-200/80 py-8 text-xs text-slate-500">
          <div className="flex flex-col justify-between gap-3 md:flex-row">
            <p className="inline-flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-indigo-500" />
              CodeGuardian
            </p>
            <div className="flex items-center gap-5">
              <span className="inline-flex items-center gap-1">
                <TriangleAlert className="h-3.5 w-3.5" />
                Security first
              </span>
              <span>Privacy policy</span>
              <span>Terms of use</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
