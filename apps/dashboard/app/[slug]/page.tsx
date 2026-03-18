import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

type PageContent = {
  title: string
  summary: string
  intro: string
  highlights: string[]
  sections: Array<{ title: string; body: string }>
  ctaLabel?: string
  ctaHref?: string
}

const PAGE_CONTENT: Record<string, PageContent> = {
  "features": {
    title: "Features",
    summary: "Core capabilities built for modern engineering teams.",
    intro:
      "TrustReview analyzes every pull request with policy-aware checks, security validation, and grounded explanations that map directly to your code.",
    highlights: [
      "PR analysis with evidence and line-level traces",
      "Security and secret scanning before merge",
      "Configurable pass, warn, and fail policy gates",
    ],
    sections: [
      {
        title: "Designed for engineering workflows",
        body: "The platform integrates into review flows that teams already use, including GitHub pull requests, protected branches, and CI pipelines.",
      },
      {
        title: "Built for explainability",
        body: "Every recommendation includes reasoning and references, so reviewers can quickly validate suggestions instead of guessing why an issue was raised.",
      },
    ],
    ctaLabel: "Open dashboard",
    ctaHref: "/auth/role-redirect",
  },
  "integrations": {
    title: "Integrations",
    summary: "Connect your SCM, CI, and internal knowledge sources.",
    intro:
      "TrustReview works with the tools your team already depends on, so review automation feels native instead of bolted on.",
    highlights: [
      "GitHub PR checks and status updates",
      "Webhook-based automation for pipelines",
      "Knowledge base ingestion from docs and markdown",
    ],
    sections: [
      {
        title: "Git platform support",
        body: "Repositories can be connected at organization level, with branch protection and deployment workflows respected by default.",
      },
      {
        title: "Knowledge-aware review",
        body: "Connect documentation to improve recommendation quality and reduce false positives on project-specific architecture decisions.",
      },
    ],
    ctaLabel: "Read API reference",
    ctaHref: "/api-reference",
  },
  "pricing": {
    title: "Pricing",
    summary: "Transparent plans for individuals and engineering organizations.",
    intro:
      "Start with a free plan, then scale to team-level governance, role-based access control, and higher analysis volume.",
    highlights: [
      "Free plan for community and open-source projects",
      "Team plan with advanced policy and compliance features",
      "Predictable usage limits and upgrade paths",
    ],
    sections: [
      {
        title: "No hidden costs",
        body: "Pricing is based on repository and analysis usage with clear limits and plan details visible in the dashboard.",
      },
      {
        title: "Enterprise readiness",
        body: "For larger organizations, support includes single sign-on, audit logging, and deployment guidance for secure environments.",
      },
    ],
    ctaLabel: "Contact sales",
    ctaHref: "/contact",
  },
  "changelog": {
    title: "Changelog",
    summary: "Recent updates across analysis, policy, and platform reliability.",
    intro:
      "We ship iterative improvements each sprint with a focus on actionable findings, faster processing, and stronger integrations.",
    highlights: [
      "Improved deduplication for repeated findings",
      "Lower latency for pull request analysis",
      "Expanded policy rule controls and audit visibility",
    ],
    sections: [
      {
        title: "Latest release",
        body: "This cycle introduces better traceability from findings to source snippets, plus stability improvements in asynchronous worker processing.",
      },
      {
        title: "Upcoming",
        body: "Planned updates include enhanced triage workflows, deeper observability dashboards, and expanded repository-level configuration.",
      },
    ],
  },
  "documentation": {
    title: "Documentation",
    summary: "Guides for setup, operations, and production usage.",
    intro:
      "The documentation covers local development, infrastructure, API usage, and recommended workflows for engineering teams.",
    highlights: [
      "Quickstart for backend, worker, and dashboard setup",
      "Operational guidance for queueing and observability",
      "Security and governance best practices",
    ],
    sections: [
      {
        title: "Getting started",
        body: "Set up local infrastructure, run migrations, connect your repositories, and validate the first end-to-end analysis in minutes.",
      },
      {
        title: "Runbook and troubleshooting",
        body: "Find operational playbooks for worker queues, API timeouts, webhook delivery, and service health monitoring.",
      },
    ],
    ctaLabel: "View API endpoints",
    ctaHref: "/api-reference",
  },
  "api-reference": {
    title: "API Reference",
    summary: "Programmatic access to analyses, reports, and policy controls.",
    intro:
      "Use the API to submit review jobs, fetch report details, and automate governance checks in your CI/CD flows.",
    highlights: [
      "Authenticated endpoints for analysis lifecycle",
      "Structured report payloads with finding metadata",
      "Webhook events for async job status changes",
    ],
    sections: [
      {
        title: "Authentication",
        body: "API tokens are scoped by organization and environment, with least-privilege defaults and rotation support.",
      },
      {
        title: "Versioning and stability",
        body: "Endpoints follow documented versioning and deprecation windows so integrations remain stable during upgrades.",
      },
    ],
  },
  "blog": {
    title: "Blog",
    summary: "Engineering notes, release deep-dives, and security insights.",
    intro:
      "The TrustReview blog shares practical guidance from real deployments, with examples that teams can apply immediately.",
    highlights: [
      "AI-assisted review patterns that reduce noise",
      "Security findings that commonly slip through PRs",
      "Practical rollout playbooks for engineering managers",
    ],
    sections: [
      {
        title: "Recent topics",
        body: "We cover diff-aware prompting, policy calibration, and measurable review quality outcomes across different team sizes.",
      },
      {
        title: "Contributions",
        body: "Guest posts from platform engineers and security leads are welcome, with a focus on reproducible practices.",
      },
    ],
  },
  "community": {
    title: "Community",
    summary: "Join builders improving software quality with trustworthy AI.",
    intro:
      "The community includes maintainers, team leads, and reviewers sharing configurations, feedback loops, and migration tips.",
    highlights: [
      "Public discussions on implementation patterns",
      "Shared templates for policy and triage",
      "Open feedback channel for roadmap priorities",
    ],
    sections: [
      {
        title: "How to participate",
        body: "Ask questions, share findings, and collaborate on better review workflows in open channels and community events.",
      },
      {
        title: "Support model",
        body: "Community support is best-effort and complemented by structured support plans for production teams.",
      },
    ],
  },
  "about": {
    title: "About",
    summary: "Our mission is to make software quality fast, explainable, and reliable.",
    intro:
      "TrustReview was built to help teams move quickly without compromising correctness, security, or accountability.",
    highlights: [
      "Explainable AI recommendations grounded in code",
      "Developer-first workflows that reduce friction",
      "Governance features for teams operating at scale",
    ],
    sections: [
      {
        title: "What we believe",
        body: "Automated review should amplify engineers, not replace judgment. Clear evidence and transparent logic are non-negotiable.",
      },
      {
        title: "How we build",
        body: "We iterate with user feedback, validate outcomes with measurable quality signals, and prioritize reliability in production.",
      },
    ],
  },
  "careers": {
    title: "Careers",
    summary: "Build the future of trusted, AI-assisted engineering.",
    intro:
      "We are hiring product-focused engineers, designers, and operators who care about developer experience and system reliability.",
    highlights: [
      "Remote-friendly collaboration",
      "Ownership from architecture to delivery",
      "Learning culture with direct user feedback",
    ],
    sections: [
      {
        title: "Open roles",
        body: "Current roles span frontend, backend, platform reliability, and developer success. Reach out with your profile and project examples.",
      },
      {
        title: "Hiring process",
        body: "The process is practical and transparent: intro conversation, technical deep-dive, and team collaboration interview.",
      },
    ],
    ctaLabel: "Contact recruiting",
    ctaHref: "/contact",
  },
  "legal": {
    title: "Legal",
    summary: "Policy and compliance information for using TrustReview.",
    intro:
      "This page summarizes the legal framework around service usage, data handling, and customer responsibilities.",
    highlights: [
      "Terms and contractual obligations",
      "Privacy and data processing commitments",
      "Security posture and disclosure policy",
    ],
    sections: [
      {
        title: "Service terms",
        body: "Use of the platform is governed by service terms that define acceptable usage, plan limits, and account responsibilities.",
      },
      {
        title: "Compliance",
        body: "For regulated customers, additional documentation and agreements can be provided through the enterprise onboarding process.",
      },
    ],
  },
  "contact": {
    title: "Contact",
    summary: "Talk to our team about product questions, support, or partnerships.",
    intro:
      "For onboarding help, enterprise evaluation, or technical guidance, contact us and we will route your request quickly.",
    highlights: [
      "Sales and plan consultation",
      "Technical support and onboarding guidance",
      "Partnership and integration requests",
    ],
    sections: [
      {
        title: "Primary email",
        body: "Reach us at contact@trustreview.ai. Include your organization name and environment details to speed up responses.",
      },
      {
        title: "Response times",
        body: "Typical response windows are under one business day for general inquiries and faster for active support agreements.",
      },
    ],
  },
  "privacy": {
    title: "Privacy Policy",
    summary: "How TrustReview collects, processes, and protects data.",
    intro:
      "We process only the data needed to deliver analysis and maintain service reliability, with clear controls and retention boundaries.",
    highlights: [
      "Purpose-limited data processing",
      "Retention controls and deletion workflows",
      "Security safeguards and access restrictions",
    ],
    sections: [
      {
        title: "Data categories",
        body: "Data may include repository metadata, analysis artifacts, and operational logs required for platform functionality and diagnostics.",
      },
      {
        title: "Customer controls",
        body: "Administrators can request export and deletion operations according to documented support procedures and contractual terms.",
      },
    ],
  },
  "terms": {
    title: "Terms of Service",
    summary: "Rules and responsibilities for using the TrustReview platform.",
    intro:
      "These terms define account usage, service boundaries, and legal obligations for both TrustReview and customers.",
    highlights: [
      "Acceptable use and account security obligations",
      "Plan limits, billing, and cancellation terms",
      "Liability and warranty boundaries",
    ],
    sections: [
      {
        title: "Account responsibilities",
        body: "Customers are responsible for credential management, user access policies, and lawful use of connected repositories.",
      },
      {
        title: "Service commitments",
        body: "TrustReview commits to operating the platform with reasonable care, timely maintenance, and transparent incident communication.",
      },
    ],
  },
}

