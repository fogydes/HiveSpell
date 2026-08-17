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

class Logger {
  private sessionId: string;
  private userId?: string;
  private route?: string;
  private buffers: LogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

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

  setUser(userId: string | null) {
    this.userId = userId || undefined;
  }

  setRoute(route: string) {
    this.route = route;
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