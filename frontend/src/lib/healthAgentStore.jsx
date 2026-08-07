/**
 * healthAgentStore.jsx — React Context state store for HealthGuard AI.
 * 
 * Manages: prescription history, expiry scans, chat messages, reminders, parental logs.
 * All data is encrypted in localStorage via crypto-js.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'healthguard-ai-data';
const ENCRYPTION_PASS = 'HG-AI-2026-KLE-NLH'; // Client-side encryption key

// ─── Encrypted localStorage helpers ──────────────────────────────────────────

function loadEncrypted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const decrypted = CryptoJS.AES.decrypt(raw, ENCRYPTION_PASS).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

function saveEncrypted(data) {
  try {
    const json = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(json, ENCRYPTION_PASS).toString();
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (e) {
    console.error('Failed to save encrypted data:', e);
  }
}

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  prescriptionHistory: [],
  expiryScans: [],
  chatMessages: [],
  reminders: [],
  parentalLog: [],
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...initialState, ...action.payload };

    case 'ADD_PRESCRIPTION':
      return {
        ...state,
        prescriptionHistory: [
          { id: Date.now(), timestamp: new Date().toISOString(), ...action.payload },
          ...state.prescriptionHistory,
        ].slice(0, 50), // Keep last 50
      };

    case 'ADD_EXPIRY_SCAN':
      return {
        ...state,
        expiryScans: [
          { id: Date.now(), timestamp: new Date().toISOString(), ...action.payload },
          ...state.expiryScans,
        ].slice(0, 50),
      };

    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [
          ...state.chatMessages,
          { id: Date.now(), timestamp: new Date().toISOString(), ...action.payload },
        ].slice(-200), // Keep last 200 messages
      };

    case 'CLEAR_CHAT':
      return { ...state, chatMessages: [] };

    case 'ADD_REMINDER':
      return {
        ...state,
        reminders: [
          ...state.reminders,
          { id: Date.now(), createdAt: new Date().toISOString(), active: true, ...action.payload },
        ],
      };

    case 'TOGGLE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map(r =>
          r.id === action.payload ? { ...r, active: !r.active } : r
        ),
      };

    case 'DELETE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.filter(r => r.id !== action.payload),
      };

    case 'LOG_DOSE':
      return {
        ...state,
        parentalLog: [
          ...state.parentalLog,
          { id: Date.now(), timestamp: new Date().toISOString(), ...action.payload },
        ].slice(-500),
      };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const HealthAgentContext = createContext(null);

export function HealthAgentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initialized = useRef(false);

  // Load from encrypted localStorage on mount
  useEffect(() => {
    const saved = loadEncrypted();
    if (saved) {
      dispatch({ type: 'LOAD_STATE', payload: saved });
    }
    initialized.current = true;
  }, []);

  // Persist to encrypted localStorage on every state change
  useEffect(() => {
    if (initialized.current) {
      saveEncrypted(state);
    }
  }, [state]);

  const addPrescription = useCallback((data) => dispatch({ type: 'ADD_PRESCRIPTION', payload: data }), []);
  const addExpiryScan = useCallback((data) => dispatch({ type: 'ADD_EXPIRY_SCAN', payload: data }), []);
  const addChatMessage = useCallback((data) => dispatch({ type: 'ADD_CHAT_MESSAGE', payload: data }), []);
  const clearChat = useCallback(() => dispatch({ type: 'CLEAR_CHAT' }), []);
  const addReminder = useCallback((data) => dispatch({ type: 'ADD_REMINDER', payload: data }), []);
  const toggleReminder = useCallback((id) => dispatch({ type: 'TOGGLE_REMINDER', payload: id }), []);
  const deleteReminder = useCallback((id) => dispatch({ type: 'DELETE_REMINDER', payload: id }), []);
  const logDose = useCallback((data) => dispatch({ type: 'LOG_DOSE', payload: data }), []);

  const value = {
    ...state,
    addPrescription,
    addExpiryScan,
    addChatMessage,
    clearChat,
    addReminder,
    toggleReminder,
    deleteReminder,
    logDose,
  };

  return (
    <HealthAgentContext.Provider value={value}>
      {children}
    </HealthAgentContext.Provider>
  );
}

export function useHealthAgent() {
  const ctx = useContext(HealthAgentContext);
  if (!ctx) throw new Error('useHealthAgent must be used within <HealthAgentProvider>');
  return ctx;
}
