"use client"

import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from "react"
import type { Conversation, Message, ClassificationResult, PullProgress } from "@/types"
import { classifyPrompt } from "@/lib/classifier"

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
    default:
      return state
  }
}

interface ChatContextValue {
  state: ChatState
  dispatch: React.Dispatch<Action>
  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  newConversation: (model?: string) => Promise<string>
  sendMessage: (content: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  setAutoSwitch: (value: boolean) => void
  switchModel: (id: string, model: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | null>(null)

async function pullModel(name: string, onProgress: (p: PullProgress) => void): Promise<void> {
  const res = await fetch("/api/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name }),
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
      } catch {
        // skip malformed lines
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
  })

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations")
      const data = await res.json()
      dispatch({ type: "SET_CONVERSATIONS", conversations: data.conversations })
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load conversations" })
    }
  }, [])

  const selectConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const data = await res.json()
      dispatch({ type: "SET_ACTIVE", id, messages: data.messages })
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load conversation" })
    }
  }, [])

  const newConversation = useCallback(async (model = "llama3.2:3b") => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    })
    const data = await res.json()
    await loadConversations()
    dispatch({ type: "SET_ACTIVE", id: data.conversation.id, messages: [] })
    return data.conversation.id
  }, [loadConversations])

  const switchModel = useCallback(async (id: string, model: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    })
    dispatch({ type: "UPDATE_CONVERSATION_MODEL", id, model })
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (state.streaming || state.pulling) return

    // Ensure we have an active conversation — create one if needed
    let conversationId: string = state.activeId!
    if (!conversationId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama3.2:3b" }),
      })
      const data = await res.json()
      conversationId = data.conversation.id
      dispatch({ type: "SET_ACTIVE", id: conversationId, messages: [] })
      await loadConversations()
    }

    dispatch({
      type: "ADD_MESSAGE",
      message: {
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      },
    })

    dispatch({ type: "SET_STREAMING", streaming: true })
    dispatch({ type: "SET_ERROR", error: null })

    let model = state.conversations.find((c) => c.id === conversationId)?.model || "llama3.2:3b"
    let switched = false

    if (state.autoSwitch) {
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

    // Pull model if needed
    if (switched) {
      dispatch({ type: "SET_PULLING", pulling: true })

      try {
        await pullModel(model, (progress) => {
          dispatch({ type: "SET_PULL_PROGRESS", progress })
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to download model"
        dispatch({ type: "SET_ERROR", error: msg })
        dispatch({ type: "SET_PULLING", pulling: false })
        dispatch({ type: "SET_STREAMING", streaming: false })
        return
      }

      dispatch({ type: "SET_PULL_PROGRESS", progress: null })
      dispatch({ type: "SET_PULLING", pulling: false })
      await switchModel(conversationId, model)
    }

    // Send the actual message
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, model, content }),
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
      const msg = err instanceof Error ? err.message : "Failed to send message"
      dispatch({ type: "SET_ERROR", error: msg })
    }

    dispatch({ type: "SET_STREAMING", streaming: false })
    await loadConversations()
  }, [state.activeId, state.streaming, state.pulling, state.autoSwitch, state.conversations, loadConversations, switchModel])

  const deleteConversation = useCallback(async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" })
    dispatch({ type: "REMOVE_CONVERSATION", id })
  }, [])

  const renameConversation = useCallback(async (id: string, title: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    await loadConversations()
  }, [loadConversations])

  const setAutoSwitch = useCallback((value: boolean) => {
    dispatch({ type: "SET_AUTO_SWITCH", value })
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  return (
    <ChatContext.Provider
      value={{
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
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within ChatProvider")
  return ctx
}
