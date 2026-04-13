import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { IBM_Plex_Mono, Sora } from "next/font/google"

import { ThemeProvider } from "@/components/dashboard/ThemeProvider"
import { Toaster } from "@/components/ui/sonner"
import { getClerkRuntimeConfig } from "@/lib/clerk-runtime"
import "./globals.css"

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
})

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
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
        <body className={`${sora.variable} ${mono.variable} bg-background text-foreground antialiased`}>
          <ThemeProvider>
            {children}
            <Toaster richColors closeButton />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
