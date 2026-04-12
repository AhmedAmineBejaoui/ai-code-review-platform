'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Menu, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

import { BrandMark } from './brand-mark';
import { navLinks } from './data';

type PremiumNavbarProps = {
  monoClassName?: string;
};

export function PremiumNavbar({ monoClassName }: PremiumNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4"
    >
      <nav
        className={cn(
          'mx-auto max-w-7xl rounded-[24px] border px-4 py-3 transition-all duration-500 md:px-6',
          isScrolled
            ? 'border-black/8 bg-white/82 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl'
            : 'border-black/6 bg-white/55 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-md',
        )}
      >
        <div className="flex items-center justify-between gap-6">
          <Link href="#top" className="flex items-center gap-3 text-[#121212]">
            <BrandMark className="size-10" tone="light" />
            <div>
              <p className="text-[0.98rem] font-semibold tracking-[-0.03em]">Codebase AI</p>
              <p className={cn('text-[0.68rem] uppercase text-black/45', monoClassName)}>
                review intelligence
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-black/62 transition-colors hover:text-black"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <SignedOut>
              <Button
                asChild
                variant="ghost"
                className="rounded-full px-5 text-black/68 hover:bg-black/[0.04] hover:text-black"
              >
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full border-0 bg-[#111111] px-5 text-white shadow-[0_18px_40px_rgba(17,17,17,0.16)] hover:bg-[#1d1d22]"
              >
                <Link href="/sign-up">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button
                asChild
                className="rounded-full border-0 bg-[#111111] px-5 text-white shadow-[0_18px_40px_rgba(17,17,17,0.16)] hover:bg-[#1d1d22]"
              >
                <Link href="/dashboard">
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="inline-flex rounded-full border border-black/10 bg-white px-3 py-2 text-black shadow-sm transition hover:bg-black/[0.03] lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden lg:hidden"
            >
              <div className="mt-4 space-y-3 border-t border-black/6 pt-4">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-black/6 bg-white/80 px-4 py-3 text-sm font-medium text-black/70"
                  >
                    {item.label}
                    <Sparkles className="h-4 w-4 text-black/35" />
                  </Link>
                ))}
                <SignedOut>
                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <Button asChild variant="ghost" className="rounded-full border border-black/10 text-black/70">
                      <Link href="/sign-in">Log in</Link>
                    </Button>
                    <Button asChild className="rounded-full border-0 bg-[#111111] text-white hover:bg-[#1d1d22]">
                      <Link href="/sign-up">Get Started</Link>
                    </Button>
                  </div>
                </SignedOut>
                <SignedIn>
                  <Button asChild className="w-full rounded-full border-0 bg-[#111111] text-white hover:bg-[#1d1d22]">
                    <Link href="/dashboard">Open dashboard</Link>
                  </Button>
                </SignedIn>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
