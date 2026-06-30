export interface Conversation {
  id: string
  sessionId: string
  title: string
  model: string
  systemPrompt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  type: "image" | "text" | "document"
  name: string
  data?: string
  mime?: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  attachmentType?: string | null
  attachmentName?: string | null
  attachments?: Attachment[]
}

export interface OllamaModel {
  name: string
  modifiedAt: string
  size: number
}

export type MultimodalContent = { type: string; text?: string; image_url?: { url: string } }[]

export interface OllamaChatRequest {
  model: string
  messages: { role: string; content: string | MultimodalContent }[]
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
  /** True for vision-capable (multimodal) models. */
  vision?: boolean
}

export interface AppConfig {
  groq: boolean
  visionModel: string
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

export interface PromptTemplate {
  name: string
  description: string
  content: string
}
