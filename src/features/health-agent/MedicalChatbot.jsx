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
import { createMedicalEngine } from '../../lib/octochains';
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
  const [useOctochains, setUseOctochains] = useState(false);
  const [agentTraces, setAgentTraces] = useState([]);
  const [activeAgents, setActiveAgents] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, agentTraces]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setAgentTraces([]);
    setActiveAgents([]);
    addChatMessage({ role: 'user', content: text });

    // Check for emergency
    if (detectEmergency(text)) {
      setShowSOS(true);
    }

    setIsLoading(true);
    try {
      if (useOctochains) {
        // Octochains Multi-Agent Mode
        const engine = createMedicalEngine();
        setActiveAgents(engine.agents.map(a => ({ role: a.role, icon: a.icon, color: a.color, status: 'running' })));

        const result = await engine.run(text, (agentResult) => {
          // Live update: mark agent as complete
          setActiveAgents(prev => prev.map(a =>
            a.role === agentResult.role ? { ...a, status: agentResult.status } : a
          ));
          setAgentTraces(prev => [...prev, agentResult]);
        });

        addChatMessage({
          role: 'assistant',
          content: result.consensus,
          isOctochains: true,
          traces: result.traces.map(t => ({ role: t.role, status: t.status, durationMs: t.durationMs })),
          totalMs: result.totalMs,
        });
      } else {
        // Quick Mode — single agent
        const history = chatMessages.slice(-10).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

        const response = await chatCompletion(QUICK_SYSTEM_PROMPT, text, history);
        addChatMessage({ role: 'assistant', content: response });
      }
    } catch (err) {
      addChatMessage({ role: 'assistant', content: `⚠️ Error: ${err.message}`, isError: true });
    } finally {
      setIsLoading(false);
      setActiveAgents([]);
    }
  }, [input, isLoading, useOctochains, chatMessages, addChatMessage]);

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

      {/* Mode Toggle */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant">
        <button
          onClick={() => setUseOctochains(false)}
          className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
            !useOctochains ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">bolt</span>
          {t("Quick Mode")}
        </button>
        <button
          onClick={() => setUseOctochains(true)}
          className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
            useOctochains ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">hub</span>
          {t("Octochains Deep Analysis")}
        </button>
      </div>

      {useOctochains && (
        <div className="mb-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30">
          <p className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">psychology</span>
            {t("3 specialists analyze in parallel isolation → Synthesizer merges consensus")}
          </p>
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
              {msg.isOctochains && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-outline-variant/30">
                  <span className="material-symbols-outlined text-sm text-violet-500">hub</span>
                  <span className="text-[10px] font-black text-violet-500 uppercase">{t("Octochains Consensus")}</span>
                  {msg.totalMs && <span className="text-[10px] text-on-surface-variant ml-auto">{(msg.totalMs / 1000).toFixed(1)}s</span>}
                </div>
              )}
              <div className="text-sm font-semibold whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Live Agent Progress */}
        {isLoading && useOctochains && activeAgents.length > 0 && (
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant">
            <p className="text-xs font-black text-on-surface-variant uppercase mb-3">{t("Parallel Agent Execution")}</p>
            <div className="space-y-2">
              {activeAgents.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-sm ${a.status === 'success' ? 'text-emerald-500' : a.status === 'error' ? 'text-rose-500' : 'text-on-surface-variant animate-pulse'}`}>
                    {a.status === 'success' ? 'check_circle' : a.status === 'error' ? 'error' : 'pending'}
                  </span>
                  <span className="text-xs font-bold text-on-surface">{a.role}</span>
                  <span className="text-[10px] text-on-surface-variant ml-auto">
                    {a.status === 'running' ? t('Analyzing...') : a.status === 'success' ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && !useOctochains && (
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
            ref={inputRef}
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
