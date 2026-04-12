'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Sparkles } from 'lucide-react';
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
          'mx-auto max-w-7xl rounded-[16px] border px-4 py-3 transition-all duration-500 md:px-6',
          isScrolled
            ? 'border-white/15 bg-[#05060c]/90 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl'
            : 'border-white/10 bg-[#05060c]/75 shadow-[0_18px_60px_rgba(0,0,0,0.3)] backdrop-blur-md',
        )}
      >
        <div className="flex items-center justify-between gap-6">
          <Link href="#top" className="flex items-center gap-3 text-white">
            <BrandMark className="size-9" tone="dark" />
            <div>
              <p className="text-[1.6rem] font-semibold leading-none tracking-[-0.03em]">CodeRabbit</p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {['Plan', 'Enterprise', 'Customers', 'Pricing', 'Blog', 'Resources'].map((item) => (
              <Link
                key={item}
                href="#"
                className={cn(
                  'text-sm text-white/80 transition-colors hover:text-white',
                  monoClassName,
                )}
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <SignedOut>
              <Button
                asChild
                variant="ghost"
                className={cn('rounded-none px-3 text-white/85 hover:bg-white/[0.06] hover:text-white', monoClassName)}
              >
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button
                asChild
                className={cn(
                  'h-10 rounded-none border border-[#ff6a00] bg-transparent px-5 text-[#ff6a00] shadow-none hover:bg-[#ff6a00]/10',
                  monoClassName,
                )}
              >
                <Link href="/sign-up">
                  Get a free trial
                </Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button
                asChild
                className={cn(
                  'h-10 rounded-none border border-[#ff6a00] bg-transparent px-5 text-[#ff6a00] shadow-none hover:bg-[#ff6a00]/10',
                  monoClassName,
                )}
              >
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="inline-flex rounded-full border border-white/20 bg-[#101320] px-3 py-2 text-white shadow-sm transition hover:bg-[#171b2c] lg:hidden"
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
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80"
                  >
                    {item.label}
                    <Sparkles className="h-4 w-4 text-white/45" />
                  </Link>
                ))}
                <SignedOut>
                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <Button asChild variant="ghost" className="rounded-full border border-white/20 text-white/80">
                      <Link href="/sign-in">Log in</Link>
                    </Button>
                    <Button asChild className="rounded-full border border-[#ff6a00] bg-transparent text-[#ff6a00] hover:bg-[#ff6a00]/10">
                      <Link href="/sign-up">Get Started</Link>
                    </Button>
                  </div>
                </SignedOut>
                <SignedIn>
                  <Button asChild className="w-full rounded-full border border-[#ff6a00] bg-transparent text-[#ff6a00] hover:bg-[#ff6a00]/10">
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
