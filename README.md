# 🧠 Local AI Assistant

**Private, offline AI assistant powered by Ollama.**  
Chat, code, analyze files — all on your machine. No API keys. No data leaves your computer.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Ollama](https://img.shields.io/badge/ollama-%E2%89%A50.1.0-orange)

---

## ✨ Features

- **Chat with AI** — streaming responses, markdown + code highlighting
- **Smart model routing** — automatically picks the best model for code, analysis, or general chat
- **Auto-download** — missing models download on demand with a live progress bar
- **Conversation history** — persisted locally in SQLite, never synced to the cloud
- **Dark/light theme** — toggle in the sidebar

## 🚀 Quick Start

```bash
# 1. Install Ollama & pull a model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b

# 2. Install & run the app
npm install
npx drizzle-kit push
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> **Windows users:** replace `curl ... | sh` with:
> ```powershell
> irm https://ollama.com/install.ps1 | iex
> ```

## 💡 Why This?

| vs ChatGPT / Claude | This app |
|---------------------|----------|
| ☁️ Requires internet | 🔒 100% offline after initial model download |
| 💵 Subscription or API fees | 🆓 Completely free |
| 🤖 Data goes to third parties | 🏠 Stays on your machine |

## 🖼️ Screenshots

> _(Add screenshots here — example: `./screenshots/chat.png`)_

## 🔧 Default Models

| Model | Size | Best for |
|-------|------|----------|
| `llama3.2:3b` | ~2 GB | Fast general chat |
| `qwen2.5:7b` | ~4.5 GB | Reasoning & analysis |
| `deepseek-coder:6.7b` | ~3.8 GB | Code generation & debugging |

> Models auto-download when first needed. You can toggle auto-switch off in the sidebar.

## ❓ Troubleshooting

<details>
<summary>Web UI shows "503 Service Unavailable"</summary>

1. Open a terminal and run `ollama serve`
2. Wait for `Listening on 127.0.0.1:11434`
3. Reload http://localhost:3000
</details>

<details>
<summary>No models in the dropdown</summary>

1. Run `ollama list` to check installed models
2. If empty, run `ollama pull llama3.2:3b`
3. Reload http://localhost:3000
</details>

<details>
<summary>First code message is slow</summary>

The first time you send a code prompt, the app may download `deepseek-coder:6.7b` (~3.8 GB).  
A progress bar shows in the chat input area. Subsequent uses are instant.
</details>

## 📁 Project Structure

<details>
<summary>Click to expand</summary>

```
src/
  app/           — Next.js pages & API routes
  components/    — React components
  lib/           — Ollama client, classifier, chat state, utils
  db/            — Drizzle schema & SQLite database
  types.ts       — Shared TypeScript types
```
</details>

## 📄 License

MIT
