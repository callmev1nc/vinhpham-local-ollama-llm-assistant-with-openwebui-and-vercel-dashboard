import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { conversations, messages } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const conv = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .get()

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
  const body = await req.json()

  await db
    .update(conversations)
    .set({ title: body.title, updatedAt: new Date().toISOString() })
    .where(eq(conversations.id, id))

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.delete(conversations).where(eq(conversations.id, id))
  return NextResponse.json({ success: true })
}
