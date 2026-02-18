'use client'

import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
          <span className="text-4xl mb-3">😵</span>
          <h2 className="text-lg font-black text-desert-brown mb-1">
            משהו השתבש
          </h2>
          <p className="text-sm text-desert-brown/50 mb-4">
            {this.state.error?.message || 'אירעה שגיאה לא צפויה'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="px-4 py-2 bg-hoopoe text-white font-bold rounded-xl text-sm"
          >
            נסו שוב
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
