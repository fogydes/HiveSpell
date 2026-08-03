/**
 * Client-side logging service
 * Handles structured logging for client errors, Supabase RPC errors, and general diagnostics
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
  userId?: string;
  route?: string;
  userAgent?: string;
}

interface SentryLikeCapture {
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: LogLevel, context?: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: { category: string; message: string; level: LogLevel; data?: Record<string, unknown> }) => void;
  setUser: (user: { id: string; username?: string; email?: string } | null) => void;
}

class Logger {
  private sessionId: string;
  private userId?: string;
  private route?: string;
  private buffers: LogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private sentry?: SentryLikeCapture;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.init();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private init() {
    // Only initialize in browser
    if (typeof window === "undefined") return;

    // Set up periodic flush
    this.flushInterval = setInterval(() => this.flush(), 30000);

    // Flush on page unload
    window.addEventListener("beforeunload", () => this.flush(true));

    // Capture unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.error("Unhandled promise rejection", {
        reason: event.reason,
        promise: event.promise,
      });
    });

    // Capture global errors
    window.addEventListener("error", (event) => {
      this.error("Global error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      });
    });

    this.isInitialized = true;
    this.debug("Logger initialized", { sessionId: this.sessionId });
  }

  setUser(userId: string | null, username?: string, email?: string) {
    this.userId = userId || undefined;
    if (this.sentry) {
      this.sentry.setUser(userId ? { id: userId, username, email } : null);
    }
  }

  setRoute(route: string) {
    this.route = route;
  }

  /**
   * Initialize Sentry (optional - loads dynamically to avoid bundle size if not needed)
   */
  async initSentry(dsn: string) {
    try {
      // Dynamic import to avoid bundling Sentry if not used
      // Use a variable to prevent Vite from statically analyzing the import
      const sentryPackage = "@sentry/react";
      // /* @vite-ignore */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SentryModule = await import(sentryPackage) as any;
      const Sentry = SentryModule.default ?? SentryModule;

      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_APP_VERSION || "dev",
        integrations: [
          Sentry.browserTracingIntegration?.(),
          Sentry.replayIntegration?.({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ].filter(Boolean),
        tracesSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        beforeSend(event: any, hint: any) {
          // Filter out noise
          if (event.exception) {
            const error = hint.originalException;
            if (error instanceof Error) {
              // Ignore network errors that are likely user's connection
              if (error.name === "TypeError" && error.message.includes("NetworkError")) {
                return null;
              }
              // Ignore non-Error objects
              if (error.name === "ChunkLoadError") {
                return null;
              }
            }
          }
          return event;
        },
      });

      // Create a wrapper to match our interface
      this.sentry = {
        captureException: (error: Error, context?: Record<string, unknown>) => {
          Sentry.captureException(error, { extra: context });
        },
        captureMessage: (message: string, level: LogLevel = "error", context?: Record<string, unknown>) => {
          Sentry.captureMessage(message, level, { extra: context });
        },
        addBreadcrumb: (breadcrumb) => {
          Sentry.addBreadcrumb(breadcrumb);
        },
        setUser: (user) => {
          Sentry.setUser(user);
        },
      };

      this.info("Sentry initialized");
    } catch (error) {
      this.warn("Failed to initialize Sentry", { error: String(error) });
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      route: this.route,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    this.buffers.push(entry);

    // Console output in development
    if (import.meta.env.DEV) {
      const prefix = `[${level.toUpperCase()}]`;
      const ctx = context ? ` ${JSON.stringify(context)}` : "";
      switch (level) {
        case "debug":
          console.debug(prefix, message, ctx);
          break;
        case "info":
          console.info(prefix, message, ctx);
          break;
        case "warn":
          console.warn(prefix, message, ctx);
          break;
        case "error":
          console.error(prefix, message, ctx);
          break;
      }
    }

    // Send to Sentry for errors
    if (level === "error" && this.sentry) {
      if (context?.error instanceof Error) {
        this.sentry.captureException(context.error, context);
      } else {
        this.sentry.captureMessage(message, "error", context);
      }
    }

    // Flush immediately for errors
    if (level === "error") {
      this.flush();
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log("error", message, context);
  }

  /**
   * Log a Supabase RPC error with structured context
   */
  logSupabaseRpcError(rpcName: string, error: Error | unknown, context?: Record<string, unknown>) {
    this.error(`Supabase RPC error: ${rpcName}`, {
      rpcName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    });
  }

  /**
   * Log a Firebase error with structured context
   */
  logFirebaseError(operation: string, error: Error | unknown, context?: Record<string, unknown>) {
    this.error(`Firebase error: ${operation}`, {
      operation,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    });
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(category: string, message: string, level: LogLevel = "info", data?: Record<string, unknown>) {
    if (this.sentry) {
      this.sentry.addBreadcrumb({ category, message, level, data });
    }
  }

  private async flush(sync = false) {
    if (this.buffers.length === 0) return;

    const entries = [...this.buffers];
    this.buffers = [];

    // In production, send to logging endpoint
    if (!import.meta.env.DEV && entries.some((e) => e.level === "error" || e.level === "warn")) {
      try {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
          keepalive: sync,
        });
      } catch {
        // Silently fail - we don't want logging to break the app
      }
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(true);
  }
}

// Singleton instance
export const logger = new Logger();

/**
 * Convenience functions for common logging patterns
 */
export const logError = (message: string, context?: Record<string, unknown>) => logger.error(message, context);
export const logWarn = (message: string, context?: Record<string, unknown>) => logger.warn(message, context);
export const logInfo = (message: string, context?: Record<string, unknown>) => logger.info(message, context);
export const logDebug = (message: string, context?: Record<string, unknown>) => logger.debug(message, context);
export const logSupabaseRpcError = (rpcName: string, error: Error | unknown, context?: Record<string, unknown>) =>
  logger.logSupabaseRpcError(rpcName, error, context);
export const logFirebaseError = (operation: string, error: Error | unknown, context?: Record<string, unknown>) =>
  logger.logFirebaseError(operation, error, context);

/**
 * Log an error caught by a React Error Boundary
 */
export const logErrorBoundary = (error: Error, errorInfo: React.ErrorInfo) => {
  logger.error("React Error Boundary caught an error", {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  });
};