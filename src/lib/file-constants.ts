/**
 * Lightweight, client-safe file constants. Imported by both client components
 * and server routes. Keep heavy parser imports out of this file.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

export const ALLOWED_TEXT_EXTENSIONS = [
  ".txt", ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".md", ".csv", ".sql",
  ".css", ".html", ".sh", ".yaml", ".yml", ".toml", ".env", ".rs", ".go", ".java",
  ".c", ".cpp", ".h", ".rb", ".php",
]

export const DOC_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".xls", ".csv", ".ods"]

export const MAX_IMAGE_SIZE = 4 * 1024 * 1024
export const MAX_TEXT_SIZE = 500 * 1024
export const MAX_DOC_SIZE = 4 * 1024 * 1024

/** accept= attribute for the file input (image + text + document types). */
export const FILE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  ...ALLOWED_TEXT_EXTENSIONS,
  ...DOC_EXTENSIONS,
].join(",")
