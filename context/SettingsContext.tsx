import React, { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    localStorage.setItem('hive_tts_vol', ttsVolume.toString());
  }, [ttsVolume]);

  useEffect(() => {
    localStorage.setItem('hive_sfx_vol', sfxVolume.toString());
  }, [sfxVolume]);

  const playTypingSound = () => {
    if (sfxVolume === 0) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(sfxVolume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  };

  return (
    <SettingsContext.Provider value={{ ttsVolume, setTtsVolume, sfxVolume, setSfxVolume, playTypingSound }}>
      {children}
    </SettingsContext.Provider>
  );
};