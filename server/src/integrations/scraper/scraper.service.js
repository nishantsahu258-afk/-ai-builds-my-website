/**
 * Web scraping service using node-fetch (global fetch) and cheerio.
 *
 * Export:
 *   fetchAndExtract(url) →
 *     { success, url, title, description, text, phones, emails, addresses, error? }
 *
 * Never throws — always returns an error result on failure.
 */

import * as cheerio from 'cheerio';
import { safeFetch } from '../../utils/ssrfProtection.js';
import { logger } from '../../utils/logger.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 3_000;

// Regex patterns for contact extraction
const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s\-.])?(?:\(?\d{3}\)?[\s\-.])\d{3}[\s\-.]\d{4}(?:\s*(?:ext|x|ext\.)\s*\d{1,5})?/gi;

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Very rough address pattern: "123 Something Street, City, ST 12345"
const ADDRESS_REGEX =
  /\d{1,5}\s+(?:[A-Za-z0-9]+\s){1,5}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Circle|Cir|Highway|Hwy|Parkway|Pkwy|Suite|Ste)\.?(?:[,\s]+[A-Za-z\s]{2,30})?(?:[,\s]+[A-Z]{2})?(?:[,\s]+\d{5}(?:-\d{4})?)?/gi;

/**
 * Fetches a URL and extracts structured text and contact information.
 *
 * @param {string} url
 * @returns {Promise<{
 *   success: boolean,
 *   url: string,
 *   title: string | null,
 *   description: string | null,
 *   text: string | null,
 *   phones: string[],
 *   emails: string[],
 *   addresses: string[],
 *   error?: string
 * }>}
 */
export async function fetchAndExtract(url) {
  const base = {
    success: false,
    url,
    title: null,
    description: null,
    text: null,
    phones: [],
    emails: [],
    addresses: [],
  };

  let response;
  try {
    response = await safeFetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AIWebsiteBuilder/1.0; +https://github.com/ai-builds-website)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    logger.warn(`[Scraper] Fetch failed for ${url}: ${err.message}`);
    return { ...base, error: `Fetch error: ${err.message}` };
  }

  if (!response.ok) {
    return { ...base, error: `HTTP ${response.status} ${response.statusText}` };
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    return {
      ...base,
      error: `Non-HTML content type: ${contentType}`,
    };
  }

  let html;
  try {
    html = await response.text();
  } catch (err) {
    return { ...base, error: `Failed to read response body: ${err.message}` };
  }

  try {
    const $ = cheerio.load(html);

    // Remove noise nodes
    $('script, style, noscript, nav, footer, header, aside, [aria-hidden="true"]').remove();

    const title = $('title').first().text().trim() || null;

    const description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null;

    // Collect headings
    const headings = [];
    $('h1, h2, h3').each((_, el) => {
      const t = $(el).text().trim();
      if (t) headings.push(t);
    });

    // Collect paragraph text
    const paragraphs = [];
    $('p').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 20) paragraphs.push(t); // skip tiny fragments
    });

    const rawText = [...headings, ...paragraphs].join('\n');
    const text = rawText.slice(0, MAX_TEXT_CHARS);

    // Contact extraction — search the full raw text for better recall
    const fullPageText = $.text();

    const phones = [...new Set((fullPageText.match(PHONE_REGEX) ?? []).map((p) => p.trim()))];
    const emails = [...new Set((fullPageText.match(EMAIL_REGEX) ?? []).map((e) => e.trim()))];
    const addresses = [
      ...new Set((fullPageText.match(ADDRESS_REGEX) ?? []).map((a) => a.trim())),
    ].slice(0, 5); // cap to 5 addresses

    return {
      success: true,
      url,
      title,
      description,
      text,
      phones,
      emails,
      addresses,
    };
  } catch (err) {
    logger.error(`[Scraper] HTML parsing failed for ${url}: ${err.message}`);
    return { ...base, error: `Parsing error: ${err.message}` };
  }
}
