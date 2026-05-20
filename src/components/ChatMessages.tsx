"use client"

import { useEffect, useRef } from "react"
import { useChat } from "@/lib/chat-context"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import { cn } from "@/lib/utils"

export function ChatMessages() {
  const { state } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [state.messages])

  if (!state.activeId) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-600">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-zinc-600 dark:text-zinc-400">
            Local AI Assistant
          </h2>
          <p className="text-sm">Select a conversation or start a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {state.messages.length === 0 && (
        <div className="text-center text-zinc-400 dark:text-zinc-600 mt-12">
          <p>Send a message to start chatting</p>
        </div>
      )}
      {state.messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "flex",
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 prose prose-sm dark:prose-invert",
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
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        </div>
      ))}
      {state.streaming && (
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
  )
}
