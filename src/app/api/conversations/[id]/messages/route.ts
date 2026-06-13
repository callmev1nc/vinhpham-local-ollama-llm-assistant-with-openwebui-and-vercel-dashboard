import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { conversations, messages, attachments } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

function getSessionId(req: NextRequest): string {
  return req.headers.get("x-session-id") || req.nextUrl.searchParams.get("sessionId") || ""
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionId = getSessionId(req)
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 401 })
  }

  // Session isolation: verify the conversation belongs to this session.
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.sessionId, sessionId)))
    .limit(1)
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)

  const msgIds = msgs.map((m) => m.id)
  const atts = msgIds.length
    ? await db.select().from(attachments).where(inArray(attachments.messageId, msgIds))
    : []
  const attsByMsg = new Map<string, typeof atts>()
  for (const a of atts) {
    const arr = attsByMsg.get(a.messageId) ?? []
    arr.push(a)
    attsByMsg.set(a.messageId, arr)
  }
  const messagesWithAttachments = msgs.map((m) => ({
    ...m,
    attachments: (attsByMsg.get(m.id) ?? []).map((a) => ({
      type: a.type,
      name: a.name,
      mime: a.mime,
      data: a.data,
    })),
  }))

  return NextResponse.json({ messages: messagesWithAttachments })
}
