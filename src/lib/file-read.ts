/**
 * Client-side file → Attachment conversion + validation. Shared by the file
 * picker, drag-and-drop, and clipboard-paste entry points.
 */
import type { Attachment } from "@/types"
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_TEXT_EXTENSIONS,
  DOC_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_TEXT_SIZE,
  MAX_DOC_SIZE,
} from "./file-constants"
import { formatBytes } from "./ollama"

export type ReadResult = { ok: true; attachment: Attachment } | { ok: false; error: string }

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
}

/** Validate + read one file into an Attachment, or return an error message. */
export async function readFileToAttachment(file: File): Promise<ReadResult> {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { ok: false, error: `Image too large (max ${formatBytes(MAX_IMAGE_SIZE)}). ${file.name} is ${formatBytes(file.size)}` }
    }
    const data = await readAsDataURL(file)
    return { ok: true, attachment: { type: "image", name: file.name, data } }
  }

  const ext = extOf(file.name)
  if (DOC_EXTENSIONS.includes(ext)) {
    if (file.size > MAX_DOC_SIZE) {
      return { ok: false, error: `Document too large (max ${formatBytes(MAX_DOC_SIZE)}). ${file.name} is ${formatBytes(file.size)}` }
    }
    const dataUrl = await readAsDataURL(file)
    const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl
    return { ok: true, attachment: { type: "document", name: file.name, data: base64, mime: file.type } }
  }

  if (ALLOWED_TEXT_EXTENSIONS.includes(ext)) {
    if (file.size > MAX_TEXT_SIZE) {
      return { ok: false, error: `File too large (max ${formatBytes(MAX_TEXT_SIZE)}). ${file.name} is ${formatBytes(file.size)}` }
    }
    const text = await readAsText(file)
    return { ok: true, attachment: { type: "text", name: file.name, data: text } }
  }

  return { ok: false, error: `Unsupported file type: ${ext || "(none)"} — ${file.name}` }
}
