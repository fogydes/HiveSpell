import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import type { ThemeTrailStyle } from "../data/themePackages";

interface BaseTrailParticle {
  id: number;
  x: number;
  y: number;
  ttl: number;
}

interface OrbTrailParticle extends BaseTrailParticle {
  kind: "pollen" | "mycelium" | "cathedral";
  size: number;
  offsetX: number;
  offsetY: number;
}

interface AstralTrailParticle extends BaseTrailParticle {
  kind: "astral";
  size: number;
}

interface ArcadeTrailParticle extends BaseTrailParticle {
  kind: "arcade";
  size: number;
}

interface StormBranch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface StormTrailParticle extends BaseTrailParticle {
  kind: "storm";
  branches: StormBranch[];
}

type TrailParticle =
  | OrbTrailParticle
  | AstralTrailParticle
  | ArcadeTrailParticle
  | StormTrailParticle;

const POLLEN_TTL_MS = 420;
const MYCELIUM_TTL_MS = 760;
const CATHEDRAL_TTL_MS = 680;
const ASTRAL_TTL_MS = 640;
const STORM_TTL_MS = 180;
const ARCADE_TTL_MS = 260;
const MAX_ASTRAL_POINTS = 14;

const buildLightningBranches = (
  x: number,
  y: number,
  depth: number,
  spread: number,
): StormBranch[] => {
  if (depth <= 0) {
    return [];
  }

  const branches: StormBranch[] = [];
  const count = depth === 3 ? 3 : 2;

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const length = 7 + Math.random() * (depth === 3 ? 14 : 10);
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;

    branches.push({ x1: x, y1: y, x2, y2 });
    branches.push(
      ...buildLightningBranches(x2, y2, depth - 1, spread * 0.72),
    );
  }

  return branches;
};

