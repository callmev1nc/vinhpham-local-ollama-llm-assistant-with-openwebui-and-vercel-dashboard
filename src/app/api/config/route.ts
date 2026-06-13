import { NextResponse } from "next/server"
import { isGroq, getVisionModel } from "@/lib/ollama"

/**
 * Non-sensitive runtime configuration for the client. Lets the UI know which
 * provider is active and which model will be used for image analysis, so it can
 * auto-pull a local vision model before sending an image (privacy-first path).
 */
export async function GET() {
  return NextResponse.json({
    groq: isGroq(),
    visionModel: getVisionModel(),
  })
}
