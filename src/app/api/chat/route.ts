import { NextRequest } from "next/server"
import { db } from "@/db"
import { conversations, messages } from "@/db/schema"
import { chatStream, remapModelForProvider, isGroq, isVisionModel, getVisionModel } from "@/lib/ollama"
import { eq, and } from "drizzle-orm"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const { conversationId, model, content, regenerate, attachment } = await req.json()

  if (!conversationId || !model || (!content && !attachment)) {
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

  const userText = content || (attachment?.type === "image" ? "Describe this image" : "Analyze this file")
  let finalContent = content || userText
  let finalModel = model

  if (attachment) {
    if (attachment.type === "image") {
      if (!isGroq()) {
        return new Response("Image analysis requires a Groq API key (GROQ_API_KEY)", { status: 400 })
      }
      finalModel = getVisionModel()
    } else if (attachment.type === "text" && attachment.data) {
      finalContent = `[File: ${attachment.name}]\n\`\`\`\n${attachment.data}\n\`\`\`\n\n---\n\n${content}`
    }
  }

  if (!regenerate) {
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      conversationId,
      role: "user",
      content: finalContent,
      attachmentType: attachment?.type || null,
      attachmentName: attachment?.name || null,
    })
  }

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)

  const ollamaMessages: { role: string; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[] = []
  if (conv?.systemPrompt) {
    ollamaMessages.push({ role: "system", content: conv.systemPrompt })
  }
  ollamaMessages.push(
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    }))
  )

  if (attachment?.type === "image" && attachment.data) {
    const lastUserIdx = ollamaMessages.length - 1
    if (ollamaMessages[lastUserIdx]?.role === "user") {
      ollamaMessages[lastUserIdx] = {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: attachment.data } },
        ],
      }
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
