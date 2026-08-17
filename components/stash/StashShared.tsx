import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  type CustomizationCategory,
  type ItemRarity,
  type CurrencyType,
  RARITY_COLORS,
  RARITY_LABELS,
} from "../../data/customizationCatalog";

// Category navigation lanes shown in the Stash sidebar. "all" and "bundles" are
// synthetic lanes that bracket the real CustomizationCategory values.
export const CATEGORY_ICONS: Record<
  "all" | CustomizationCategory | "bundles",
  string
> = {
  all: "📦",
  theme: "🎨",
  cursor: "✨",
  badge: "🏷️",
  bundles: "🎁",
};

export const CATEGORY_ORDER = ["all", "theme", "cursor", "badge", "bundles"] as const;

export type StashCategory = (typeof CATEGORY_ORDER)[number];

export const categoryTone = (category: CustomizationCategory | "bundles") =>
  category === "theme"
    ? "from-fuchsia-500/20 via-primary/10 to-transparent"
    : category === "cursor"
      ? "from-sky-500/20 via-primary/10 to-transparent"
      : category === "bundles"
        ? "from-amber-500/20 via-primary/10 to-transparent"
        : "from-amber-400/20 via-primary/10 to-transparent";

export const categoryBorder = (category: CustomizationCategory | "bundles") =>
  category === "theme"
    ? "border-fuchsia-400/25 text-fuchsia-200"
    : category === "cursor"
      ? "border-sky-400/25 text-sky-200"
      : category === "bundles"
        ? "border-amber-400/25 text-amber-200"
        : "border-amber-300/25 text-amber-200";

export const RarityBadge: React.FC<{ rarity: ItemRarity; size?: "sm" | "md" | "lg"; animateIn?: boolean }> = ({
  rarity,
  size = "md",
  animateIn = false,
}) => {
  const colors = RARITY_COLORS[rarity];
  const label = RARITY_LABELS[rarity];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-3 py-1 text-[10px]",
    lg: "px-4 py-1.5 text-[11px]",
  };
  const badgeRef = useRef<HTMLSpanElement>(null);

  // Optional entrance: badge scales + fades in on mount. Callers gate this via
  // animateIn (already reduce-motion / performance-tier aware).
  useGSAP(
    () => {
      if (!animateIn || !badgeRef.current) return;
      gsap.from(badgeRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.3,
        ease: "back.out(2)",
        clearProps: "transform,opacity",
      });
    },
    { scope: badgeRef },
  );

  return (
    <span
      ref={badgeRef}
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-[0.2em] ${sizeClasses[size]} ${colors.border} ${colors.bg} ${colors.text}`}
      style={{ boxShadow: `0 0 12px ${colors.glow}` }}
    >
      <span className="relative" style={{ textShadow: `0 0 8px ${colors.glow}` }}>
        {label}
      </span>
    </span>
  );
};

export const CurrencyDisplay: React.FC<{ amount: number; currency: CurrencyType; size?: "sm" | "md" | "lg" }> = ({
  amount,
  currency,
  size = "md",
}) => {
  const icons = { nectar: "🍯", premium: "💎" };
  const colors = {
    nectar: "text-amber-300",
    premium: "text-cyan-300",
  };
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${sizeClasses[size]} ${colors[currency]}`}>
      {icons[currency]}
      {amount.toLocaleString()}
    </span>
  );
};
