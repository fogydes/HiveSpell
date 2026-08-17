import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useReduceMotion } from "@/hooks/useAccessibility";

interface CountUpProps {
  /** Target value to count up to. */
  value: number;
  /** Optional formatter (e.g. thousands separators). Defaults to rounded integer. */
  format?: (n: number) => string;
  /** Animation duration in seconds. */
  duration?: number;
  className?: string;
}

/**
 * Counts a number up from 0 to `value` once on mount, driven by GSAP.
 *
 * The component owns its own text node, so there is no conflict with React's
 * reconciliation: the initial render already contains the final formatted value
 * (correct for no-JS and reduce-motion), and GSAP only overwrites `textContent`
 * for the ~duration of the mount animation before landing exactly on `value`.
 *
 * Respects `useReduceMotion()` — when the user prefers reduced motion (or JS
 * animation is otherwise undesirable) the final value is shown immediately with
 * no tween.
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  format,
  duration = 0.9,
  className,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReduceMotion();
  const fmt = format ?? ((n: number) => String(Math.round(n)));

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduceMotion) return; // reduce-motion: keep the React-rendered final value
      const proxy = { v: 0 };
      el.textContent = fmt(0);
      gsap.to(proxy, {
        v: value,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = fmt(proxy.v);
        },
      });
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={className}>
      {fmt(value)}
    </span>
  );
};

export default CountUp;
