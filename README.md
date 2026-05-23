# 🧠 VaultChat — Your Private AI

**Private AI assistant powered by Ollama + Postgres.**
Chat, code, analyze files — deployable on Vercel with a self-hosted Ollama backend.
Session-based isolation keeps conversations separate without authentication.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Ollama](https://img.shields.io/badge/ollama-%E2%89%A50.1.0-orange)

---

## ✨ Features

- **Chat with AI** — streaming responses, markdown + code highlighting
- **Smart model routing** — automatically picks the best model for code, analysis, or general chat
- **Auto-download** — missing models download on demand with a live progress bar
- **Conversation history** — persisted in Postgres, isolated per browser session
- **Dark/light theme** — toggle in the sidebar

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Postgres database (Neon, local Postgres, or Vercel Postgres)
- Ollama running on a server (local or VPS)

### Setup

```bash
# 1. Clone & install
git clone <repo>
cd vaultchat
npm install

# 2. Set up environment variables
# Create .env.local:
echo "POSTGRES_URL=postgresql://..." >> .env.local
echo "OLLAMA_BASE_URL=http://your-ollama-server:11434" >> .env.local

# 3. Push database schema
npx drizzle-kit push

# 4. Run the app
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Yes | Postgres connection string (auto-set by Vercel) |
| `OLLAMA_BASE_URL` | No | Ollama server URL (defaults to `http://localhost:11434`) |

## 💡 Why This?

| vs ChatGPT / Claude | This app |
|---------------------|----------|
| ☁️ Requires internet | 🔒 Your data stays on your infrastructure |
| 💵 Subscription or API fees | 🆓 Completely free |
| 🤖 Data goes to third parties | 🏠 Stays on your own servers |

## 🔧 Default Models

| Model | Size | Best for |
|-------|------|----------|
| `llama3.2:3b` | ~2 GB | Fast general chat |
| `qwen2.5:7b` | ~4.5 GB | Reasoning & analysis |
| `deepseek-coder:6.7b` | ~3.8 GB | Code generation & debugging |

> Models auto-download when first needed. You can toggle auto-switch off in the sidebar.

## 🖼️ Screenshots

> _(Add screenshots here — example: `./screenshots/chat.png`)_

## ❓ Troubleshooting

<details>
<summary>Web UI shows "503 Service Unavailable"</summary>

1. Check Ollama is running: `ollama serve`
2. Verify `OLLAMA_BASE_URL` is correct
3. Check Ollama is listening on the expected address
</details>

<details>
<summary>No models in the dropdown</summary>

1. Run `ollama list` to check installed models
2. If empty, run `ollama pull llama3.2:3b`
3. Reload http://localhost:3000
</details>

<details>
<summary>Database connection errors</summary>

1. Verify `POSTGRES_URL` is set correctly
2. Run `npx drizzle-kit push` to create tables
3. Check that your Postgres instance allows connections
</details>

## 📁 Project Structure

<details>
<summary>Click to expand</summary>

```
src/
  app/           — Next.js pages & API routes
  components/    — React components
  lib/           — Ollama client, classifier, chat state, utils
  db/            — Drizzle schema & Postgres client
  types.ts       — Shared TypeScript types
```
</details>

## 📄 License

MIT
