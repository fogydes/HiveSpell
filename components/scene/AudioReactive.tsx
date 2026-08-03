import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { useScene, usePerformanceTier, useAudioReactive } from "@/context/SceneContext";

interface AudioReactiveProps {
  /** Optional audio element to analyze (e.g., background music, UI sounds) */
  audioElement?: HTMLAudioElement | null;
  /** Custom frequency range to focus on */
  targetFrequencies?: "bass" | "mid" | "treble" | "full";
}

/**
 * AudioReactive - Analyzes audio and provides reactive visual synchronization
 * Works with Web Audio API for real-time frequency analysis
 * Provides: beat detection, frequency bands, volume levels
 */
export const AudioReactive = memo(function AudioReactive({
  audioElement,
  targetFrequencies,
}: AudioReactiveProps) {
  const { currentScene, setAudioLevel, performanceTier } = useScene();
  const { reactiveEnabled, frequencies, sensitivity, pulseColor, pulseIntensity } = useAudioReactive();

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animationRef = useRef<number | null>(null);
  const beatHistoryRef = useRef<number[]>([]);
  const [beatDetected, setBeatDetected] = useState(false);
  const [frequencyBands, setFrequencyBands] = useState({
    bass: 0,
    mid: 0,
    treble: 0,
    full: 0,
  });

  // Initialize Web Audio API
  const initAudioContext = useCallback(() => {
    if (!reactiveEnabled || performanceTier === "static" || typeof window === "undefined") {
      return;
    }

    try {
      // Create audio context (resume if suspended)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Create analyser
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      // Connect to audio element if provided
      if (audioElement) {
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
        sourceRef.current = ctx.createMediaElementSource(audioElement);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } else {
        // Fallback: create a silent oscillator for demo/testing
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0; // Silent
        osc.connect(gain);
        gain.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
        osc.start();
      }
    } catch (error) {
      console.warn("AudioReactive: Web Audio API not available", error);
    }
  }, [reactiveEnabled, performanceTier, audioElement]);

  // Analyze audio frame
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    analyser.getByteFrequencyData(dataArray);

    const bufferLength = dataArray.length;
    const bassEnd = Math.floor(bufferLength * 0.1); // ~0-200Hz
    const midEnd = Math.floor(bufferLength * 0.4);  // ~200-800Hz
    const trebleEnd = bufferLength;                  // ~800Hz+

    let bassSum = 0, midSum = 0, trebleSum = 0, fullSum = 0;

    for (let i = 0; i < bufferLength; i++) {
      const val = dataArray[i] / 255; // Normalize to 0-1
      fullSum += val;

      if (i < bassEnd) {
        bassSum += val;
      } else if (i < midEnd) {
        midSum += val;
      } else {
        trebleSum += val;
      }
    }

    const bandCount = {
      bass: bassEnd,
      mid: midEnd - bassEnd,
      treble: bufferLength - midEnd,
    };

    const bands = {
      bass: bandCount.bass > 0 ? bassSum / bandCount.bass : 0,
      mid: bandCount.mid > 0 ? midSum / bandCount.mid : 0,
      treble: bandCount.treble > 0 ? trebleSum / bandCount.treble : 0,
      full: fullSum / bufferLength,
    };

    // Apply sensitivity
    const sens = sensitivity;
    Object.keys(bands).forEach((key) => {
      bands[key as keyof typeof bands] = Math.min(1, bands[key as keyof typeof bands] * sens);
    });

    setFrequencyBands(bands);
    setAudioLevel(bands.full);

    // Beat detection (simple onset detection on target frequency)
    const targetValue = bands[targetFrequencies ?? frequencies];
    beatHistoryRef.current.push(targetValue);
    if (beatHistoryRef.current.length > 43) { // ~43 frames at 60fps = ~700ms
      beatHistoryRef.current.shift();
    }

    // Simple beat detection: current > average of recent history + threshold
    if (beatHistoryRef.current.length >= 10) {
      const recent = beatHistoryRef.current.slice(-10);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const isBeat = targetValue > avg * 1.5 && targetValue > 0.3;

      if (isBeat && !beatDetected) {
        setBeatDetected(true);
        // Trigger pulse on next frame
        requestAnimationFrame(() => setBeatDetected(false));
      }
    }
  }, [frequencies, sensitivity, targetFrequencies, beatDetected, setAudioLevel]);

  // Animation loop
  useEffect(() => {
    if (!reactiveEnabled || performanceTier === "static") return;

    initAudioContext();

    const animate = () => {
      analyzeAudio();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Don't close audio context - might be used elsewhere
    };
  }, [reactiveEnabled, performanceTier, initAudioContext, analyzeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      // Note: Don't close audioContext as it might be shared
    };
  }, []);

  // The component itself renders nothing - it provides reactive values via context
  // But we can expose CSS custom properties for other components to use
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const target = targetFrequencies ?? frequencies;
    const value = frequencyBands[target] * pulseIntensity;

    root.style.setProperty("--audio-reactive-level", String(frequencyBands.full));
    root.style.setProperty("--audio-bass", String(frequencyBands.bass));
    root.style.setProperty("--audio-mid", String(frequencyBands.mid));
    root.style.setProperty("--audio-treble", String(frequencyBands.treble));
    root.style.setProperty("--audio-target", String(frequencyBands[target]));
    root.style.setProperty("--audio-pulse-color", pulseColor);
    root.style.setProperty("--audio-pulse-intensity", String(value));
    root.style.setProperty("--audio-beat", beatDetected ? "1" : "0");
  }, [frequencyBands, pulseColor, pulseIntensity, frequencies, targetFrequencies, beatDetected]);

  // Return reactive values for consumers
  return (
    <div
      className="audio-reactive"
      style={{ display: "none" }}
      data-reactive={reactiveEnabled ? "true" : "false"}
      data-beat={beatDetected ? "true" : "false"}
      data-bass={frequencyBands.bass.toFixed(3)}
      data-mid={frequencyBands.mid.toFixed(3)}
      data-treble={frequencyBands.treble.toFixed(3)}
      aria-hidden="true"
    />
  );
});

AudioReactive.displayName = "AudioReactive";

/**
 * Hook to consume audio reactive values in other components
 */
export function useAudioReactiveValues() {
  const { reactiveEnabled, pulseColor, pulseIntensity, frequencies, sensitivity } = useAudioReactive();

  if (typeof window === "undefined") {
    return {
      level: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      target: 0,
      beatDetected: false,
      pulseColor,
      pulseIntensity,
      frequencies,
      sensitivity,
      reactiveEnabled: false,
    };
  }

  return {
    level: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--audio-reactive-level") || "0"),
    bass: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--audio-bass") || "0"),
    mid: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--audio-mid") || "0"),
    treble: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--audio-treble") || "0"),
    target: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--audio-target") || "0"),
    beatDetected: getComputedStyle(document.documentElement).getPropertyValue("--audio-beat") === "1",
    pulseColor,
    pulseIntensity,
    frequencies,
    sensitivity,
    reactiveEnabled,
  };
}