import type { OllamaModel, OllamaChatRequest, OllamaChatResponse, ModelInfo, TaskCategory } from "@/types"

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const GROQ_API_KEY = process.env.GROQ_API_KEY || ""
const GROQ_BASE = "https://api.groq.com/openai/v1"

export function isGroq(): boolean {
  return GROQ_API_KEY.length > 0
}

const OLLAMA_TO_GROQ: Record<string, string> = {
  "llama3.2:3b": "llama-3.3-70b-versatile",
  "llama3.2:1b": "llama-3.2-1b-preview",
  "llama3.1:8b": "llama-3.3-70b-versatile",
  "qwen2.5:7b": "mixtral-8x7b-32768",
  "qwen2.5:3b": "gemma2-9b-it",
  "deepseek-coder:6.7b": "llama-3.3-70b-versatile",
  "codellama:7b": "llama-3.3-70b-versatile",
  "mistral:7b": "mixtral-8x7b-32768",
  "phi3:mini": "llama-3.1-8b-instant",
}

export function remapModelForProvider(model: string): string {
  if (!isGroq()) return model
  return OLLAMA_TO_GROQ[model] || model
}

export const OLLAMA_MODEL_INFO: Record<string, ModelInfo> = {
  "llama3.2:3b": { label: "Llama 3.2", bestFor: ["general"], description: "Fast general chat & Q&A", color: "blue" },
  "llama3.2:1b": { label: "Llama 3.2 (1B)", bestFor: ["general"], description: "Ultra-lightweight chat", color: "blue" },
  "llama3.1:8b": { label: "Llama 3.1", bestFor: ["general", "analysis"], description: "Balanced general purpose", color: "blue" },
  "qwen2.5:7b": { label: "Qwen 2.5", bestFor: ["analysis", "creative", "general"], description: "Reasoning, analysis & creative", color: "purple" },
  "deepseek-coder:6.7b": { label: "DeepSeek Coder", bestFor: ["code"], description: "Code generation & debugging", color: "green" },
  "codellama:7b": { label: "Code Llama", bestFor: ["code"], description: "Code completion & review", color: "green" },
  "mistral:7b": { label: "Mistral", bestFor: ["general", "analysis"], description: "Great all-rounder", color: "indigo" },
  "phi3:mini": { label: "Phi-3 Mini", bestFor: ["general", "code"], description: "Tiny but capable", color: "amber" },
}

export const GROQ_MODEL_INFO: Record<string, ModelInfo> = {
  "llama-3.3-70b-versatile": { label: "Llama 3.3 70B", bestFor: ["general", "analysis", "creative"], description: "Powerful all-purpose", color: "blue" },
  "llama-3.1-8b-instant": { label: "Llama 3.1 8B", bestFor: ["general"], description: "Fast general chat", color: "blue" },
  "llama-3.2-1b-preview": { label: "Llama 3.2 1B", bestFor: ["general"], description: "Ultra-fast lightweight", color: "sky" },
  "mixtral-8x7b-32768": { label: "Mixtral 8x7B", bestFor: ["analysis", "creative"], description: "Reasoning with large context", color: "purple" },
  "gemma2-9b-it": { label: "Gemma 2 9B", bestFor: ["analysis", "general"], description: "Great analysis & reasoning", color: "indigo" },
  "deepseek-r1-distill-llama-70b": { label: "Llama 3.3 70B (code)", bestFor: ["code", "analysis"], description: "Code & reasoning (replaces decommissioned DeepSeek)", color: "green" },
}

export const MODEL_INFO: Record<string, ModelInfo> = { ...OLLAMA_MODEL_INFO, ...GROQ_MODEL_INFO }

const GROQ_DEFAULT = "llama-3.3-70b-versatile"
const OLLAMA_DEFAULT = "llama3.2:3b"

export function getDefaultModel(): string {
  return isGroq() ? GROQ_DEFAULT : OLLAMA_DEFAULT
}

export function getModelForTask(category: TaskCategory): string {
  const models = isGroq() ? GROQ_MODEL_INFO : OLLAMA_MODEL_INFO
  for (const [name, info] of Object.entries(models)) {
    if (info.bestFor.includes(category)) {
      return name
    }
  }
  return getDefaultModel()
}

export function getModelInfo(name: string): ModelInfo | null {
  return MODEL_INFO[name] || OLLAMA_MODEL_INFO[name.includes(":") ? name : `${name}:latest`] || null
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)}MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)}KB`
  return `${bytes}B`
}

// --- Ollama provider ---

export async function listOllamaModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`)
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.models.map((m: { name: string; modified_at: string; size: number }) => ({
    name: m.name,
    modifiedAt: m.modified_at,
    size: m.size,
  }))
}

export async function* ollamaChatStream(body: OllamaChatRequest): AsyncGenerator<string> {
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

// --- Groq provider ---

interface GroqModel {
  id: string
  owned_by: string
}

export async function listGroqModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${GROQ_BASE}/models`, {
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const data = await res.json()
  return data.data
    .filter((m: GroqModel) => MODEL_INFO[m.id])
    .map((m: GroqModel) => ({
      name: m.id,
      modifiedAt: new Date().toISOString(),
      size: 0,
    }))
}

export async function* groqChatStream(messages: { role: string; content: string }[], model: string): AsyncGenerator<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
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
      const trimmed = line.trim()
      if (!trimmed || trimmed === "data: [DONE]") continue
      if (!trimmed.startsWith("data: ")) continue

      try {
        const parsed = JSON.parse(trimmed.slice(6))
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // skip malformed lines
      }
    }
  }
}

// --- Unified interface ---

export async function listModels(): Promise<OllamaModel[]> {
  return isGroq() ? listGroqModels() : listOllamaModels()
}

export async function* chatStream(body: OllamaChatRequest): AsyncGenerator<string> {
  if (isGroq()) {
    yield* groqChatStream(body.messages, body.model)
  } else {
    yield* ollamaChatStream(body)
  }
}
