/**
 * Gemini AI client using @google/genai SDK.
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

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

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

// ---------------------------------------------------------------------------
// generateText
// ---------------------------------------------------------------------------

/**
 * Sends a text prompt to Gemini and returns the response string.
 *
 * @param {string} prompt
 * @param {string} [systemInstruction]
 * @returns {Promise<string>}
 */
export async function generateText(prompt, systemInstruction = '') {
  try {
    const params = {
      model: config.gemini.model,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    if (systemInstruction) {
      params.systemInstruction = {
        role: 'system',
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await ai.models.generateContent(params);
    const text = getText(response);

    if (typeof text !== 'string') {
      throw new Error('Gemini returned an unexpected response format');
    }

    return text;
  } catch (err) {
    logger.error('[Gemini] generateText failed:', err.message);
    throw new Error(`Gemini generateText failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// generateJSON
// ---------------------------------------------------------------------------

/**
 * Sends a prompt instructing Gemini to return JSON and parses the result.
 *
 * @param {string} prompt
 * @param {string} [systemInstruction]
 * @param {object} [schema]  Optional schema description appended to prompt
 * @returns {Promise<object>}
 */
export async function generateJSON(prompt, systemInstruction = '', schema = null) {
  try {
    const schemaHint = schema
      ? `\n\nExpected JSON schema:\n${JSON.stringify(schema, null, 2)}`
      : '';

    const fullPrompt = `${prompt}${schemaHint}\n\nReturn ONLY valid JSON. Do not include markdown code fences, explanations, or any text outside the JSON object.`;

    const params = {
      model: config.gemini.model,
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }],
        },
      ],
    };

    if (systemInstruction) {
      params.systemInstruction = {
        role: 'system',
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await ai.models.generateContent(params);
    const raw = getText(response).trim();

    // Strip markdown code fences if Gemini ignores the instruction
    const stripped = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(stripped);
    } catch (parseErr) {
      throw new Error(`Failed to parse Gemini JSON response: ${parseErr.message}. Raw: ${stripped.slice(0, 300)}`);
    }

    return parsed;
  } catch (err) {
    logger.error('[Gemini] generateJSON failed:', err.message);
    throw new Error(`Gemini generateJSON failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// analyzeImage
// ---------------------------------------------------------------------------

/**
 * Sends an image (base64 encoded) to Gemini Vision and returns the description.
 *
 * @param {string} imageBase64  Pure base64 string (no data URI prefix)
 * @param {string} mimeType     e.g. 'image/jpeg', 'image/png'
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function analyzeImage(imageBase64, mimeType, prompt) {
  try {
    const params = {
      model: config.gemini.visionModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType,
              },
            },
            { text: prompt },
          ],
        },
      ],
    };

    const response = await ai.models.generateContent(params);
    const text = getText(response);

    if (typeof text !== 'string') {
      throw new Error('Gemini Vision returned an unexpected response format');
    }

    return text;
  } catch (err) {
    logger.error('[Gemini] analyzeImage failed:', err.message);
    throw new Error(`Gemini analyzeImage failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// searchWithGrounding
// ---------------------------------------------------------------------------

/**
 * Performs a grounded search using Google Search grounding tool.
 *
 * @param {string} query
 * @returns {Promise<{ text: string, sources: Array<{ title: string, url: string }> }>}
 */
export async function searchWithGrounding(query) {
  try {
    const params = {
      model: config.gemini.model,
      contents: [
        {
          role: 'user',
          parts: [{ text: query }],
        },
      ],
      tools: [{ googleSearch: {} }],
    };

    const response = await ai.models.generateContent(params);
    const text = getText(response);

    // Extract grounding metadata / sources from the response candidates
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
    logger.error('[Gemini] searchWithGrounding failed:', err.message);
    throw new Error(`Gemini searchWithGrounding failed: ${err.message}`);
  }
}
