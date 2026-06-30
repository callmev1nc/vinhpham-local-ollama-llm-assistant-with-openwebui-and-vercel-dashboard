"use client"

import { useState } from "react"
import { ChatProvider } from "@/lib/chat-context"
import { Sidebar } from "@/components/Sidebar"
import { ChatMessages } from "@/components/ChatMessages"
import { ChatInput } from "@/components/ChatInput"
import { AttachmentDropZone } from "@/components/AttachmentDropZone"
import { ThemeToggle } from "@/components/ThemeToggle"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { CommandPalette } from "@/components/CommandPalette"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { ShieldCheck, Menu } from "lucide-react"
import { TooltipWrap } from "@/components/ui/Tooltip"

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useKeyboardShortcuts({
    onPalette: () => setPaletteOpen((v) => !v),
    onNewChat: () => {
      const event = new CustomEvent("vaultchat-new-chat")
      window.dispatchEvent(event)
    },
    onFocusInput: () => {
      const event = new CustomEvent("vaultchat-focus-input")
      window.dispatchEvent(event)
    },
    onClose: () => {
      setMobileOpen(false)
      setPaletteOpen(false)
    },
  })

  return (
    <ErrorBoundary>
      <ChatProvider>
        <div className="h-full flex flex-col lg:flex-row">
          <Sidebar
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            mobileOpen={mobileOpen}
            onMobileOpenChange={setMobileOpen}
          />
          <AttachmentDropZone className="flex-1 flex flex-col min-w-0 relative">
            {/* Mobile top bar */}
            <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="p-1.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                  aria-label="Open sidebar"
                >
                  <Menu size={20} />
                </button>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-success/10 text-success text-[11px] font-medium">
                  <ShieldCheck size={12} />
                  100% Private
                </div>
              </div>
              <div className="flex items-center gap-1">
                <TooltipWrap label="VaultChat — Your Private AI">
                  <span className="text-[11px] text-muted hidden xs:inline">Powered by Ollama</span>
                </TooltipWrap>
                <ThemeToggle />
              </div>
            </div>

            {/* Desktop header */}
            <div className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-subtle bg-surface">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-success/10 text-success text-xs font-medium">
                  <ShieldCheck size={14} />
                  100% Private
                </div>
                <span className="text-xs text-muted">Your data stays local</span>
              </div>
              <ThemeToggle />
            </div>

            <ChatMessages />
            <ChatInput />
          </AttachmentDropZone>
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </ChatProvider>
    </ErrorBoundary>
  )
}
