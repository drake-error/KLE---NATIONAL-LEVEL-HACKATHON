/**
 * geminiClient.js — Gemini 2.5 Flash REST API wrapper.
 * 
 * Handles both text chat and multimodal vision (image analysis).
 * Uses the free Google AI Studio API key from VITE_GEMINI_API_KEY.
 * 
 * NO images are stored externally — all processing is client-side base64.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.5-flash';

function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('VITE_GEMINI_API_KEY is not set. Add it to your .env file.');
  return key;
}

/**
 * Send a text-only prompt to Gemini 2.5 Flash.
 * @param {string} systemPrompt - System instruction for the model.
 * @param {string} userMessage - The user's message.
 * @param {{ role: string, parts: Array }[]} history - Optional conversation history.
 * @returns {Promise<string>} The model's text response.
 */
export async function chatCompletion(systemPrompt, userMessage, history = []) {
  const apiKey = getApiKey();
  const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const contents = [
    ...history,
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Analyze an image with Gemini 2.5 Flash Vision.
 * @param {string} base64Data - Base64-encoded image data (without data URI prefix).
 * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'.
 * @param {string} prompt - The analysis instruction.
 * @returns {Promise<string>} The model's text response.
 */
export async function analyzeImage(base64Data, mimeType, prompt) {
  const apiKey = getApiKey();
  const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini Vision API error: ${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Extract JSON from a Gemini response that may contain markdown fences.
 * @param {string} text - Raw model output.
 * @returns {object} Parsed JSON object.
 */
export function extractJSON(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Convert a File object to a base64 string (without the data URI prefix).
 * @param {File} file 
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Check if the Gemini API key is configured.
 * @returns {boolean}
 */
export function isApiKeyConfigured() {
  try {
    getApiKey();
    return true;
  } catch {
    return false;
  }
}
