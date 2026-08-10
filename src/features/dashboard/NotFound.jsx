import React from 'react';
import { useI18n } from '../../i18n';

export default function NotFound({ setCurrentTab }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6 animate-fadeIn">
      <div className="max-w-[28rem] w-full text-center p-8 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm">
        <h1 className="text-xl font-bold text-on-surface mb-2">{t("This page didn't load")}</h1>
        <p className="text-on-surface-variant mb-6 leading-relaxed">
          {t("Something went wrong on our end. You can try refreshing or head back home.")}
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 rounded-md bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors border border-transparent"
          >
            {t("Try again")}
          </button>
          <button 
            onClick={() => setCurrentTab('dashboard')} 
            className="px-4 py-2 rounded-md bg-surface text-on-surface border border-outline hover:bg-surface-container-low transition-colors font-medium"
          >
            {t("Go home")}
          </button>
        </div>
      </div>
    </div>
  );
}

