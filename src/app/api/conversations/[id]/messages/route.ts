import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { messages } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)

  return NextResponse.json({ messages: msgs })
}
