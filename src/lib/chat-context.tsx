"use client"

import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from "react"
import type { Conversation, Message, ClassificationResult, PullProgress, Attachment, AppConfig } from "@/types"
import { classifyPrompt } from "@/lib/classifier"
import { getDefaultModel } from "@/lib/ollama"
import { readFileToAttachment } from "@/lib/file-read"

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return ""
  const existing = localStorage.getItem("vaultchat_session")
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem("vaultchat_session", id)
  return id
}

function getSessionHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const sessionId = getOrCreateSessionId()
  return { "X-Session-Id": sessionId, "Content-Type": "application/json" }
}

interface ModelSwitchInfo {
  detected: ClassificationResult
  switched: boolean
  from: string
  to: string
}

interface ChatState {
  conversations: Conversation[]
  activeId: string | null
  messages: Message[]
  streaming: boolean
  pulling: boolean
  pullProgress: PullProgress | null
  error: string | null
  autoSwitch: boolean
  modelSwitch: ModelSwitchInfo | null
  modelListVersion: number
  config: AppConfig | null
  pendingAttachments: Attachment[]
  attachmentError: string | null
}

type Action =
  | { type: "SET_CONVERSATIONS"; conversations: Conversation[] }
  | { type: "SET_ACTIVE"; id: string; messages: Message[] }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "UPDATE_STREAM"; token: string }
  | { type: "APPEND_STREAM"; id: string; content: string }
  | { type: "SET_STREAMING"; streaming: boolean }
  | { type: "SET_PULLING"; pulling: boolean }
  | { type: "SET_PULL_PROGRESS"; progress: PullProgress | null }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "REMOVE_CONVERSATION"; id: string }
  | { type: "SET_AUTO_SWITCH"; value: boolean }
  | { type: "SET_MODEL_SWITCH"; info: ModelSwitchInfo | null }
  | { type: "UPDATE_CONVERSATION_MODEL"; id: string; model: string }
  | { type: "REMOVE_LAST_ASSISTANT" }
  | { type: "UPDATE_SYSTEM_PROMPT"; id: string; systemPrompt: string }
  | { type: "INCREMENT_MODEL_LIST_VERSION" }
  | { type: "SET_CONFIG"; config: AppConfig | null }
  | { type: "SET_PENDING_ATTACHMENTS"; attachments: Attachment[] }
  | { type: "SET_ATTACHMENT_ERROR"; error: string | null }

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.conversations }
    case "SET_ACTIVE":
      return { ...state, activeId: action.id, messages: action.messages, error: null, modelSwitch: null }
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] }
    case "UPDATE_STREAM": {
      const msgs = [...state.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + action.token }
      } else {
        msgs.push({
          id: "streaming",
          conversationId: state.activeId!,
          role: "assistant",
          content: action.token,
          createdAt: new Date().toISOString(),
        })
      }
      return { ...state, messages: msgs }
    }
    case "APPEND_STREAM": {
      const msgs = [...state.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, id: action.id, content: last.content }
      }
      return { ...state, messages: msgs }
    }
    case "SET_STREAMING":
      return { ...state, streaming: action.streaming }
    case "SET_PULLING":
      return { ...state, pulling: action.pulling }
    case "SET_PULL_PROGRESS":
      return { ...state, pullProgress: action.progress }
    case "SET_ERROR":
      return { ...state, error: action.error }
    case "REMOVE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.filter((c) => c.id !== action.id),
        activeId: state.activeId === action.id ? null : state.activeId,
        messages: state.activeId === action.id ? [] : state.messages,
      }
    case "SET_AUTO_SWITCH":
      return { ...state, autoSwitch: action.value }
    case "SET_MODEL_SWITCH":
      return { ...state, modelSwitch: action.info }
    case "UPDATE_CONVERSATION_MODEL":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.id ? { ...c, model: action.model } : c
        ),
      }
    case "REMOVE_LAST_ASSISTANT": {
      const msgs = [...state.messages]
      if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
        msgs.pop()
      }
      return { ...state, messages: msgs }
    }
    case "UPDATE_SYSTEM_PROMPT":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.id ? { ...c, systemPrompt: action.systemPrompt } : c
        ),
      }
    case "INCREMENT_MODEL_LIST_VERSION":
      return { ...state, modelListVersion: state.modelListVersion + 1 }
    case "SET_CONFIG":
      return { ...state, config: action.config }
    case "SET_PENDING_ATTACHMENTS":
      return { ...state, pendingAttachments: action.attachments }
    case "SET_ATTACHMENT_ERROR":
      return { ...state, attachmentError: action.error }
    default:
      return state
  }
}

