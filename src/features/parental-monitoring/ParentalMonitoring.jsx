import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── localStorage persistence ──────────────────────────────────
const STORAGE_KEY = 'resq_parental_monitoring';
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

// ─── Default demo data ─────────────────────────────────────────
const DEFAULT_CIRCLE = [
  { id: '1', name: 'Grandma Latha', age: 72, relation: 'Grandmother', avatar: '👵', status: 'active', lastCheckIn: Date.now() - 1800000 },
  { id: '2', name: 'Grandpa Mohan', age: 78, relation: 'Grandfather', avatar: '👴', status: 'active', lastCheckIn: Date.now() - 7200000 },
];

const DEFAULT_REMINDERS = [
  { id: '1', memberId: '1', medicine: 'Metformin 500mg', dosage: '1 tablet', time: '08:00', frequency: 'Daily', status: 'pending', notes: 'Take after breakfast' },
  { id: '2', memberId: '1', medicine: 'Amlodipine 5mg', dosage: '1 tablet', time: '21:00', frequency: 'Daily', status: 'pending', notes: 'Take before bed' },
  { id: '3', memberId: '2', medicine: 'Aspirin 75mg', dosage: '1 tablet', time: '09:00', frequency: 'Daily', status: 'pending', notes: 'Take with water' },
  { id: '4', memberId: '2', medicine: 'Atorvastatin 10mg', dosage: '1 tablet', time: '22:00', frequency: 'Daily', status: 'pending', notes: 'Take at night' },
];

