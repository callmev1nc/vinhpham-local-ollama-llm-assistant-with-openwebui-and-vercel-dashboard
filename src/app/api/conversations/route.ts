import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { conversations } from "@/db/schema"
import { desc } from "drizzle-orm"
import crypto from "crypto"

export async function GET() {
  const all = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))

  return NextResponse.json({ conversations: all })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()

  const conv = {
    id: crypto.randomUUID(),
    title: body.title || "New conversation",
    model: body.model || "llama3.2:3b",
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(conversations).values(conv)
  return NextResponse.json({ conversation: conv }, { status: 201 })
}
