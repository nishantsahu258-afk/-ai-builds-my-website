/**
 * Search provider abstraction.
 *
 * Reads config.search.provider and delegates to the appropriate backend:
 *   - 'tavily'  → Tavily REST API (Primary web search provider)
 *   - 'gemini'  → Gemini grounding search
 *   - anything else / missing key → returns clean empty result without throwing
 *
 * Export:
 *   search(query) → { success: boolean, results: [{ title, url, snippet, source }], error?: string }
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { searchWithGrounding } from '../gemini/gemini.client.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

// ---------------------------------------------------------------------------
// Tavily provider (Default per specification)
// ---------------------------------------------------------------------------

async function searchViaTavily(query) {
  const apiKey = config.search.tavilyApiKey;

  if (!apiKey || apiKey === 'dummy-tavily-key') {
    logger.warn('[Search:Tavily] TAVILY_API_KEY is not configured in server/.env');
    return {
      success: false,
      results: [],
      error: 'Tavily API key not configured (set TAVILY_API_KEY in server/.env)',
    };
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: 5,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn(`[Search:Tavily] HTTP ${response.status}: ${body.slice(0, 200)}`);
      return {
        success: false,
        results: [],
        error: `Tavily returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    const results = (data.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.content ?? r.snippet ?? '',
      source: 'tavily',
    }));

    logger.info(`[Search:Tavily] Found ${results.length} results for query "${query}"`);
    return { success: true, results };
  } catch (err) {
    logger.warn(`[Search:Tavily] Request error for query "${query}":`, err.message);
    return {
      success: false,
      results: [],
      error: `Tavily search error: ${err.message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Gemini provider
// ---------------------------------------------------------------------------

async function searchViaGemini(query) {
  try {
    const { text, sources } = await searchWithGrounding(query);

    const results = sources.map((s) => ({
      title: s.title,
      url: s.url,
      snippet: text.slice(0, 500),
      source: 'gemini',
    }));

    if (results.length === 0 && text) {
      results.push({
        title: 'Gemini synthesised answer',
        url: null,
        snippet: text.slice(0, 1000),
        source: 'gemini',
      });
    }

    return { success: true, results };
  } catch (err) {
    logger.warn(`[Search:Gemini] Grounding search error:`, err.message);
    return {
      success: false,
      results: [],
      error: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Performs a web search using the configured provider.
 *
 * @param {string} query
 * @returns {Promise<{ success: boolean, results: Array<{ title: string, url: string, snippet: string, source: string }>, error?: string }>}
 */
export async function search(query) {
  const provider = (config.search.provider ?? 'tavily').toLowerCase();

  try {
    if (provider === 'tavily') {
      return await searchViaTavily(query);
    }

    if (provider === 'gemini') {
      return await searchViaGemini(query);
    }

    logger.warn(`[Search] Provider '${provider}' not configured`);
    return {
      success: false,
      results: [],
      error: 'Search provider not configured',
    };
  } catch (err) {
    logger.error(`[Search] Unexpected search error for "${query}":`, err.message);
    return {
      success: false,
      results: [],
      error: err.message,
    };
  }
}
