import React, { useState } from 'react';

export default function TopHeader({ currentTab, setCurrentTab, isLoggedIn, userName }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      setCurrentTab('not-found');
    }
  };
  return (
    <header className="h-16 fixed top-0 right-0 w-[calc(100%-16rem)] bg-surface border-b border-outline-variant z-40 flex justify-between items-center px-margin-desktop">
      <div className="flex items-center gap-md flex-1">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" data-icon="search">search</span>
          <input 
            className="w-full pl-xl pr-sm py-xs bg-surface-container-low border-none focus:ring-2 focus:ring-primary rounded-xl text-body-sm font-body-sm" 
            placeholder="Search incidents, fleets, or staff..." 
            type="text" 
            onKeyDown={handleSearch}
          />
        </div>
      </div>
      <div className="flex items-center gap-md">
        <div className="flex items-center gap-sm relative">
          {/* Light/Dark Mode Toggle */}
          <button 
            onClick={() => {
              const html = document.documentElement;
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              if (nextTheme === 'dark') {
                html.classList.add('dark');
              } else {
                html.classList.remove('dark');
              }
            }}
            className="p-xs text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors active:scale-95"
            title="Toggle Light/Dark Mode"
          >
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
              className={`p-xs rounded-full transition-colors active:scale-95 ${showNotifications ? 'bg-primary-container text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-64 bg-surface border border-outline-variant rounded-xl shadow-lg z-50 p-4 animate-fadeIn">
                <h4 className="font-bold text-label-md border-b border-outline-variant pb-2 mb-2">Notifications</h4>
                <p className="text-body-sm text-on-surface-variant text-center py-4">No new notifications</p>
              </div>
            )}
          </div>
          
          {/* Settings */}
          <div className="relative">
            <button 
              onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
              className={`p-xs rounded-full transition-colors active:scale-95 ${showSettings ? 'bg-primary-container text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              <span className="material-symbols-outlined" data-icon="settings_suggest">settings_suggest</span>
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-outline-variant rounded-xl shadow-lg z-50 p-2 animate-fadeIn">
                <button className="w-full text-left px-3 py-2 text-label-md hover:bg-surface-container-low rounded-lg transition-colors">System Settings</button>
                <button className="w-full text-left px-3 py-2 text-label-md hover:bg-surface-container-low rounded-lg transition-colors">Healthcare Tools</button>
                <button className="w-full text-left px-3 py-2 text-label-md hover:bg-surface-container-low rounded-lg transition-colors text-error">Sign Out</button>
              </div>
            )}
          </div>
          
          {/* Apps Grid */}
          <div className="relative">
            <button 
              onClick={() => { setShowApps(!showApps); setShowNotifications(false); setShowSettings(false); }}
              className={`p-xs rounded-full transition-colors active:scale-95 ${showApps ? 'bg-primary-container text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              <span className="material-symbols-outlined" data-icon="apps">apps</span>
            </button>
            {showApps && (
              <div className="absolute right-0 mt-2 w-72 bg-surface border border-outline-variant rounded-xl shadow-lg z-50 p-4 animate-fadeIn">
                <h4 className="font-bold text-label-md border-b border-outline-variant pb-2 mb-3">Healthcare Modules</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <button onClick={() => { setCurrentTab('dashboard'); setShowApps(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-surface-container-low rounded-xl transition-all">
                    <span className="material-symbols-outlined text-primary text-2xl" data-icon="dashboard">dashboard</span>
                    <span className="text-[10px] font-bold text-on-surface leading-tight">Dashboard</span>
                  </button>
                  <button onClick={() => { setCurrentTab('fleet'); setShowApps(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-surface-container-low rounded-xl transition-all">
                    <span className="material-symbols-outlined text-info text-2xl" data-icon="local_shipping">local_shipping</span>
                    <span className="text-[10px] font-bold text-on-surface leading-tight">Fleet Status</span>
                  </button>
                  <button onClick={() => { setCurrentTab('patient-flow'); setShowApps(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-surface-container-low rounded-xl transition-all">
                    <span className="material-symbols-outlined text-rose-500 text-2xl" data-icon="psychology">psychology</span>
                    <span className="text-[10px] font-bold text-on-surface leading-tight">Clinical AI</span>
                  </button>
                  <button onClick={() => { setCurrentTab('not-found'); setShowApps(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-surface-container-low rounded-xl transition-all opacity-60">
                    <span className="material-symbols-outlined text-slate-400 text-2xl" data-icon="folder_shared">folder_shared</span>
                    <span className="text-[10px] font-bold text-on-surface leading-tight">Health Vault</span>
                  </button>
                  <button onClick={() => { setCurrentTab('not-found'); setShowApps(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-surface-container-low rounded-xl transition-all opacity-60">
                    <span className="material-symbols-outlined text-slate-400 text-2xl" data-icon="biotech">biotech</span>
                    <span className="text-[10px] font-bold text-on-surface leading-tight">Radiology</span>
                  </button>
                  <button onClick={() => { setCurrentTab('not-found'); setShowApps(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-surface-container-low rounded-xl transition-all opacity-60">
                    <span className="material-symbols-outlined text-slate-400 text-2xl" data-icon="vaccines">vaccines</span>
                    <span className="text-[10px] font-bold text-on-surface leading-tight">Pharmacy</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant mx-xs"></div>
        
        {isLoggedIn ? (
          <div className="flex items-center gap-sm cursor-pointer group">
            <div className="text-right">
              <p className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors capitalize">{userName || 'User'}</p>
            </div>
            <img 
              alt={userName || 'User'}
              className="w-10 h-10 rounded-full border-2 border-primary-container bg-surface-container object-cover" 
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${userName || 'User'}&backgroundColor=e2e8f0`} 
            />
          </div>
        ) : (
          <button 
            onClick={() => setCurrentTab('login')}
            className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 rounded-full font-bold text-label-md transition-all active:scale-95 shadow-sm"
          >
            Login / Sign Up
          </button>
        )}
      </div>
    </header>
  );
}
