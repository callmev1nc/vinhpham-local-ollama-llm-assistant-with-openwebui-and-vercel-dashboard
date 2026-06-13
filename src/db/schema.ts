import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  title: text("title").notNull().default("New conversation"),
  model: text("model").notNull().default("llama3.2:3b"),
  systemPrompt: text("system_prompt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  attachmentType: text("attachment_type"),
  attachmentName: text("attachment_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  messageId: text("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["image", "text", "document"] }).notNull(),
  name: text("name").notNull(),
  mime: text("mime"),
  // image: full data URL (renders directly, prefix stripped for Ollama);
  // text/document: extracted text (for preview).
  data: text("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
