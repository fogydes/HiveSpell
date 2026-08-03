import React, { useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useScene, usePerformanceTier } from "@/context/SceneContext";
import type { ParticlePreset } from "@/data/themes/sceneSpecs";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  angle: number;
  angularVelocity: number;
}

interface ParticleFieldProps {
  /** Override particle count for testing/performance */
  particleCount?: number;
  /** Container ref for positioning */
  containerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * ParticleField - Renders animated particle systems based on scene preset
 * Supports: pollen, snow, embers, stars, digital, leaves, hex, circuit, none
 * Can use Canvas (WebGL-like) or DOM-based rendering
 */
export const ParticleField = memo(function ParticleField({
  particleCount,
  containerRef,
}: ParticleFieldProps) {
  const { currentScene, cursorPosition, performanceTier } = useScene();
  const particles = currentScene.particles;
  const perf = currentScene.performance[performanceTier];

  // Don't render if particles disabled or preset is "none"
  if (!perf.particles || particles.type === "none") {
    return null;
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastSpawnRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const cursorPosRef = useRef(cursorPosition);
  const containerSizeRef = useRef({ width: 0, height: 0 });

  // Update cursor ref
  useEffect(() => {
    cursorPosRef.current = cursorPosition;
  }, [cursorPosition]);

  // Generate colors based on colorMapping
  const colorPalette = useMemo(() => {
    switch (particles.colorMapping) {
      case "primary": {
        const [r, g, b] = currentScene.colorTokens.primaryRgb.split(",").map(Number);
        return [
          `rgba(${r}, ${g}, ${b}, 0.8)`,
          `rgba(${r}, ${g}, ${b}, 0.6)`,
          `rgba(${r}, ${g}, ${b}, 0.4)`,
        ];
      }
      case "accent": {
        const hex = currentScene.colorTokens.accent.replace("#", "");
        const [r, g, b] = hex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? [245, 158, 11];
        return [
          `rgba(${r}, ${g}, ${b}, 0.8)`,
          `rgba(${r}, ${g}, ${b}, 0.6)`,
          `rgba(${r}, ${g}, ${b}, 0.4)`,
        ];
      }
      case "textMuted": {
        const hex = currentScene.colorTokens.textMuted.replace("#", "");
        const [r, g, b] = hex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? [148, 163, 184];
        return [
          `rgba(${r}, ${g}, ${b}, 0.6)`,
          `rgba(${r}, ${g}, ${b}, 0.4)`,
          `rgba(${r}, ${g}, ${b}, 0.2)`,
        ];
      }
      case "custom":
        return particles.customColors ?? [
          currentScene.colorTokens.primary,
          currentScene.colorTokens.accent,
          currentScene.colorTokens.textMuted,
        ];
      case "gradient":
        return particles.customColors ?? [
          currentScene.colorTokens.primary,
          currentScene.colorTokens.accent,
        ];
      default:
        return [currentScene.colorTokens.primary];
    }
  }, [currentScene, particles.colorMapping, particles.customColors]);

  // Create a new particle
  const createParticle = useCallback((): Particle => {
    const width = canvasSizeRef.current.width;
    const height = canvasSizeRef.current.height;
    const dpr = devicePixelRatio;

    // Spawn at random edge
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0: // top
        x = Math.random() * width;
        y = -50 * dpr;
        break;
      case 1: // right
        x = width + 50 * dpr;
        y = Math.random() * height;
        break;
      case 2: // bottom
        x = Math.random() * width;
        y = height + 50 * dpr;
        break;
      default: // left
        x = -50 * dpr;
        y = Math.random() * height;
    }

    // Velocity based on type
    const speed =
      particles.speedRange[0] +
      Math.random() * (particles.speedRange[1] - particles.speedRange[0]);
    const angle = Math.random() * Math.PI * 2;

    let vx = Math.cos(angle) * speed * dpr;
    let vy = Math.sin(angle) * speed * dpr;

    // Type-specific velocity adjustments
    if (particles.type === "snow") {
      vy = Math.abs(vy) * 0.5; // slow fall
      vx *= 0.3;
    } else if (particles.type === "embers") {
      vy = -Math.abs(vy) * 0.8; // rise up
    } else if (particles.type === "digital" || particles.type === "circuit") {
      // Grid-like movement
      vx = (Math.random() - 0.5) * speed * dpr;
      vy = (Math.random() - 0.5) * speed * dpr;
    }

    return {
      x,
      y,
      vx,
      vy,
      size:
        particles.sizeRange[0] +
        Math.random() * (particles.sizeRange[1] - particles.sizeRange[0]),
      color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
      life: 0,
      maxLife:
        particles.lifespan[0] +
        Math.random() * (particles.lifespan[1] - particles.lifespan[0]),
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.05,
    };
  }, [particles, colorPalette]);

  // Resize handler
  const resize = useCallback(() => {
    const container = containerRef?.current ?? document.body;
    const rect = container.getBoundingClientRect();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = devicePixelRatio;
    canvasSizeRef.current = {
      width: rect.width * dpr,
      height: rect.height * dpr,
    };
    containerSizeRef.current = {
      width: rect.width,
      height: rect.height,
    };
    canvas.width = canvasSizeRef.current.width;
    canvas.height = canvasSizeRef.current.height;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }, [containerRef]);

  // Initialize and animation loop
  useEffect(() => {
    if (performanceTier === "static") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    resize();
    window.addEventListener("resize", resize);

    // Initial particle spawn
    const count = particleCount ?? particles.count;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(createParticle());
    }

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000; // delta in seconds
      lastTime = currentTime;

      const width = canvasSizeRef.current.width;
      const height = canvasSizeRef.current.height;
      const dpr = devicePixelRatio;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      const aliveParticles: Particle[] = [];

      for (const p of particlesRef.current) {
        // Age particle
        p.life += dt;
        if (p.life >= p.maxLife) continue;

        // Physics
        p.vy += particles.gravity * 50 * dt * devicePixelRatio; // gravity
        p.vx += particles.wind * 30 * dt * devicePixelRatio; // wind

        // Turbulence
        if (particles.turbulence > 0) {
          const turb = (Math.random() - 0.5) * particles.turbulence * 100 * dt * devicePixelRatio;
          p.vx += turb;
          p.vy += turb;
        }

        // Cursor attraction/repulsion
        if (particles.cursorAttraction || particles.cursorRepulsion) {
          const dx = cursorPosRef.current.x * devicePixelRatio - p.x;
          const dy = cursorPosRef.current.y * devicePixelRatio - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 300 * devicePixelRatio;

          if (dist < maxDist && dist > 0) {
            const force = (1 - dist / maxDist) * 200 * dt * devicePixelRatio;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (particles.cursorAttraction) {
              p.vx += fx;
              p.vy += fy;
            }
            if (particles.cursorRepulsion) {
              p.vx -= fx;
              p.vy -= fy;
            }
          }
        }

        // Update position
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.angularVelocity * dt;

        // Wrap around edges for certain types
        if (particles.type === "digital" || particles.type === "circuit" || particles.type === "stars") {
          if (p.x < -100 * devicePixelRatio) p.x = width + 100 * devicePixelRatio;
          if (p.x > width + 100 * devicePixelRatio) p.x = -100 * devicePixelRatio;
          if (p.y < -100 * devicePixelRatio) p.y = height + 100 * devicePixelRatio;
          if (p.y > height + 100 * devicePixelRatio) p.y = -100 * devicePixelRatio;
        }

        // Audio reactive size boost (simplified)
        // In real implementation, this would come from audio analysis
        let displaySize = p.size;
        if (particles.audioReactive) {
          const audioBoost = 1; // Would be tied to actual audio level
          displaySize *= audioBoost;
        }

        // Draw particle
        const alpha = 1 - p.life / p.maxLife;
        const color = p.color.replace(/[\d.]+\)$/g, `${alpha})`);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = alpha;

        // Type-specific rendering
        switch (particles.type) {
          case "pollen":
          case "snow":
          case "embers":
          case "stars": {
            // Soft circle
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, displaySize * dpr);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, displaySize * dpr, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case "leaves": {
            // Leaf shape
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(0, 0, displaySize * dpr, displaySize * 0.6 * dpr, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case "hex": {
            // Hexagon
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              const px = Math.cos(a) * displaySize * dpr;
              const py = Math.sin(a) * displaySize * dpr;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            break;
          }
          case "digital":
          case "circuit": {
            // Square/rect (pixel style)
            ctx.fillStyle = color;
            ctx.fillRect(
              -displaySize * 0.5 * dpr,
              -displaySize * 0.5 * dpr,
              displaySize * dpr,
              displaySize * dpr
            );
            break;
          }
        }

        ctx.restore();
        aliveParticles.push(p);
      }

      particlesRef.current = aliveParticles;

      // Spawn new particles
      const maxParticles = Math.min(particles.maxParticles, particleCount ?? particles.count);
      const spawnInterval = 1 / particles.spawnRate;
      if (currentTime - lastSpawnRef.current > spawnInterval * 1000) {
        lastSpawnRef.current = currentTime;
        if (particlesRef.current.length < maxParticles) {
          const spawnCount = Math.min(2, maxParticles - particlesRef.current.length);
          for (let i = 0; i < spawnCount; i++) {
            particlesRef.current.push(createParticle());
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    performanceTier,
    resize,
    createParticle,
    particleCount,
    particles,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-field"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
});

ParticleField.displayName = "ParticleField";