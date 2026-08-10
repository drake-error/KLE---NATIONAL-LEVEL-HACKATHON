import React from 'react';
import { useI18n } from '../../i18n';

export default function KPIDashboard() {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
      <div className="group cursor-pointer bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-sm rounded-xl border border-outline-variant/50 hover:border-primary/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
        <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shadow-sm group-hover:shadow-md relative z-10">
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
      <div className="group cursor-pointer bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-sm rounded-xl border border-outline-variant/50 hover:border-secondary/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-secondary/5 rounded-full blur-xl group-hover:bg-secondary/10 transition-colors"></div>
        <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant group-hover:scale-110 transition-transform duration-300 shadow-sm group-hover:shadow-md relative z-10">
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
      <div className="group cursor-pointer bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-sm rounded-xl border border-outline-variant/50 hover:border-tertiary/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-tertiary/5 rounded-full blur-xl group-hover:bg-tertiary/10 transition-colors"></div>
        <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed-variant group-hover:scale-110 transition-transform duration-300 shadow-sm group-hover:shadow-md relative z-10">
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
      <div className="group cursor-pointer bg-gradient-to-br from-surface-container-lowest to-error-container/10 p-sm rounded-xl border border-error/20 hover:border-error/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-error/10 rounded-full blur-xl group-hover:bg-error/20 transition-colors"></div>
        <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-status-emergency group-hover:scale-110 transition-transform duration-300 shadow-[0_0_10px_rgba(220,38,38,0.2)] group-hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] relative z-10">
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
