import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Inter } from "next/font/google"
import Script from "next/script"

import { ThemeModeButton } from "@/components/theme-mode-button"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "TrustReview — Explainable AI Code Review",
  description: "Ship code with absolute confidence. The enterprise-grade AI code review assistant that detects bugs, security flaws, and performance issues before you merge.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} theme-transition antialiased`}>
          <Script id="theme-init" strategy="beforeInteractive">
            {`
              try {
                var key = 'dashboard-theme';
                var saved = localStorage.getItem(key);
                var theme = saved === 'dark' || saved === 'light'
                  ? saved
                  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `}
          </Script>
          {children}
          <div className="fixed bottom-5 right-5 z-50 flex items-center justify-center">
             <ThemeModeButton />
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}
