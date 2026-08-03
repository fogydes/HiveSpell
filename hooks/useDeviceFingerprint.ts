import { useEffect, useState, useCallback } from 'react';

export interface DeviceFingerprint {
  // Canvas fingerprinting
  canvasHash: string;
  // WebGL fingerprinting
  webglVendor: string;
  webglRenderer: string;
  // Audio context fingerprinting
  audioFingerprint: string;
  // Battery API (if available)
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  // Screen properties
  screenResolution: string;
  colorDepth: number;
  pixelRatio: number;
  // Timezone and locale
  timezone: string;
  locale: string;
  // User agent parts
  userAgent: string;
  platform: string;
  hardwareConcurrency: number;
  // Language
  languages: string[];
  // Touch support
  touchSupport: boolean;
  // Cookies enabled
  cookiesEnabled: boolean;
  // Session storage
  sessionStorageAvailable: boolean;
  // Local storage
  localStorageAvailable: boolean;
  // IndexedDB
  indexedDBAvailable: boolean;
  // Do Not Track
  doNotTrack: string | null;
  // Permissions
  permissions: Record<string, string>;
  // Plugins (limited in modern browsers)
  plugins: string[];
  // Font detection (subset)
  fonts: string[];
  // WebRTC IP leak (public IP)
  webrtcIp: string | null;
  // Generated timestamp
  timestamp: number;
}

/**
 * Generate a canvas fingerprint by drawing a standard pattern
 */
function getCanvasFingerprint(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'no-canvas';

  // Draw text with specific settings
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f60';
  ctx.fillRect(10, 10, 80, 30);
  ctx.fillStyle = '#069';
  ctx.font = '14px Arial';
  ctx.fillText('HiveSpell Fingerprint', 12, 35);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeText('HiveSpell Fingerprint', 12, 35);

  // Draw gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#ff0000');
  gradient.addColorStop(0.5, '#00ff00');
  gradient.addColorStop(1, '#0000ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(100, 10, 90, 30);

  // Convert to hash
  const dataUrl = canvas.toDataURL();
  let hash = 0;
  for (let i = 0; i < dataUrl.length; i++) {
    const char = dataUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get WebGL fingerprint
 */
function getWebGLFingerprint(): { vendor: string; renderer: string } {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return { vendor: 'no-webgl', renderer: 'no-webgl' };

  // Type assertion for WebGL extensions
  const glAny = gl as WebGLRenderingContext & {
    getExtension(name: 'WEBGL_debug_renderer_info'): WEBGL_debug_renderer_info | null;
    getParameter(pname: number): any;
  };
  const debugInfo = glAny.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    return {
      vendor: glAny.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown',
      renderer: glAny.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown',
    };
  }
  return { vendor: 'unknown', renderer: 'unknown' };
}

/**
 * Get audio context fingerprint
 */
async function getAudioFingerprint(): Promise<string> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(0);

    // Collect some data
    const buffer = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(buffer);

    let hash = 0;
    for (let i = 0; i < buffer.length; i++) {
      hash = ((hash << 5) - hash) + Math.round(buffer[i] * 1000);
      hash = hash & hash;
    }

    oscillator.stop(audioContext.currentTime + 0.1);
    await audioContext.close();

    return Math.abs(hash).toString(36);
  } catch {
    return 'audio-unavailable';
  }
}

/**
 * Get battery info if available
 */
async function getBatteryInfo(): Promise<{ level: number | null; charging: boolean | null }> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      return {
        level: battery.level !== undefined ? Math.round(battery.level * 100) : null,
        charging: battery.charging !== undefined ? battery.charging : null,
      };
    }
  } catch {
    // Ignore
  }
  return { level: null, charging: null };
}

/**
 * Get WebRTC public IP (if leak exists)
 */
async function getWebRTCCityIP(): Promise<string | null> {
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 2000);
      pc.onicecandidate = (ice) => {
        if (!ice.candidate) {
          clearTimeout(timeout);
          resolve(null);
          return;
        }
        const ipMatch = ice.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
          clearTimeout(timeout);
          pc.close();
          resolve(ipMatch[1]);
        }
      };
    });
  } catch {
    return null;
  }
}

/**
 * Check available fonts
 */
function getAvailableFonts(): string[] {
  const testFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Courier New', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
    'Source Sans Pro', 'Nunito', 'Poppins', 'DM Sans', 'Space Grotesk'
  ];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const available: string[] = [];
  const baselineFont = '12px monospace';
  ctx.font = baselineFont;
  const baselineWidth = ctx.measureText('mmmmmmmmmm').width;

  for (const font of testFonts) {
    ctx.font = `12px "${font}", monospace`;
    const width = ctx.measureText('mmmmmmmmmm').width;
    if (width !== baselineWidth) {
      available.push(font);
    }
  }

  return available;
}

