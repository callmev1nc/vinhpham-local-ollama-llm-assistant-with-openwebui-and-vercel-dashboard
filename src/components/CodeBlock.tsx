"use client"

import { useState, type ReactNode } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

export function CodeBlock({
  children,
  language,
}: {
  children: ReactNode
  language?: string
}) {
  const [copied, setCopied] = useState(false)

  const codeContent = extractTextContent(children)

  const handleCopy = async () => {
    if (!codeContent) return
    try {
      await navigator.clipboard.writeText(codeContent)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <div className="group relative my-3 rounded-xl overflow-hidden border border-subtle bg-surface-2 shadow-soft">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-subtle">
        <span className="text-[11px] font-medium text-muted font-mono">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-muted hover:text-foreground hover:bg-surface transition-colors"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check size={12} className="text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function extractTextContent(node: ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractTextContent).join("")
  if (node && typeof node === "object" && "props" in node) {
    return extractTextContent((node as { props: { children: ReactNode } }).props.children)
  }
  return ""
}
