import React, { useEffect, useRef } from "react";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;
  const { t } = useTranslation();

  useEffect(() => {
    cancelRef.current?.focus();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  const confirmClasses =
    variant === "danger"
      ? "border-red-500/30 bg-red-500/20 text-red-300 hover:bg-red-500/30"
      : "border-primary/30 bg-primary/20 text-primary hover:bg-primary/30";

  const confirmText = confirmLabel || t("common.confirm");
  const cancelText = cancelLabel || t("common.cancel");

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "confirm-title" : undefined}
      style={{ animation: disableAnimations ? "none" : "fadeIn 0.15s ease-out" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-surface bg-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: disableAnimations ? "none" : "scaleIn 0.15s ease-out" }}
      >
        {title && (
          <h3
            id="confirm-title"
            className="text-lg font-bold text-text-main"
          >
            {title}
          </h3>
        )}
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-lg border border-surface px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface/50 hover:text-text-main"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${confirmClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
