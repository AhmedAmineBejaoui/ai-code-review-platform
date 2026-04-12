'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import {
  ArrowRight,
  Check,
  ChevronRight,
  GitPullRequest,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

import { BrandMark } from './brand-mark';
import { CodeGraphVisual } from './code-graph-visual';
import { PremiumNavbar } from './premium-navbar';

type PremiumLandingPageProps = {
  displayClassName?: string;
  monoClassName?: string;
};

type Story = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  text: string;
  metric: string;
  bullets: string[];
  tone: string;
  visual: 'graph' | 'rules' | 'summary' | 'learning' | 'merge' | 'security';
};

const trustLogos = [
  'Shopify',
  'Snowflake',
  'Figma',
  'Datadog',
  'Harvey',
  'Duolingo',
  'Ramp',
  'Asana',
  'Semgrep',
  'Linear',
  'GitHub',
];

const stories: Story[] = [
  {
    id: 'eyes',
    badge: 'SHIP FASTER',
    title: 'Your second pair of eyes',
    subtitle: 'Get context-aware comments on your PRs',
    text: 'Review comments are generated with full repository context, ownership, and downstream dependency awareness instead of generic lint-like noise.',
    metric: 'Full Codebase Context',
    bullets: [
      'Graph-level understanding across services and call chains',
      'Highlights risky areas like auth flows and remote API boundaries',
      '3D graph visual area preserved for product media placement',
    ],
    tone: 'from-emerald-200/70 via-cyan-100/60 to-sky-100/40',
    visual: 'graph',
  },
  {
    id: 'rules',
    badge: 'CUSTOM CONTEXT',
    title: 'Your house, your rules',
    subtitle: 'Describe your coding standards in English',
    text: 'Write standards in plain English, scope them by path or repository, and let reviewers apply them automatically on every PR.',
    metric: 'Custom Context',
    bullets: [
      'Natural-language policies for style, architecture, and security',
      'Scoped rules per file paths, repos, and patterns',
      'Dedicated image/video placeholder left in place for demos',
    ],
    tone: 'from-amber-200/70 via-orange-100/60 to-rose-100/40',
    visual: 'rules',
  },
  {
    id: 'summary',
    badge: 'PR SUMMARIES',
    title: 'Understand PRs instantly with AI summaries',
    subtitle: 'AI summaries that brief you before the first scroll',
    text: 'Get clear intent, impacted modules, and confidence scoring in a compact summary so reviewers can decide faster.',
    metric: 'Instant PR Understanding',
    bullets: [
      'File-by-file breakdown and change risk highlights',
      'Confidence and impact signal for rapid triage',
      'Visual slot maintained for walkthrough videos/screenshots',
    ],
    tone: 'from-fuchsia-200/70 via-violet-100/60 to-indigo-100/40',
    visual: 'summary',
  },
  {
    id: 'learning',
    badge: 'LEARNING SYSTEM',
    title: 'Learns from your team’s feedback',
    subtitle: 'The AI improves over time from feedback',
    text: 'Accepted, edited, and dismissed comments become training signal so the reviewer aligns with your team standards over time.',
    metric: 'Learning Loop',
    bullets: [
      'Tracks reactions and merge outcomes for continuous tuning',
      'Boosts suggestions your team accepts repeatedly',
      'Keeps media placeholders for case-study clips',
    ],
    tone: 'from-lime-200/70 via-emerald-100/60 to-teal-100/40',
    visual: 'learning',
  },
  {
    id: 'merge',
    badge: 'DATA-DRIVEN RESULTS',
    title: 'Merge PRs faster with AI',
    subtitle: 'Shorter review cycles, fewer blockers',
    text: 'Context-rich comments, summaries, and guided fixes reduce back-and-forth and compress time from opening to merge.',
    metric: 'Merge Faster',
    bullets: [
      'Median review time and merge trend comparisons',
      'Performance visibility for engineering leaders',
      'Chart area kept ready for real product captures',
    ],
    tone: 'from-sky-200/70 via-blue-100/60 to-indigo-100/40',
    visual: 'merge',
  },
  {
    id: 'security',
    badge: 'SECURITY',
    title: 'Security-first design',
    subtitle: 'Enterprise-ready by default',
    text: 'Built for strict environments with encrypted flows, auditable activity, and flexible deployment models.',
    metric: 'Enterprise Security',
    bullets: [
      'Support for hosted and self-managed deployment patterns',
      'Clear data boundaries and traceable review operations',
      'Reserved visual position for compliance diagrams/videos',
    ],
    tone: 'from-slate-200/70 via-zinc-100/60 to-neutral-100/40',
    visual: 'security',
  },
];

