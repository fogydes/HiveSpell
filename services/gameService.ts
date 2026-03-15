import { supabase } from "./supabase";
import { LOCAL_DEFINITIONS } from "../data/words";

// Re-export word data so existing imports from gameService continue to work
export { wordBank, MODE_ORDER, getWordDifficulty } from "../data/words";

const HOMOPHONES: Record<string, string[]> = {
  air: ["heir"],
  heir: ["air"],
  ball: ["bawl"],
  bawl: ["ball"],
  be: ["bee"],
  bee: ["be"],
  blue: ["blew"],
  blew: ["blue"],
  eye: ["aye"],
  aye: ["eye"],
  flour: ["flower"],
  flower: ["flour"],
  know: ["no"],
  no: ["know"],
  knight: ["night"],
  night: ["knight"],
  mail: ["male"],
  male: ["mail"],
  pair: ["pear", "pare"],
  pear: ["pair", "pare"],
  pare: ["pair", "pear"],
  peace: ["piece"],
  pi: ["pie"],
  pie: ["pi"],
  piece: ["peace"],
  plain: ["plane"],
  plane: ["plain"],
  rain: ["reign", "rein"],
  reign: ["rain", "rein"],
  rein: ["rain", "reign"],
  read: ["red"],
  red: ["read"],
  right: ["write", "rite"],
  write: ["right", "rite"],
  sea: ["see"],
  see: ["sea"],
  son: ["sun"],
  sun: ["son"],
  tail: ["tale"],
  tale: ["tail"],
  to: ["too", "two"],
  too: ["to", "two"],
  two: ["to", "too"],
  way: ["weigh"],
  weigh: ["way"],
  week: ["weak"],
  weak: ["week"],
  phish: ["fish"],
  fish: ["phish"],
  newb: ["noob"],
  noob: ["newb"],
  sachet: ["sashay"],
  sashay: ["sachet"],
  sighs: ["size"],
  size: ["sighs"],
  psi: ["sigh"],
  sigh: ["psi"],
  noble: ["nobel"],
  nobel: ["noble"],
  wrought: ["rot"],
  rot: ["wrought"],
  pharaoh: ["farrow"],
  farrow: ["pharaoh"],
  colonel: ["kernel"],
  kernel: ["colonel"],
  armor: ["armour"],
  armour: ["armor"],
  center: ["centre"],
  centre: ["center"],
  color: ["colour"],
  colour: ["color"],
  flavor: ["flavour"],
  flavour: ["flavor"],
  harbor: ["harbour"],
  harbour: ["harbor"],
  neighbor: ["neighbour"],
  neighbour: ["neighbor"],
  honor: ["honourificabilitudinity"],
  honour: ["honorificabilitudinity"],
  vain: ["vein"],
  vein: ["vain"],
  adrenocorticotropin: ["adrenocorticotrophin"],
  adrenocorticotrophin: ["adrenocorticotropin"],
  honorificabilitudinity: ["honourificabilitudinity"],
  honourificabilitudinity: ["honorificabilitudinity"],
  hematospectrophotometrically: ["haematospectrophotometrically"],
  haematospectrophotometrically: ["hematospectrophotometrically"],
};

const normalizeSuffix = (word: string) => {
  return word
    .toLowerCase()
    .replace(/isation/g, "ization")
    .replace(/ise$/g, "ize")
    .replace(/yse$/g, "yze")
    .replace(/our/g, "or")
    .replace(/re$/g, "er");
};

export const checkAnswer = (target: string, input: string): boolean => {
  const normTarget = normalizeSuffix(target.trim());
  const normInput = normalizeSuffix(input.trim());

  if (normTarget === normInput) return true;

  const lowerTarget = target.toLowerCase();
  const lowerInput = input.toLowerCase();

  if (HOMOPHONES[lowerTarget]) {
    if (HOMOPHONES[lowerTarget].includes(lowerInput)) return true;
    const matches = HOMOPHONES[lowerTarget].some(
      (h) => normalizeSuffix(h) === normInput,
    );
    if (matches) return true;
  }

  return false;
};

