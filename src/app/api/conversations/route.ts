import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { conversations } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import crypto from "crypto"
import { getDefaultModel } from "@/lib/ollama"

function getSessionId(req: NextRequest): string {
  return req.headers.get("x-session-id") || req.nextUrl.searchParams.get("sessionId") || ""
}

export async function GET(req: NextRequest) {
  const sessionId = getSessionId(req)
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 401 })
  }

  const all = await db
    .select()
    .from(conversations)
    .where(eq(conversations.sessionId, sessionId))
    .orderBy(desc(conversations.updatedAt))

  return NextResponse.json({ conversations: all })
}

export async function POST(req: NextRequest) {
  const sessionId = getSessionId(req)
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 401 })
  }

  const body = await req.json()

  const conv = {
    id: crypto.randomUUID(),
    sessionId,
    title: body.title || "New conversation",
    model: body.model || getDefaultModel(),
  }

  await db.insert(conversations).values(conv)
  return NextResponse.json({ conversation: conv }, { status: 201 })
}
