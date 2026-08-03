/**
 * Scene Package Specification v2
 * Elevates theme packages from color swaps to distinct atmospheric scenes
 * with ambient layers, particle fields, audio-reactive backgrounds, and cursor as gameplay extension
 */

export type SceneId =
  | "default"
  | "neon"
  | "nature"
  | "cyber"
  | "minimal";

/** Color token set for a scene - extends theme colors with semantic UI tokens */
export interface ColorTokenSet {
  // Base theme colors
  app: string;
  panel: string;
  surface: string;
  primary: string;
  primaryRgb: string;
  primaryDim: string;
  accent: string;
  textMain: string;
  textMuted: string;

  // Semantic UI tokens
  success: string;
  warning: string;
  error: string;
  info: string;

  // Interactive states
  hover: string;
  active: string;
  focus: string;
  disabled: string;

  // Border & divider
  border: string;
  borderStrong: string;
  divider: string;

  // Overlay & modal
  overlay: string;
  overlayBackdrop: string;
}

/** Ambient base layer specification - gradients, glows, atmospheric effects */
export interface AmbientSpec {
  // Main app background gradient
  appGradient: string;

  // Panel/surface gradients
  panelGradient: string;
  surfaceGradient: string;

  // Ambient glow effects
  ambientGlow: string;
  glowIntensity: number; // 0-1

  // Overlay patterns
  overlayPattern: string;
  patternOpacity: number;

  // Shadow system
  panelShadow: string;
  glowShadow: string;
  elevationShadows: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
  };

  // Blur & backdrop
  backdropBlur: string;
  glassBlur: string;
}

/** Particle field preset - type, count, physics, color mapping */
export interface ParticlePreset {
  type: "pollen" | "snow" | "embers" | "stars" | "digital" | "leaves" | "hex" | "circuit" | "none";
  count: number;
  sizeRange: [number, number]; // min, max in px
  speedRange: [number, number]; // min, max in px/s
  colorMapping: "primary" | "accent" | "textMuted" | "custom" | "gradient";
  customColors?: string[];

  // Physics
  gravity: number; // -1 to 1
  wind: number; // -1 to 1
  turbulence: number; // 0-1
  lifespan: [number, number]; // min, max in seconds
  spawnRate: number; // particles per second

  // Interaction
  cursorAttraction: boolean;
  cursorRepulsion: boolean;
  clickBurst: boolean;
  audioReactive: boolean;

  // Performance
  maxParticles: number;
  useCanvas: boolean; // true = canvas/WebGL, false = DOM
}

/** Cursor preset - shape, trail, streak mapping */
export interface CursorPreset {
  // Shape variants
  defaultShape: "default" | "crosshair" | "hex" | "crystal" | "crown" | "bee" | "pointer";
  pointerShape: "default" | "crosshair" | "hex" | "crystal" | "crown" | "bee" | "pointer";
  activeShape: "default" | "crosshair" | "hex" | "crystal" | "crown" | "bee" | "pointer";

  // Asset paths (SVG)
  defaultAsset: string | null;
  pointerAsset: string | null;
  activeAsset: string | null;

  // Hotspot (for custom cursors)
  hotspotX: number;
  hotspotY: number;

  // Trail system
  trailEnabled: boolean;
  trailStyle: "pollen" | "mycelium" | "astral" | "cathedral" | "storm" | "arcade" | "digital" | "none";
  trailColor: string;
  trailGlow: string;
  trailLength: number; // max trail points
  trailOffsetX: number;
  trailOffsetY: number;

  // Streak reactivity
  streakIntensityMapping: {
    0: number;   // base intensity
    3: number;   // 3+ streak
    5: number;   // 5+ streak
    10: number;  // 10+ streak
    20: number;  // 20+ streak
  };
  streakColorShift: {
    threshold: number; // streak count
    color: string;
    glow: string;
  }[];

  // Click feedback
  clickBurst: boolean;
  clickBurstColor: string;
  clickBurstParticleCount: number;
}

/** Audio texture - background hum, UI sound variants */
export interface AudioTexture {
  // Ambient background hum (looping)
  ambientHum: string | null; // asset path or data URI
  humVolume: number; // 0-1

  // UI sound variants per scene
  sounds: {
    correct: string | null;
    incorrect: string | null;
    turnHandoff: string | null;
    elimination: string | null;
    victory: string | null;
    wordSpoken: string | null;
    buttonHover: string | null;
    buttonClick: string | null;
    notification: string | null;
  };

  // Audio-reactive visual sync
  reactive: {
    enabled: boolean;
    frequencies: "bass" | "mid" | "treble" | "full";
    sensitivity: number; // 0-1
    pulseColor: string;
    pulseIntensity: number;
  };
}

/** Transition choreography - enter/exit, difficulty change */
export interface TransitionChoreography {
  // Scene enter (Lobby → Play)
  enter: {
    type: "iris" | "morph" | "slide" | "fade" | "particle";
    duration: string;
    easing: string;
    color: string;
  };

  // Scene exit (Play → Lobby)
  exit: {
    type: "iris" | "morph" | "slide" | "fade" | "particle";
    duration: string;
    easing: string;
    color: string;
  };

  // Difficulty change transition
  difficultyChange: {
    type: "morph" | "particle" | "pulse";
    duration: string;
    easing: string;
  };

  // Round transitions
  roundStart: {
    type: "pulse" | "reveal";
    duration: string;
  };
  roundEnd: {
    type: "fade" | "collapse";
    duration: string;
  };
}

/** Performance tier configuration */
export interface PerformanceTier {
  full: {
    particles: boolean;
    audioReactive: boolean;
    cursorTrail: boolean;
    ambientGlow: boolean;
    overlayPattern: boolean;
  };
  reduced: {
    particles: boolean;
    audioReactive: boolean;
    cursorTrail: boolean;
    ambientGlow: boolean;
    overlayPattern: boolean;
  };
  static: {
    particles: boolean;
    audioReactive: boolean;
    cursorTrail: boolean;
    ambientGlow: boolean;
    overlayPattern: boolean;
  };
}

/** Complete Scene Package definition */
export interface ScenePackage {
  id: SceneId;
  displayName: string;
  description: string;
  colorTokens: ColorTokenSet;
  ambient: AmbientSpec;
  particles: ParticlePreset;
  cursor: CursorPreset;
  audioTexture: AudioTexture;
  transitions: TransitionChoreography;
  performance: PerformanceTier;
  // Inheritance from base theme
  baseThemeId: string;
}

/** Scene context value for React hook */
export interface SceneContextValue {
  currentScene: ScenePackage;
  performanceTier: "full" | "reduced" | "static";
  setScene: (sceneId: SceneId) => void;
  setPerformanceTier: (tier: "full" | "reduced" | "static") => void;
  // Reactive state
  cursorPosition: { x: number; y: number };
  setCursorPosition: (pos: { x: number; y: number }) => void;
  streak: number;
  setStreak: (streak: number) => void;
  // Audio analysis
  audioLevel: number; // 0-1
  setAudioLevel: (level: number) => void;
}