/**
 * Check storage availability
 */
function checkStorage(type: 'localStorage' | 'sessionStorage' | 'indexedDB'): boolean {
  try {
    if (type === 'indexedDB') {
      return 'indexedDB' in window;
    }
    const storage = window[type];
    const test = '__storage_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get permissions state
 */
async function getPermissions(): Promise<Record<string, string>> {
  const permissions: Record<string, string> = {};
  const permissionNames = ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write'];
  try {
    for (const name of permissionNames) {
      try {
        const result = await (navigator as any).permissions?.query({ name });
        if (result) {
          permissions[name] = result.state;
        }
      } catch {
        permissions[name] = 'unsupported';
      }
    }
  } catch {
    // Ignore
  }
  return permissions;
}

/**
 * Generate full device fingerprint
 */
export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const [
    canvasHash,
    webgl,
    audioFingerprint,
    battery,
    webrtcIp,
  ] = await Promise.all([
    Promise.resolve(getCanvasFingerprint()),
    Promise.resolve(getWebGLFingerprint()),
    getAudioFingerprint(),
    getBatteryInfo(),
    getWebRTCCityIP(),
  ]);

  const fonts = getAvailableFonts();
  const permissions = await getPermissions();

  return {
    canvasHash,
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    audioFingerprint,
    batteryLevel: battery.level,
    batteryCharging: battery.charging,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    languages: [...navigator.languages],
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    cookiesEnabled: navigator.cookieEnabled,
    sessionStorageAvailable: checkStorage('sessionStorage'),
    localStorageAvailable: checkStorage('localStorage'),
    indexedDBAvailable: checkStorage('indexedDB'),
    doNotTrack: navigator.doNotTrack || (window as any).doNotTrack || null,
    permissions,
    plugins: Array.from((navigator as any).plugins || []).map((p: any) => p.name).filter(Boolean),
    fonts,
    webrtcIp,
    timestamp: Date.now(),
  };
}

/**
 * Hook to manage device fingerprinting
 */
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fp = await generateDeviceFingerprint();
      setFingerprint(fp);
      // Store in sessionStorage for reuse
      sessionStorage.setItem('hivespell_device_fingerprint', JSON.stringify(fp));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate fingerprint');
      console.error('[DeviceFingerprint] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStored = useCallback((): DeviceFingerprint | null => {
    try {
      const stored = sessionStorage.getItem('hivespell_device_fingerprint');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    return null;
  }, []);

  useEffect(() => {
    // Try to get stored fingerprint first
    const stored = getStored();
    if (stored) {
      setFingerprint(stored);
    } else {
      // Generate new one
      generate();
    }
  }, [generate, getStored]);

  return {
    fingerprint,
    loading,
    error,
    generate,
    getStored,
  };
}

/**
 * Create a shortened fingerprint ID for storage/transmission
 */
export function createFingerprintId(fp: DeviceFingerprint): string {
  const parts = [
    fp.canvasHash.slice(0, 8),
    fp.webglVendor.slice(0, 8),
    fp.audioFingerprint.slice(0, 8),
    fp.screenResolution.replace('x', ''),
    fp.timezone.replace('/', ''),
    fp.hardwareConcurrency.toString(36),
  ];
  return parts.join('-');
}

/**
 * Compare two fingerprints for similarity (returns 0-1 similarity score)
 */
export function compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
  let matches = 0;
  let total = 0;

  const fields: (keyof DeviceFingerprint)[] = [
    'canvasHash', 'webglVendor', 'webglRenderer', 'audioFingerprint',
    'screenResolution', 'colorDepth', 'pixelRatio', 'timezone',
    'platform', 'hardwareConcurrency', 'touchSupport',
  ];

  for (const field of fields) {
    total++;
    if (fp1[field] === fp2[field]) matches++;
  }

  // Font comparison
  const fontSet1 = new Set(fp1.fonts);
  const fontSet2 = new Set(fp2.fonts);
  const fontIntersection = new Set([...fontSet1].filter(x => fontSet2.has(x)));
  const fontUnion = new Set([...fontSet1, ...fontSet2]);
  if (fontUnion.size > 0) {
    total += 1;
    matches += fontIntersection.size / fontUnion.size;
  }

  return total > 0 ? matches / total : 0;
}