const CustomizationEffects: React.FC = () => {
  const { activeCursorId, themePackage } = useSettings();
  const [trail, setTrail] = useState<TrailParticle[]>([]);
  const nextIdRef = useRef(0);

  const trailStyle = useMemo<ThemeTrailStyle | null>(() => {
    if (activeCursorId === "cursor_pollen") {
      return "pollen";
    }

    return themePackage.cursor.trailStyle;
  }, [activeCursorId, themePackage.cursor.trailStyle]);

  const trailOriginX = themePackage.cursor.trailOffsetX;
  const trailOriginY = themePackage.cursor.trailOffsetY;

  useEffect(() => {
    setTrail([]);

    if (!trailStyle) {
      return;
    }

    const timers = new Set<number>();
    let distanceAccumulator = 0;
    let previousX = 0;
    let previousY = 0;
    let hasPrevious = false;

    const pushParticle = (particle: TrailParticle) => {
      setTrail((prev) => {
        if (particle.kind === "astral") {
          const astralParticles = prev.filter((entry) => entry.kind === "astral");
          const others = prev.filter((entry) => entry.kind !== "astral");
          return [...others, ...astralParticles.slice(-(MAX_ASTRAL_POINTS - 1)), particle];
        }

        return [...prev, particle];
      });

      const timeoutId = window.setTimeout(() => {
        setTrail((prev) => prev.filter((entry) => entry.id !== particle.id));
        timers.delete(timeoutId);
      }, particle.ttl);

      timers.add(timeoutId);
    };

    const spawnParticles = (x: number, y: number) => {
      if (trailStyle === "pollen") {
        pushParticle({
          id: nextIdRef.current++,
          kind: "pollen",
          x,
          y,
          ttl: POLLEN_TTL_MS,
          size: 7,
          offsetX: 0,
          offsetY: 0,
        });
        return;
      }

      if (trailStyle === "astral") {
        pushParticle({
          id: nextIdRef.current++,
          kind: "astral",
          x,
          y,
          ttl: ASTRAL_TTL_MS,
          size: 10,
        });
        return;
      }

      if (trailStyle === "mycelium") {
        for (let index = 0; index < 3; index += 1) {
          pushParticle({
            id: nextIdRef.current++,
            kind: "mycelium",
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            ttl: MYCELIUM_TTL_MS,
            size: 4 + Math.random() * 3,
            offsetX: (Math.random() - 0.5) * 18,
            offsetY: -10 - Math.random() * 22,
          });
        }
        return;
      }

      if (trailStyle === "cathedral") {
        for (let index = 0; index < 2; index += 1) {
          pushParticle({
            id: nextIdRef.current++,
            kind: "cathedral",
            x: x + (Math.random() - 0.5) * 4,
            y,
            ttl: CATHEDRAL_TTL_MS,
            size: 3 + Math.random() * 3,
            offsetX: (Math.random() - 0.5) * 24,
            offsetY: -12 - Math.random() * 18,
          });
        }
        return;
      }

      if (trailStyle === "storm") {
        pushParticle({
          id: nextIdRef.current++,
          kind: "storm",
          x,
          y,
          ttl: STORM_TTL_MS,
          branches: buildLightningBranches(x, y, 3, Math.PI * 0.62),
        });
        return;
      }

      if (trailStyle === "arcade") {
        pushParticle({
          id: nextIdRef.current++,
          kind: "arcade",
          x: Math.round(x / 10) * 10,
          y: Math.round(y / 10) * 10,
          ttl: ARCADE_TTL_MS,
          size: 8,
        });
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const x = event.clientX + trailOriginX;
      const y = event.clientY + trailOriginY;

      if (!hasPrevious) {
        previousX = x;
        previousY = y;
        hasPrevious = true;
      }

      const distance = Math.hypot(x - previousX, y - previousY);
      distanceAccumulator += distance;

      while (distanceAccumulator > 7) {
        spawnParticles(x, y);
        distanceAccumulator -= 7;
      }

      previousX = x;
      previousY = y;
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      timers.forEach((timeoutId) => window.clearTimeout(timeoutId));
      setTrail([]);
    };
  }, [trailOriginX, trailOriginY, trailStyle]);

  if (!trailStyle || trail.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] overflow-hidden">
      {trail.map((particle, index) => {
        if (particle.kind === "storm") {
          return (
            <span
              key={particle.id}
              className="absolute left-0 top-0 block animate-[stormFlash_180ms_ease-out_forwards]"
            >
              {particle.branches.map((branch, branchIndex) => {
                const dx = branch.x2 - branch.x1;
                const dy = branch.y2 - branch.y1;
                const length = Math.hypot(dx, dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                return (
                  <span
                    key={`${particle.id}-${branchIndex}`}
                    className="absolute left-0 top-0 origin-left rounded-full"
                    style={{
                      left: `${branch.x1}px`,
                      top: `${branch.y1}px`,
                      width: `${length}px`,
                      height: "1.2px",
                      transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0.92) 0%, var(--cursor-trail-color) 72%, transparent 100%)",
                      boxShadow: `0 0 12px var(--cursor-trail-glow)`,
                    }}
                  />
                );
              })}
              <span
                className="absolute block rounded-full"
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                  width: "5px",
                  height: "5px",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "color-mix(in srgb, var(--cursor-trail-color) 82%, white)",
                  boxShadow: `0 0 12px var(--cursor-trail-glow)`,
                }}
              />
            </span>
          );
        }

        if (particle.kind === "astral") {
          const scale = 1 - index / (trail.length + 2);
          const opacity = 0.5 + index / (trail.length + 4);
          const size = particle.size * scale + 3;

          return (
            <span
              key={particle.id}
              className="absolute block"
              style={{
                left: particle.x,
                top: particle.y,
                width: `${size}px`,
                height: `${size}px`,
                opacity,
                transform: "translate(-50%, -50%)",
                transition: "opacity 220ms ease-out, transform 220ms ease-out",
              }}
            >
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  border:
                    "1px solid color-mix(in srgb, var(--cursor-trail-color) 65%, white)",
                  boxShadow: `0 0 16px var(--cursor-trail-glow)`,
                  opacity: 0.75,
                }}
              />
              <span
                className="absolute left-1/2 top-1/2 block"
                style={{
                  width: `${size * 0.45}px`,
                  height: `${size * 0.45}px`,
                  backgroundColor: "var(--cursor-trail-color)",
                  transform: "translate(-50%, -50%) rotate(45deg)",
                  boxShadow: `0 0 14px var(--cursor-trail-glow)`,
                }}
              />
              {index === 0 && (
                <>
                  <span
                    className="absolute left-1/2 top-1/2 block"
                    style={{
                      width: `${size * 1.8}px`,
                      height: "1px",
                      backgroundColor:
                        "color-mix(in srgb, var(--cursor-trail-color) 78%, white)",
                      transform: "translate(-50%, -50%)",
                      boxShadow: `0 0 12px var(--cursor-trail-glow)`,
                    }}
                  />
                  <span
                    className="absolute left-1/2 top-1/2 block"
                    style={{
                      width: "1px",
                      height: `${size * 1.8}px`,
                      backgroundColor:
                        "color-mix(in srgb, var(--cursor-trail-color) 78%, white)",
                      transform: "translate(-50%, -50%)",
                      boxShadow: `0 0 12px var(--cursor-trail-glow)`,
                    }}
                  />
                </>
              )}
            </span>
          );
        }

        if (particle.kind === "arcade") {
          return (
            <span
              key={particle.id}
              className="absolute block animate-[pixelBlink_260ms_steps(2,end)_forwards]"
              style={{
                left: particle.x,
                top: particle.y,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                transform: "translate(-50%, -50%)",
                backgroundColor: "var(--cursor-trail-color)",
                boxShadow: `0 0 12px var(--cursor-trail-glow)`,
                imageRendering: "pixelated",
              }}
            />
          );
        }

        return (
          <span
            key={particle.id}
            className={`absolute block rounded-full ${
              particle.kind === "mycelium"
                ? "animate-[sporeFloat_760ms_ease-out_forwards]"
                : particle.kind === "cathedral"
                  ? "animate-[emberRise_680ms_ease-out_forwards]"
                  : "animate-[trailFade_420ms_ease-out_forwards]"
            }`}
            style={{
              left: particle.x,
              top: particle.y,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              transform: "translate(-50%, -50%)",
              backgroundColor: "var(--cursor-trail-color)",
              boxShadow: `0 0 14px var(--cursor-trail-glow)`,
              ["--trail-offset-x" as string]: `${particle.offsetX}px`,
              ["--trail-offset-y" as string]: `${particle.offsetY}px`,
            }}
          />
        );
      })}
    </div>
  );
};

export default CustomizationEffects;