export const fetchDefinition = async (word: string): Promise<string> => {
  const lowerWord = word.toLowerCase().trim();
  if (LOCAL_DEFINITIONS[lowerWord]) {
    return LOCAL_DEFINITIONS[lowerWord];
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
    );
    if (!res.ok) throw new Error("No def");
    const data = await res.json();
    return (
      data[0]?.meanings[0]?.definitions[0]?.definition ||
      "Listen carefully to the pronunciation."
    );
  } catch (e) {
    return "Listen carefully to the pronunciation.";
  }
};

let speakId = 0;
const AUDIO_DEBUG_STORAGE_KEY = "hivespell_debug_audio";
const AUDIO_LOAD_TIMEOUT_MS = 1500;
const AUDIO_BLOB_CACHE_LIMIT = 40;

const isAudioDebugEnabled = () =>
  typeof window !== "undefined" &&
  window.localStorage.getItem(AUDIO_DEBUG_STORAGE_KEY) === "1";

const logAudioDebug = (
  stage: string,
  details: Record<string, unknown> = {},
) => {
  if (!isAudioDebugEnabled()) return;

  console.info("[AudioDebug]", stage, {
    ...details,
    online:
      typeof navigator !== "undefined" ? navigator.onLine : "unknown",
  });
};

export const getTitle = (corrects: number, wins: number): string => {
  if (corrects >= 50000) return "Queen Bee";
  if (corrects >= 10000) return "Hive Master";
  if (wins >= 1000) return "Hive Champion";
  if (corrects >= 1000 && wins >= 100) return "Busy Bee";
  return "Newbee";
};

/** Audio State Management */
let currentAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
const audioBlobUrlCache = new Map<string, string>();
const audioBlobFetchCache = new Map<string, Promise<string | null>>();

const cacheAudioBlobUrl = (fileName: string, objectUrl: string) => {
  if (audioBlobUrlCache.has(fileName)) {
    return;
  }

  if (audioBlobUrlCache.size >= AUDIO_BLOB_CACHE_LIMIT) {
    const oldestKey = audioBlobUrlCache.keys().next().value;
    if (oldestKey) {
      const oldestUrl = audioBlobUrlCache.get(oldestKey);
      if (oldestUrl) {
        URL.revokeObjectURL(oldestUrl);
      }
      audioBlobUrlCache.delete(oldestKey);
    }
  }

  audioBlobUrlCache.set(fileName, objectUrl);
};

export const stopAudio = () => {
  speakId++; // Invalidate any pending async audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
};

/** Maps word variations to available audio files */
const getAlternateAudioName = (word: string): string | null => {
  const lower = word.toLowerCase();

  if (lower === "adrenocorticotropin") return "adrenocorticotrophin";
  if (lower === "adrenocorticotrophin") return "adrenocorticotropin";
  if (lower === "honorificabilitudinity") return "honourificabilitudinity";
  if (lower === "honourificabilitudinity") return "honorificabilitudinity";
  if (lower === "hematospectrophotometrically")
    return "haematospectrophotometrically";
  if (lower === "haematospectrophotometrically")
    return "hematospectrophotometrically";

  if (lower.endsWith("or")) {
    return lower.replace(/or$/, "our");
  }
  if (lower.endsWith("our")) {
    return lower.replace(/our$/, "or");
  }
  return null;
};