type PageProps = {
  params: {
    slug: string
  }
}

export function generateStaticParams() {
  return Object.keys(PAGE_CONTENT).map((slug) => ({ slug }))
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = PAGE_CONTENT[params.slug]
  if (!page) {
    return {
      title: "Page not found",
    }
  }

  return {
    title: `${page.title} | TrustReview`,
    description: page.summary,
  }
}

export default function MarketingContentPage({ params }: PageProps) {
  const page = PAGE_CONTENT[params.slug]
  if (!page) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 md:px-8 md:pt-14">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Back to home
          </Link>
          <Link
            href="/auth/role-redirect"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open dashboard
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">TrustReview</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{page.title}</h1>
          <p className="mt-3 text-slate-600">{page.summary}</p>
          <p className="mt-6 leading-7 text-slate-700">{page.intro}</p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {page.highlights.map((highlight) => (
              <div key={highlight} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {highlight}
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-6">
            {page.sections.map((section) => (
              <article key={section.title} className="rounded-xl border border-slate-200 p-5">
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-2 leading-7 text-slate-700">{section.body}</p>
              </article>
            ))}
          </div>

          {page.ctaLabel && page.ctaHref ? (
            <div className="mt-8">
              <Link
                href={page.ctaHref}
                className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                {page.ctaLabel}
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
