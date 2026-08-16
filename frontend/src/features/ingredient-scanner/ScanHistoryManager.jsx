import React from 'react';
import { useI18n } from '../../i18n';

export default function ScanHistoryManager({ history, onSelect, onClear, onRemove }) {
  const { t } = useI18n();

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant mt-6">
      <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-primary">history</span>
          <h2 className="text-sm font-black uppercase tracking-wide">{t("Recent Scans")}</h2>
        </div>
        <button
          onClick={() => {
            if (window.confirm(t("Are you sure you want to clear all scan history?"))) {
              onClear();
            }
          }}
          className="text-xs font-bold text-red-600 dark:text-red-400 hover:opacity-80 transition-opacity"
        >
          {t("Clear All")}
        </button>
      </div>
      
      <div className="divide-y divide-outline-variant/30 max-h-96 overflow-y-auto">
        {history.map((entry) => (
          <div key={entry.id} className="p-4 hover:bg-surface-container transition-colors group flex items-start gap-4">
             <div 
               className="flex-1 min-w-0 cursor-pointer"
               onClick={() => onSelect(entry)}
             >
               <div className="flex items-center gap-2 mb-1">
                 <span className="material-symbols-outlined text-sm text-on-surface-variant">
                   {entry.source === 'barcode' ? 'barcode_scanner' : 'image'}
                 </span>
                 <p className="text-sm font-bold text-on-surface truncate">
                   {entry.productName || entry.brand || t("Unnamed product")}
                 </p>
               </div>
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                 <span>{new Date(entry.scannedAt).toLocaleString()}</span>
                 {entry.source === 'barcode' && entry.barcode && (
                   <span className="flex items-center gap-1">
                     <span className="w-1 h-1 rounded-full bg-outline-variant" />
                     {entry.barcode}
                   </span>
                 )}
                 {entry.brand && entry.productName && (
                   <span className="flex items-center gap-1 truncate max-w-[120px]">
                     <span className="w-1 h-1 rounded-full bg-outline-variant" />
                     {entry.brand}
                   </span>
                 )}
               </div>
             </div>
             
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 onRemove(entry.id);
               }}
               className="p-2 -mr-2 rounded-xl text-on-surface-variant md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container-highest hover:text-red-500"
               title={t("Remove")}
             >
               <span className="material-symbols-outlined text-sm">delete</span>
             </button>
          </div>
        ))}
      </div>
      <div className="p-3 bg-surface-container text-center border-t border-outline-variant/30">
         <p className="text-[10px] text-on-surface-variant/80 uppercase tracking-wider font-bold">
           {t("Saved only in this browser on this device.")}
         </p>
      </div>
    </div>
  );
}
