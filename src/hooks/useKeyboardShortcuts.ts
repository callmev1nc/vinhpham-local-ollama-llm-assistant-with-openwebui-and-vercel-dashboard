"use client"

import { useEffect } from "react"

interface ShortcutMap {
  onPalette?: () => void
  onNewChat?: () => void
  onFocusInput?: () => void
  onClose?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === "k") {
        e.preventDefault()
        handlers.onPalette?.()
        return
      }

      if (mod && e.key === "/") {
        e.preventDefault()
        handlers.onNewChat?.()
        return
      }

      if (mod && e.shiftKey && e.key === "O") {
        e.preventDefault()
        handlers.onFocusInput?.()
        return
      }

      if (e.key === "Escape") {
        handlers.onClose?.()
        return
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handlers])
}
