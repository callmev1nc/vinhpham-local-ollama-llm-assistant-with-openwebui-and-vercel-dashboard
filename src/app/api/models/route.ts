import { NextResponse } from "next/server"
import { listModels, isGroq } from "@/lib/ollama"

export async function GET() {
  try {
    const models = await listModels()
    return NextResponse.json({ models })
  } catch {
    return NextResponse.json(
      { error: isGroq() ? "Could not reach Groq API. Check your API key." : "Could not reach Ollama. Is it running?" },
      { status: 503 }
    )
  }
}
