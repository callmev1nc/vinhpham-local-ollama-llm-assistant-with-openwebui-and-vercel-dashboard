/**
 * Server-only document text extraction for PDF / DOCX / XLSX / CSV / ODS.
 * Parsers are imported dynamically so the heavy wasm/JS only loads when a
 * document is actually parsed, keeping the chat route bundle small.
 */

/** Soft cap on extracted text (~50K tokens) to protect the model's context window. */
const MAX_DOC_TEXT = 200_000

function extOf(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
}

function cap(text: string): string {
  return text.length > MAX_DOC_TEXT
    ? text.slice(0, MAX_DOC_TEXT) +
        `\n\n[…truncated — document exceeded ${MAX_DOC_TEXT} characters…]`
    : text
}

/** Extract plain text from a binary document. `data` is the raw file bytes. */
export async function extractDocumentText(name: string, data: Uint8Array): Promise<string> {
  const ext = extOf(name)
  try {
    if (ext === ".pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf")
      const pdf = await getDocumentProxy(data)
      const { text } = await extractText(pdf, { mergePages: true })
      return cap(
        (text || "").trim() ||
          "(No extractable text — this PDF may be scanned images. Try an image attachment for OCR.)"
      )
    }

    if (ext === ".docx") {
      const { default: mammoth } = await import("mammoth")
      const arrayBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer
      const result = await mammoth.extractRawText({ arrayBuffer })
      return cap((result.value || "").trim() || "(No extractable text in this .docx)")
    }

    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv" || ext === ".ods") {
      const XLSX = await import("xlsx")
      const wb = XLSX.read(data, { type: "array" })
      const body = wb.SheetNames.map(
        (sheet) => `### Sheet: ${sheet}\n${XLSX.utils.sheet_to_csv(wb.Sheets[sheet])}`
      ).join("\n\n")
      return cap(body.trim() || "(Empty spreadsheet)")
    }

    throw new Error(`Unsupported document type: ${ext || "(none)"}`)
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Unsupported")) throw err
    throw new Error(
      `Failed to parse ${name}: ${err instanceof Error ? err.message : "unknown error"}`
    )
  }
}
