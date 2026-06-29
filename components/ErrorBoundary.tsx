import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-app p-6">
          <div className="max-w-md w-full text-center rounded-2xl border border-surface bg-panel p-8 shadow-xl">
            <div className="text-5xl mb-4">🐝</div>
            <h1 className="text-xl font-bold text-text-main mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              The hive encountered an unexpected error. You can try again or
              reload the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mb-6 max-h-32 overflow-auto rounded-lg bg-black/30 p-3 text-left text-xs text-red-300 border border-red-500/20">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-primary/20 text-primary font-bold text-sm border border-primary/30 hover:bg-primary/30 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-surface/50 text-text-muted font-bold text-sm border border-surface hover:text-text-main transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
