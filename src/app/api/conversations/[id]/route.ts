import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { conversations, messages } from "@/db/schema"
import { eq, and } from "drizzle-orm"

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

  return NextResponse.json({ conversation: conv, messages: msgs })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionId = getSessionId(req)
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 401 })
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.sessionId, sessionId)))
    .limit(1)

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const updates: Record<string, string | Date> = { updatedAt: new Date() }
  if (body.title !== undefined) updates.title = body.title
  if (body.model !== undefined) updates.model = body.model
  if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt

  await db
    .update(conversations)
    .set(updates)
    .where(eq(conversations.id, id))

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionId = getSessionId(req)
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 401 })
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.sessionId, sessionId)))
    .limit(1)

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.delete(conversations).where(eq(conversations.id, id))
  return NextResponse.json({ success: true })
}
