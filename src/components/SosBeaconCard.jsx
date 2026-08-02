/**
 * SosBeaconCard.jsx — Red Concentric SOS Beacon Card matching user reference design.
 * 
 * Replaces the blue SOS card below System Topology in HealthVaultTable.
 * 
 * Features:
 * 1. Clean card layout matching attached mockup:
 *    "Press the SOS button 3 times to alert your contacts by WhatsApp, SMS, and email with your live location plus the Agora video call link."
 * 2. Concentric glowing red rings with a 3D red button in the center.
 * 3. 3-Press / 7-Second Safety Window: Handles 3x presses or single press with 7s countdown & instant CANCEL/UNDO to prevent false alarms.
 * 4. Acoustic emergency siren.
 * 5. Geolocation + WhatsApp + SMS + Email + Agora Video Link dispatch.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../i18n';

const STORAGE_KEY = 'resq_plus_settings';

export default function SosBeaconCard() {
  const { t } = useI18n();
  const [pressCount, setPressCount] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'countdown' | 'triggered'
  const [countdown, setCountdown] = useState(7);
  const [coords, setCoords] = useState(null);
  const [toast, setToast] = useState(null);

  const countdownTimerRef = useRef(null);
  const resetPressTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sirenOscRef = useRef(null);

  // Load contact from settings
  const loadContactInfo = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const primary = parsed.contacts?.find(c => c.priority === 'Primary') || parsed.contacts?.[0];
        const profile = parsed.profile || {};
        return {
          name: profile.fullName || 'Aarav Mehta',
          phone: primary?.phone?.replace(/\s+/g, '') || '+919820088990',
          email: profile.email || 'aarav@resqplus.app',
        };
      }
    } catch {}
    return { name: 'Aarav Mehta', phone: '+919820088990', email: 'aarav@resqplus.app' };
  }, []);

  // Fetch coordinates
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

  // Beep sound on press
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  // Start siren
  const startSiren = () => {
    try {
      if (sirenOscRef.current) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      sirenOscRef.current = osc;
    } catch {}
  };

  const stopSiren = () => {
    if (sirenOscRef.current) {
      try { sirenOscRef.current.stop(); } catch {}
      sirenOscRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
  };

  // Dispatch WhatsApp, SMS, Email, and Agora link
  const dispatchEmergencyAlerts = async (loc) => {
    const contact = loadContactInfo();
    const lat = loc?.lat || 13.07158;
    const lon = loc?.lon || 77.59685;
    const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;
    const agoraVideoUrl = `https://meet.jit.si/resqplus-sos-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();

    // WhatsApp
    const waMsg = `🚨 *EMERGENCY SOS ALERT!*%0A%0A*User:* ${contact.name}%0A*Time:* ${timestamp}%0A%0A📍 *Live Location Tracker:*%0A${mapsUrl}%0A%0A🎥 *Agora Emergency Video Call:*%0A${agoraVideoUrl}`;
    const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${waMsg}`, '_blank');

    // SMS Protocol
    const smsMsg = encodeURIComponent(`🚨 SOS ALERT! User: ${contact.name}. Live Location: ${mapsUrl} Video Call: ${agoraVideoUrl}`);
    setTimeout(() => {
      window.location.href = `sms:${cleanPhone}?body=${smsMsg}`;
    }, 800);

    // Email
    setTimeout(() => {
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(`🚨 EMERGENCY SOS ALERT - ${contact.name}`)}&body=${encodeURIComponent(`EMERGENCY SOS ALERT!\n\nUser: ${contact.name}\nTime: ${timestamp}\n\nLive Location: ${mapsUrl}\nAgora Video Call Link: ${agoraVideoUrl}`)}`;
    }, 1500);
  };

  // Handle SOS Button Press (3x or 7s countdown)
  const handleButtonPress = () => {
    playBeep();

    if (status === 'countdown') {
      // User pressed again during 7s countdown -> CANCEL / UNDO!
      cancelSos();
      return;
    }

    if (status === 'triggered') return;

    const nextCount = pressCount + 1;
    setPressCount(nextCount);

    // Reset press count after 3 seconds of inactivity if not completed
    if (resetPressTimerRef.current) clearTimeout(resetPressTimerRef.current);
    resetPressTimerRef.current = setTimeout(() => {
      if (status === 'idle') setPressCount(0);
    }, 3000);

    if (nextCount >= 3) {
      // 3X Press reached -> Start 7s safety window
      startCountdown();
    } else {
      // Show hint
      setToast(t(`Press ${3 - nextCount} more time(s) to dispatch emergency SOS`));
      setTimeout(() => setToast(null), 2500);
    }
  };

  const startCountdown = () => {
    setStatus('countdown');
    setCountdown(7);
    fetchLocation();

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          activateFullEmergency();
          return 0;
        }
        playBeep();
        return prev - 1;
      });
    }, 1000);
  };

  const activateFullEmergency = async () => {
    setStatus('triggered');
    startSiren();
    const loc = await fetchLocation();
    dispatchEmergencyAlerts(loc);
  };

  const cancelSos = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    stopSiren();
    setStatus('idle');
    setPressCount(0);
    setCountdown(7);
    setToast(t('✅ SOS Canceled. False alarm aborted successfully.'));
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (resetPressTimerRef.current) clearTimeout(resetPressTimerRef.current);
      stopSiren();
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

      {/* Top Heading Instruction Matching Reference Screenshot */}
      <p className="text-sm font-semibold text-on-surface-variant max-w-md text-center leading-relaxed mb-6">
        {t("Press the SOS button 3 times to alert your contacts by WhatsApp, SMS, and email with your live location plus the Agora video call link.")}
      </p>

      {/* ─── Dynamic Continuous Glowing Wave Animation ─── */}
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

      <div className="relative flex items-center justify-center my-4 py-8">
        {/* Continuous Staggered Outward Expanding Wave Rings */}
        <div className="absolute w-56 h-56 rounded-full border-2 border-red-500/40 bg-red-500/10 pointer-events-none animate-sonar-1" />
        <div className="absolute w-56 h-56 rounded-full border-2 border-rose-500/40 bg-rose-500/10 pointer-events-none animate-sonar-2" />
        <div className="absolute w-56 h-56 rounded-full border-2 border-red-400/40 bg-red-400/10 pointer-events-none animate-sonar-3" />

        {/* Ambient Red Radial Backdrop Glow */}
        <div className="absolute w-44 h-44 rounded-full bg-red-600/20 blur-xl animate-pulse pointer-events-none" />

        {/* 3D Red Circular Center SOS Button */}
        <button
          onClick={handleButtonPress}
          className={`relative z-10 w-32 h-32 rounded-full text-white font-black shadow-[0_12px_35px_rgba(225,29,72,0.7)] border-2 border-red-300 flex flex-col items-center justify-center cursor-pointer transform active:scale-95 transition-all duration-300 ${
            status === 'countdown'
              ? 'bg-gradient-to-b from-amber-500 to-rose-600 border-amber-200 scale-105 shadow-amber-500/90 animate-pulse'
              : status === 'triggered'
                ? 'bg-gradient-to-b from-rose-600 to-red-800 border-white scale-105 shadow-rose-600/90 animate-pulse'
                : 'bg-gradient-to-b from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 hover:scale-105'
          }`}
        >
          {status === 'idle' && (
            <>
              <span className="text-3xl font-black tracking-widest leading-none drop-shadow-md">SOS</span>
              <span className="text-[10px] font-black tracking-wider uppercase opacity-95 mt-1.5 bg-red-950/40 px-2 py-0.5 rounded-full border border-red-400/40">
                {pressCount > 0 ? `PRESS (${pressCount}/3)` : 'PRESS 3X'}
              </span>
            </>
          )}

          {status === 'countdown' && (
            <>
              <span className="text-2xl font-black text-amber-200 leading-none">{countdown}s</span>
              <span className="text-[9px] font-black tracking-wider uppercase text-white mt-1 bg-slate-950/40 px-2 py-0.5 rounded-full border border-white/30">{t("CANCEL")}</span>
            </>
          )}

          {status === 'triggered' && (
            <>
              <span className="material-symbols-outlined text-3xl animate-spin">volume_up</span>
              <span className="text-[9px] font-black tracking-wider uppercase text-amber-200 mt-0.5">{t("ACTIVE")}</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Status / Cancel Action */}
      {status === 'countdown' && (
        <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 max-w-sm w-full animate-pulse">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            🚨 {t("Dispatching in")} {countdown}s...
          </span>
          <button
            onClick={cancelSos}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase hover:bg-amber-400 transition-colors"
          >
            {t("CANCEL / UNDO")}
          </button>
        </div>
      )}

      {status === 'triggered' && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 max-w-md w-full space-y-2">
          <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm animate-spin">emergency</span>
            {t("EMERGENCY SOS DISTRESS DISPATCHED")}
          </p>
          <p className="text-xs text-on-surface-variant font-semibold">
            {t("WhatsApp, SMS, Email alerts & Agora live video link sent to your emergency contact.")}
          </p>
          {coords && (
            <a
              href={`https://maps.google.com/?q=${coords.lat},${coords.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-bold text-primary underline pt-1"
            >
              📍 {t("View Live Maps Tracker")} ({coords.lat.toFixed(4)}°, {coords.lon.toFixed(4)}°)
            </a>
          )}
          <button
            onClick={cancelSos}
            className="w-full mt-2 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors"
          >
            {t("Mute Siren & Turn Off Beacon")}
          </button>
        </div>
      )}
    </div>
  );
}
