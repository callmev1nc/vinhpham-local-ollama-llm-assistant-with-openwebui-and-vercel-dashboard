"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useChat } from "@/lib/chat-context"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import {
  ShieldCheck, RefreshCw, Copy, Pencil, FileText, Image as ImageIcon,
  Bot, User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CodeBlock } from "@/components/CodeBlock"
import { TooltipWrap } from "@/components/ui/Tooltip"
import { toast } from "sonner"

const suggestedPrompts = [
  "Write a Python function to sort a list",
  "Explain quantum computing in simple terms",
  "Debug this: TypeError: undefined is not a function",
  "Compare React and Vue.js",
]

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

export function ChatMessages() {
  const { state, regenerateMessage, sendMessage, editMessage } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [state.messages])

  const hasStreamingAssistant = state.messages.some(
    (m) => m.role === "assistant" && m.content.length > 0 && m.id === "streaming"
  )

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success("Message copied")
    } catch {
      toast.error("Failed to copy")
    }
  }, [])

  const startEdit = useCallback((msgId: string, content: string) => {
    setEditingId(msgId)
    setEditContent(content)
    setTimeout(() => {
      editRef.current?.focus()
      editRef.current?.setSelectionRange(content.length, content.length)
    }, 0)
  }, [])

  const handleEditSave = useCallback(async () => {
    if (!editingId || !editContent.trim()) return
    await editMessage(editingId, editContent.trim())
    setEditingId(null)
    setEditContent("")
  }, [editingId, editContent, editMessage])

  const components = {
    pre: ({ children }: { children?: React.ReactNode }) => {
      const child = Array.isArray(children) ? children[0] : children
      const codeProps = child && typeof child === "object" && "props" in child
        ? (child as { props: { className?: string; children?: React.ReactNode } }).props
        : {}
      const langMatch = codeProps.className ? codeProps.className.match(/language-(\S+)/) : null
      const lang = langMatch ? langMatch[1] : undefined
      return (
        <CodeBlock language={lang}>{children}</CodeBlock>
      )
    },
  }

  if (!state.activeId) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mx-auto w-fit">
              <ShieldCheck size={16} />
              100% Private · Your data stays local
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              VaultChat
            </h2>
            <p className="text-sm text-muted">Select a conversation or start a new one</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-1.5 rounded-full border border-subtle text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-3 lg:px-6 py-6"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="max-w-4xl mx-auto space-y-4">
        {state.messages.length === 0 && (
          <div className="text-center text-muted mt-12">
            <p className="text-sm">Send a message to start chatting</p>
          </div>
        )}
        {state.messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-1 duration-200",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {/* Avatar */}
            {msg.role === "assistant" && (
              <div className="shrink-0 w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center mt-1">
                <Bot size={16} className="text-accent" />
              </div>
            )}

            <div className={cn("flex flex-col max-w-[85%] lg:max-w-[70%]")}>
              {/* Edited message (inline textarea) */}
              {editingId === msg.id ? (
                <div className="rounded-2xl border border-accent bg-surface shadow-soft overflow-hidden">
                  <textarea
                    ref={editRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleEditSave()
                      }
                      if (e.key === "Escape") {
                        setEditingId(null)
                      }
                    }}
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground outline-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-end gap-2 px-3 pb-3">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={!editContent.trim() || state.streaming}
                      className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent-strong transition-colors disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* Message bubble */
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 shadow-soft",
                    msg.role === "user"
                      ? "bg-accent text-white rounded-br-md"
                      : "bg-surface border border-subtle rounded-bl-md"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-code:text-accent">
                      <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: true }]]} components={components}>
                        {msg.content || "..."}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        const items: { type: string; name: string; data?: string }[] =
                          msg.attachments && msg.attachments.length
                            ? msg.attachments.map((a) => ({ type: a.type, name: a.name, data: a.data }))
                            : msg.attachmentType
                              ? [{ type: msg.attachmentType, name: msg.attachmentName || "" }]
                              : []
                        if (!items.length) return null
                        return (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {items.map((a, i) =>
                              a.type === "image" && a.data ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={i}
                                  src={a.data}
                                  alt={a.name}
                                  className="max-h-32 w-auto rounded-lg border border-subtle object-cover"
                                />
                              ) : (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs text-muted bg-surface-2 rounded-lg px-2.5 py-1.5"
                                >
                                  {a.type === "image" ? <ImageIcon size={14} /> : <FileText size={14} />}
                                  <span className="font-medium truncate max-w-[160px]">
                                    {a.name || (a.type === "image" ? "Image attached" : "File attached")}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )
                      })()}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Message toolbar */}
              {editingId !== msg.id && (
                <div
                  className={cn(
                    "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <button
                    onClick={() => handleCopyMessage(msg.content)}
                    className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                    aria-label="Copy message"
                  >
                    <Copy size={12} />
                  </button>
                  {msg.role === "user" && !state.streaming && !state.pulling && (
                    <button
                      onClick={() => startEdit(msg.id, msg.content)}
                      className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                      aria-label="Edit message"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  {msg.role === "assistant" && idx === state.messages.length - 1 && !state.streaming && msg.content && (
                    <TooltipWrap label="Regenerate response">
                      <button
                        onClick={regenerateMessage}
                        className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                        aria-label="Regenerate response"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </TooltipWrap>
                  )}
                  {msg.createdAt && (
                    <span className="text-[10px] text-muted/60 px-1">{formatTime(msg.createdAt)}</span>
                  )}
                </div>
              )}
            </div>

            {/* User avatar */}
            {msg.role === "user" && (
              <div className="shrink-0 w-8 h-8 rounded-xl bg-foreground/10 flex items-center justify-center mt-1">
                <User size={16} className="text-foreground/60" />
              </div>
            )}
          </div>
        ))}
        {state.streaming && !hasStreamingAssistant && (
          <div className="flex justify-start items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center mt-1">
              <Bot size={16} className="text-accent" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-surface border border-subtle">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        {state.error && (
          <div className="flex justify-center" role="alert" aria-live="assertive">
            <div className="bg-error/10 text-error px-4 py-2 rounded-lg text-sm border border-error/20">
              {state.error}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
