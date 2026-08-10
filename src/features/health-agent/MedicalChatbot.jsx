/**
 * MedicalChatbot.jsx — Module 3: Medical Q&A with Octochains Multi-Agent Reasoning.
 * 
 * Features:
 * - Interactive chat UI with Gemini 2.5 Flash
 * - Emergency keyword detection → SOS overlay with click-to-call
 * - Octochains parallel isolated reasoning: 3 specialist agents analyze in isolation,
 *   then a Synthesizer merges their reports into a consensus.
 * - Toggle between Quick Mode (single agent) and Deep Analysis (Octochains multi-agent)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../../i18n';
import { chatCompletion, isApiKeyConfigured } from '../../lib/geminiClient';
import { useHealthAgent } from '../../lib/healthAgentStore';

// Emergency keywords that trigger SOS overlay
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'unconscious', 'not breathing', 'stopped breathing',
  'poisoning', 'poison', 'choking', 'seizure', 'stroke', 'bleeding heavily',
  'severe bleeding', 'anaphylaxis', 'allergic reaction severe', 'suicidal',
  'overdose', 'cardiac arrest', 'can\'t breathe', 'difficulty breathing severe',
  'snake bite', 'drowning', 'electrocution', 'burn severe',
];

const QUICK_SYSTEM_PROMPT = `You are HealthGuard AI, a knowledgeable and empathetic medical assistant.

Rules:
1. Provide evidence-based medical information in clear, simple language.
2. ALWAYS include a disclaimer that you are an AI and not a replacement for professional medical advice.
3. For any potentially serious condition, recommend consulting a healthcare professional.
4. Structure responses with clear headings when appropriate.
5. If asked about drug interactions, provide known interactions but always advise consulting a pharmacist.
6. Never diagnose — instead provide information about possible conditions matching symptoms.
7. Be culturally sensitive and aware of Indian healthcare context (government hospitals, generic medicines, AYUSH alternatives).`;

function detectEmergency(text) {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

export default function MedicalChatbot() {
  const { t } = useI18n();
  const { chatMessages, addChatMessage, clearChat } = useHealthAgent();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    addChatMessage({ role: 'user', content: text });

    // Check for emergency
    if (detectEmergency(text)) {
      setShowSOS(true);
    }

    setIsLoading(true);
    try {
      const history = chatMessages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const response = await chatCompletion(QUICK_SYSTEM_PROMPT, text, history);
      addChatMessage({ role: 'assistant', content: response });
    } catch (err) {
      addChatMessage({ role: 'assistant', content: `⚠️ Error: ${err.message}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, chatMessages, addChatMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isApiKeyConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-4">key</span>
        <h3 className="font-bold text-on-surface text-lg mb-2">{t("API Key Required")}</h3>
        <p className="text-sm text-on-surface-variant max-w-md">
          {t("Add VITE_GEMINI_API_KEY to your .env file to enable the AI chatbot. Get a free key from Google AI Studio.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* SOS Emergency Overlay */}
      {showSOS && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowSOS(false)}>
          <div className="bg-surface-container rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-rose-500 animate-pulse" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <span className="material-symbols-outlined text-6xl text-rose-500 mb-2 block">emergency</span>
              <h2 className="text-2xl font-black text-rose-500">{t("🚨 EMERGENCY DETECTED")}</h2>
              <p className="text-sm text-on-surface-variant mt-2">{t("Call emergency services immediately if you or someone is in danger.")}</p>
            </div>
            <div className="space-y-3">
              <a href="tel:112" className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500 text-white font-black text-lg hover:bg-rose-600 transition-colors">
                <span className="material-symbols-outlined text-3xl">call</span>
                <div>
                  <p>112</p>
                  <p className="text-xs font-semibold opacity-80">{t("National Emergency Number")}</p>
                </div>
              </a>
              <a href="tel:108" className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500 text-white font-black text-lg hover:bg-amber-600 transition-colors">
                <span className="material-symbols-outlined text-3xl">ambulance</span>
                <div>
                  <p>108</p>
                  <p className="text-xs font-semibold opacity-80">{t("Ambulance Service")}</p>
                </div>
              </a>
              <a href="tel:100" className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500 text-white font-black text-lg hover:bg-blue-600 transition-colors">
                <span className="material-symbols-outlined text-3xl">local_police</span>
                <div>
                  <p>100</p>
                  <p className="text-xs font-semibold opacity-80">{t("Police")}</p>
                </div>
              </a>
            </div>
            <button onClick={() => setShowSOS(false)} className="w-full mt-4 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container-low transition-colors">
              {t("Dismiss")}
            </button>
          </div>
        </div>
      )}



      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3">smart_toy</span>
            <p className="font-bold text-on-surface mb-1">{t("HealthGuard AI Assistant")}</p>
            <p className="text-sm text-on-surface-variant">{t("Ask me anything about health, medicines, symptoms, or first aid.")}</p>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              msg.role === 'user'
                ? 'bg-primary text-on-primary rounded-br-sm'
                : msg.isError
                  ? 'bg-error/10 border border-error/30 rounded-bl-sm'
                  : 'bg-surface-container-lowest border border-outline-variant rounded-bl-sm'
            }`}>
              <div className="text-sm font-semibold whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant rounded-bl-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="flex items-end gap-2">
        <button onClick={clearChat} className="p-3 rounded-2xl text-on-surface-variant hover:bg-surface-container-low transition-colors" title={t("Clear chat")}>
          <span className="material-symbols-outlined">delete_sweep</span>
        </button>
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("Describe your symptoms or ask a medical question...")}
            rows={1}
            className="w-full resize-none p-4 pr-14 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 rounded-xl bg-primary text-on-primary disabled:opacity-40 hover:bg-primary/90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