export default function ParentalMonitoring() {
  const [initData] = useState(() => loadData());
  const [circle, setCircle] = useState(initData?.circle || DEFAULT_CIRCLE);
  const [reminders, setReminders] = useState(initData?.reminders || DEFAULT_REMINDERS);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(initData?.voiceBlob || null);
  const [isRecording, setIsRecording] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', age: '', relation: '', avatar: '👤' });
  const [newReminder, setNewReminder] = useState({ medicine: '', dosage: '', time: '08:00', frequency: 'Daily', notes: '' });

  const [alarmActive, setAlarmActive] = useState(false);
  const [soundedAlarms, setSoundedAlarms] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceAudioRef = useRef(null);
  const alarmTimeoutRef = useRef(null);

  // Persist
  useEffect(() => {
    saveData({ circle, reminders, voiceBlob });
  }, [circle, reminders, voiceBlob]);

  const stopAlarm = () => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current = null;
    }
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }
    setAlarmActive(false);
  };

  const startAlarm = () => {
    if (!voiceBlob) return;
    stopAlarm();

    const audio = new Audio(voiceBlob);
    audio.loop = true;
    voiceAudioRef.current = audio;

    audio.play().catch(err => {
      console.warn("Auto-play blocked by browser. Alarm will sound on next click.");
    });
    setAlarmActive(true);

    // Stop after 60 seconds (1 minute)
    alarmTimeoutRef.current = setTimeout(() => {
      stopAlarm();
    }, 60000);
  };

  // Check for missed medications and generate alerts
  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newAlerts = [];

      reminders.forEach(r => {
        if (r.status === 'pending' && r.time <= currentTime) {
          const member = circle.find(m => m.id === r.memberId);
          if (member) {
            newAlerts.push({
              id: r.id,
              type: 'missed',
              message: `${member.name} hasn't taken ${r.medicine} (scheduled at ${r.time})`,
              member,
              reminder: r,
            });

            // If it's exactly the scheduled time, trigger the voice alarm (only once per alarm)
            if (r.time === currentTime && !soundedAlarms.includes(r.id)) {
              startAlarm();
              setSoundedAlarms(prev => [...prev, r.id]);
            }
          }
        }
      });
      setAlerts(newAlerts);
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 5000); // Check more frequently (every 5s) for instant alarm response
    return () => {
      clearInterval(interval);
      if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    };
  }, [reminders, circle, soundedAlarms, voiceBlob]);

  // ─── Voice Recording ───────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          setVoiceBlob(reader.result);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access is required to record a voice reminder. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playVoiceReminder = () => {
    if (voiceBlob) {
      stopAlarm();
      const audio = new Audio(voiceBlob);
      voiceAudioRef.current = audio;
      audio.play();
    }
  };

  // ─── CRUD ──────────────────────────────────────────────────
  const addMember = () => {
    if (!newMember.name || !newMember.age) return;
    const member = {
      id: Date.now().toString(),
      name: newMember.name,
      age: parseInt(newMember.age),
      relation: newMember.relation || 'Family',
      avatar: newMember.avatar,
      status: 'active',
      lastCheckIn: Date.now(),
    };
    setCircle(prev => [...prev, member]);
    setNewMember({ name: '', age: '', relation: '', avatar: '👤' });
    setShowAddMember(false);
  };

  const addReminder = () => {
    if (!newReminder.medicine || !selectedMember) return;
    const reminder = {
      id: Date.now().toString(),
      memberId: selectedMember.id,
      medicine: newReminder.medicine,
      dosage: newReminder.dosage || '1 tablet',
      time: newReminder.time,
      frequency: newReminder.frequency,
      status: 'pending',
      notes: newReminder.notes,
    };
    setReminders(prev => [...prev, reminder]);
    setNewReminder({ medicine: '', dosage: '', time: '08:00', frequency: 'Daily', notes: '' });
    setShowAddReminder(false);
  };

  const markTaken = (reminderId) => {
    setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, status: 'taken' } : r));
    stopAlarm();
  };

  const markMissed = (reminderId) => {
    setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, status: 'missed' } : r));
    stopAlarm();
  };

  const resetAllReminders = () => {
    setReminders(prev => prev.map(r => ({ ...r, status: 'pending' })));
  };

  const removeMember = (memberId) => {
    if (confirm('Remove this member and all their reminders?')) {
      setCircle(prev => prev.filter(m => m.id !== memberId));
      setReminders(prev => prev.filter(r => r.memberId !== memberId));
      if (selectedMember?.id === memberId) setSelectedMember(null);
    }
  };

  const removeReminder = (reminderId) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  const doCheckIn = (memberId) => {
    setCircle(prev => prev.map(m => m.id === memberId ? { ...m, lastCheckIn: Date.now(), status: 'active' } : m));
  };

  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getStatusColor = (member) => {
    const diff = Date.now() - member.lastCheckIn;
    if (diff < 3600000) return 'text-secondary'; // active within 1hr
    if (diff < 14400000) return 'text-tertiary-fixed-dim'; // within 4hrs
    return 'text-status-emergency'; // inactive
  };

  const getStatusLabel = (member) => {
    const diff = Date.now() - member.lastCheckIn;
    if (diff < 3600000) return 'Active';
    if (diff < 14400000) return 'Idle';
    return '⚠️ Inactive';
  };

  const memberReminders = selectedMember 
    ? reminders.filter(r => r.memberId === selectedMember.id)
    : reminders;

  const avatarOptions = ['👤', '👵', '👴', '👩', '👨', '👧', '👦', '🧓', '👩‍🦳', '👨‍🦳'];

  return (
    <div className="flex-1 flex flex-col gap-md max-w-7xl mx-auto w-full pb-xl">

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-status-emergency/10 border border-status-emergency/30 rounded-xl p-md">
          <h3 className="text-status-emergency font-bold flex items-center gap-2 mb-sm">
            <span className="material-symbols-outlined animate-pulse">notification_important</span>
            {alerts.length} Medication Alert{alerts.length > 1 ? 's' : ''}
          </h3>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-surface-container-lowest rounded-lg p-sm">
                <div className="flex items-center gap-sm">
                  <span className="text-2xl">{alert.member.avatar}</span>
                  <div>
                    <p className="text-body-sm font-bold text-on-surface">{alert.message}</p>
                    <p className="text-[11px] text-on-surface-variant">{alert.reminder.notes}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { markTaken(alert.reminder.id); playVoiceReminder(); }}
                    className="px-3 py-1 bg-secondary text-on-secondary text-label-sm font-bold rounded-lg hover:bg-secondary/80 transition-colors">
                    ✅ Taken
                  </button>
                  <button onClick={() => markMissed(alert.reminder.id)}
                    className="px-3 py-1 bg-error-container text-on-error-container text-label-sm font-bold rounded-lg hover:bg-error-container/80 transition-colors">
                    Missed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-md text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]" data-icon="supervisor_account">supervisor_account</span>
            Parental Monitoring
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Advanced Parental Care Circle • Medicine reminders with voice alerts • {circle.length} member{circle.length !== 1 ? 's' : ''} in your circle
          </p>
        </div>
        <button onClick={resetAllReminders} className="px-3 py-1.5 text-label-sm font-bold border border-outline-variant rounded-xl text-on-surface hover:bg-surface-container-low transition-colors">
          Reset Today's Reminders
        </button>
      </div>

      {/* Voice Reminder Recorder */}
      <div className="bg-gradient-to-r from-primary/10 to-tertiary-fixed-dim/10 p-md rounded-xl border border-primary/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isRecording ? 'bg-status-emergency animate-pulse' : 'bg-primary/20'}`}>
              <span className="material-symbols-outlined text-primary text-[28px]">{isRecording ? 'mic' : 'record_voice_over'}</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-on-surface font-bold">Caretaker Voice Reminder</h3>
              <p className="text-body-sm text-on-surface-variant">
                {voiceBlob ? 'Voice recorded ✅ This will play when a reminder triggers.' : 'Record your voice to play as a personalized reminder for your loved ones.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {voiceBlob && (
              <>
                <button onClick={playVoiceReminder} className="px-3 py-1.5 bg-surface-container-lowest text-on-surface font-bold text-label-sm rounded-xl border border-outline-variant hover:bg-surface-container-low transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span> Play
                </button>
                <button onClick={() => setVoiceBlob(null)} className="px-3 py-1.5 text-on-surface-variant font-bold text-label-sm rounded-xl hover:bg-surface-container-low transition-colors">
                  Delete
                </button>
              </>
            )}
            {isRecording ? (
              <button onClick={stopRecording} className="px-4 py-2 bg-status-emergency text-white font-bold text-label-sm rounded-xl hover:bg-status-emergency/80 transition-colors flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-[16px]">stop</span> Stop Recording
              </button>
            ) : (
              <button onClick={startRecording} className="px-4 py-2 bg-primary text-on-primary font-bold text-label-sm rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">mic</span> {voiceBlob ? 'Re-record' : 'Record Voice'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-md">
        {/* Circle of Trust — Left Panel */}
        <div className="col-span-4 flex flex-col gap-md">
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between mb-md">
              <h3 className="font-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">shield</span>
                Circle of Trust
              </h3>
              <button onClick={() => setShowAddMember(true)} className="px-3 py-1 text-label-sm font-bold border border-outline-variant rounded-full text-on-surface hover:bg-surface-container-low transition-colors">
                + Add
              </button>
            </div>

            <div className="space-y-2">
              {circle.map(member => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                  className={`flex items-center gap-sm p-sm rounded-xl cursor-pointer transition-all group ${
                    selectedMember?.id === member.id 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-surface-container-low border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <span className="text-3xl">{member.avatar}</span>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-container-lowest ${getStatusColor(member) === 'text-secondary' ? 'bg-secondary' : getStatusColor(member) === 'text-tertiary-fixed-dim' ? 'bg-tertiary-fixed-dim' : 'bg-status-emergency'}`}></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-label-md font-bold text-on-surface truncate">{member.name}</h4>
                    <p className="text-[11px] text-on-surface-variant">{member.relation} • Age {member.age}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[11px] font-bold ${getStatusColor(member)}`}>{getStatusLabel(member)}</p>
                    <p className="text-[10px] text-on-surface-variant">{getTimeAgo(member.lastCheckIn)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); doCheckIn(member.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-primary hover:bg-primary/10 rounded-lg transition-all shrink-0" title="Manual Check-in">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeMember(member.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-status-emergency hover:bg-error-container rounded-lg transition-all shrink-0" title="Remove">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
              {circle.length === 0 && (
                <p className="text-center text-on-surface-variant text-body-sm py-md">No members yet. Add your first family member above.</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
            <h3 className="font-label-md font-bold text-on-surface-variant mb-sm">Today's Summary</h3>
            <div className="grid grid-cols-3 gap-sm">
              <div className="text-center p-sm bg-secondary/10 rounded-xl">
                <p className="text-xl font-black text-secondary">{reminders.filter(r => r.status === 'taken').length}</p>
                <p className="text-[10px] font-bold text-on-surface-variant">Taken</p>
              </div>
              <div className="text-center p-sm bg-tertiary-fixed-dim/10 rounded-xl">
                <p className="text-xl font-black text-tertiary-fixed-dim">{reminders.filter(r => r.status === 'pending').length}</p>
                <p className="text-[10px] font-bold text-on-surface-variant">Pending</p>
              </div>
              <div className="text-center p-sm bg-status-emergency/10 rounded-xl">
                <p className="text-xl font-black text-status-emergency">{reminders.filter(r => r.status === 'missed').length}</p>
                <p className="text-[10px] font-bold text-on-surface-variant">Missed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Medicine Reminders — Right Panel */}
        <div className="col-span-8">
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between mb-md">
              <h3 className="font-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">medication</span>
                Medicine Reminders
                {selectedMember && (
                  <span className="text-body-sm font-normal text-on-surface-variant ml-2">
                    for {selectedMember.avatar} {selectedMember.name}
                  </span>
                )}
              </h3>
              <button onClick={() => setShowAddReminder(true)} disabled={!selectedMember}
                className="px-3 py-1.5 bg-primary text-on-primary text-label-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Reminder
              </button>
            </div>

            {!selectedMember && (
              <div className="text-center py-md bg-surface-container rounded-xl mb-md">
                <p className="text-body-sm text-on-surface-variant font-bold">← Select a member from the Circle of Trust to view or add their reminders</p>
              </div>
            )}

            <div className="space-y-2">
              {memberReminders.map(r => {
                const member = circle.find(m => m.id === r.memberId);
                return (
                  <div key={r.id} className={`flex items-center gap-sm p-sm rounded-xl border transition-all group ${
                    r.status === 'taken' ? 'bg-secondary/5 border-secondary/20' :
                    r.status === 'missed' ? 'bg-status-emergency/5 border-status-emergency/20' :
                    'bg-surface border-outline-variant hover:border-primary/30'
                  }`}>
                    {/* Time */}
                    <div className="w-16 text-center shrink-0">
                      <p className="text-lg font-black text-on-surface">{r.time}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold">{r.frequency}</p>
                    </div>

                    {/* Divider */}
                    <div className={`w-1 h-10 rounded-full ${
                      r.status === 'taken' ? 'bg-secondary' :
                      r.status === 'missed' ? 'bg-status-emergency' : 'bg-primary'
                    }`}></div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!selectedMember && member && <span className="text-lg">{member.avatar}</span>}
                        <h4 className="font-label-md font-bold text-on-surface">{r.medicine}</h4>
                        <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded">{r.dosage}</span>
                      </div>
                      {r.notes && <p className="text-[11px] text-on-surface-variant mt-0.5">{r.notes}</p>}
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {r.status === 'taken' ? (
                        <span className="px-3 py-1 bg-secondary/20 text-secondary text-label-sm font-bold rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check</span> Taken
                        </span>
                      ) : r.status === 'missed' ? (
                        <span className="px-3 py-1 bg-status-emergency/20 text-status-emergency text-label-sm font-bold rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">close</span> Missed
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => { markTaken(r.id); playVoiceReminder(); }}
                            className="px-3 py-1 bg-secondary text-on-secondary text-label-sm font-bold rounded-lg hover:bg-secondary/80 transition-colors">
                            ✅ Taken
                          </button>
                          <button onClick={() => markMissed(r.id)}
                            className="px-3 py-1 bg-surface-container text-on-surface-variant text-label-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors">
                            Skip
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button onClick={() => removeReminder(r.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-status-emergency rounded transition-all shrink-0" title="Delete">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                );
              })}
              {memberReminders.length === 0 && (
                <div className="text-center py-xl">
                  <span className="material-symbols-outlined text-outline text-5xl mb-2">medication</span>
                  <p className="text-on-surface-variant font-bold">No reminders set</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">Select a member and click "Add Reminder" to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-2xl max-w-md w-full border border-outline-variant">
            <h4 className="font-headline-md text-on-surface font-bold flex items-center gap-2 mb-md">
              <span className="material-symbols-outlined text-primary">person_add</span>
              Add Family Member
            </h4>
            <div className="space-y-sm">
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Avatar</label>
                <div className="flex gap-2 flex-wrap">
                  {avatarOptions.map(a => (
                    <button key={a} onClick={() => setNewMember(p => ({ ...p, avatar: a }))}
                      className={`text-2xl p-1 rounded-lg border transition-colors ${newMember.avatar === a ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-surface-container'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Name *</label>
                <input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="e.g. Grandma Latha" />
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Age *</label>
                  <input type="number" value={newMember.age} onChange={e => setNewMember(p => ({ ...p, age: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="72" />
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Relation</label>
                  <input value={newMember.relation} onChange={e => setNewMember(p => ({ ...p, relation: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="Grandmother" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-sm mt-md">
              <button onClick={() => setShowAddMember(false)} className="px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
              <button onClick={addMember} disabled={!newMember.name || !newMember.age}
                className="px-4 py-2 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">Add Member</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddReminder && selectedMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-2xl max-w-md w-full border border-outline-variant">
            <h4 className="font-headline-md text-on-surface font-bold flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">alarm_add</span>
              Add Reminder for {selectedMember.avatar} {selectedMember.name}
            </h4>
            <div className="space-y-sm mt-md">
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Medicine Name *</label>
                <input value={newReminder.medicine} onChange={e => setNewReminder(p => ({ ...p, medicine: e.target.value }))}
                  className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="e.g. Metformin 500mg" />
              </div>
              <div className="grid grid-cols-3 gap-sm">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Dosage</label>
                  <input value={newReminder.dosage} onChange={e => setNewReminder(p => ({ ...p, dosage: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="1 tablet" />
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Time *</label>
                  <input type="time" value={newReminder.time} onChange={e => setNewReminder(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" />
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Frequency</label>
                  <select value={newReminder.frequency} onChange={e => setNewReminder(p => ({ ...p, frequency: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface">
                    <option>Daily</option><option>Twice Daily</option><option>Weekly</option><option>As Needed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Notes</label>
                <input value={newReminder.notes} onChange={e => setNewReminder(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="Take after breakfast" />
              </div>
            </div>
            <div className="flex justify-end gap-sm mt-md">
              <button onClick={() => setShowAddReminder(false)} className="px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
              <button onClick={addReminder} disabled={!newReminder.medicine}
                className="px-4 py-2 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">Add Reminder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
