import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface SettingsContextType {
  ttsVolume: number;
  setTtsVolume: (v: number) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  playTypingSound: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  ttsVolume: 1,
  setTtsVolume: () => {},
  sfxVolume: 0.5,
  setSfxVolume: () => {},
  playTypingSound: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ttsVolume, setTtsVolume] = useState(() => {
    const saved = localStorage.getItem('hive_tts_vol');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem('hive_sfx_vol');
    return saved ? parseFloat(saved) : 0.5;
  });

  // SINGLE AUDIO CONTEXT INSTANCE
  // Creating a new context per keypress causes freezing and spatial audio glitches ("corner of room" sound)
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxRef.current = new AudioContextClass();
    }
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(e => console.error("Error closing audio context", e));
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('hive_tts_vol', ttsVolume.toString());
  }, [ttsVolume]);

  useEffect(() => {
    localStorage.setItem('hive_sfx_vol', sfxVolume.toString());
  }, [sfxVolume]);

  const playTypingSound = () => {
    if (sfxVolume === 0 || !audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;

    // Browser audio policy requires user interaction to resume 'suspended' contexts
    if (ctx.state === 'suspended') {
      ctx.resume().catch(e => console.warn("Audio Context resume failed", e));
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
    <SettingsContext.Provider value={{ ttsVolume, setTtsVolume, sfxVolume, setSfxVolume, playTypingSound }}>
      {children}
    </SettingsContext.Provider>
  );
};