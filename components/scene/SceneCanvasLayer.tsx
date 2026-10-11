/**
 * SceneCanvasLayer — the public ambient background gate for resting views.
 *
 * Mount this as a child of a `.theme-scene` view (behind its `relative z-10`
 * panels). It decides, from the active {@link useScene} tier and the scene's own
 * `performance` flags, whether to render:
 *
 *   - nothing            → static tier, reduced motion, or a scene that opts out
 *                          of ambient glow (e.g. "minimal"). CSS handles the bg.
 *   - hand-written canvas → reduced tier: AmbientBase + ParticleField, no WebGL.
 *   - the WebGL layer     → full tier: the lazily-imported {@link WebGLScene},
 *                          which falls back to the canvas effects on GL failure.
 *
 * `three` is reached only through the lazy import below, so it is code-split into
 * its own async chunk and never enters the main bundle. The static / reduced-motion
 * paths never even request that chunk.
 */

import React, { Suspense, lazy, Component, type ReactNode } from "react";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { AmbientBase } from "./AmbientBase";
import { ParticleField } from "./ParticleField";

const WebGLScene = lazy(() =>
  import("./webgl/WebGLScene").then((mod) => ({ default: mod.WebGLScene })),
);

/**
 * Catches synchronous render/chunk-load failures from the WebGL subtree and shows
 * the canvas fallback. (Runtime GL context loss is handled inside WebGLScene via
 * its `fallbackNode`, since errors thrown from effects don't reach error boundaries.)
 */
class WebGLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface SceneCanvasLayerProps {
  /** Extra classes merged onto the fixed, viewport-filling host div. */
  className?: string;
}

export function SceneCanvasLayer({ className = "" }: SceneCanvasLayerProps) {
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const perf = currentScene.performance[performanceTier];

  // Static tier / reduced motion / scene without ambient glow → CSS-only, no JS layer.
  if (reduceMotion || performanceTier === "static" || !perf.ambientGlow) {
    return null;
  }

  const canvasFallback = (
    <>
      <AmbientBase />
      <ParticleField />
    </>
  );

  const layerClass = `pointer-events-none fixed inset-0 z-0 ${className}`.trim();

  // Reduced tier → hand-written canvas effects only (deliberately no WebGL).
  if (performanceTier !== "full") {
    return (
      <div className={layerClass} aria-hidden="true" style={{ position: "fixed" }}>
        {canvasFallback}
      </div>
    );
  }

  // Full tier → lazy WebGL, degrading to the canvas effects on any failure.
  return (
    <div className={layerClass} aria-hidden="true" style={{ position: "fixed" }}>
      <WebGLErrorBoundary fallback={canvasFallback}>
        <Suspense fallback={null}>
          <WebGLScene fallbackNode={canvasFallback} />
        </Suspense>
      </WebGLErrorBoundary>
    </div>
  );
}
