export type ThemeId =
  | "hive"
  | "royal"
  | "ice"
  | "forest"
  | "theme_honey"
  | "theme_night";

export interface ThemeColors {
  app: string;
  panel: string;
  surface: string;
  primary: string;
  primaryRgb: string;
  primaryDim: string;
  accent: string;
  textMain: string;
  textMuted: string;
}

export interface ThemeTypography {
  displayFamily: string;
  bodyFamily: string;
  headingTracking: string;
}

export interface ThemeSceneTokens {
  appGradient: string;
  panelGradient: string;
  surfaceGradient: string;
  ambientGlow: string;
  overlayPattern: string;
  borderStrong: string;
  panelShadow: string;
  glowShadow: string;
}

export interface ThemeMotionTokens {
  durationFast: string;
  durationBase: string;
  durationSlow: string;
  easingStandard: string;
  easingEmphasis: string;
  hoverScale: string;
}

export type ThemeTrailStyle =
  | "pollen"
  | "mycelium"
  | "astral"
  | "cathedral"
  | "storm"
  | "arcade";

export interface ThemeCursorTokens {
  defaultItemId: string | null;
  assetPath: string | null;
  pointerAssetPath: string | null;
  activeAssetPath: string | null;
  hotspotX: number;
  hotspotY: number;
  trailOffsetX: number;
  trailOffsetY: number;
  fallbackCursor: string;
  trailColor: string;
  trailGlow: string;
  trailStyle: ThemeTrailStyle | null;
}

export interface ThemeAssetManifest {
  heroPatternSvg: string | null;
  overlayPatternSvg: string | null;
  panelFrameSvg: string | null;
  cursorSvg: string | null;
}

export interface ThemePackage {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  scene: ThemeSceneTokens;
  motion: ThemeMotionTokens;
  cursor: ThemeCursorTokens;
  assets: ThemeAssetManifest;
}

const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  displayFamily: '"Space Grotesk", "Trebuchet MS", sans-serif',
  bodyFamily: '"Inter", "Segoe UI", sans-serif',
  headingTracking: "0.14em",
};

const DEFAULT_MOTION: ThemeMotionTokens = {
  durationFast: "160ms",
  durationBase: "280ms",
  durationSlow: "560ms",
  easingStandard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  easingEmphasis: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  hoverScale: "1.035",
};

