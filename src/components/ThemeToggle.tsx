"use client"

import { useSyncExternalStore } from "react"
import { Sun, Moon } from "lucide-react"
import { TooltipWrap } from "@/components/ui/Tooltip"
import { setTheme, THEME_EVENT } from "@/lib/theme"

function subscribeTheme(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb)
  return () => window.removeEventListener(THEME_EVENT, cb)
}

function getDarkSnapshot() {
  return document.documentElement.classList.contains("dark")
}

export function ThemeToggle() {
  // useSyncExternalStore reads the client-only theme only after hydration
  // (server snapshot is always false), avoiding an SSR/client mismatch.
  const dark = useSyncExternalStore(subscribeTheme, getDarkSnapshot, () => false)

  return (
    <TooltipWrap label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      <button
        onClick={() => setTheme(!dark)}
        className="inline-flex items-center justify-center rounded-xl p-2 text-muted hover:text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </TooltipWrap>
  )
}
