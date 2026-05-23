import type { OllamaModel, OllamaChatRequest, OllamaChatResponse, ModelInfo, TaskCategory } from "@/types"

const OLLAMA_BASE = "http://localhost:11434"

export const MODEL_INFO: Record<string, ModelInfo> = {
  "llama3.2:3b": {
    label: "Llama 3.2",
    bestFor: ["general"],
    description: "Fast general chat & Q&A",
    color: "blue",
  },
  "llama3.2:1b": {
    label: "Llama 3.2 (1B)",
    bestFor: ["general"],
    description: "Ultra-lightweight chat",
    color: "blue",
  },
  "llama3.1:8b": {
    label: "Llama 3.1",
    bestFor: ["general", "analysis"],
    description: "Balanced general purpose",
    color: "blue",
  },
  "qwen2.5:7b": {
    label: "Qwen 2.5",
    bestFor: ["analysis", "creative", "general"],
    description: "Reasoning, analysis & creative",
    color: "purple",
  },
  "qwen2.5:3b": {
    label: "Qwen 2.5 (3B)",
    bestFor: ["general", "analysis"],
    description: "Compact reasoning model",
    color: "purple",
  },
  "mistral:7b": {
    label: "Mistral",
    bestFor: ["general", "analysis"],
    description: "Great all-rounder",
    color: "indigo",
  },
  "deepseek-coder:6.7b": {
    label: "DeepSeek Coder",
    bestFor: ["code"],
    description: "Code generation & debugging",
    color: "green",
  },
  "codellama:7b": {
    label: "Code Llama",
    bestFor: ["code"],
    description: "Code completion & review",
    color: "green",
  },
  "phi3:mini": {
    label: "Phi-3 Mini",
    bestFor: ["general", "code"],
    description: "Tiny but capable",
    color: "amber",
  },
}

export function getModelForTask(category: TaskCategory): string {
  for (const [name, info] of Object.entries(MODEL_INFO)) {
    if (info.bestFor.includes(category)) {
      return name
    }
  }
  return "llama3.2:3b"
}

export function getModelInfo(name: string): ModelInfo | null {
  const base = name.includes(":") ? name : `${name}:latest`
  return MODEL_INFO[base] || MODEL_INFO[name] || null
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)}MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)}KB`
  return `${bytes}B`
}

export async function listModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`)
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.models.map((m: { name: string; modified_at: string; size: number }) => ({
    name: m.name,
    modifiedAt: m.modified_at,
    size: m.size,
  }))
}

export async function* chatStream(body: OllamaChatRequest): AsyncGenerator<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama error ${res.status}: ${err}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const parsed: OllamaChatResponse = JSON.parse(line)
        if (parsed.message?.content) {
          yield parsed.message.content
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}

export async function chatOnce(body: OllamaChatRequest): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: false }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama error ${res.status}: ${err}`)
  }

  const data: OllamaChatResponse = await res.json()
  return data.message?.content || ""
}
