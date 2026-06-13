"use client"

import { useState } from "react"
import { ChatProvider } from "@/lib/chat-context"
import { Sidebar } from "@/components/Sidebar"
import { ChatMessages } from "@/components/ChatMessages"
import { ChatInput } from "@/components/ChatInput"
import { AttachmentDropZone } from "@/components/AttachmentDropZone"
import { ThemeToggle } from "@/components/ThemeToggle"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <ErrorBoundary>
      <ChatProvider>
        <div className="h-full flex">
          <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
          <AttachmentDropZone
            className={cn("flex-1 flex flex-col transition-all duration-200", sidebarOpen ? "ml-72" : "ml-0")}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                <ShieldCheck size={14} />
                100% Private
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 dark:text-zinc-600">
                  Your Private AI
                </span>
                <ThemeToggle />
              </div>
            </div>
            <ChatMessages />
            <ChatInput />
          </AttachmentDropZone>
        </div>
      </ChatProvider>
    </ErrorBoundary>
  )
}
