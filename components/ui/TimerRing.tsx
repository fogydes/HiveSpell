import React from "react";

export interface TimerRingProps {
  /** Seconds remaining in the current interval. */
  timeLeft: number;
  /** Total seconds the interval started with. */
  totalTime: number;
  /** Diameter of the ring in pixels (defaults to 96). */
  size?: number;
  /** Ring stroke width in pixels (defaults to 6). */
  strokeWidth?: number;
  /** Fraction (0–1) below which the ring turns red (defaults to 0.3). */
  dangerThreshold?: number;
  /** Animate the sweep; pass `!reduceMotion` (defaults to true). */
  animate?: boolean;
  /** Extra classes on the outer wrapper. */
  className?: string;
  /** Center content; defaults to the remaining time (e.g. "3.2s"). */
  children?: React.ReactNode;
}

/**
 * Circular countdown ring built on an SVG stroke-dashoffset sweep.
 *
 * Colour is driven through `currentColor`, so the whole ring — track, progress
 * arc, glow and default readout — follows the wrapper's text colour: `text-primary`
 * normally, `text-red-500` once the remaining fraction drops below
 * `dangerThreshold`. This keeps it on-theme without threading colour props.
 */
export const TimerRing: React.FC<TimerRingProps> = ({
  timeLeft,
  totalTime,
  size = 96,
  strokeWidth = 6,
  dangerThreshold = 0.3,
  animate = true,
  className = "",
  children,
}) => {
  const fraction = totalTime <= 0 ? 0 : Math.min(1, Math.max(0, timeLeft / totalTime));
  const isDanger = fraction < dangerThreshold;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - fraction);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${isDanger ? "text-red-500" : "text-primary"} ${className}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${timeLeft.toFixed(1)} seconds remaining`}
    >
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="opacity-15"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{
            filter: "drop-shadow(0 0 4px currentColor)",
            ...(animate ? { transition: "stroke-dashoffset 1s linear" } : {}),
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold tabular-nums">
        {children ?? `${timeLeft.toFixed(1)}s`}
      </div>
    </div>
  );
};

export default TimerRing;
