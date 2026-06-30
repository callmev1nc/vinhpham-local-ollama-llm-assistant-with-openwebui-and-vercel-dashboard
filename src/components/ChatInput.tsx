"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useChat } from "@/lib/chat-context"
import { classifyPrompt } from "@/lib/classifier"
import { getModelInfo, formatBytes } from "@/lib/ollama"
import {
  Send, Zap, Brain, Code, Sparkles, Download, Square,
  Paperclip, X, FileText, File,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FILE_ACCEPT } from "@/lib/file-constants"
import { TooltipWrap } from "@/components/ui/Tooltip"
import { templates } from "@/lib/templates"

const categoryMeta: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  code: { label: "Code task", icon: Code, color: "text-green-500 bg-green-100 dark:bg-green-900/30" },
  analysis: { label: "Analysis", icon: Brain, color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30" },
  creative: { label: "Creative", icon: Sparkles, color: "text-amber-500 bg-amber-100 dark:bg-amber-900/30" },
  general: { label: "General", icon: Zap, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30" },
}

export function ChatInput() {
  const { state, sendMessage, stopStreaming, addFiles, removeAttachment, clearAttachments, newConversation } = useChat()
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showTemplates, setShowTemplates] = useState(false)

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

  useEffect(() => {
    const handler = () => {
      if (document.activeElement !== textareaRef.current) {
        textareaRef.current?.focus()
      }
    }
    window.addEventListener("vaultchat-focus-input", handler)
    return () => window.removeEventListener("vaultchat-focus-input", handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (typeof detail === "string") {
        setInput(detail)
        textareaRef.current?.focus()
      }
    }
    window.addEventListener("vaultchat-insert-template", handler)
    return () => window.removeEventListener("vaultchat-insert-template", handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      newConversation()
    }
    window.addEventListener("vaultchat-new-chat", handler)
    return () => window.removeEventListener("vaultchat-new-chat", handler)
  }, [newConversation])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    await addFiles(files)
    e.target.value = ""
  }

  const handleSubmit = async () => {
    const trimmed = input.trim()
    if ((!trimmed && state.pendingAttachments.length === 0) || state.streaming || state.pulling) return

    const files = state.pendingAttachments
    clearAttachments()
    setInput("")
    await sendMessage(trimmed, files.length ? { attachments: files } : undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTemplateSelect = (content: string) => {
    setInput(content)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }

  const pp = state.pullProgress

  return (
    <div className="border-t border-subtle px-3 lg:px-6 py-4 bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="max-w-4xl mx-auto space-y-2">
        {pp && (
          <div className="bg-info/10 border border-info/20 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-info">
              <Download size={16} className="animate-bounce" />
              <span className="font-medium">Downloading {pp.model}</span>
              {pp.percent !== undefined && (
                <span className="text-info/70">{pp.percent}%</span>
              )}
            </div>
            <div className="w-full h-2 bg-info/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-info rounded-full transition-all duration-300"
                style={{
                  width: pp.percent !== undefined ? `${pp.percent}%` :
                    pp.status === "already exists" || pp.status === "success" ? "100%" : "0%",
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-info/70">
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

        {state.attachmentError && (
          <div className="text-xs text-error bg-error/10 rounded-xl px-3 py-2" role="alert">
            {state.attachmentError}
          </div>
        )}

        {state.pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 bg-surface-2 rounded-xl px-3 py-2 border border-subtle">
            {state.pendingAttachments.map((file, i) =>
              file.type === "image" ? (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.data}
                    alt={file.name}
                    className="h-16 w-auto rounded-lg object-cover border border-subtle"
                  />
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-error text-white hover:opacity-90 transition-all shadow-sm"
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-surface rounded-lg px-2.5 py-1.5 text-xs border border-subtle"
                >
                  <FileText size={14} className="text-info" />
                  <span className="text-foreground font-medium truncate max-w-[160px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="p-0.5 rounded text-muted hover:text-error transition-colors"
                    aria-label="Remove file"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        <div className="relative flex items-end gap-2">
          <div className="flex-1 relative">
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
              className="w-full resize-none rounded-2xl border border-subtle bg-surface-2 px-4 py-3.5 pr-12 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 shadow-soft"
              disabled={state.streaming || state.pulling}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-1">
              {!state.streaming && (
                <TooltipWrap label="Attach file">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={state.pulling}
                    className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-30"
                    aria-label="Attach file"
                  >
                    <Paperclip size={16} />
                  </button>
                </TooltipWrap>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <TooltipWrap label="Insert prompt template">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                disabled={state.streaming || state.pulling}
                className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-30"
                aria-label="Insert prompt template"
              >
                <File size={16} />
              </button>
            </TooltipWrap>

            {state.streaming ? (
              <TooltipWrap label="Stop generating">
                <button
                  onClick={stopStreaming}
                  className="p-2.5 rounded-xl bg-error text-white hover:opacity-90 transition-all"
                  aria-label="Stop generating"
                >
                  <Square size={16} />
                </button>
              </TooltipWrap>
            ) : (
              <TooltipWrap label="Send message">
                <button
                  onClick={handleSubmit}
                  disabled={(!input.trim() && state.pendingAttachments.length === 0) || state.pulling}
                  className="p-2.5 rounded-xl bg-accent text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-accent-strong shadow-soft"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </TooltipWrap>
            )}
          </div>
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="relative">
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowTemplates(false)}
            />
            <div className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-surface border border-subtle rounded-xl shadow-soft-lg max-h-48 overflow-y-auto">
              <div className="p-2 space-y-0.5">
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider px-2 py-1">
                  Prompt Templates
                </p>
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => handleTemplateSelect(t.content)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground hover:bg-surface-2 transition-colors"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-muted ml-2">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {state.modelSwitch && !state.pulling && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-surface-2 text-muted">
              <Zap size={12} className="text-warning" />
              <span>Auto-switched: {state.modelSwitch.from} → {state.modelSwitch.to}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
