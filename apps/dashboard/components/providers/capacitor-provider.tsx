'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { initializeCapacitor, isNativePlatform, getPlatform } from '@/lib/capacitor'

interface CapacitorContextValue {
  isNative: boolean
  platform: string
  isReady: boolean
}

const CapacitorContext = createContext<CapacitorContextValue>({
  isNative: false,
  platform: 'web',
  isReady: false,
})

export const useCapacitorContext = () => useContext(CapacitorContext)

interface CapacitorProviderProps {
  children: ReactNode
}

/**
 * Provider component that initializes Capacitor and provides context
 * Wrap your app with this provider in the root layout
 */
export function CapacitorProvider({ children }: CapacitorProviderProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        await initializeCapacitor()
      } catch (error) {
        console.error('Failed to initialize Capacitor:', error)
      } finally {
        setIsReady(true)
      }
    }

    init()
  }, [])

  const value: CapacitorContextValue = {
    isNative: isNativePlatform(),
    platform: getPlatform(),
    isReady,
  }

  return (
    <CapacitorContext.Provider value={value}>
      {children}
    </CapacitorContext.Provider>
  )
}
