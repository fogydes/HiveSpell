import React, { useState } from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  /** Image URL; when absent or it fails to load, initials are shown instead. */
  src?: string | null;
  /** Display name — drives the alt text and the initials fallback. */
  name?: string;
  size?: AvatarSize;
  className?: string;
  /** Draw a highlight ring (e.g. to signal online / selected). */
  ring?: boolean;
}

const SIZES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[0.625rem]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

/** Circular user avatar with a graceful initials fallback. */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className = "",
  ring = false,
}) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const ringCls = ring
    ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-app"
    : "";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface font-bold text-text-main ${SIZES[size]} ${ringCls} ${className}`}
      aria-label={name || "avatar"}
    >
      {showImage ? (
        <img
          src={src as string}
          alt={name || "avatar"}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
};

export default Avatar;
