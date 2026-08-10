/**
 * PrescriptionScanner.jsx — Module 1: Doctor Prescription Reader.
 * Uses Gemini 2.5 Flash Vision API to parse handwritten prescriptions.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useI18n } from '../../i18n';
import { analyzeImage, fileToBase64, extractJSON } from '../../lib/geminiClient';
import { useHealthAgent } from '../../lib/healthAgentStore';

const PRESCRIPTION_PROMPT = `Analyze this handwritten doctor's prescription image carefully.

Parse ALL readable information and return a valid JSON object with this exact structure:
{
  "medicines": [
    {
      "name": "Medicine name",
      "dosage": "e.g. 500mg, 10ml",
      "frequency": "e.g. Twice daily, Once at night",
      "duration": "e.g. 7 days, 2 weeks",
      "purpose": "What this medicine is typically prescribed for"
    }
  ],
  "doctorNotes": "Any additional notes or instructions from the doctor",
  "warnings": ["Any important warnings or contraindications you can identify"],
  "diagnosis": "The diagnosis if readable from the prescription"
}

Rules:
- Extract EVERY medicine mentioned, even if partially readable.
- For unclear text, provide your best interpretation with a note.
- If a field is not readable, use "Not specified" instead of leaving it empty.
- Return ONLY the JSON object, no additional text.`;

export default function PrescriptionScanner() {
  const { t } = useI18n();
  const { addPrescription } = useHealthAgent();
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

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Analyze
    setIsAnalyzing(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const rawResponse = await analyzeImage(base64, mimeType, PRESCRIPTION_PROMPT);
      const parsed = extractJSON(rawResponse);
      setResult(parsed);
      addPrescription({ data: parsed, imageName: file.name });
    } catch (err) {
      setError(err.message || t('Failed to analyze prescription.'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [t, addPrescription]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container-low'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <span className="material-symbols-outlined text-5xl text-primary/60 mb-3 block">document_scanner</span>
        <p className="font-bold text-on-surface text-lg">{t("Upload Prescription Image")}</p>
        <p className="text-sm text-on-surface-variant mt-1">{t("Drag & drop, click to browse, or use camera")}</p>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="rounded-2xl overflow-hidden border border-outline-variant shadow-md">
          <img src={imagePreview} alt="Prescription" className="w-full h-auto max-h-80 object-contain bg-surface-container-lowest" />
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="flex items-center gap-3 p-5 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="font-bold text-on-surface">{t("Analyzing prescription with Gemini AI...")}</p>
            <p className="text-xs text-on-surface-variant">{t("Parsing handwriting, extracting medicines, dosages, and instructions")}</p>
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

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <span className="material-symbols-outlined text-amber-600">warning</span>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {t("AI-generated interpretation. Always verify with your doctor or pharmacist before following any prescription.")}
            </p>
          </div>

          {/* Diagnosis */}
          {result.diagnosis && result.diagnosis !== 'Not specified' && (
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{t("Diagnosis")}</p>
              <p className="font-bold text-on-surface">{result.diagnosis}</p>
            </div>
          )}

          {/* Medicine Cards */}
          <div className="space-y-3">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">medication</span>
              {t("Prescribed Medicines")} ({result.medicines?.length || 0})
            </h3>
            {result.medicines?.map((med, i) => (
              <div key={i} className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">{i + 1}</div>
                  <h4 className="font-black text-on-surface">{med.name}</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-xl bg-surface-container">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t("Dosage")}</p>
                    <p className="text-sm font-bold text-on-surface">{med.dosage}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t("Frequency")}</p>
                    <p className="text-sm font-bold text-on-surface">{med.frequency}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t("Duration")}</p>
                    <p className="text-sm font-bold text-on-surface">{med.duration}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t("Purpose")}</p>
                    <p className="text-sm font-bold text-on-surface">{med.purpose}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Doctor Notes */}
          {result.doctorNotes && result.doctorNotes !== 'Not specified' && (
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{t("Doctor's Notes")}</p>
              <p className="text-sm font-semibold text-on-surface">{result.doctorNotes}</p>
            </div>
          )}

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                {t("Warnings")}
              </p>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-1">• {w}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
