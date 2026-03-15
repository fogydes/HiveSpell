import React, { useEffect, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";

interface TrailPoint {
  id: number;
  x: number;
  y: number;
}

const POLLEN_TTL_MS = 500;
const MAX_POINTS = 10;

const CustomizationEffects: React.FC = () => {
  const { equippedCursor } = useSettings();
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    if (equippedCursor !== "cursor_pollen") {
      setTrail([]);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const point = {
        id: nextIdRef.current++,
        x: event.clientX,
        y: event.clientY,
      };

      setTrail((prev) => [...prev.slice(-(MAX_POINTS - 1)), point]);

      window.setTimeout(() => {
        setTrail((prev) => prev.filter((entry) => entry.id !== point.id));
      }, POLLEN_TTL_MS);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [equippedCursor]);

  if (equippedCursor !== "cursor_pollen") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] overflow-hidden">
      {trail.map((point, index) => {
        const scale = 1 - index / (trail.length + 2);
        const opacity = 0.5 + index / (trail.length + 4);

        return (
          <span
            key={point.id}
            className="absolute block rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.75)]"
            style={{
              left: point.x,
              top: point.y,
              width: `${8 * scale}px`,
              height: `${8 * scale}px`,
              opacity,
              transform: "translate(-50%, -50%)",
              transition: "opacity 180ms ease-out, transform 180ms ease-out",
            }}
          />
        );
      })}
    </div>
  );
};

export default CustomizationEffects;
