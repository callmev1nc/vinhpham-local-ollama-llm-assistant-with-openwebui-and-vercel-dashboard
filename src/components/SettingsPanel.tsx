"use client"

import { useChat } from "@/lib/chat-context"
import { RotateCcw, Zap } from "lucide-react"

export function SettingsPanel() {
  const { state, setAutoSwitch } = useChat()

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-500" />
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Auto model switch
          </span>
        </div>
        <button
          onClick={() => setAutoSwitch(!state.autoSwitch)}
          className={`
            relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0
            ${state.autoSwitch
              ? "bg-zinc-900 dark:bg-zinc-100"
              : "bg-zinc-300 dark:bg-zinc-700"}
          `}
        >
          <span
            className={`
              inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-zinc-900 transition-transform
              ${state.autoSwitch ? "translate-x-[18px]" : "translate-x-[2px]"}
            `}
          />
        </button>
      </div>
      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 px-1 leading-relaxed">
        {state.autoSwitch
          ? "Detects task type and switches to the best model automatically"
          : "Uses the currently selected model for all tasks"}
      </p>
      <button
        onClick={() => {
          if (state.activeId) {
            const current = state.conversations.find((c) => c.id === state.activeId)
            if (current && current.model !== "llama3.2:3b") {
              fetch(`/api/conversations/${state.activeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: "llama3.2:3b" }),
              })
            }
          }
        }}
        className="mt-2 w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <RotateCcw size={12} />
        Reset to default model
      </button>
    </div>
  )
}
