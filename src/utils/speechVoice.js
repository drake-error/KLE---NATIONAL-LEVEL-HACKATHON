/**
 * speakInLanguage.js — Multi-language TTS for Indian rural languages
 *
 * Windows does NOT ship with Kannada, Tamil, or Telugu TTS voices.
 * For those languages we stream audio from Google Translate TTS via
 * the Vite dev proxy (/api/tts → translate.google.com/translate_tts).
 * English & Hindi use the browser's built-in Web Speech API.
 */

const LANG_CONFIG = {
  en: { bcp47: "en-IN", gtts: "en", prefixes: ["en"] },
  hi: { bcp47: "hi-IN", gtts: "hi", prefixes: ["hi"] },
  kn: { bcp47: "kn-IN", gtts: "kn", prefixes: ["kn", "kan"] },
  ta: { bcp47: "ta-IN", gtts: "ta", prefixes: ["ta", "tam"] },
  te: { bcp47: "te-IN", gtts: "te", prefixes: ["te", "tel"] },
};

let _audio = null;
let _queue = [];

/* ── helpers ─────────────────────────────────────────────────────────── */

function findNativeVoice(code) {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const cfg = LANG_CONFIG[code] || LANG_CONFIG.en;
  return (
    voices.find((v) => {
      const t = v.lang.toLowerCase().replace("_", "-");
      const n = v.name.toLowerCase();
      return (
        cfg.prefixes.some((p) => t.startsWith(p)) &&
        (n.includes("google") || n.includes("natural") || n.includes("online"))
      );
    }) ||
    voices.find((v) => {
      const t = v.lang.toLowerCase().replace("_", "-");
      return cfg.prefixes.some((p) => t.startsWith(p));
    }) ||
    null
  );
}

/** Split long text into ≤ 190-char chunks on sentence / comma / space */
function chunk(text, max = 190) {
  if (!text || text.length <= max) return [text];
  const out = [];
  for (const sentence of text.split(/(?<=[.!?।])\s+/)) {
    if (sentence.length <= max) {
      if (out.length && (out[out.length - 1] + " " + sentence).length <= max) {
        out[out.length - 1] += " " + sentence;
      } else {
        out.push(sentence);
      }
    } else {
      // split oversized sentence on commas / spaces
      let buf = "";
      for (const w of sentence.split(/[\s,]+/)) {
        if (buf && (buf + " " + w).length > max) {
          out.push(buf);
          buf = w;
        } else {
          buf = buf ? buf + " " + w : w;
        }
      }
      if (buf) out.push(buf);
    }
  }
  return out.filter(Boolean);
}

/** Play chunks sequentially via the local proxy → Google TTS */
function playChunks(chunks, langCode, onStart, onEnd, onError) {
  _queue = chunks.slice();
  if (onStart) onStart();

  function next() {
    if (!_queue.length) {
      _audio = null;
      if (onEnd) onEnd();
      return;
    }
    const t = _queue.shift();
    // Use the Vite / Vercel proxy path so the request is same-origin
    const url = `/api/tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(t)}`;
    const a = new Audio(url);
    _audio = a;
    a.onended = next;
    a.onerror = () => {
      console.warn("[TTS] chunk error, trying next");
      next();
    };
    a.play().catch((e) => {
      console.error("[TTS] play() rejected:", e);
      if (onError) onError(e);
      _audio = null;
      _queue = [];
    });
  }
  next();
}

/* ── public API ──────────────────────────────────────────────────────── */

export function initVoices() {
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
  if (_audio) {
    _audio.pause();
    _audio.currentTime = 0;
    _audio = null;
  }
  _queue = [];
}

/**
 * Speak `text` in the selected language.
 *
 * • English / Hindi → Web Speech API (local voices exist on Windows)
 * • Kannada / Tamil / Telugu → Google Translate TTS via proxy
 */
export function speakInLanguage(text, langCode, { onStart, onEnd, onError } = {}) {
  stopSpeaking();
  if (!text?.trim()) return;

  const cfg = LANG_CONFIG[langCode] || LANG_CONFIG.en;
  const voice = findNativeVoice(langCode);

  if (voice) {
    /* ── Path A: native browser voice (en, hi) ──────────────────────── */
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = cfg.bcp47;
    u.rate = 0.92;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.onstart = () => onStart?.();
    u.onend = () => onEnd?.();
    u.onerror = () => {
      // if native voice fails, fall back to proxy TTS
      playChunks(chunk(text), cfg.gtts, onStart, onEnd, onError);
    };
    window.speechSynthesis.speak(u);
  } else {
    /* ── Path B: Google TTS via proxy (kn, ta, te) ──────────────────── */
    playChunks(chunk(text), cfg.gtts, onStart, onEnd, onError);
  }
}
