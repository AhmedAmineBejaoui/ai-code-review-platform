'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

import { CodeGraphVisual } from './code-graph-visual';
import { PremiumNavbar } from './premium-navbar';

type PremiumLandingPageProps = {
  displayClassName?: string;
  monoClassName?: string;
};

const featureCards = [
  {
    tag: '[IN-LINE COMMENTS]',
    title: 'Get context-aware comments on your PRs',
    text: 'In-line comments to identify bugs, antipatterns, security issues, and more.',
  },
  {
    tag: '[CUSTOM CONTEXT]',
    title: 'Describe your coding standards in English',
    text: "Tell Greptile about your team's best practices, Greptile will enforce them across PRs.",
  },
  {
    tag: '[PR SUMMARIES]',
    title: 'Quickly understand PRs with AI-generated summaries',
    text: 'Get mermaid diagrams, file-by-file breakdowns, and confidence scores for every PR.',
  },
  {
    tag: '[LEARNING]',
    title: 'Greptile learns by reading your comments',
    text: "Greptile infers your team's coding standards by reading every engineer's comments on PRs.",
  },
];

const testimonials = [
  {
    quote:
      '“We\'ve tried more code review tools than I can count. Greptile outperforms them all by a mile.”',
    name: 'James',
    role: 'CTO • Brex',
  },
  {
    quote:
      '“We\'ve been impressed by Greptile\'s code review quality. It tightened feedback loops and consistency.”',
    name: 'Mark',
    role: 'Eng. Manager • WorkOS',
  },
  {
    quote: '“Greptile helps the team do their best work and levels everybody up.”',
    name: 'Anirudh',
    role: 'Tech Lead • Browserbase',
  },
  {
    quote: '“One of the most impressive AI code review tools I\'ve used.”',
    name: 'Martin',
    role: 'CTO • PurpleFish',
  },
  {
    quote: '“I\'m thankful for the things Greptile catches in my pull requests.”',
    name: 'Hahnbee',
    role: 'CTO • Mintlify',
  },
  {
    quote:
      '“It catches issues that human reviewers miss and gives senior-level suggestions.”',
    name: 'Chase',
    role: 'CTO • RollCredits',
  },
  {
    quote: '“Team is responsive and reviews are very good. Highly recommended.”',
    name: 'Chris',
    role: 'CTO • Risotto',
  },
  {
    quote: '“Setup took 15 min and it became a game-changer for our release cycle.”',
    name: 'Harish',
    role: 'CTO • Flaire',
  },
];

