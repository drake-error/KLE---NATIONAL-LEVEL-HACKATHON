import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import SosBeaconCard from '../../components/SosBeaconCard';

export default function HealthVaultTable() {
  const { t } = useI18n();
  const [sosTriggered, setSosTriggered] = useState(false);

  const handleSosClick = () => {
    setSosTriggered(true);
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Synthesize three sharp emergency acoustic alert beeps
      [0, 0.2, 0.4].forEach(offset => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + offset); // A5 siren pitch
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + offset + 0.1); // A6 ascending slope
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + offset + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + offset);
        osc.stop(audioCtx.currentTime + offset + 0.12);
      });
    } catch (e) {
      console.error('Web Audio acoustic generator error:', e);
    }

    // Automatically reset alarm display state after 6 seconds
    setTimeout(() => {
      setSosTriggered(false);
    }, 6000);
  };

  return (
    <div className="col-span-8 flex flex-col gap-gutter relative">
      {/* System Topology & AI Agents */}
      <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined" data-icon="lan">lan</span>
            {t("System Topology & AI Agents")}
          </h3>
          <div className="flex items-center gap-xs">
            <span className="flex h-2 w-2 rounded-full bg-secondary"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{t("All Nodes Optimal")}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-sm">
          {/* Silk Board Node */}
          <div className="p-sm bg-surface-container-low rounded-xl border border-outline-variant/30">
            <div className="flex justify-between items-start mb-sm">
              <div>
                <h4 className="font-label-md text-label-md text-on-surface">Silk Board Node</h4>
                <p className="text-[10px] font-telemetry-mono text-on-surface-variant uppercase">ID: BLR-SB-01</p>
              </div>
              <span className="material-symbols-outlined text-secondary text-[20px] pulse-emerald" data-icon="check_circle">check_circle</span>
            </div>
            <div className="space-y-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-on-surface-variant">{t("Load Metric")}</span>
                <span className="font-bold text-on-surface">42%</span>
              </div>
              <div className="w-full bg-outline-variant/20 h-1 rounded-full">
                <div className="bg-primary h-full w-[42%] rounded-full"></div>
              </div>
              <div className="flex items-center gap-xs mt-xs">
                <span className="px-1.5 py-0.5 bg-secondary-container/50 text-on-secondary-container text-[10px] font-bold rounded uppercase">{t("Clearance Active")}</span>
              </div>
            </div>
          </div>
          {/* HSR Layout Relay */}
          <div className="p-sm bg-surface-container-low rounded-xl border border-outline-variant/30">
            <div className="flex justify-between items-start mb-sm">
              <div>
                <h4 className="font-label-md text-label-md text-on-surface">HSR Layout Relay</h4>
                <p className="text-[10px] font-telemetry-mono text-on-surface-variant uppercase">ID: BLR-HSR-04</p>
              </div>
              <span className="material-symbols-outlined text-secondary text-[20px]" data-icon="check_circle">check_circle</span>
            </div>
            <div className="space-y-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-on-surface-variant">{t("Load Metric")}</span>
                <span className="font-bold text-on-surface">68%</span>
              </div>
              <div className="w-full bg-outline-variant/20 h-1 rounded-full">
                <div className="bg-primary h-full w-[68%] rounded-full"></div>
              </div>
              <div className="flex items-center gap-xs mt-xs text-on-surface-variant text-[10px]">
                <span className="material-symbols-outlined text-[12px]" data-icon="router">router</span>
                14 {t("Active Up-links")}
              </div>
            </div>
          </div>
          {/* JP Nagar Critical */}
          <div className="p-sm bg-surface-container-low rounded-xl border border-status-emergency/30">
            <div className="flex justify-between items-start mb-sm">
              <div>
                <h4 className="font-label-md text-label-md text-on-surface">JP Nagar Critical</h4>
                <p className="text-[10px] font-telemetry-mono text-on-surface-variant uppercase">ID: BLR-JPN-02</p>
              </div>
              <span className="material-symbols-outlined text-status-emergency text-[20px] animate-pulse" data-icon="warning">warning</span>
            </div>
            <div className="space-y-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-on-surface-variant">{t("Load Metric")}</span>
                <span className="font-bold text-status-emergency">91%</span>
              </div>
              <div className="w-full bg-outline-variant/20 h-1 rounded-full">
                <div className="bg-status-emergency h-full w-[91%] rounded-full"></div>
              </div>
              <div className="flex items-center gap-xs mt-xs">
                <span className="px-1.5 py-0.5 bg-error-container text-status-emergency text-[10px] font-bold rounded uppercase">{t("Priority Alpha")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Red Concentric SOS Beacon Control Hub (Below Topology) ─── */}
      <SosBeaconCard />



      {/* Emergency Response Analytics */}
      <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex-1">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined" data-icon="query_stats">query_stats</span>
            {t("Emergency Response Analytics")}
          </h3>
          <div className="flex gap-sm">
            <button className="text-label-sm font-label-sm px-sm py-1 bg-surface-container-low rounded-full border border-outline-variant/30 hover:bg-surface-container-high">24H</button>
            <button className="text-label-sm font-label-sm px-sm py-1 bg-primary text-white rounded-full border border-primary">LIVE</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter h-auto min-h-[16rem]">
          {/* The Problem */}
          <div className="flex flex-col p-6 bg-error-container/10 rounded-xl border border-error/20 relative overflow-hidden shadow-sm">
            <div className="absolute -right-8 -top-8 text-error/5 rotate-12 pointer-events-none">
              <span className="material-symbols-outlined text-[160px]">warning</span>
            </div>
            <p className="font-label-lg font-bold text-error mb-4 relative z-10 flex items-center gap-2">
              <span className="material-symbols-outlined">gpp_bad</span>
              {t("The Reality: Traffic Delays Kill")}
            </p>
            <div className="flex-1 flex flex-col justify-center relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-6xl font-black text-error drop-shadow-sm">20%+</span>
                <span className="text-sm font-bold text-error/90 leading-snug">
                  {t("of emergency patients")} <br/>
                  {t("lose their lives en-route")}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                {t("In dense urban cities, ambulances are frequently delayed by severe traffic congestion. The 'Golden Hour' is lost on the road, leading to a tragic loss of life before reaching the hospital.")}
              </p>
            </div>
          </div>

          {/* The Solution */}
          <div className="flex flex-col p-6 bg-primary-container/10 rounded-xl border border-primary/20 relative overflow-hidden shadow-sm">
            <div className="absolute -right-8 -top-8 text-primary opacity-5 rotate-12 pointer-events-none">
              <span className="material-symbols-outlined text-[160px]">health_and_safety</span>
            </div>
            <p className="font-label-lg font-bold text-primary mb-4 relative z-10 flex items-center gap-2">
              <span className="material-symbols-outlined">verified</span>
              {t("The Solution: ResQ-Plus Impact")}
            </p>
            <div className="flex-1 flex flex-col justify-center relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-6xl font-black text-primary drop-shadow-sm">40%</span>
                <span className="text-sm font-bold text-primary/90 leading-snug">
                  {t("Reduction in Ambulance")} <br/>
                  {t("Travel Time")}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant font-medium leading-relaxed mb-4">
                {t("By implementing automated 1-click SOS dispatch and AI-driven smart traffic clearance, ResQ-Plus bypasses bottlenecks—ensuring patients reach the hospital on time.")}
              </p>
              
              <div className="p-3 bg-surface-container-low rounded-xl flex justify-around text-xs border border-primary/10 shadow-inner">
                <div className="text-center">
                  <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider mb-1">{t("Avg City Delay")}</p>
                  <p className="font-black text-error text-lg line-through decoration-2 opacity-80">22 Mins</p>
                </div>
                <div className="w-px bg-outline-variant/40 h-auto"></div>
                <div className="text-center">
                  <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider mb-1">{t("With ResQ-Plus")}</p>
                  <p className="font-black text-secondary text-lg">~12 Mins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
