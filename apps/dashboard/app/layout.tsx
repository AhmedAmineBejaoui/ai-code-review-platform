"use client"

/**
 * Mobile-compatible Root Layout
 * 
 * This version uses client-only Clerk provider to avoid server actions
 * Includes Graphite-themed Clerk appearance
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

// Graphite-themed Clerk appearance configuration
const clerkAppearance = {
  variables: {
    colorPrimary: '#E8713A',
    colorBackground: '#0C0C0D',
    colorInputBackground: '#141416',
    colorInputText: '#F5F5F5',
    colorText: '#F5F5F5',
    colorTextSecondary: '#A0A0A8',
    colorDanger: '#EF4444',
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorNeutral: '#6B6B75',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '0.875rem',
  },
  elements: {
    // Root and card styling
    rootBox: 'font-sans',
    card: 'bg-transparent shadow-none',
    
    // Header
    headerTitle: 'text-[#F5F5F5] text-xl font-semibold',
    headerSubtitle: 'text-[#A0A0A8] text-sm',
    
    // Social buttons
    socialButtonsBlockButton: 'bg-[#222226] hover:bg-[#2A2A2E] text-[#F5F5F5] border border-[#2A2A2E] rounded-md h-11 font-medium transition-all',
    socialButtonsBlockButtonText: 'text-[#F5F5F5] font-medium',
    socialButtonsProviderIcon: 'w-5 h-5',
    
    // Divider
    dividerLine: 'bg-[#2A2A2E]',
    dividerText: 'text-[#6B6B75] text-sm bg-[#0C0C0D]',
    
    // Form fields
    formFieldLabel: 'text-[#A0A0A8] text-sm font-medium mb-1.5',
    formFieldInput: 'bg-[#141416] border-[#2A2A2E] text-[#F5F5F5] rounded-md h-11 focus:border-[#E8713A] focus:ring-1 focus:ring-[#E8713A] placeholder:text-[#4A4A54] transition-colors',
    formFieldInputShowPasswordButton: 'text-[#6B6B75] hover:text-[#A0A0A8]',
    formFieldAction: 'text-[#E8713A] hover:text-[#F09456] text-sm font-medium',
    formFieldHintText: 'text-[#6B6B75] text-xs',
    formFieldErrorText: 'text-red-400 text-xs',
    formFieldSuccessText: 'text-green-400 text-xs',
    
    // Primary button
    formButtonPrimary: 'bg-[#E8713A] hover:bg-[#D4612A] text-white rounded-md h-11 font-medium transition-all shadow-none',
    formButtonReset: 'text-[#E8713A] hover:text-[#F09456]',
    
    // Footer
    footerActionLink: 'text-[#E8713A] hover:text-[#F09456] font-medium',
    footerActionText: 'text-[#6B6B75]',
    footer: 'bg-transparent',
    
    // Identity preview
    identityPreview: 'bg-[#141416] border-[#2A2A2E]',
    identityPreviewText: 'text-[#F5F5F5]',
    identityPreviewEditButton: 'text-[#E8713A] hover:text-[#F09456]',
    
    // OTP
    otpCodeFieldInput: 'bg-[#141416] border-[#2A2A2E] text-[#F5F5F5] rounded-md focus:border-[#E8713A]',
    
    // Alerts
    alert: 'bg-[#1A1A1E] border-[#2A2A2E] rounded-lg',
    alertText: 'text-[#A0A0A8]',
    
    // User button
    userButtonPopoverCard: 'bg-[#141416] border border-[#2A2A2E]',
    userButtonPopoverActionButton: 'text-[#F5F5F5] hover:bg-[#222226]',
    userButtonPopoverActionButtonText: 'text-[#F5F5F5]',
    userButtonPopoverActionButtonIcon: 'text-[#A0A0A8]',
    userButtonPopoverFooter: 'border-t border-[#2A2A2E]',
    
    // User profile
    userPreview: 'text-[#F5F5F5]',
    userPreviewSecondaryIdentifier: 'text-[#A0A0A8]',
    
    // Badge
    badge: 'bg-[#E8713A] text-white',
    
    // Modal backdrop
    modalBackdrop: 'bg-black/60 backdrop-blur-sm',
    modalContent: 'bg-[#141416] border border-[#2A2A2E]',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider 
      publishableKey={publishableKey}
      appearance={clerkAppearance}
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
