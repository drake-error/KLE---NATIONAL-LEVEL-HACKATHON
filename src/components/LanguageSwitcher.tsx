import React from "react";
import { LANGS, useI18n, type Lang } from "../i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <label
      className={`relative flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-on-surface hover:bg-surface-container transition-all cursor-pointer ${className}`}
    >
      <span className="sr-only">{t("Change language")}</span>
      <span className="material-symbols-outlined text-on-surface-variant text-base shrink-0" aria-hidden="true" data-icon="language">language</span>
      <span className="text-body-sm font-bold text-on-surface select-none">{current.native}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={t("Change language")}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="bg-surface text-on-surface py-1">
            {l.native} — {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
