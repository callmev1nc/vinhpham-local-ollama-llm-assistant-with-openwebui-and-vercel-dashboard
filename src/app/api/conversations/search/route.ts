import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { conversations, messages } from "@/db/schema"
import { eq, and, ilike, desc } from "drizzle-orm"

function getSessionId(req: NextRequest): string {
  return req.headers.get("x-session-id") || req.nextUrl.searchParams.get("sessionId") || ""
}

/**
 * GET /api/conversations/search?q=
 *
 * Session-scoped full-text search across conversation titles and message content.
 * Returns conversation IDs with title + a content snippet.
 */
export async function GET(req: NextRequest) {
  const sessionId = getSessionId(req)
  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q") || ""
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const searchPattern = `%${q}%`

  // Find conversations matching by title
  const titleMatches = await db
    .select({
      id: conversations.id,
      title: conversations.title,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.sessionId, sessionId),
        ilike(conversations.title, searchPattern)
      )
    )
    .limit(20)

  // Find conversations with matching message content
  const contentMatches = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      snippet: messages.content,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.sessionId, sessionId),
        ilike(messages.content, searchPattern)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(20)

  // Merge, deduplicate by conversation id, preferring title matches
  const seen = new Set<string>()
  const results: { id: string; title: string; snippet: string }[] = []

  for (const r of titleMatches) {
    if (!seen.has(r.id)) {
      seen.add(r.id)
      results.push({ id: r.id, title: r.title, snippet: "" })
    }
  }

  for (const r of contentMatches) {
    if (!seen.has(r.id)) {
      seen.add(r.id)
      const snippet = r.snippet
        ? (r.snippet.length > 120 ? r.snippet.slice(0, 120) + "..." : r.snippet)
        : ""
      results.push({ id: r.id, title: r.title, snippet })
    }
  }

  return NextResponse.json({ results: results.slice(0, 20) })
}
