import React from 'react';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { t } = useI18n();
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant shadow-sm flex flex-col p-sm z-50">
      <div className="mb-lg px-xs">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1">
        <button 
          onClick={() => setCurrentTab('dashboard')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'dashboard' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span className="font-body-md text-body-md">{t("Dashboard")}</span>
        </button>
        <button 
          onClick={() => setCurrentTab('patient-flow')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'patient-flow' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="emergency">emergency</span>
          <span className="font-body-md text-body-md">{t("Patient Flow")}</span>
        </button>
        <button 
          onClick={() => setCurrentTab('health-vault')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'health-vault' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="folder_shared">folder_shared</span>
          <span className="font-body-md text-body-md">{t("Health Vault")}</span>
        </button>
        <button 
          onClick={() => setCurrentTab('fleet')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'fleet' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="local_shipping">local_shipping</span>
          <span className="font-body-md text-body-md">{t("Fleet Status")}</span>
        </button>
        <button 
          onClick={() => setCurrentTab('parental-monitoring')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'parental-monitoring' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="supervisor_account">supervisor_account</span>
          <span className="font-body-md text-body-md">{t("Parental Monitoring")}</span>
        </button>
        <button 
          onClick={() => setCurrentTab('awareness')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'awareness' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="health_and_safety">health_and_safety</span>
          <span className="font-body-md text-body-md">{t("Safety Hub")}</span>
        </button>
        <button 
          onClick={() => setCurrentTab('health-agent')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'health-agent' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="smart_toy">smart_toy</span>
          <span className="font-body-md text-body-md">{t("AI Health Agent")}</span>
        </button>
        <button 
          onClick={() => setCurrentTab('diagnostic-imaging')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'diagnostic-imaging' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="radiology">radiology</span>
          <span className="font-body-md text-body-md">{t("Diagnostic Imaging")}</span>
        </button>
        <button 
          onClick={() => setCurrentTab('settings')}
          className={`w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200 ${
            currentTab === 'settings' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="settings">settings</span>
          <span className="font-body-md text-body-md">{t("Settings")}</span>
        </button>
      </nav>
      <button className="mb-lg w-full py-sm bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-md active:scale-95 transition-transform">
        {t("New Dispatch")}
      </button>
      <div className="space-y-1 pt-sm border-t border-outline-variant">
        <button
          onClick={() => setCurrentTab('support')}
          className={`w-full flex items-center gap-sm px-sm py-xs rounded-xl font-bold transition-all duration-200 ${
            currentTab === 'support' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="help">help</span>
          <span className="font-label-md text-label-md">{t("Support")}</span>
        </button>
        <button
          onClick={() => setCurrentTab('system-status')}
          className={`w-full flex items-center gap-sm px-sm py-xs rounded-xl font-bold transition-all duration-200 ${
            currentTab === 'system-status' ? 'bg-surface-container-high text-on-surface scale-[0.99]' : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="pulse">switch_account</span>
          <span className="font-label-md text-label-md">{t("System Status")}</span>
        </button>
      </div>
    </aside>
  );
}
