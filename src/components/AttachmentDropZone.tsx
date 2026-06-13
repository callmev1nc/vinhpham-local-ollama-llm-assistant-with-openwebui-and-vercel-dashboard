"use client"

import { useState, type ReactNode } from "react"
import { useChat } from "@/lib/chat-context"
import { cn } from "@/lib/utils"
import { UploadCloud } from "lucide-react"

/**
 * Wraps the chat area so files/images can be dropped or pasted anywhere.
 * Routes them through the shared context.addFiles (same validation as the picker).
 */
export function AttachmentDropZone({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { addFiles } = useChat()
  const [dragging, setDragging] = useState(false)

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) await addFiles(files)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes("Files") && !dragging) setDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only clear when leaving the container itself, not when crossing children.
    if (e.currentTarget === e.target) setDragging(false)
  }

  const onPaste = async (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter((it) => it.kind === "file")
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f)
    if (files.length) {
      e.preventDefault()
      await addFiles(files)
    }
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onPaste={onPaste}
      className={cn(className, "relative", dragging && "ring-2 ring-blue-400 ring-inset")}
    >
      {dragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-blue-50/80 dark:bg-blue-900/30 pointer-events-none rounded-lg">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 shadow-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 font-medium">
            <UploadCloud size={18} />
            Drop files or images to attach
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
