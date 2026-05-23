import { NextRequest } from "next/server"
import { db } from "@/db"
import { conversations, messages } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) {
    return new Response("Missing id parameter", { status: 400 })
  }

  const sessionId = req.headers.get("x-session-id") || req.nextUrl.searchParams.get("sessionId") || ""

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.sessionId, sessionId)))
    .limit(1)

  if (!conv) {
    return new Response("Not found", { status: 404 })
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)

  let markdown = `# ${conv.title}\n\n`
  markdown += `_Exported from VaultChat — ${new Date().toLocaleDateString()}_\n\n`
  markdown += `---\n\n`

  for (const msg of msgs) {
    const role = msg.role === "user" ? "**You**" : "**Assistant**"
    markdown += `${role}:\n\n${msg.content}\n\n---\n\n`
  }

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${conv.title.replace(/[^a-zA-Z0-9]/g, "_")}.md"`,
    },
  })
}
