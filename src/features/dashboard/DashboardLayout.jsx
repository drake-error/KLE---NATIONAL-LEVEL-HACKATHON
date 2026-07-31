import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import KPIDashboard from './KPIDashboard';
import HealthVaultTable from './HealthVaultTable';
import LiveRouteMap from './LiveRouteMap';
import FleetStatus from './FleetStatus';
import PatientFlow from './PatientFlow';
import NotFound from './NotFound';

import HealthVault from '../health-vault/HealthVault';
import ParentalMonitoring from '../parental-monitoring/ParentalMonitoring';

export default function DashboardLayout({ session }) {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [theme, setTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const [searchQuery, setSearchQuery] = useState('');



  return (
    <div className="bg-background text-on-surface font-body-md overflow-hidden min-h-screen">
      {/* Fixed Left Navigation Bar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      
      {/* Fixed Top Control Bar */}
      <TopHeader currentTab={currentTab} setCurrentTab={setCurrentTab} session={session} theme={theme} setTheme={setTheme} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      {/* Dynamic Tab Switch Content Canvas */}
      {currentTab === 'dashboard' && (
        <main className="ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          {/* Top KPI Metrics Row */}
          <KPIDashboard />
          
          {/* Dashboard Body: Two-column grid assembling telemetry, charts, and interactive map */}
          <div className="flex-1 grid grid-cols-12 gap-gutter">
            {/* Left Section (8 cols): Topology & Analytics */}
            <HealthVaultTable />
            
            {/* Right Section (4 cols): Live Interactive Route Map, Control Hub & AI Terminal */}
            <LiveRouteMap theme={theme} />
          </div>
        </main>
      )}
      
      {currentTab === 'health-vault' && (
        <main className="ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <HealthVault searchQuery={searchQuery} />
        </main>
      )}

      {currentTab === 'parental-monitoring' && (
        <main className="ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <ParentalMonitoring session={session} />
        </main>
      )}
      
      {currentTab === 'fleet' && (
        <main className="ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <FleetStatus />
        </main>
      )}
      
      {currentTab === 'patient-flow' && (
        <main className="ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <PatientFlow />
        </main>
      )}

      {currentTab === 'not-found' && (
        <main className="ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
          <NotFound setCurrentTab={setCurrentTab} />
        </main>
      )}
    </div>
  );
}
