import type { Metadata } from "next"
import { Manrope, Sora } from "next/font/google"

import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
})

export const metadata: Metadata = {
  title: "CodeGuardian Dashboard",
  description: "Ship code with absolute confidence.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sora.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
