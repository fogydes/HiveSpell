/**
 * Scene Package Components - Phase 1: Scene Package Architecture
 * Export all scene-related components and hooks
 */

// Context
export { SceneProvider, useScene, useCurrentScene, usePerformanceTier, useCursor, useAudioReactive } from "@/context/SceneContext";
export type { SceneContextValue } from "@/context/SceneContext";

// Scene layer components
export { AmbientBase } from "./AmbientBase";
export { ParticleField } from "./ParticleField";
export { AudioReactive, useAudioReactiveValues } from "./AudioReactive";
export { SceneCanvasLayer } from "./SceneCanvasLayer";

// Scene transitions
export { SceneTransition, DifficultyChangeTransition, RoundTransition, useTransitions } from "./SceneTransition";
export type { SceneTransitionProps, DifficultyChangeTransitionProps, RoundTransitionProps } from "./SceneTransition";

// Cursor trail
export { useCursorTrail, CursorTrailRenderer } from "@/hooks/useCursorTrail";

// Scene specifications
export type {
  SceneId,
  ColorTokenSet,
  AmbientSpec,
  ParticlePreset,
  CursorPreset,
  AudioTexture,
  TransitionChoreography,
  PerformanceTier,
  ScenePackage,
} from "@/data/themes/sceneSpecs";

export {
  SCENE_PACKAGES,
  DEFAULT_SCENE_ID,
  getScenePackage,
  THEME_TO_SCENE_MAP,
  SCENE_DEFAULT,
  SCENE_NEON,
  SCENE_NATURE,
  SCENE_CYBER,
  SCENE_MINIMAL,
} from "@/data/themes/scenePackages";