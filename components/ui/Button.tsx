import React from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight of the button (§1.4). */
  variant?: ButtonVariant;
  /** Vertical/horizontal padding + text scale. */
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction without collapsing width. */
  loading?: boolean;
  /** Icon rendered before the label. Hidden while `loading`. */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label. Hidden while `loading`. */
  rightIcon?: React.ReactNode;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
}

const BASE =
  "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 " +
  "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-app hover:brightness-110 shadow-sm",
  secondary:
    "border border-surface bg-surface/40 text-text-main hover:border-primary hover:text-primary",
  tertiary: "text-text-muted hover:text-primary hover:bg-primary/10",
  danger: "bg-error text-white hover:brightness-110 shadow-sm",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "gap-1.5 px-3 py-1.5 text-sm",
  md: "gap-2 px-4 py-2.5 text-sm",
  lg: "gap-2 px-6 py-3 text-base",
};

const Spinner: React.FC = () => (
  <span
    aria-hidden="true"
    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
  />
);

/**
 * Primary action primitive. Four variants × three sizes, with built-in
 * loading and icon slots. Any native <button> attribute (type, onClick,
 * aria-*, …) passes straight through and can override the defaults.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...rest
}) => (
  <button
    type="button"
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${
      fullWidth ? "w-full" : ""
    } ${className}`}
    {...rest}
  >
    {loading ? <Spinner /> : leftIcon}
    {children}
    {!loading && rightIcon}
  </button>
);

export default Button;
