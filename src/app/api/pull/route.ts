import { NextRequest } from "next/server"
import { isGroq } from "@/lib/ollama"

// Model downloads can be large and slow (multi-GB) — allow up to Hobby's 300s max.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { model } = await req.json()

  if (!model) {
    return new Response(JSON.stringify({ error: "Model name required" }), { status: 400 })
  }

  if (isGroq()) {
    return new Response(`data: ${JSON.stringify({ status: "success" })}\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    })
  }

  const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  const ollamaRes = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model, stream: true }),
  })

  if (!ollamaRes.ok) {
    const err = await ollamaRes.text()
    return new Response(JSON.stringify({ error: `Ollama pull failed: ${err}` }), {
      status: 502,
    })
  }

  const reader = ollamaRes.body?.getReader()
  if (!reader) {
    return new Response(JSON.stringify({ error: "No response body from Ollama" }), {
      status: 502,
    })
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          const lines = text.split("\n")

          for (const line of lines) {
            if (!line.trim()) continue
            controller.enqueue(encoder.encode(`data: ${line}\n\n`))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error"
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
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
