import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Announce message to screen readers via live region
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!announcerRef.current && typeof document !== "undefined") {
      const announcer = document.createElement("div");
      announcer.setAttribute("id", "sr-announcer");
      announcer.setAttribute("role", "status");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current && announcerRef.current.parentNode) {
        announcerRef.current.parentNode.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (!announcerRef.current) return;

    // Clear and set new message
    announcerRef.current.textContent = "";
    announcerRef.current.setAttribute("aria-live", priority);

    // Small delay to ensure screen reader picks up the change
    setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = message;
      }
    }, 50);
  }, []);

  return { announce };
}

/**
 * Focus trap for modals/dialogs
 */
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive, containerRef]);
}

/**
 * Restore focus to trigger element after modal closes
 */
export function useRestoreFocus(isOpen: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save the element that had focus before modal opened
      triggerRef.current = document.activeElement as HTMLElement;
    } else if (triggerRef.current) {
      // Restore focus when modal closes
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);
}

/**
 * Keyboard navigation for lists/grids
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  onSelect?: (index: number) => void,
  orientation: "horizontal" | "vertical" | "both" = "both"
) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<T>) => {
      const currentIndex = items.findIndex((item) => item === document.activeElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (e.key) {
        case "ArrowRight":
          if (orientation === "horizontal" || orientation === "both") {
            e.preventDefault();
            nextIndex = (currentIndex + 1) % items.length;
          }
          break;
        case "ArrowLeft":
          if (orientation === "horizontal" || orientation === "both") {
            e.preventDefault();
            nextIndex = (currentIndex - 1 + items.length) % items.length;
          }
          break;
        case "ArrowDown":
          if (orientation === "vertical" || orientation === "both") {
            e.preventDefault();
            nextIndex = (currentIndex + 1) % items.length;
          }
          break;
        case "ArrowUp":
          if (orientation === "vertical" || orientation === "both") {
            e.preventDefault();
            nextIndex = (currentIndex - 1 + items.length) % items.length;
          }
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = items.length - 1;
          break;
        case "Enter":
        case " ":
          if (onSelect) {
            e.preventDefault();
            onSelect(currentIndex);
          }
          break;
      }

      if (nextIndex !== currentIndex) {
        items[nextIndex]?.focus();
      }
    },
    [items, onSelect, orientation]
  );

  return { onKeyDown: handleKeyDown };
}

/**
 * Reduce motion preference hook
 */
export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return reduceMotion;
}