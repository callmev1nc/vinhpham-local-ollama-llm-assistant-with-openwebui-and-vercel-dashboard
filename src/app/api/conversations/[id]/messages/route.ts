import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { messages, conversations } from "@/db/schema"
import { eq, and, gte } from "drizzle-orm"

function getSessionId(req: NextRequest): string {
  return req.headers.get("x-session-id") || req.nextUrl.searchParams.get("sessionId") || ""
}

/**
 * DELETE /api/conversations/:id/messages
 * Body: { afterMessageId: string }
 *
 * Deletes the message with ID `afterMessageId` and every message after it
 * within the conversation. Cascade rules on the DB handle attachments cleanup.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const sessionId = getSessionId(req)
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 401 })
  }

  // Verify ownership
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.sessionId, sessionId)))
    .limit(1)

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { afterMessageId } = await req.json()
  if (!afterMessageId) {
    return NextResponse.json({ error: "afterMessageId required" }, { status: 400 })
  }

  // Find the target message to get its createdAt timestamp
  const [targetMsg] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, afterMessageId), eq(messages.conversationId, conversationId)))
    .limit(1)

  if (!targetMsg) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  // Delete the target message and everything after it
  await db
    .delete(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        gte(messages.createdAt, targetMsg.createdAt)
      )
    )

  return NextResponse.json({ success: true })
}
