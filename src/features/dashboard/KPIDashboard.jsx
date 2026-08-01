import React from 'react';
import { useI18n } from '../../i18n';

export default function KPIDashboard() {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-4 gap-gutter">
      <div className="bg-surface-container-lowest p-sm rounded-xl border border-outline-variant shadow-sm flex items-center gap-sm">
        <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[28px]" data-icon="health_and_safety">health_and_safety</span>
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">{t("Active Response")}</p>
          <div className="flex items-baseline gap-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">12</span>
            <span className="text-secondary font-label-sm text-label-sm flex items-center">
              <span className="material-symbols-outlined text-[14px]" data-icon="trending_up">trending_up</span> 4%
            </span>
          </div>
        </div>
      </div>
      <div className="bg-surface-container-lowest p-sm rounded-xl border border-outline-variant shadow-sm flex items-center gap-sm">
        <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant">
          <span className="material-symbols-outlined text-[28px]" data-icon="timer">timer</span>
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">{t("Avg. Clear Time")}</p>
          <div className="flex items-baseline gap-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">4m 22s</span>
            <span className="text-secondary font-label-sm text-label-sm flex items-center">
              <span className="material-symbols-outlined text-[14px]" data-icon="trending_down">trending_down</span> 12s
            </span>
          </div>
        </div>
      </div>
      <div className="bg-surface-container-lowest p-sm rounded-xl border border-outline-variant shadow-sm flex items-center gap-sm">
        <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed-variant">
          <span className="material-symbols-outlined text-[28px]" data-icon="hub">hub</span>
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">{t("Node Integrity")}</p>
          <div className="flex items-baseline gap-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">99.98%</span>
            <span className="text-outline font-label-sm text-label-sm">{t("Stable")}</span>
          </div>
        </div>
      </div>
      <div className="bg-surface-container-lowest p-sm rounded-xl border border-outline-variant shadow-sm flex items-center gap-sm">
        <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-status-emergency">
          <span className="material-symbols-outlined text-[28px]" data-icon="emergency_share">emergency_share</span>
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">{t("Critical Redirection")}</p>
          <div className="flex items-baseline gap-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">3</span>
            <span className="text-status-emergency font-label-sm text-label-sm">{t("Active")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
