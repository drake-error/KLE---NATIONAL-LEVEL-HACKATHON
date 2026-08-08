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
  const key = import.meta.env.VITE_GEMINI_API_KEY ||
              import.meta.env.VITE_GEMINI_API_KEY_1 ||
              import.meta.env.VITE_GEMINI_API_KEY1;
  if (!key) throw new Error('Gemini API key is not set. Add VITE_GEMINI_API_KEY or VITE_GEMINI_API_KEY_1 to your environment variables.');
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
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
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
 * Robustly extract JSON from a Gemini response.
 * Handles: markdown fences, preamble text, truncated responses, extra trailing commas.
 * @param {string} text - Raw model output.
 * @returns {object} Parsed JSON object.
 */
export function extractJSON(text) {
  if (!text) throw new Error('Empty response from Gemini API.');

  let cleaned = text.trim();

  // 1. Strip markdown code fences
  if (cleaned.includes('```')) {
    const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();
    else cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }

  // 2. Try to parse directly
  try {
    return JSON.parse(cleaned);
  } catch {
    // 3. Try extracting the first {...} or [...] block from the text
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    const candidate = objMatch ? objMatch[0] : arrMatch ? arrMatch[0] : null;

    if (candidate) {
      try {
        return JSON.parse(candidate);
      } catch {
        // 4. Try fixing truncated JSON by closing open brackets
        const fixed = fixTruncatedJSON(candidate);
        return JSON.parse(fixed);
      }
    }

    throw new Error('Could not extract valid JSON from AI response. The model may have returned an unexpected format.');
  }
}

/**
 * Attempt to auto-close a truncated JSON string.
 * Handles the case where Gemini cuts off mid-response due to token limits.
 */
function fixTruncatedJSON(str) {
  let fixed = str
    .replace(/,\s*$/, '')           // remove trailing comma
    .replace(/,\s*([}\]])/, '$1');   // remove comma before closing bracket

  const opens = [];
  let inString = false;
  let escape = false;

  for (const ch of fixed) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"' && !escape) { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') opens.push('}');
      else if (ch === '[') opens.push(']');
      else if (ch === '}' || ch === ']') opens.pop();
    }
  }

  // If we're mid-string, close it
  if (inString) fixed += '"';

  // Close all unclosed brackets in reverse order
  while (opens.length) fixed += opens.pop();

  return fixed;
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
