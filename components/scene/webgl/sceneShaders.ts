/**
 * GLSL shader sources for the per-theme WebGL ambient layer.
 *
 * A single full-screen quad renders one of several "motifs" chosen per scene via
 * the `u_scene` uniform. Colours come from the active scene's colour tokens, so
 * every theme drives its own palette through the same program. Kept deliberately
 * cheap (mediump, 4-octave fbm) since this is a background layer, not a hero.
 *
 * These strings are consumed only by the lazily-imported {@link WebGLScene}, so
 * they never reach the main bundle.
 */

import type { SceneId } from "@/data/themes/sceneSpecs";

/** Maps each scene to its shader motif index (see the `u_scene` branch below). */
const STYLE_BY_SCENE: Record<SceneId, number> = {
  default: 0, // warm drifting pollen orbs
  neon: 1, // synthwave perspective grid
  nature: 2, // dappled canopy caustics
  cyber: 3, // faint vertical data streams
  minimal: 0, // never mounted (ambientGlow disabled at every tier)
};

/** Resolve the shader motif index for a scene id, defaulting to the pollen motif. */
export function getSceneStyleIndex(id: SceneId): number {
  return STYLE_BY_SCENE[id] ?? 0;
}

/**
 * Vertex shader. `position` and `uv` are injected by three's ShaderMaterial
 * prelude, so we must not redeclare them. We bypass the camera entirely and emit
 * clip-space coordinates directly from the 2x2 plane.
 */
export const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Fragment shader. Precision is set via `ShaderMaterial.precision = "mediump"`,
 * so no `precision` statement here (three injects it).
 */
export const FRAGMENT_SHADER = /* glsl */ `
varying vec2 vUv;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;      // normalised 0..1, y up
uniform vec3  u_primary;    // scene primary colour, linear 0..1
uniform vec3  u_accent;     // scene accent colour, linear 0..1
uniform float u_intensity;  // base glow strength (scene ambient.glowIntensity)
uniform float u_audio;      // 0..1 audio-reactive pulse
uniform int   u_scene;      // motif selector

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

// Motif 0 — soft warm orbs drifting upward (default "Hive Classic" pollen).
vec3 scenePollen(vec2 p, float t) {
  vec2 q = p;
  q.y -= t * 0.03;
  float f = fbm(q * 2.5);
  float f2 = fbm(q * 5.0 + 10.0);
  float orbs = smoothstep(0.55, 0.9, f) + 0.5 * smoothstep(0.6, 0.95, f2);
  return mix(u_primary, u_accent, f2) * orbs;
}

// Motif 1 — synthwave perspective grid receding to a horizon (neon "Neon Grid").
vec3 sceneGrid(vec2 uv, vec2 p, float t) {
  float horizon = 0.52;
  vec3 col = vec3(0.0);
  if (uv.y < horizon) {
    vec2 g = vec2(p.x, 1.0 / (horizon - uv.y + 0.02));
    vec2 grid = abs(fract(vec2(g.x * 6.0, g.y * 0.6 + t * 0.6)) - 0.5);
    float line = min(grid.x, grid.y);
    float glow = smoothstep(0.06, 0.0, line);
    float fade = smoothstep(0.0, horizon, uv.y);
    col = mix(u_primary, u_accent, uv.x) * glow * fade;
  }
  float band = smoothstep(0.04, 0.0, abs(uv.y - horizon));
  col += u_primary * band * 0.6;
  return col;
}

// Motif 2 — dappled caustic light with rising motes (nature "Forest Bloom").
vec3 sceneLeaves(vec2 p, float t) {
  float c = fbm(p * 3.0 + vec2(0.0, t * 0.05));
  float caustic = sin((c * 6.2831) + t * 0.4) * 0.5 + 0.5;
  caustic = pow(caustic, 2.0);
  vec2 m = p;
  m.y -= t * 0.05;
  float motes = smoothstep(0.85, 0.98, fbm(m * 7.0));
  return mix(u_primary, u_accent, c) * caustic + u_accent * motes * 0.6;
}

// Motif 3 — faint vertical data streams over a base grid (cyber "Cyber Core").
vec3 sceneCircuit(vec2 uv, float t) {
  float cols = 24.0;
  float x = fract(uv.x * cols);
  float lineMask = smoothstep(0.03, 0.0, abs(x - 0.5));
  float colId = floor(uv.x * cols);
  float phase = hash21(vec2(colId, 1.0));
  float flow = fract(uv.y - t * (0.15 + 0.25 * phase) + phase);
  float pulse = smoothstep(0.0, 0.15, flow) * smoothstep(0.6, 0.15, flow);
  vec3 col = mix(u_primary, u_accent, phase) * lineMask * pulse;
  float gy = smoothstep(0.02, 0.0, abs(fract(uv.y * 18.0) - 0.5));
  col += u_primary * gy * 0.05;
  return col;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0); // aspect-correct isotropic patterns
  p += (u_mouse - 0.5) * 0.06;                       // subtle parallax
  float t = u_time;

  vec3 col;
  if (u_scene == 1) col = sceneGrid(uv, p, t);
  else if (u_scene == 2) col = sceneLeaves(p, t);
  else if (u_scene == 3) col = sceneCircuit(uv, t);
  else col = scenePollen(p, t);

  col *= clamp(u_intensity + u_audio * 0.4, 0.0, 1.2);

  // Radial vignette keeps edges dark so the layer reads as ambient depth.
  float vig = smoothstep(1.15, 0.2, length((uv - 0.5) * vec2(1.2, 1.0)));
  col *= vig;

  float alpha = clamp(max(max(col.r, col.g), col.b), 0.0, 0.85);
  gl_FragColor = vec4(col, alpha);
}
`;
