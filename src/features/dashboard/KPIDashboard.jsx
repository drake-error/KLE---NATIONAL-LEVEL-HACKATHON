import React from 'react';

export default function KPIDashboard() {
  return (
    <div className="grid grid-cols-4 gap-gutter">
      <div className="bg-surface-container-lowest p-sm rounded-xl border border-outline-variant shadow-sm flex items-center gap-sm">
        <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[28px]" data-icon="health_and_safety">health_and_safety</span>
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Active Response</p>
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
          <p className="font-label-sm text-label-sm text-on-surface-variant">Avg. Clear Time</p>
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
          <p className="font-label-sm text-label-sm text-on-surface-variant">Node Integrity</p>
          <div className="flex items-baseline gap-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">99.98%</span>
            <span className="text-outline font-label-sm text-label-sm">Stable</span>
          </div>
        </div>
      </div>
      <div className="bg-surface-container-lowest p-sm rounded-xl border border-outline-variant shadow-sm flex items-center gap-sm">
        <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-status-emergency">
          <span className="material-symbols-outlined text-[28px]" data-icon="emergency_share">emergency_share</span>
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Critical Redirection</p>
          <div className="flex items-baseline gap-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">3</span>
            <span className="text-status-emergency font-label-sm text-label-sm">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
