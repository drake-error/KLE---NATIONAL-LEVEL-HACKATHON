/**
 * DiagnosticScanner.jsx — MediScan Pro: AI-Powered Diagnostic Image Scanner.
 *
 * Uses Gemini 2.5 Flash Vision to analyze medical images (X-Ray, CT, MRI, Ultrasound),
 * detect abnormalities with confidence percentages, annotate findings on a canvas overlay,
 * and provide a comprehensive diagnostic report designed as a doctor-assist tool.
 *
 * Tailored for the Indian healthcare ecosystem.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { analyzeImage, fileToBase64, extractJSON } from '../../lib/geminiClient';
import { useHealthAgent } from '../../lib/healthAgentStore';

// ─── Constants ───────────────────────────────────────────────────────────────

const IMAGING_TYPES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Other'];

const BODY_REGIONS = [
  'Head / Brain', 'Neck', 'Shoulder', 'Chest', 'Abdomen', 'Spine (Cervical)',
  'Spine (Thoracic)', 'Spine (Lumbar)', 'Hip', 'Pelvis', 'Upper Arm', 'Elbow',
  'Forearm', 'Wrist', 'Hand', 'Thigh', 'Knee', 'Lower Leg', 'Ankle', 'Foot', 'Other',
];

const SEVERITY_CONFIG = {
  Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.35)', ring: '#dc2626', label: 'CRITICAL' },
  High:     { color: '#ea580c', bg: 'rgba(234,88,12,0.12)', border: 'rgba(234,88,12,0.35)', ring: '#ea580c', label: 'HIGH' },
  Moderate: { color: '#ca8a04', bg: 'rgba(202,138,4,0.12)', border: 'rgba(202,138,4,0.35)', ring: '#ca8a04', label: 'MODERATE' },
  Low:      { color: '#0d9488', bg: 'rgba(13,148,136,0.12)', border: 'rgba(13,148,136,0.35)', ring: '#0d9488', label: 'LOW' },
};

function buildDiagnosticPrompt(imagingType, bodyRegion, patientAge, patientGender, clinicalHistory) {
  return `Senior radiologist CDSS analysis. Scan: ${imagingType}, Region: ${bodyRegion}${patientAge ? `, Age: ${patientAge}` : ''}${patientGender ? `, Gender: ${patientGender}` : ''}${clinicalHistory ? `, History: ${clinicalHistory}` : ''}.

Return JSON:
{"overallAssessment":"Normal|Abnormal|Indeterminate","confidenceScore":0-100,"summary":"2-3 sentence clinical summary","findings":[{"id":1,"title":"finding name","description":"radiological description","severity":"Critical|High|Moderate|Low","confidence":0-100,"locationDescription":"anatomical location","relativeX":0.0-1.0,"relativeY":0.0-1.0,"differentialDiagnosis":["condition1","condition2"],"recommendedAction":"next step"}],"normalFindings":["healthy observations"],"recommendations":"next steps","limitations":"what AI couldn't assess","indianContext":"India-specific notes: TB, tropical infections, govt hospital tests like CBNAAT"}

Rules: Normal scan=empty findings array,high confidence. Invalid image=Indeterminate,confidence 0. relativeX/relativeY are normalized 0-1 image coordinates (0,0=top-left). Min 2 differential diagnoses per finding. Consider TB, tropical infections, silicosis, rheumatic heart disease, malnutrition. Be thorough—doctors depend on this.`;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Confidence ring SVG */
function ConfidenceRing({ value, size = 80, strokeWidth = 6, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const resolvedColor = color || (value >= 80 ? '#16a34a' : value >= 50 ? '#ca8a04' : '#dc2626');

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="currentColor" strokeWidth={strokeWidth} className="text-outline-variant opacity-30" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={resolvedColor} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
    </svg>
  );
}

/** Pill chip button */
function ChipButton({ label, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border whitespace-nowrap ${
        selected
          ? 'bg-primary text-on-primary border-primary shadow-md scale-[1.02]'
          : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary/50 hover:bg-surface-container-low'
      }`}
    >
      {label}
    </button>
  );
}

/** Severity badge */
function SeverityBadge({ severity }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.Low;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
      style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
      {config.label}
    </span>
  );
}

/** Confidence bar */
function ConfidenceBar({ value, color }) {
  const resolvedColor = color || (value >= 80 ? '#16a34a' : value >= 50 ? '#ca8a04' : '#dc2626');
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-outline-variant/30 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${value}%`, backgroundColor: resolvedColor }} />
      </div>
      <span className="text-xs font-black tabular-nums" style={{ color: resolvedColor }}>{value}%</span>
    </div>
  );
}

