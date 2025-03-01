'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            An unexpected error occurred. Try refreshing the page or starting a
            new chat.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.href = '/';
            }}
            className="px-4 py-2 rounded-xl bg-sky-900 text-white text-sm hover:bg-sky-800 transition-colors"
          >
            Go to home
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-4 text-left text-xs bg-gray-100 dark:bg-neutral-800 rounded p-4 max-w-xl overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
