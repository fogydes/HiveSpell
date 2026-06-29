import React from "react";

interface SkeletonProps {
  className?: string;
}

/** Animated placeholder that pulses while content loads. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-lg bg-surface/40 ${className}`}
    aria-hidden="true"
  />
);

/** A row skeleton with avatar + text lines, useful for list items. */
export const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-2 w-1/3" />
    </div>
  </div>
);

/** Multiple skeleton rows for loading a panel list. */
export const SkeletonList: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-1">
    {Array.from({ length: rows }, (_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
);
