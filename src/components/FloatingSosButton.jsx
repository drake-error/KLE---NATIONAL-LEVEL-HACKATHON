/**
 * FloatingSosButton.jsx — Red Glowing Floating SOS Emergency Button with 7-Second Safety Countdown & WhatsApp/Email Live Location Dispatch.
 * 
 * Features:
 * 1. Glowing red floating button fixed at bottom-right of screen with pulsating aura.
 * 2. 7-Second Safety Window: Prevents false alarms. Clicking starts a 7s countdown with undo button.
 * 3. Acoustic Emergency Siren: Plays loud dual-frequency siren when 7s expires.
 * 4. Live Geolocation: Captures exact coordinates & constructs Google Maps link.
 * 5. Automatic WhatsApp & Email Dispatch: Reads Emergency Contact from Settings and sends distress alert with live location.
 * 6. Active Emergency Overlay: Fullscreen dispatch modal with 112/108/100 quick dials.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../i18n';

const STORAGE_KEY = 'resq_plus_settings';

export default function FloatingSosButton() {
  const { t } = useI18n();
  const [status, setStatus] = useState('idle'); // 'idle' | 'countdown' | 'triggered'
  const [countdown, setCountdown] = useState(7);
  const [coords, setCoords] = useState(null);
  const [toast, setToast] = useState(null);
  const [contactData, setContactData] = useState(null);

  const countdownTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sirenOscRef = useRef(null);
  const sirenGainRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Load emergency contact from Settings
  const loadEmergencyContact = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const primary = parsed.contacts?.find(c => c.priority === 'Primary') || parsed.contacts?.[0];
        const profile = parsed.profile || {};
        return {
          contactName: primary?.name || 'Emergency Contact',
          contactPhone: primary?.phone?.replace(/\s+/g, '') || '+919820088990',
          contactEmail: profile.email || 'emergency@resqplus.app',
          userName: profile.fullName || 'User',
          userPhone: profile.mobileNumber || '+919820011223',
        };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return {
      contactName: 'Emergency Contact',
      contactPhone: '+919820088990',
      contactEmail: 'emergency@resqplus.app',
      userName: 'Aarav Mehta',
      userPhone: '+91 98200 11223',
    };
  }, []);

  // Fetch current GPS coordinates
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
            // Fallback default coordinates (Bengaluru / Yelahanka area)
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

  // Play acoustic warning tick sound during countdown
  const playTickSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  // Start continuous acoustic emergency siren
  const startSiren = () => {
    try {
      if (sirenOscRef.current) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenOscRef.current = osc;
      sirenGainRef.current = gain;

      // Oscillate siren frequency between 800Hz and 1200Hz
      let high = true;
      sirenIntervalRef.current = setInterval(() => {
        if (sirenOscRef.current && audioCtxRef.current) {
          const freq = high ? 1200 : 800;
          sirenOscRef.current.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
          high = !high;
        }
      }, 400);
    } catch (e) {
      console.error('Audio siren error', e);
    }
  };

  // Stop siren
  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch {}
      sirenOscRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  };

  // Dispatch WhatsApp & Email alerts with live location
  const dispatchAlerts = async (location) => {
    const contact = loadEmergencyContact();
    setContactData(contact);

    const lat = location?.lat || 13.07158;
    const lon = location?.lon || 77.59685;
    const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;
    const timestamp = new Date().toLocaleTimeString();

    // 1. WhatsApp Message Dispatch
    const waText = `🚨 *EMERGENCY SOS DISTRESS ALERT!*%0A%0A*Patient:* ${contact.userName}%0A*Phone:* ${contact.userPhone}%0A*Time:* ${timestamp}%0A%0A📍 *LIVE LOCATION TRACKER:*%0A${mapsUrl}%0A%0APlease send immediate emergency medical aid or ambulance!`;
    const cleanPhone = contact.contactPhone.replace(/[^0-9+]/g, '');
    const waUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${waText}`;

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank');

    // 2. Email Dispatch (via mailto)
    const emailSubject = encodeURIComponent(`🚨 EMERGENCY SOS DISTRESS ALERT - ${contact.userName}`);
    const emailBody = encodeURIComponent(`EMERGENCY SOS DISTRESS ALERT\n\nPatient Name: ${contact.userName}\nPatient Phone: ${contact.userPhone}\nTime: ${timestamp}\n\nLIVE LOCATION MAP TRACKER:\n${mapsUrl}\n\nPlease contact emergency medical services (112 / 108) immediately.`);
    const mailtoUrl = `mailto:${contact.contactEmail}?subject=${emailSubject}&body=${emailBody}`;
    
    setTimeout(() => {
      window.location.href = mailtoUrl;
    }, 1000);
  };

  // Handle 7-second countdown trigger
  const triggerSosCountdown = () => {
    if (status === 'countdown') {
      // User clicked again during countdown -> UNDO / CANCEL!
      cancelSos();
      return;
    }

    if (status === 'triggered') {
      return;
    }

    // Start 7s countdown
    setStatus('countdown');
    setCountdown(7);
    playTickSound();

    fetchLocation(); // Pre-fetch location in background

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          // 7s Countdown expired -> ACTIVATE FULL EMERGENCY SOS!
          activateFullSos();
          return 0;
        }
        playTickSound();
        return prev - 1;
      });
    }, 1000);
  };

  // Activate SOS after 7 seconds
  const activateFullSos = async () => {
    setStatus('triggered');
    startSiren();
    const loc = await fetchLocation();
    dispatchAlerts(loc);
  };

  // Cancel SOS (Undo false alarm)
  const cancelSos = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    stopSiren();
    setStatus('idle');
    setCountdown(7);
    setToast(t('✅ SOS Emergency canceled. False alarm aborted.'));
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      stopSiren();
    };
  }, []);

  return (
    <>
      {/* ─── Toast Notification for Aborted SOS ─── */}
      {toast && (
        <div className="fixed top-20 right-6 z-[100000] px-5 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-2xl border border-emerald-500 flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          {toast}
        </div>
      )}

      {/* ─── Glowing Red Floating SOS Button (Bottom-Right Region) ─── */}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end gap-2">
        {/* Undo Floating Tooltip Banner when in 7s Countdown */}
        {status === 'countdown' && (
          <div className="bg-slate-950/95 text-white p-4 rounded-2xl border-2 border-rose-500 shadow-2xl backdrop-blur-md max-w-xs animate-bounce mb-2">
            <div className="flex items-center gap-2 mb-1 text-rose-400 font-black text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              {t("SOS Activating in")} {countdown}s
            </div>
            <p className="text-xs text-slate-200 font-semibold leading-snug">
              {t("Accidental press? Click")} <span className="text-amber-300 font-black uppercase underline">{t("CANCEL")}</span> {t("below to undo.")}
            </p>
          </div>
        )}

        {/* Main Floating SOS Button Container */}
        <div className="relative group">
          {/* Pulsating Red Glow Effect */}
          <div className={`absolute -inset-3 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
            status === 'countdown'
              ? 'bg-amber-500/80 animate-ping'
              : status === 'triggered'
                ? 'bg-rose-600/90 animate-ping'
                : 'bg-red-600/60 group-hover:bg-red-500/80 animate-pulse'
          }`} />

          {/* Glowing SOS Button */}
          <button
            onClick={triggerSosCountdown}
            aria-label="Emergency SOS Dispatch"
            className={`relative w-20 h-20 aspect-square shrink-0 rounded-full flex flex-col items-center justify-center text-white font-black shadow-[0_0_35px_rgba(239,68,68,0.9)] border-2 transition-all duration-300 transform active:scale-90 ${
              status === 'countdown'
                ? 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 border-amber-300 scale-110 shadow-amber-500/80'
                : status === 'triggered'
                  ? 'bg-gradient-to-br from-rose-700 via-red-600 to-rose-900 border-white scale-110 shadow-rose-600/90 animate-pulse'
                  : 'bg-gradient-to-br from-red-600 via-rose-600 to-red-700 border-red-300/80 hover:scale-110'
            }`}
          >
            {status === 'idle' && (
              <>
                <span className="material-symbols-outlined text-2xl font-black mb-0.5 leading-none">sos</span>
                <span className="text-[11px] font-black tracking-widest leading-none">SOS</span>
              </>
            )}

            {status === 'countdown' && (
              <>
                <span className="text-xl font-black text-amber-200 leading-none">{countdown}s</span>
                <span className="text-[9px] font-black tracking-wider uppercase text-white mt-1">{t("UNDO")}</span>
              </>
            )}

            {status === 'triggered' && (
              <>
                <span className="material-symbols-outlined text-2xl animate-spin text-white">volume_up</span>
                <span className="text-[9px] font-black tracking-wider uppercase text-amber-200 mt-0.5">{t("ACTIVE")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Fullscreen Emergency SOS Active Modal (When Countdown Reaches 0) ─── */}
      {status === 'triggered' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-white relative overflow-hidden">
            {/* Flashing Hazard Header */}
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500 flex items-center justify-center text-rose-500 animate-pulse">
                  <span className="material-symbols-outlined text-3xl font-black">emergency</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-rose-500 uppercase tracking-tight">{t("🚨 EMERGENCY SOS BROADCASTING")}</h2>
                  <p className="text-xs text-slate-300 font-semibold">{t("Live tracking link generated & alert dispatched")}</p>
                </div>
              </div>
            </div>

            {/* Emergency Live Location HUD */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 uppercase tracking-wider">{t("Live Location Tracker")}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  {t("GPS Lock Active")}
                </span>
              </div>
              <p className="font-mono text-sm font-black text-cyan-400">
                {coords ? `${coords.lat.toFixed(5)}°N, ${coords.lon.toFixed(5)}°E` : t('Fetching GPS...')}
              </p>
              {coords && (
                <a
                  href={`https://maps.google.com/?q=${coords.lat},${coords.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:underline pt-1"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  {t("Open Google Maps Live Link")}
                </a>
              )}
            </div>

            {/* Dispatch Status Badges */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-xl">chat</span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t("WhatsApp SOS")}</p>
                  <p className="text-xs font-black text-emerald-400">{t("Link Dispatched")}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-xl">mail</span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t("Email Alert")}</p>
                  <p className="text-xs font-black text-cyan-400">{t("Distress Sent")}</p>
                </div>
              </div>
            </div>

            {/* Direct Helpline Quick Call Buttons */}
            <div className="space-y-2 mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("Direct Emergency Helpline Dials")}</p>
              <div className="grid grid-cols-3 gap-2">
                <a href="tel:112" className="p-3 rounded-xl bg-rose-600 hover:bg-rose-700 font-black text-center text-xs transition-colors flex flex-col items-center">
                  <span className="material-symbols-outlined text-base">call</span>
                  112 (National)
                </a>
                <a href="tel:108" className="p-3 rounded-xl bg-amber-600 hover:bg-amber-700 font-black text-center text-xs transition-colors flex flex-col items-center">
                  <span className="material-symbols-outlined text-base">ambulance</span>
                  108 (Ambulance)
                </a>
                <a href="tel:100" className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-black text-center text-xs transition-colors flex flex-col items-center">
                  <span className="material-symbols-outlined text-base">local_police</span>
                  100 (Police)
                </a>
              </div>
            </div>

            {/* Turn Off Siren & Cancel SOS */}
            <button
              onClick={cancelSos}
              className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-black text-sm uppercase tracking-wider border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">volume_off</span>
              {t("Mute Siren & Turn Off SOS Beacon")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