export function PremiumLandingPage({ displayClassName, monoClassName }: PremiumLandingPageProps) {
  const heroRef = useRef<HTMLElement>(null);
  const coreRef = useRef<HTMLElement>(null);
  const [activeStory, setActiveStory] = useState(0);

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroGlowY = useTransform(heroScroll, [0, 1], [0, 180]);
  const heroGlowScale = useTransform(heroScroll, [0, 1], [1, 1.35]);

  const { scrollYProgress: coreProgress } = useScroll({
    target: coreRef,
    offset: ['start start', 'end end'],
  });
  const smoothCore = useSpring(coreProgress, { damping: 24, stiffness: 140 });

  useMotionValueEvent(smoothCore, 'change', (value) => {
    const next = Math.min(stories.length - 1, Math.floor(value * stories.length));
    setActiveStory(next);
  });

  const marquee = useMemo(() => [...trustLogos, ...trustLogos], []);

  return (
    <main
      id="top"
      className={cn(
        'relative min-h-screen overflow-x-clip bg-[#f7f8fb] text-[#0f1117] selection:bg-emerald-200/80',
        displayClassName,
      )}
    >
      <PremiumNavbar monoClassName={monoClassName} />

      <section
        ref={heroRef}
        className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(97,93,255,0.18),transparent_40%),radial-gradient(circle_at_78%_18%,rgba(13,148,136,0.16),transparent_38%),linear-gradient(180deg,#f7f8fb_0%,#eff2f8_56%,#f7f8fb_100%)] px-6 pb-24 pt-36"
      >
        <motion.div
          style={{ y: heroGlowY, scale: heroGlowScale }}
          className="pointer-events-none absolute left-1/2 top-24 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(95,91,255,0.25),rgba(95,91,255,0.06)_40%,transparent_70%)] blur-2xl"
        />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className={cn('mb-6 inline-flex rounded-full border border-black/10 bg-white/80 px-4 py-1.5 text-xs tracking-[0.18em] text-black/60', monoClassName)}>
              AI CODE REVIEW PLATFORM
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.95] tracking-[-0.045em] text-[#111217] md:text-7xl">
              The next generation of <span className="bg-gradient-to-r from-[#07090f] via-[#2a2e41] to-[#4f46e5] bg-clip-text text-transparent">AI code review</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[#272a33]/85">
              Ship higher quality code with context-aware review comments, team-specific standards, and merge-time intelligence.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <SignedOut>
                <Button asChild className="h-12 rounded-xl bg-[#111217] px-6 text-base text-white shadow-[0_20px_45px_rgba(17,18,23,0.28)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#1a1b24]">
                  <Link href="/sign-up">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button asChild className="h-12 rounded-xl bg-[#111217] px-6 text-base text-white shadow-[0_20px_45px_rgba(17,18,23,0.28)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#1a1b24]">
                  <Link href="/dashboard">Open Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </SignedIn>
              <Button asChild variant="outline" className="h-12 rounded-xl border-black/15 bg-white/80 px-6 text-base text-[#151824] backdrop-blur">
                <Link href="#features">See live product flow</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#5850ec]/25 via-[#22d3ee]/15 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_32px_90px_rgba(23,26,39,0.14)] backdrop-blur-xl">
              <CodeGraphVisual className="h-[390px] rounded-[1.45rem] border-black/10" monoClassName={monoClassName} />
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.5, ease: 'easeInOut', repeat: Infinity }}
                className={cn(
                  'pointer-events-none absolute right-8 top-8 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-black/70 shadow-lg',
                  monoClassName,
                )}
              >
                full codebase context
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-white/70 py-7 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6">
          <p className={cn('mb-4 text-center text-xs tracking-[0.26em] text-black/45', monoClassName)}>
            TRUSTED BY DEVELOPERS
          </p>
          <div className="overflow-hidden">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 24, ease: 'linear', repeat: Infinity }}
              className="flex min-w-max items-center gap-10"
            >
              {marquee.map((logo, index) => (
                <span
                  key={`${logo}-${index}`}
                  className={cn('text-base font-medium tracking-tight text-black/45', monoClassName)}
                >
                  {logo}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" ref={coreRef} className="relative bg-[#f6f7fc] px-6 py-24">
        <div className="mx-auto mb-16 max-w-7xl">
          <p className={cn('text-xs tracking-[0.2em] text-emerald-700', monoClassName)}>CORE REVIEW ENGINE</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#0e111b] md:text-6xl">
            Everything you need to ship faster.
          </h2>
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr]">
          <div className="lg:sticky lg:top-28 lg:h-[560px]">
            <div className="relative h-full overflow-hidden rounded-[1.75rem] border border-black/10 bg-gradient-to-b from-[#0b0d16] via-[#111625] to-[#08090d] p-6 text-white shadow-[0_30px_80px_rgba(6,7,11,0.4)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(120,119,255,0.22),transparent_38%),radial-gradient(circle_at_75%_30%,rgba(45,212,191,0.18),transparent_42%)]" />
              <div className="relative">
                <p className={cn('text-xs tracking-[0.2em] text-white/65', monoClassName)}>ACTIVE CAPABILITY</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{stories[activeStory].title}</h3>
                <p className="mt-3 text-sm text-white/75">{stories[activeStory].text}</p>
                <div className="mt-6 space-y-3">
                  {stories.map((story, index) => (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => setActiveStory(index)}
                      className={cn(
                        'group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all',
                        index === activeStory
                          ? 'border-white/35 bg-white/12 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.08] hover:text-white/75',
                      )}
                    >
                      <span>{story.metric}</span>
                      <ChevronRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-0.5', index === activeStory ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {stories.map((story, index) => {
              const shift = Math.max(0, index - activeStory);
              return (
                <motion.article
                  key={story.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.35 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    transform: `translateY(${Math.min(shift * 10, 40)}px) scale(${1 - Math.min(shift, 4) * 0.015})`,
                  }}
                  className={cn(
                    'relative overflow-hidden rounded-[1.9rem] border border-black/10 bg-white p-6 shadow-[0_24px_70px_rgba(12,14,24,0.08)] md:p-8',
                    activeStory === index ? 'ring-1 ring-black/15' : '',
                  )}
                >
                  <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', story.tone)} />
                  <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                    <div>
                      <p className={cn('mb-4 text-xs tracking-[0.2em] text-black/55', monoClassName)}>[ {story.badge} ]</p>
                      <h3 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#11131a]">{story.subtitle}</h3>
                      <p className="mt-3 text-[15px] text-black/70">{story.text}</p>
                      <ul className="mt-5 space-y-2.5 text-sm text-black/68">
                        {story.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <VisualPanel story={story} monoClassName={monoClassName} />
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#0a0b11] px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(147,51,234,0.2),transparent_38%),#0f1118] p-10 text-center shadow-[0_40px_120px_rgba(5,6,10,0.7)]">
          <BrandMark className="mx-auto size-20" glow />
          <h3 className="mt-8 text-4xl font-semibold tracking-[-0.04em] md:text-6xl">Codebase AI</h3>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/74">Secure, context-aware, and built for teams that want faster PR velocity without compromising quality.</p>
          <Button asChild className="mt-8 h-12 rounded-xl bg-white px-7 text-base font-medium text-black hover:bg-white/90">
            <Link href="/sign-up">Start reviewing code smarter</Link>
          </Button>
        </div>
      </section>

      <footer id="docs" className="bg-[#090a10] px-6 py-10 text-white/65">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3 text-white">
            <BrandMark className="size-8" />
            <span>Codebase AI</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#features" className="hover:text-white">Features</Link>
            <Link href="#pricing" className="hover:text-white">Pricing</Link>
            <Link href="/dashboard" className="hover:text-white">Docs</Link>
          </div>
          <div className="flex items-center gap-2 text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> All systems operational</div>
        </div>
      </footer>
    </main>
  );
}

type VisualPanelProps = {
  story: Story;
  monoClassName?: string;
};

function VisualPanel({ story, monoClassName }: VisualPanelProps) {
  if (story.visual === 'graph') {
    return <CodeGraphVisual className="h-[300px] rounded-[1.2rem] border-black/10" compact monoClassName={monoClassName} />;
  }

  return (
    <div className="relative overflow-hidden rounded-[1.2rem] border border-black/10 bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(17,24,39,0.06)_96%),linear-gradient(90deg,transparent_95%,rgba(17,24,39,0.06)_96%)] bg-[length:24px_24px]" />
      <div className="relative space-y-3 text-black/70">
        {story.visual === 'rules' ? (
          <>
            <MiniChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Style Guide" />
            <PlaceholderCard title="Create New Rule" subtitle="Write policy in English" monoClassName={monoClassName} />
            <PlaceholderCard title="Scope by repository and path" subtitle="/apps/dashboard/**" monoClassName={monoClassName} />
          </>
        ) : null}

        {story.visual === 'summary' ? (
          <>
            <MiniChip icon={<GitPullRequest className="h-3.5 w-3.5" />} label="PR #27025 Summary" />
            <PlaceholderCard title="Issue table + confidence" subtitle="auth.tsx · user-service.ts" monoClassName={monoClassName} />
            <PlaceholderCard title="Impact" subtitle="Security + performance" monoClassName={monoClassName} />
          </>
        ) : null}

        {story.visual === 'learning' ? (
          <>
            <MiniChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Learning cycle" />
            <PlaceholderCard title="95% upvote ratio" subtitle="Accepted comments (30d)" monoClassName={monoClassName} />
            <PlaceholderCard title="AI improves from reactions" subtitle="👍 👎 edits merged" monoClassName={monoClassName} />
          </>
        ) : null}

        {story.visual === 'merge' ? (
          <>
            <MiniChip icon={<ArrowRight className="h-3.5 w-3.5" />} label="Merge performance" />
            <PlaceholderCard title="Without AI: 20 hrs" subtitle="With AI: 1.8 hrs" monoClassName={monoClassName} />
            <PlaceholderCard title="Team size vs merge time" subtitle="Trend chart placeholder" monoClassName={monoClassName} />
          </>
        ) : null}

        {story.visual === 'security' ? (
          <>
            <MiniChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Security architecture" />
            <PlaceholderCard title="Security-first design" subtitle="SOC 2 / encrypted at rest" monoClassName={monoClassName} />
            <PlaceholderCard title="Air-gapped deployment" subtitle="Your environment · your controls" monoClassName={monoClassName} />
            <div className="mt-2 rounded-lg border border-black/10 bg-white/80 p-3 text-xs text-black/60">Image/video placeholder reserved.</div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function MiniChip({ icon, label }: { icon: JSX.Element; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/12 bg-white/80 px-3 py-1 text-xs font-medium text-black/60">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function PlaceholderCard({
  title,
  subtitle,
  monoClassName,
}: {
  title: string;
  subtitle: string;
  monoClassName?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-xl border border-black/10 bg-white/85 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
    >
      <p className="text-sm font-medium text-black/80">{title}</p>
      <p className={cn('mt-1 text-xs text-black/50', monoClassName)}>{subtitle}</p>
    </motion.div>
  );
}

export default PremiumLandingPage;
