import React, { useState, useEffect } from 'react';

const SYSTEM_NODES = [
  { id: 'cad', name: 'Ambulance CAD Dispatch Routing Engine', status: 'Operational', latency: '12ms', uptime: '99.99%', icon: 'local_shipping', desc: 'Real-time GPS tracking and algorithmic dispatch targeting for nationwide fleet response.' },
  { id: 'v2x', name: 'Smart-Traffic Emergency Green-Light Grid (V2X)', status: 'Operational', latency: '8ms', uptime: '99.98%', icon: 'traffic', desc: 'Metropolitan radio signal preemption clearing intersections ahead of approaching sirens.' },
  { id: 'vault', name: 'End-to-End Encrypted Health Vault Servers', status: 'Operational', latency: '18ms', uptime: '100%', icon: 'lock', desc: 'HIPAA-compliant zero-knowledge medical record decryption for trauma physicians en route.' },
  { id: 'ai', name: 'AI Speech Triage & Acoustic Voice Synthesizer', status: 'Operational', latency: '24ms', uptime: '99.95%', icon: 'psychology', desc: 'Automated conversational emergency dispatcher calling and ambient background forensic acoustic capture.' },
  { id: 'satellite', name: 'Offline Satellite & High-Priority SMS Relay', status: 'Operational', latency: '45ms', uptime: '99.99%', icon: 'satellite_alt', desc: 'Zero-internet cellular fallback network transmitting coordinates without mobile data.' },
];

export default function SystemStatusPage({ setCurrentTab }) {
  const [nodes, setNodes] = useState(SYSTEM_NODES);
  const [isPinging, setIsPinging] = useState(false);
  const [lastChecked, setLastChecked] = useState('Just now');
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const runDiagnostics = () => {
    setIsPinging(true);
    triggerToast('Executing nationwide telemetry diagnostic ping across all infrastructure nodes...');
    
    // Simulate real-time ping check
    setTimeout(() => {
      const updated = nodes.map(node => ({
        ...node,
        latency: `${Math.floor(6 + Math.random() * 25)}ms`,
        status: 'Operational'
      }));
      setNodes(updated);
      setIsPinging(false);
      setLastChecked(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      triggerToast('Diagnostic ping completed. All ResQ-Plus emergency systems 100% operational!');
    }, 2200);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#002764] dark:bg-primary text-white dark:text-on-primary px-5 py-3 rounded-2xl shadow-2xl border border-outline-variant/40 flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <button
            onClick={() => setCurrentTab('support')}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline mb-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Support Help Center
          </button>
          <h1 className="text-3xl font-extrabold text-[#002764] dark:text-[#b0c6ff] tracking-tight">
            ResQ-Plus System Status & Diagnostics
          </h1>
          <p className="text-on-surface-variant text-sm font-medium">
            Live telemetry, real-time node latency, and infrastructure uptime for nationwide emergency triage networks.
          </p>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={isPinging}
          className="px-6 py-3 bg-[#001945] dark:bg-primary text-white dark:text-on-primary font-extrabold text-sm rounded-2xl shadow-md flex items-center gap-2.5 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-lg ${isPinging ? 'animate-spin' : ''}`}>
            {isPinging ? 'refresh' : 'podcasts'}
          </span>
          {isPinging ? 'Pinging Infrastructure...' : 'Run Diagnostic Ping'}
        </button>
      </div>

      {/* Global Status Banner */}
      <div className="p-8 bg-gradient-to-r from-emerald-900 to-[#002764] dark:from-emerald-950 dark:to-slate-900 text-white rounded-3xl mb-8 shadow-xl relative overflow-hidden border border-emerald-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <span className="w-6 h-6 rounded-full bg-emerald-400 pulse-emerald shadow-lg shadow-emerald-500/50"></span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1">All Systems Operational</h2>
              <p className="text-emerald-200 text-sm font-medium">
                National emergency command grid is live. No active outages or routing delays detected.
              </p>
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="inline-block text-xs uppercase tracking-widest font-black bg-white/10 px-3 py-1 rounded-full text-emerald-300 border border-white/15">
              99.99% Uptime
            </span>
            <p className="text-xs text-slate-300 mt-2">Last verified: <span className="font-bold text-white">{lastChecked}</span></p>
          </div>
        </div>
      </div>

      {/* Subsystems Node Grid */}
      <h3 className="text-xl font-bold text-on-surface mb-4">Core Emergency Subsystems</h3>
      <div className="space-y-4">
        {nodes.map(node => (
          <div key={node.id} className="p-6 bg-surface-container-lowest dark:bg-surface-container/40 border border-outline-variant/40 rounded-2xl shadow-sm hover:border-primary/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-2xl">{node.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="font-bold text-lg text-on-surface">{node.name}</h4>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-full font-extrabold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {node.status}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{node.desc}</p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-on-surface-variant">Latency:</span>
                <span className="font-mono font-bold text-primary text-base">{node.latency}</span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium mt-1">Uptime: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{node.uptime}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-10 p-6 bg-surface-container-low/40 rounded-2xl border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-blue-500">info</span>
          <div>
            <h5 className="font-bold text-on-surface">Planned Maintenance Window</h5>
            <p className="text-xs text-on-surface-variant">Next routine database index optimization scheduled for Sunday, 03:00 UTC (Zero dispatch downtime).</p>
          </div>
        </div>
        <button
          onClick={() => triggerToast('Subscribed to ResQ-Plus SMS & email alert broadcast.')}
          className="px-4 py-2 bg-surface hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl border border-outline-variant/50 transition-colors shrink-0"
        >
          Subscribe to Status Updates
        </button>
      </div>
    </div>
  );
}
