/**
 * WebGLScene — the per-theme ambient WebGL layer.
 *
 * This module is the ONLY place that imports `three`. It is loaded exclusively
 * via `React.lazy(() => import(...))` from {@link SceneCanvasLayer}, so `three`
 * (which is deliberately excluded from the `vendor` chunk) lands in its own async
 * chunk and never touches the main bundle.
 *
 * A single full-screen quad renders a scene-specific motif (see sceneShaders).
 * The renderer is initialised once; scene colour/id, cursor and audio changes are
 * fed through refs and pushed to uniforms each frame, so switching themes never
 * tears down or rebuilds the GL context.
 *
 * On WebGL init failure or runtime context loss the component renders the passed
 * `fallbackNode` (the hand-written canvas effects) instead.
 */

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useScene } from "@/context/SceneContext";
import { VERTEX_SHADER, FRAGMENT_SHADER, getSceneStyleIndex } from "./sceneShaders";

/** "16, 185, 129" → [0.063, 0.725, 0.506] */
function parseRgbTriplet(rgb: string): [number, number, number] {
  const parts = rgb.split(",").map((s) => parseFloat(s.trim()) / 255);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/** "#0ea5e9" → [0.055, 0.647, 0.914] */
function parseHex(hex: string): [number, number, number] {
  const pairs = hex.replace("#", "").match(/.{2}/g);
  if (!pairs) return [1, 1, 1];
  return [
    parseInt(pairs[0], 16) / 255,
    parseInt(pairs[1], 16) / 255,
    parseInt(pairs[2], 16) / 255,
  ];
}

interface WebGLSceneProps {
  /** Rendered instead of the canvas if WebGL is unavailable or the context is lost. */
  fallbackNode?: React.ReactNode;
}

export function WebGLScene({ fallbackNode = null }: WebGLSceneProps) {
  const { currentScene, cursorPosition, audioLevel } = useScene();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  // Live values fed to the render loop without re-initialising three.
  const colorRef = useRef({
    primary: parseRgbTriplet(currentScene.colorTokens.primaryRgb),
    accent: parseHex(currentScene.colorTokens.accent),
    intensity: currentScene.ambient.glowIntensity,
    scene: getSceneStyleIndex(currentScene.id),
  });
  const mouseTargetRef = useRef({ x: 0.5, y: 0.5 });
  const audioRef = useRef(0);

  // Sync scene palette/motif into the ref on theme change (cheap; no GL rebuild).
  useEffect(() => {
    colorRef.current = {
      primary: parseRgbTriplet(currentScene.colorTokens.primaryRgb),
      accent: parseHex(currentScene.colorTokens.accent),
      intensity: currentScene.ambient.glowIntensity,
      scene: getSceneStyleIndex(currentScene.id),
    };
  }, [currentScene]);

  // Track the cursor as a normalised (0..1, y-up) target the loop eases toward.
  useEffect(() => {
    if (typeof window === "undefined") return;
    mouseTargetRef.current = {
      x: cursorPosition.x / window.innerWidth,
      y: 1 - cursorPosition.y / window.innerHeight,
    };
  }, [cursorPosition]);

  useEffect(() => {
    audioRef.current = audioLevel;
  }, [audioLevel]);

  // One-time GL setup + render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }

    renderer.setClearColor(0x000000, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera(); // unused matrices; quad emits clip-space directly
    const geometry = new THREE.PlaneGeometry(2, 2);

    const c = colorRef.current;
    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_primary: { value: new THREE.Vector3(...c.primary) },
      u_accent: { value: new THREE.Vector3(...c.accent) },
      u_intensity: { value: c.intensity },
      u_audio: { value: 0 },
      u_scene: { value: c.scene },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      precision: "mediump",
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      uniforms.u_resolution.value.set(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", handleLost as EventListener, false);

    let raf = 0;
    const start = performance.now();
    const mouse = uniforms.u_mouse.value;

    const render = () => {
      uniforms.u_time.value = (performance.now() - start) / 1000;

      // Ease the parallax toward the cursor target.
      mouse.x += (mouseTargetRef.current.x - mouse.x) * 0.05;
      mouse.y += (mouseTargetRef.current.y - mouse.y) * 0.05;

      // Pull live scene values (theme switches take effect here without a rebuild).
      const cc = colorRef.current;
      uniforms.u_primary.value.set(cc.primary[0], cc.primary[1], cc.primary[2]);
      uniforms.u_accent.value.set(cc.accent[0], cc.accent[1], cc.accent[2]);
      uniforms.u_intensity.value = cc.intensity;
      uniforms.u_scene.value = cc.scene;
      uniforms.u_audio.value = audioRef.current;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", handleLost as EventListener);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  if (failed) return <>{fallbackNode}</>;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
