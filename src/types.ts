export interface Conversation {
  id: string
  title: string
  model: string
  systemPrompt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export interface OllamaModel {
  name: string
  modifiedAt: string
  size: number
}

export interface OllamaChatRequest {
  model: string
  messages: { role: string; content: string }[]
  stream?: boolean
}

export interface OllamaChatResponse {
  model: string
  createdAt: string
  message: { role: string; content: string }
  done: boolean
}

export type TaskCategory = "general" | "code" | "analysis" | "creative"

export interface ModelInfo {
  label: string
  bestFor: TaskCategory[]
  description: string
  color: string
}

export interface ClassificationResult {
  category: TaskCategory
  confidence: number
  model: string
  reason: string
}

export interface PullProgress {
  model: string
  status: string
  completed?: number
  total?: number
  percent?: number
}
