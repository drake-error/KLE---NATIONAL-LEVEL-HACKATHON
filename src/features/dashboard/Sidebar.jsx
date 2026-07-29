import React from 'react';

export default function Sidebar({ currentTab, setCurrentTab }) {
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant shadow-sm flex flex-col p-sm z-50">
      <div className="flex items-center gap-xs mb-lg px-xs">
        <img 
          alt="ResQ-Plus Agency Logo" 
          className="w-10 h-10 object-contain" 
          src="https://lh3.googleusercontent.com/aida/AP1WRLuNUP0gN1xnxHmlZ1LJaLoWSpkrBqfl9iaA-LFCSTmKUjmj_Ah0xR85-BmnbDW52VyMalAeshuU8kO946RVr55UUWNdcwZ-uLiHXg4hf46adfHPGfvWqOXX8C7ukXkU2MzVoN0K_h6_LWgLUOeVH--ZKQfpe6rpwkoLCcZtydUyklWz7dE3HwPRTjjSbN_N_t5Evb6zseMbrVLGfIPWEZf3lI33FtM8UsWa6dTeW7WbzXYyeEE2B2XpGQcp" 
        />
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">ResQ-Plus</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Command Center</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        <button 
          onClick={() => setCurrentTab('dashboard')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'dashboard' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span className="font-body-md text-body-md">Dashboard</span>
        </button>
        <a className="flex items-center gap-sm px-sm py-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-xl" href="#">
          <span className="material-symbols-outlined" data-icon="emergency">emergency</span>
          <span className="font-body-md text-body-md">Patient Flow</span>
        </a>
        <button 
          onClick={() => setCurrentTab('fleet')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'fleet' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="local_shipping">local_shipping</span>
          <span className="font-body-md text-body-md">Fleet Status</span>
        </button>
        <a className="flex items-center gap-sm px-sm py-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-xl" href="#">
          <span className="material-symbols-outlined" data-icon="terminal">terminal</span>
          <span className="font-body-md text-body-md">Comms Log</span>
        </a>
        <a className="flex items-center gap-sm px-sm py-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-xl" href="#">
          <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
          <span className="font-body-md text-body-md">Analytics</span>
        </a>
        <a className="flex items-center gap-sm px-sm py-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-xl" href="#">
          <span className="material-symbols-outlined" data-icon="settings">settings</span>
          <span className="font-body-md text-body-md">Settings</span>
        </a>
      </nav>
      <button className="mb-lg w-full py-sm bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-md active:scale-95 transition-transform">
        New Dispatch
      </button>
      <div className="space-y-1 pt-sm border-t border-outline-variant">
        <a className="flex items-center gap-sm px-sm py-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-xl" href="#">
          <span className="material-symbols-outlined" data-icon="help">help</span>
          <span className="font-label-md text-label-md">Support</span>
        </a>
        <a className="flex items-center gap-sm px-sm py-xs text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-xl" href="#">
          <span className="material-symbols-outlined" data-icon="pulse">switch_account</span>
          <span className="font-label-md text-label-md">System Status</span>
        </a>
      </div>
    </aside>
  );
}
