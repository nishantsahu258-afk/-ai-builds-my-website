/**
 * Gemini AI client using official @google/genai SDK.
 *
 * Supported production models:
 *   - 'gemini-2.0-flash' (recommended default text and vision)
 *   - 'gemini-2.5-flash'
 *   - 'gemini-1.5-flash'
 *
 * Exports:
 *   generateText(prompt, systemInstruction?)  → string
 *   generateJSON(prompt, systemInstruction?, schema?)  → parsed object
 *   analyzeImage(imageBase64, mimeType, prompt)  → string
 *   searchWithGrounding(query)  → { text, sources[] }
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

let _aiClient = null;

function getClient() {
  if (!_aiClient) {
    const key = config.gemini.apiKey;
    _aiClient = new GoogleGenAI({ apiKey: key || 'dummy-dev-key' });
  }
  return _aiClient;
}

function getText(response) {
  if (!response) return '';
  if (typeof response.text === 'function') {
    return response.text();
  }
  if (typeof response.text === 'string') {
    return response.text;
  }
  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  return part?.text || '';
}

function formatGeminiError(err) {
  const msg = err.message || '';
  if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('unregistered project')) {
    return 'Invalid or unconfigured Gemini API key. Please check GEMINI_API_KEY in server/.env.';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return 'Gemini API rate limit or quota exceeded. Please wait or check your Gemini API plan.';
  }
  if (msg.includes('NOT_FOUND') || msg.includes('404')) {
    return `Configured Gemini model (${config.gemini.model}) is not available or deprecated. Try setting GEMINI_MODEL=gemini-2.0-flash.`;
  }
  return msg;
}

// ---------------------------------------------------------------------------
// generateText
// ---------------------------------------------------------------------------

export async function generateText(prompt, systemInstruction = '') {
  if (!config.gemini.apiKey || config.gemini.apiKey === 'dummy-dev-key') {
    throw new Error('GEMINI_API_KEY is not configured in server/.env. Please provide a valid Gemini API key.');
  }

  const ai = getClient();
  try {
    const params = {
      model: config.gemini.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    if (systemInstruction) {
      params.systemInstruction = {
        role: 'system',
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await ai.models.generateContent(params);
    const text = getText(response);
    return text;
  } catch (err) {
    const userMsg = formatGeminiError(err);
    logger.error('[Gemini] generateText failed:', userMsg);
    throw new Error(userMsg);
  }
}

// ---------------------------------------------------------------------------
// generateJSON
// ---------------------------------------------------------------------------

export async function generateJSON(prompt, systemInstruction = '', schema = null) {
  if (!config.gemini.apiKey || config.gemini.apiKey === 'dummy-dev-key') {
    throw new Error('GEMINI_API_KEY is not configured in server/.env. Please provide a valid Gemini API key.');
  }

  const ai = getClient();
  try {
    const schemaHint = schema
      ? `\n\nExpected JSON schema:\n${JSON.stringify(schema, null, 2)}`
      : '';

    const fullPrompt = `${prompt}${schemaHint}\n\nReturn ONLY valid JSON. Do not include markdown code fences or explanations.`;

    const params = {
      model: config.gemini.model,
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    };

    if (systemInstruction) {
      params.systemInstruction = {
        role: 'system',
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await ai.models.generateContent(params);
    const raw = getText(response).trim();

    // Strip markdown code fences if present
    const stripped = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    try {
      return JSON.parse(stripped);
    } catch (parseErr) {
      throw new Error(`Failed to parse Gemini JSON output: ${parseErr.message}. Raw: ${stripped.slice(0, 200)}`);
    }
  } catch (err) {
    const userMsg = formatGeminiError(err);
    logger.error('[Gemini] generateJSON failed:', userMsg);
    throw new Error(userMsg);
  }
}

// ---------------------------------------------------------------------------
// analyzeImage
// ---------------------------------------------------------------------------

export async function analyzeImage(imageBase64, mimeType, prompt) {
  if (!config.gemini.apiKey || config.gemini.apiKey === 'dummy-dev-key') {
    logger.warn('[Gemini] GEMINI_API_KEY not configured, skipping image analysis');
    return 'Image uploaded (visual analysis requires GEMINI_API_KEY)';
  }

  const ai = getClient();
  try {
    const params = {
      model: config.gemini.visionModel || config.gemini.model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: imageBase64, mimeType } },
            { text: prompt },
          ],
        },
      ],
    };

    const response = await ai.models.generateContent(params);
    return getText(response);
  } catch (err) {
    const userMsg = formatGeminiError(err);
    logger.error('[Gemini] analyzeImage failed:', userMsg);
    throw new Error(userMsg);
  }
}

// ---------------------------------------------------------------------------
// searchWithGrounding
// ---------------------------------------------------------------------------

export async function searchWithGrounding(query) {
  if (!config.gemini.apiKey || config.gemini.apiKey === 'dummy-dev-key') {
    return { text: '', sources: [] };
  }

  const ai = getClient();
  try {
    const params = {
      model: config.gemini.model,
      contents: [{ role: 'user', parts: [{ text: query }] }],
      tools: [{ googleSearch: {} }],
    };

    const response = await ai.models.generateContent(params);
    const text = getText(response);

    const sources = [];
    const candidates = response.candidates ?? [];

    for (const candidate of candidates) {
      const groundingMetadata = candidate.groundingMetadata;
      if (!groundingMetadata) continue;

      const chunks = groundingMetadata.groundingChunks ?? [];
      for (const chunk of chunks) {
        const web = chunk.web;
        if (web?.uri) {
          sources.push({
            title: web.title ?? web.uri,
            url: web.uri,
          });
        }
      }
    }

    return { text, sources };
  } catch (err) {
    const userMsg = formatGeminiError(err);
    logger.error('[Gemini] searchWithGrounding failed:', userMsg);
    throw new Error(userMsg);
  }
}
