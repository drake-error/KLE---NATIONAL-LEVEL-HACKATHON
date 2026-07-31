import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'resq_plus_settings';

const DEFAULT_SETTINGS = {
  profile: {
    fullName: 'Aarav Mehta',
    dob: '1994-04-12',
    mobileNumber: '+91 98200 11223',
    email: 'aarav@resqplus.app',
    homeAddress: '21 Marine Drive, Mumbai',
    preferredHospital: 'City General Hospital',
  },
  medical: {
    bloodGroup: 'O+',
    allergies: ['Penicillin', 'Peanuts', 'Latex'],
    chronicConditions: ['Mild Asthma', 'Hypertension (Controlled)'],
    medicalHistoryNotes: 'History of seasonal allergic rhinitis. Prescribed mild bronchodilator for exercise-induced asthma.',
    organDonor: true,
    dnrConsent: false,
  },
  contacts: [
    { id: '1', name: 'Priya Mehta', relationship: 'Spouse', phone: '+91 98200 88990', priority: 'Primary' },
    { id: '2', name: 'Dr. Rajesh Rao', relationship: 'Family Physician', phone: '+91 98211 33445', priority: 'Medical Specialist' },
    { id: '3', name: 'Rohan Mehta', relationship: 'Brother', phone: '+91 98199 44556', priority: 'Secondary' },
  ],
  notifications: {
    smsEmergencyAlerts: true,
    pushOnDispatch: true,
    automatedSosCalls: true,
    geofenceAlerts: true,
    weeklyHealthDigest: false,
    promotionalUpdates: false,
  },
  privacy: {
    liveGpsSharing: true,
    allowMedicalVaultAccess: true,
    anonymizedAnalytics: true,
    audioRecordingOnSos: false,
  },
  security: {
    twoFactorEnabled: true,
    activeSessions: [
      { id: 's1', device: 'Windows PC - Edge', location: 'Mumbai, IN', status: 'Current session (Active now)' },
      { id: 's2', device: 'iPhone 15 Pro - ResQ-Plus App', location: 'Mumbai, IN', status: 'Active 2 hours ago' },
    ],
  },
  plan: {
    tier: 'ResQ-Plus Pro Emergency Support',
    status: 'Active (Covered nationwide)',
    billingCycle: 'Annual ($99/year)',
    insuranceProvider: 'HDFC Ergo Health / Star Health',
    policyNumber: 'RESQ-IND-988401',
    paymentMethod: 'Visa ending in 4242',
  },
  region: {
    language: 'English (US)',
    timeZone: '(GMT+05:30) India Standard Time (IST)',
    dateFormat: 'DD-MM-YYYY',
    distanceUnit: 'Kilometers (km)',
    temperatureUnit: 'Celsius (°C)',
  }
};

