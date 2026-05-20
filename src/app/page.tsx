import { ChatProvider } from "@/lib/chat-context"
import { Sidebar } from "@/components/Sidebar"
import { ChatMessages } from "@/components/ChatMessages"
import { ChatInput } from "@/components/ChatInput"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function Home() {
  return (
    <ChatProvider>
      <div className="h-full flex">
        <Sidebar />
        <main className="flex-1 flex flex-col ml-0 transition-all duration-200">
          <div className="flex items-center justify-end p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-600">
                Running locally via Ollama
              </span>
              <ThemeToggle />
            </div>
          </div>
          <ChatMessages />
          <ChatInput />
        </main>
      </div>
    </ChatProvider>
  )
}
