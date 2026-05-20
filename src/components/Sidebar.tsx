"use client"

import { useState } from "react"
import { useChat } from "@/lib/chat-context"
import { MessageSquare, Trash2, Plus, PanelLeftClose, PanelLeft, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModelSelector } from "./ModelSelector"
import { SettingsPanel } from "./SettingsPanel"

export function Sidebar() {
  const { state, selectConversation, deleteConversation, renameConversation, newConversation } = useChat()
  const [open, setOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const handleConfirmRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameConversation(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        {open ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
      </button>

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-72 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-200 z-40",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 pt-16 space-y-3 flex-1 flex flex-col">
          <button
            onClick={() => newConversation()}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            New conversation
          </button>

          <ModelSelector />

          <div className="flex-1 overflow-y-auto space-y-1 mt-2">
            {state.conversations.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-4">
                No conversations yet
              </p>
            )}
            {state.conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors",
                  state.activeId === conv.id
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                )}
                onClick={() => selectConversation(conv.id)}
              >
                <MessageSquare size={16} className="shrink-0" />
                {editingId === conv.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 bg-transparent border-b border-zinc-400 dark:border-zinc-600 text-sm outline-none px-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmRename()
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleConfirmRename() }} className="text-zinc-400 hover:text-green-500">
                      <Check size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }} className="text-zinc-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span
                    className="flex-1 truncate"
                    onDoubleClick={() => handleStartRename(conv.id, conv.title)}
                  >
                    {conv.title}
                  </span>
                )}
                {editingId !== conv.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <SettingsPanel />
        </div>
      </aside>
    </>
  )
}
