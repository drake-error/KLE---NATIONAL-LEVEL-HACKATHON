import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionary } from "./dictionary";
import { LANGS, type Lang } from "./types";

const STORAGE_KEY = "app-lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string };

const I18nContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (s) => s });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && LANGS.some((l) => l.code === stored)) setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (s?: string | number) => {
      if (s == null) return "";
      if (typeof s !== "string") return String(s);
      if (lang === "en") return s;
      const trimmed = s.trim();
      return dictionary[lang]?.[s] ?? dictionary[lang]?.[trimmed] ?? s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export { LANGS };
export type { Lang };
