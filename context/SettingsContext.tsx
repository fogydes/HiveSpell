import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import {
  setProfileTheme,
  setProfileCustomizationSlot,
} from "../services/profileService";
import {
  DEFAULT_THEME_ID,
  getThemePackage,
  THEME_COLORS,
  THEME_PACKAGES,
  type ThemeId,
  type ThemePackage,
} from "../data/themePackages";

export type { ThemeId, ThemePackage };
export const THEMES = THEME_COLORS;
export { THEME_PACKAGES, getThemePackage };

interface SettingsContextType {
  ttsVolume: number;
  setTtsVolume: (v: number) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  playTypingSound: () => void;
  theme: ThemeId;
  themePackage: ThemePackage;
  setTheme: (t: ThemeId) => void;
  activeCursorId: string | null;
  equippedCursor: string | null;
  setEquippedCursor: (cursorId: string | null) => void;
  equippedBadge: string | null;
  setEquippedBadge: (badgeId: string | null) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  ttsVolume: 1,
  setTtsVolume: () => {},
  sfxVolume: 0.5,
  setSfxVolume: () => {},
  playTypingSound: () => {},
  theme: DEFAULT_THEME_ID,
  themePackage: THEME_PACKAGES[DEFAULT_THEME_ID],
  setTheme: () => {},
  activeCursorId: null,
  equippedCursor: null,
  setEquippedCursor: () => {},
  equippedBadge: null,
  setEquippedBadge: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, userData, refreshUser } = useAuth();
  const [ttsVolume, setTtsVolume] = useState(() => {
    const saved = localStorage.getItem("hive_tts_vol");
    return saved ? parseFloat(saved) : 1.0;
  });

  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem("hive_sfx_vol");
    return saved ? parseFloat(saved) : 0.5;
  });

  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem("hive_theme") as ThemeId) || DEFAULT_THEME_ID;
  });
  const [equippedCursor, setEquippedCursorState] = useState<string | null>(
    () => localStorage.getItem("hive_equipped_cursor") || null,
  );
  const [equippedBadge, setEquippedBadgeState] = useState<string | null>(
    () => localStorage.getItem("hive_equipped_badge") || null,
  );

  useEffect(() => {
    if (userData?.equippedTheme && userData.equippedTheme !== theme) {
      setThemeState(userData.equippedTheme);
    }
  }, [theme, userData?.equippedTheme]);

  useEffect(() => {
    if (
      userData?.equippedCursor !== undefined &&
      userData.equippedCursor !== equippedCursor
    ) {
      setEquippedCursorState(userData.equippedCursor);
    }
  }, [userData?.equippedCursor]);

  useEffect(() => {
    if (
      userData?.equippedBadge !== undefined &&
      userData.equippedBadge !== equippedBadge
    ) {
      setEquippedBadgeState(userData.equippedBadge);
    }
  }, [userData?.equippedBadge]);

  const themePackage = getThemePackage(theme);
  const activeCursorId = equippedCursor ?? themePackage.cursor.defaultItemId;

  // Apply Theme CSS Variables
  useEffect(() => {
    const root = document.documentElement;
    const { colors, cursor, motion, scene, typography } = themePackage;

    root.style.setProperty("--bg-app", colors.app);
    root.style.setProperty("--bg-panel", colors.panel);
    root.style.setProperty("--bg-surface", colors.surface);
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-rgb", colors.primaryRgb);
    root.style.setProperty("--primary-dim", colors.primaryDim);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--text-main", colors.textMain);
    root.style.setProperty("--text-muted", colors.textMuted);
    root.style.setProperty("--bg-app-gradient", scene.appGradient);
    root.style.setProperty("--bg-panel-gradient", scene.panelGradient);
    root.style.setProperty("--bg-surface-gradient", scene.surfaceGradient);
     root.style.setProperty("--theme-ambient-glow", scene.ambientGlow);
     root.style.setProperty("--theme-overlay-pattern", scene.overlayPattern);
     root.style.setProperty("--theme-border-strong", scene.borderStrong);
     root.style.setProperty("--theme-shadow-panel", scene.panelShadow);
     root.style.setProperty("--theme-shadow-glow", scene.glowShadow);
     root.style.setProperty(
       "--theme-hero-pattern-url",
       themePackage.assets.heroPatternSvg
         ? `url("${themePackage.assets.heroPatternSvg}")`
         : "none",
     );
     root.style.setProperty(
       "--theme-overlay-asset-url",
       themePackage.assets.overlayPatternSvg
         ? `url("${themePackage.assets.overlayPatternSvg}")`
         : "none",
     );
     root.style.setProperty(
       "--theme-panel-frame-url",
       themePackage.assets.panelFrameSvg
         ? `url("${themePackage.assets.panelFrameSvg}")`
         : "none",
     );
     root.style.setProperty("--motion-fast", motion.durationFast);
     root.style.setProperty("--motion-base", motion.durationBase);
     root.style.setProperty("--motion-slow", motion.durationSlow);
    root.style.setProperty("--ease-standard", motion.easingStandard);
    root.style.setProperty("--ease-emphasis", motion.easingEmphasis);
    root.style.setProperty("--hover-scale", motion.hoverScale);
    root.style.setProperty("--font-display", typography.displayFamily);
    root.style.setProperty("--font-body", typography.bodyFamily);
    root.style.setProperty("--heading-tracking", typography.headingTracking);
    root.style.setProperty("--cursor-trail-color", cursor.trailColor);
    root.style.setProperty("--cursor-trail-glow", cursor.trailGlow);
    root.dataset.theme = themePackage.id;

    const buildCursorCss = (assetPath: string | null) =>
      assetPath
        ? `url("${assetPath}") ${cursor.hotspotX} ${cursor.hotspotY}, ${cursor.fallbackCursor}`
        : cursor.fallbackCursor;

    const defaultCursorCss = buildCursorCss(cursor.assetPath);
    const pointerCursorCss = buildCursorCss(
      cursor.pointerAssetPath ?? cursor.assetPath,
    );
    const activeCursorCss = buildCursorCss(
      cursor.activeAssetPath ?? cursor.pointerAssetPath ?? cursor.assetPath,
    );

    root.style.setProperty("--app-cursor-default", defaultCursorCss);
    root.style.setProperty("--app-cursor-pointer", pointerCursorCss);
    root.style.setProperty("--app-cursor-active", activeCursorCss);
    document.body.style.cursor = defaultCursorCss;

    localStorage.setItem("hive_theme", theme);
    return () => {
      root.style.removeProperty("--app-cursor-default");
      root.style.removeProperty("--app-cursor-pointer");
      root.style.removeProperty("--app-cursor-active");
      document.body.style.cursor = "";
    };
  }, [theme, themePackage]);

  // SINGLE AUDIO CONTEXT INSTANCE
  // Creating a new context per keypress causes freezing and spatial audio glitches ("corner of room" sound)
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxRef.current = new AudioContextClass();
    }
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current
          .close()
          .catch((e) => console.error("Error closing audio context", e));
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("hive_tts_vol", ttsVolume.toString());
  }, [ttsVolume]);

  useEffect(() => {
    localStorage.setItem("hive_sfx_vol", sfxVolume.toString());
  }, [sfxVolume]);

  useEffect(() => {
    if (equippedCursor) {
      localStorage.setItem("hive_equipped_cursor", equippedCursor);
    } else {
      localStorage.removeItem("hive_equipped_cursor");
    }
  }, [equippedCursor]);

  useEffect(() => {
    if (equippedBadge) {
      localStorage.setItem("hive_equipped_badge", equippedBadge);
    } else {
      localStorage.removeItem("hive_equipped_badge");
    }
  }, [equippedBadge]);

  const playTypingSound = () => {
    if (sfxVolume === 0 || !audioCtxRef.current) return;

    const ctx = audioCtxRef.current;

    // Browser audio policy requires user interaction to resume 'suspended' contexts
    if (ctx.state === "suspended") {
      ctx.resume().catch((e) => console.warn("Audio Context resume failed", e));
    }

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Simple "Click" sound
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(sfxVolume * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn("Audio playback error", e);
    }
  };

  const updateTheme = (nextTheme: ThemeId) => {
    setThemeState(nextTheme);

    if (!user) {
      return;
    }

    void (async () => {
      try {
        const persisted = await setProfileTheme(
          user.uid,
          userData?.username || user.displayName || "Player",
          nextTheme,
        );
        if (persisted) {
          await refreshUser();
        }
      } catch (error) {
        console.error("Failed to persist equipped theme", error);
      }
    })();
  };

  const updateCustomizationSlot = (
    slot: "equipped_cursor" | "equipped_badge",
    value: string | null,
  ) => {
    const setLocalState =
      slot === "equipped_cursor" ? setEquippedCursorState : setEquippedBadgeState;

    setLocalState(value);

    if (!user) {
      return;
    }

    void (async () => {
      try {
        const persisted = await setProfileCustomizationSlot(
          user.uid,
          userData?.username || user.displayName || "Player",
          slot,
          value,
        );

        if (persisted) {
          await refreshUser();
        }
      } catch (error) {
        console.error(`Failed to persist ${slot}`, error);
      }
    })();
  };

  return (
    <SettingsContext.Provider
      value={{
        ttsVolume,
        setTtsVolume,
        sfxVolume,
        setSfxVolume,
        playTypingSound,
        theme,
        themePackage,
        setTheme: updateTheme,
        activeCursorId,
        equippedCursor,
        setEquippedCursor: (cursorId) =>
          updateCustomizationSlot("equipped_cursor", cursorId),
        equippedBadge,
        setEquippedBadge: (badgeId) =>
          updateCustomizationSlot("equipped_badge", badgeId),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
