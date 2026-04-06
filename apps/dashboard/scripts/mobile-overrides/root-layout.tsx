"use client"

/**
 * Mobile-compatible Root Layout
 * 
 * This version uses client-only Clerk provider to avoid server actions
 */

import { ClerkProvider } from '@clerk/clerk-react'
import { Inter } from "next/font/google"

import { ThemeProvider } from "@/components/dashboard/ThemeProvider"
import { CapacitorProvider } from "@/components/providers/capacitor-provider"
import "./globals.css"

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Missing Clerk Publishable Key')
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider 
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: '#0a0a0a',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
          <meta name="theme-color" content="#0a0a0a" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="AI Code Review" />
          <meta name="application-name" content="AI Code Review" />
          <meta name="format-detection" content="telephone=no" />
          <title>AI Code Review</title>
          <meta name="description" content="AI-powered code review dashboard" />
          <link rel="icon" href="/icon.svg" />
          <link rel="shortcut icon" href="/icon.svg" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        </head>
        <body className={`${inter.variable} antialiased`}>
          <CapacitorProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </CapacitorProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
