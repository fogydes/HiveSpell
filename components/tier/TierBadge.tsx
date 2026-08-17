import React from "react";
import { TierDefinition, getTierCSSProperties } from "@/utils/tierRanking";

export interface TierBadgeProps {
  /** The tier definition to display */
  tier: TierDefinition;
  /** Size variant of the badge */
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether to show the tier icon */
  showIcon?: boolean;
  /** Whether to show the tier name */
  showName?: boolean;
  /** Whether to animate the badge */
  animate?: boolean;
  /** Custom class name */
  className?: string;
  /** Show progress ring (for profile view) */
  showProgress?: boolean;
  /** Progress value 0-100 */
  progress?: number;
  /** Next tier name for progress context */
  nextTierName?: string;
  /** Legacy tier for season reset display */
  legacyTier?: TierDefinition | null;
  /** Tooltip or additional info */
  title?: string;
}

/**
 * TierBadge - Animated tier display component
 * Supports multiple sizes and animation states
 * Compatible with theme system via CSS custom properties
 */
export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  size = "md",
  showIcon = true,
  showName = true,
  animate = true,
  className = "",
  showProgress = false,
  progress = 0,
  nextTierName,
  legacyTier,
  title,
}) => {
  // Size configurations
  const sizeStyles = {
    sm: {
      container: "px-2 py-1 gap-1",
      icon: "text-base",
      name: "text-[10px]",
      progressRing: "h-10 w-10",
      progressStroke: "2",
      legacyIcon: "text-xs",
    },
    md: {
      container: "px-3 py-2 gap-2",
      icon: "text-lg",
      name: "text-xs",
      progressRing: "h-14 w-14",
      progressStroke: "3",
      legacyIcon: "text-sm",
    },
    lg: {
      container: "px-4 py-3 gap-3",
      icon: "text-2xl",
      name: "text-sm",
      progressRing: "h-20 w-20",
      progressStroke: "4",
      legacyIcon: "text-base",
    },
    xl: {
      container: "px-6 py-4 gap-4",
      icon: "text-3xl",
      name: "text-base",
      progressRing: "h-28 w-28",
      progressStroke: "5",
      legacyIcon: "text-lg",
    },
  };

  const s = sizeStyles[size];
  const cssProps = getTierCSSProperties(tier);

  // Animation classes
  const animationClass = animate
    ? "animate-tier-pulse"
    : "";

  // Legacy tier badge (smaller, shown alongside current)
  const legacyBadge = legacyTier ? (
    <div
      className="flex items-center gap-1 ml-2 opacity-70"
      style={{
        borderColor: legacyTier.color,
        boxShadow: `0 0 8px ${legacyTier.glowColor}`,
      }}
      title={`Previous Season: ${legacyTier.name}`}
    >
      <span className={s.legacyIcon}>{legacyTier.icon}</span>
      <span className={`${s.name} font-mono uppercase tracking-wider`}>
        {legacyTier.name.slice(0, 3)}
      </span>
    </div>
  ) : null;

  // Progress ring SVG
  const progressRing = showProgress && progress > 0 && nextTierName ? (
    <svg
      className={s.progressRing}
      viewBox="0 0 100 100"
      style={{
        transform: "rotate(-90deg)",
        filter: `drop-shadow(0 0 4px ${tier.glowColor})`,
      }}
      aria-label={`Progress to ${nextTierName}: ${progress}%`}
    >
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-surface/30"
      />
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={tier.color}
        strokeWidth={s.progressStroke}
        strokeDasharray={`${progress * 2.83} 283`}
        strokeDashoffset="0"
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
        style={{
          filter: `drop-shadow(0 0 6px ${tier.glowColor})`,
        }}
      />
      <text
        x="50"
        y="55"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size === "sm" ? "14" : size === "md" ? "18" : size === "lg" ? "24" : "32"}
        fontWeight="bold"
        fill="currentColor"
        className="text-text-main"
      >
        {progress}%
      </text>
    </svg>
  ) : null;

  return (
    <div
      className={`
        inline-flex items-center justify-center ${s.container}
        rounded-full border-2 bg-black/20 backdrop-blur-sm
        ${animationClass}
        ${className}
      `}
      style={{
        ...cssProps,
        borderColor: `var(--tier-border)`,
        boxShadow: `0 0 16px var(--tier-glow), inset 0 0 16px var(--tier-glow)`,
      }}
      title={title || `${tier.name} Tier - ${tier.description}`}
      role="img"
      aria-label={`${tier.name} tier badge. ${tier.description}`}
    >
      {showProgress && progressRing ? (
        <div className="relative" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {progressRing}
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            {showIcon && <span className={s.icon} aria-hidden="true">{tier.icon}</span>}
            {showName && (
              <span className={`${s.name} font-black uppercase tracking-wider`}>
                {tier.name}
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          {showIcon && <span className={s.icon} aria-hidden="true">{tier.icon}</span>}
          {showName && (
            <span className={`${s.name} font-black uppercase tracking-wider whitespace-nowrap`}>
              {tier.name}
            </span>
          )}
        </>
      )}
      {legacyBadge}
    </div>
  );
};

/**
 * TierBadgeMini - Compact version for inline use (headers, lists)
 */
export const TierBadgeMini: React.FC<{
  tier: TierDefinition;
  showIcon?: boolean;
  className?: string;
}> = ({ tier, showIcon = true, className = "" }) => {
  const cssProps = getTierCSSProperties(tier);

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        border bg-black/20 backdrop-blur-sm whitespace-nowrap
        text-[10px] font-bold uppercase tracking-wider
        ${className}
      `}
      style={{
        ...cssProps,
        borderColor: `var(--tier-border)`,
        boxShadow: `0 0 8px var(--tier-glow)`,
      }}
      title={`${tier.name} Tier`}
      aria-label={`${tier.name} tier`}
    >
      {showIcon && <span className="text-sm">{tier.icon}</span>}
      <span>{tier.name}</span>
    </span>
  );
};

/**
 * TierProgressBar - Horizontal progress bar for profile/stats views
 */
export const TierProgressBar: React.FC<{
  tier: TierDefinition;
  progress: number; // 0-100
  nextTierName: string;
  showLabels?: boolean;
  className?: string;
}> = ({ tier, progress, nextTierName, showLabels = true, className = "" }) => {
  const cssProps = getTierCSSProperties(tier);

  return (
    <div className={`w-full ${className}`}>
      {showLabels && (
        <div className="flex justify-between text-[10px] uppercase tracking-wider mb-2">
          <span className="text-text-muted">Current: {tier.name}</span>
          <span className="text-text-muted">Next: {nextTierName}</span>
        </div>
      )}
      <div
        className="relative h-3 overflow-hidden rounded-full bg-surface/50"
        style={{ boxShadow: `inset 0 0 8px ${tier.glowColor}` }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background: `linear-gradient(90deg, ${tier.color}, color-mix(in srgb, ${tier.color} 70%, white))`,
            boxShadow: `0 0 12px ${tier.glowColor}`,
          }}
        />
      </div>
      <div className="mt-1 text-center text-[10px] font-mono text-text-muted">
        {progress}%
      </div>
    </div>
  );
};

export default TierBadge;