export default function SettingsPage({ session, theme, setTheme }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse settings from localStorage', e);
    }
    const defaultData = { ...DEFAULT_SETTINGS };
    if (session?.user) {
      if (session.user.user_metadata?.full_name) {
        defaultData.profile.fullName = session.user.user_metadata.full_name;
      }
      if (session.user.email) {
        defaultData.profile.email = session.user.email;
      }
    }
    return defaultData;
  });

  const [initialSettings, setInitialSettings] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [hasChanges, setHasChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Temporary state for interactive elements
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relationship: '', phone: '', priority: 'Primary' });
  
  // Password change simulator
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const checkChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    setHasChanges(checkChanges);
  }, [settings, initialSettings]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setInitialSettings(JSON.parse(JSON.stringify(settings)));
      setHasChanges(false);
      triggerToast('Settings saved successfully to ResQ-Plus Emergency Vault!');
    } catch (err) {
      triggerToast('Failed to save settings. Please check your storage capacity.');
    }
  };

  const handleCancel = () => {
    setSettings(JSON.parse(JSON.stringify(initialSettings)));
    setHasChanges(false);
    triggerToast('Unsaved changes reverted to saved settings.');
  };

  const updateProfile = (field, value) => {
    setSettings(prev => ({ ...prev, profile: { ...prev.profile, [field]: value } }));
  };

  const updateMedical = (field, value) => {
    setSettings(prev => ({ ...prev, medical: { ...prev.medical, [field]: value } }));
  };

  const updateNotification = (field) => {
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [field]: !prev.notifications[field] } }));
  };

  const updatePrivacy = (field) => {
    setSettings(prev => ({ ...prev, privacy: { ...prev.privacy, [field]: !prev.privacy[field] } }));
  };

  const updateRegion = (field, value) => {
    setSettings(prev => ({ ...prev, region: { ...prev.region, [field]: value } }));
  };

  const addTag = (type, value, setVal) => {
    if (!value.trim()) return;
    setSettings(prev => {
      const list = prev.medical[type] || [];
      if (list.includes(value.trim())) return prev;
      return { ...prev, medical: { ...prev.medical, [type]: [...list, value.trim()] } };
    });
    setVal('');
  };

  const removeTag = (type, tagToRemove) => {
    setSettings(prev => ({
      ...prev,
      medical: { ...prev.medical, [type]: prev.medical[type].filter(t => t !== tagToRemove) }
    }));
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    const item = { ...newContact, id: Date.now().toString() };
    setSettings(prev => ({ ...prev, contacts: [...prev.contacts, item] }));
    setNewContact({ name: '', relationship: '', phone: '', priority: 'Primary' });
    setShowAddContactModal(false);
    triggerToast('Emergency contact added successfully.');
  };

  const deleteContact = (id) => {
    setSettings(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== id) }));
    triggerToast('Emergency contact removed.');
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `resq_plus_settings_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast('Emergency vault settings exported as JSON.');
  };

  const clearLocalData = () => {
    if (window.confirm("Are you sure you want to clear local saved settings? This will revert everything to default ResQ-Plus settings.")) {
      localStorage.removeItem(STORAGE_KEY);
      setSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
      setInitialSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
      setHasChanges(false);
      triggerToast('All local settings have been reset to factory defaults.');
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!passwords.current || !passwords.new) {
      setPasswordError('Please fill out both current and new password.');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswords({ current: '', new: '', confirm: '' });
    triggerToast('Security settings updated: Password changed successfully.');
  };

  const revokeSession = (id) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        activeSessions: prev.security.activeSessions.filter(s => s.id !== id)
      }
    }));
    triggerToast('Device session revoked successfully.');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'medical', label: 'Medical profile', icon: 'cardiology' },
    { id: 'contacts', label: 'Emergency contacts', icon: 'group' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'privacy', label: 'Privacy & consent', icon: 'verified_user' },
    { id: 'security', label: 'Security', icon: 'lock' },
    { id: 'plan', label: 'Plan & coverage', icon: 'workspace_premium' },
    { id: 'region', label: 'Language & region', icon: 'language' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-2 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-primary text-on-primary px-5 py-3 rounded-2xl shadow-xl border border-outline-variant flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="mb-8 pl-1">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#002764] dark:text-[#b0c6ff] tracking-tight mb-2">
          Settings
        </h1>
        <p className="text-on-surface-variant text-base font-medium max-w-3xl">
          Everything responders see about you in an emergency, and how ResQ-Plus contacts you.
        </p>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar Navigation Pills */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col space-y-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl font-bold transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-[#001b47] text-white dark:bg-[#b0c6ff] dark:text-[#001945] shadow-md scale-[1.01]'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${isActive ? 'text-blue-300 dark:text-[#001945]' : 'text-on-surface-variant'}`}>
                  {tab.icon}
                </span>
                <span className="text-base truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Card */}
        <div className="md:col-span-8 lg:col-span-9 bg-surface-container-lowest dark:bg-surface-container/40 border border-outline-variant/40 rounded-3xl p-6 md:p-8 shadow-sm transition-all duration-200 min-h-[500px] flex flex-col justify-between">
          
          <div className="space-y-6">
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <div>
                <div className="border-b border-outline-variant/30 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-on-surface mb-1">Profile</h2>
                  <p className="text-sm text-on-surface-variant">Shown to dispatchers and paramedics when you request help.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Full name</label>
                    <input
                      type="text"
                      value={settings.profile.fullName}
                      onChange={(e) => updateProfile('fullName', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm font-medium"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Date of birth</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={settings.profile.dob}
                        onChange={(e) => updateProfile('dob', e.target.value)}
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm font-medium pr-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Mobile number</label>
                    <input
                      type="text"
                      value={settings.profile.mobileNumber}
                      onChange={(e) => updateProfile('mobileNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm font-medium"
                      placeholder="+91 00000 00000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Email</label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => updateProfile('email', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm font-medium"
                      placeholder="email@resqplus.app"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Home address</label>
                    <input
                      type="text"
                      value={settings.profile.homeAddress}
                      onChange={(e) => updateProfile('homeAddress', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm font-medium"
                      placeholder="Street address, City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Preferred hospital</label>
                    <input
                      type="text"
                      value={settings.profile.preferredHospital}
                      onChange={(e) => updateProfile('preferredHospital', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:outline-none transition-all shadow-sm font-medium"
                      placeholder="Primary hospital name"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MEDICAL PROFILE */}
            {activeTab === 'medical' && (
              <div>
                <div className="border-b border-outline-variant/30 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-on-surface mb-1">Medical Profile</h2>
                  <p className="text-sm text-on-surface-variant">Crucial triage telemetry transmitted to emergency responders en route to your location.</p>
                </div>

                <div className="space-y-6">
                  <div className="max-w-xs">
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Blood Group</label>
                    <select
                      value={settings.medical.bloodGroup}
                      onChange={(e) => updateMedical('bloodGroup', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:outline-none shadow-sm font-bold text-lg text-primary"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown / Untested'].map(grp => (
                        <option key={grp} value={grp}>{grp}</option>
                      ))}
                    </select>
                  </div>

                  {/* Allergies */}
                  <div className="p-5 bg-surface-container-low/50 border border-outline-variant/30 rounded-2xl">
                    <label className="block text-sm font-bold text-on-surface mb-1">Known Allergies (Medications & Food)</label>
                    <p className="text-xs text-on-surface-variant mb-3">Add severe allergic sensitivities so paramedics avoid contraindicated treatments.</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {settings.medical.allergies.map(allergy => (
                        <span key={allergy} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-full font-bold text-sm">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          {allergy}
                          <button onClick={() => removeTag('allergies', allergy)} className="hover:opacity-70 ml-1 text-xs">✕</button>
                        </span>
                      ))}
                      {settings.medical.allergies.length === 0 && <span className="text-sm italic text-on-surface-variant/70">No allergies listed.</span>}
                    </div>

                    <div className="flex gap-2 max-w-md">
                      <input
                        type="text"
                        placeholder="Type allergy (e.g. Sulfa, Penicillin)..."
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('allergies', newAllergy, setNewAllergy); } }}
                        className="flex-1 px-4 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addTag('allergies', newAllergy, setNewAllergy)}
                        className="px-4 py-2 bg-[#002764] dark:bg-primary text-white dark:text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Chronic Conditions */}
                  <div className="p-5 bg-surface-container-low/50 border border-outline-variant/30 rounded-2xl">
                    <label className="block text-sm font-bold text-on-surface mb-1">Chronic Medical Conditions</label>
                    <p className="text-xs text-on-surface-variant mb-3">Pre-existing diagnoses (e.g., Diabetes Type 2, Pacemaker installed, Epilepsy).</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {settings.medical.chronicConditions.map(cond => (
                        <span key={cond} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded-full font-bold text-sm">
                          <span className="material-symbols-outlined text-sm">medical_information</span>
                          {cond}
                          <button onClick={() => removeTag('chronicConditions', cond)} className="hover:opacity-70 ml-1 text-xs">✕</button>
                        </span>
                      ))}
                      {settings.medical.chronicConditions.length === 0 && <span className="text-sm italic text-on-surface-variant/70">No chronic conditions listed.</span>}
                    </div>

                    <div className="flex gap-2 max-w-md">
                      <input
                        type="text"
                        placeholder="Type condition..."
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('chronicConditions', newCondition, setNewCondition); } }}
                        className="flex-1 px-4 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addTag('chronicConditions', newCondition, setNewCondition)}
                        className="px-4 py-2 bg-[#002764] dark:bg-primary text-white dark:text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Medical History Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Emergency Clinical Summary / Doctor Instructions</label>
                    <textarea
                      rows={3}
                      value={settings.medical.medicalHistoryNotes}
                      onChange={(e) => updateMedical('medicalHistoryNotes', e.target.value)}
                      className="w-full p-4 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:outline-none shadow-sm font-medium"
                      placeholder="Add any helpful medical context or specific instructions for EMS responders..."
                    />
                  </div>

                  {/* Organ Donor Toggle */}
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
                    <div>
                      <h4 className="font-bold text-on-surface">Registered Organ Donor</h4>
                      <p className="text-sm text-on-surface-variant">Displays donor badge directly on emergency responders' dispatch pads.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateMedical('organDonor', !settings.medical.organDonor)}
                      className={`w-14 h-8 rounded-full transition-colors relative p-1 ${settings.medical.organDonor ? 'bg-[#002764] dark:bg-primary' : 'bg-outline-variant'}`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${settings.medical.organDonor ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: EMERGENCY CONTACTS */}
            {activeTab === 'contacts' && (
              <div>
                <div className="border-b border-outline-variant/30 pb-4 mb-6 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-on-surface mb-1">Emergency Contacts</h2>
                    <p className="text-sm text-on-surface-variant">Trusted individuals alerted automatically via SMS & automated voice call when an SOS is triggered.</p>
                  </div>
                  <button
                    onClick={() => setShowAddContactModal(!showAddContactModal)}
                    className="px-4 py-2.5 bg-[#002764] dark:bg-primary text-white dark:text-on-primary rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">{showAddContactModal ? 'close' : 'person_add'}</span>
                    {showAddContactModal ? 'Cancel' : 'Add New Contact'}
                  </button>
                </div>

                {/* Add Contact inline modal */}
                {showAddContactModal && (
                  <form onSubmit={handleAddContact} className="p-6 bg-primary-container/10 border-2 border-primary/40 rounded-2xl mb-6 space-y-4 animate-fadeIn">
                    <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">contact_emergency</span>
                      Add Trusted Emergency Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Contact Full Name *</label>
                        <input
                          type="text"
                          required
                          value={newContact.name}
                          onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm"
                          placeholder="e.g. Priya Mehta"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Relationship *</label>
                        <input
                          type="text"
                          required
                          value={newContact.relationship}
                          onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm"
                          placeholder="e.g. Spouse, Parent, Brother, Physician"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Phone Number (with Country Code) *</label>
                        <input
                          type="text"
                          required
                          value={newContact.phone}
                          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm"
                          placeholder="+91 98000 00000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Alert Priority</label>
                        <select
                          value={newContact.priority}
                          onChange={(e) => setNewContact({ ...newContact, priority: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm font-bold"
                        >
                          <option value="Primary">Primary (First to receive automated call)</option>
                          <option value="Secondary">Secondary (SMS & GPS tracking alert)</option>
                          <option value="Medical Specialist">Medical Specialist (Sent patient vital snapshot)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button type="button" onClick={() => setShowAddContactModal(false)} className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-bold">Cancel</button>
                      <button type="submit" className="px-5 py-2 bg-[#002764] dark:bg-primary text-white dark:text-on-primary rounded-xl text-sm font-bold shadow-md">Save Contact</button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {settings.contacts.map((contact) => (
                    <div key={contact.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-surface-container-low/50 border border-outline-variant/40 rounded-2xl hover:border-primary/50 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase shrink-0">
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-lg text-on-surface">{contact.name}</h4>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              contact.priority === 'Primary' 
                                ? 'bg-primary/20 text-primary border border-primary/30' 
                                : 'bg-slate-200 dark:bg-slate-700 text-on-surface-variant'
                            }`}>
                              {contact.priority}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant">{contact.relationship} • <span className="font-mono font-bold text-on-surface">{contact.phone}</span></p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <a href={`tel:${contact.phone}`} className="p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors" title="Test Dial">
                          <span className="material-symbols-outlined">call</span>
                        </a>
                        <button onClick={() => deleteContact(contact.id)} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors" title="Remove Contact">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {settings.contacts.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-outline-variant rounded-3xl">
                      <span className="material-symbols-outlined text-4xl text-outline mb-2">person_off</span>
                      <p className="font-bold text-on-surface-variant">No emergency contacts configured.</p>
                      <p className="text-sm text-outline">Add at least one family member or doctor for SOS emergency dispatch alerts.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div>
                <div className="border-b border-outline-variant/30 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-on-surface mb-1">Notifications & SOS Triggers</h2>
                  <p className="text-sm text-on-surface-variant">Manage how ResQ-Plus communicates emergency events and system updates.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'smsEmergencyAlerts', title: 'SMS Emergency Dispatch Alerts', desc: 'Instantly transmit high-priority SMS containing live GPS tracker link to all emergency contacts upon SOS activation.' },
                    { id: 'pushOnDispatch', title: 'Real-time Paramedic Push Notifications', desc: 'Receive instant push updates when ambulance units change status (Assigned, En Route, Arriving, On Scene).' },
                    { id: 'automatedSosCalls', title: 'Automated AI Emergency Voice Calling', desc: 'Allow ResQ-Plus automated AI speech synthesizer to call Primary contacts if SMS confirmation is not acknowledged within 60 seconds.' },
                    { id: 'geofenceAlerts', title: 'Family Geofence Safety Alerts', desc: 'Notify emergency contacts when crossing designated high-risk medical geofence zones or leaving hospital vicinity.' },
                    { id: 'weeklyHealthDigest', title: 'Weekly Vault Health Analytics Digest', desc: 'Receive weekly automated health check summaries and sensor battery diagnostic reports via email.' },
                  ].map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-5 bg-surface-container-low/50 rounded-2xl border border-outline-variant/30 gap-4">
                      <div className="max-w-2xl">
                        <h4 className="font-bold text-on-surface text-base mb-0.5">{notif.title}</h4>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{notif.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateNotification(notif.id)}
                        className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 ${settings.notifications[notif.id] ? 'bg-[#002764] dark:bg-primary' : 'bg-outline-variant'}`}
                      >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${settings.notifications[notif.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: PRIVACY & CONSENT */}
            {activeTab === 'privacy' && (
              <div>
                <div className="border-b border-outline-variant/30 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-on-surface mb-1">Privacy & Consent</h2>
                  <p className="text-sm text-on-surface-variant">Control sensitive patient telemetry sharing, paramedic vault decrypting, and data ownership.</p>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    { id: 'liveGpsSharing', title: 'Live High-Precision GPS Telemetry Sharing', desc: 'Automatically grant real-time coordinates from smartphone or connected vehicular telematics to approaching ResQ-Plus responder fleet.' },
                    { id: 'allowMedicalVaultAccess', title: 'Emergency Responder Medical Vault Decryption', desc: 'Allow credentialed paramedics on active dispatch to view critical blood reports and allergy history 15 minutes before arrival.' },
                    { id: 'anonymizedAnalytics', title: 'Anonymized Clinical Quality & Response Time Research', desc: 'Contribute de-identified regional response timing data to public health and urban ambulance routing optimizations.' },
                    { id: 'audioRecordingOnSos', title: 'Automatic Microphone Diagnostic Capture on SOS', desc: 'Automatically record audio ambient background noise during active SOS dispatches for forensic and medical dispatcher evaluation.' },
                  ].map((priv) => (
                    <div key={priv.id} className="flex items-center justify-between p-5 bg-surface-container-low/50 rounded-2xl border border-outline-variant/30 gap-4">
                      <div className="max-w-2xl">
                        <h4 className="font-bold text-on-surface text-base mb-0.5">{priv.title}</h4>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{priv.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updatePrivacy(priv.id)}
                        className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 ${settings.privacy[priv.id] ? 'bg-[#002764] dark:bg-primary' : 'bg-outline-variant'}`}
                      >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${settings.privacy[priv.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Data Portability & Danger Zone */}
                <div className="border-t border-outline-variant/30 pt-6">
                  <h3 className="font-bold text-lg text-on-surface mb-3">Data Portability & Vault Cleanup</h3>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={exportData}
                      className="px-5 py-2.5 bg-surface-container-high hover:bg-outline-variant/30 text-on-surface rounded-xl font-bold text-sm flex items-center gap-2 transition-colors border border-outline-variant/50"
                    >
                      <span className="material-symbols-outlined text-primary text-lg">download</span>
                      Export Emergency Vault Data (JSON)
                    </button>
                    <button
                      onClick={clearLocalData}
                      className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete_forever</span>
                      Reset Saved Local Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: SECURITY */}
            {activeTab === 'security' && (
              <div>
                <div className="border-b border-outline-variant/30 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-on-surface mb-1">Security & Authentication</h2>
                  <p className="text-sm text-on-surface-variant">Protect your emergency vault credentials and manage active logged-in dispatch monitors.</p>
                </div>

                {/* 2FA Section */}
                <div className="mb-8 p-5 bg-surface-container-low/50 rounded-2xl border border-outline-variant/30 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-500">shield_lock</span>
                      <h4 className="font-bold text-on-surface text-base">Two-Factor Authentication (2FA)</h4>
                    </div>
                    <p className="text-sm text-on-surface-variant mt-1">Requires an SMS verification code or authenticator approval when accessing health records from new devices.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({ ...prev, security: { ...prev.security, twoFactorEnabled: !prev.security.twoFactorEnabled } }));
                      triggerToast(`2FA Security has been ${!settings.security.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
                    }}
                    className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 ${settings.security.twoFactorEnabled ? 'bg-[#002764] dark:bg-primary' : 'bg-outline-variant'}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${settings.security.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Password Change Form */}
                <div className="mb-8">
                  <h3 className="font-bold text-lg text-on-surface mb-4">Change Account Password</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg p-5 bg-surface-container-low/30 border border-outline-variant/40 rounded-2xl">
                    {passwordError && (
                      <p className="text-sm font-bold text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{passwordError}</p>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1">Current Password</label>
                      <input
                        type="password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1">New Password</label>
                      <input
                        type="password"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm"
                        placeholder="•••••••• (Min. 8 characters)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#002764] dark:bg-primary text-white dark:text-on-primary rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all"
                    >
                      Update Password
                    </button>
                  </form>
                </div>

                {/* Active Sessions */}
                <div>
                  <h3 className="font-bold text-lg text-on-surface mb-3">Active Logged-in Devices</h3>
                  <div className="space-y-3">
                    {settings.security.activeSessions.map((sess) => (
                      <div key={sess.id} className="flex items-center justify-between p-4 bg-surface-container-low/50 border border-outline-variant/40 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-2xl text-primary">devices</span>
                          <div>
                            <h5 className="font-bold text-on-surface">{sess.device}</h5>
                            <p className="text-xs text-on-surface-variant">{sess.location} • <span className="text-emerald-600 dark:text-emerald-400 font-bold">{sess.status}</span></p>
                          </div>
                        </div>
                        {sess.id !== 's1' ? (
                          <button
                            onClick={() => revokeSession(sess.id)}
                            className="text-xs px-3 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-300 font-bold rounded-lg hover:bg-rose-500/20 border border-rose-500/20"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-on-surface-variant px-3 py-1 bg-surface-container-high rounded-lg">This Device</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: PLAN & COVERAGE (BILLING) */}
            {activeTab === 'plan' && (
              <div>
                <div className="border-b border-outline-variant/30 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-on-surface mb-1">Plan & Emergency Coverage</h2>
                  <p className="text-sm text-on-surface-variant">Manage your ResQ-Plus emergency protection tier and hospital primary insurance records.</p>
                </div>

                {/* Active Tier Card */}
                <div className="p-6 bg-gradient-to-r from-[#002764] to-[#003c90] dark:from-primary/20 dark:to-primary/40 text-white rounded-3xl mb-8 shadow-md relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-emerald-500/30 text-emerald-200 text-xs font-extrabold tracking-wider rounded-full border border-emerald-400/30 uppercase mb-2">
                        {settings.plan.status}
                      </span>
                      <h3 className="text-2xl font-extrabold mb-1">{settings.plan.tier}</h3>
                      <p className="text-blue-100 dark:text-on-surface/90 text-sm max-w-xl">
                        Includes 24/7 dedicated AI command triage, sub-5 minute priority paramedic dispatch routing, and connected Smart-Traffic light clearance signals.
                      </p>
                    </div>
                    <div className="text-left md:text-right shrink-0">
                      <div className="text-2xl font-extrabold">₹1,999 / yr</div>
                      <p className="text-xs text-blue-200 mb-3">Next billing date: Jan 15, 2027</p>
                      <button
                        onClick={() => triggerToast('Your account is already on the top-tier Enterprise Protection Plan.')}
                        className="px-5 py-2 bg-white text-[#002764] hover:bg-blue-50 font-extrabold text-sm rounded-xl shadow-md transition-transform active:scale-95"
                      >
                        Manage Subscription
                      </button>
                    </div>
                  </div>
                </div>

                {/* Health Insurance Details */}
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-on-surface mb-3">Linked Health Insurance (For Instant Hospital Admission)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-surface-container-low/40 border border-outline-variant/40 rounded-2xl">
                    <div>
                      <label className="block text-sm font-semibold text-on-surface-variant mb-2">Primary Insurance Provider</label>
                      <input
                        type="text"
                        value={settings.plan.insuranceProvider}
                        onChange={(e) => setSettings(prev => ({ ...prev, plan: { ...prev.plan, insuranceProvider: e.target.value } }))}
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl font-bold"
                        placeholder="e.g. Star Health, ICICI Lombard, HDFC Ergo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-on-surface-variant mb-2">Policy Number / UHID</label>
                      <input
                        type="text"
                        value={settings.plan.policyNumber}
                        onChange={(e) => setSettings(prev => ({ ...prev, plan: { ...prev.plan, policyNumber: e.target.value } }))}
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl font-mono font-bold text-primary"
                        placeholder="Policy ID"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <h3 className="font-bold text-lg text-on-surface mb-3">Default Payment Method</h3>
                  <div className="flex items-center justify-between p-4 bg-surface-container-low/50 border border-outline-variant/40 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-3xl text-primary">credit_card</span>
                      <div>
                        <h4 className="font-bold text-on-surface">{settings.plan.paymentMethod}</h4>
                        <p className="text-xs text-on-surface-variant">Expires 09/28 • Automatic renewal enabled</p>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerToast('Redirecting to secure banking gateway simulation...')}
                      className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface font-bold text-xs rounded-xl"
                    >
                      Update Card
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: LANGUAGE & REGION */}
            {activeTab === 'region' && (
              <div>
                <div className="border-b border-outline-variant/30 pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-on-surface mb-1">Language & Region</h2>
                  <p className="text-sm text-on-surface-variant">Customize telemetry localization, units of measurement, and multilingual SOS voice prompts.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Interface & AI Voice Prompts Language</label>
                    <select
                      value={settings.region.language}
                      onChange={(e) => updateRegion('language', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface font-semibold"
                    >
                      {[
                        'English (US)', 'English (UK)', 'Hindi (हिन्दी)', 'Marathi (मराठी)', 
                        'Gujarati (ગુજરાતી)', 'Kannada (ಕನ್ನಡ)', 'Tamil (தமிழ்)', 'Spanish (Español)'
                      ].map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Time Zone</label>
                    <select
                      value={settings.region.timeZone}
                      onChange={(e) => updateRegion('timeZone', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface font-semibold"
                    >
                      {[
                        '(GMT+05:30) India Standard Time (IST)',
                        '(GMT+00:00) Universal Coordinated Time (UTC)',
                        '(GMT-05:00) Eastern Standard Time (EST)',
                        '(GMT-08:00) Pacific Standard Time (PST)',
                        '(GMT+01:00) Central European Time (CET)'
                      ].map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Date Format</label>
                    <select
                      value={settings.region.dateFormat}
                      onChange={(e) => updateRegion('dateFormat', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface font-semibold"
                    >
                      <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 12-04-1994)</option>
                      <option value="MM-DD-YYYY">MM-DD-YYYY (e.g. 04-12-1994)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 1994-04-12)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Distance Unit (Dispatch Navigation)</label>
                    <select
                      value={settings.region.distanceUnit}
                      onChange={(e) => updateRegion('distanceUnit', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface font-semibold"
                    >
                      <option value="Kilometers (km)">Kilometers (km)</option>
                      <option value="Miles (mi)">Miles (mi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-on-surface-variant mb-2">Temperature Unit (Body Vitals Monitoring)</label>
                    <select
                      value={settings.region.temperatureUnit}
                      onChange={(e) => updateRegion('temperatureUnit', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-on-surface font-semibold"
                    >
                      <option value="Celsius (°C)">Celsius (°C)</option>
                      <option value="Fahrenheit (°F)">Fahrenheit (°F)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Action Footer */}
          <div className="mt-12 pt-6 border-t border-outline-variant/30 flex items-center justify-between flex-wrap gap-4">
            <div>
              {hasChanges ? (
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Unsaved changes pending
                </span>
              ) : (
                <span className="text-sm font-medium text-on-surface-variant/70 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-500">check</span>
                  All changes synced with local vault
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={!hasChanges}
                className={`px-6 py-2.5 rounded-xl font-extrabold text-sm border transition-all ${
                  hasChanges 
                    ? 'border-outline-variant text-on-surface hover:bg-surface-container-low active:scale-95' 
                    : 'border-outline-variant/30 text-outline cursor-not-allowed opacity-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`px-7 py-2.5 rounded-xl font-extrabold text-sm text-white shadow-md transition-all ${
                  hasChanges
                    ? 'bg-[#002764] dark:bg-primary hover:bg-[#001b47] active:scale-95 animate-pulse'
                    : 'bg-[#002764]/80 dark:bg-primary/80 hover:bg-[#002764] active:scale-95'
                }`}
              >
                Save changes
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
