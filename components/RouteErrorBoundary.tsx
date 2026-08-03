import React from "react";
import { logError } from "../services/logger";

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  routeName: string;
  fallback?: React.ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level error boundary with route-specific fallback UI.
 * Wraps individual routes to prevent a single view crash from taking down the entire app.
 */
export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError(`[RouteErrorBoundary: ${this.props.routeName}] Uncaught error`, {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise show default route-specific fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return this.getDefaultFallback();
    }

    return this.props.children;
  }

  private getDefaultFallback = () => {
    const routeMessages: Record<string, { title: string; message: string }> = {
      Home: {
        title: "Welcome to HiveSpell",
        message:
          "The hive entrance seems to be blocked. Please try refreshing or navigate to the lobby.",
      },
      Auth: {
        title: "Authentication Error",
        message:
          "We couldn't load the sign-in page. Please refresh and try again.",
      },
      Lobby: {
        title: "Lobby Unavailable",
        message:
          "The lobby couldn't load. Try going back home or refreshing the page.",
      },
      Play: {
        title: "Game Error",
        message:
          "Something went wrong in the arena. Your progress may not be saved. Please return to the lobby.",
      },
    };

    const routeInfo = routeMessages[this.props.routeName] || {
      title: "Something went wrong",
      message: "An unexpected error occurred. You can try again or reload the page.",
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-app p-6">
        <div className="max-w-md w-full text-center rounded-2xl border border-surface bg-panel p-8 shadow-xl">
          <div className="text-5xl mb-4">🐝</div>
          <h1 className="text-xl font-bold text-text-main mb-2">
            {routeInfo.title}
          </h1>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            {routeInfo.message}
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
}

/**
 * Convenience wrapper for Home route
 */
export const HomeErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <RouteErrorBoundary routeName="Home">{children}</RouteErrorBoundary>
);

/**
 * Convenience wrapper for Auth route
 */
export const AuthErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <RouteErrorBoundary routeName="Auth">{children}</RouteErrorBoundary>
);

/**
 * Convenience wrapper for Lobby route
 */
export const LobbyErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <RouteErrorBoundary routeName="Lobby">{children}</RouteErrorBoundary>
);

/**
 * Convenience wrapper for Play route
 */
export const PlayErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <RouteErrorBoundary routeName="Play">{children}</RouteErrorBoundary>
);