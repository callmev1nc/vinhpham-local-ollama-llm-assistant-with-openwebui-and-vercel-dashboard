"use client"

import { useEffect, useRef } from "react"
import { useChat } from "@/lib/chat-context"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import { ShieldCheck, RefreshCw, FileText, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const suggestedPrompts = [
  "Write a Python function to sort a list",
  "Explain quantum computing in simple terms",
  "Debug this: TypeError: undefined is not a function",
  "Compare React and Vue.js",
]

export function ChatMessages() {
  const { state, regenerateMessage, sendMessage } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [state.messages])

  const hasStreamingAssistant = state.messages.some(
    (m) => m.role === "assistant" && m.content.length > 0 && m.id === "streaming"
  )

  if (!state.activeId) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-600">
        <div className="text-center space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium mx-auto w-fit">
              <ShieldCheck size={16} />
              100% Private · Your data stays local
            </div>
            <h2 className="text-2xl font-semibold text-zinc-600 dark:text-zinc-400">
              VaultChat
            </h2>
            <p className="text-sm">Select a conversation or start a new one</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
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
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-5">
      {state.messages.length === 0 && (
        <div className="text-center text-zinc-400 dark:text-zinc-600 mt-12">
          <p>Send a message to start chatting</p>
        </div>
      )}
      {state.messages.map((msg, idx) => (
        <div
          key={msg.id}
          className={cn(
            "flex items-end gap-2 group",
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[70%] rounded-2xl px-4 py-3 prose prose-sm dark:prose-invert",
              msg.role === "user"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            )}
          >
            {msg.role === "assistant" ? (
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {msg.content || "..."}
              </ReactMarkdown>
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
                            className="max-h-40 w-auto rounded-lg border border-zinc-200 dark:border-zinc-600 object-cover"
                          />
                        ) : (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-2.5 py-1.5"
                          >
                            {a.type === "image" ? <ImageIcon size={14} /> : <FileText size={14} />}
                            <span className="font-medium truncate max-w-[200px]">
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
          {msg.role === "assistant" &&
            idx === state.messages.length - 1 &&
            !state.streaming &&
            msg.content && (
              <button
                onClick={regenerateMessage}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0"
                title="Regenerate response"
              >
                <RefreshCw size={14} />
              </button>
            )}
        </div>
      ))}
      {state.streaming && !hasStreamingAssistant && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-zinc-100 dark:bg-zinc-800">
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
        </div>
      )}
      {state.error && (
        <div className="flex justify-center">
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
            {state.error}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
      </div>
    </div>
  )
}