const resolveAudioSourceUrl = async (
  fileName: string,
): Promise<string | null> => {
  const cachedUrl = audioBlobUrlCache.get(fileName);
  if (cachedUrl) {
    logAudioDebug("audio-blob-cache-hit", { fileName });
    return cachedUrl;
  }

  const existingFetch = audioBlobFetchCache.get(fileName);
  if (existingFetch) {
    return existingFetch;
  }

  const { data } = supabase.storage
    .from("word-audios")
    .getPublicUrl(`${fileName}.mp3`);

  const fetchPromise = fetch(data.publicUrl)
    .then(async (response) => {
      if (!response.ok) {
        logAudioDebug("audio-blob-fetch-http-error", {
          fileName,
          status: response.status,
        });
        return null;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      cacheAudioBlobUrl(fileName, objectUrl);
      logAudioDebug("audio-blob-fetch-success", {
        fileName,
        bytes: blob.size,
        mimeType: blob.type,
      });
      return objectUrl;
    })
    .catch((error) => {
      logAudioDebug("audio-blob-fetch-failed", {
        fileName,
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    })
    .finally(() => {
      audioBlobFetchCache.delete(fileName);
    });

  audioBlobFetchCache.set(fileName, fetchPromise);
  logAudioDebug("audio-blob-fetch-start", { fileName, publicUrl: data.publicUrl });
  return fetchPromise;
};

export const primeWordAudio = (word: string) => {
  const lowerWord = word.toLowerCase();
  void resolveAudioSourceUrl(lowerWord);

  const alternate = getAlternateAudioName(word);
  if (alternate) {
    void resolveAudioSourceUrl(alternate);
  }
};

// Audio Deduplication State
let lastSpokenWord: string | null = null;
let lastSpokenTime: number = 0;

export const speak = async (
  word: string,
  volume: number = 1.0,
  force: boolean = false,
): Promise<void> => {
  const now = Date.now();
  logAudioDebug("speak-requested", { force, volume, word });
  // Dedupe: If same word requested within 1s, and not forced, ignore
  if (!force && word === lastSpokenWord && now - lastSpokenTime < 1000) {
    console.log(`[Audio] Ignoring duplicate speak request for "${word}"`);
    logAudioDebug("speak-deduped", {
      elapsedMs: now - lastSpokenTime,
      word,
    });
    return;
  }

  lastSpokenWord = word;
  lastSpokenTime = now;

  stopAudio(); // Increments speakId
  const myId = speakId; // Capture this specific attempt ID

  const lowerWord = word.toLowerCase();

  const playBrowserTTS = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      // Abort if a new speak request came in
      if (speakId !== myId) {
        resolve();
        return;
      }

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(word);
      activeUtterance = utterance;
      utterance.volume = volume;
      utterance.rate = 0.9;

      utterance.onend = () => {
        activeUtterance = null;
        resolve();
      };
      utterance.onerror = () => {
        activeUtterance = null;
        resolve();
      };

      // Verification before starting
      if (speakId === myId) {
        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  };

  const attemptPlayAudioFile = (fileName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Abort if outdated (global check)
      if (speakId !== myId) {
        resolve(false);
        return;
      }

      // Local closure flag for this specific audio attempt
      let isCancelled = false;

      const startedAt = Date.now();
      let settled = false;
      let audio: HTMLAudioElement | null = null;
      logAudioDebug("audio-file-attempt", { fileName });

      const settle = (result: boolean) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const cleanupListeners = () => {
        if (!audio) return;
        audio.onloadedmetadata = null;
        audio.onloadeddata = null;
        audio.oncanplay = null;
        audio.oncanplaythrough = null;
        audio.onerror = null;
      };

      const startPlayback = (trigger: string) => {
        if (!audio) return;
        if (isCancelled || settled) return;

        clearTimeout(timeout);

        if (currentAudio !== audio || speakId !== myId) {
          logAudioDebug("audio-file-stale", {
            elapsedMs: Date.now() - startedAt,
            fileName,
            trigger,
          });
          cleanupListeners();
          settle(false);
          return;
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              logAudioDebug("audio-file-playing", {
                elapsedMs: Date.now() - startedAt,
                fileName,
                networkState: audio.networkState,
                readyState: audio.readyState,
                trigger,
              });
              cleanupListeners();
              settle(true);
            })
            .catch((error) => {
              logAudioDebug("audio-file-play-failed", {
                elapsedMs: Date.now() - startedAt,
                fileName,
                message:
                  error instanceof Error ? error.message : String(error),
                networkState: audio.networkState,
                readyState: audio.readyState,
                trigger,
              });
              cleanupListeners();
              settle(false);
            });
        } else {
          logAudioDebug("audio-file-playing", {
            elapsedMs: Date.now() - startedAt,
            fileName,
            networkState: audio.networkState,
            readyState: audio.readyState,
            trigger,
          });
          cleanupListeners();
          settle(true);
        }
      };

      // Use a timeout to detect if metadata fails or file is missing
      const timeout = setTimeout(() => {
        // TIMEOUT: strictly kill this attempt
        isCancelled = true; // Mark as dead

        cleanupListeners();
        if (audio) {
          const timeoutNetworkState = audio.networkState;
          const timeoutReadyState = audio.readyState;
          audio.pause();
          audio.src = ""; // Stop loading
          try {
            audio.load();
          } catch (e) {
            /* ignore */
          }

          if (currentAudio === audio && speakId === myId) {
            currentAudio = null;
          }
          logAudioDebug("audio-file-timeout", {
            networkState: timeoutNetworkState,
            readyState: timeoutReadyState,
            elapsedMs: Date.now() - startedAt,
            fileName,
          });
        } else {
          logAudioDebug("audio-file-timeout", {
            elapsedMs: Date.now() - startedAt,
            fileName,
            stage: "before-audio-created",
          });
        }
        settle(false);
      }, AUDIO_LOAD_TIMEOUT_MS);

      resolveAudioSourceUrl(fileName).then((sourceUrl) => {
        if (isCancelled || settled || !sourceUrl) {
          return;
        }

        audio = new Audio(sourceUrl);

        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        currentAudio = audio;
        audio.volume = volume;
        audio.preload = "auto";

        audio.onloadedmetadata = () => {
          logAudioDebug("audio-file-loadedmetadata", {
            elapsedMs: Date.now() - startedAt,
            fileName,
            networkState: audio?.networkState,
            readyState: audio?.readyState,
          });
        };

        audio.onloadeddata = () => {
          logAudioDebug("audio-file-loadeddata", {
            elapsedMs: Date.now() - startedAt,
            fileName,
            networkState: audio?.networkState,
            readyState: audio?.readyState,
          });

          if (audio && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            startPlayback("loadeddata");
          }
        };

        audio.oncanplay = () => {
          logAudioDebug("audio-file-canplay", {
            elapsedMs: Date.now() - startedAt,
            fileName,
            networkState: audio?.networkState,
            readyState: audio?.readyState,
          });
          startPlayback("canplay");
        };

        audio.oncanplaythrough = () => {
          logAudioDebug("audio-file-canplaythrough", {
            elapsedMs: Date.now() - startedAt,
            fileName,
            networkState: audio?.networkState,
            readyState: audio?.readyState,
          });
        };

        audio.onerror = () => {
          if (isCancelled) return;
          clearTimeout(timeout);
          logAudioDebug("audio-file-error", {
            elapsedMs: Date.now() - startedAt,
            fileName,
            mediaErrorCode: audio?.error?.code,
            networkState: audio?.networkState,
            readyState: audio?.readyState,
          });
          cleanupListeners();
          settle(false);
        };

        try {
          audio.load();
        } catch (error) {
          logAudioDebug("audio-file-load-throw", {
            fileName,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    });
  };

  // Logic: Try MP3 -> Alternate -> TTS
  let success = await attemptPlayAudioFile(lowerWord);
  if (speakId !== myId) return; // Stop if interrupted

  if (!success) {
    const alt = getAlternateAudioName(word);
    if (alt) success = await attemptPlayAudioFile(alt);
  }

  if (speakId !== myId) return; // Stop if interrupted

  if (!success) {
    // Check one last time if we haven't been stopped
    if (activeUtterance === null && speakId === myId) {
      console.warn(`Local audio failed for "${word}". Playing TTS.`);
      logAudioDebug("tts-fallback", { word });
      await playBrowserTTS();
    }
  } else {
    // Audio file played successfully
    console.log(`Playing local audio for "${word}"`);
    logAudioDebug("audio-file-success", { word });
  }
};
