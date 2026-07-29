import React from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import KPIDashboard from './KPIDashboard';
import HealthVaultTable from './HealthVaultTable';
import LiveRouteMap from './LiveRouteMap';

export default function DashboardLayout() {
  return (
    <div className="bg-background text-on-surface font-body-md overflow-hidden min-h-screen">
      {/* Fixed Left Navigation Bar */}
      <Sidebar />
      
      {/* Fixed Top Control Bar */}
      <TopHeader />
      
      {/* Main Content Canvas */}
      <main className="ml-64 mt-16 p-md flex flex-col gap-gutter min-h-[calc(100vh-4rem)]">
        {/* Top KPI Metrics Row */}
        <KPIDashboard />
        
        {/* Dashboard Body: Two-column grid assembling telemetry, charts, and interactive map */}
        <div className="flex-1 grid grid-cols-12 gap-gutter">
          {/* Left Section (8 cols): Topology & Analytics */}
          <HealthVaultTable />
          
          {/* Right Section (4 cols): Live Interactive Route Map, Control Hub & AI Terminal */}
          <LiveRouteMap />
        </div>
      </main>
    </div>
  );
}
