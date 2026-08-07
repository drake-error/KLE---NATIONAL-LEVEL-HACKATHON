/**
 * HealthAgentPage.jsx — Main container for HealthGuard AI Agentic Chatbot.
 * 
 * Provides 5 sub-tab navigation and wraps children in HealthAgentProvider.
 */

import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { HealthAgentProvider } from '../../lib/healthAgentStore';
import PrescriptionScanner from './PrescriptionScanner';
import ExpiryScanner from './ExpiryScanner';
import MedicalChatbot from './MedicalChatbot';
import HospitalLocator from './HospitalLocator';

const TABS = [
  { id: 'chatbot', icon: 'smart_toy', label: 'AI Medical Chat' },
  { id: 'prescription', icon: 'document_scanner', label: 'Prescription Reader' },
  { id: 'expiry', icon: 'inventory_2', label: 'Expiry Scanner' },
  { id: 'hospitals', icon: 'local_hospital', label: 'Nearby Hospitals' },
];

function HealthAgentContent() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('chatbot');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl font-black">smart_toy</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-on-surface tracking-tight">{t("HealthGuard AI")}</h1>
            <p className="text-xs font-semibold text-on-surface-variant">{t("Agentic Medical Assistant • Powered by Gemini 2.5 Flash + Octochains")}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl bg-surface-container-lowest border border-outline-variant overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chatbot' && <MedicalChatbot />}
        {activeTab === 'prescription' && <PrescriptionScanner />}
        {activeTab === 'expiry' && <ExpiryScanner />}
        {activeTab === 'hospitals' && <HospitalLocator />}
      </div>
    </div>
  );
}

export default function HealthAgentPage() {
  return (
    <HealthAgentProvider>
      <HealthAgentContent />
    </HealthAgentProvider>
  );
}
