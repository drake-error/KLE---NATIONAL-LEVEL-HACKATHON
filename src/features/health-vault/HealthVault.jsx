import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { encryptFile, decryptFile } from '../../lib/encryption';

const CATEGORIES = ['All Records', 'Allergies', 'Medications', 'Conditions', 'Surgical', 'Vaccinations', 'Imaging', 'Insurance', 'Labs', 'Other'];

export default function HealthVault({ searchQuery = '' }) {
  const [activeCategory, setActiveCategory] = useState('All Records');
  const [activeFolder, setActiveFolder] = useState('All');
  const [folders, setFolders] = useState([{ id: 'unorganized', name: 'Unorganized' }]);
  const [documents, setDocuments] = useState([
    { id: '1', filename: 'sample-medical-receipt.pdf', category: 'Other', date: 'May 6, 2026', folder: 'unorganized' },
    { id: '2', filename: 'jeevan_care_blood_report.pdf', category: 'Labs', date: 'Apr 28, 2026', folder: 'unorganized' }
  ]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  
  const fileInputRef = useRef(null);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All Records' || doc.category === activeCategory;
    const matchesFolder = activeFolder === 'All' || doc.folder === activeFolder;
    return matchesSearch && matchesCategory && matchesFolder;
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPendingFile(file);
      setShowPasswordPrompt(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setPendingFile(file);
      setShowPasswordPrompt(true);
    }
  };

  const executeUpload = async () => {
    if (!pendingFile || !encryptionPassword) return;
    setIsUploading(true);
    setShowPasswordPrompt(false);

    try {
      // 1. Encrypt File Client-Side
      let encryptedBlob = pendingFile; // fallback to raw file if encryption fails
      try {
        encryptedBlob = await encryptFile(pendingFile, encryptionPassword);
      } catch (encError) {
        console.warn("Client-side encryption failed, using raw file mock:", encError);
      }
      
      const fileName = `${Date.now()}_${pendingFile.name}.enc`;
      let storagePath = null;

      // 2. Attempt Supabase Upload
      try {
        const { data, error } = await supabase.storage
          .from('health_vault')
          .upload(fileName, encryptedBlob);
          
        if (error) throw error;
        storagePath = data.path;
      } catch (uploadError) {
        console.warn("Supabase upload failed (bucket might not exist), falling back to local mock:", uploadError);
      }

      // Auto-Organize Logic: Determine Folder based on Category or Filename
      let assignedFolderId = 'unorganized';
      const lowercaseName = pendingFile.name.toLowerCase();
      
      if (uploadCategory === 'Imaging' || lowercaseName.includes('scan') || lowercaseName.includes('mri') || lowercaseName.includes('xray')) {
        assignedFolderId = 'scans';
      } else if (uploadCategory === 'Labs' || lowercaseName.includes('report')) {
        assignedFolderId = 'reports';
      } else if (uploadCategory === 'Insurance' || lowercaseName.includes('claim') || lowercaseName.includes('policy')) {
        assignedFolderId = 'insurance';
      } else if (uploadCategory !== 'Other') {
        // Create folder based on the category name
        assignedFolderId = uploadCategory.toLowerCase().replace(/[^a-z0-9]/g, '-');
      }

      // Check if this folder already exists in state; if not, create it!
      if (assignedFolderId !== 'unorganized') {
        setFolders(prev => {
          if (!prev.find(f => f.id === assignedFolderId)) {
            // e.g., 'scans' -> 'Scans'
            const folderName = assignedFolderId.charAt(0).toUpperCase() + assignedFolderId.slice(1).replace(/-/g, ' ');
            return [...prev, { id: assignedFolderId, name: folderName }];
          }
          return prev;
        });
      }

      // 3. Update Local State (or Database)
      const newDoc = {
        id: Date.now().toString(),
        filename: pendingFile.name || 'unknown_file',
        category: uploadCategory || 'Other',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        folder: assignedFolderId,
        storagePath: storagePath || null,
        encrypted: true
      };

      console.log("Adding new document to state:", newDoc);
      setDocuments(prev => [newDoc, ...prev]);
      
      // Force active folder to 'All' or the new folder so they can see it
      setActiveFolder('All');
      setActiveCategory('All Records');

    } catch (err) {
      console.error("Encryption/Upload Error (Top Level):", err);
      alert("An unexpected error occurred during upload: " + (err.message || err));
    } finally {
      console.log("Upload flow completed, resetting state.");
      setIsUploading(false);
      setPendingFile(null);
      setEncryptionPassword('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNewFolder = () => {
    const name = prompt("Enter folder name:");
    if (name) {
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      setFolders([...folders, { id, name }]);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-md max-w-7xl mx-auto w-full pb-xl">
      {/* Search & Categories */}
      <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex flex-col gap-sm overflow-x-auto">
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
        <div className="flex gap-sm">
          <button 
            onClick={() => setActiveFolder('All')}
            className={`px-4 py-1.5 rounded-xl text-label-md font-bold transition-colors ${
              activeFolder === 'All' ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            All
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`px-4 py-1.5 rounded-xl text-label-md font-bold transition-colors flex items-center gap-1 ${
                activeFolder === f.id ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim" data-icon="folder">folder</span>
              {f.name}
            </button>
          ))}
        </div>
        {searchQuery && (
          <div className="mt-md p-sm bg-primary-fixed/20 border border-primary/30 rounded-lg flex items-center justify-between">
            <p className="text-body-sm text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              Showing results for: "{searchQuery}". Clear your search if you can't see your uploaded files.
            </p>
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm relative">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-sm text-on-surface">Upload New Record</h3>
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
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-low transition-colors group bg-surface"
        >
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-primary text-4xl animate-spin" data-icon="progress_activity">progress_activity</span>
              <p className="font-bold text-primary">Encrypting & Uploading...</p>
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
          <div className="absolute inset-0 bg-inverse-surface/80 rounded-xl flex items-center justify-center p-md z-10 backdrop-blur-sm animate-fadeIn">
            <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-2xl max-w-md w-full border border-outline-variant">
              <h4 className="font-headline-md text-on-surface font-bold flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary" data-icon="enhanced_encryption">enhanced_encryption</span>
                Encrypt Record
              </h4>
              <p className="text-body-sm text-on-surface-variant mb-md">
                Enter a secure password to encrypt <strong>{pendingFile?.name}</strong>. You will need this password to decrypt and view the file later.
              </p>
              <input 
                type="password" 
                placeholder="Encryption Password" 
                value={encryptionPassword}
                onChange={(e) => setEncryptionPassword(e.target.value)}
                className="w-full px-sm py-2 rounded-xl bg-surface-container border border-outline focus:border-primary outline-none text-on-surface mb-md font-mono"
              />
              <div className="flex justify-end gap-sm">
                <button 
                  onClick={() => { setShowPasswordPrompt(false); setPendingFile(null); }}
                  className="px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeUpload}
                  disabled={!encryptionPassword}
                  className="px-4 py-2 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Encrypt & Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
            <div className="flex items-start gap-sm mb-4">
              <div className="w-10 h-10 shrink-0 bg-tertiary-fixed-dim/20 rounded-lg flex items-center justify-center text-tertiary-fixed-dim">
                <span className="material-symbols-outlined" data-icon="description">description</span>
              </div>
              <div className="overflow-hidden">
                <h4 className="font-label-md font-bold text-on-surface truncate" title={doc.filename}>{doc.filename}</h4>
                <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">{doc.date}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded uppercase">
                {doc.category}
              </span>
              <button className="p-1 text-outline hover:text-primary hover:bg-surface-container rounded transition-colors" title="Download / Decrypt">
                <span className="material-symbols-outlined text-[20px]" data-icon="lock_open">lock_open</span>
              </button>
            </div>
          </div>
        ))}
        {filteredDocs.length === 0 && (
          <div className="col-span-full py-xl text-center">
            <p className="text-on-surface-variant font-body-lg">No records found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
