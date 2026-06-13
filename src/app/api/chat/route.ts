import { NextRequest } from "next/server"
import { db } from "@/db"
import { conversations, messages, attachments as attachmentsTable } from "@/db/schema"
import { chatStream, remapModelForProvider, isVisionModel, getVisionModel } from "@/lib/ollama"
import { extractDocumentText } from "@/lib/documents"
import type { MultimodalContent, Attachment } from "@/types"
import { eq, and, inArray } from "drizzle-orm"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const { conversationId, model, content, regenerate, attachments } = (await req.json()) as {
    conversationId?: string
    model?: string
    content?: string
    regenerate?: boolean
    attachments?: Attachment[]
  }

  if (!conversationId || !model || (!content && !(attachments && attachments.length))) {
    return new Response("Missing required fields", { status: 400 })
  }

  const sessionId = req.headers.get("x-session-id") || ""
  if (!sessionId) {
    return new Response("Session ID required", { status: 401 })
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.sessionId, sessionId)))
    .limit(1)

  if (!conv) {
    return new Response("Conversation not found", { status: 404 })
  }

  // Process attachments: images route to a vision model (Groq Llama 4 Scout or a
  // local Ollama vision model); documents are extracted; text/code is inlined.
  const list = attachments ?? []
  const imageCount = list.filter((a) => a.type === "image").length
  let finalModel = model

  const docBlocks: string[] = []
  const persisted: { type: Attachment["type"]; name: string; mime: string | null; data: string }[] = []

  for (const a of list) {
    if (a.type === "image" && a.data) {
      persisted.push({ type: "image", name: a.name, mime: a.mime ?? null, data: a.data })
    } else if (a.type === "document" && a.data) {
      const bytes = Buffer.from(a.data, "base64")
      const docText = await extractDocumentText(a.name, bytes)
      docBlocks.push(`[File: ${a.name}]\n\`\`\`\n${docText}\n\`\`\``)
      persisted.push({ type: "document", name: a.name, mime: a.mime ?? null, data: docText })
    } else if (a.type === "text" && a.data) {
      docBlocks.push(`[File: ${a.name}]\n\`\`\`\n${a.data}\n\`\`\``)
      persisted.push({ type: "text", name: a.name, mime: a.mime ?? null, data: a.data })
    }
  }

  let finalContent: string
  if (docBlocks.length > 0) {
    finalContent = `${docBlocks.join("\n\n---\n\n")}\n\n---\n\n${content || "Analyze these files"}`
  } else if (content) {
    finalContent = content
  } else {
    finalContent = imageCount > 1 ? "Describe these images" : "Describe this image"
  }

  if (!regenerate) {
    const userMessageId = crypto.randomUUID()
    await db.insert(messages).values({
      id: userMessageId,
      conversationId,
      role: "user",
      content: finalContent,
      attachmentType: persisted[0]?.type ?? null,
      attachmentName: persisted[0]?.name ?? null,
    })
    for (const a of persisted) {
      await db.insert(attachmentsTable).values({
        id: crypto.randomUUID(),
        messageId: userMessageId,
        type: a.type,
        name: a.name,
        mime: a.mime,
        data: a.data,
      })
    }
  }

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)

  // Load attachments for all history messages in a single query (no N+1).
  const messageIds = history.map((m) => m.id)
  const allAttachments = messageIds.length
    ? await db.select().from(attachmentsTable).where(inArray(attachmentsTable.messageId, messageIds))
    : []
  const attachmentsByMessage = new Map<string, typeof allAttachments>()
  for (const a of allAttachments) {
    const arr = attachmentsByMessage.get(a.messageId) ?? []
    arr.push(a)
    attachmentsByMessage.set(a.messageId, arr)
  }

  // Route to a vision model if the latest user turn includes an image — covers
  // both fresh sends and regenerations, since images are persisted to history.
  const lastUserMsg = [...history].reverse().find((m) => m.role === "user")
  if (lastUserMsg && (attachmentsByMessage.get(lastUserMsg.id) ?? []).some((a) => a.type === "image")) {
    finalModel = getVisionModel()
  }

  // Build provider messages. User messages with image attachments become
  // multimodal (text + image_url) so image context carries across turns; the
  // just-inserted message is included via the history+attachments join above.
  const ollamaMessages: { role: string; content: string | MultimodalContent }[] = []
  if (conv?.systemPrompt) {
    ollamaMessages.push({ role: "system", content: conv.systemPrompt })
  }
  for (const m of history) {
    const imgs = (attachmentsByMessage.get(m.id) ?? []).filter((a) => a.type === "image")
    if (m.role === "user" && imgs.length > 0) {
      ollamaMessages.push({
        role: "user",
        content: [
          { type: "text", text: m.content },
          ...imgs.map((a) => ({ type: "image_url" as const, image_url: { url: a.data } })),
        ],
      })
    } else {
      ollamaMessages.push({ role: m.role, content: m.content })
    }
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ""

      try {
        for await (const token of chatStream({ model: isVisionModel(finalModel) ? finalModel : remapModelForProvider(finalModel), messages: ollamaMessages })) {
          fullResponse += token
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
        }

        const assistantMessageId = crypto.randomUUID()
        await db.insert(messages).values({
          id: assistantMessageId,
          conversationId,
          role: "assistant",
          content: fullResponse,
        })

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, messageId: assistantMessageId })}\n\n`)
        )
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error"
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
        )
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
