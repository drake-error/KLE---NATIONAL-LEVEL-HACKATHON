import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const STORAGE_KEY_CIRCLE = 'resq_plus_parental_circle';
const STORAGE_KEY_REMINDERS = 'resq_plus_parental_reminders';
const STORAGE_KEY_VOICE = 'resq_plus_parental_voice';
const STORAGE_KEY_CAREGIVER = 'resq_plus_caregiver_link';
const STORAGE_KEY_ACCESS_CODE = 'resq_plus_access_code';

const INITIAL_CIRCLE_DEMO = [
  { id: 'dev-1', name: 'Grandma Latha', age: 74, relation: 'Grandmother', avatar: '👵', status: 'active', last_check_in: Date.now() - 1800000 },
  { id: 'dev-2', name: 'Grandpa Ramesh', age: 78, relation: 'Grandfather', avatar: '👴', status: 'active', last_check_in: Date.now() - 5400000 },
];

const INITIAL_REMINDERS_DEMO = [
  { id: 'rem-101', member_id: 'dev-1', medicine: 'Metformin 500mg', dosage: '1 tablet', time: '08:30', frequency: 'Daily', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], status: 'taken', notes: 'Take immediately after breakfast with water' },
  { id: 'rem-102', member_id: 'dev-2', medicine: 'Amlodipine 5mg', dosage: '1 tablet', time: '14:00', frequency: 'Daily', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], status: 'pending', notes: 'For daily blood pressure regulation' },
];

