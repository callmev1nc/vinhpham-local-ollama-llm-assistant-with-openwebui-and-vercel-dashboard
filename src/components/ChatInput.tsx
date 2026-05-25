"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useChat } from "@/lib/chat-context"
import { classifyPrompt } from "@/lib/classifier"
import { getModelInfo, formatBytes } from "@/lib/ollama"
import { Send, Zap, Brain, Code, Sparkles, Download, Square, Paperclip, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Attachment } from "@/types"

const categoryMeta: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  code: { label: "Code task", icon: Code, color: "text-green-500 bg-green-100 dark:bg-green-900/30" },
  analysis: { label: "Analysis", icon: Brain, color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30" },
  creative: { label: "Creative", icon: Sparkles, color: "text-amber-500 bg-amber-100 dark:bg-amber-900/30" },
  general: { label: "General", icon: Zap, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30" },
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const ALLOWED_TEXT_EXTENSIONS = [".txt", ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".md", ".csv", ".sql", ".css", ".html", ".sh", ".yaml", ".yml", ".toml", ".env", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".rb", ".php"]
const MAX_IMAGE_SIZE = 4 * 1024 * 1024
const MAX_TEXT_SIZE = 500 * 1024

export function ChatInput() {
  const { state, sendMessage, stopStreaming } = useChat()
  const [input, setInput] = useState("")
  const [attachedFile, setAttachedFile] = useState<Attachment | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)

    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      if (file.size > MAX_IMAGE_SIZE) {
        setFileError(`Image too large (max 4MB). File is ${formatBytes(file.size)}`)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        setAttachedFile({ type: "image", name: file.name, data: base64 })
      }
      reader.readAsDataURL(file)
    } else {
      const ext = "." + file.name.split(".").pop()?.toLowerCase()
      if (!ALLOWED_TEXT_EXTENSIONS.includes(ext)) {
        setFileError(`Unsupported file type: ${ext}. Allowed: ${ALLOWED_TEXT_EXTENSIONS.join(", ")}`)
        return
      }
      if (file.size > MAX_TEXT_SIZE) {
        setFileError(`File too large (max 500KB). File is ${formatBytes(file.size)}`)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        setAttachedFile({ type: "text", name: file.name, data: text })
      }
      reader.readAsText(file)
    }

    e.target.value = ""
  }

  const removeAttachment = () => {
    setAttachedFile(null)
    setFileError(null)
  }

  const handleSubmit = async () => {
    const trimmed = input.trim()
    if ((!trimmed && !attachedFile) || state.streaming || state.pulling) return

    const file = attachedFile
    setAttachedFile(null)
    setFileError(null)
    setInput("")
    await sendMessage(trimmed, file ? { attachment: file } : undefined)
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
      <div className="max-w-4xl mx-auto space-y-2">
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
          <div className="flex justify-center">
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

        {fileError && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {fileError}
          </div>
        )}

        {attachedFile && (
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-200 dark:border-zinc-700">
            {attachedFile.type === "image" ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachedFile.data}
                  alt={attachedFile.name}
                  className="h-16 w-auto rounded-lg object-cover border border-zinc-200 dark:border-zinc-600"
                />
                <button
                  onClick={removeAttachment}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                  title="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-2.5 py-1.5 text-xs">
                <FileText size={14} className="text-blue-500" />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[200px]">{attachedFile.name}</span>
                <button
                  onClick={removeAttachment}
                  className="p-0.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Remove file"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              state.pulling ? "Downloading model..." :
              state.activeId ? "Message VaultChat..." : "Start a new conversation..."
            }
            rows={1}
            className="w-full resize-none rounded-2xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-4 py-3.5 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-transparent disabled:opacity-50 shadow-sm"
            disabled={state.streaming || state.pulling}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,.txt,.py,.js,.ts,.jsx,.tsx,.json,.md,.csv,.sql,.css,.html,.sh,.yaml,.yml,.toml,.env,.rs,.go,.java,.c,.cpp,.h,.rb,.php"
              onChange={handleFileSelect}
              className="hidden"
            />
            {!state.streaming && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={state.pulling}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-30"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
            )}
            {state.streaming ? (
              <button
                onClick={stopStreaming}
                className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="Stop generating"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={(!input.trim() && !attachedFile) || state.pulling}
                className="p-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>

        {state.modelSwitch && !state.pulling && (
          <div className="flex justify-center">
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
