import type { PromptTemplate } from "@/types"

export const templates: PromptTemplate[] = [
  {
    name: "Explain like I'm 5",
    description: "Simplify a complex concept",
    content: "Explain this like I'm 5 years old:\n\n",
  },
  {
    name: "Code review",
    description: "Review code for issues",
    content: "Review this code for bugs, performance issues, and style improvements:\n\n",
  },
  {
    name: "Brainstorm",
    description: "Generate ideas on a topic",
    content: "Brainstorm 5-10 creative ideas about:\n\n",
  },
  {
    name: "Summarize",
    description: "Summarize a text concisely",
    content: "Summarize the following in 3-5 bullet points:\n\n",
  },
  {
    name: "Write a test",
    description: "Generate unit tests for code",
    content: "Write comprehensive unit tests for:\n\n",
  },
  {
    name: "Refactor",
    description: "Suggest code improvements",
    content: "Suggest refactoring improvements for this code:\n\n",
  },
  {
    name: "Debug help",
    description: "Troubleshoot an error",
    content: "Help me debug this issue. I'm getting:\n\nError: \nCode: \nExpected: \nActual: \n\n",
  },
]