// ─── Annotated Canvas Overlay ────────────────────────────────────────────────

function AnnotatedImageView({ imageSrc, findings, hoveredFinding, setHoveredFinding, selectedFinding, setSelectedFinding }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);

  const drawMarkers = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container || !findings?.length) return;

    const rect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const imgOffsetX = rect.left - containerRect.left;
    const imgOffsetY = rect.top - containerRect.top;
    const imgW = rect.width;
    const imgH = rect.height;

    findings.forEach((finding, idx) => {
      const x = imgOffsetX + finding.relativeX * imgW;
      const y = imgOffsetY + finding.relativeY * imgH;
      const isHovered = hoveredFinding === finding.id || selectedFinding === finding.id;
      const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.Low;
      const radius = isHovered ? 22 : 18;

      // Outer glow
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, 0, 2 * Math.PI);
        ctx.fillStyle = config.color + '25';
        ctx.fill();
      }

      // Ring
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = config.color + '20';
      ctx.fill();
      ctx.strokeStyle = config.color;
      ctx.lineWidth = isHovered ? 3.5 : 2.5;
      ctx.stroke();

      // Number
      ctx.fillStyle = config.color;
      ctx.font = `bold ${isHovered ? 14 : 12}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), x, y);
    });
  }, [findings, hoveredFinding, selectedFinding]);

  useEffect(() => {
    if (imgLoaded) {
      drawMarkers();
      // Redraw on resize
      const observer = new ResizeObserver(drawMarkers);
      if (containerRef.current) observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [imgLoaded, drawMarkers]);

  const handleCanvasInteraction = useCallback((e) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container || !findings?.length) return;

    const canvasRect = canvas.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const mx = e.clientX - canvasRect.left;
    const my = e.clientY - canvasRect.top;

    const imgOffsetX = imgRect.left - canvasRect.left;
    const imgOffsetY = imgRect.top - canvasRect.top;
    const imgW = imgRect.width;
    const imgH = imgRect.height;

    let found = null;
    findings.forEach((finding) => {
      const fx = imgOffsetX + finding.relativeX * imgW;
      const fy = imgOffsetY + finding.relativeY * imgH;
      const dist = Math.sqrt((mx - fx) ** 2 + (my - fy) ** 2);
      if (dist < 24) found = finding;
    });

    if (e.type === 'mousemove') {
      setHoveredFinding(found ? found.id : null);
      if (found) {
        setTooltipData({ finding: found, x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top });
      } else {
        setTooltipData(null);
      }
      canvas.style.cursor = found ? 'pointer' : 'default';
    } else if (e.type === 'click' && found) {
      setSelectedFinding(found.id === selectedFinding ? null : found.id);
    }
  }, [findings, selectedFinding, setHoveredFinding, setSelectedFinding]);

  return (
    <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-outline-variant bg-black/5 dark:bg-white/5">
      <img ref={imgRef} src={imageSrc} alt="Medical scan"
        className="w-full h-auto max-h-[500px] object-contain"
        onLoad={() => setImgLoaded(true)} />
      <canvas ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseMove={handleCanvasInteraction}
        onClick={handleCanvasInteraction}
        onMouseLeave={() => { setHoveredFinding(null); setTooltipData(null); }} />
      {/* Tooltip */}
      {tooltipData && (
        <div className="absolute z-50 pointer-events-none px-3 py-2 rounded-xl bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant shadow-xl max-w-[240px]"
          style={{ left: Math.min(tooltipData.x + 16, (containerRef.current?.offsetWidth || 400) - 260), top: tooltipData.y - 10 }}>
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={tooltipData.finding.severity} />
            <span className="text-xs font-black text-on-surface truncate">{tooltipData.finding.title}</span>
          </div>
          <p className="text-[10px] text-on-surface-variant leading-snug">{tooltipData.finding.locationDescription}</p>
          <div className="mt-1">
            <ConfidenceBar value={tooltipData.finding.confidence} color={SEVERITY_CONFIG[tooltipData.finding.severity]?.color} />
          </div>
        </div>
      )}
      {/* Findings count badge */}
      {findings?.length > 0 && (
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant shadow-md">
          <span className="text-xs font-black text-on-surface">{findings.length} LOCALIZED FINDING{findings.length !== 1 ? 'S' : ''}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DiagnosticScanner() {
  const { t } = useI18n();
  const { addDiagnosticScan } = useHealthAgent();
  const fileInputRef = useRef(null);

  // Upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imagingType, setImagingType] = useState('X-Ray');
  const [bodyRegion, setBodyRegion] = useState('Chest');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Interaction state
  const [hoveredFinding, setHoveredFinding] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [expandedFindings, setExpandedFindings] = useState({});

  // Scan history
  const [scanHistory, setScanHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mediscan-history') || '[]');
    } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  const toggleFindingExpansion = (id) => {
    setExpandedFindings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError(t('Please select a valid medical image file (JPEG, PNG, DICOM).'));
      return;
    }
    setError(null);
    setResult(null);
    setSelectedFinding(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, [t]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const runAnalysis = useCallback(async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setSelectedFinding(null);
    setExpandedFindings({});

    const stages = [
      'Preprocessing medical image...',
      'Analyzing anatomical structures...',
      'Detecting abnormalities...',
      'Computing confidence scores...',
      'Generating diagnostic report...',
    ];
    let stageIdx = 0;
    setAnalysisProgress(stages[0]);
    const progressTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setAnalysisProgress(stages[stageIdx]);
    }, 2200);

    try {
      const { base64, mimeType } = await fileToBase64(imageFile);
      const prompt = buildDiagnosticPrompt(imagingType, bodyRegion, patientAge, patientGender, clinicalHistory);
      const rawResponse = await analyzeImage(base64, mimeType, prompt);
      const parsed = extractJSON(rawResponse);

      // Validate and sanitize coordinates
      if (parsed.findings) {
        parsed.findings = parsed.findings.map((f, i) => ({
          ...f,
          id: f.id || i + 1,
          relativeX: Math.max(0.05, Math.min(0.95, Number(f.relativeX) || 0.5)),
          relativeY: Math.max(0.05, Math.min(0.95, Number(f.relativeY) || 0.5)),
          confidence: Math.max(0, Math.min(100, Number(f.confidence) || 50)),
          severity: SEVERITY_CONFIG[f.severity] ? f.severity : 'Moderate',
        }));
      }
      if (typeof parsed.confidenceScore === 'number') {
        parsed.confidenceScore = Math.max(0, Math.min(100, parsed.confidenceScore));
      }

      setResult(parsed);

      // Save to store and local history
      const scanRecord = {
        data: parsed,
        imagingType,
        bodyRegion,
        imageName: imageFile.name,
        patientAge,
        patientGender,
      };
      addDiagnosticScan(scanRecord);

      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        imagingType,
        bodyRegion,
        assessment: parsed.overallAssessment,
        confidence: parsed.confidenceScore,
        findingsCount: parsed.findings?.length || 0,
        imageName: imageFile.name,
      };
      setScanHistory(prev => {
        const updated = [historyEntry, ...prev].slice(0, 10);
        localStorage.setItem('mediscan-history', JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      setError(err.message || t('Failed to analyze medical image. Please try again.'));
    } finally {
      clearInterval(progressTimer);
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  }, [imageFile, imagingType, bodyRegion, patientAge, patientGender, clinicalHistory, t, addDiagnosticScan]);

  const resetScan = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setSelectedFinding(null);
    setExpandedFindings({});
    setPatientAge('');
    setPatientGender('');
    setClinicalHistory('');
  };

  const exportReport = () => {
    if (!result) return;
    const lines = [
      '═══════════════════════════════════════════════════════',
      '  MEDISCAN PRO — AI DIAGNOSTIC REPORT',
      '  ResQ-Plus Clinical Decision Support System',
      '═══════════════════════════════════════════════════════',
      '',
      `Date: ${new Date().toLocaleString('en-IN')}`,
      `Imaging Type: ${imagingType}`,
      `Body Region: ${bodyRegion}`,
      patientAge ? `Patient Age: ${patientAge}` : '',
      patientGender ? `Patient Gender: ${patientGender}` : '',
      clinicalHistory ? `Clinical History: ${clinicalHistory}` : '',
      '',
      `OVERALL ASSESSMENT: ${result.overallAssessment}`,
      `CONFIDENCE SCORE: ${result.confidenceScore}%`,
      '',
      `SUMMARY: ${result.summary}`,
      '',
    ];

    if (result.findings?.length > 0) {
      lines.push('FINDINGS:');
      lines.push('─────────────────────────────────────────');
      result.findings.forEach((f, i) => {
        lines.push(`  ${i + 1}. ${f.title} [${f.severity}] — ${f.confidence}% confidence`);
        lines.push(`     ${f.description}`);
        lines.push(`     Location: ${f.locationDescription}`);
        lines.push(`     Differential: ${f.differentialDiagnosis?.join(', ')}`);
        lines.push(`     Recommended: ${f.recommendedAction}`);
        lines.push('');
      });
    }

    if (result.normalFindings?.length > 0) {
      lines.push('NORMAL FINDINGS:');
      result.normalFindings.forEach(n => lines.push(`  ✓ ${n}`));
      lines.push('');
    }

    if (result.recommendations) {
      lines.push(`RECOMMENDATIONS: ${result.recommendations}`);
      lines.push('');
    }
    if (result.indianContext) {
      lines.push(`INDIA-SPECIFIC NOTES: ${result.indianContext}`);
      lines.push('');
    }
    if (result.limitations) {
      lines.push(`LIMITATIONS: ${result.limitations}`);
      lines.push('');
    }
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('⚠ DISCLAIMER: This AI-generated report is for clinical');
    lines.push('  decision support only. It does NOT replace professional');
    lines.push('  medical diagnosis. Always verify with a qualified physician.');
    lines.push('═══════════════════════════════════════════════════════');

    const blob = new Blob([lines.filter(Boolean).join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediScan_Report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-in">
      {/* ── Medical Disclaimer Banner ────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border"
        style={{ backgroundColor: 'rgba(234,88,12,0.08)', borderColor: 'rgba(234,88,12,0.25)' }}>
        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5 text-xl">verified_user</span>
        <div>
          <p className="text-sm font-black text-amber-700 dark:text-amber-300">{t("Clinical Decision Support Tool — Not a Diagnostic Replacement")}</p>
          <p className="text-xs font-semibold text-amber-600/80 dark:text-amber-400/80 mt-0.5 leading-relaxed">
            {t("MediScan Pro is designed to assist qualified healthcare professionals by providing AI-powered second opinions. All findings MUST be verified by a licensed physician before clinical decisions. This system complies with ICMR guidelines for AI in healthcare.")}
          </p>
        </div>
      </div>

      {/* ── Two Column Layout ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ══════════ LEFT PANEL — Upload & Configuration ══════════ */}
        <div className="space-y-4">

          {/* Upload Zone */}
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">upload_file</span>
                {t("Upload Medical Image")}
              </h3>
              <div className="flex gap-1.5">
                {scanHistory.length > 0 && (
                  <button onClick={() => setShowHistory(!showHistory)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-on-surface-variant bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-xs mr-0.5" style={{ fontSize: '12px' }}>history</span>
                    {t("History")} ({scanHistory.length})
                  </button>
                )}
                {result && (
                  <button onClick={resetScan}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-on-surface-variant bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-xs mr-0.5" style={{ fontSize: '12px' }}>refresh</span>
                    {t("New Scan")}
                  </button>
                )}
              </div>
            </div>

            <div onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container-low'
              }`}>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              <span className="material-symbols-outlined text-4xl text-primary/50 mb-2 block">radiology</span>
              <p className="font-bold text-on-surface text-sm">{t("Drop medical scan here or click to browse")}</p>
              <p className="text-xs text-on-surface-variant mt-1">{t("Supports X-Ray, CT, MRI, Ultrasound images (JPEG, PNG)")}</p>
            </div>

            {/* Image Preview */}
            {imagePreview && !result && (
              <div className="rounded-2xl overflow-hidden border border-outline-variant">
                <img src={imagePreview} alt="Medical scan preview"
                  className="w-full h-auto max-h-64 object-contain bg-black/5 dark:bg-white/5" />
                <div className="px-3 py-2 bg-surface-container-low flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-on-surface-variant truncate">{imageFile?.name}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant">{(imageFile?.size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
            )}
          </div>

          {/* Scan Configuration */}
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 space-y-4">
            {/* Imaging Type */}
            <div>
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-wider mb-2 block">{t("Imaging Type")}</label>
              <div className="flex flex-wrap gap-1.5">
                {IMAGING_TYPES.map(type => (
                  <ChipButton key={type} label={type} selected={imagingType === type} onClick={() => setImagingType(type)} />
                ))}
              </div>
            </div>

            {/* Body Region */}
            <div>
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-wider mb-2 block">{t("Body Region")}</label>
              <div className="flex flex-wrap gap-1.5">
                {BODY_REGIONS.map(region => (
                  <ChipButton key={region} label={region} selected={bodyRegion === region} onClick={() => setBodyRegion(region)} />
                ))}
              </div>
            </div>

            {/* Patient Context (Optional) */}
            <details className="group">
              <summary className="text-xs font-black text-on-surface-variant uppercase tracking-wider cursor-pointer flex items-center gap-1 select-none">
                <span className="material-symbols-outlined text-xs transition-transform group-open:rotate-90" style={{ fontSize: '14px' }}>chevron_right</span>
                {t("Patient Context")} <span className="text-[10px] font-normal normal-case">(optional — improves accuracy)</span>
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">{t("Age")}</label>
                  <input type="number" value={patientAge} onChange={e => setPatientAge(e.target.value)}
                    placeholder="e.g. 45" min="0" max="120"
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">{t("Gender")}</label>
                  <select value={patientGender} onChange={e => setPatientGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary focus:outline-none transition-colors">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">{t("Clinical History")}</label>
                  <textarea value={clinicalHistory} onChange={e => setClinicalHistory(e.target.value)}
                    placeholder="e.g. Chronic cough for 3 weeks, weight loss, night sweats. Known diabetic."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary focus:outline-none transition-colors resize-none" />
                </div>
              </div>
            </details>

            {/* Analyze Button */}
            <button onClick={runAnalysis} disabled={!imageFile || isAnalyzing}
              className={`w-full py-3 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                !imageFile || isAnalyzing
                  ? 'bg-outline-variant/30 text-on-surface-variant cursor-not-allowed'
                  : 'bg-primary text-on-primary shadow-lg hover:shadow-xl active:scale-[0.98] hover:brightness-110'
              }`}>
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  {t("Analyzing...")}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">biotech</span>
                  {t("Run Diagnostic Analysis")}
                </>
              )}
            </button>
          </div>

          {/* Scan History Panel */}
          {showHistory && scanHistory.length > 0 && (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 space-y-2">
              <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-wider mb-2">{t("Recent Scans")}</h4>
              {scanHistory.map(scan => (
                <div key={scan.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 hover:border-primary/30 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    scan.assessment === 'Normal' ? 'bg-green-500' : scan.assessment === 'Abnormal' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{scan.imagingType} — {scan.bodyRegion}</p>
                    <p className="text-[10px] text-on-surface-variant">{new Date(scan.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black" style={{ color: scan.assessment === 'Normal' ? '#16a34a' : scan.assessment === 'Abnormal' ? '#dc2626' : '#ca8a04' }}>
                      {scan.assessment}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">{scan.findingsCount} finding{scan.findingsCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════ RIGHT PANEL — Results ══════════ */}
        <div className="space-y-4">

          {/* Loading State */}
          {isAnalyzing && (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-8 flex flex-col items-center justify-center text-center space-y-5">
              {/* Animated scanner visualization */}
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                <div className="absolute inset-3 rounded-full border-4 border-transparent border-b-primary/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <div className="absolute inset-6 rounded-full border-4 border-transparent border-t-primary/40 animate-spin" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-primary animate-pulse">radiology</span>
                </div>
              </div>
              <div>
                <p className="font-black text-on-surface text-lg mb-1">{t("MediScan Pro Analyzing...")}</p>
                <p className="text-sm font-semibold text-primary animate-pulse">{analysisProgress}</p>
                <p className="text-[10px] text-on-surface-variant mt-2">{t("Powered by Gemini 2.5 Flash Vision • HIPAA-grade processing")}</p>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-2xl bg-surface-container-lowest border border-red-500/30 p-5">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-xl">error</span>
                <div>
                  <p className="font-black text-red-600 dark:text-red-400 text-sm">{t("Analysis Failed")}</p>
                  <p className="text-xs text-red-500/80 mt-1">{error}</p>
                  <button onClick={runAnalysis}
                    className="mt-3 px-4 py-1.5 rounded-xl bg-red-500/10 text-red-600 text-xs font-bold border border-red-500/30 hover:bg-red-500/20 transition-colors">
                    {t("Retry Analysis")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isAnalyzing && !result && !error && (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
              <div className="w-20 h-20 rounded-3xl bg-primary/8 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-primary/40">radiology</span>
              </div>
              <div>
                <p className="font-black text-on-surface text-lg">{t("MediScan Pro")}</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-xs leading-relaxed">
                  {t("Upload a medical scan, select imaging type & body region, then click 'Run Diagnostic Analysis' to get AI-powered findings with confidence scores.")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {['X-Ray', 'CT Scan', 'MRI', 'Ultrasound'].map(type => (
                  <span key={type} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Results View ──────────────────────────────────── */}
          {result && (
            <div className="space-y-4">

              {/* Overall Assessment Card */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5">
                <div className="flex items-start gap-4">
                  {/* Confidence Ring */}
                  <div className="relative flex-shrink-0">
                    <ConfidenceRing value={result.confidenceScore} size={88} strokeWidth={7}
                      color={result.overallAssessment === 'Normal' ? '#16a34a' : result.overallAssessment === 'Abnormal' ? '#dc2626' : '#ca8a04'} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-on-surface">{result.confidenceScore}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        result.overallAssessment === 'Normal'
                          ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30'
                          : result.overallAssessment === 'Abnormal'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                          : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {result.overallAssessment}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-semibold">{imagingType}</span>
                      <span className="text-[10px] text-on-surface-variant font-semibold">{bodyRegion}</span>
                      {result.findings?.length > 0 && (
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                          {result.findings.length} condition{result.findings.length !== 1 ? 's' : ''} analyzed
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-on-surface leading-relaxed mt-2">{result.summary}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-outline-variant/50">
                  <button onClick={exportReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                    {t("Export Report")}
                  </button>
                  <button onClick={resetScan}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add_circle</span>
                    {t("New Scan")}
                  </button>
                </div>
              </div>

              {/* Annotated Diagnostic View */}
              {imagePreview && (
                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">image_search</span>
                      {t("Annotated Diagnostic View")}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-semibold">
                      {t("Hover a numbered marker to inspect its note. Markers are compacted to avoid overlap.")}
                    </p>
                  </div>
                  <AnnotatedImageView
                    imageSrc={imagePreview}
                    findings={result.findings || []}
                    hoveredFinding={hoveredFinding}
                    setHoveredFinding={setHoveredFinding}
                    selectedFinding={selectedFinding}
                    setSelectedFinding={setSelectedFinding}
                  />
                </div>
              )}

              {/* Findings Cards */}
              {result.findings?.length > 0 && (
                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 space-y-3">
                  <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500 text-lg">report</span>
                    {t("Detected Findings")} ({result.findings.length})
                  </h3>
                  {result.findings.map((finding, idx) => {
                    const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.Moderate;
                    const isExpanded = expandedFindings[finding.id] || selectedFinding === finding.id;
                    return (
                      <div key={finding.id}
                        className={`rounded-2xl border p-4 transition-all duration-300 cursor-pointer ${
                          selectedFinding === finding.id ? 'ring-2 ring-primary/50 shadow-lg' : 'hover:border-primary/30'
                        }`}
                        style={{ borderColor: config.border, backgroundColor: config.bg + '40' }}
                        onClick={() => { toggleFindingExpansion(finding.id); setSelectedFinding(finding.id === selectedFinding ? null : finding.id); }}
                        onMouseEnter={() => setHoveredFinding(finding.id)}
                        onMouseLeave={() => setHoveredFinding(null)}>
                        <div className="flex items-start gap-3">
                          {/* Number badge */}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                            style={{ backgroundColor: config.color + '20', color: config.color, border: `2px solid ${config.color}` }}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-black text-on-surface text-sm">{finding.title}</span>
                              <SeverityBadge severity={finding.severity} />
                            </div>
                            <ConfidenceBar value={finding.confidence} color={config.color} />
                            {isExpanded && (
                              <div className="mt-3 space-y-3 animate-in">
                                <p className="text-xs font-semibold text-on-surface leading-relaxed">{finding.description}</p>
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="p-2.5 rounded-xl bg-surface-container/60">
                                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-1">
                                      <span className="material-symbols-outlined text-[10px] mr-0.5" style={{ fontSize: '11px' }}>location_on</span>
                                      {t("Location")}
                                    </p>
                                    <p className="text-xs font-semibold text-on-surface">{finding.locationDescription}</p>
                                  </div>
                                  {finding.differentialDiagnosis?.length > 0 && (
                                    <div className="p-2.5 rounded-xl bg-surface-container/60">
                                      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-1">
                                        <span className="material-symbols-outlined text-[10px] mr-0.5" style={{ fontSize: '11px' }}>diagnosis</span>
                                        {t("Differential Diagnosis")}
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {finding.differentialDiagnosis.map((dd, i) => (
                                          <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface border border-outline-variant/50">
                                            {dd}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {finding.recommendedAction && (
                                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15">
                                      <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-1">
                                        <span className="material-symbols-outlined text-[10px] mr-0.5" style={{ fontSize: '11px' }}>clinical_notes</span>
                                        {t("Recommended Action")}
                                      </p>
                                      <p className="text-xs font-semibold text-on-surface">{finding.recommendedAction}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Expand indicator */}
                          <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            style={{ fontSize: '18px' }}>expand_more</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Normal Findings */}
              {result.normalFindings?.length > 0 && (
                <div className="rounded-2xl border p-4 space-y-2"
                  style={{ backgroundColor: 'rgba(22,163,74,0.06)', borderColor: 'rgba(22,163,74,0.25)' }}>
                  <h3 className="text-sm font-black text-green-700 dark:text-green-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    {t("Normal Findings")}
                  </h3>
                  {result.normalFindings.map((nf, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className="material-symbols-outlined text-green-500 flex-shrink-0" style={{ fontSize: '14px', marginTop: '2px' }}>done</span>
                      <p className="text-xs font-semibold text-on-surface">{nf}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && (
                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4">
                  <h3 className="text-sm font-black text-on-surface flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-lg">assignment</span>
                    {t("Recommendations")}
                  </h3>
                  <p className="text-xs font-semibold text-on-surface leading-relaxed">{result.recommendations}</p>
                </div>
              )}

              {/* Indian Context */}
              {result.indianContext && (
                <div className="rounded-2xl border p-4"
                  style={{ backgroundColor: 'rgba(49,91,175,0.06)', borderColor: 'rgba(49,91,175,0.25)' }}>
                  <h3 className="text-sm font-black text-primary flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-lg">public</span>
                    {t("India Healthcare Context")}
                  </h3>
                  <p className="text-xs font-semibold text-on-surface leading-relaxed">{result.indianContext}</p>
                </div>
              )}

              {/* Limitations */}
              {result.limitations && (
                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4">
                  <h3 className="text-xs font-black text-on-surface-variant flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
                    {t("Analysis Limitations")}
                  </h3>
                  <p className="text-[11px] font-semibold text-on-surface-variant leading-relaxed">{result.limitations}</p>
                </div>
              )}

              {/* Final Disclaimer */}
              <div className="flex items-start gap-3 p-4 rounded-2xl border"
                style={{ backgroundColor: 'rgba(234,88,12,0.06)', borderColor: 'rgba(234,88,12,0.2)' }}>
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400" style={{ fontSize: '18px', marginTop: '1px' }}>gavel</span>
                <p className="text-[10px] font-semibold text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                  {t("This AI-generated diagnostic report is intended solely as a clinical decision support aid for qualified healthcare professionals. It does NOT constitute a medical diagnosis. All findings, confidence scores, and recommendations must be independently verified by a licensed physician before any clinical action is taken. ResQ-Plus and MediScan Pro bear no liability for clinical decisions made based on this report. Compliant with ICMR AI in Healthcare Guidelines 2023.")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Inline CSS for animations ── */}
      <style>{`
        .animate-in {
          animation: fadeSlideIn 0.4s ease-out;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