export function PremiumLandingPage({ displayClassName, monoClassName }: PremiumLandingPageProps) {
  return (
    <main
      id="top"
      className={cn(
        'relative min-h-screen overflow-x-hidden bg-[#02030a] text-white selection:bg-[#17f0c4]/30',
        displayClassName,
      )}
    >
      <PremiumNavbar monoClassName={monoClassName} />

      <section className="relative px-6 pb-20 pt-36">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(73,82,127,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(73,82,127,0.14)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative mx-auto max-w-6xl text-center">
          <p className={cn('text-lg text-[#17f0c4]', monoClassName)}>[ SHIP FASTER ]</p>
          <h1 className="mt-4 text-6xl font-semibold tracking-[-0.04em] md:text-7xl">Your second pair of eyes.</h1>
          <p className={cn('mx-auto mt-6 max-w-4xl text-2xl text-white/75 md:text-3xl', monoClassName)}>
            Greptile automatically reviews PRs in GitHub and GitLab with full context of your codebase.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild className="h-12 rounded-none border border-[#17f0c4] bg-[#17f0c4]/10 px-6 text-[#17f0c4] hover:bg-[#17f0c4]/20">
              <Link href="#">See Greptile in action</Link>
            </Button>
          </div>

          <div className="mt-12 border border-white/10 bg-[#050711]/60 px-3 py-2 md:px-5 md:py-4">
            <CodeGraphVisual monoClassName={monoClassName} />
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-px border border-white/20 bg-white/20 md:grid-cols-2">
          {featureCards.map((card) => (
            <article key={card.title} className="bg-[#0d0f1a] p-8">
              <p className={cn('text-xl text-[#ff6a00]', monoClassName)}>{card.tag}</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">{card.title}</h2>
              <p className={cn('mt-4 text-xl text-white/70 md:text-2xl', monoClassName)}>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl border border-white/20 p-8">
          <p className={cn('text-lg text-[#17f0c4]', monoClassName)}>[ 30+ languages supported ]</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.04em] md:text-6xl">Full Codebase Context</h2>
          <p className={cn('mt-4 max-w-5xl text-xl text-white/75 md:text-2xl', monoClassName)}>
            Greptile generates a detailed graph of your codebase and understands how everything fits together.
            Better understanding of your codebase = more bugs caught.
          </p>
          <div className="mt-8">
            <Link href="#" className={cn('inline-flex items-center gap-2 text-xl text-[#17f0c4]', monoClassName)}>
              Learn more <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl border border-white/20 p-8">
          <p className={cn('text-lg text-[#ff6a00]', monoClassName)}>[ CUSTOM CONTEXT ]</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.04em] md:text-6xl">Your house, your rules.</h2>
          <p className={cn('mt-4 text-xl text-white/75 md:text-2xl', monoClassName)}>
            Greptile is better when personalized to your team.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              'Write a rule in English or point Greptile to a markdown file with your team\'s best practices.',
              'Apply rules and context to specific repositories, file paths, or code patterns.',
              'Analyze whether rules are being used by Greptile and actioned by the team.',
            ].map((item) => (
              <div key={item} className="border border-white/15 bg-[#0d0f1a] p-6">
                <p className={cn('text-lg text-white/80', monoClassName)}>{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="#" className={cn('inline-flex items-center gap-2 text-xl text-[#17f0c4]', monoClassName)}>
              Explore Custom Context <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl border border-white/20 p-8">
          <p className={cn('text-lg text-[#ff6a00]', monoClassName)}>[ LEARNING ]</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.04em] md:text-6xl">Introducing Learning.</h2>
          <p className={cn('mt-4 text-xl text-white/75 md:text-2xl', monoClassName)}>
            Greptile learns your team&apos;s coding standards by reading every engineer&apos;s PR comments, and learns what
            types of comments your team finds useful by tracking 👍/👎 reactions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {['Prefer named exports.', 'Never push directly to main.', 'Remove all console.log and debugger statements.'].map((rule) => (
              <span key={rule} className={cn('border border-white/20 bg-[#0d0f1a] px-4 py-2 text-lg text-white/80', monoClassName)}>
                {rule}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl border border-white/20 p-8">
          <p className={cn('text-lg text-[#ff6a00]', monoClassName)}>[ DATA-DRIVEN RESULTS ]</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.04em] md:text-6xl">Merge PRs faster with Greptile.</h2>
          <Link href="#" className={cn('mt-5 inline-flex items-center gap-2 text-xl text-[#17f0c4]', monoClassName)}>
            View performance data <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="border border-white/15 bg-[#0d0f1a] p-6">
              <p className={cn('text-xl text-white/70', monoClassName)}>Median Time to Merge Comparison</p>
              <p className="mt-4 text-4xl font-semibold">Without Greptile: 20 hrs</p>
              <p className="mt-2 text-4xl font-semibold text-[#17f0c4]">With Greptile: 1.8 hrs</p>
            </div>
            <div className="border border-white/15 bg-[#0d0f1a] p-6">
              <p className={cn('text-xl text-white/70', monoClassName)}>Team Size vs Merge Time</p>
              <p className="mt-4 text-3xl">Without Greptile</p>
              <p className="mt-2 text-3xl text-[#17f0c4]">With Greptile</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl border border-white/20 p-8">
          <p className={cn('text-lg text-[#ff6a00]', monoClassName)}>[ SECURITY ]</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.04em] md:text-6xl">Security-First Design</h2>
          <Link href="#" className={cn('mt-5 inline-flex items-center gap-2 text-xl text-[#17f0c4]', monoClassName)}>
            View our security policy <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="border border-white/15 bg-[#0d0f1a] p-6">
              <h3 className="text-3xl font-semibold">Self-Hosted Deployment</h3>
              <p className={cn('mt-3 text-xl text-white/75', monoClassName)}>
                Deploy in your own air-gapped environment with complete control over your infrastructure.
              </p>
            </article>
            <article className="border border-white/15 bg-[#0d0f1a] p-6">
              <h3 className="text-3xl font-semibold">SOC 2 Compliant</h3>
              <p className={cn('mt-3 text-xl text-white/75', monoClassName)}>
                All data is encrypted at rest and in transit. We use industry-standard encryption and security
                practices.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-16">
        <div className="mx-auto max-w-7xl">
          <p className={cn('text-lg text-[#ff6a00]', monoClassName)}>[ TESTIMONIALS ]</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.04em] md:text-6xl">From Developers That Use Greptile</h2>
          <p className={cn('mt-3 text-xl text-white/75 md:text-2xl', monoClassName)}>
            See what developers are saying about their experience with Greptile.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((card) => (
              <article key={`${card.name}-${card.role}`} className="border border-white/20 bg-[#100f18] p-6">
                <p className={cn('text-lg text-white/85', monoClassName)}>{card.quote}</p>
                <p className="mt-8 text-xl font-semibold">{card.name}</p>
                <p className={cn('text-base text-white/60', monoClassName)}>{card.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SignedOut>
        <div className="fixed bottom-6 right-6 z-50">
          <Button asChild className="h-12 rounded-none border border-[#ff6a00] bg-[#ff6a00]/10 px-5 text-[#ff6a00] hover:bg-[#ff6a00]/20">
            <Link href="/sign-up">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="fixed bottom-6 right-6 z-50">
          <Button asChild className="h-12 rounded-none border border-[#ff6a00] bg-[#ff6a00]/10 px-5 text-[#ff6a00] hover:bg-[#ff6a00]/20">
            <Link href="/dashboard">
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SignedIn>
    </main>
  );
}
