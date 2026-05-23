"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useChat } from "@/lib/chat-context"
import { classifyPrompt } from "@/lib/classifier"
import { getModelInfo, formatBytes } from "@/lib/ollama"
import { Send, Plus, Zap, Brain, Code, Sparkles, Download, Square } from "lucide-react"
import { cn } from "@/lib/utils"

const categoryMeta: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  code: { label: "Code task", icon: Code, color: "text-green-500 bg-green-100 dark:bg-green-900/30" },
  analysis: { label: "Analysis", icon: Brain, color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30" },
  creative: { label: "Creative", icon: Sparkles, color: "text-amber-500 bg-amber-100 dark:bg-amber-900/30" },
  general: { label: "General", icon: Zap, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30" },
}

export function ChatInput() {
  const { state, sendMessage, newConversation, stopStreaming } = useChat()
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const classification = useMemo(() => {
    const trimmed = input.trim()
    if (trimmed.length < 3 || !state.autoSwitch) return null
    return classifyPrompt(trimmed)
  }, [input, state.autoSwitch])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSubmit = async () => {
    const trimmed = input.trim()
    if (!trimmed || state.streaming || state.pulling) return

    setInput("")
    await sendMessage(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const pp = state.pullProgress

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900">
      <div className="max-w-3xl mx-auto space-y-2">
        {pp && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Download size={16} className="animate-bounce" />
              <span className="font-medium">Downloading {pp.model}</span>
              {pp.percent !== undefined && (
                <span className="text-blue-500">{pp.percent}%</span>
              )}
            </div>
            <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{
                  width: pp.percent !== undefined ? `${pp.percent}%` :
                    pp.status === "already exists" || pp.status === "success" ? "100%" : "0%",
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-blue-500 dark:text-blue-400">
              <span>{pp.status}</span>
              {pp.completed !== undefined && pp.total !== undefined && (
                <span>{formatBytes(pp.completed)} / {formatBytes(pp.total)}</span>
              )}
            </div>
          </div>
        )}

        {classification && classification.category !== "general" && !state.pulling && (
          <div className="flex items-center gap-2 px-1">
            {(() => {
              const meta = categoryMeta[classification.category]
              const Icon = meta.icon
              const suggestedInfo = getModelInfo(classification.model)
              return (
                <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium", meta.color)}>
                  <Icon size={12} />
                  <span>{meta.label} detected</span>
                  {suggestedInfo && (
                    <span className="opacity-70">
                      · will use {suggestedInfo.label}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => newConversation()}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            title="New conversation"
            disabled={state.pulling}
          >
            <Plus size={20} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                state.pulling ? "Downloading model..." :
                state.activeId ? "Type a message..." : "Start a new conversation..."
              }
              rows={1}
              className="w-full resize-none rounded-xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-transparent disabled:opacity-50"
              disabled={state.streaming || state.pulling}
            />
            {state.streaming ? (
              <button
                onClick={stopStreaming}
                className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="Stop generating"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || state.pulling}
                className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>

        {state.modelSwitch && !state.pulling && (
          <div className="flex items-center gap-2 px-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Zap size={12} className="text-amber-500" />
              <span>Auto-switched: {state.modelSwitch.from} → {state.modelSwitch.to}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
