import type { ClassificationResult, TaskCategory } from "@/types"
import { getModelForTask } from "./ollama"

interface Pattern {
  keywords: string[]
  category: TaskCategory
}

const PATTERNS: Pattern[] = [
  {
    category: "code",
    keywords: [
      "write a function", "write code", "code", "function", "class", "implement",
      "debug", "bug", "error", "fix", "compile", "syntax", "algorithm",
      "api", "endpoint", "route", "html", "css", "javascript", "typescript",
      "python", "java", "go", "rust", "react", "node", "sql", "query",
      "database", "schema", "migration", "refactor", "optimize", "performance",
      "pull request", "code review", "unit test", "test case", "script",
    ],
  },
  {
    category: "analysis",
    keywords: [
      "explain", "analyze", "analyse", "compare", "contrast", "summarize",
      "summarise", "why is", "why does", "how does", "what is", "define",
      "meaning of", "interpret", "reason", "argument", "pros and cons",
      "evaluate", "implications", "causes", "effects", "relationship",
      "difference between", "similarities", "overview of", "break down",
    ],
  },
  {
    category: "creative",
    keywords: [
      "write a story", "poem", "poetry", "creative", "essay", "narrative",
      "imagine", "compose", "create a", "invent", "story about",
      "fictional", "dialogue", "script", "lyrics", "describe a scene",
    ],
  },
]

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

export function classifyPrompt(prompt: string): ClassificationResult {
  const normalized = normalize(prompt)
  let bestCategory: TaskCategory = "general"
  let bestScore = 0
  let bestReason = ""

  for (const pattern of PATTERNS) {
    let score = 0
    let matched: string[] = []

    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword)) {
        score++
        if (matched.length < 3) matched.push(keyword)
      }
    }

    // Boost score if keyword appears early in the prompt
    for (const keyword of pattern.keywords) {
      const idx = normalized.indexOf(keyword)
      if (idx >= 0 && idx < 30) {
        score += 2
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestCategory = pattern.category
      bestReason = matched.length > 0
        ? `Detected: ${matched.join(", ")}`
        : ""
    }
  }

  return {
    category: bestCategory,
    confidence: Math.min(bestScore / 5, 1),
    model: getModelForTask(bestCategory),
    reason: bestCategory === "general" ? "" : bestReason,
  }
}
