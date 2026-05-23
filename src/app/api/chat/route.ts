import { NextRequest } from "next/server"
import { db } from "@/db"
import { conversations, messages } from "@/db/schema"
import { chatStream } from "@/lib/ollama"
import { eq } from "drizzle-orm"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const { conversationId, model, content, regenerate } = await req.json()

  if (!conversationId || !model || !content) {
    return new Response("Missing required fields", { status: 400 })
  }

  if (!regenerate) {
    const userMessageId = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.insert(messages).values({
      id: userMessageId,
      conversationId,
      role: "user",
      content,
      createdAt: now,
    })
  }

  const conv = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .get()

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)

  const ollamaMessages: { role: string; content: string }[] = []
  if (conv?.systemPrompt) {
    ollamaMessages.push({ role: "system", content: conv.systemPrompt })
  }
  ollamaMessages.push(
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    }))
  )

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ""

      try {
        for await (const token of chatStream({ model, messages: ollamaMessages })) {
          fullResponse += token
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
        }

        const assistantMessageId = crypto.randomUUID()
        await db.insert(messages).values({
          id: assistantMessageId,
          conversationId,
          role: "assistant",
          content: fullResponse,
          createdAt: new Date().toISOString(),
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
