import React from 'react';

export default function HealthVaultTable() {
  return (
    <div className="col-span-8 flex flex-col gap-gutter">
      {/* System Topology & AI Agents */}
      <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined" data-icon="lan">lan</span>
            System Topology &amp; AI Agents
          </h3>
          <div className="flex items-center gap-xs">
            <span className="flex h-2 w-2 rounded-full bg-secondary"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">All Nodes Optimal</span>
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
                <span className="text-on-surface-variant">Load Metric</span>
                <span className="font-bold text-on-surface">42%</span>
              </div>
              <div className="w-full bg-outline-variant/20 h-1 rounded-full">
                <div className="bg-primary h-full w-[42%] rounded-full"></div>
              </div>
              <div className="flex items-center gap-xs mt-xs">
                <span className="px-1.5 py-0.5 bg-secondary-container/50 text-on-secondary-container text-[10px] font-bold rounded uppercase">Clearance Active</span>
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
                <span className="text-on-surface-variant">Load Metric</span>
                <span className="font-bold text-on-surface">68%</span>
              </div>
              <div className="w-full bg-outline-variant/20 h-1 rounded-full">
                <div className="bg-primary h-full w-[68%] rounded-full"></div>
              </div>
              <div className="flex items-center gap-xs mt-xs text-on-surface-variant text-[10px]">
                <span className="material-symbols-outlined text-[12px]" data-icon="router">router</span>
                14 Active Up-links
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
                <span className="text-on-surface-variant">Load Metric</span>
                <span className="font-bold text-status-emergency">91%</span>
              </div>
              <div className="w-full bg-outline-variant/20 h-1 rounded-full">
                <div className="bg-status-emergency h-full w-[91%] rounded-full"></div>
              </div>
              <div className="flex items-center gap-xs mt-xs">
                <span className="px-1.5 py-0.5 bg-error-container text-status-emergency text-[10px] font-bold rounded uppercase">Priority Alpha</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Emergency Response Analytics */}
      <section className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex-1">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined" data-icon="query_stats">query_stats</span>
            Emergency Response Analytics
          </h3>
          <div className="flex gap-sm">
            <button className="text-label-sm font-label-sm px-sm py-1 bg-surface-container-low rounded-full border border-outline-variant/30 hover:bg-surface-container-high">24H</button>
            <button className="text-label-sm font-label-sm px-sm py-1 bg-primary text-white rounded-full border border-primary">LIVE</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-gutter h-64">
          {/* Response Time Trends */}
          <div className="flex flex-col">
            <p className="font-label-md text-label-md text-on-surface-variant mb-xs">Response Time Trends (sec)</p>
            <div className="flex-1 relative flex items-end justify-between border-b border-l border-outline-variant/30 p-2">
              {/* Simple Bar Chart Representation */}
              <div className="w-[12%] bg-primary-container h-[40%] rounded-t-sm" title="08:00"></div>
              <div className="w-[12%] bg-primary-container h-[55%] rounded-t-sm" title="09:00"></div>
              <div className="w-[12%] bg-primary-container h-[35%] rounded-t-sm" title="10:00"></div>
              <div className="w-[12%] bg-primary h-[85%] rounded-t-sm" title="Current"></div>
              <div className="w-[12%] bg-primary-container h-[45%] rounded-t-sm" title="Proj +1"></div>
              <div className="w-[12%] bg-primary-container h-[40%] rounded-t-sm" title="Proj +2"></div>
              <div className="absolute -left-6 top-0 h-full flex flex-col justify-between text-[10px] font-telemetry-mono text-on-surface-variant">
                <span>600</span>
                <span>300</span>
                <span>0</span>
              </div>
            </div>
            <div className="flex justify-between px-2 mt-xs text-[10px] font-telemetry-mono text-on-surface-variant">
              <span>08:00</span><span>09:00</span><span>10:00</span><span>NOW</span><span>11:00</span><span>12:00</span>
            </div>
          </div>
          {/* Traffic Clearance Efficiency */}
          <div className="flex flex-col">
            <p className="font-label-md text-label-md text-on-surface-variant mb-xs">Traffic Clearance Efficiency (%)</p>
            <div className="flex-1 relative flex items-center justify-center p-2">
              {/* SVG Multi-Series Trend Line */}
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 100">
                {/* Grid Lines */}
                <line stroke="#e1e7ff" strokeWidth="0.5" x1="0" x2="200" y1="25" y2="25"></line>
                <line stroke="#e1e7ff" strokeWidth="0.5" x1="0" x2="200" y1="50" y2="50"></line>
                <line stroke="#e1e7ff" strokeWidth="0.5" x1="0" x2="200" y1="75" y2="75"></line>
                {/* Series 1: AI Optimized */}
                <path d="M0,80 Q50,70 80,40 T150,20 T200,10" fill="none" stroke="#006c49" strokeWidth="2"></path>
                {/* Series 2: Baseline */}
                <path d="M0,85 Q50,88 100,75 T200,65" fill="none" stroke="#747783" strokeDasharray="2,2" strokeWidth="1.5"></path>
              </svg>
              <div className="absolute top-0 right-0 flex flex-col gap-1 text-[9px] font-bold">
                <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-secondary"></span> AI OPTIMIZED</div>
                <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-outline border-dashed"></span> HISTORIC</div>
              </div>
            </div>
            <div className="mt-xs p-xs bg-surface-container-low rounded-lg flex justify-around text-[11px]">
              <div className="text-center">
                <p className="text-on-surface-variant text-[9px] uppercase">Efficiency Gain</p>
                <p className="font-bold text-secondary">+28.4%</p>
              </div>
              <div className="border-l border-outline-variant/30 h-full"></div>
              <div className="text-center">
                <p className="text-on-surface-variant text-[9px] uppercase">Peak Flow</p>
                <p className="font-bold text-primary">88.2 veh/s</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
