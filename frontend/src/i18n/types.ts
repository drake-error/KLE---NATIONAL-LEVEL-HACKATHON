export const LANGS = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];

/** Maps an English source string to its translation in a given language. */
export type Phrases = Record<string, string>;

/** A dictionary part: non-English languages only (English is the source). */
export type DictPart = Partial<Record<Exclude<Lang, "en">, Phrases>>;

export function mergeParts(parts: DictPart[]): Record<Exclude<Lang, "en">, Phrases> {
  const out = { hi: {}, kn: {}, ta: {}, te: {} } as Record<Exclude<Lang, "en">, Phrases>;
  for (const part of parts) {
    for (const key of Object.keys(out) as Exclude<Lang, "en">[]) {
      Object.assign(out[key], part[key] ?? {});
    }
  }
  return out;
}
