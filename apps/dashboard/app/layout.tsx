import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
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
      appearance={{
        baseTheme: dark,
        layout: {
          logoPlacement: "none",
          showOptionalFields: false,
          socialButtonsPlacement: "bottom",
        },
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#0a0a0b",
          colorInputBackground: "#18181b",
          colorInputText: "#fafafa",
          colorText: "#fafafa",
          colorTextSecondary: "#a1a1aa",
          borderRadius: "0.5rem",
        },
        elements: {
          // Hide Clerk branding
          footer: { display: "none" },
          footerAction: { display: "none" },
          footerActionLink: { display: "none" },
          footerPages: { display: "none" },
          // Card styling
          card: {
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          },
          // Form styling
          formButtonPrimary: {
            backgroundColor: "#6366f1",
            "&:hover": { backgroundColor: "#4f46e5" },
          },
          formFieldInput: {
            backgroundColor: "#27272a",
            borderColor: "#3f3f46",
            "&:focus": { borderColor: "#6366f1" },
          },
          // Header styling
          headerTitle: { color: "#fafafa" },
          headerSubtitle: { color: "#a1a1aa" },
          // Social buttons
          socialButtonsBlockButton: {
            backgroundColor: "#27272a",
            borderColor: "#3f3f46",
            "&:hover": { backgroundColor: "#3f3f46" },
          },
          // Divider
          dividerLine: { backgroundColor: "#3f3f46" },
          dividerText: { color: "#71717a" },
          // User button
          userButtonPopoverCard: {
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
          },
          userButtonPopoverActionButton: {
            "&:hover": { backgroundColor: "#27272a" },
          },
        },
      }}
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
