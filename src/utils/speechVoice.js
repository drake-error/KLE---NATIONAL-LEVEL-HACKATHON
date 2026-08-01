// Reliable Voice Selection for Indian Rural & Native Languages (Kannada, Tamil, Telugu, Hindi, English)

/**
 * Prime and load speech synthesis voices asynchronously.
 * In Chrome, Edge, and Android, voices often load asynchronously via onvoiceschanged.
 */
export function initSpeechVoices() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    // Immediate call to trigger loading
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }
}

/**
 * Finds the best matching native voice for a given language code (en, hi, kn, ta, te).
 * NEVER falls back to English for non-English languages, ensuring the browser uses
 * native synthesis for Kannada, Tamil, Telugu, and Hindi scripts instead of mispronouncing in English.
 */
export function getBestNativeVoice(langCode) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { voice: null, bcp47: "en-US" };
  }

  const voices = window.speechSynthesis.getVoices();
  const code = (langCode || "en").toLowerCase();

  const matchRules = {
    kn: {
      tags: ["kn", "kn-in", "kn_in", "kan", "kan-in"],
      names: ["kannada", "gagan", "ಕನ್ನಡ", "google kn", "microsoft gagan"],
      bcp47: "kn-IN",
    },
    ta: {
      tags: ["ta", "ta-in", "ta_in", "tam", "tam-in"],
      names: ["tamil", "valluvar", "தமிழ்", "google ta", "microsoft valluvar"],
      bcp47: "ta-IN",
    },
    te: {
      tags: ["te", "te-in", "te_in", "tel", "tel-in"],
      names: ["telugu", "mohan", "తెలుగు", "google te", "microsoft mohan"],
      bcp47: "te-IN",
    },
    hi: {
      tags: ["hi", "hi-in", "hi_in", "hin", "hin-in"],
      names: ["hindi", "hemant", "swara", "kalpana", "हिन्दी", "google hi", "microsoft hemant"],
      bcp47: "hi-IN",
    },
    en: {
      tags: ["en", "en-in", "en-us", "en-gb", "eng"],
      names: ["english", "david", "zira", "mark", "neerja", "prabha", "ravi", "google en"],
      bcp47: "en-IN",
    },
  };

  const rule = matchRules[code] || matchRules.en;

  // 1. First priority: Google or Microsoft Natural Online Cloud voice matching exact language tag or name
  let bestVoice = voices.find((v) => {
    const langLower = v.lang.toLowerCase();
    const nameLower = v.name.toLowerCase();
    const isLangMatch = rule.tags.some(
      (t) => langLower === t || langLower.startsWith(t + "-") || langLower.startsWith(t + "_") || langLower.includes(t)
    );
    const isNameMatch = rule.names.some((n) => nameLower.includes(n));
    const isHighQuality = nameLower.includes("google") || nameLower.includes("natural") || nameLower.includes("online");
    return (isLangMatch || isNameMatch) && isHighQuality;
  });

  // 2. Second priority: Any voice matching language code or native language name
  if (!bestVoice) {
    bestVoice = voices.find((v) => {
      const langLower = v.lang.toLowerCase();
      const nameLower = v.name.toLowerCase();
      return rule.tags.some((t) => langLower.startsWith(t) || langLower === t) || rule.names.some((n) => nameLower.includes(n));
    });
  }

  // CRITICAL: If no exact voice is found for kn, ta, or te, return null!
  // Setting utterance.voice = undefined while setting utterance.lang = "kn-IN" allows Chrome/Edge/Android
  // to dynamically route synthesis to their native OS/cloud engine for Kannada/Tamil/Telugu,
  // whereas assigning an English fallback voice causes the browser to speak English over translated script!
  return {
    voice: bestVoice || null,
    bcp47: rule.bcp47,
  };
}
