import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Inter } from "next/font/google"

import { ThemeProvider } from "@/components/dashboard/ThemeProvider"
import { getClerkRuntimeConfig } from "@/lib/clerk-runtime"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const clerkRuntimeConfig = getClerkRuntimeConfig()

export const metadata: Metadata = {
  title: "Developer Dashboard Features",
  description: "AI code review dashboard",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
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
        <body className={`${inter.variable} antialiased`}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
