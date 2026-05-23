"use client"

import { useChat } from "@/lib/chat-context"
import { RotateCcw, Zap } from "lucide-react"
import { getDefaultModel } from "@/lib/ollama"

export function SettingsPanel() {
  const { state, setAutoSwitch, switchModel, updateSystemPrompt } = useChat()
  const activeConv = state.conversations.find((c) => c.id === state.activeId)

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
      {activeConv && (
        <div className="mt-3 space-y-2">
          <label className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block px-1">
            System Prompt
          </label>
          <textarea
            defaultValue={activeConv.systemPrompt || ""}
            onBlur={(e) => {
              if (state.activeId) {
                updateSystemPrompt(state.activeId, e.target.value)
              }
            }}
            placeholder="Optional: set a custom system prompt..."
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          />
        </div>
      )}
      <button
        onClick={() => {
          if (state.activeId) {
            switchModel(state.activeId, getDefaultModel())
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
