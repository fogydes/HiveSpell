import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

export type ThemeId = "hive" | "royal" | "ice" | "forest";

interface ThemeColors {
  app: string;
  panel: string;
  surface: string;
  primary: string;
  primaryRgb: string; // "r, g, b"
  primaryDim: string;
  accent: string;
  textMain: string;
  textMuted: string;
}

export const THEMES: Record<ThemeId, ThemeColors> = {
  hive: {
    app: "#0f172a", // slate-900
    panel: "#1e293b", // slate-800
    surface: "#334155", // slate-700
    primary: "#10b981", // emerald-500
    primaryRgb: "16, 185, 129",
    primaryDim: "rgba(16, 185, 129, 0.2)",
    accent: "#f59e0b", // amber-500
    textMain: "#ffffff",
    textMuted: "#94a3b8",
  },
  royal: {
    app: "#2e1065", // violet-950
    panel: "#4c1d95", // violet-900
    surface: "#5b21b6", // violet-800
    primary: "#fbbf24", // amber-400 (Gold)
    primaryRgb: "251, 191, 36",
    primaryDim: "rgba(251, 191, 36, 0.2)",
    accent: "#f472b6", // pink-400
    textMain: "#fffbeb", // amber-50
    textMuted: "#c4b5fd", // violet-300
  },
  ice: {
    app: "#082f49", // sky-950
    panel: "#0c4a6e", // sky-900
    surface: "#075985", // sky-800
    primary: "#38bdf8", // sky-400
    primaryRgb: "56, 189, 248",
    primaryDim: "rgba(56, 189, 248, 0.2)",
    accent: "#e0f2fe", // sky-100
    textMain: "#f0f9ff",
    textMuted: "#7dd3fc",
  },
  forest: {
    app: "#14532d", // green-900
    panel: "#166534", // green-800
    surface: "#15803d", // green-700
    primary: "#bef264", // lime-400
    primaryRgb: "190, 242, 100",
    primaryDim: "rgba(190, 242, 100, 0.2)",
    accent: "#facc15", // yellow-400
    textMain: "#ecfccb", // lime-100
    textMuted: "#86efac",
  },
};

interface SettingsContextType {
  ttsVolume: number;
  setTtsVolume: (v: number) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  playTypingSound: () => void;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  ttsVolume: 1,
  setTtsVolume: () => {},
  sfxVolume: 0.5,
  setSfxVolume: () => {},
  playTypingSound: () => {},
  theme: "hive",
  setTheme: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ttsVolume, setTtsVolume] = useState(() => {
    const saved = localStorage.getItem("hive_tts_vol");
    return saved ? parseFloat(saved) : 1.0;
  });

  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem("hive_sfx_vol");
    return saved ? parseFloat(saved) : 0.5;
  });

  const [theme, setTheme] = useState<ThemeId>(() => {
    return (localStorage.getItem("hive_theme") as ThemeId) || "hive";
  });

  // Apply Theme CSS Variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = THEMES[theme] || THEMES.hive;

    root.style.setProperty("--bg-app", colors.app);
    root.style.setProperty("--bg-panel", colors.panel);
    root.style.setProperty("--bg-surface", colors.surface);
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-rgb", colors.primaryRgb);
    root.style.setProperty("--primary-dim", colors.primaryDim);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--text-main", colors.textMain);
    root.style.setProperty("--text-muted", colors.textMuted);

    localStorage.setItem("hive_theme", theme);
  }, [theme]);

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

  return (
    <SettingsContext.Provider
      value={{
        ttsVolume,
        setTtsVolume,
        sfxVolume,
        setSfxVolume,
        playTypingSound,
        theme,
        setTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