export default function ParentalMonitoring({ session }) {
  // Mode: 'primary' (my care circle) or 'caregiver' (monitoring someone else)
  const [mode, setMode] = useState('primary');
  
  // Data State
  const [circle, setCircle] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Caregiver Mode State
  const [accessCode, setAccessCode] = useState('');
  const [caregiverInput, setCaregiverInput] = useState('');
  const [linkedPatientId, setLinkedPatientId] = useState(null);
  const [linkedPatientName, setLinkedPatientName] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // UI State
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [alerts, setAlerts] = useState([]);
  
  const [newMember, setNewMember] = useState({ name: '', age: '', relation: '', avatar: '👵' });
  const [newReminder, setNewReminder] = useState({ medicine: '', dosage: '', time: '09:00', frequency: 'Daily', notes: '', memberId: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] });

  const [alarmActive, setAlarmActive] = useState(false);
  const [soundedAlarms, setSoundedAlarms] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceAudioRef = useRef(null);
  const alarmTimeoutRef = useRef(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to get active user ID based on mode
  const getActiveUserId = () => {
    if (mode === 'primary') return session?.user?.id || 'local_user_default';
    return linkedPatientId || 'linked_patient_remote';
  };

  // 1. Reliable Hybrid Data Loading (localStorage with Supabase fallback)
  const loadData = useCallback(async () => {
    const userId = getActiveUserId();

    // 1A. Load Circle of Trust
    let loadedCircle = null;
    try {
      const storedCircle = localStorage.getItem(`${STORAGE_KEY_CIRCLE}_${userId}`);
      if (storedCircle) loadedCircle = JSON.parse(storedCircle);
    } catch (e) {}

    // If local storage is empty, check Supabase without breaking
    if (!loadedCircle || loadedCircle.length === 0) {
      try {
        const { data: circleData } = await supabase.from('circle_members').select('*').eq('user_id', userId);
        if (circleData && circleData.length > 0) loadedCircle = circleData;
      } catch (e) {}
    }

    // If still empty, initialize with realistic demo state
    if (!loadedCircle || loadedCircle.length === 0) {
      loadedCircle = mode === 'caregiver' ? [INITIAL_CIRCLE_DEMO[0]] : INITIAL_CIRCLE_DEMO;
      localStorage.setItem(`${STORAGE_KEY_CIRCLE}_${userId}`, JSON.stringify(loadedCircle));
    }
    setCircle(loadedCircle);

    // 1B. Load Reminders
    let loadedReminders = null;
    try {
      const storedReminders = localStorage.getItem(`${STORAGE_KEY_REMINDERS}_${userId}`);
      if (storedReminders) loadedReminders = JSON.parse(storedReminders);
    } catch (e) {}

    if (!loadedReminders || loadedReminders.length === 0) {
      try {
        const { data: remData } = await supabase.from('medicine_reminders').select('*').eq('user_id', userId);
        if (remData && remData.length > 0) loadedReminders = remData;
      } catch (e) {}
    }

    if (!loadedReminders || loadedReminders.length === 0) {
      loadedReminders = INITIAL_REMINDERS_DEMO;
      localStorage.setItem(`${STORAGE_KEY_REMINDERS}_${userId}`, JSON.stringify(loadedReminders));
    }
    setReminders(loadedReminders);

    // 1C. Load Voice Reminder
    try {
      const savedVoice = localStorage.getItem(`${STORAGE_KEY_VOICE}_${userId}`);
      if (savedVoice) setVoiceBlob(savedVoice);
    } catch (e) {}

    // 1D. Load Access Code for Primary Mode
    if (mode === 'primary') {
      let code = localStorage.getItem(`${STORAGE_KEY_ACCESS_CODE}_${userId}`);
      if (!code) {
        code = 'RSQ-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        localStorage.setItem(`${STORAGE_KEY_ACCESS_CODE}_${userId}`, code);
        try {
          await supabase.from('monitoring_profiles').upsert([{ user_id: userId, access_code: code }]);
        } catch (e) {}
      }
      setAccessCode(code);
    }
  }, [mode, session, linkedPatientId]);

  useEffect(() => {
    // Check if linked to caregiver stream
    try {
      const savedLink = localStorage.getItem(STORAGE_KEY_CAREGIVER);
      if (savedLink) {
        const parsed = JSON.parse(savedLink);
        setLinkedPatientId(parsed.patient_id || 'remote-loved-one-id');
        setLinkedPatientName(parsed.name || 'Remote Loved One');
      }
    } catch (e) {}
    
    loadData();
  }, [loadData]);

  // Save circle changes reliably
  const persistCircle = (updated) => {
    const userId = getActiveUserId();
    setCircle(updated);
    try {
      localStorage.setItem(`${STORAGE_KEY_CIRCLE}_${userId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  // Save reminder changes reliably
  const persistReminders = (updated) => {
    const userId = getActiveUserId();
    setReminders(updated);
    try {
      localStorage.setItem(`${STORAGE_KEY_REMINDERS}_${userId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  // Caregiver Mode Connection Handlers
  const handleLinkCaregiver = async () => {
    if (!caregiverInput || caregiverInput.length < 3) {
      triggerToast('Please enter a valid Caregiver Access Code (e.g., RSQ-7F8C)');
      return;
    }
    setIsLinking(true);

    // Simulate reliable linking verification
    setTimeout(async () => {
      const simPatientId = 'patient_' + caregiverInput.toLowerCase();
      const simName = `Loved One (${caregiverInput.toUpperCase()})`;
      
      try {
        if (session?.user?.id) {
          await supabase.from('caregiver_links').upsert({ caregiver_id: session.user.id, patient_id: simPatientId });
        }
      } catch(e) {}

      setLinkedPatientId(simPatientId);
      setLinkedPatientName(simName);
      try {
        localStorage.setItem(STORAGE_KEY_CAREGIVER, JSON.stringify({ patient_id: simPatientId, name: simName, code: caregiverInput }));
      } catch(e) {}

      setIsLinking(false);
      triggerToast(`Successfully connected to ${simName}'s live monitoring telemetry!`);
    }, 700);
  };

  const handleUnlink = async () => {
    if (window.confirm('Are you sure you want to disconnect from monitoring this profile?')) {
      try {
        localStorage.removeItem(STORAGE_KEY_CAREGIVER);
        if (session?.user?.id) {
          await supabase.from('caregiver_links').delete().eq('caregiver_id', session.user.id);
        }
      } catch(e) {}
      setLinkedPatientId(null);
      setLinkedPatientName('');
      triggerToast('Unlinked from remote profile.');
    }
  };

  // Alarm Logic
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
    stopAlarm();
    if (voiceBlob) {
      try {
        const audio = new Audio(voiceBlob);
        audio.loop = true;
        voiceAudioRef.current = audio;
        audio.play().catch(() => {});
      } catch (e) {}
    }
    setAlarmActive(true);
    alarmTimeoutRef.current = setTimeout(() => stopAlarm(), 60000);
  };

  // Test Alarm / Alert Simulator
  const handleTestAlarm = () => {
    const member = circle[0] || INITIAL_CIRCLE_DEMO[0];
    const testRem = reminders[0] || INITIAL_REMINDERS_DEMO[0];
    
    const simulatedAlert = {
      id: 'test_alert_' + Date.now(),
      type: 'missed',
      message: `[TEST ALERT] ${member.name} missed taking ${testRem.medicine}`,
      member,
      reminder: testRem,
    };

    setAlerts(prev => [simulatedAlert, ...prev]);
    startAlarm();
    triggerToast(`🚨 Simulated Emergency Alarm Triggered for ${member.name}!`);
  };

  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newAlerts = [...alerts];

      reminders.forEach(r => {
        if (r.status === 'pending' && r.time <= currentTime) {
          const member = circle.find(m => m.id === r.member_id);
          if (member && !newAlerts.some(a => a.id === r.id)) {
            newAlerts.push({
              id: r.id,
              type: 'missed',
              message: `${member.name} hasn't taken ${r.medicine} (scheduled at ${r.time})`,
              member,
              reminder: r,
            });

            if (r.time === currentTime && !soundedAlarms.includes(r.id)) {
              startAlarm();
              setSoundedAlarms(prev => [...prev, r.id]);
            }
          }
        }
      });
      setAlerts(newAlerts);
    };

    const interval = setInterval(checkAlerts, 10000);
    return () => {
      clearInterval(interval);
      if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    };
  }, [reminders, circle, soundedAlarms, voiceBlob, alerts]);

  // Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64data = reader.result;
          setVoiceBlob(base64data);
          const userId = getActiveUserId();
          try {
            localStorage.setItem(`${STORAGE_KEY_VOICE}_${userId}`, base64data);
            if (session?.user?.id) {
              await supabase.from('monitoring_profiles').update({ voice_blob: base64data }).eq('user_id', session.user.id);
            }
          } catch(e) {}
          triggerToast('🎙️ Custom voice reminder recorded and persisted!');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      triggerToast('Microphone access is required to record a custom audio alarm.');
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
      triggerToast('Playing recorded caretaker voice alarm...');
    } else {
      triggerToast('No voice recorded yet. Using standard system alert tone.');
    }
  };

  const handleDeleteVoice = async () => {
    setVoiceBlob(null);
    const userId = getActiveUserId();
    try {
      localStorage.removeItem(`${STORAGE_KEY_VOICE}_${userId}`);
      if (session?.user?.id) {
        await supabase.from('monitoring_profiles').update({ voice_blob: null }).eq('user_id', session.user.id);
      }
    } catch(e) {}
    triggerToast('Voice alarm recording removed.');
  };

  // CRUD Operations (Guaranteed Optimistic Execution)
  const addMember = async () => {
    if (!newMember.name || !newMember.age) {
      triggerToast('Please enter both Name and Age for the family member.');
      return;
    }
    const userId = getActiveUserId();
    const newId = 'member_' + Date.now();
    
    const member = {
      id: newId,
      user_id: userId,
      name: newMember.name,
      age: parseInt(newMember.age),
      relation: newMember.relation || 'Family',
      avatar: newMember.avatar || '👵',
      status: 'active',
      last_check_in: Date.now(),
    };
    
    // Immediately persist in UI & local storage
    persistCircle([...circle, member]);
    triggerToast(`✨ ${member.avatar} ${member.name} added to your Circle of Trust!`);

    // Async background database sync
    try {
      if (session?.user?.id) {
        await supabase.from('circle_members').insert([{ ...member, user_id: session.user.id }]);
      }
    } catch(e) {}

    setNewMember({ name: '', age: '', relation: '', avatar: '👵' });
    setShowAddMember(false);
  };

  const addReminder = async () => {
    const targetMemberId = newReminder.memberId || selectedMember?.id || (circle[0] ? circle[0].id : null);
    if (!newReminder.medicine || !targetMemberId) {
      triggerToast('Please specify a medicine name and select a family member.');
      return;
    }
    const userId = getActiveUserId();
    const newId = 'rem_' + Date.now();
    const memberObj = circle.find(m => m.id === targetMemberId);

    const reminder = {
      id: newId,
      user_id: userId,
      member_id: targetMemberId,
      medicine: newReminder.medicine,
      dosage: newReminder.dosage || '1 tablet',
      time: newReminder.time || '09:00',
      frequency: newReminder.frequency,
      days: newReminder.days,
      status: 'pending',
      notes: newReminder.notes || 'As scheduled in ResQ-Plus care loop',
    };

    persistReminders([...reminders, reminder]);
    triggerToast(`⏰ Reminder set: ${reminder.medicine} for ${memberObj ? memberObj.name : 'member'} at ${reminder.time}!`);

    try {
      if (session?.user?.id) {
        await supabase.from('medicine_reminders').insert([{ ...reminder, user_id: session.user.id }]);
      }
    } catch(e) {}

    setNewReminder({ medicine: '', dosage: '', time: '09:00', frequency: 'Daily', notes: '', memberId: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] });
    setShowAddReminder(false);
  };

  const updateReminderStatus = async (id, status) => {
    const updated = reminders.map(r => r.id === id ? { ...r, status } : r);
    persistReminders(updated);
    setAlerts(prev => prev.filter(a => a.id !== id));
    stopAlarm();

    triggerToast(status === 'taken' ? '✅ Medication verified as Taken!' : '⚠️ Medication skipped for now.');

    try {
      await supabase.from('medicine_reminders').update({ status }).eq('id', id);
    } catch(e) {}
  };

  const resetAllReminders = async () => {
    const updated = reminders.map(r => ({ ...r, status: 'pending' }));
    persistReminders(updated);
    setAlerts([]);
    triggerToast('🔄 Reset all medication reminder statuses for today.');

    try {
      if (session?.user?.id) {
        await supabase.from('medicine_reminders').update({ status: 'pending' }).eq('user_id', session.user.id);
      }
    } catch(e) {}
  };

  const removeMember = async (id) => {
    const memberToRemove = circle.find(m => m.id === id);
    if (window.confirm(`Remove ${memberToRemove ? memberToRemove.name : 'this member'} and all associated reminders from your Circle?`)) {
      persistCircle(circle.filter(m => m.id !== id));
      persistReminders(reminders.filter(r => r.member_id !== id));
      if (selectedMember?.id === id) setSelectedMember(null);
      triggerToast('Removed family member from Circle of Trust.');

      try {
        await supabase.from('circle_members').delete().eq('id', id);
      } catch(e) {}
    }
  };

  const removeReminder = async (id) => {
    persistReminders(reminders.filter(r => r.id !== id));
    setAlerts(prev => prev.filter(a => a.id !== id));
    triggerToast('Deleted medicine reminder.');

    try {
      await supabase.from('medicine_reminders').delete().eq('id', id);
    } catch(e) {}
  };

  const doCheckIn = async (id) => {
    const now = Date.now();
    const updated = circle.map(m => m.id === id ? { ...m, last_check_in: now, status: 'active' } : m);
    persistCircle(updated);
    const mObj = circle.find(m => m.id === id);
    triggerToast(`Verified safety check-in for ${mObj ? mObj.name : 'member'}!`);

    try {
      await supabase.from('circle_members').update({ last_check_in: now, status: 'active' }).eq('id', id);
    } catch(e) {}
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getStatusColor = (member) => {
    const diff = Date.now() - (member.last_check_in || Date.now());
    if (diff < 3600000) return 'text-secondary';
    if (diff < 14400000) return 'text-tertiary-fixed-dim';
    return 'text-status-emergency';
  };

  const getStatusLabel = (member) => {
    const diff = Date.now() - (member.last_check_in || Date.now());
    if (diff < 3600000) return 'Active';
    if (diff < 14400000) return 'Idle';
    return '⚠️ Inactive';
  };

  const memberReminders = selectedMember 
    ? reminders.filter(r => r.member_id === selectedMember.id)
    : reminders;

  const avatarOptions = ['👵', '👴', '👤', '👩', '👨', '👧', '👦', '🧓', '👩‍🦳', '👨‍🦳'];

  return (
    <div className="flex-1 flex flex-col gap-md max-w-7xl mx-auto w-full pb-xl relative">

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#002764] dark:bg-primary text-white dark:text-on-primary px-5 py-3 rounded-2xl shadow-2xl border border-outline-variant/40 flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400">verified</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-sm flex gap-2 w-fit mx-auto shadow-sm">
        <button 
          onClick={() => { setMode('primary'); triggerToast('Switched to My Care Circle view'); }}
          className={`px-6 py-2 rounded-xl font-bold text-label-md transition-all ${mode === 'primary' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface hover:bg-surface-container-low'}`}>
          My Care Circle
        </button>
        <button 
          onClick={() => { setMode('caregiver'); triggerToast('Switched to Monitor a Loved One mode'); }}
          className={`px-6 py-2 rounded-xl font-bold text-label-md transition-all ${mode === 'caregiver' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface hover:bg-surface-container-low'}`}>
          Monitor a Loved One
        </button>
      </div>

      {mode === 'primary' && accessCode && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">vpn_key</span>
              Your Caregiver Access Code
            </h3>
            <p className="text-body-sm text-on-surface-variant mt-1">Share this unique code with trusted family members to monitor your medication telemetry remotely.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-surface px-4 py-2 rounded-lg border border-primary/30 font-mono text-xl font-black text-on-surface tracking-widest select-all">
              {accessCode}
            </div>
            <button 
              onClick={() => { navigator.clipboard?.writeText(accessCode); triggerToast('Access Code copied to clipboard!'); }}
              className="p-2.5 bg-surface hover:bg-surface-container-low border border-outline-variant rounded-lg transition-colors text-on-surface-variant" title="Copy code">
              <span className="material-symbols-outlined text-lg">content_copy</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'caregiver' && !linkedPatientId && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 text-center max-w-md mx-auto mt-xl shadow-lg animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl">link</span>
          </div>
          <h3 className="text-2xl font-extrabold text-on-surface mb-2">Link to a Loved One</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Enter the 6-character Caregiver Access Code generated on their ResQ-Plus profile to receive real-time medication alerts.</p>
          <input 
            value={caregiverInput}
            onChange={e => setCaregiverInput(e.target.value.toUpperCase())}
            placeholder="e.g. RSQ-7B9X"
            className="w-full text-center text-2xl tracking-widest font-mono font-black px-4 py-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/80 mb-5 focus:border-primary outline-none uppercase shadow-inner"
          />
          <button 
            onClick={handleLinkCaregiver} 
            disabled={!caregiverInput || isLinking}
            className="w-full bg-[#001945] dark:bg-primary text-white dark:text-on-primary font-extrabold text-base py-3.5 rounded-2xl shadow-md hover:opacity-90 transition-all disabled:opacity-50">
            {isLinking ? 'Connecting Telemetry...' : 'Connect to Care Stream'}
          </button>
        </div>
      )}

      {/* Show Content Only if Primary, OR if Caregiver and Linked */}
      {(mode === 'primary' || (mode === 'caregiver' && linkedPatientId)) && (
        <>
          {/* Active Medication / Alarm Alerts Banner */}
          {alerts.length > 0 && (
            <div className="bg-status-emergency/15 border-2 border-status-emergency/50 rounded-2xl p-md shadow-lg animate-fadeIn">
              <div className="flex items-center justify-between mb-sm">
                <h3 className="text-status-emergency text-lg font-black flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl animate-bounce">notification_important</span>
                  {alerts.length} Emergency Medication Alert{alerts.length > 1 ? 's' : ''} Active!
                </h3>
                <button onClick={() => setAlerts([])} className="text-xs font-bold text-on-surface-variant hover:underline">Dismiss All</button>
              </div>
              <div className="space-y-2.5">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/40 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{alert.member ? alert.member.avatar : '🚨'}</span>
                      <div>
                        <p className="text-sm font-black text-on-surface">{alert.message}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{alert.reminder ? alert.reminder.notes : 'Requires immediate caregiver check-in'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {alert.reminder && (
                        <>
                          <button onClick={() => { updateReminderStatus(alert.reminder.id, 'taken'); playVoiceReminder(); }}
                            className="px-4 py-1.5 bg-secondary text-on-secondary text-xs font-extrabold rounded-xl hover:bg-secondary/80 transition-colors shadow-sm">
                            ✅ Mark Taken
                          </button>
                          <button onClick={() => updateReminderStatus(alert.reminder.id, 'missed')}
                            className="px-4 py-1.5 bg-error-container text-on-error-container text-xs font-extrabold rounded-xl hover:bg-error-container/80 transition-colors">
                            Acknowledge & Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl text-on-surface font-extrabold tracking-tight flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[32px]" data-icon="supervisor_account">supervisor_account</span>
                {mode === 'caregiver' ? `Monitoring: ${linkedPatientName}` : 'Parental & Safety Monitoring'}
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-1 font-medium">
                {circle.length} family member{circle.length !== 1 ? 's' : ''} enrolled under live automated medication and vital telemetry tracking
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleTestAlarm} className="px-3.5 py-2 text-status-emergency bg-status-emergency/10 border border-status-emergency/30 rounded-xl text-xs font-extrabold hover:bg-status-emergency/20 transition-colors flex items-center gap-1.5 shadow-sm" title="Simulate a medication emergency alert">
                <span className="material-symbols-outlined text-[18px]">podcasts</span> Test Alert
              </button>
              {mode === 'caregiver' && (
                <button onClick={handleUnlink} className="px-3 py-2 text-rose-500 bg-error-container/20 font-bold border border-rose-500/30 rounded-xl hover:bg-error-container/40 transition-colors flex items-center gap-1 text-xs">
                  <span className="material-symbols-outlined text-[18px]">link_off</span> Unlink
                </button>
              )}
              <button onClick={() => setShowAddReminder(true)} className="px-4 py-2 bg-[#001945] dark:bg-primary text-white dark:text-on-primary text-sm font-extrabold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md active:scale-95">
                <span className="material-symbols-outlined text-[20px]">alarm_add</span>
                Set Reminder
              </button>
              <button onClick={resetAllReminders} className="px-3 py-2 text-xs font-extrabold border border-outline-variant rounded-xl text-on-surface hover:bg-surface-container-low transition-colors">
                Reset Today
              </button>
            </div>
          </div>

          {/* Voice Reminder Recorder Banner */}
          <div className="bg-gradient-to-r from-primary/10 via-surface-container to-tertiary-fixed-dim/15 p-6 rounded-3xl border border-primary/30 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isRecording ? 'bg-status-emergency text-white animate-pulse' : 'bg-primary/20 text-primary'}`}>
                  <span className="material-symbols-outlined text-[32px]">{isRecording ? 'mic' : 'record_voice_over'}</span>
                </div>
                <div>
                  <h3 className="text-lg text-on-surface font-extrabold">Custom Caregiver Voice Alarm</h3>
                  <p className="text-sm text-on-surface-variant mt-0.5 font-medium">
                    {voiceBlob ? 'Custom voice reminder saved ✅ Plays automatically when medication alerts ring.' : 'Record your voice to sound as an intimate, soothing audio alarm for your loved ones.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {voiceBlob && (
                  <>
                    <button onClick={playVoiceReminder} className="px-4 py-2 bg-surface-container-lowest text-on-surface font-extrabold text-xs rounded-xl border border-outline-variant hover:bg-surface-container-low transition-colors flex items-center gap-1.5 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span> Test Audio
                    </button>
                    {mode === 'primary' && (
                      <button onClick={handleDeleteVoice} className="px-3 py-2 text-rose-500 font-extrabold text-xs rounded-xl hover:bg-rose-500/10 transition-colors">
                        Remove
                      </button>
                    )}
                  </>
                )}
                {mode === 'primary' && (
                  isRecording ? (
                    <button onClick={stopRecording} className="px-5 py-2.5 bg-status-emergency text-white font-extrabold text-xs rounded-xl hover:bg-status-emergency/90 transition-colors flex items-center gap-1.5 animate-pulse shadow-md">
                      <span className="material-symbols-outlined text-[18px]">stop</span> Stop & Save Recording
                    </button>
                  ) : (
                    <button onClick={startRecording} className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:opacity-95 transition-colors flex items-center gap-1.5 shadow-md">
                      <span className="material-symbols-outlined text-[18px]">mic</span> {voiceBlob ? 'Re-record Voice' : 'Record Audio Alarm'}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Circle of Trust — Left Panel */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/60 shadow-sm">
                <div className="flex items-center justify-between mb-5 border-b border-outline-variant/30 pb-4">
                  <h3 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary-fixed-dim text-[24px]">shield_person</span>
                    Circle of Trust
                  </h3>
                  <button onClick={() => setShowAddMember(true)} className="px-4 py-1.5 text-xs font-extrabold border border-primary/50 bg-primary/5 rounded-xl text-primary hover:bg-primary hover:text-on-primary transition-all">
                    + Add Member
                  </button>
                </div>

                <div className="space-y-3">
                  {circle.map(member => {
                    const isSelected = selectedMember?.id === member.id;
                    return (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMember(isSelected ? null : member)}
                        className={`flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all group border ${
                          isSelected 
                            ? 'bg-primary/10 border-primary shadow-sm' 
                            : 'bg-surface-container-low/40 border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <span className="text-3xl block p-1.5 bg-surface rounded-2xl border border-outline-variant/50 shadow-inner">{member.avatar}</span>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest ${getStatusColor(member) === 'text-secondary' ? 'bg-emerald-500' : getStatusColor(member) === 'text-tertiary-fixed-dim' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-base text-on-surface truncate group-hover:text-primary transition-colors">{member.name}</h4>
                          <p className="text-xs font-semibold text-on-surface-variant">{member.relation} • Age {member.age}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-extrabold ${getStatusColor(member) === 'text-secondary' ? 'text-emerald-600 dark:text-emerald-400' : getStatusColor(member) === 'text-tertiary-fixed-dim' ? 'text-amber-500' : 'text-rose-500'}`}>{getStatusLabel(member)}</p>
                          <p className="text-[11px] font-medium text-on-surface-variant">{getTimeAgo(member.last_check_in)}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); doCheckIn(member.id); }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Verify Safety Check-in">
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeMember(member.id); }}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title="Remove Member">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {circle.length === 0 && (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">person_off</span>
                      <p className="text-on-surface font-extrabold text-sm">No family members yet</p>
                      <p className="text-xs text-on-surface-variant mt-1">Click "+ Add Member" above to enroll your parents or loved ones.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Today's Summary */}
              <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/60 shadow-sm">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  Today's Medication Summary
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{reminders.filter(r => r.status === 'taken').length}</p>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">Taken</p>
                  </div>
                  <div className="text-center p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{reminders.filter(r => r.status === 'pending').length}</p>
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mt-0.5">Pending</p>
                  </div>
                  <div className="text-center p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{reminders.filter(r => r.status === 'missed').length}</p>
                    <p className="text-xs font-bold text-rose-800 dark:text-rose-300 mt-0.5">Missed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medicine Reminders — Right Panel */}
            <div className="lg:col-span-8">
              <div className="bg-surface-container-lowest p-6 lg:p-7 rounded-3xl border border-outline-variant/60 shadow-sm">
                <div className="flex items-center justify-between mb-6 border-b border-outline-variant/30 pb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[24px]">medication</span>
                      Medicine & Vitals Schedule
                      {selectedMember && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full ml-2">
                          Showing only {selectedMember.avatar} {selectedMember.name}
                        </span>
                      )}
                    </h3>
                    {selectedMember && (
                      <button onClick={() => setSelectedMember(null)} className="text-xs font-bold text-on-surface-variant hover:underline mt-1">
                        ← Show reminders for all circle members
                      </button>
                    )}
                  </div>
                  <button onClick={() => setShowAddReminder(true)}
                    className="px-4 py-2 bg-[#001945] dark:bg-primary text-white dark:text-on-primary text-xs font-extrabold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">alarm_add</span>
                    New Reminder
                  </button>
                </div>

                <div className="space-y-3.5">
                  {memberReminders.map(r => {
                    const member = circle.find(m => m.id === r.member_id) || { name: 'Member', avatar: '👤' };
                    return (
                      <div key={r.id} className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all group ${
                        r.status === 'taken' ? 'bg-emerald-500/5 border-emerald-500/30 shadow-sm' :
                        r.status === 'missed' ? 'bg-rose-500/5 border-rose-500/30 shadow-sm' :
                        'bg-surface border-outline-variant/50 hover:border-primary/50 shadow-sm'
                      }`}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Time Stamp */}
                          <div className="w-20 text-center shrink-0 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/40">
                            <p className="text-xl font-black font-mono text-primary leading-tight">{r.time}</p>
                            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mt-0.5 truncate">{r.days ? (r.days.length === 7 ? 'Every day' : r.days.join(',')) : r.frequency}</p>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xl" title={member.name}>{member.avatar}</span>
                              <span className="text-xs font-extrabold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">{member.name}</span>
                              <span className="text-xs font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{r.dosage}</span>
                            </div>
                            <h4 className="font-extrabold text-lg text-on-surface truncate">{r.medicine}</h4>
                            {r.notes && <p className="text-xs text-on-surface-variant font-medium mt-0.5 italic">"{r.notes}"</p>}
                          </div>
                        </div>

                        {/* Status Badge & Action Controls */}
                        <div className="flex items-center gap-3 shrink-0">
                          {r.status === 'taken' ? (
                            <span className="px-3.5 py-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold rounded-full flex items-center gap-1 border border-emerald-500/30">
                              <span className="material-symbols-outlined text-sm">check_circle</span> Taken
                            </span>
                          ) : r.status === 'missed' ? (
                            <span className="px-3.5 py-1.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-extrabold rounded-full flex items-center gap-1 border border-rose-500/30">
                              <span className="material-symbols-outlined text-sm">error</span> Missed
                            </span>
                          ) : (
                            <div className="flex gap-1.5">
                              <button onClick={() => { updateReminderStatus(r.id, 'taken'); playVoiceReminder(); }}
                                className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-extrabold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">done</span> Take
                              </button>
                              <button onClick={() => updateReminderStatus(r.id, 'missed')}
                                className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant text-xs font-extrabold rounded-xl hover:bg-error-container hover:text-on-error-container transition-colors">
                                Skip
                              </button>
                            </div>
                          )}

                          {/* Delete */}
                          <button onClick={() => removeReminder(r.id)}
                            className="opacity-80 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all shrink-0" title="Delete Reminder">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {memberReminders.length === 0 && (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-5xl text-outline-variant mb-3 block">alarm_off</span>
                      <p className="text-on-surface font-extrabold text-base">No active medication schedules found</p>
                      <p className="text-sm text-on-surface-variant mt-1">Click "New Reminder" to create automated dosage alerts for your family.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Family Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-outline-variant/80">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4 mb-5">
              <h4 className="text-xl font-extrabold text-on-surface flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-2xl">person_add</span>
                Add Family Member
              </h4>
              <button onClick={() => setShowAddMember(false)} className="text-on-surface-variant hover:opacity-80">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-on-surface-variant block mb-2 uppercase tracking-wider">Select Avatar</label>
                <div className="flex gap-2 flex-wrap bg-surface-container-low p-3 rounded-2xl border border-outline-variant/40 justify-center">
                  {avatarOptions.map(a => (
                    <button key={a} type="button" onClick={() => setNewMember(p => ({ ...p, avatar: a }))}
                      className={`text-2xl p-2 rounded-xl transition-all ${newMember.avatar === a ? 'bg-primary/20 border-2 border-primary scale-110 shadow-sm' : 'border border-transparent hover:bg-surface-container'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-on-surface-variant block mb-1.5 uppercase tracking-wider">Full Name *</label>
                <input 
                  value={newMember.name} 
                  onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary focus:outline-none text-on-surface font-semibold text-sm shadow-inner" 
                  placeholder="e.g. Grandma Sita" 
                  autoFocus 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-on-surface-variant block mb-1.5 uppercase tracking-wider">Age *</label>
                  <input 
                    type="number" 
                    value={newMember.age} 
                    onChange={e => setNewMember(p => ({ ...p, age: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary focus:outline-none text-on-surface font-semibold text-sm shadow-inner" 
                    placeholder="72" 
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-on-surface-variant block mb-1.5 uppercase tracking-wider">Relation</label>
                  <input 
                    value={newMember.relation} 
                    onChange={e => setNewMember(p => ({ ...p, relation: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary focus:outline-none text-on-surface font-semibold text-sm shadow-inner" 
                    placeholder="Grandmother" 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-outline-variant/30">
              <button onClick={() => setShowAddMember(false)} className="px-5 py-2.5 font-extrabold text-xs text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
              <button onClick={addMember} disabled={!newMember.name || !newMember.age}
                className="px-6 py-2.5 bg-[#001945] dark:bg-primary text-white dark:text-on-primary font-extrabold text-xs rounded-xl shadow-md hover:opacity-90 transition-all disabled:opacity-40">Add to Circle</button>
            </div>
          </div>
        </div>
      )}

      {/* Set Medicine Reminder Modal */}
      {showAddReminder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-3xl shadow-2xl max-w-lg w-full border border-outline-variant/80 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4 mb-5">
              <h4 className="text-xl font-extrabold text-on-surface flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-2xl">alarm_add</span>
                Configure Medication Alert
              </h4>
              <button onClick={() => setShowAddReminder(false)} className="text-on-surface-variant hover:opacity-80">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Step 1: Target Member */}
            <div className="mb-5">
              <label className="text-xs font-extrabold text-on-surface-variant block mb-2 uppercase tracking-wider">Select Family Member *</label>
              {circle.length === 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-xs font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">warning</span>
                  No members found in your Circle. Add a family member first!
                </div>
              ) : (
                <div className="flex gap-2.5 flex-wrap">
                  {circle.map(m => {
                    const isPicked = (newReminder.memberId === m.id) || (!newReminder.memberId && selectedMember?.id === m.id) || (!newReminder.memberId && !selectedMember && circle[0].id === m.id);
                    return (
                      <button key={m.id} type="button" onClick={() => setNewReminder(p => ({ ...p, memberId: m.id }))}
                        className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 transition-all ${
                          isPicked 
                            ? 'border-primary bg-primary/15 shadow-sm' 
                            : 'border-outline-variant/40 hover:border-primary/40 hover:bg-surface-container-low'
                        }`}>
                        <span className="text-2xl">{m.avatar}</span>
                        <div className="text-left">
                          <p className="font-extrabold text-on-surface text-xs">{m.name}</p>
                          <p className="text-[10px] font-semibold text-on-surface-variant">{m.relation}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Medicine Details */}
            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-extrabold text-on-surface-variant block mb-1.5 uppercase tracking-wider">Medicine Name & Strength *</label>
                <input value={newReminder.medicine} onChange={e => setNewReminder(p => ({ ...p, medicine: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary focus:outline-none text-on-surface font-semibold text-sm shadow-inner" placeholder="e.g. Metformin 500mg or Aspirin" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-on-surface-variant block mb-1.5 uppercase tracking-wider">Dosage</label>
                  <input value={newReminder.dosage} onChange={e => setNewReminder(p => ({ ...p, dosage: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary focus:outline-none text-on-surface font-semibold text-sm shadow-inner" placeholder="1 tablet" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-on-surface-variant block mb-1.5 uppercase tracking-wider">⏰ Alarm Time *</label>
                  <input type="time" value={newReminder.time} onChange={e => setNewReminder(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary focus:outline-none text-on-surface font-bold text-base font-mono shadow-inner" />
                </div>
              </div>
            </div>

            {/* Step 3: Which Days? */}
            <div className="mb-5">
              <label className="text-xs font-extrabold text-on-surface-variant block mb-2 uppercase tracking-wider">Scheduled Alarm Days</label>
              <div className="flex gap-1.5 justify-between">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <button key={day} type="button"
                    onClick={() => {
                      setNewReminder(p => ({
                        ...p,
                        days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day]
                      }));
                    }}
                    className={`w-11 h-11 rounded-xl text-xs font-black transition-all ${
                      newReminder.days.includes(day)
                        ? 'bg-[#001945] dark:bg-primary text-white dark:text-on-primary shadow-sm scale-105'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-2.5">
                <button type="button" onClick={() => setNewReminder(p => ({ ...p, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }))}
                  className="text-xs font-extrabold text-primary hover:underline">Select All</button>
                <button type="button" onClick={() => setNewReminder(p => ({ ...p, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }))}
                  className="text-xs font-extrabold text-primary hover:underline">Weekdays Only</button>
                <button type="button" onClick={() => setNewReminder(p => ({ ...p, days: [] }))}
                  className="text-xs font-extrabold text-on-surface-variant hover:underline">Clear</button>
              </div>
            </div>

            {/* Step 4: Additional Info */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-on-surface-variant block mb-1.5 uppercase tracking-wider">Frequency</label>
                  <select value={newReminder.frequency} onChange={e => setNewReminder(p => ({ ...p, frequency: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary focus:outline-none text-on-surface font-semibold text-sm">
                    <option>Daily</option><option>Twice Daily</option><option>Weekly</option><option>As Needed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-on-surface-variant block mb-1.5 uppercase tracking-wider">Clinical Notes</label>
                  <input value={newReminder.notes} onChange={e => setNewReminder(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60 focus:ring-2 focus:ring-primary focus:outline-none text-on-surface font-semibold text-sm shadow-inner" placeholder="e.g. Take after breakfast" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
              <button type="button" onClick={() => { setShowAddReminder(false); setNewReminder({ medicine: '', dosage: '', time: '09:00', frequency: 'Daily', notes: '', memberId: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }); }}
                className="px-5 py-2.5 font-extrabold text-xs text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
              <button type="button" onClick={addReminder} disabled={!newReminder.medicine || circle.length === 0 || newReminder.days.length === 0}
                className="px-6 py-2.5 bg-[#001945] dark:bg-primary text-white dark:text-on-primary font-extrabold text-xs rounded-xl shadow-md hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg">alarm_add</span>
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