export const THEME_PACKAGES: Record<ThemeId, ThemePackage> = {
  hive: {
    id: "hive",
    name: "Hive Classic",
    colors: {
      app: "#0f172a",
      panel: "#1e293b",
      surface: "#334155",
      primary: "#10b981",
      primaryRgb: "16, 185, 129",
      primaryDim: "rgba(16, 185, 129, 0.2)",
      accent: "#f59e0b",
      textMain: "#ffffff",
      textMuted: "#94a3b8",
    },
    typography: DEFAULT_TYPOGRAPHY,
    scene: {
      appGradient:
        "radial-gradient(circle at top left, rgba(16,185,129,0.16), transparent 30%), radial-gradient(circle at bottom right, rgba(245,158,11,0.12), transparent 28%), linear-gradient(180deg, #0f172a 0%, #111827 100%)",
      panelGradient:
        "linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.96) 100%)",
      surfaceGradient:
        "linear-gradient(180deg, rgba(51,65,85,0.9) 0%, rgba(30,41,59,0.92) 100%)",
      ambientGlow:
        "radial-gradient(circle, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0) 68%)",
      overlayPattern:
        "radial-gradient(circle at 24% 24%, rgba(255,255,255,0.06) 1px, transparent 1px)",
      borderStrong: "rgba(16, 185, 129, 0.28)",
      panelShadow: "0 20px 48px rgba(2, 6, 23, 0.38)",
      glowShadow: "0 0 32px rgba(16, 185, 129, 0.22)",
    },
    motion: DEFAULT_MOTION,
    cursor: {
      defaultItemId: "theme_hive_default",
      assetPath: "/themes/hive/cursor-default.svg",
      pointerAssetPath: "/themes/hive/cursor-pointer.svg",
      activeAssetPath: "/themes/hive/cursor-active.svg",
      hotspotX: 8,
      hotspotY: 8,
      trailOffsetX: 0,
      trailOffsetY: 0,
      fallbackCursor: "auto",
      trailColor: "#fbbf24",
      trailGlow: "rgba(251, 191, 36, 0.72)",
      trailStyle: "pollen",
    },
    assets: {
      heroPatternSvg: null,
      overlayPatternSvg: null,
      panelFrameSvg: null,
      cursorSvg: null,
    },
  },
  royal: {
    id: "royal",
    name: "Royal Nectar",
    colors: {
      app: "#160d08",
      panel: "#29170c",
      surface: "#432212",
      primary: "#f59e0b",
      primaryRgb: "245, 158, 11",
      primaryDim: "rgba(245, 158, 11, 0.2)",
      accent: "#fcd34d",
      textMain: "#fff7ed",
      textMuted: "#fdba74",
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      displayFamily: '"Cinzel Variable", "Georgia", serif',
      headingTracking: "0.18em",
    },
    scene: {
      appGradient:
        "radial-gradient(circle at top, rgba(245,158,11,0.16), transparent 24%), radial-gradient(circle at bottom right, rgba(251,191,36,0.12), transparent 30%), linear-gradient(180deg, #160d08 0%, #0d0704 100%)",
      panelGradient:
        "linear-gradient(180deg, rgba(41,23,12,0.98) 0%, rgba(22,13,8,0.95) 100%)",
      surfaceGradient:
        "linear-gradient(180deg, rgba(67,34,18,0.88) 0%, rgba(41,23,12,0.92) 100%)",
      ambientGlow:
        "radial-gradient(circle, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0) 72%)",
      overlayPattern:
        "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 20px), linear-gradient(90deg, rgba(249,115,22,0.06) 0%, rgba(249,115,22,0.06) 1px, transparent 1px, transparent 20px)",
      borderStrong: "rgba(251, 191, 36, 0.32)",
      panelShadow: "0 24px 54px rgba(22, 10, 4, 0.46)",
      glowShadow: "0 0 40px rgba(249, 115, 22, 0.18)",
    },
    motion: {
      ...DEFAULT_MOTION,
      durationSlow: "640ms",
      easingEmphasis: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
    cursor: {
      defaultItemId: "theme_royal_default",
      assetPath: "/themes/royal/cursor-default.svg",
      pointerAssetPath: "/themes/royal/cursor-pointer.svg",
      activeAssetPath: "/themes/royal/cursor-active.svg",
      hotspotX: 3,
      hotspotY: 3,
      trailOffsetX: 1,
      trailOffsetY: 1,
      fallbackCursor: "pointer",
      trailColor: "#fb923c",
      trailGlow: "rgba(249, 115, 22, 0.72)",
      trailStyle: "arcade",
    },
    assets: {
      heroPatternSvg: null,
      overlayPatternSvg: null,
      panelFrameSvg: null,
      cursorSvg: "/themes/royal/cursor.svg",
    },
  },
  ice: {
    id: "ice",
    name: "Glacier Drift",
    colors: {
      app: "#082f49",
      panel: "#0c4a6e",
      surface: "#075985",
      primary: "#38bdf8",
      primaryRgb: "56, 189, 248",
      primaryDim: "rgba(56, 189, 248, 0.2)",
      accent: "#e0f2fe",
      textMain: "#f0f9ff",
      textMuted: "#7dd3fc",
    },
    typography: DEFAULT_TYPOGRAPHY,
    scene: {
      appGradient:
        "radial-gradient(circle at top right, rgba(224,242,254,0.16), transparent 24%), radial-gradient(circle at bottom left, rgba(56,189,248,0.12), transparent 34%), linear-gradient(180deg, #082f49 0%, #031722 100%)",
      panelGradient:
        "linear-gradient(180deg, rgba(12,74,110,0.96) 0%, rgba(8,47,73,0.94) 100%)",
      surfaceGradient:
        "linear-gradient(180deg, rgba(7,89,133,0.9) 0%, rgba(12,74,110,0.94) 100%)",
      ambientGlow:
        "radial-gradient(circle, rgba(56,189,248,0.16) 0%, rgba(56,189,248,0) 72%)",
      overlayPattern:
        "repeating-linear-gradient(165deg, rgba(125,211,252,0.11) 0px, rgba(125,211,252,0.11) 1px, transparent 1px, transparent 18px)",
      borderStrong: "rgba(56, 189, 248, 0.28)",
      panelShadow: "0 20px 44px rgba(3, 23, 34, 0.42)",
      glowShadow: "0 0 34px rgba(56, 189, 248, 0.18)",
    },
    motion: {
      ...DEFAULT_MOTION,
      durationBase: "320ms",
      easingStandard: "cubic-bezier(0.16, 1, 0.3, 1)",
    },
    cursor: {
      defaultItemId: "theme_ice_default",
      assetPath: "/themes/ice/cursor-default.svg",
      pointerAssetPath: "/themes/ice/cursor-pointer.svg",
      activeAssetPath: "/themes/ice/cursor-active.svg",
      hotspotX: 3,
      hotspotY: 3,
      trailOffsetX: 2,
      trailOffsetY: 1,
      fallbackCursor: "pointer",
      trailColor: "#7dd3fc",
      trailGlow: "rgba(125, 211, 252, 0.68)",
      trailStyle: "storm",
    },
    assets: {
      heroPatternSvg: null,
      overlayPatternSvg: null,
      panelFrameSvg: null,
      cursorSvg: "/themes/ice/cursor.svg",
    },
  },
  forest: {
    id: "forest",
    name: "Forest Bloom",
    colors: {
      app: "#14532d",
      panel: "#166534",
      surface: "#15803d",
      primary: "#bef264",
      primaryRgb: "190, 242, 100",
      primaryDim: "rgba(190, 242, 100, 0.2)",
      accent: "#facc15",
      textMain: "#ecfccb",
      textMuted: "#86efac",
    },
    typography: DEFAULT_TYPOGRAPHY,
    scene: {
      appGradient:
        "radial-gradient(circle at top left, rgba(190,242,100,0.14), transparent 28%), radial-gradient(circle at bottom right, rgba(250,204,21,0.1), transparent 24%), linear-gradient(180deg, #14532d 0%, #0f3c21 100%)",
      panelGradient:
        "linear-gradient(180deg, rgba(22,101,52,0.96) 0%, rgba(20,83,45,0.94) 100%)",
      surfaceGradient:
        "linear-gradient(180deg, rgba(21,128,61,0.9) 0%, rgba(22,101,52,0.94) 100%)",
      ambientGlow:
        "radial-gradient(circle, rgba(190,242,100,0.16) 0%, rgba(190,242,100,0) 70%)",
      overlayPattern:
        "radial-gradient(circle at 20% 20%, rgba(236,252,203,0.08) 0 1.2px, transparent 1.2px), radial-gradient(circle at 72% 68%, rgba(190,242,100,0.07) 0 1.2px, transparent 1.2px)",
      borderStrong: "rgba(190, 242, 100, 0.24)",
      panelShadow: "0 22px 48px rgba(7, 30, 16, 0.4)",
      glowShadow: "0 0 32px rgba(190, 242, 100, 0.16)",
    },
    motion: {
      ...DEFAULT_MOTION,
      durationSlow: "700ms",
    },
    cursor: {
      defaultItemId: "theme_forest_default",
      assetPath: "/themes/forest/cursor-default.svg",
      pointerAssetPath: "/themes/forest/cursor-pointer.svg",
      activeAssetPath: "/themes/forest/cursor-active.svg",
      hotspotX: 3,
      hotspotY: 3,
      trailOffsetX: 1,
      trailOffsetY: 1,
      fallbackCursor: "pointer",
      trailColor: "#bef264",
      trailGlow: "rgba(190, 242, 100, 0.64)",
      trailStyle: "mycelium",
    },
    assets: {
      heroPatternSvg: null,
      overlayPatternSvg: null,
      panelFrameSvg: null,
      cursorSvg: "/themes/forest/cursor.svg",
    },
  },
  theme_honey: {
    id: "theme_honey",
    name: "Honey Glaze",
    colors: {
      app: "#24160a",
      panel: "#4b2e12",
      surface: "#6b4115",
      primary: "#fbbf24",
      primaryRgb: "251, 191, 36",
      primaryDim: "rgba(251, 191, 36, 0.2)",
      accent: "#fde68a",
      textMain: "#fff7ed",
      textMuted: "#fcd34d",
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      displayFamily: '"Fraunces Variable", "Georgia", serif',
      headingTracking: "0.16em",
    },
    scene: {
      appGradient:
        "radial-gradient(circle at top left, rgba(251,191,36,0.18), transparent 24%), radial-gradient(circle at bottom right, rgba(253,230,138,0.12), transparent 30%), linear-gradient(180deg, #24160a 0%, #120a05 100%)",
      panelGradient:
        "linear-gradient(180deg, rgba(75,46,18,0.98) 0%, rgba(36,22,10,0.94) 100%)",
      surfaceGradient:
        "linear-gradient(180deg, rgba(107,65,21,0.9) 0%, rgba(75,46,18,0.95) 100%)",
      ambientGlow:
        "radial-gradient(circle, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0) 72%)",
      overlayPattern:
        "linear-gradient(30deg, rgba(251,191,36,0.09) 12%, transparent 12.5%, transparent 87%, rgba(251,191,36,0.09) 87.5%, rgba(251,191,36,0.09)), linear-gradient(150deg, rgba(251,191,36,0.09) 12%, transparent 12.5%, transparent 87%, rgba(251,191,36,0.09) 87.5%, rgba(251,191,36,0.09)), linear-gradient(90deg, rgba(251,191,36,0.07) 2%, transparent 2.5%, transparent 97%, rgba(251,191,36,0.07) 97.5%, rgba(251,191,36,0.07))",
      borderStrong: "rgba(251, 191, 36, 0.34)",
      panelShadow: "0 24px 56px rgba(25, 11, 3, 0.46)",
      glowShadow: "0 0 40px rgba(251, 191, 36, 0.22)",
    },
    motion: {
      ...DEFAULT_MOTION,
      durationSlow: "760ms",
      hoverScale: "1.045",
    },
    cursor: {
      defaultItemId: "theme_honey_default",
      assetPath: "/themes/theme_honey/cursor-default.svg",
      pointerAssetPath: "/themes/theme_honey/cursor-pointer.svg",
      activeAssetPath: "/themes/theme_honey/cursor-active.svg",
      hotspotX: 3,
      hotspotY: 3,
      trailOffsetX: 1,
      trailOffsetY: 1,
      fallbackCursor: "pointer",
      trailColor: "#fbbf24",
      trailGlow: "rgba(251, 191, 36, 0.78)",
      trailStyle: "cathedral",
    },
    assets: {
      heroPatternSvg: null,
      overlayPatternSvg: null,
      panelFrameSvg: null,
      cursorSvg: "/themes/theme_honey/cursor.svg",
    },
  },
  theme_night: {
    id: "theme_night",
    name: "Astral Archive",
    colors: {
      app: "#060a14",
      panel: "#10172f",
      surface: "#1d3b70",
      primary: "#60a5fa",
      primaryRgb: "96, 165, 250",
      primaryDim: "rgba(96, 165, 250, 0.18)",
      accent: "#bfdbfe",
      textMain: "#eff6ff",
      textMuted: "#93c5fd",
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      displayFamily: '"Sora", "Space Grotesk", sans-serif',
      headingTracking: "0.2em",
    },
    scene: {
      appGradient:
        "radial-gradient(circle at 78% 18%, rgba(96,165,250,0.18), transparent 20%), radial-gradient(circle at 18% 78%, rgba(59,130,246,0.14), transparent 24%), linear-gradient(180deg, #060a14 0%, #03060d 100%)",
      panelGradient:
        "linear-gradient(180deg, rgba(16,23,47,0.98) 0%, rgba(6,10,20,0.96) 100%)",
      surfaceGradient:
        "linear-gradient(180deg, rgba(29,59,112,0.8) 0%, rgba(16,23,47,0.94) 100%)",
      ambientGlow:
        "radial-gradient(circle, rgba(96,165,250,0.18) 0%, rgba(96,165,250,0) 72%)",
      overlayPattern:
        "radial-gradient(circle at 18% 22%, rgba(191,219,254,0.1) 1px, transparent 1px), radial-gradient(circle at 78% 16%, rgba(96,165,250,0.12) 1px, transparent 1px)",
      borderStrong: "rgba(96, 165, 250, 0.28)",
      panelShadow: "0 26px 60px rgba(2, 6, 18, 0.56)",
      glowShadow: "0 0 46px rgba(96, 165, 250, 0.16)",
    },
    motion: {
      ...DEFAULT_MOTION,
      durationBase: "240ms",
      durationSlow: "520ms",
      easingEmphasis: "cubic-bezier(0.16, 1, 0.3, 1)",
      hoverScale: "1.05",
    },
    cursor: {
      defaultItemId: "theme_night_default",
      assetPath: "/themes/theme_night/cursor-default.svg",
      pointerAssetPath: "/themes/theme_night/cursor-pointer.svg",
      activeAssetPath: "/themes/theme_night/cursor-active.svg",
      hotspotX: 3,
      hotspotY: 3,
      trailOffsetX: 1,
      trailOffsetY: 1,
      fallbackCursor: "pointer",
      trailColor: "#22d3ee",
      trailGlow: "rgba(34, 211, 238, 0.72)",
      trailStyle: "astral",
    },
    assets: {
      heroPatternSvg: "/themes/theme_night/hero-pattern.svg",
      overlayPatternSvg: "/themes/theme_night/overlay-pattern.svg",
      panelFrameSvg: "/themes/theme_night/panel-frame.svg",
      cursorSvg: "/themes/theme_night/cursor.svg",
    },
  },
};

export const DEFAULT_THEME_ID: ThemeId = "hive";

export const getThemePackage = (themeId?: ThemeId | null) =>
  THEME_PACKAGES[themeId ?? DEFAULT_THEME_ID] ?? THEME_PACKAGES[DEFAULT_THEME_ID];

export const THEME_COLORS = Object.fromEntries(
  Object.entries(THEME_PACKAGES).map(([themeId, themePackage]) => [
    themeId,
    themePackage.colors,
  ]),
) as Record<ThemeId, ThemeColors>;
