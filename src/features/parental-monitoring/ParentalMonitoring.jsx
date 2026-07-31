import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export default function ParentalMonitoring({ session }) {
  // Mode: 'primary' (my care circle) or 'caregiver' (monitoring someone else)
  const [mode, setMode] = useState('primary');
  
  // Data State
  const [circle, setCircle] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [voiceBlob, setVoiceBlob] = useState(null);
  
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
  
  const [newMember, setNewMember] = useState({ name: '', age: '', relation: '', avatar: '👤' });
  const [newReminder, setNewReminder] = useState({ medicine: '', dosage: '', time: '08:00', frequency: 'Daily', notes: '', memberId: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] });

  const [alarmActive, setAlarmActive] = useState(false);
  const [soundedAlarms, setSoundedAlarms] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceAudioRef = useRef(null);
  const alarmTimeoutRef = useRef(null);

  // Helper to get active user ID based on mode
  const getActiveUserId = () => {
    if (mode === 'primary') return session?.user?.id;
    return linkedPatientId;
  };

  // 1. Fetch Data from Supabase
  const loadData = useCallback(async () => {
    const userId = getActiveUserId();
    if (!userId) return;

    try {
      // Fetch Circle
      const { data: circleData } = await supabase.from('circle_members').select('*').eq('user_id', userId);
      if (circleData) setCircle(circleData);

      // Fetch Reminders
      const { data: remData } = await supabase.from('medicine_reminders').select('*').eq('user_id', userId);
      if (remData) setReminders(remData);

      // Fetch Profile (Voice + Access Code)
      const { data: profile } = await supabase.from('monitoring_profiles').select('*').eq('user_id', userId).single();
      if (profile) {
        setVoiceBlob(profile.voice_blob);
        if (mode === 'primary') setAccessCode(profile.access_code);
      } else if (mode === 'primary') {
        // Generate new profile with access code for primary user
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await supabase.from('monitoring_profiles').insert([{ user_id: userId, access_code: newCode }]);
        setAccessCode(newCode);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, [mode, session, linkedPatientId]);

  useEffect(() => {
    if (session) {
      // Check if we are already linked to someone as a caregiver
      const checkLink = async () => {
        const { data } = await supabase.from('caregiver_links').select('patient_id').eq('caregiver_id', session.user.id).single();
        if (data) {
          setLinkedPatientId(data.patient_id);
          // Optional: Fetch patient name from profiles if needed
          setLinkedPatientName('Linked Profile'); 
        }
        loadData();
      };
      checkLink();
    }
  }, [session, loadData]);

  // Handle Caregiver Link
  const handleLinkCaregiver = async () => {
    if (!caregiverInput) return;
    setIsLinking(true);
    try {
      // Find patient by access code
      const { data: patient } = await supabase.from('monitoring_profiles').select('user_id').eq('access_code', caregiverInput).single();
      if (patient) {
        // Create link
        await supabase.from('caregiver_links').upsert({ caregiver_id: session.user.id, patient_id: patient.user_id });
        setLinkedPatientId(patient.user_id);
        setLinkedPatientName('Linked Profile');
        alert('Successfully linked to loved one!');
        loadData();
      } else {
        alert('Invalid access code.');
      }
    } catch (err) {
      alert('Failed to link. Make sure the code is correct.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (confirm('Are you sure you want to unlink from this profile?')) {
      await supabase.from('caregiver_links').delete().eq('caregiver_id', session.user.id);
      setLinkedPatientId(null);
      setCircle([]);
      setReminders([]);
      setVoiceBlob(null);
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
    if (!voiceBlob) return;
    stopAlarm();

    const audio = new Audio(voiceBlob);
    audio.loop = true;
    voiceAudioRef.current = audio;

    audio.play().catch(err => {
      console.warn("Auto-play blocked by browser. Alarm will sound on next click.");
    });
    setAlarmActive(true);

    alarmTimeoutRef.current = setTimeout(() => {
      stopAlarm();
    }, 60000);
  };

  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newAlerts = [];

      reminders.forEach(r => {
        if (r.status === 'pending' && r.time <= currentTime) {
          const member = circle.find(m => m.id === r.member_id);
          if (member) {
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
    checkAlerts();
    const interval = setInterval(checkAlerts, 5000);
    return () => {
      clearInterval(interval);
      if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    };
  }, [reminders, circle, soundedAlarms, voiceBlob]);

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
          // Save to Supabase
          if (mode === 'primary') {
            await supabase.from('monitoring_profiles').update({ voice_blob: base64data }).eq('user_id', session.user.id);
          }
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

  const handleDeleteVoice = async () => {
    setVoiceBlob(null);
    if (mode === 'primary') {
      await supabase.from('monitoring_profiles').update({ voice_blob: null }).eq('user_id', session.user.id);
    }
  }

  // CRUD
  const addMember = async () => {
    if (!newMember.name || !newMember.age) return;
    const userId = getActiveUserId();
    const member = {
      user_id: userId,
      name: newMember.name,
      age: parseInt(newMember.age),
      relation: newMember.relation || 'Family',
      avatar: newMember.avatar,
      status: 'active',
      last_check_in: Date.now(),
    };
    
    const { data } = await supabase.from('circle_members').insert([member]).select();
    if (data) {
      setCircle(prev => [...prev, data[0]]);
    }
    setNewMember({ name: '', age: '', relation: '', avatar: '👤' });
    setShowAddMember(false);
  };

  const addReminder = async () => {
    const targetMemberId = newReminder.memberId || selectedMember?.id;
    if (!newReminder.medicine || !targetMemberId) return;
    const userId = getActiveUserId();

    const reminder = {
      user_id: userId,
      member_id: targetMemberId,
      medicine: newReminder.medicine,
      dosage: newReminder.dosage || '1 tablet',
      time: newReminder.time,
      frequency: newReminder.frequency,
      days: newReminder.days,
      status: 'pending',
      notes: newReminder.notes,
    };

    const { data } = await supabase.from('medicine_reminders').insert([reminder]).select();
    if (data) {
      setReminders(prev => [...prev, data[0]]);
    }
    setNewReminder({ medicine: '', dosage: '', time: '08:00', frequency: 'Daily', notes: '', memberId: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] });
    setShowAddReminder(false);
  };

  const updateReminderStatus = async (id, status) => {
    await supabase.from('medicine_reminders').update({ status }).eq('id', id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    stopAlarm();
  };

  const resetAllReminders = async () => {
    const userId = getActiveUserId();
    await supabase.from('medicine_reminders').update({ status: 'pending' }).eq('user_id', userId);
    setReminders(prev => prev.map(r => ({ ...r, status: 'pending' })));
  };

  const removeMember = async (id) => {
    if (confirm('Remove this member and all their reminders?')) {
      await supabase.from('circle_members').delete().eq('id', id);
      setCircle(prev => prev.filter(m => m.id !== id));
      setReminders(prev => prev.filter(r => r.member_id !== id));
      if (selectedMember?.id === id) setSelectedMember(null);
    }
  };

  const removeReminder = async (id) => {
    await supabase.from('medicine_reminders').delete().eq('id', id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const doCheckIn = async (id) => {
    const now = Date.now();
    await supabase.from('circle_members').update({ last_check_in: now, status: 'active' }).eq('id', id);
    setCircle(prev => prev.map(m => m.id === id ? { ...m, last_check_in: now, status: 'active' } : m));
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
    const diff = Date.now() - member.last_check_in;
    if (diff < 3600000) return 'text-secondary';
    if (diff < 14400000) return 'text-tertiary-fixed-dim';
    return 'text-status-emergency';
  };

  const getStatusLabel = (member) => {
    const diff = Date.now() - member.last_check_in;
    if (diff < 3600000) return 'Active';
    if (diff < 14400000) return 'Idle';
    return '⚠️ Inactive';
  };

  const memberReminders = selectedMember 
    ? reminders.filter(r => r.member_id === selectedMember.id)
    : reminders;

  const avatarOptions = ['👤', '👵', '👴', '👩', '👨', '👧', '👦', '🧓', '👩‍🦳', '👨‍🦳'];

  if (!session) {
    return <div className="p-xl text-center font-bold">Please log in to access Parental Monitoring.</div>;
  }

  return (
    <div className="flex-1 flex flex-col gap-md max-w-7xl mx-auto w-full pb-xl">

      {/* Mode Switcher */}
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-sm flex gap-2 w-fit mx-auto shadow-sm">
        <button 
          onClick={() => setMode('primary')}
          className={`px-6 py-2 rounded-xl font-bold text-label-md transition-all ${mode === 'primary' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface hover:bg-surface-container-low'}`}>
          My Care Circle
        </button>
        <button 
          onClick={() => setMode('caregiver')}
          className={`px-6 py-2 rounded-xl font-bold text-label-md transition-all ${mode === 'caregiver' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface hover:bg-surface-container-low'}`}>
          Monitor a Loved One
        </button>
      </div>

      {mode === 'primary' && accessCode && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-md flex items-center justify-between shadow-sm">
          <div>
            <h3 className="font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">vpn_key</span>
              Your Caregiver Access Code
            </h3>
            <p className="text-body-sm text-on-surface-variant mt-1">Share this code with your caretaker so they can monitor your reminders remotely.</p>
          </div>
          <div className="bg-surface px-4 py-2 rounded-lg border border-primary/30 font-mono text-xl font-black text-on-surface tracking-widest select-all">
            {accessCode}
          </div>
        </div>
      )}

      {mode === 'caregiver' && !linkedPatientId && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-xl text-center max-w-md mx-auto mt-xl shadow-md">
          <span className="material-symbols-outlined text-primary text-5xl mb-4">link</span>
          <h3 className="font-headline-sm font-bold text-on-surface mb-2">Link to a Loved One</h3>
          <p className="text-body-sm text-on-surface-variant mb-6">Enter the 6-character Caregiver Access Code generated on their account to monitor their medicines.</p>
          <input 
            value={caregiverInput}
            onChange={e => setCaregiverInput(e.target.value.toUpperCase())}
            placeholder="e.g. MOM-7B9X"
            className="w-full text-center text-xl tracking-widest font-mono font-bold px-4 py-3 bg-surface-container rounded-xl border border-outline mb-4 focus:border-primary outline-none uppercase"
          />
          <button 
            onClick={handleLinkCaregiver} disabled={!caregiverInput || isLinking}
            className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50">
            {isLinking ? 'Linking...' : 'Connect to Circle'}
          </button>
        </div>
      )}

      {/* Show Content Only if Primary, OR if Caregiver and Linked */}
      {(mode === 'primary' || (mode === 'caregiver' && linkedPatientId)) && (
        <>
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
                      <button onClick={() => { updateReminderStatus(alert.reminder.id, 'taken'); playVoiceReminder(); }}
                        className="px-3 py-1 bg-secondary text-on-secondary text-label-sm font-bold rounded-lg hover:bg-secondary/80 transition-colors">
                        ✅ Taken
                      </button>
                      <button onClick={() => updateReminderStatus(alert.reminder.id, 'missed')}
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
                {mode === 'caregiver' ? 'Monitoring Loved One' : 'Parental Monitoring'}
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                {circle.length} member{circle.length !== 1 ? 's' : ''} in the circle
              </p>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'caregiver' && (
                <button onClick={handleUnlink} className="px-3 py-1.5 text-status-emergency bg-error-container/20 font-bold border border-status-emergency/20 rounded-xl hover:bg-error-container/40 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">link_off</span> Unlink
                </button>
              )}
              <button onClick={() => setShowAddReminder(true)} className="px-4 py-2 bg-primary text-on-primary text-label-md font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-md">
                <span className="material-symbols-outlined text-[18px]">alarm_add</span>
                Set Reminder
              </button>
              <button onClick={resetAllReminders} className="px-3 py-1.5 text-label-sm font-bold border border-outline-variant rounded-xl text-on-surface hover:bg-surface-container-low transition-colors">
                Reset Today
              </button>
            </div>
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
                    {mode === 'primary' && (
                      <button onClick={handleDeleteVoice} className="px-3 py-1.5 text-on-surface-variant font-bold text-label-sm rounded-xl hover:bg-surface-container-low transition-colors">
                        Delete
                      </button>
                    )}
                  </>
                )}
                {mode === 'primary' && (
                  isRecording ? (
                    <button onClick={stopRecording} className="px-4 py-2 bg-status-emergency text-white font-bold text-label-sm rounded-xl hover:bg-status-emergency/80 transition-colors flex items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-[16px]">stop</span> Stop Recording
                    </button>
                  ) : (
                    <button onClick={startRecording} className="px-4 py-2 bg-primary text-on-primary font-bold text-label-sm rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">mic</span> {voiceBlob ? 'Re-record' : 'Record Voice'}
                    </button>
                  )
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
                        <p className="text-[10px] text-on-surface-variant">{getTimeAgo(member.last_check_in)}</p>
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
                  <button onClick={() => setShowAddReminder(true)}
                    className="px-3 py-1.5 bg-primary text-on-primary text-label-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">alarm_add</span>
                    Set Reminder
                  </button>
                </div>

                <div className="space-y-2">
                  {memberReminders.map(r => {
                    const member = circle.find(m => m.id === r.member_id);
                    return (
                      <div key={r.id} className={`flex items-center gap-sm p-sm rounded-xl border transition-all group ${
                        r.status === 'taken' ? 'bg-secondary/5 border-secondary/20' :
                        r.status === 'missed' ? 'bg-status-emergency/5 border-status-emergency/20' :
                        'bg-surface border-outline-variant hover:border-primary/30'
                      }`}>
                        {/* Time */}
                        <div className="w-16 text-center shrink-0">
                          <p className="text-lg font-black text-on-surface">{r.time}</p>
                          <p className="text-[10px] text-on-surface-variant font-bold">{r.days ? r.days.join(', ') : r.frequency}</p>
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
                              <button onClick={() => { updateReminderStatus(r.id, 'taken'); playVoiceReminder(); }}
                                className="px-3 py-1 bg-secondary text-on-secondary text-label-sm font-bold rounded-lg hover:bg-secondary/80 transition-colors">
                                ✅ Taken
                              </button>
                              <button onClick={() => updateReminderStatus(r.id, 'missed')}
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
        </>
      )}

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

      {/* Set Reminder Modal */}
      {showAddReminder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm p-md">
          <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-2xl max-w-lg w-full border border-outline-variant max-h-[90vh] overflow-y-auto">
            <h4 className="font-headline-md text-on-surface font-bold flex items-center gap-2 mb-md">
              <span className="material-symbols-outlined text-primary text-[28px]">alarm_add</span>
              Set Medicine Reminder
            </h4>

            {/* Step 1: Who is this for? */}
            <div className="mb-md">
              <label className="text-label-sm font-bold text-on-surface-variant block mb-2">Who is this reminder for? *</label>
              {circle.length === 0 ? (
                <div className="bg-status-emergency/10 border border-status-emergency/20 p-sm rounded-xl text-body-sm text-status-emergency font-bold">
                  ⚠️ No members in your Circle of Trust. Add a member first before setting reminders.
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {circle.map(m => (
                    <button key={m.id} onClick={() => setNewReminder(p => ({ ...p, memberId: m.id }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                        newReminder.memberId === m.id 
                          ? 'border-primary bg-primary/10 shadow-sm' 
                          : 'border-outline-variant hover:border-primary/40 hover:bg-surface-container-low'
                      }`}>
                      <span className="text-2xl">{m.avatar}</span>
                      <div className="text-left">
                        <p className="font-bold text-on-surface text-label-md">{m.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{m.relation}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Medicine Details */}
            <div className="mb-md space-y-sm">
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Medicine Name *</label>
                <input value={newReminder.medicine} onChange={e => setNewReminder(p => ({ ...p, medicine: e.target.value }))}
                  className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="e.g. Metformin 500mg" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Dosage</label>
                  <input value={newReminder.dosage} onChange={e => setNewReminder(p => ({ ...p, dosage: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="1 tablet" />
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">⏰ Alarm Time *</label>
                  <input type="time" value={newReminder.time} onChange={e => setNewReminder(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface text-lg font-bold" />
                </div>
              </div>
            </div>

            {/* Step 3: Which Days? */}
            <div className="mb-md">
              <label className="text-label-sm font-bold text-on-surface-variant block mb-2">Which days should this alarm ring?</label>
              <div className="flex gap-1.5">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <button key={day}
                    onClick={() => {
                      setNewReminder(p => ({
                        ...p,
                        days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day]
                      }));
                    }}
                    className={`w-11 h-11 rounded-full text-label-sm font-bold transition-all ${
                      newReminder.days.includes(day)
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setNewReminder(p => ({ ...p, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }))}
                  className="text-[11px] font-bold text-primary hover:underline">Select All</button>
                <button onClick={() => setNewReminder(p => ({ ...p, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }))}
                  className="text-[11px] font-bold text-primary hover:underline">Weekdays Only</button>
                <button onClick={() => setNewReminder(p => ({ ...p, days: [] }))}
                  className="text-[11px] font-bold text-on-surface-variant hover:underline">Clear</button>
              </div>
            </div>

            {/* Step 4: Additional Info */}
            <div className="mb-md space-y-sm">
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Frequency</label>
                  <select value={newReminder.frequency} onChange={e => setNewReminder(p => ({ ...p, frequency: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface">
                    <option>Daily</option><option>Twice Daily</option><option>Weekly</option><option>As Needed</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Notes</label>
                  <input value={newReminder.notes} onChange={e => setNewReminder(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface" placeholder="Take after breakfast" />
                </div>
              </div>
            </div>

            {/* Voice Reminder Info */}
            <div className="mb-md p-sm rounded-xl bg-primary-fixed/10 border border-primary/15">
              <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">record_voice_over</span>
                {voiceBlob 
                  ? '✅ Your voice will play as an alarm when this reminder triggers.' 
                  : '💡 Record your voice above to use it as a personalized alarm sound.'}
              </p>
            </div>

            <div className="flex justify-end gap-sm">
              <button onClick={() => { setShowAddReminder(false); setNewReminder({ medicine: '', dosage: '', time: '08:00', frequency: 'Daily', notes: '', memberId: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }); }}
                className="px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">Cancel</button>
              <button onClick={addReminder} disabled={!newReminder.medicine || !newReminder.memberId || newReminder.days.length === 0}
                className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">alarm_add</span>
                Set Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
