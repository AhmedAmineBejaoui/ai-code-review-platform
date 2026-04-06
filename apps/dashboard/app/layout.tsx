import type { Metadata, Viewport } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Inter } from "next/font/google"

import { ThemeProvider } from "@/components/dashboard/ThemeProvider"
import { CapacitorProvider } from "@/components/providers/capacitor-provider"
import { getClerkRuntimeConfig } from "@/lib/clerk-runtime"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const clerkRuntimeConfig = getClerkRuntimeConfig()

export const metadata: Metadata = {
  title: "AI Code Review",
  description: "AI-powered code review dashboard",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI Code Review",
  },
  applicationName: "AI Code Review",
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Important for iOS safe areas
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      {...clerkRuntimeConfig}
      signInFallbackRedirectUrl="/auth/role-redirect"
      signUpFallbackRedirectUrl="/auth/role-redirect"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* iOS-specific meta tags for Capacitor */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-capable" content="yes" />
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
