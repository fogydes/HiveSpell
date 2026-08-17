import React from "react";

type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "premium"
  | "streak";
type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic colour of the pill (maps to the §1.1 feedback tokens). */
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Optional leading icon/emoji. */
  icon?: React.ReactNode;
}

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface/60 text-text-muted border-surface",
  primary: "bg-primary/15 text-primary border-primary/30",
  success: "bg-success/15 text-success border-success/30",
  error: "bg-error/15 text-error border-error/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/15 text-info border-info/30",
  premium: "bg-premium/15 text-premium border-premium/30",
  streak: "bg-streak/15 text-streak border-streak/30",
};

const SIZES: Record<BadgeSize, string> = {
  sm: "text-[0.6875rem] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

/** Compact status/label pill. */
export const Badge: React.FC<BadgeProps> = ({
  tone = "neutral",
  size = "md",
  icon,
  className = "",
  children,
  ...rest
}) => (
  <span
    className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${TONES[tone]} ${SIZES[size]} ${className}`}
    {...rest}
  >
    {icon}
    {children}
  </span>
);

export default Badge;
