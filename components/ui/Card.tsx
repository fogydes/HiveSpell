import React from "react";

type CardVariant = "elevated" | "flat" | "interactive";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Elevated = shadowed panel, flat = subtle surface, interactive = hover-lift (§1.4). */
  variant?: CardVariant;
}

const VARIANTS: Record<CardVariant, string> = {
  elevated: "border border-surface bg-panel shadow-lg",
  flat: "border border-surface bg-panel/40",
  interactive:
    "border border-surface bg-panel/60 transition-all duration-150 " +
    "hover:border-primary/60 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer",
};

/** Container surface with three elevation treatments. */
export const Card: React.FC<CardProps> = ({
  variant = "elevated",
  className = "",
  children,
  ...rest
}) => (
  <div className={`rounded-2xl p-5 ${VARIANTS[variant]} ${className}`} {...rest}>
    {children}
  </div>
);

export default Card;
