# VaultChat

## Project Overview
A fully private AI assistant running via Ollama, accessible in the browser.
Your data never leaves your device. Supports chat, code assistance, and file analysis — all offline.

## Tech Stack
- Frontend: Next.js 16 (App Router), Tailwind CSS v4
- Backend: Next.js API routes (SSE streaming)
- Database: SQLite via Drizzle ORM
- AI: Ollama REST API (localhost:11434)
- Language: TypeScript (strict mode)

## Default Models
- `llama3.2:3b` — fast general chat (auto-downloaded if missing)
- `qwen2.5:7b` — reasoning & analysis (auto-downloaded when needed)
- `deepseek-coder:6.7b` — code assistance (auto-downloaded when needed)

## Key Features
- **Auto model routing** — prompts are classified (code/analysis/creative/general) and the best model is switched automatically
- **Auto model download** — missing models are pulled from Ollama on demand with a progress bar
- **Privacy indicator** — "100% Private" badge with Shield icon in header and empty state
- **Export as Markdown** — download any conversation as a .md file from the sidebar
- **System prompts** — custom system prompt per-conversation, saved to DB and passed to Ollama
- **Message regeneration** — RefreshCw button on last assistant message to regenerate
- **Conversation search** — filter conversations by title in the sidebar
- **Auto-title** — conversations are automatically titled from the first message
- **Abort controller** — stream cancellation with stop button (Square icon) while generating
- **Error boundary** — catches component crashes with reload UI

## Project Structure
```
src/
  app/           — Next.js App Router pages & API routes
    api/
      chat/route.ts          — POST streaming chat via Ollama
      models/route.ts        — GET list installed models
      conversations/route.ts — CRUD conversations
      conversations/[id]/route.ts — GET/PATCH/DELETE conversation
      pull/route.ts          — POST download a model (SSE)
      export/route.ts        — GET export conversation as Markdown
  components/    — React components
    ErrorBoundary.tsx        — class-based error boundary
    ChatMessages.tsx         — message bubbles with markdown + regeneration
    ChatInput.tsx            — textarea + classification chip + download progress + stop button
    Sidebar.tsx              — conversation list + search + export + settings
    ModelSelector.tsx        — dropdown with model badges
    SettingsPanel.tsx        — auto-switch toggle + system prompt + model reset
    ThemeToggle.tsx          — dark/light mode
  lib/
    ollama.ts               — Ollama API client + MODEL_INFO registry
    classifier.ts           — keyword-based prompt classifier
    chat-context.tsx         — React context for all state management
    utils.ts                — cn() helper
  db/
    schema.ts               — Drizzle schema (conversations, messages, systemPrompt column)
    index.ts                — SQLite client
  types.ts                  — Shared TypeScript types
```

## Commands
- `npm run dev` — Start dev server (localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx drizzle-kit push` — Apply schema changes (dev)

## Conventions
- Use named exports for components
- API routes return JSON or SSE streams
- All AI calls proxy through Ollama endpoint
- No hardcoded secrets — everything runs locally
- Keep API routes thin; logic in lib/ folder

## Ollama API
- Base: `http://localhost:11434`
- `POST /api/chat` — streaming chat completions
- `POST /api/generate` — non-chat generation
- `GET /api/tags` — list installed models
- `POST /api/pull` — download a model (SSE)

## Classification Categories
| Category | Keywords | Target Model |
|----------|----------|-------------|
| code     | function, debug, bug, api, sql, react, etc. | deepseek-coder:6.7b |
| analysis | explain, compare, analyze, summarize, etc. | qwen2.5:7b |
| creative | story, poem, creative, compose, etc. | qwen2.5:7b |
| general  | (default) | llama3.2:3b |

## Important Notes
- Ollama must be running (`ollama serve`) before starting the app
- Context window limit is ~8K tokens (model dependent)
- Streaming is essential — block prompts are very slow
- Auto model download shows progress bar in ChatInput area
- Auto-switch can be toggled off in the sidebar
