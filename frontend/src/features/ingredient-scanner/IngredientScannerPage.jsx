import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../i18n';
import AvoidListManager from './AvoidListManager';
import LocalBarcodeScanner from './LocalBarcodeScanner';
import ScanHistoryManager from './ScanHistoryManager';
import { checkAvoidList } from './avoidMatcher';

const AVOID_LIST_STORAGE_KEY = 'resq_ingredient_avoid_list';
const SCAN_HISTORY_KEY = 'resq_ingredient_scan_history';

function getLocalAvoidList() {
  try {
    const saved = localStorage.getItem(AVOID_LIST_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [
    { id: '1', name: 'Peanuts', category: 'Allergy' },
    { id: '2', name: 'Sodium lauryl sulfate (SLS)', category: 'Sensitivity' }
  ];
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

export default function IngredientScannerPage() {
  const { t } = useI18n();
  const fileInputRef = useRef(null);

  const [toastMessage, setToastMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [showRawText, setShowRawText] = useState(false);

  // Scan History
  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(SCAN_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveToHistory = (result, source, barcode = null) => {
    const entry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      scannedAt: new Date().toISOString(),
      source, // 'barcode' or 'label-photo'
      barcode,
      productName: result.productName,
      brand: result.brand,
      ingredientTextRaw: result.ingredientTextRaw,
      ingredients: result.ingredients,
      allergenStatement: result.allergenStatement || (result.allergens?.join(', ')),
      sourceName: result.source,
      sourceUrl: result.sourceUrl,
      imageUrl: result.imageUrl,
      confidence: result.confidence
    };
    
    setScanHistory(prev => {
      const updated = [entry, ...prev].slice(0, 20); // Keep latest 20
      localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectHistory = (entry) => {
    setAnalysisResult({
      productName: entry.productName,
      brand: entry.brand,
      ingredientTextRaw: entry.ingredientTextRaw,
      ingredients: entry.ingredients,
      allergenStatement: entry.allergenStatement,
      source: entry.sourceName,
      sourceUrl: entry.sourceUrl,
      imageUrl: entry.imageUrl,
      confidence: entry.confidence || 'high'
    });
    setAnalysisError(null);
    clearSelectedFile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem(SCAN_HISTORY_KEY);
  };

  const handleRemoveHistory = (id) => {
    setScanHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Clean up Object URL when previewUrl changes or component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBarcodeClick = () => {
    showToast(t("Scan Barcode is coming soon!"));
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateAndProcessFile = (file) => {
    if (!file) return;

    setFileError(null);
    setAnalysisResult(null);
    setAnalysisError(null);

    const fileType = file.type?.toLowerCase();
    const fileName = file.name?.toLowerCase() || '';
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    const hasValidMime = ALLOWED_MIME_TYPES.includes(fileType);

    if (!hasValidMime && !hasValidExt) {
      setFileError(t("Invalid file format. Please select a JPG, JPEG, PNG, or WebP image."));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFileError(t(`File size (${sizeMB} MB) exceeds the 10 MB limit. Please select a photo smaller than 10 MB.`));
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const fetchBarcodeProduct = async (barcode) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const endpointPath = `/api/ingredient-scanner/barcode/${barcode}`;
      
      let response;
      try {
        response = await fetch(`${baseUrl}${endpointPath}`);
      } catch {
        response = await fetch(`http://localhost:4000${endpointPath}`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product data.');
      }
      
      if (data.found) {
        const resObj = {
          productName: data.productName,
          brand: data.brand,
          ingredientTextRaw: data.ingredientTextRaw,
          ingredients: data.ingredients,
          allergenStatement: data.allergens?.join(', ') || null,
          confidence: 'high',
          warnings: [],
          source: data.source,
          sourceUrl: data.sourceUrl,
          imageUrl: data.imageUrl
        };
        setAnalysisResult(resObj);
        saveToHistory(resObj, 'barcode', barcode);
        triggerToast(`Product found: ${data.productName || 'Unknown product'}`);
      } else {
        setAnalysisError("We could not find this barcode. Upload a clear photo of the ingredient label instead.");
      }
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message || 'Error communicating with server.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeIngredients = async () => {
    if (!selectedFile || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);



    try {
      const base64Data = await fileToBase64(selectedFile);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const endpointPath = '/api/ingredient-scanner/extract';

      const payload = {
        image: base64Data,
        mimeType: selectedFile.type || 'image/jpeg',
        fileName: selectedFile.name,
      };

      let response;
      try {
        response = await fetch(`${baseUrl}${endpointPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback to absolute localhost:4000 if proxy or base URL fails in dev
        response = await fetch(`http://localhost:4000${endpointPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("Failed to analyze ingredient label."));
      }

      const result = await response.json();
      setAnalysisResult(result);
      saveToHistory(result, 'label-photo', selectedFile.name);
      showToast(t("Analysis complete"));
    } catch (err) {
      setAnalysisError(err.message || t("An error occurred while analyzing the image. Please try again."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceBadge = (confidence) => {
    const conf = (confidence || 'medium').toLowerCase();
    if (conf === 'high') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          {t("High Confidence")}
        </span>
      );
    }
    if (conf === 'low') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          {t("Low Confidence")}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        {t("Medium Confidence")}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Hidden File Input for Device Image Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Toast / Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary text-on-primary shadow-2xl animate-bounce">
          <span className="material-symbols-outlined text-xl">info</span>
          <span className="text-sm font-bold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-80 transition-opacity"
            aria-label="Close notification"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {showScanner && (
        <LocalBarcodeScanner
          onClose={() => setShowScanner(false)}
          onScanSuccess={(barcode) => {
            setShowScanner(false);
            setScannedBarcode(barcode);
            fetchBarcodeProduct(barcode);
          }}
        />
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
            </div>
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              {t("Ingredient Scanner")}
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
            {t("Scan a product barcode or upload its ingredient label to understand what it contains.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container border border-secondary/20">
            {t("AI OCR Powered")}
          </span>
        </div>
      </div>

      {/* Feature Preview & Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Primary Scanner Actions & Photo Preview */}
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-6 space-y-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">photo_camera</span>
                {t("Scan Options")}
              </h2>
              {selectedFile && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {t("Photo Ready")}
                </span>
              )}
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {t("Choose how you would like to analyze your food, cosmetic, or pharmaceutical product.")}
            </p>

            {/* File Validation Error Banner */}
            {fileError && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300">
                <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0 mt-0.5">error</span>
                <div className="flex-1 text-xs font-semibold leading-snug">{fileError}</div>
                <button
                  onClick={() => setFileError(null)}
                  className="text-red-500 hover:opacity-80 transition-opacity"
                  aria-label="Dismiss error"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            {/* If no photo uploaded yet, show initial action cards */}
            {!selectedFile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Scan Barcode Action Card */}
                <button
                  onClick={() => setShowScanner(true)}
                  className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-outline-variant hover:border-primary bg-surface-container-low/50 hover:bg-primary/5 transition-all duration-300 text-center cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors flex items-center justify-center mb-3 shadow-inner">
                    <span className="material-symbols-outlined text-3xl">barcode_scanner</span>
                  </div>
                  <span className="font-bold text-on-surface text-sm mb-1">{t("Scan Barcode")}</span>
                  <span className="text-[11px] text-on-surface-variant">
                    {t("Use device camera to read product barcode")}
                  </span>
                  <span className="mt-3 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary transition-colors">
                    {t("Open Scanner")}
                  </span>
                </button>

                {/* Upload Label Photo Action Card */}
                <button
                  onClick={handleUploadClick}
                  className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-outline-variant hover:border-primary bg-surface-container-low/50 hover:bg-primary/5 transition-all duration-300 text-center cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors flex items-center justify-center mb-3 shadow-inner">
                    <span className="material-symbols-outlined text-3xl">upload_file</span>
                  </div>
                  <span className="font-bold text-on-surface text-sm mb-1">{t("Upload Label Photo")}</span>
                  <span className="text-[11px] text-on-surface-variant">
                    {t("Select JPG, PNG, or WebP photo up to 10 MB")}
                  </span>
                  <span className="mt-3 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary transition-colors">
                    {t("Select File")}
                  </span>
                </button>
              </div>
            ) : (
              /* Selected Image Preview & Controls Panel */
              <div className="space-y-4 pt-2">
                {/* Image Preview Box */}
                <div className="relative rounded-2xl overflow-hidden border border-outline-variant bg-black/5 dark:bg-white/5 flex items-center justify-center p-3">
                  <img
                    src={previewUrl}
                    alt="Ingredient label preview"
                    className="w-full h-auto max-h-72 object-contain rounded-xl shadow-sm"
                  />
                </div>

                {/* File Details Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">image</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-on-surface truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-on-surface-variant font-medium">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>

                  {/* Actions: Replace photo & Remove photo */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUploadClick}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container-lowest border border-outline-variant hover:border-primary/50 hover:text-primary transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">swap_horiz</span>
                      {t("Replace photo")}
                    </button>
                    <button
                      onClick={clearSelectedFile}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-surface-container-lowest border border-outline-variant hover:border-red-500/40 hover:bg-red-500/5 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      {t("Remove photo")}
                    </button>
                  </div>
                </div>

                {/* Analyze Ingredients Button */}
                <div className="pt-2">
                  <button
                    onClick={handleAnalyzeIngredients}
                    disabled={isAnalyzing}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                      isAnalyzing
                        ? 'bg-outline-variant/30 text-on-surface-variant cursor-not-allowed border border-outline-variant/40'
                        : 'bg-primary text-on-primary shadow-lg hover:shadow-xl active:scale-[0.98] hover:brightness-110'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                        <span>{t("Analyzing label with Gemini AI...")}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">biotech</span>
                        <span>{t("Analyze Ingredients")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">shield_with_heart</span>
            <p className="text-xs text-on-surface-variant">
              {t("Instant extraction of ingredients, allergen warnings, and readability metrics directly from packaging.")}
            </p>
          </div>
        </div>

        {/* Right Panel: Analysis Results OR Roadmap */}
        <div className="space-y-6">
          {/* Loading Indicator */}
          {isAnalyzing && (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary animate-pulse">biotech</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-black text-on-surface text-base">{t("Extracting Ingredients...")}</p>
                <p className="text-xs text-on-surface-variant">{t("Reading label text with Gemini Vision server endpoint.")}</p>
              </div>
            </div>
          )}

          {/* Analysis Failure Error Box with Retry Option */}
          {analysisError && !isAnalyzing && (
            <div className="rounded-2xl bg-surface-container-lowest border border-red-500/30 p-6 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-2xl flex-shrink-0">error</span>
                <div className="space-y-1 flex-1">
                  <h3 className="font-black text-red-600 dark:text-red-400 text-sm">{t("Analysis Failed")}</h3>
                  <p className="text-xs text-red-500/90 leading-relaxed">{analysisError}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/40">
                <button
                  onClick={handleAnalyzeIngredients}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold border border-red-500/30 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  {t("Retry Analysis")}
                </button>
              </div>
            </div>
          )}

          {/* Analysis Results Display */}
          {analysisResult && !isAnalyzing && (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-6 space-y-5 shadow-sm animate-in">
              {/* Mandatory Physical Label Verification Banner */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg flex-shrink-0 mt-0.5">verified_user</span>
                <div className="text-xs font-semibold leading-relaxed">
                  <span className="font-bold">{t("Verification Note:")} </span>
                  {t("AI extraction is provided for reference only. Please always verify the extracted details against the physical product package label.")}
                </div>
              </div>

              {/* Product Header & Confidence Badge */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/60 pb-4">
                <div className="space-y-1 min-w-0 flex-1">
                  {analysisResult.brand && (
                    <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                      {analysisResult.brand}
                    </span>
                  )}
                  <h3 className="text-lg font-black text-on-surface truncate">
                    {analysisResult.productName || t("Label Ingredients")}
                  </h3>
                </div>
                {getConfidenceBadge(analysisResult.confidence)}
              </div>

              {/* Warnings List (if any unreadability / truncation noted) */}
              {analysisResult.warnings?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>{t("Label Readability Notes")}</span>
                  </div>
                  <ul className="text-xs text-on-surface-variant space-y-1 list-disc list-inside">
                    {analysisResult.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Explicit Allergen Warning Statement (if present) */}
              {analysisResult.allergenStatement && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 block">
                    {t("Allergen Warning Statement")}
                  </span>
                  <p className="text-xs font-bold text-red-700 dark:text-red-300">
                    {analysisResult.allergenStatement}
                  </p>
                </div>
              )}

              {/* Parsed Ingredients List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">format_list_bulleted</span>
                    {t("Extracted Ingredients")}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-surface-container-high text-on-surface-variant">
                    {analysisResult.ingredients?.length || 0} {t("items")}
                  </span>
                </div>

                {analysisResult.ingredients?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.ingredients.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-container-low text-on-surface border border-outline-variant/60 flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant italic">
                    {t("No distinct individual ingredients could be separated.")}
                  </p>
                )}
              </div>

              {/* Avoid List Check Results Card */}
              {(() => {
                const avoidMatches = checkAvoidList(analysisResult.ingredients || [], getLocalAvoidList());
                return (
                  <div className="p-4 rounded-xl border space-y-3 bg-surface-container-low border-outline-variant/60">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">do_not_disturb_on</span>
                        {t("Avoid List Check")}
                      </h4>
                      {avoidMatches.length > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                          {t("Potential match found")} ({avoidMatches.length})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface-container text-on-surface-variant border border-outline-variant">
                          {t("No matches found in the extracted text")}
                        </span>
                      )}
                    </div>

                    {avoidMatches.length > 0 ? (
                      <div className="space-y-2">
                        {avoidMatches.map((m, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-on-surface">{m.avoidItem}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                                  m.category === 'Allergy' ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' :
                                  m.category === 'Sensitivity' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' :
                                  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                }`}>
                                  {t(m.category)}
                                </span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant">
                                {t("Matched label ingredient:")} <span className="font-semibold text-on-surface">{m.matchedIngredient}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {t("None of the items on your personal Avoid List matched the extracted ingredient names.")}
                      </p>
                    )}

                    {/* Required Disclaimer Note */}
                    <p className="text-[11px] text-on-surface-variant/90 italic pt-1 border-t border-outline-variant/40">
                      {t("This is an informational text match. Check the physical label and consult a clinician for allergy advice.")}
                    </p>
                  </div>
                );
              })()}

              {/* Raw Text Accordion Toggle */}
              {analysisResult.ingredientTextRaw && (
                <div className="pt-2 border-t border-outline-variant/60">
                  <button
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showRawText ? 'expand_less' : 'expand_more'}
                    </span>
                    {showRawText ? t("Hide Raw Label Text") : t("Show Raw Printed Label Text")}
                  </button>
                  {showRawText && (
                    <div className="mt-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                      {analysisResult.ingredientTextRaw}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Clearly visible "Coming next: personalized allergy matching" card */}
          {!analysisResult && !isAnalyzing && (
            <div className="rounded-2xl border p-6 space-y-4 shadow-sm bg-gradient-to-br from-primary/5 via-surface-container-lowest to-surface-container-lowest border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  {t("Feature Roadmap")}
                </span>
                <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                  {t("Coming next: personalized allergy matching")}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t("Cross-reference scanned ingredients with your Health Vault medical profile to automatically flag allergens, dietary restrictions, drug interactions, and intolerance alerts in real-time.")}
                </p>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-sm">warning</span>
                  <span className="font-semibold text-on-surface">{t("Allergen Detection")}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">health_and_safety</span>
                  <span className="font-semibold text-on-surface">{t("Dietary Safety Score")}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-sm">medical_services</span>
                  <span className="font-semibold text-on-surface">{t("Drug Interactions")}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500 text-sm">tune</span>
                  <span className="font-semibold text-on-surface">{t("Custom Exclusions")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick info placeholder banner */}
          {!analysisResult && !isAnalyzing && (
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">science</span>
                <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-wider">
                  {t("How it works")}
                </h4>
              </div>
              <ul className="text-xs text-on-surface-variant space-y-2 list-disc list-inside">
                <li>{t("Point camera at barcode or upload ingredient list picture.")}</li>
                <li>{t("AI extracts & identifies standard chemical and trade names.")}</li>
                <li>{t("Receive clear hazard ratings and healthy alternative suggestions.")}</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Personal Ingredient Avoid List Section */}
      <AvoidListManager />

      <ScanHistoryManager 
        history={scanHistory}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
        onRemove={handleRemoveHistory}
      />
    </div>
  );
}
