import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("New conversation"),
  model: text("model").notNull().default("llama3.2:3b"),
  systemPrompt: text("system_prompt"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
})