interface ChatContextValue {
  state: ChatState
  dispatch: React.Dispatch<Action>
  loadConversations: () => Promise<void>
  loadConfig: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  newConversation: (model?: string) => Promise<string>
  sendMessage: (content: string, options?: { regenerate?: boolean; attachments?: Attachment[] }) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  setAutoSwitch: (value: boolean) => void
  switchModel: (id: string, model: string) => Promise<void>
  stopStreaming: () => void
  regenerateMessage: () => Promise<void>
  updateSystemPrompt: (id: string, systemPrompt: string) => Promise<void>
  addFiles: (files: File[]) => Promise<void>
  removeAttachment: (index: number) => void
  clearAttachments: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

async function pullModel(name: string, onProgress: (p: PullProgress) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch("/api/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pull failed: ${err}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error("No response stream")

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    const lines = text.split("\n")

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data: ")) continue

      try {
        const parsed = JSON.parse(trimmed.slice(6))
        if (parsed.error) throw new Error(parsed.error)

        const progress: PullProgress = {
          model: name,
          status: parsed.status,
          completed: parsed.completed,
          total: parsed.total,
          percent: parsed.total ? Math.round((parsed.completed / parsed.total) * 100) : undefined,
        }
        onProgress(progress)
      } catch (e) {
        if (!(e instanceof SyntaxError)) throw e
      }
    }
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    conversations: [],
    activeId: null,
    messages: [],
    streaming: false,
    pulling: false,
    pullProgress: null,
    error: null,
    autoSwitch: true,
    modelSwitch: null,
    modelListVersion: 0,
    config: null,
    pendingAttachments: [],
    attachmentError: null,
  })

  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  })

  const abortRef = useRef<AbortController | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { headers: getSessionHeaders() })
      const data = await res.json()
      dispatch({ type: "SET_CONVERSATIONS", conversations: data.conversations })
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load conversations" })
    }
  }, [])

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config")
      const data = await res.json()
      dispatch({ type: "SET_CONFIG", config: { groq: data.groq, visionModel: data.visionModel } })
    } catch {
      // Non-fatal: image auto-pull simply won't run.
    }
  }, [])

  /** Read + validate files (picker, drag-drop, or paste) into pending attachments. */
  const addFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    dispatch({ type: "SET_ATTACHMENT_ERROR", error: null })
    const results = await Promise.all(files.map((f) => readFileToAttachment(f)))
    const ok: Attachment[] = []
    let error: string | null = null
    for (const r of results) {
      if (r.ok) ok.push(r.attachment)
      else if (!error) error = r.error
    }
    if (error) dispatch({ type: "SET_ATTACHMENT_ERROR", error })
    if (ok.length) {
      const prev = stateRef.current.pendingAttachments
      dispatch({ type: "SET_PENDING_ATTACHMENTS", attachments: [...prev, ...ok] })
    }
  }, [])

  const removeAttachment = useCallback((index: number) => {
    const prev = stateRef.current.pendingAttachments
    dispatch({ type: "SET_PENDING_ATTACHMENTS", attachments: prev.filter((_, i) => i !== index) })
  }, [])

  const clearAttachments = useCallback(() => {
    dispatch({ type: "SET_PENDING_ATTACHMENTS", attachments: [] })
    dispatch({ type: "SET_ATTACHMENT_ERROR", error: null })
  }, [])

  const selectConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { headers: getSessionHeaders() })
      const data = await res.json()
      dispatch({ type: "SET_ACTIVE", id, messages: data.messages })
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load conversation" })
    }
  }, [])

  const newConversation = useCallback(async (model?: string) => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: getSessionHeaders(),
      body: JSON.stringify(model ? { model } : {}),
    })
    const data = await res.json()
    await loadConversations()
    dispatch({ type: "SET_ACTIVE", id: data.conversation.id, messages: [] })
    return data.conversation.id
  }, [loadConversations])

  const switchModel = useCallback(async (id: string, model: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: getSessionHeaders(),
      body: JSON.stringify({ model }),
    })
    dispatch({ type: "UPDATE_CONVERSATION_MODEL", id, model })
  }, [])

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    dispatch({ type: "SET_STREAMING", streaming: false })
    dispatch({ type: "SET_PULLING", pulling: false })
    dispatch({ type: "SET_PULL_PROGRESS", progress: null })
  }, [])

  /** Pull a model on demand with progress UI. Returns "ok" | "aborted" | "error". */
  const ensureModelPulled = useCallback(async (
    modelName: string,
    signal: AbortSignal
  ): Promise<"ok" | "aborted" | "error"> => {
    dispatch({ type: "SET_PULLING", pulling: true })
    try {
      await pullModel(modelName, (progress) => {
        dispatch({ type: "SET_PULL_PROGRESS", progress })
      }, signal)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        dispatch({ type: "SET_PULLING", pulling: false })
        dispatch({ type: "SET_PULL_PROGRESS", progress: null })
        dispatch({ type: "SET_STREAMING", streaming: false })
        abortRef.current = null
        return "aborted"
      }
      const msg = err instanceof Error ? err.message : "Failed to download model"
      dispatch({ type: "SET_ERROR", error: msg })
      dispatch({ type: "SET_PULLING", pulling: false })
      dispatch({ type: "SET_STREAMING", streaming: false })
      abortRef.current = null
      return "error"
    }
    dispatch({ type: "SET_PULL_PROGRESS", progress: null })
    dispatch({ type: "SET_PULLING", pulling: false })
    dispatch({ type: "INCREMENT_MODEL_LIST_VERSION" })
    return "ok"
  }, [])

  const sendMessage = useCallback(async (content: string, options?: { regenerate?: boolean; attachments?: Attachment[] }) => {
    const s = stateRef.current
    if (s.streaming || s.pulling) return

    const attachments = options?.attachments

    let conversationId: string = s.activeId!
    if (!conversationId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: getSessionHeaders(),
        body: JSON.stringify({}),
      })
      const data = await res.json()
      conversationId = data.conversation.id
      dispatch({ type: "SET_ACTIVE", id: conversationId, messages: [] })
      await loadConversations()
    }

    if (!options?.regenerate) {
      dispatch({
        type: "ADD_MESSAGE",
        message: {
          id: crypto.randomUUID(),
          conversationId,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
          attachmentType: attachments?.[0]?.type || null,
          attachmentName: attachments?.[0]?.name || null,
          attachments: attachments?.map((a) => ({
            type: a.type,
            name: a.name,
            ...(a.type === "image" && a.data ? { data: a.data } : {}),
          })),
        },
      })

      const isFirstMessage = s.messages.length === 0
      if (isFirstMessage) {
        const clean = content.replace(/\n/g, " ").trim()
        const title = clean.length > 50 ? clean.slice(0, 50).trimEnd() + "..." : clean
        await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: getSessionHeaders(),
          body: JSON.stringify({ title }),
        })
        await loadConversations()
      }
    }

    const abortController = new AbortController()
    abortRef.current = abortController

    dispatch({ type: "SET_STREAMING", streaming: true })
    dispatch({ type: "SET_ERROR", error: null })

    let model = s.conversations.find((c) => c.id === conversationId)?.model || getDefaultModel()
    let switched = false

    if (s.autoSwitch) {
      const classification = classifyPrompt(content)
      if (classification.category !== "general" && classification.model !== model) {
        dispatch({
          type: "SET_MODEL_SWITCH",
          info: {
            detected: classification,
            switched: true,
            from: model,
            to: classification.model,
          },
        })
        model = classification.model
        switched = true
      } else {
        dispatch({ type: "SET_MODEL_SWITCH", info: null })
      }
    } else {
      dispatch({ type: "SET_MODEL_SWITCH", info: null })
    }

    if (switched) {
      const result = await ensureModelPulled(model, abortController.signal)
      if (result !== "ok") return
      await switchModel(conversationId, model)
    }

    // Image analysis routes to a dedicated vision model; pull it locally so the
    // first picture doesn't 404. Groq hosts its own model, so no pull is needed there.
    if (attachments?.some((a) => a.type === "image") && !s.config?.groq && s.config?.visionModel) {
      const result = await ensureModelPulled(s.config.visionModel, abortController.signal)
      if (result !== "ok") return
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: getSessionHeaders(),
        body: JSON.stringify({ conversationId, model, content, regenerate: options?.regenerate, attachments }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split("\n")

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith("data: ")) continue

          try {
            const parsed = JSON.parse(trimmed.slice(6))
            if (parsed.token) {
              dispatch({ type: "UPDATE_STREAM", token: parsed.token })
            }
            if (parsed.done) {
              dispatch({ type: "APPEND_STREAM", id: parsed.messageId, content: "" })
            }
            if (parsed.error) {
              dispatch({ type: "SET_ERROR", error: parsed.error })
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Stream was cancelled
      } else {
        const msg = err instanceof Error ? err.message : "Failed to send message"
        dispatch({ type: "SET_ERROR", error: msg })
      }
    }

    abortRef.current = null
    dispatch({ type: "SET_STREAMING", streaming: false })
    await loadConversations()
  }, [loadConversations, switchModel, ensureModelPulled])

  const regenerateMessage = useCallback(async () => {
    const s = stateRef.current
    if (s.streaming || s.pulling) return
    if (s.messages.length < 2) return

    const lastMsg = s.messages[s.messages.length - 1]
    if (lastMsg.role !== "assistant") return

    dispatch({ type: "REMOVE_LAST_ASSISTANT" })

    const secondLast = s.messages[s.messages.length - 2]
    if (secondLast.role === "user") {
      await sendMessage(secondLast.content, { regenerate: true })
    }
  }, [sendMessage])

  const updateSystemPrompt = useCallback(async (id: string, systemPrompt: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: getSessionHeaders(),
      body: JSON.stringify({ systemPrompt }),
    })
    dispatch({ type: "UPDATE_SYSTEM_PROMPT", id, systemPrompt })
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    await fetch(`/api/conversations/${id}`, { headers: getSessionHeaders(), method: "DELETE" })
    dispatch({ type: "REMOVE_CONVERSATION", id })
  }, [])

  const renameConversation = useCallback(async (id: string, title: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: getSessionHeaders(),
      body: JSON.stringify({ title }),
    })
    await loadConversations()
  }, [loadConversations])

  const setAutoSwitch = useCallback((value: boolean) => {
    dispatch({ type: "SET_AUTO_SWITCH", value })
  }, [])

  useEffect(() => {
    loadConversations()
    loadConfig()
  }, [loadConversations, loadConfig])

  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => dispatch({ type: "SET_ERROR", error: null }), 5000)
      return () => clearTimeout(timer)
    }
  }, [state.error])

  const value: ChatContextValue = {
    state,
    dispatch,
    loadConversations,
    selectConversation,
    newConversation,
    sendMessage,
    deleteConversation,
    renameConversation,
    setAutoSwitch,
    switchModel,
    stopStreaming,
    regenerateMessage,
    updateSystemPrompt,
    loadConfig,
    addFiles,
    removeAttachment,
    clearAttachments,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within ChatProvider")
  return ctx
}
