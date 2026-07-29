import React from 'react';

export default function TopHeader() {
  return (
    <header className="h-16 fixed top-0 right-0 w-[calc(100%-16rem)] bg-surface border-b border-outline-variant z-40 flex justify-between items-center px-margin-desktop">
      <div className="flex items-center gap-md flex-1">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" data-icon="search">search</span>
          <input 
            className="w-full pl-xl pr-sm py-xs bg-surface-container-low border-none focus:ring-2 focus:ring-primary rounded-xl text-body-sm font-body-sm" 
            placeholder="Search incidents, fleets, or staff..." 
            type="text" 
          />
        </div>
      </div>
      <div className="flex items-center gap-md">
        <div className="flex items-center gap-sm">
          <button className="p-xs text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
          </button>
          <button className="p-xs text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined" data-icon="settings_suggest">settings_suggest</span>
          </button>
          <button className="p-xs text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined" data-icon="apps">apps</span>
          </button>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant mx-xs"></div>
        <div className="flex items-center gap-sm cursor-pointer group">
          <div className="text-right">
            <p className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors">Dr. Sarah Chen</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Chief Medical Officer</p>
          </div>
          <img 
            alt="Dr. Sarah Chen"
            className="w-10 h-10 rounded-full border-2 border-primary-container object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwrv4IcFTxGzoNFBB5dMq_e7Y_zF5qYTW6Wqeewl5Q7dTs2NrXdJVel1FTpwU6Rhdr55UQDsLyxlqVjrgKEiC33ho2GJPbke5S7fk6D_Wgy2xLfM0ViMmmRpV5IhpcF3LoVejYfj2SYPt70URiG903Cfp1CI0P466mQUnK5Xv5XVfbYYH-fqkJZg-zngqqGSgyoYHpjua0OOyZ8gUD2bynlm32_XKpPvW_oXQZTKHwCFqRiK4Uo0t2Cg" 
          />
        </div>
      </div>
    </header>
  );
}
