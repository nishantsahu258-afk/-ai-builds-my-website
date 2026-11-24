/**
 * SSRF protection utilities for safely fetching external URLs.
 *
 * isSafeUrl(url)        – returns { safe: boolean, reason?: string }
 * safeFetch(url, opts)  – checks safety, fetches, re-checks every redirect
 */

import { logger } from './logger.js';

// Private/reserved IPv4 CIDR ranges and hostnames to block
const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

const BLOCKED_PATTERNS = [
  // Loopback IPv4
  /^127\.\d+\.\d+\.\d+$/,
  // Private class A
  /^10\.\d+\.\d+\.\d+$/,
  // Private class B: 172.16.0.0 – 172.31.255.255
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  // Private class C
  /^192\.168\.\d+\.\d+$/,
  // Link-local
  /^169\.254\.\d+\.\d+$/,
  // Broadcast
  /^255\.255\.255\.255$/,
  // IPv6 loopback / link-local expressed as IPv4-mapped
  /^::1$/,
  /^0:0:0:0:0:0:0:1$/,
  /^fe80:/i,
  // IPv6 loopback
  /^::ffff:127\./i,
];

// Blocked path segments (cloud metadata endpoints)
const BLOCKED_PATHS = [
  '/latest/meta-data',
  '/computeMetadata',
  '/metadata/instance',
  '/metadata/v1',
  '/opc/v1/instance',
  '/hetzner/v1/metadata',
];

const BLOCKED_TLD_PATTERNS = [/\.internal$/i, /\.local$/i, /\.localhost$/i];

/**
 * Checks whether a URL is safe to fetch (not pointing to internal resources).
 *
 * @param {string} url
 * @returns {{ safe: boolean, reason?: string }}
 */
export const isSafeUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }

  const { protocol, hostname, pathname } = parsed;

  // Only allow http and https
  if (!['http:', 'https:'].includes(protocol)) {
    return { safe: false, reason: `Protocol '${protocol}' is not allowed` };
  }

  const host = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  // Block known unsafe hostnames
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { safe: false, reason: `Hostname '${host}' is blocked` };
  }

  // Block TLD patterns (.internal, .local, .localhost)
  for (const pattern of BLOCKED_TLD_PATTERNS) {
    if (pattern.test(host)) {
      return { safe: false, reason: `Hostname '${host}' matches blocked TLD pattern` };
    }
  }

  // Block private/reserved IP ranges
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(host)) {
      return { safe: false, reason: `IP address '${host}' is in a blocked range` };
    }
  }

  // Block cloud metadata endpoint paths
  for (const blockedPath of BLOCKED_PATHS) {
    if (pathname.startsWith(blockedPath)) {
      return { safe: false, reason: `Path '${pathname}' matches a blocked metadata endpoint` };
    }
  }

  return { safe: true };
};

/**
 * Safely fetches a URL after SSRF validation.
 * Follows up to 3 redirects, re-validating each destination.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export const safeFetch = async (url, options = {}) => {
  const MAX_REDIRECTS = 3;
  let currentUrl = url;
  let redirectCount = 0;

  // Disable built-in redirect following so we can inspect each hop
  const fetchOptions = { ...options, redirect: 'manual' };

  while (true) {
    const check = isSafeUrl(currentUrl);
    if (!check.safe) {
      logger.warn(`safeFetch blocked URL: ${currentUrl} — ${check.reason}`);
      throw new Error(`SSRF protection blocked URL: ${check.reason}`);
    }

    const response = await fetch(currentUrl, fetchOptions);

    // Handle redirects manually
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new Error(`safeFetch exceeded maximum redirect limit (${MAX_REDIRECTS})`);
      }
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing Location header');
      }
      // Resolve relative redirects
      currentUrl = new URL(location, currentUrl).href;
      redirectCount++;
      continue;
    }

    return response;
  }
};
