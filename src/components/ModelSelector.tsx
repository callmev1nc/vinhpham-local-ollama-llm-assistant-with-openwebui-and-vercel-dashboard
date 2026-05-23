"use client"

import { useEffect, useState } from "react"
import { useChat } from "@/lib/chat-context"
import { getModelInfo } from "@/lib/ollama"
import { ChevronDown, Zap, Brain, Code, Sparkles } from "lucide-react"
import type { OllamaModel } from "@/types"
import { cn } from "@/lib/utils"

const categoryIcons: Record<string, typeof Zap> = {
  general: Zap,
  analysis: Brain,
  code: Code,
  creative: Sparkles,
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
}

export function ModelSelector() {
  const { state, switchModel } = useChat()
  const [models, setModels] = useState<OllamaModel[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/models")
        const data = await res.json()
        setModels(data.models || [])
      } catch {
        setModels([])
      }
      setLoading(false)
    }
    load()
  }, [state.modelListVersion])

  const activeConv = state.conversations.find((c) => c.id === state.activeId)
  const activeModelName = activeConv?.model || "llama3.2:3b"
  const activeInfo = getModelInfo(activeModelName)

  const handleSelect = async (modelName: string) => {
    setOpen(false)
    if (!state.activeId) return
    await switchModel(state.activeId, modelName)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          {activeInfo && (
            <span className={cn("shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded", colorMap[activeInfo.color])}>
              {activeInfo.label}
            </span>
          )}
          <span className="truncate">{loading ? "Loading..." : activeModelName}</span>
        </span>
        <ChevronDown size={16} className="shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {models.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-400">
                No models found. Is Ollama running?
              </div>
            ) : (
              models.map((m) => {
                const info = getModelInfo(m.name)
                const Icon = info?.bestFor[0] ? categoryIcons[info.bestFor[0]] : Zap
                const isActive = activeModelName === m.name

                return (
                  <button
                    key={m.name}
                    onClick={() => handleSelect(m.name)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0",
                      isActive
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={14} className="shrink-0 text-zinc-400" />
                        <span className="font-medium truncate">{m.name}</span>
                      </div>
                      {info && (
                        <span className={cn("shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded", colorMap[info.color])}>
                          {info.label}
                        </span>
                      )}
                    </div>
                    {info && (
                      <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 ml-6">
                        {info.description}
                        <span className="ml-1">
                          · {info.bestFor.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
