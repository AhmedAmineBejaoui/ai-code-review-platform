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

const customerLogos = ['adyen', 'SalesRabbit', 'Memberstack', 'indeed', 'eToro', 'TaskRabbit', 'Life360', 'GROUPON'];

const testimonialCards = [
  {
    quote:
      'Since adopting CodeRabbit, our confidence is up and our bugs are down; it catches the edge cases humans skip past and helps us merge faster with more confidence.',
    author: 'Brandon Romane',
    role: 'Sr. Staff Software Engineer, Clerk',
  },
  {
    quote:
      'CodeRabbit routinely catches off-by-ones, edge cases, and even spec/security slips before they hit production.',
    author: 'Kyrylo Buha',
    role: 'Member of Technical Staff, Writer',
  },
  {
    quote:
      'Writing code faster was never the issue; the bottleneck was always code review. I feel like CodeRabbit is solving that one problem and that was attractive.',
    author: 'Kiran Kanagasekaran',
    role: 'Sr. Engineering Manager, TaskRabbit',
  },
  {
    quote:
      'The feedback I get from devs is that they like that it shows them typo errors, null pointers, and static code. It catches edge scenarios.',
    author: 'Seref Boyar',
    role: 'Chief Architect, Vima',
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

      <section className="relative px-6 pb-24 pt-36">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(73,82,127,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(73,82,127,0.14)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="mx-auto max-w-6xl">
          <h1 className="text-center text-6xl font-semibold tracking-[-0.04em] md:text-7xl">The leader in AI code reviews</h1>

          <div className="mt-10 border border-white/10 bg-[#050711]/60 px-3 py-2 md:px-5 md:py-4">
            <CodeGraphVisual monoClassName={monoClassName} />
          </div>

          <div className="mt-12 border border-white/15 bg-[#070912]/75 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex min-h-[220px] flex-col items-center justify-center border border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-2xl">Most installed AI App</p>
                <p className={cn('mt-6 text-4xl text-white/80', monoClassName)}>GitHub  GitLab</p>
              </div>
              <div className="flex min-h-[220px] flex-col items-center justify-center border border-white/10 bg-[#04060f]">
                <p className="text-8xl">3M</p>
                <p className="text-4xl text-[#ff6a00]">Repositories</p>
              </div>
              <div className="flex min-h-[220px] flex-col items-center justify-center border border-white/10 bg-[#04060f]">
                <p className="text-8xl">75M</p>
                <p className="text-4xl text-[#ff6a00]">Defects found</p>
              </div>
            </div>
            <p className={cn('mt-8 text-center text-3xl text-[#17f0c4] underline', monoClassName)}>Why teams prefer CodeRabbit</p>
          </div>

          <p className={cn('mt-16 text-center text-6xl', monoClassName)}>Trusted by <span className="text-[#17f0c4]">15,000+</span> customers</p>
          <div className="mt-10 grid grid-cols-2 gap-10 md:grid-cols-4">
            {customerLogos.map((logo) => (
              <div key={logo} className="text-center text-6xl font-semibold text-white/90">
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl border border-white/15 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white/[0.03] p-8">
              <p className="text-6xl leading-tight">“We&apos;re using CodeRabbit all over NVIDIA”</p>
              <p className={cn('mt-4 text-3xl text-white/70', monoClassName)}>Jensen Huang</p>
              <p className={cn('text-2xl text-white/70', monoClassName)}>Founder & CEO, NVIDIA</p>
            </div>
            <div className="relative min-h-[260px] border border-[#7bff00]/30 bg-[linear-gradient(135deg,#122336,#081220)]">
              <div className="absolute left-0 top-0 h-full w-3 bg-[#7bff00]" />
              <div className="flex h-full items-center justify-center text-2xl text-white/70">VIDEO PREVIEW</div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.45fr]">
          <div className="border border-white/20 p-12 text-center">
            <h2 className="text-7xl font-semibold leading-[1.05] tracking-[-0.04em]">Code reviews were hard before. Now, they feel <span className="text-[#ff6a00]">impossible.</span></h2>
            <p className={cn('mx-auto mt-7 max-w-xl text-4xl text-white/75', monoClassName)}>
              Your team moves fast with AI. But fast shouldn’t mean sloppy. We make sure every line still earns its merge.
            </p>
          </div>
          <div className="border border-white/20 p-8">
            {[
              'Have you looked at my PR?',
              "Which? You've sent… 14 today.",
              'This new coding agent and I are vibing. 😎',
            ].map((message) => (
              <div key={message} className={cn('mb-4 rounded-xl border border-[#ff6a00] bg-[#120f16] p-5 text-3xl text-white/90', monoClassName)}>
                {message}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-px border border-white/20 bg-white/20 md:grid-cols-3">
          {[
            ['//1-click & AI fixes', 'Catch fast. Fix fast.', '1-click commits for easy fixes and a “Fix with AI” button for harder ones.'],
            ['//Summaries & visual diagrams', 'TL;DR for your diff.', 'Quick context with a summary of changes, a walkthrough & an architectural diagram.'],
            ['//Agentic reviews', 'Find the bugs. Skip the noise.', 'We find bugs humans miss — and flag the time consuming and tedious.'],
            ['//Chat', 'Chat with the CodeRabbit bot directly.', 'Give feedback on reviews to create learnings, trigger docstrings & more.'],
            ['//Your code, your way', 'Most customizable tool.', 'Customize everything from your coding guidelines to your workflow in a yaml file.'],
            ['//Automated reports', 'The reports you need.', 'Automate daily standup reports, sprint reviews, and more.'],
          ].map(([tag, title, text]) => (
            <article key={title} className="min-h-[280px] bg-[#0d0f1a] p-8">
              <p className={cn('text-3xl text-[#ff6a00]', monoClassName)}>{tag}</p>
              <h3 className="mt-6 text-5xl font-semibold tracking-[-0.03em]">{title}</h3>
              <p className={cn('mt-4 text-3xl text-white/70', monoClassName)}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className={cn('inline-block bg-[#ff6a00]/15 px-2 py-1 text-3xl text-[#ff6a00]', monoClassName)}>CR_Quality</p>
          <h2 className="mt-6 text-7xl font-semibold tracking-[-0.04em]">Industry-leading context.</h2>
          <p className={cn('mt-4 max-w-5xl text-5xl text-white/75', monoClassName)}>
            Codebase-awareness is table stakes. We pull in dozens more points of context than other tools.
          </p>
          <div className="mt-8 flex justify-end">
            <Link href="#" className={cn('inline-flex items-center gap-2 text-3xl text-[#17f0c4]', monoClassName)}>
              See a sample review <ArrowRight className="h-6 w-6" />
            </Link>
          </div>

          <div className="mt-10 grid gap-px border border-white/20 bg-white/20 md:grid-cols-3">
            {[
              ['1. Codebase intelligence', 'Codegraph and custom guidelines help us understand complex dependencies across files.'],
              ['2. External context', 'We bring context via MCP servers, linked issues and web query.'],
              ['3. Linters & Scanners', '40+ linters and security scanners catch more bugs while filtering false positives.'],
            ].map(([title, text]) => (
              <article key={title} className="bg-[#0d0f1a] p-8">
                <h3 className="text-5xl font-semibold tracking-[-0.03em]">{title}</h3>
                <p className={cn('mt-4 text-3xl text-white/70', monoClassName)}>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className={cn('inline-block bg-[#ff6a00]/15 px-2 py-1 text-3xl text-[#ff6a00]', monoClassName)}>CR_Intelligence</p>
          <h2 className="mt-6 text-7xl font-semibold tracking-[-0.04em]">Code reviews that learn from you.</h2>
          <p className={cn('mt-4 max-w-5xl text-5xl text-white/75', monoClassName)}>
            Set the baseline with your rules and style guides, then train the agent with feedback via replies.
          </p>

          <div className="mt-10 grid gap-px border border-white/20 bg-white/20 lg:grid-cols-[370px_1fr]">
            <div className="bg-[#0d0f1a]">
              {['CodeRabbit learnings', 'Path & AST-based instructions', 'Coding agent guidelines'].map((item, idx) => (
                <div key={item} className={cn('border-b border-white/20 p-6 text-4xl', idx === 1 ? 'border-l-4 border-l-[#ff6a00]' : '')}>{item}</div>
              ))}
            </div>
            <div className="bg-[#070c16] p-8">
              <pre className={cn('h-[320px] overflow-hidden border border-white/10 bg-[#081321] p-6 text-2xl text-[#6deec7]', monoClassName)}>
{`# .coderabbit.yaml
language: en
profile: chill
instructions: >
  Ensure the code follows best practices...`}
              </pre>
            </div>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className={cn('inline-block bg-[#ff6a00]/15 px-2 py-1 text-3xl text-[#ff6a00]', monoClassName)}>CR_Finish</p>
              <h2 className="mt-6 text-7xl font-semibold tracking-[-0.04em]">Ship faster with pre-merge checks & finishing touches.</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-40 w-40 border border-white/20 bg-[linear-gradient(180deg,#1f1c2f,#0d0f1a)] p-4 text-5xl text-[#ff6a00]">_guardrail</div>
              <div>
                <h3 className="text-6xl font-semibold">Custom checks</h3>
                <p className={cn('mt-2 text-3xl text-white/70', monoClassName)}>Create your own pre-merge code quality checks in natural language.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className={cn('inline-block bg-[#ff6a00]/15 px-2 py-1 text-3xl text-[#ff6a00]', monoClassName)}>CR_Security</p>
          <h2 className="mt-6 text-7xl font-semibold tracking-[-0.04em]">We take security seriously.</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              ['Architected for security', 'We protect your code and privacy with an architecture designed to ensure your code is private.'],
              ['SSL encrypted data', 'End-to-end encryption protects your code during reviews with zero data retention post-review.'],
              ['SOC 2 Type II certified', 'Enterprise-grade security validated annually through independent SOC2 Type II audits.'],
            ].map(([title, text]) => (
              <div key={title}>
                <div className="h-36 border border-white/10 bg-white/[0.03]" />
                <h3 className="mt-4 text-5xl font-semibold tracking-[-0.03em]">{title}</h3>
                <p className={cn('mt-2 text-3xl text-white/70', monoClassName)}>{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 border border-white/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className={cn('flex min-h-[300px] items-end text-[5rem] leading-[0.95] text-white', monoClassName)}>
                Get started in <span className="text-[#ff6a00]">2 clicks.</span>
              </div>
              <div className="min-h-[300px] bg-[radial-gradient(circle,#232638,#0d0f1a_60%)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-16">
        <div className="mx-auto max-w-7xl">
          <p className={cn('text-5xl text-[#17f0c4]', monoClassName)}>Why teams prefer CodeRabbit</p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {testimonialCards.map((card) => (
              <article key={card.author} className="border border-white/20 bg-[#100f18] p-6">
                <p className={cn('text-3xl text-white/85', monoClassName)}>{card.quote}</p>
                <p className="mt-8 text-2xl font-semibold">{card.author}</p>
                <p className={cn('text-xl text-white/60', monoClassName)}>{card.role}</p>
              </article>
            ))}
          </div>

          <footer className="mt-16 border-t border-white/10 pt-10">
            <div className="grid gap-8 md:grid-cols-5">
              <div>
                <p className="text-5xl font-semibold">CodeRabbit</p>
              </div>
              {[
                ['Products', 'Pull Request Review', 'Plan', 'IDE Reviews', 'CLI Reviews'],
                ['Navigation', 'About Us', 'Features', 'FAQ', 'System Status'],
                ['Resources', 'Blog', 'Docs', 'Changelog', 'Case Studies'],
                ['Contact', 'Support', 'Sales', 'Pricing', 'Partnerships'],
              ].map(([title, ...links]) => (
                <div key={title}>
                  <p className="text-2xl font-semibold text-[#ff6a00]">{title}</p>
                  <ul className={cn('mt-3 space-y-2 text-xl text-white/70', monoClassName)}>
                    {links.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-16 text-[14rem] font-semibold leading-none text-[#ff6a00]/20">CodeRabbit</div>
          </footer>
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
