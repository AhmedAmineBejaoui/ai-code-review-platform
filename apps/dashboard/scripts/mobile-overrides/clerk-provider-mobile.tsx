"use client"

/**
 * Mobile-compatible Clerk Provider
 * 
 * Uses Clerk's React SDK directly to avoid Next.js server-side features
 */

import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Missing Clerk Publishable Key')
}

export function ClerkProviderMobile({ children }: { children: ReactNode }) {
  return (
    <BaseClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: '#0a0a0a',
        },
      }}
    >
      {children}
    </BaseClerkProvider>
  )
}
