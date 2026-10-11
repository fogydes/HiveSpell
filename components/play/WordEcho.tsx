import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface WordEchoProps {
  /** The spoken word. Only its LENGTH is used to lay out the slots, so the
   *  spelling is never disclosed here — the theatrical WordReveal already
   *  flashes the full word on round start, and letter-count is strictly less
   *  information than that. */
  word: string;
  /** Characters the active speller has typed so far (drives the fill). */
  typedCount: number;
  /** True on the local player's live turn — enables the "next slot" caret. */
  active: boolean;
  animate?: boolean;
  className?: string;
}

// Guard against pathological word lengths blowing out the row.
const MAX_SLOTS = 24;

/**
 * "Visual word echo" (§9.4 / #26): a row of slots, one per letter of the word
 * you just heard, that fill as the current speller types — tying the audio you
 * received to the input you give. It renders fill STATE only, never the target
 * letters, so it discloses nothing beyond the word's length. Pure presentation,
 * fully derived from props; safe in both the player and spectator (Watch) views.
 */
export function WordEcho({
  word,
  typedCount,
  active,
  animate = true,
  className = "",
}: WordEchoProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const length = Math.min(word.length, MAX_SLOTS);
  const filled = Math.max(0, Math.min(typedCount, length));

  // Stagger the slots in whenever the word (its length) changes.
  useGSAP(
    () => {
      if (!animate || !rootRef.current) return;
      const slots = gsap.utils.toArray<HTMLElement>("[data-slot]", rootRef.current);
      gsap.fromTo(
        slots,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)", stagger: 0.03 },
      );
    },
    { dependencies: [length], scope: rootRef },
  );

  // Pop the most-recently-filled slot as typing advances.
  useGSAP(
    () => {
      if (!animate || filled <= 0 || !rootRef.current) return;
      const el = rootRef.current.querySelector<HTMLElement>(
        `[data-slot="${filled - 1}"]`,
      );
      if (el) {
        gsap.fromTo(el, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: "back.out(3)" });
      }
    },
    { dependencies: [filled], scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      {Array.from({ length }).map((_, i) => {
        const isFilled = i < filled;
        const isCurrent = active && i === filled;
        return (
          <span
            key={i}
            data-slot={i}
            className={[
              "h-2 w-2 rounded-full transition-colors sm:h-2.5 sm:w-2.5",
              isFilled
                ? "bg-primary text-primary"
                : isCurrent
                  ? `bg-primary/30 ring-2 ring-primary ${animate ? "animate-pulse" : ""}`
                  : "bg-surface",
            ].join(" ")}
            style={isFilled ? { filter: "drop-shadow(0 0 4px currentColor)" } : undefined}
          />
        );
      })}
    </div>
  );
}

export default WordEcho;
