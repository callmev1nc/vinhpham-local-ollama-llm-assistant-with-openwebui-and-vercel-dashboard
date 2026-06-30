"use client"

import { useState, useEffect, useCallback } from "react"
import { useChat } from "@/lib/chat-context"
import {
  MessageSquare, Trash2, Plus, PanelLeftClose, PanelLeft,
  Check, X, Download, Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ModelSelector } from "./ModelSelector"
import { SettingsPanel } from "./SettingsPanel"
import { TooltipWrap } from "@/components/ui/Tooltip"
import { Button } from "@/components/ui/Button"

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  if (d >= today) return "Today"
  if (d >= yesterday) return "Yesterday"
  if (d >= weekAgo) return "Previous 7 days"
  return "Older"
}

export function Sidebar({
  open,
  onOpenChange,
  mobileOpen,
  onMobileOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mobileOpen: boolean
  onMobileOpenChange: (v: boolean) => void
}) {
  const {
    state, selectConversation, deleteConversation, renameConversation,
    newConversation,
  } = useChat()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; snippet: string }[] | null>(null)
  const [searching, setSearching] = useState(false)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSearchResults(null)
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
    const timer = setTimeout(() => doSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, doSearch])

  const isServerSearch = searchQuery.length >= 3

  const filteredConversations = isServerSearch
    ? state.conversations
    : state.conversations.filter((conv) =>
        searchQuery
          ? conv.title.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )

  const grouped = filteredConversations.reduce<Record<string, typeof filteredConversations>>((acc, conv) => {
    const group = getDateGroup(conv.updatedAt)
    if (!acc[group]) acc[group] = []
    acc[group].push(conv)
    return acc
  }, {})

  const groupOrder = ["Today", "Yesterday", "Previous 7 days", "Older"]

  const handleSelect = (id: string) => {
    selectConversation(id)
    onMobileOpenChange(false)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between lg:hidden">
          <h2 className="text-sm font-semibold text-foreground">VaultChat</h2>
          <button
            onClick={() => onMobileOpenChange(false)}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <Button
          onClick={() => {
            newConversation()
            onMobileOpenChange(false)
          }}
          variant="primary"
          size="sm"
          className="w-full"
        >
          <Plus size={16} />
          New conversation
        </Button>

        <ModelSelector />

        <div className="relative mt-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isServerSearch ? "Search all content..." : "Search conversations..."}
            className="w-full rounded-xl border border-subtle bg-surface pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mt-2">
          {searching && (
            <p className="text-xs text-muted text-center py-2">Searching...</p>
          )}
          {!searching && isServerSearch && searchResults && searchResults.length === 0 && (
            <p className="text-xs text-muted text-center py-4">No matches found</p>
          )}
          {!isServerSearch && filteredConversations.length === 0 && (
            <p className="text-xs text-muted text-center py-4">
              {searchQuery ? "No matches" : "No conversations yet"}
            </p>
          )}
          {isServerSearch && searchResults ? (
            <div className="space-y-1">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors",
                    state.activeId === result.id
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:bg-surface-2/50 hover:text-foreground"
                  )}
                  onClick={() => handleSelect(result.id)}
                >
                  <MessageSquare size={16} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{result.title}</div>
                    {result.snippet && (
                      <div className="truncate text-[11px] text-muted mt-0.5">{result.snippet}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            groupOrder.map((group) => {
              const items = grouped[group]
              if (!items?.length) return null
              return (
                <div key={group}>
                  <p className="text-[11px] font-medium text-muted uppercase tracking-wider px-3 mb-1">
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors",
                          state.activeId === conv.id
                            ? "bg-surface-2 text-foreground"
                            : "text-muted hover:bg-surface-2/50 hover:text-foreground"
                        )}
                        onClick={() => handleSelect(conv.id)}
                      >
                        <MessageSquare size={16} className="shrink-0" />
                        {editingId === conv.id ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="flex-1 bg-transparent border-b border-accent text-sm outline-none px-1 text-foreground"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editingId && editTitle.trim()) {
                                    renameConversation(editingId, editTitle.trim())
                                  }
                                  setEditingId(null)
                                }
                                if (e.key === "Escape") setEditingId(null)
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (editingId && editTitle.trim()) {
                                  renameConversation(editingId, editTitle.trim())
                                }
                                setEditingId(null)
                              }}
                              className="text-muted hover:text-success transition-colors"
                              aria-label="Confirm rename"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingId(null) }}
                              className="text-muted hover:text-error transition-colors"
                              aria-label="Cancel rename"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="flex-1 truncate"
                            onDoubleClick={() => {
                              setEditingId(conv.id)
                              setEditTitle(conv.title)
                            }}
                          >
                            {conv.title}
                          </span>
                        )}
                        {editingId !== conv.id && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TooltipWrap label="Export as Markdown">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const sessionId = localStorage.getItem("vaultchat_session") || ""
                                  window.open(`/api/export?id=${conv.id}&sessionId=${sessionId}`, "_blank")
                                }}
                                className="p-1 rounded text-muted hover:text-info transition-colors"
                                aria-label="Export as Markdown"
                              >
                                <Download size={13} />
                              </button>
                            </TooltipWrap>
                            <TooltipWrap label="Delete conversation">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteConversation(conv.id)
                                }}
                                className="p-1 rounded text-muted hover:text-error transition-colors"
                                aria-label="Delete conversation"
                              >
                                <Trash2 size={13} />
                              </button>
                            </TooltipWrap>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <SettingsPanel />
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar toggle */}
      <button
        onClick={() => onOpenChange(!open)}
        className="hidden lg:fixed lg:flex top-4 left-4 z-50 p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        aria-label={open ? "Close sidebar" : "Open sidebar"}
      >
        {open ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
      </button>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:h-full lg:transition-all lg:duration-200 lg:z-40",
          open ? "lg:w-72" : "lg:w-0 lg:overflow-hidden"
        )}
      >
        <div
          className={cn(
            "w-72 h-full bg-surface border-r border-subtle flex flex-col",
            open ? "block" : "hidden"
          )}
        >
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => onMobileOpenChange(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-surface shadow-soft-lg animate-in slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
