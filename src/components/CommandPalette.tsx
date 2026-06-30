"use client"

import { useEffect, useState, useCallback } from "react"
import { useChat } from "@/lib/chat-context"
import {
  Search, MessageSquare, Sun, Zap, File,
} from "lucide-react"
import { Kbd } from "@/components/ui/Kbd"
import { templates } from "@/lib/templates"
import { setTheme } from "@/lib/theme"

interface Command {
  id: string
  name: string
  description: string
  icon: typeof Search
  action: () => void
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const {
    state, newConversation, setAutoSwitch,
    selectConversation,
  } = useChat()
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; snippet: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const sessionId = localStorage.getItem("vaultchat_session") || ""
      const res = await fetch(`/api/conversations/search?q=${encodeURIComponent(q)}`, {
        headers: { "X-Session-Id": sessionId },
      })
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const commands: Command[] = [
    {
      id: "new-chat",
      name: "New conversation",
      description: "Start a fresh chat",
      icon: MessageSquare,
      action: () => {
        onOpenChange(false)
        newConversation()
      },
    },
    {
      id: "toggle-theme",
      name: "Toggle theme",
      description: "Switch between light and dark mode",
      icon: Sun,
      action: () => {
        onOpenChange(false)
        setTheme(!document.documentElement.classList.contains("dark"))
      },
    },
    {
      id: "toggle-autoswitch",
      name: "Toggle auto model switch",
      description: state.autoSwitch ? "Currently enabled — disable" : "Currently disabled — enable",
      icon: Zap,
      action: () => {
        onOpenChange(false)
        setAutoSwitch(!state.autoSwitch)
      },
    },
    ...templates.map((t, i) => ({
      id: `template-${i}`,
      name: `Template: ${t.name}`,
      description: t.description,
      icon: File,
      action: () => {
        onOpenChange(false)
        const event = new CustomEvent("vaultchat-insert-template", { detail: t.content })
        window.dispatchEvent(event)
      },
    })),
  ]

  const filtered = query
    ? commands.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  const allItems = [
    ...filtered,
    ...(query.length >= 3
      ? searchResults.map((r) => ({
          id: `search-${r.id}`,
          name: r.title,
          description: r.snippet || "Search result",
          icon: Search as typeof Search,
          action: () => {
            onOpenChange(false)
            selectConversation(r.id)
          },
        }))
      : []),
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault()
      allItems[selectedIndex].action()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-lg mx-auto px-4">
        <div className="bg-surface border border-subtle rounded-2xl shadow-soft-lg overflow-hidden">
          <div className="flex items-center gap-3 px-4 border-b border-subtle">
            <Search size={16} className="text-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search conversations, commands, templates..."
              className="flex-1 bg-transparent py-3.5 text-sm text-foreground placeholder:text-muted outline-none"
              autoFocus
            />
            <Kbd>esc</Kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
            {allItems.length === 0 && (
              <p className="text-sm text-muted text-center py-4">
                {searching ? "Searching..." : "No results"}
              </p>
            )}
            {allItems.map((item, i) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => item.action()}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    i === selectedIndex
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:text-foreground hover:bg-surface-2/50"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="truncate text-xs text-muted">{item.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
