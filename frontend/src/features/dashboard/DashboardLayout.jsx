import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import KPIDashboard from './KPIDashboard';
import HealthVaultTable from './HealthVaultTable';
import LiveRouteMap from './LiveRouteMap';
import PatientFlow from './PatientFlow';
import Login from './Login';
import NotFound from './NotFound';

import HealthVault from '../health-vault/HealthVault';
import ParentalMonitoring from '../parental-monitoring/ParentalMonitoring';
import SettingsPage from '../settings/SettingsPage';
import SupportPage from '../support/SupportPage';
import SystemStatusPage from '../support/SystemStatusPage';
import RoadAccidentAwarenessPage from '../awareness/RoadAccidentAwarenessPage';
import HealthAgentPage from '../health-agent/HealthAgentPage';
import DiagnosticScanner from '../health-agent/DiagnosticScanner';
import { HealthAgentProvider } from '../../lib/healthAgentStore';

export default function DashboardLayout({ session }) {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [theme, setTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If no session exists, render the Login/Signup screen full-width
  if (!session) {
    return (
      <div className="bg-background text-on-surface font-body-md overflow-hidden min-h-screen flex items-center justify-center">
        <Login />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen">
      {/* Fixed Left Navigation Bar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      
      {/* Fixed Top Control Bar */}
      <TopHeader currentTab={currentTab} setCurrentTab={setCurrentTab} session={session} theme={theme} setTheme={setTheme} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      
      {/* Dynamic Tab Switch Content Canvas */}
      {currentTab === 'dashboard' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          {/* Top KPI Metrics Row */}
          <KPIDashboard />
          
          {/* Dashboard Body: Two-column grid assembling telemetry, charts, and interactive map */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-gutter">
            {/* Left Section (8 cols): Topology & Analytics */}
            <HealthVaultTable />
            
            {/* Right Section (4 cols): Live Interactive Route Map, Control Hub & AI Terminal */}
            <LiveRouteMap theme={theme} />
          </div>
        </main>
      )}
      
      {currentTab === 'health-vault' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <HealthVault searchQuery={searchQuery} />
        </main>
      )}

      {currentTab === 'parental-monitoring' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <ParentalMonitoring session={session} />
        </main>
      )}
      
 frontend
      {currentTab === 'fleet' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <FleetStatus />
        </main>
      )}
      
 main
      {currentTab === 'patient-flow' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <PatientFlow />
        </main>
      )}

      {currentTab === 'not-found' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <NotFound setCurrentTab={setCurrentTab} />
        </main>
      )}

      {currentTab === 'settings' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <SettingsPage session={session} theme={theme} setTheme={setTheme} />
        </main>
      )}

      {currentTab === 'support' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <SupportPage session={session} setCurrentTab={setCurrentTab} />
        </main>
      )}

      {currentTab === 'system-status' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <SystemStatusPage setCurrentTab={setCurrentTab} />
        </main>
      )}

      {currentTab === 'awareness' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <RoadAccidentAwarenessPage />
        </main>
      )}

      {currentTab === 'health-agent' && (
        <main className="md:ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <HealthAgentPage />
        </main>
      )}

      {currentTab === 'diagnostic-imaging' && (
        <main className="ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <HealthAgentProvider>
            <DiagnosticScanner />
          </HealthAgentProvider>
        </main>
      )}
    </div>
  );
}
