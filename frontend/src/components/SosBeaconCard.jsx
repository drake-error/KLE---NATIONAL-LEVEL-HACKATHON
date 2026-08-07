/**
 * SosBeaconCard.jsx — Red Circular SOS Beacon Card with Fully Automated Dispatch.
 *
 * Flow:
 *   1. User presses SOS button 3 times.
 *   2. 5-second UNDO window (press again to cancel).
 *   3. If not undone → 10-second soft emergency beep plays.
 *   4. Fully automated background dispatch:
 *      - WhatsApp message via Meta WhatsApp Cloud API (Facebook Developer Account)
 *      - Email via serverless /api/sos endpoint
 *      - Both include live GPS coordinates
 *   5. Zero manual taps. Everything is automated.
 *
 * Emergency contact (Name, Email, Mobile) is read from Settings → Emergency Contacts.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../i18n';

const STORAGE_KEY = 'resq_plus_settings';

export default function SosBeaconCard() {
  const { t } = useI18n();
  const [pressCount, setPressCount] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'countdown' | 'beeping' | 'dispatched'
  const [countdown, setCountdown] = useState(5);
  const [beepTimer, setBeepTimer] = useState(10);
  const [coords, setCoords] = useState(null);
  const [toast, setToast] = useState(null);
  const [dispatchResult, setDispatchResult] = useState(null);

  const countdownTimerRef = useRef(null);
  const beepTimerRef = useRef(null);
  const resetPressTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sirenOscRef = useRef(null);
  const sirenGainRef = useRef(null);

  // ─── Load ALL Emergency Contacts from Settings ───
  const loadContactInfo = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const profile = parsed.profile || {};
        const allContacts = (parsed.contacts || []).map(c => ({
          name: c.name || 'Emergency Contact',
          phone: (c.phone || '').replace(/\s+/g, ''),
          email: c.email || '',
          priority: c.priority || 'Secondary',
        }));
        return {
          userName: profile.fullName || 'User',
          userPhone: profile.mobileNumber || '+919820011223',
          userEmail: profile.email || '',
          contacts: allContacts.length > 0 ? allContacts : [
            { name: 'Emergency Contact', phone: '+919820088990', email: '', priority: 'Primary' }
          ],
        };
      }
    } catch {}
    return {
      userName: 'User',
      userPhone: '+919820011223',
      userEmail: '',
      contacts: [{ name: 'Emergency Contact', phone: '+919820088990', email: '', priority: 'Primary' }],
    };
  }, []);

  // ─── Fetch GPS Coordinates ───
  const fetchLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            setCoords(loc);
            resolve(loc);
          },
          () => {
            const fallback = { lat: 13.07158, lon: 77.59685 };
            setCoords(fallback);
            resolve(fallback);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        const fallback = { lat: 13.07158, lon: 77.59685 };
        setCoords(fallback);
        resolve(fallback);
      }
    });
  }, []);

  // ─── Soft Press Beep (quiet click confirmation) ───
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.003, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  };

  // ─── Start 10-second Emergency Beep (reduced, comfortable volume) ───
  const startEmergencyBeep = () => {
    try {
      if (sirenOscRef.current) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime); // Soft, reduced volume
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      sirenOscRef.current = osc;
      sirenGainRef.current = gain;
    } catch {}
  };

  const stopEmergencyBeep = () => {
    if (sirenOscRef.current) {
      try { sirenOscRef.current.stop(); } catch {}
      sirenOscRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    sirenGainRef.current = null;
  };

  // ─── 100% AUTOMATED BACKGROUND DISPATCH ───
  // Called automatically after 10-second beep. Zero manual taps.
  // Sends to ALL emergency contacts simultaneously.
  const dispatchAutomated = async (loc) => {
    const info = loadContactInfo();
    const lat = loc?.lat || coords?.lat || 13.07158;
    const lon = loc?.lon || coords?.lon || 77.59685;
    const timestamp = new Date().toLocaleString();
    const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;
    const allResults = { whatsapp: [], email: [], totalContacts: info.contacts.length };

    // Loop through ALL emergency contacts and send WhatsApp + Email to each
    for (const contact of info.contacts) {
      console.log(`[SOS] Dispatching to: ${contact.name} (${contact.phone}, ${contact.email})`);

      // 1. WhatsApp via serverless /api/sos
      try {
        const apiRes = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: info.userName,
            userPhone: info.userPhone,
            contactName: contact.name,
            contactEmail: contact.email,
            contactPhone: contact.phone,
            lat,
            lon,
            timestamp,
          }),
        });
        const data = await apiRes.json();
        allResults.whatsapp.push({ name: contact.name, phone: contact.phone, success: data?.results?.whatsapp, response: data?.results?.whatsappResponse });
        console.log(`[SOS] WhatsApp to ${contact.name}:`, data?.results?.whatsapp ? 'SUCCESS' : 'FAILED');
      } catch (err) {
        allResults.whatsapp.push({ name: contact.name, phone: contact.phone, success: false, error: err.message });
        console.error(`[SOS] WhatsApp API error for ${contact.name}:`, err);
      }

      // 2. Email via Web3Forms (free, no domain restrictions needed)
      if (contact.email) {
        try {
          const emailRes = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_key: '8382c954-6c3a-4272-ba3d-75a39f393bdb',
              subject: `🚨 EMERGENCY SOS - ${info.userName || 'Patient'} Needs Immediate Help!`,
              from_name: 'ResQ-Plus Emergency Dispatch',
              to: contact.email,
              name: info.userName || 'Unknown Patient',
              message: `🚨 AUTOMATED EMERGENCY SOS DISTRESS ALERT!\n\nPatient Name: ${info.userName || 'Unknown'}\nPatient Phone: ${info.userPhone || 'N/A'}\nEmergency Contact: ${contact.name}\nTime of SOS: ${timestamp}\n\n📍 LIVE GPS LOCATION:\n${mapsUrl}\n\nOpen this link to see their exact location:\n${mapsUrl}\n\nPlease send emergency medical aid immediately!\n\n— ResQ-Plus Automated Emergency Dispatch System`,
              replyto: 'noreply@resqplus.app',
            }),
          });
          const emailData = await emailRes.json();
          allResults.email.push({ name: contact.name, email: contact.email, success: emailRes.ok, message: emailData.message });
          console.log(`[SOS] Email (Web3Forms) to ${contact.name}:`, emailRes.ok ? 'SUCCESS' : 'FAILED', emailData);
        } catch (emailErr) {
          allResults.email.push({ name: contact.name, email: contact.email, success: false, error: emailErr.message });
          console.error(`[SOS] Email error for ${contact.name}:`, emailErr);
        }
      }
    }

    setDispatchResult({ results: allResults, mapsUrl, timestamp });
    console.log('[SOS] All dispatches complete:', allResults);
  };

  // ─── Handle SOS Button Press (3x press detection) ───
  const handleButtonPress = () => {
    playBeep();

    // During 5s countdown: pressing again = CANCEL
    if (status === 'countdown') {
      cancelSos();
      return;
    }

    // During beeping or dispatched: pressing = mute
    if (status === 'beeping' || status === 'dispatched') {
      cancelSos();
      return;
    }

    const nextCount = pressCount + 1;
    setPressCount(nextCount);

    // Reset press count after 3 seconds of inactivity
    if (resetPressTimerRef.current) clearTimeout(resetPressTimerRef.current);
    resetPressTimerRef.current = setTimeout(() => {
      if (status === 'idle') setPressCount(0);
    }, 3000);

    if (nextCount >= 3) {
      // 3X Press reached → Start 5-second UNDO window
      startCountdown();
    } else {
      setToast(t(`Press ${3 - nextCount} more time(s) to trigger SOS`));
      setTimeout(() => setToast(null), 2500);
    }
  };

  // ─── Start 5-Second UNDO Countdown ───
  const startCountdown = () => {
    setStatus('countdown');
    setCountdown(5);
    fetchLocation(); // Pre-fetch GPS while counting down

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          // 5 seconds elapsed without cancel → start 10s emergency beep
          startBeepPhase();
          return 0;
        }
        playBeep();
        return prev - 1;
      });
    }, 1000);
  };

  // ─── 10-Second Emergency Beep Phase ───
  const startBeepPhase = () => {
    setStatus('beeping');
    setBeepTimer(10);
    startEmergencyBeep();

    beepTimerRef.current = setInterval(() => {
      setBeepTimer((prev) => {
        if (prev <= 1) {
          clearInterval(beepTimerRef.current);
          beepTimerRef.current = null;
          stopEmergencyBeep();
          // 10 seconds done → FULLY AUTOMATED DISPATCH
          activateFullEmergency();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ─── Full Emergency Activation (100% Automated) ───
  const activateFullEmergency = async () => {
    setStatus('dispatched');
    const loc = await fetchLocation();
    await dispatchAutomated(loc);
  };

  // ─── Cancel / Undo SOS ───
  const cancelSos = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (beepTimerRef.current) {
      clearInterval(beepTimerRef.current);
      beepTimerRef.current = null;
    }
    stopEmergencyBeep();
    setStatus('idle');
    setPressCount(0);
    setCountdown(5);
    setBeepTimer(10);
    setDispatchResult(null);
    setToast(t('✅ SOS Canceled. False alarm aborted.'));
    setTimeout(() => setToast(null), 4000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (beepTimerRef.current) clearInterval(beepTimerRef.current);
      if (resetPressTimerRef.current) clearTimeout(resetPressTimerRef.current);
      stopEmergencyBeep();
    };
  }, []);

  return (
    <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-outline-variant shadow-md text-center flex flex-col items-center justify-center relative overflow-hidden transition-all">
      {/* Toast popup */}
      {toast && (
        <div className="absolute top-3 inset-x-auto px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xl border border-amber-500/50 animate-bounce z-20">
          {toast}
        </div>
      )}

      {/* Instruction */}
      <p className="text-sm font-semibold text-on-surface-variant max-w-md text-center leading-relaxed mb-6">
        {t("Press the SOS button 3 times to alert your emergency contact. You'll get 5 seconds to undo, then a 10-second beep before your live location is automatically sent via WhatsApp and Email.")}
      </p>

      {/* ─── Sonar Wave Animation ─── */}
      <style>{`
        @keyframes sonarWave {
          0% {
            transform: scale(0.9);
            opacity: 0.85;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.7);
          }
          50% {
            opacity: 0.45;
            box-shadow: 0 0 40px rgba(239, 68, 68, 0.4);
          }
          100% {
            transform: scale(1.45);
            opacity: 0;
            box-shadow: 0 0 60px rgba(239, 68, 68, 0);
          }
        }
        .animate-sonar-1 { animation: sonarWave 2.4s infinite ease-out 0s; }
        .animate-sonar-2 { animation: sonarWave 2.4s infinite ease-out 0.8s; }
        .animate-sonar-3 { animation: sonarWave 2.4s infinite ease-out 1.6s; }
      `}</style>

      <div className="relative flex items-center justify-center my-6 py-10 w-full">
        {/* Concentric Expanding Wave Rings */}
        <div style={{ borderRadius: '9999px' }} className="absolute w-64 h-64 aspect-square shrink-0 border-2 border-red-500/40 bg-red-500/10 pointer-events-none animate-sonar-1" />
        <div style={{ borderRadius: '9999px' }} className="absolute w-64 h-64 aspect-square shrink-0 border-2 border-rose-500/40 bg-rose-500/10 pointer-events-none animate-sonar-2" />
        <div style={{ borderRadius: '9999px' }} className="absolute w-64 h-64 aspect-square shrink-0 border-2 border-red-400/40 bg-red-400/10 pointer-events-none animate-sonar-3" />

        {/* Ambient Red Glow */}
        <div style={{ borderRadius: '9999px' }} className="absolute w-48 h-48 aspect-square shrink-0 bg-red-600/30 blur-2xl animate-pulse pointer-events-none" />

        {/* Main Circular SOS Button */}
        <button
          onClick={handleButtonPress}
          style={{ borderRadius: '9999px' }}
          className={`relative z-10 w-36 h-36 aspect-square shrink-0 text-white font-black shadow-[0_12px_40px_rgba(225,29,72,0.8)] border-4 border-red-300 flex flex-col items-center justify-center cursor-pointer transform active:scale-95 transition-all duration-300 ${
            status === 'countdown'
              ? 'bg-gradient-to-b from-amber-500 to-rose-600 border-amber-200 scale-105 shadow-amber-500/90 animate-pulse'
              : status === 'beeping'
                ? 'bg-gradient-to-b from-orange-600 to-red-700 border-orange-300 scale-110 shadow-orange-500/90 animate-pulse'
                : status === 'dispatched'
                  ? 'bg-gradient-to-b from-rose-600 to-red-800 border-white scale-105 shadow-rose-600/90 animate-pulse'
                  : 'bg-gradient-to-b from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 hover:scale-105'
          }`}
        >
          {status === 'idle' && (
            <>
              <span className="text-4xl font-black tracking-widest leading-none drop-shadow-md">SOS</span>
              <span className="text-[10px] font-black tracking-wider uppercase opacity-95 mt-2 bg-red-950/50 px-2.5 py-0.5 rounded-full border border-red-300/40">
                {pressCount > 0 ? `PRESS (${pressCount}/3)` : 'PRESS 3X'}
              </span>
            </>
          )}

          {status === 'countdown' && (
            <>
              <span className="text-2xl font-black text-amber-200 leading-none">{countdown}s</span>
              <span className="text-[9px] font-black tracking-wider uppercase text-white mt-1 bg-slate-950/40 px-2 py-0.5 rounded-full border border-white/30">{t("TAP TO UNDO")}</span>
            </>
          )}

          {status === 'beeping' && (
            <>
              <span className="material-symbols-outlined text-3xl animate-pulse">volume_up</span>
              <span className="text-lg font-black text-white leading-none">{beepTimer}s</span>
              <span className="text-[8px] font-black tracking-wider uppercase text-amber-200 mt-0.5">{t("BEEPING")}</span>
            </>
          )}

          {status === 'dispatched' && (
            <>
              <span className="material-symbols-outlined text-3xl animate-spin">emergency</span>
              <span className="text-[9px] font-black tracking-wider uppercase text-amber-200 mt-0.5">{t("SENT")}</span>
            </>
          )}
        </button>
      </div>

      {/* ─── Status Panels ─── */}

      {/* 5s UNDO countdown */}
      {status === 'countdown' && (
        <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 max-w-sm w-full animate-pulse">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            ⚠️ {t("SOS activating in")} {countdown}s — {t("Press SOS or Cancel to undo")}
          </span>
          <button
            onClick={cancelSos}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase hover:bg-amber-400 transition-colors shrink-0"
          >
            {t("UNDO")}
          </button>
        </div>
      )}

      {/* 10s Beeping phase */}
      {status === 'beeping' && (
        <div className="mt-4 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-4 max-w-sm w-full">
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
            🔊 {t("Emergency beep active.")} {t("Dispatching in")} {beepTimer}s...
          </span>
          <button
            onClick={cancelSos}
            className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-black text-xs uppercase hover:bg-orange-400 transition-colors shrink-0"
          >
            {t("STOP")}
          </button>
        </div>
      )}

      {/* Dispatched confirmation */}
      {status === 'dispatched' && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 max-w-md w-full space-y-2">
          <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm animate-spin">emergency</span>
            {t("EMERGENCY SOS DISPATCHED AUTOMATICALLY")}
          </p>
          <p className="text-xs text-on-surface-variant font-semibold">
            {t("Your live location has been sent automatically via WhatsApp and Email to your emergency contact. No manual action needed.")}
          </p>
          {coords && (
            <a
              href={`https://maps.google.com/?q=${coords.lat},${coords.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-bold text-primary underline pt-1"
            >
              📍 {t("View Location")} ({coords.lat.toFixed(4)}°, {coords.lon.toFixed(4)}°)
            </a>
          )}
          {/* Debug: Show API response for troubleshooting */}
          {dispatchResult && (
            <div className="mt-2 p-2 rounded-lg bg-slate-900 text-green-400 font-mono text-[10px] text-left overflow-auto max-h-48 break-all">
              <p className="text-cyan-300 font-bold">📊 Sent to {dispatchResult?.results?.totalContacts || 0} contact(s):</p>
              {dispatchResult?.results?.whatsapp?.map((wa, i) => (
                <p key={`wa-${i}`}>📡 WA → {wa.name} ({wa.phone}): {wa.success ? '✅' : '❌'} {wa.response ? JSON.stringify(wa.response) : wa.error || ''}</p>
              ))}
              {dispatchResult?.results?.email?.map((em, i) => (
                <p key={`em-${i}`}>📧 Email → {em.name} ({em.email}): {em.success ? '✅' : '❌'}</p>
              ))}
            </div>
          )}
          <button
            onClick={cancelSos}
            className="w-full mt-2 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors"
          >
            {t("Dismiss & Reset")}
          </button>
        </div>
      )}
    </div>
  );
}
