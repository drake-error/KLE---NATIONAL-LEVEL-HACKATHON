/**
 * RemindersPanel.jsx — Module 5: Medicine Reminders & Parental Dashboard.
 * 
 * Features:
 * - Chat-driven command parser for natural language reminder creation
 * - Web Notifications API for timed alerts
 * - Parental monitoring log: taken/missed/snoozed
 * - Weekly compliance chart
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../../i18n';
import { useHealthAgent } from '../../lib/healthAgentStore';
import { chatCompletion, isApiKeyConfigured } from '../../lib/geminiClient';

const REMINDER_PARSE_PROMPT = `You are a medicine reminder parser. Extract reminder details from the user's natural language command.

Return a valid JSON object:
{
  "medicineName": "Name of the medicine",
  "personName": "Who should take it (e.g. 'dad', 'mom', 'me')",
  "time": "HH:MM in 24-hour format",
  "frequency": "daily" or "twice_daily" or "thrice_daily" or "weekly",
  "notes": "Any additional instructions"
}

Examples:
- "Remind dad to take Amlodipine at 9 AM daily" → {"medicineName":"Amlodipine","personName":"dad","time":"09:00","frequency":"daily","notes":""}
- "Tell me to take Metformin at 8:30 AM and 8:30 PM" → {"medicineName":"Metformin","personName":"me","time":"08:30","frequency":"twice_daily","notes":"Take after meals"}

Return ONLY the JSON.`;

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg' });
  }
}

export default function RemindersPanel() {
  const { t } = useI18n();
  const { reminders, parentalLog, addReminder, toggleReminder, deleteReminder, logDose } = useHealthAgent();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ medicineName: '', personName: '', time: '09:00', frequency: 'daily', notes: '' });
  const [activeView, setActiveView] = useState('reminders'); // 'reminders' | 'log'
  const intervalRef = useRef(null);

  // Request notification permission on mount
  useEffect(() => { requestNotificationPermission(); }, []);

  // Reminder checker — runs every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      reminders.filter(r => r.active).forEach((r) => {
        if (r.time === currentTime) {
          sendNotification(
            `💊 ${t("Medicine Reminder")}`,
            `${r.personName}: ${t("Time to take")} ${r.medicineName}`
          );
        }
      });
    }, 30000);

    return () => clearInterval(intervalRef.current);
  }, [reminders, t]);

  const handleChatCommand = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setInput('');

    try {
      if (isApiKeyConfigured()) {
        const raw = await chatCompletion(REMINDER_PARSE_PROMPT, text);
        let cleaned = raw.trim();
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        const parsed = JSON.parse(cleaned);
        addReminder(parsed);
      } else {
        // Fallback: basic regex parsing
        const timePat = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
        const match = text.match(timePat);
        let time = '09:00';
        if (match) {
          let h = parseInt(match[1]);
          const m = match[2] ? parseInt(match[2]) : 0;
          const ampm = match[3]?.toLowerCase();
          if (ampm === 'pm' && h < 12) h += 12;
          if (ampm === 'am' && h === 12) h = 0;
          time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        addReminder({ medicineName: text, personName: 'me', time, frequency: 'daily', notes: '' });
      }
    } catch {
      // On parse failure, create a simple reminder
      addReminder({ medicineName: text, personName: 'me', time: '09:00', frequency: 'daily', notes: '' });
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, addReminder]);

  const handleManualAdd = () => {
    if (!manualForm.medicineName.trim()) return;
    addReminder(manualForm);
    setManualForm({ medicineName: '', personName: '', time: '09:00', frequency: 'daily', notes: '' });
    setShowManualForm(false);
  };

  const handleLogDose = (reminder, status) => {
    logDose({
      reminderId: reminder.id,
      medicineName: reminder.medicineName,
      personName: reminder.personName,
      status, // 'taken' | 'missed' | 'snoozed'
    });
  };

  // Weekly compliance stats
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekLogs = parentalLog.filter(l => new Date(l.timestamp).getTime() > weekAgo);
  const takenCount = weekLogs.filter(l => l.status === 'taken').length;
  const missedCount = weekLogs.filter(l => l.status === 'missed').length;
  const totalLogs = takenCount + missedCount;
  const complianceRate = totalLogs > 0 ? Math.round((takenCount / totalLogs) * 100) : 0;

  const frequencyLabels = { daily: t('Daily'), twice_daily: t('Twice Daily'), thrice_daily: t('Three Times'), weekly: t('Weekly') };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('reminders')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeView === 'reminders' ? 'bg-primary text-on-primary' : 'text-on-surface-variant bg-surface-container-lowest border border-outline-variant'}`}
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">alarm</span>
          {t("Reminders")}
        </button>
        <button
          onClick={() => setActiveView('log')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeView === 'log' ? 'bg-primary text-on-primary' : 'text-on-surface-variant bg-surface-container-lowest border border-outline-variant'}`}
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">monitoring</span>
          {t("Parental Dashboard")}
        </button>
      </div>

      {activeView === 'reminders' && (
        <>
          {/* Chat Command Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChatCommand()}
              placeholder={t("e.g. Remind dad to take Amlodipine at 9 AM daily")}
              className="flex-1 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm font-semibold placeholder:text-on-surface-variant/50"
            />
            <button
              onClick={handleChatCommand}
              disabled={!input.trim() || isProcessing}
              className="px-4 rounded-2xl bg-primary text-on-primary font-bold disabled:opacity-40 active:scale-95 transition-all"
            >
              {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined">add</span>}
            </button>
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="px-3 rounded-2xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined">tune</span>
            </button>
          </div>

          {/* Manual Form */}
          {showManualForm && (
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={manualForm.medicineName} onChange={e => setManualForm(f => ({ ...f, medicineName: e.target.value }))} placeholder={t("Medicine name")} className="p-2 rounded-xl border border-outline-variant text-sm font-semibold outline-none focus:border-primary bg-transparent" />
                <input type="text" value={manualForm.personName} onChange={e => setManualForm(f => ({ ...f, personName: e.target.value }))} placeholder={t("For whom? (dad, mom, me)")} className="p-2 rounded-xl border border-outline-variant text-sm font-semibold outline-none focus:border-primary bg-transparent" />
                <input type="time" value={manualForm.time} onChange={e => setManualForm(f => ({ ...f, time: e.target.value }))} className="p-2 rounded-xl border border-outline-variant text-sm font-semibold outline-none focus:border-primary bg-transparent" />
                <select value={manualForm.frequency} onChange={e => setManualForm(f => ({ ...f, frequency: e.target.value }))} className="p-2 rounded-xl border border-outline-variant text-sm font-semibold outline-none focus:border-primary bg-transparent">
                  <option value="daily">{t("Daily")}</option>
                  <option value="twice_daily">{t("Twice Daily")}</option>
                  <option value="thrice_daily">{t("Three Times")}</option>
                  <option value="weekly">{t("Weekly")}</option>
                </select>
              </div>
              <button onClick={handleManualAdd} disabled={!manualForm.medicineName.trim()} className="w-full py-2 rounded-xl bg-primary text-on-primary font-bold disabled:opacity-40 active:scale-95 transition-all">
                {t("Add Reminder")}
              </button>
            </div>
          )}

          {/* Reminder List */}
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">notifications_none</span>
              <p className="text-sm text-on-surface-variant">{t("No reminders yet. Type a command above or add manually.")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className={`p-4 rounded-2xl border transition-all ${r.active ? 'bg-surface-container-lowest border-outline-variant' : 'bg-surface-container border-outline-variant/30 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">medication</span>
                      <div>
                        <h4 className="font-black text-on-surface text-sm">{r.medicineName}</h4>
                        <p className="text-xs text-on-surface-variant font-semibold">
                          {t("For")}: {r.personName || 'me'} • {r.time} • {frequencyLabels[r.frequency] || r.frequency}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => toggleReminder(r.id)} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors" title={r.active ? t('Pause') : t('Resume')}>
                        <span className="material-symbols-outlined text-sm text-on-surface-variant">{r.active ? 'pause' : 'play_arrow'}</span>
                      </button>
                      <button onClick={() => deleteReminder(r.id)} className="p-1.5 rounded-lg hover:bg-error/10 transition-colors" title={t('Delete')}>
                        <span className="material-symbols-outlined text-sm text-error">delete</span>
                      </button>
                    </div>
                  </div>
                  {/* Quick log buttons */}
                  <div className="flex gap-2 pt-2 border-t border-outline-variant/30">
                    <button onClick={() => handleLogDose(r, 'taken')} className="flex-1 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-xs hover:bg-emerald-500/20 transition-colors">✅ {t("Taken")}</button>
                    <button onClick={() => handleLogDose(r, 'missed')} className="flex-1 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 font-bold text-xs hover:bg-rose-500/20 transition-colors">❌ {t("Missed")}</button>
                    <button onClick={() => handleLogDose(r, 'snoozed')} className="flex-1 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 font-bold text-xs hover:bg-amber-500/20 transition-colors">⏰ {t("Snoozed")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeView === 'log' && (
        <div className="space-y-4">
          {/* Compliance Card */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant">
            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              {t("7-Day Compliance Summary")}
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-xl bg-emerald-500/10">
                <p className="text-2xl font-black text-emerald-600">{takenCount}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">{t("Taken")}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-rose-500/10">
                <p className="text-2xl font-black text-rose-600">{missedCount}</p>
                <p className="text-[10px] font-bold text-rose-600 uppercase">{t("Missed")}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/10">
                <p className="text-2xl font-black text-primary">{complianceRate}%</p>
                <p className="text-[10px] font-bold text-primary uppercase">{t("Compliance")}</p>
              </div>
            </div>
            {/* Simple bar */}
            <div className="h-3 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${complianceRate}%` }} />
            </div>
          </div>

          {/* Dose Log */}
          <h3 className="font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            {t("Recent Dose Log")}
          </h3>
          {parentalLog.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">{t("No doses logged yet. Use the Taken/Missed buttons on reminders.")}</p>
          ) : (
            <div className="space-y-2">
              {parentalLog.slice().reverse().slice(0, 30).map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant">
                  <span className="text-lg">{log.status === 'taken' ? '✅' : log.status === 'missed' ? '❌' : '⏰'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-on-surface">{log.medicineName}</p>
                    <p className="text-[10px] text-on-surface-variant font-semibold">{log.personName} • {new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    log.status === 'taken' ? 'bg-emerald-500/10 text-emerald-600' : log.status === 'missed' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>{t(log.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
