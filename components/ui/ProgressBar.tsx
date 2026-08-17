import React from "react";

type ProgressTone = "primary" | "success" | "streak" | "premium";

export interface ProgressBarProps {
  /** Current value. */
  value: number;
  /** Maximum value (defaults to 100). */
  max?: number;
  /** Colour of the filled portion. */
  tone?: ProgressTone;
  /** Extra classes on the outer wrapper. */
  className?: string;
  /** Accessible label describing what is progressing. */
  label?: string;
  /** Render a trailing "NN%" readout. */
  showValue?: boolean;
}

const TONES: Record<ProgressTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  streak: "bg-streak",
  premium: "bg-premium",
};

/** Determinate progress indicator with an animated fill. */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  tone = "primary",
  className = "",
  label,
  showValue = false,
}) => {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-surface/60"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${TONES[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-text-muted">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
