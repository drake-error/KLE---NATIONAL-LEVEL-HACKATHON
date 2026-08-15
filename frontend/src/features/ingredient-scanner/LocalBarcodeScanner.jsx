import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';

export default function LocalBarcodeScanner({ onScanSuccess, onClose }) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(null);
  const detectorRef = useRef(null);

  const [isSupported, setIsSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [detectedBarcode, setDetectedBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');

  // 1. Initialize BarcodeDetector
  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setIsSupported(false);
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
      });
    } catch (e) {
      setIsSupported(false);
      console.warn('BarcodeDetector initialization failed:', e);
    }
  }, []);

  // 2. Start Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setErrorMsg('');
    } catch (err) {
      console.error('Camera access error:', err);
      setErrorMsg(t("Unable to access camera. Please check permissions or enter barcode manually."));
    }
  };

  // 3. Stop Camera
  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 4. Scanning Loop
  const scanLoop = async () => {
    if (!detectorRef.current || !videoRef.current) return;
    
    // Only scan if video is playing and ready
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue;
          setDetectedBarcode(barcode);
          setManualBarcode(barcode);
          stopCamera(); // Stop camera immediately on detection
          return; // Exit loop
        }
      } catch (err) {
        // Ignore detection errors (e.g., frame not ready)
      }
    }
    requestRef.current = requestAnimationFrame(scanLoop);
  };

  // 5. Lifecycle Management
  useEffect(() => {
    if (isSupported && !detectedBarcode) {
      startCamera();
    }
    return () => stopCamera();
  }, [isSupported, detectedBarcode]); // Restart camera if we clear detectedBarcode and it's supported

  const handleVideoPlaying = () => {
    if (isSupported && !detectedBarcode) {
      scanLoop();
    }
  };

  const handleRetry = () => {
    setDetectedBarcode('');
    setManualBarcode('');
    startCamera();
  };

  const handleContinue = () => {
    if (manualBarcode.trim()) {
      onScanSuccess(manualBarcode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl overflow-hidden shadow-xl border border-outline-variant flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/60">
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined">qr_code_scanner</span>
            <h3 className="text-base font-black tracking-wide uppercase">{t("Scan Barcode")}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          <div className="flex items-center gap-2 p-3 text-xs bg-primary/10 text-primary rounded-xl border border-primary/20">
            <span className="material-symbols-outlined text-base">privacy_tip</span>
            <p>{t("Scanning happens entirely locally on your device.")}</p>
          </div>

          {!detectedBarcode ? (
            <div className="space-y-4">
              {isSupported ? (
                <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-outline-variant">
                  <video
                    ref={videoRef}
                    onPlaying={handleVideoPlaying}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Scanner overlay */}
                  <div className="absolute inset-0 border-[3px] border-primary/50 m-8 rounded-xl z-10 pointer-events-none">
                     <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_2px_rgba(var(--primary),0.5)] animate-pulse" />
                  </div>
                  {errorMsg && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-black/80 z-20">
                      <p className="text-sm font-bold text-red-400">{errorMsg}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center bg-surface-container-low rounded-2xl border border-outline-variant space-y-3">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">no_photography</span>
                  <p className="text-sm font-bold text-on-surface">{t("Barcode Scanner Unavailable")}</p>
                  <p className="text-xs text-on-surface-variant">
                    {t("Your browser doesn't support the native barcode scanner. Please enter the barcode manually.")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 text-center space-y-4">
               <span className="material-symbols-outlined text-4xl text-primary">check_circle</span>
               <div className="space-y-1">
                 <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t("Barcode Detected")}</p>
                 <p className="text-2xl font-black text-on-surface tracking-widest">{detectedBarcode}</p>
               </div>
            </div>
          )}

          {/* Manual Input / Edit */}
          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-wider block">
              {detectedBarcode ? t("Edit Barcode") : t("Manual Entry")}
            </label>
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder={t("e.g. 012345678905")}
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-outline-variant/60 flex flex-col sm:flex-row gap-3 bg-surface-container-lowest">
           {detectedBarcode && isSupported && (
             <button
               onClick={handleRetry}
               className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
             >
               <span className="material-symbols-outlined text-sm">replay</span>
               {t("Scan Again")}
             </button>
           )}
           <button
             onClick={handleContinue}
             disabled={!manualBarcode.trim()}
             className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-primary text-on-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
           >
             {t("Continue")}
             <span className="material-symbols-outlined text-sm">arrow_forward</span>
           </button>
        </div>

      </div>
    </div>
  );
}
