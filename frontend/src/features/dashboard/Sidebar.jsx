import React from 'react';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n';

// Sidebar Navigation Component — ResQ-Plus Emergency Command Center
export default function Sidebar({ currentTab, setCurrentTab, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const { t } = useI18n();

  const handleTabClick = (tab) => {
    setCurrentTab(tab);
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const getTabClass = (tabName) => {
    const base = 'w-full flex items-center gap-sm px-sm py-xs font-bold rounded-xl transition-all duration-200';
    const active = 'bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary text-primary scale-[0.99] shadow-inner';
    const inactive = 'text-on-surface-variant hover:bg-surface-container-low';
    return `${base} ${currentTab === tabName ? active : inactive}`;
  };

  const mainTabs = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'fleet', icon: 'local_shipping', label: 'Fleet' },
    { id: 'patient-flow', icon: 'emergency', label: 'Patient Flow' },
    { id: 'health-vault', icon: 'folder_shared', label: 'Health Vault' },
    { id: 'diagnostic-imaging', icon: 'radiology', label: 'Diagnostic Imaging' },
    { id: 'ingredient-scanner', icon: 'qr_code_scanner', label: 'Ingredient Scanner' },
    { id: 'parental-monitoring', icon: 'supervisor_account', label: 'Parental Monitoring' },
    { id: 'awareness', icon: 'health_and_safety', label: 'Safety Hub' },
    { id: 'health-agent', icon: 'smart_toy', label: 'AI Health Agent' },
    { id: 'settings', icon: 'settings', label: 'Settings' }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <aside className={`w-64 h-screen fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant shadow-sm flex flex-col p-sm z-50 transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="mb-lg px-xs">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1">
          {mainTabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={getTabClass(tab.id)}
            >
              <span className="material-symbols-outlined" data-icon={tab.icon}>{tab.icon}</span>
              <span className="font-body-md text-body-md">{t(tab.label)}</span>
            </button>
          ))}
        </nav>
        <button className="mb-lg w-full py-sm bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-md active:scale-95 transition-transform">
          {t("New Dispatch")}
        </button>
        <div className="space-y-1 pt-sm border-t border-outline-variant">
          <button
            onClick={() => handleTabClick('support')}
            className={getTabClass('support')}
          >
            <span className="material-symbols-outlined" data-icon="help">help</span>
            <span className="font-label-md text-label-md">{t("Support")}</span>
          </button>
          <button
            onClick={() => handleTabClick('system-status')}
            className={getTabClass('system-status')}
          >
            <span className="material-symbols-outlined" data-icon="pulse">switch_account</span>
            <span className="font-label-md text-label-md">{t("System Status")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
