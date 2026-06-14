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

/** Cap extracted text (~50K tokens) to protect the model's context window. */
const MAX_DOC_TEXT = 200_000
function capText(text: string): string {
  return text.length > MAX_DOC_TEXT
    ? text.slice(0, MAX_DOC_TEXT) + "\n\n[…truncated — document exceeded 200,000 characters…]"
    : text
}

/**
 * Extract plain text from a document IN THE BROWSER (PDF/DOCX/XLSX/CSV/ODS).
 * Parsers are imported dynamically so they only load when a doc is attached,
 * keeping the initial bundle small. Doing this client-side avoids Vercel Hobby
 * serverless limits (request body size, 1GB memory, function duration) that
 * killed document uploads when parsing ran on the server.
 */
async function extractDocumentText(name: string, buf: ArrayBuffer): Promise<string> {
  const ext = extOf(name)
  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    const { text } = await extractText(pdf, { mergePages: true })
    return capText((text || "").trim() || "(No extractable text — this PDF may be scanned images.)")
  }
  if (ext === ".docx") {
    const { default: mammoth } = await import("mammoth")
    const result = await mammoth.extractRawText({ arrayBuffer: buf })
    return capText((result.value || "").trim() || "(No extractable text in this .docx)")
  }
  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv" || ext === ".ods") {
    const XLSX = await import("xlsx")
    const wb = XLSX.read(new Uint8Array(buf), { type: "array" })
    const body = wb.SheetNames.map(
      (sheet) => `### Sheet: ${sheet}\n${XLSX.utils.sheet_to_csv(wb.Sheets[sheet])}`
    ).join("\n\n")
    return capText(body.trim() || "(Empty spreadsheet)")
  }
  throw new Error(`Unsupported document type: ${ext || "(none)"}`)
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
    try {
      const buf = await file.arrayBuffer()
      const text = await extractDocumentText(file.name, buf)
      return { ok: true, attachment: { type: "document", name: file.name, data: text, mime: file.type } }
    } catch (e) {
      return { ok: false, error: `Could not read ${file.name}: ${e instanceof Error ? e.message : "unknown error"}` }
    }
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
