/**
 * ExpiryScanner.jsx — Module 2: Medicine Expiry Date Scanner.
 * Uses Gemini 2.5 Flash Vision to read manufacturing/expiry dates from packaging.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useI18n } from '../../i18n';
import { analyzeImage, fileToBase64, extractJSON } from '../../lib/geminiClient';
import { useHealthAgent } from '../../lib/healthAgentStore';

const EXPIRY_PROMPT = `Examine this medicine package/strip/bottle image carefully.

Locate ALL date information including:
- Expiry date (EXP, Exp. Date, Use Before, Best Before)
- Manufacturing date (MFD, Mfg. Date, DOM)
- Batch number if visible

Return a valid JSON object with this exact structure:
{
  "medicineName": "Name of the medicine if readable",
  "expiryDate": "YYYY-MM-DD format (use last day of month if only MM/YYYY is shown)",
  "manufacturingDate": "YYYY-MM-DD or null if not found",
  "batchNumber": "Batch/Lot number or null",
  "rawTextFound": "The exact date text as printed on the package",
  "confidence": "high" or "medium" or "low"
}

Rules:
- Convert dates to YYYY-MM-DD format. If only month/year, use the last day of that month.
- If multiple dates found, pick the EXPIRY date as primary.
- "confidence" should be "high" if text is clear, "medium" if partially obscured, "low" if guessing.
- Return ONLY the JSON, no extra text.`;

function getExpiryStatus(expiryDateStr) {
  if (!expiryDateStr) return { status: 'unknown', label: 'Unknown', color: 'gray', daysLeft: null };

  const expiry = new Date(expiryDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { status: 'expired', label: 'EXPIRED', color: 'rose', daysLeft: Math.abs(daysLeft) };
  if (daysLeft <= 30) return { status: 'expiring', label: 'EXPIRING SOON', color: 'amber', daysLeft };
  return { status: 'safe', label: 'SAFE', color: 'emerald', daysLeft };
}

export default function ExpiryScanner() {
  const { t } = useI18n();
  const { addExpiryScan } = useHealthAgent();
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError(t('Please select a valid image file.'));
      return;
    }

    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const rawResponse = await analyzeImage(base64, mimeType, EXPIRY_PROMPT);
      const parsed = extractJSON(rawResponse);
      const statusInfo = getExpiryStatus(parsed.expiryDate);
      const fullResult = { ...parsed, ...statusInfo };
      setResult(fullResult);
      addExpiryScan({ data: fullResult, imageName: file.name });
    } catch (err) {
      setError(err.message || t('Failed to analyze medicine packaging.'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [t, addExpiryScan]);

  const handleDrop = useCallback((e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer?.files?.[0]); }, [handleFile]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const statusConfig = {
    safe:     { icon: 'check_circle', emoji: '🟢', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' },
    expiring: { icon: 'schedule', emoji: '🟡', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' },
    expired:  { icon: 'dangerous', emoji: '🔴', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-600 dark:text-rose-400' },
    unknown:  { icon: 'help', emoji: '⚪', bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-600 dark:text-gray-400' },
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
          isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container-low'
        }`}
      >
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <span className="material-symbols-outlined text-5xl text-primary/60 mb-3 block">inventory_2</span>
        <p className="font-bold text-on-surface text-lg">{t("Scan Medicine Packaging")}</p>
        <p className="text-sm text-on-surface-variant mt-1">{t("Upload photo of medicine box, strip, or bottle showing dates")}</p>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="rounded-2xl overflow-hidden border border-outline-variant shadow-md">
          <img src={imagePreview} alt="Medicine packaging" className="w-full h-auto max-h-80 object-contain bg-surface-container-lowest" />
        </div>
      )}

      {/* Loading */}
      {isAnalyzing && (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="font-bold text-on-surface">{t("Scanning for expiry dates...")}</p>
            <p className="text-xs text-on-surface-variant">{t("Examining packaging labels, batch numbers, and date stamps")}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-error/10 border border-error/30">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-sm font-semibold text-error">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Status Banner */}
          {(() => {
            const cfg = statusConfig[result.status] || statusConfig.unknown;
            return (
              <div className={`p-6 rounded-2xl ${cfg.bg} border ${cfg.border}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{cfg.emoji}</span>
                  <div>
                    <p className={`text-xl font-black ${cfg.text}`}>{t(result.label)}</p>
                    {result.medicineName && <p className="text-sm font-bold text-on-surface">{result.medicineName}</p>}
                  </div>
                </div>
                {result.daysLeft !== null && (
                  <p className={`text-sm font-bold ${cfg.text}`}>
                    {result.status === 'expired'
                      ? t(`Expired ${result.daysLeft} days ago`)
                      : t(`${result.daysLeft} days remaining`)
                    }
                  </p>
                )}
                {result.status === 'expired' && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40">
                    <p className="text-sm font-black text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <span className="material-symbols-outlined">block</span>
                      {t("DO NOT CONSUME — Dispose of this medicine safely. Expired medicines can be ineffective or harmful.")}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Detail Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t("Expiry Date")}</p>
              <p className="text-lg font-black text-on-surface">{result.expiryDate || '—'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t("Manufacturing Date")}</p>
              <p className="text-lg font-black text-on-surface">{result.manufacturingDate || '—'}</p>
            </div>
            {result.batchNumber && (
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t("Batch Number")}</p>
                <p className="text-lg font-black text-on-surface">{result.batchNumber}</p>
              </div>
            )}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t("AI Confidence")}</p>
              <p className={`text-lg font-black ${
                result.confidence === 'high' ? 'text-emerald-600' : result.confidence === 'medium' ? 'text-amber-600' : 'text-rose-600'
              }`}>{result.confidence?.toUpperCase() || '—'}</p>
            </div>
          </div>

          {result.rawTextFound && (
            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">{t("Raw Text Found on Package")}</p>
              <p className="text-sm font-mono font-bold text-on-surface">{result.rawTextFound}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
