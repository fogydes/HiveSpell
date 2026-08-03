import React from "react";
import { getPresenceDisplay, formatLastSeen } from "@/hooks/useFriendInvites";

interface PresenceIndicatorProps {
  status: "offline" | "online" | "in_lobby" | "in_game" | "spectating";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  status,
  size = "md",
  showLabel = false,
  className = "",
}) => {
  const display = getPresenceDisplay(status);

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const labelClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={display.label}
    >
      <span
        className={`relative flex-shrink-0 ${sizeClasses[size]} presence-dot`}
        style={{
          borderRadius: "50%",
          backgroundColor: "currentColor",
          boxShadow: `0 0 0 1px currentColor, 0 0 8px currentColor`,
        }}
      >
        <span
          className="absolute inset-0 rounded-full presence-pulse"
          style={{
            backgroundColor: "currentColor",
            opacity: 0.3,
            animation: "pulse 2s infinite",
          }}
        />
      </span>
      {showLabel && (
        <span className={`${labelClasses[size]} font-medium ${display.color}`}>
          {display.icon} {display.label}
        </span>
      )}
    </span>
  );
};

interface PresenceBadgeProps {
  status: "offline" | "online" | "in_lobby" | "in_game" | "spectating";
  lastSeen?: string;
  className?: string;
}

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  status,
  lastSeen,
  className = "",
}) => {
  const display = getPresenceDisplay(status);

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${className}`}
      style={{
        backgroundColor: `${display.color.replace("text-", "bg-")}/15`,
        borderColor: `${display.color.replace("text-", "border-")}/30`,
        borderWidth: "1px",
        borderStyle: "solid",
      }}
    >
      <span
        className="relative flex-shrink-0 w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: `var(--${display.color.replace("text-", "")})` }}
      >
        {status !== "offline" && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: `var(--${display.color.replace("text-", "")})`,
              opacity: 0.6,
            }}
          />
        )}
      </span>
      <span className={`${display.color}`}>{display.icon} {display.label}</span>
      {lastSeen && status === "offline" && (
        <span className="text-slate-500 ml-1">
          {formatLastSeen(lastSeen)}
        </span>
      )}
    </span>
  );
};

export const PresenceDot: React.FC<{
  status: "offline" | "online" | "in_lobby" | "in_game" | "spectating";
  size?: number;
  className?: string;
}> = ({ status, size = 8, className = "" }) => {
  const display = getPresenceDisplay(status);

  return (
    <span
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: `var(--${display.color.replace("text-", "")})`,
          boxShadow: `0 0 ${size / 2}px var(--${display.color.replace("text-", "")})`,
        }}
      />
      {status !== "offline" && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: `var(--${display.color.replace("text-", "")})`,
            opacity: 0.6,
          }}
        />
      )}
    </span>
  );
};