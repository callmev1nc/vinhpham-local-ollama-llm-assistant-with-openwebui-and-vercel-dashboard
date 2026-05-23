"use client"

import { Component, type ReactNode, type ErrorInfo } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-white dark:bg-zinc-900">
          <div className="text-center space-y-4 max-w-md px-6">
            <div className="text-4xl">⚡</div>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
              Something went wrong
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
