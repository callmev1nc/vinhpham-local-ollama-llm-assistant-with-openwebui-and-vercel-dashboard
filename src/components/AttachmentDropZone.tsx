"use client"

import { useState, type ReactNode } from "react"
import { useChat } from "@/lib/chat-context"
import { cn } from "@/lib/utils"
import { UploadCloud } from "lucide-react"

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
      className={cn(className, "relative")}
    >
      {dragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-accent/5 pointer-events-none rounded-lg border-2 border-dashed border-accent/30">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface shadow-soft-lg border border-subtle text-sm text-accent font-medium">
            <UploadCloud size={18} />
            Drop files or images to attach
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
