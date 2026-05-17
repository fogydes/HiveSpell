import React from "react";

const iconClassName = "h-[18px] w-[18px]";

export const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M20 20L16.65 16.65"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M12 5V19M5 12H19"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

export const ComposeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M4 20H8L18.5 9.5C19.33 8.67 19.33 7.33 18.5 6.5C17.67 5.67 16.33 5.67 15.5 6.5L5 17V20Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

export const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M15 6L9 12L15 18"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M6 6L18 18M18 6L6 18"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

export const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M6 19C6.9 15.95 9.05 14.5 12 14.5C14.95 14.5 17.1 15.95 18 19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M7 10.5C7 7.74 9.24 5.5 12 5.5C14.76 5.5 17 7.74 17 10.5V14L18.5 16.5H5.5L7 14V10.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M10 18.2C10.55 19.07 11.2 19.5 12 19.5C12.8 19.5 13.45 19.07 14 18.2"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M8 4.5H13.5L18 9V19.5H8C6.9 19.5 6 18.6 6 17.5V6.5C6 5.4 6.9 4.5 8 4.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M13 4.5V9H17.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

export const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <rect
      x="9"
      y="4.2"
      width="6"
      height="10"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M6.5 11.5C6.5 14.54 8.96 17 12 17C15.04 17 17.5 11.5M12 17V20M9.5 20H14.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
    <path
      d="M20 12L5 5L8 12L5 19L20 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);
