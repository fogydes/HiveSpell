import React, { createContext, useContext, useState, useEffect } from 'react';

// Short mechanical click sound (Base64)
const CLICK_SOUND = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="; // Placeholder, see actual implementation below
// Actually, using a very short, real click sound for better UX.
const REAL_CLICK = "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQxAFRTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAALAAAAABAAAgAAAAAAA0AAAAAAAAAAAAAA//uQZAAABwLBToAAAESOCnQAAAREAAAAAAAADQAAAAAAAAAAAAA//uQZAAABwLBToAAAESOCnQAAAREAAAAAAAADQAAAAAAAAAAAAA//uQZAAABwLBToAAAESOCnQAAAREAAAAAAAADQAAAAAAAAAAAAA";
// Note: For reliability in this text format, I will use a synthesized oscillator beep in the code if base64 is too long, 
// or just a simple function. Let's use a browser AudioContext oscillator for the "Click" to be lightweight and zero-asset.

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
    
    // Simple oscillator click to avoid external assets
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Mechanical click simulation
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(sfxVolume * 0.3, ctx.currentTime); // Scale down a bit
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