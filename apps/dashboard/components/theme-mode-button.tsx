"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

type Theme = "light" | "dark"

const STORAGE_KEY = "dashboard-theme"

function detectInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light"
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "dark" || stored === "light") {
    return stored
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function ThemeModeButton({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const initial = detectInitialTheme()
    setTheme(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    applyTheme(theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme, mounted])

  const nextMode = theme === "dark" ? "Light Mode" : "Dark Mode"
  const isDark = theme === "dark"

  return (
    <motion.button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      aria-label={`Switch to ${nextMode}`}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-medium shadow-[0_8px_22px_-14px_rgba(2,6,23,0.65)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
        isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-700",
        className
      )}
    >
      <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full", isDark ? "bg-slate-800" : "bg-slate-100")}>
        <AnimatePresence mode="wait" initial={false}>
          {mounted && (
            <motion.span
              key={nextMode}
              initial={{ rotate: -35, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 35, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <motion.span
        key={nextMode}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {mounted ? nextMode : "Light Mode"}
      </motion.span>
    </motion.button>
  )
}
