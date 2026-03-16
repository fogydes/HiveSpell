import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextType {
  showToast: (toast: ToastOptions) => void;
  dismissToast: (id: number) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};

const DEFAULT_DURATION_MS = 4200;

const TOAST_STYLES: Record<
  ToastVariant,
  { badge: string; border: string; icon: string }
> = {
  success: {
    badge: "text-emerald-200 bg-emerald-400/15 border-emerald-400/30",
    border: "border-emerald-400/30",
    icon: "✓",
  },
  error: {
    badge: "text-rose-200 bg-rose-400/15 border-rose-400/30",
    border: "border-rose-400/30",
    icon: "!",
  },
  info: {
    badge: "text-cyan-200 bg-cyan-400/15 border-cyan-400/30",
    border: "border-cyan-400/30",
    icon: "i",
  },
};

const ToastViewport: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}> = ({ toasts, onDismiss }) => (
  <div className="pointer-events-none fixed top-24 right-4 z-[140] flex w-full max-w-sm flex-col gap-3">
    {toasts.map((toast) => {
      const variant = toast.variant ?? "info";
      const style = TOAST_STYLES[variant];

      return (
        <div
          key={toast.id}
          className={`pointer-events-auto overflow-hidden rounded-2xl border bg-panel/95 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md animate-slide-up ${style.border}`}
        >
          <div className="flex items-start gap-3 p-4">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black uppercase ${style.badge}`}
            >
              {style.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-text-main">
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-text-muted transition-colors hover:text-text-main"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ durationMs, ...toast }: ToastOptions) => {
      const id = nextIdRef.current++;
      const nextToast: ToastItem = {
        id,
        variant: "info",
        ...toast,
      };

      setToasts((current) => [...current, nextToast]);

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs ?? DEFAULT_DURATION_MS);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ showToast, dismissToast, toasts }),
    [dismissToast, showToast, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};
