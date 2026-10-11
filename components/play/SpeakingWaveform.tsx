import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface SpeakingWaveformProps {
  /** When false (reduced-motion / "static" perf tier), the bars render at fixed
   *  heights with no motion — the shape alone still reads as "audio". */
  animate?: boolean;
  className?: string;
}

// Relative bar heights (0–1). Gives the resting waveform an organic equaliser
// silhouette even when motion is disabled. Bar count derives from this length.
const BAR_HEIGHTS = [0.45, 0.7, 1, 0.85, 1, 0.7, 0.45];

/**
 * Animated audio waveform shown while the word is being spoken (§9.4 / #26).
 *
 * Replaces the old pulsing "🔊 Listen to the word..." text and the spinning
 * speaker emoji with a proper speaking indicator that visually echoes sound.
 * Purely presentational; the GSAP tweens are scoped to the root and auto-
 * reverted by useGSAP on unmount (the component only mounts while speaking).
 */
export function SpeakingWaveform({
  animate = true,
  className = "",
}: SpeakingWaveformProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!animate || !rootRef.current) return;
      const bars = gsap.utils.toArray<HTMLElement>("[data-bar]", rootRef.current);
      bars.forEach((bar, i) => {
        gsap.fromTo(
          bar,
          { scaleY: 0.35 },
          {
            scaleY: 1,
            transformOrigin: "center bottom",
            duration: 0.34 + (i % 3) * 0.12,
            delay: i * 0.06,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          },
        );
      });
    },
    { dependencies: [animate], scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="Listening to the word"
      className={`flex flex-col items-center gap-3 ${className}`}
    >
      <div className="flex h-16 items-end justify-center gap-1 sm:h-20">
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            data-bar
            className="w-1.5 rounded-full bg-primary text-primary sm:w-2"
            style={{
              height: `${Math.round(h * 100)}%`,
              filter: "drop-shadow(0 0 4px currentColor)",
            }}
          />
        ))}
      </div>
      <span className="text-primary text-[10px] font-bold uppercase tracking-[0.3em]">
        Listen to the word
      </span>
    </div>
  );
}

export default SpeakingWaveform;
