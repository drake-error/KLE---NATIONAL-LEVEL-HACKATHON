import React from 'react';

export default function NotFound({ setCurrentTab }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center p-4 animate-fadeIn">
      <div className="bg-surface border border-outline-variant rounded-3xl p-12 max-w-lg shadow-sm">
        <div className="w-24 h-24 bg-error-container text-error rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-5xl" data-icon="search_off">search_off</span>
        </div>
        
        <h1 className="text-3xl font-black text-on-surface mb-4 tracking-tight">Page Not Found</h1>
        
        <p className="text-body-lg text-on-surface-variant mb-8 leading-relaxed">
          The requested resource could not be located in the ResQ-Plus database. 
          The search functionality is currently undergoing maintenance.
        </p>
        
        <button 
          onClick={() => setCurrentTab('dashboard')}
          className="bg-primary hover:bg-primary/90 text-on-primary font-bold px-8 py-3 rounded-full transition-all active:scale-95 flex items-center gap-2 mx-auto"
        >
          <span className="material-symbols-outlined text-sm" data-icon="home">home</span>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
