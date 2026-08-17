import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visible field label, wired to the input via htmlFor/id. */
  label?: string;
  /** Error message; also switches the field to its error style. */
  error?: string;
  /** Helper text shown below the field when there is no error. */
  hint?: string;
  /** Optional leading icon inside the field. */
  leftIcon?: React.ReactNode;
  /** Classes for the outer wrapper (the input itself uses `className`). */
  containerClassName?: string;
}

/** Text input with label, hint, error state and optional leading icon. */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  id,
  className = "",
  containerClassName = "",
  ...rest
}) => {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-caption font-semibold text-text-muted"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 text-text-muted">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-xl border bg-surface/40 px-4 py-2.5 text-text-main placeholder:text-text-muted/70 transition-colors duration-150 focus:outline-none focus:ring-2 ${
            error
              ? "border-error focus:ring-error/40"
              : "border-surface focus:border-primary focus:ring-primary/30"
          } ${leftIcon ? "pl-10" : ""} ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <span id={`${inputId}-error`} className="text-caption text-error">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-caption text-text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
};

export default Input;
