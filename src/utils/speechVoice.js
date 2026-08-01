/**
 * speakInLanguage.js
 * 
 * Unified multi-language Text-to-Speech engine for Indian rural languages.
 * 
 * PROBLEM: Windows does NOT ship with Kannada, Tamil, or Telugu TTS voices.
 * The Web Speech API (speechSynthesis) goes completely SILENT for these languages
 * because there is literally no voice to speak with.
 * 
 * SOLUTION: Use Google Translate's TTS as an audio engine for languages that
 * have no local voice. Google Translate TTS supports Kannada, Tamil, Telugu,
 * Hindi, and English with high-quality pronunciation.
 * 
 * FLOW:
 * 1. Check if the browser has a native TTS voice for the selected language.
 * 2. If YES (English, Hindi on most Windows) → use Web Speech API directly.
 * 3. If NO (Kannada, Tamil, Telugu on most Windows) → play audio via Google
 *    Translate TTS endpoint, which guarantees speech output.
 */

// ─── Language Config ─────────────────────────────────────────────────────────
const LANG_CONFIG = {
  en: { bcp47: "en-IN", gttsCode: "en", prefixes: ["en"] },
  hi: { bcp47: "hi-IN", gttsCode: "hi", prefixes: ["hi"] },
  kn: { bcp47: "kn-IN", gttsCode: "kn", prefixes: ["kn", "kan"] },
  ta: { bcp47: "ta-IN", gttsCode: "ta", prefixes: ["ta", "tam"] },
  te: { bcp47: "te-IN", gttsCode: "te", prefixes: ["te", "tel"] },
};

// ─── Internal state for Google TTS audio playback ────────────────────────────
let _currentAudio = null;
let _audioQueue = [];
let _isPlaying = false;

// ─── Check if browser has a native voice for a given language ────────────────
function hasNativeVoice(langCode) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const voices = window.speechSynthesis.getVoices();
  const config = LANG_CONFIG[langCode] || LANG_CONFIG.en;
  return voices.some((v) => {
    const tag = v.lang.toLowerCase().replace("_", "-");
    return config.prefixes.some((p) => tag.startsWith(p));
  });
}

// ─── Get the best matching native voice object ──────────────────────────────
function getNativeVoice(langCode) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const config = LANG_CONFIG[langCode] || LANG_CONFIG.en;

  // Priority 1: Google or high-quality cloud voice
  let voice = voices.find((v) => {
    const tag = v.lang.toLowerCase().replace("_", "-");
    const name = v.name.toLowerCase();
    const langMatch = config.prefixes.some((p) => tag.startsWith(p));
    const quality = name.includes("google") || name.includes("natural") || name.includes("online");
    return langMatch && quality;
  });

  // Priority 2: Any voice matching the language
  if (!voice) {
    voice = voices.find((v) => {
      const tag = v.lang.toLowerCase().replace("_", "-");
      return config.prefixes.some((p) => tag.startsWith(p));
    });
  }

  return voice || null;
}

// ─── Split text into chunks for Google TTS (max ~180 chars per request) ──────
function splitIntoChunks(text, maxLen = 180) {
  if (!text || text.length <= maxLen) return [text];

  const chunks = [];
  // Split on sentence boundaries first
  const sentences = text.split(/(?<=[.!?।\u0964])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      // If a single sentence is too long, split on commas or spaces
      if (current) { chunks.push(current.trim()); current = ""; }
      const words = sentence.split(/[\s,]+/);
      let sub = "";
      for (const word of words) {
        if ((sub + " " + word).length > maxLen) {
          if (sub) chunks.push(sub.trim());
          sub = word;
        } else {
          sub = sub ? sub + " " + word : word;
        }
      }
      if (sub) chunks.push(sub.trim());
    } else if ((current + " " + sentence).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

// ─── Play audio chunks from Google Translate TTS sequentially ────────────────
function playGoogleTTSChunks(chunks, gttsLangCode, onStart, onEnd, onError) {
  _audioQueue = chunks.slice();
  _isPlaying = true;
  if (onStart) onStart();

  function playNext() {
    if (_audioQueue.length === 0) {
      _isPlaying = false;
      _currentAudio = null;
      if (onEnd) onEnd();
      return;
    }

    const chunk = _audioQueue.shift();
    const url =
      `https://translate.google.com/translate_tts?ie=UTF-8&tl=${gttsLangCode}&client=tw-ob&q=${encodeURIComponent(chunk)}`;

    const audio = new Audio(url);
    _currentAudio = audio;

    audio.onended = () => playNext();
    audio.onerror = (e) => {
      console.warn("Google TTS chunk failed, trying next:", e);
      // Try next chunk instead of stopping entirely
      playNext();
    };

    audio.play().catch((err) => {
      console.error("Google TTS play() error:", err);
      if (onError) onError(err);
      _isPlaying = false;
      _currentAudio = null;
    });
  }

  playNext();
}

// ─── Stop any currently playing audio ────────────────────────────────────────
export function stopSpeaking() {
  // Stop Web Speech API
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  // Stop Google TTS audio
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.currentTime = 0;
    _currentAudio = null;
  }
  _audioQueue = [];
  _isPlaying = false;
}

// ─── Prime voice loading (call on component mount) ───────────────────────────
export function initVoices() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }
}

/**
 * speakInLanguage — THE MAIN FUNCTION
 * 
 * Speaks the given text in the specified language (en, hi, kn, ta, te).
 * Automatically chooses between Web Speech API (if native voice exists)
 * and Google Translate TTS (if no native voice — i.e. Kannada/Tamil/Telugu on Windows).
 * 
 * @param {string} text       The text to speak (already translated)
 * @param {string} langCode   Language code: "en" | "hi" | "kn" | "ta" | "te"
 * @param {object} callbacks  { onStart, onEnd, onError }
 */
export function speakInLanguage(text, langCode, callbacks = {}) {
  const { onStart, onEnd, onError } = callbacks;
  const config = LANG_CONFIG[langCode] || LANG_CONFIG.en;

  // Always stop anything currently playing
  stopSpeaking();

  if (!text || !text.trim()) {
    if (onError) onError(new Error("Empty text"));
    return;
  }

  // ─── Strategy: Check if we have a native voice ─────────────────────────
  const nativeVoice = getNativeVoice(langCode);
  const hasVoice = !!nativeVoice;

  if (hasVoice) {
    // ═══════════════════════════════════════════════════════════════════════
    // PATH A: Use Web Speech API (works for English, Hindi, and any
    //         language with an installed OS voice)
    // ═══════════════════════════════════════════════════════════════════════
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = nativeVoice;
    utterance.lang = config.bcp47;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => { if (onStart) onStart(); };
    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = (e) => {
      console.warn("Web Speech API failed, falling back to Google TTS:", e);
      // Fallback to Google TTS if Web Speech API errors out
      const chunks = splitIntoChunks(text);
      playGoogleTTSChunks(chunks, config.gttsCode, onStart, onEnd, onError);
    };

    window.speechSynthesis.speak(utterance);
  } else {
    // ═══════════════════════════════════════════════════════════════════════
    // PATH B: Use Google Translate TTS (for Kannada, Tamil, Telugu, etc.
    //         where Windows has NO installed TTS voice)
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`No native voice for "${langCode}", using Google Translate TTS`);
    const chunks = splitIntoChunks(text);
    playGoogleTTSChunks(chunks, config.gttsCode, onStart, onEnd, onError);
  }
}

export { hasNativeVoice };
