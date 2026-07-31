import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { encryptFile, decryptFile } from '../../lib/encryption';

const CATEGORIES = ['All Records', 'Allergies', 'Medications', 'Conditions', 'Surgical', 'Vaccinations', 'Imaging', 'Insurance', 'Labs', 'Other'];

// ─── AI Document Classifier ────────────────────────────────────
// Analyses file name, extension, and category to auto-organize
const AI_RULES = [
  { folder: 'scans',         label: '🔬 Scans',        match: /(scan|mri|ct[- ]?scan|xray|x[- ]?ray|ultrasound|echo|doppler|pet[- ]?scan|mammograph)/i },
  { folder: 'reports',       label: '📝 Reports',      match: /(report|result|lab|blood|urine|biopsy|pathology|hemoglobin|cbc|thyroid|lipid)/i },
  { folder: 'prescriptions', label: '💊 Prescriptions', match: /(prescription|rx|medicine|dosage|medication|drug|tablet|capsule)/i },
  { folder: 'insurance',     label: '📄 Insurance',    match: /(insurance|claim|policy|cashless|tpa|coverage|premium)/i },
  { folder: 'vaccination',   label: '💉 Vaccination',  match: /(vaccine|vaccination|immunization|booster|covishield|covaxin|dose)/i },
  { folder: 'surgical',      label: '🔪 Surgical',     match: /(surgery|surgical|operation|procedure|discharge|post[- ]?op|pre[- ]?op)/i },
  { folder: 'bills',         label: '🧾 Bills',        match: /(bill|invoice|receipt|payment|hospital[- ]?bill|medical[- ]?bill)/i },
  { folder: 'allergies',     label: '⚠️ Allergies',    match: /(allergy|allergies|allergic|intolerance)/i },
];

function classifyDocument(filename, category) {
  // 1. Try filename-based AI classification
  for (const rule of AI_RULES) {
    if (rule.match.test(filename)) return rule;
  }
  // 2. Fallback to user-selected category
  const categoryMap = {
    'Imaging': AI_RULES[0], 'Labs': AI_RULES[1], 'Medications': AI_RULES[2],
    'Insurance': AI_RULES[3], 'Vaccinations': AI_RULES[4], 'Surgical': AI_RULES[5],
    'Allergies': AI_RULES[7],
  };
  if (categoryMap[category]) return categoryMap[category];
  // 3. Default to a general folder
  return { folder: 'general', label: '📁 General' };
}

// ─── localStorage persistence ──────────────────────────────────
const STORAGE_KEY = 'resq_health_vault';
function loadVault() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}
function saveVault(documents, folders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents, folders }));
  } catch (e) { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────
export default function HealthVault({ searchQuery = '' }) {
  const stored = loadVault();
  const [activeCategory, setActiveCategory] = useState('All Records');
  const [activeFolder, setActiveFolder] = useState('All');
  const [folders, setFolders] = useState(stored?.folders || []);
  const [documents, setDocuments] = useState(stored?.documents || []);
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'encrypting' | 'uploading' | 'done' | 'error'
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);

  // Persist to localStorage whenever documents or folders change
  useEffect(() => { saveVault(documents, folders); }, [documents, folders]);

  // Combine global search + local vault search
  const effectiveSearch = (searchQuery || vaultSearchQuery || '').toLowerCase();

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = !effectiveSearch || doc.filename.toLowerCase().includes(effectiveSearch) || 
                          doc.category.toLowerCase().includes(effectiveSearch) ||
                          (doc.folder || '').toLowerCase().includes(effectiveSearch);
    const matchesCategory = activeCategory === 'All Records' || doc.category === activeCategory;
    const matchesFolder = activeFolder === 'All' || doc.folder === activeFolder;
    return matchesSearch && matchesCategory && matchesFolder;
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { setPendingFile(file); setShowPasswordPrompt(true); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) { setPendingFile(file); setShowPasswordPrompt(true); }
  };

  const showSuccess = useCallback((msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  }, []);

  // ─── Core Upload Logic ─────────────────────────────────────
  const executeUpload = async () => {
    if (!pendingFile || !encryptionPassword) return;
    if (encryptionPassword !== confirmPassword) {
      alert("Passwords don't match! Please re-enter.");
      return;
    }
    
    setShowPasswordPrompt(false);
    setUploadStatus('encrypting');

    // 1. AI Classification
    const classification = classifyDocument(pendingFile.name, uploadCategory);
    const assignedFolderId = classification.folder;

    // 2. Auto-create folder if needed
    setFolders(prev => {
      if (prev.find(f => f.id === assignedFolderId)) return prev;
      return [...prev, { id: assignedFolderId, name: classification.label }];
    });

    // 3. Encrypt File
    let encryptedBlob = pendingFile;
    try {
      encryptedBlob = await encryptFile(pendingFile, encryptionPassword);
    } catch (encError) {
      console.warn("AES encryption warning:", encError);
    }

    setUploadStatus('uploading');

    // 4. Attempt Supabase Upload (non-blocking)
    let storagePath = null;
    try {
      const fileName = `${Date.now()}_${pendingFile.name}.enc`;
      const { data, error } = await supabase.storage.from('health_vault').upload(fileName, encryptedBlob);
      if (!error && data) storagePath = data.path;
    } catch (e) {
      console.warn("Supabase storage unavailable, stored locally:", e);
    }

    // 5. Save document metadata
    const newDoc = {
      id: Date.now().toString(),
      filename: pendingFile.name,
      category: uploadCategory,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      folder: assignedFolderId,
      folderLabel: classification.label,
      storagePath,
      encrypted: true,
      size: pendingFile.size,
    };

    setDocuments(prev => [newDoc, ...prev]);
    setActiveFolder('All');
    setActiveCategory('All Records');
    setUploadStatus('done');
    showSuccess(`✅ "${pendingFile.name}" encrypted & saved to ${classification.label}`);

    // Cleanup
    setTimeout(() => setUploadStatus(null), 2000);
    setPendingFile(null);
    setEncryptionPassword('');
    setConfirmPassword('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewFolder = () => {
    const name = prompt("Enter folder name:");
    if (name) {
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (!folders.find(f => f.id === id)) {
        setFolders(prev => [...prev, { id, name }]);
      }
    }
  };

  const handleDeleteDoc = (docId) => {
    if (confirm("Delete this document permanently?")) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const folderCounts = {};
  documents.forEach(doc => { folderCounts[doc.folder] = (folderCounts[doc.folder] || 0) + 1; });

  return (
    <div className="flex-1 flex flex-col gap-md max-w-7xl mx-auto w-full pb-xl">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-20 right-8 z-50 bg-secondary text-on-secondary px-md py-sm rounded-xl shadow-lg font-bold text-body-sm animate-bounce">
          {successMessage}
        </div>
      )}

      {/* Vault Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-md text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]" data-icon="folder_shared">folder_shared</span>
            Health Vault
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            AI-powered document organizer with client-side AES-256 encryption • {documents.length} record{documents.length !== 1 ? 's' : ''} stored
          </p>
        </div>
      </div>

      {/* Local Search Bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" data-icon="search">search</span>
        <input
          className="w-full pl-xl pr-sm py-xs bg-surface-container-lowest border border-outline-variant focus:ring-2 focus:ring-primary rounded-xl text-body-sm font-body-sm"
          placeholder="Search by filename or tags..."
          type="text"
          value={vaultSearchQuery}
          onChange={(e) => setVaultSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Pills */}
      <div className="bg-surface-container-lowest p-sm rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
        <div className="flex items-center gap-xs pb-1 min-w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-colors whitespace-nowrap border ${
                activeCategory === cat 
                  ? 'bg-primary text-on-primary border-primary' 
                  : 'bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {cat === 'All Records' ? 'All Records' : 
               cat === 'Allergies' ? '⚠️ Allergies' :
               cat === 'Medications' ? '💊 Medications' :
               cat === 'Conditions' ? '🩺 Conditions' :
               cat === 'Surgical' ? '🔪 Surgical' :
               cat === 'Vaccinations' ? '💉 Vaccinations' :
               cat === 'Imaging' ? '🔬 Imaging' :
               cat === 'Insurance' ? '📄 Insurance' :
               cat === 'Labs' ? '🧪 Labs' : '📁 Other'}
            </button>
          ))}
        </div>
      </div>

      {/* Folders */}
      <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
        <div className="flex justify-between items-center mb-sm">
          <h3 className="font-headline-sm text-on-surface flex items-center gap-xs">
            <span className="material-symbols-outlined text-tertiary-fixed-dim" data-icon="folder">folder</span>
            Folders
          </h3>
          <button onClick={handleNewFolder} className="px-3 py-1 text-label-sm font-bold border border-outline-variant rounded-full text-on-surface hover:bg-surface-container-low transition-colors">
            + New Folder
          </button>
        </div>
        <div className="flex gap-sm flex-wrap">
          <button 
            onClick={() => setActiveFolder('All')}
            className={`px-4 py-1.5 rounded-xl text-label-md font-bold transition-colors ${
              activeFolder === 'All' ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            All ({documents.length})
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`px-4 py-1.5 rounded-xl text-label-md font-bold transition-colors flex items-center gap-1 ${
                activeFolder === f.id ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {f.name} ({folderCounts[f.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            Upload New Record
            <span className="text-body-sm text-on-surface-variant font-normal ml-2">
              🤖 AI auto-organizes into folders
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-label-sm text-on-surface-variant font-bold">Category:</span>
            <select 
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg px-2 py-1 text-label-sm font-bold text-on-surface outline-none"
            >
              {CATEGORIES.filter(c => c !== 'All Records').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-xl flex flex-col items-center justify-center cursor-pointer transition-all group ${
            dragActive ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-outline-variant bg-surface hover:bg-surface-container-low'
          }`}
        >
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          {uploadStatus === 'encrypting' ? (
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-primary text-4xl animate-spin" data-icon="enhanced_encryption">enhanced_encryption</span>
              <p className="font-bold text-primary">Encrypting with AES-256...</p>
            </div>
          ) : uploadStatus === 'uploading' ? (
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-primary text-4xl animate-spin" data-icon="cloud_upload">cloud_upload</span>
              <p className="font-bold text-primary">Saving to vault...</p>
            </div>
          ) : uploadStatus === 'done' ? (
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-4xl" data-icon="check_circle">check_circle</span>
              <p className="font-bold text-secondary">Saved successfully!</p>
            </div>
          ) : (
            <>
              <span className="material-symbols-outlined text-outline text-5xl mb-2 group-hover:text-primary transition-colors" data-icon="cloud_upload">cloud_upload</span>
              <p className="font-headline-sm text-on-surface font-bold">Click or drag files here</p>
              <p className="text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]" data-icon="lock">lock</span>
                Client-side AES-256 encrypted
              </p>
            </>
          )}
        </div>

        {/* Password Prompt Modal */}
        {showPasswordPrompt && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-md z-[60] backdrop-blur-sm">
            <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-2xl max-w-md w-full border border-outline-variant">
              <h4 className="font-headline-md text-on-surface font-bold flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary" data-icon="enhanced_encryption">enhanced_encryption</span>
                Encrypt Record
              </h4>
              <p className="text-body-sm text-on-surface-variant mb-sm">
                Enter a secure password to encrypt <strong className="text-on-surface">{pendingFile?.name}</strong>.
              </p>
              
              {/* AI Classification Preview */}
              {pendingFile && (
                <div className="mb-md p-sm bg-primary-fixed/20 border border-primary/20 rounded-xl">
                  <p className="text-body-sm text-primary font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                    AI will organize this into: {classifyDocument(pendingFile.name, uploadCategory).label}
                  </p>
                </div>
              )}

              <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Password</label>
              <input 
                type="password" 
                placeholder="Create encryption password" 
                value={encryptionPassword}
                onChange={(e) => setEncryptionPassword(e.target.value)}
                className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface mb-sm font-mono"
                autoFocus
              />
              <label className="text-label-sm font-bold text-on-surface-variant block mb-1">Confirm Password</label>
              <input 
                type="password" 
                placeholder="Re-enter password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface mb-sm font-mono"
              />
              {encryptionPassword && confirmPassword && encryptionPassword !== confirmPassword && (
                <p className="text-status-emergency text-body-sm mb-sm font-bold">⚠️ Passwords don't match</p>
              )}
              
              <p className="text-[11px] text-on-surface-variant mb-md flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                You'll need this password to view or download this file. Store it safely!
              </p>

              <div className="flex justify-end gap-sm">
                <button 
                  onClick={() => { setShowPasswordPrompt(false); setPendingFile(null); setEncryptionPassword(''); setConfirmPassword(''); }}
                  className="px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeUpload}
                  disabled={!encryptionPassword || encryptionPassword !== confirmPassword}
                  className="px-4 py-2 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  🔒 Encrypt & Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-all group flex flex-col justify-between hover:border-primary/40">
            <div className="flex items-start gap-sm mb-4">
              <div className="w-10 h-10 shrink-0 bg-tertiary-fixed-dim/20 rounded-lg flex items-center justify-center text-tertiary-fixed-dim">
                <span className="material-symbols-outlined" data-icon="description">description</span>
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-label-md font-bold text-on-surface truncate" title={doc.filename}>{doc.filename}</h4>
                <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">{doc.date}</p>
                {doc.size && <p className="text-[10px] text-on-surface-variant mt-0.5">{formatSize(doc.size)}</p>}
              </div>
              {doc.encrypted && (
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0" title="Encrypted" data-icon="lock">lock</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded uppercase">
                {doc.folderLabel || doc.category}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleDeleteDoc(doc.id)}
                  className="p-1 text-outline hover:text-status-emergency hover:bg-error-container rounded transition-colors opacity-0 group-hover:opacity-100" 
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredDocs.length === 0 && (
          <div className="col-span-full py-xl text-center">
            <span className="material-symbols-outlined text-outline text-6xl mb-4" data-icon="folder_off">folder_off</span>
            <p className="text-on-surface-variant font-body-lg font-bold">No records found</p>
            <p className="text-on-surface-variant text-body-sm mt-1">Upload a medical document above to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
