#!/usr/bin/env node
/**
 * 🥷 GILLITO STEALTH HTTP — Anti-Bot Detection Module v1.0
 * ═══════════════════════════════════════════════════════════
 * Makes all recon HTTP requests look like real browser traffic.
 * 
 * Features:
 *   - Rotating real browser User-Agent strings
 *   - Full browser header fingerprint (Accept, Language, etc.)
 *   - Random delays between requests (configurable)
 *   - Cookie jar persistence per session
 *   - Referer chain simulation
 *   - TLS fingerprint hints via proper Accept-Encoding
 *   - Retry with exponential backoff + jitter
 *
 * Usage:
 *   const stealth = require('./stealth-http');
 *   const html = await stealth.fetch('https://example.com/page');
 *   const data = await stealth.fetchJSON('https://api.example.com/data');
 */

const https = require('https');
const http  = require('http');
const { URL } = require('url');
const zlib  = require('zlib');

// ═══════════════════════════════════════════════════
// 🎭 USER-AGENT ROTATION
// Real, current browser UAs — updated regularly
// ═══════════════════════════════════════════════════
const USER_AGENTS = [
  // Chrome on Windows (most common globally)
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  // Chrome on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  // Firefox on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
  // Safari on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  // Chrome on Linux (for variety)
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

// ═══════════════════════════════════════════════════
// 🎭 BROWSER HEADER PROFILES
// Match headers to the UA family for consistency
// ═══════════════════════════════════════════════════
const HEADER_PROFILES = {
  chrome: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Connection': 'keep-alive',
  },
  firefox: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Priority': 'u=0, i',
  },
  safari: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
  },
};

// ═══════════════════════════════════════════════════
// 🍪 SESSION STATE
// ═══════════════════════════════════════════════════
class StealthSession {
  constructor() {
    this._cookieJar = new Map();   // domain → cookies
    this._lastUA = null;
    this._lastProfile = null;
    this._lastRequestTime = 0;
    this._requestCount = 0;
    this._rotateEvery = randomInt(8, 15); // Rotate UA every N requests
    this.rotate();
  }

  /** Pick a new random UA + matching headers */
  rotate() {
    const idx = randomInt(0, USER_AGENTS.length - 1);
    this._lastUA = USER_AGENTS[idx];

    if (this._lastUA.includes('Firefox'))      this._lastProfile = 'firefox';
    else if (this._lastUA.includes('Safari') && !this._lastUA.includes('Chrome')) this._lastProfile = 'safari';
    else                                       this._lastProfile = 'chrome';

    this._requestCount = 0;
    this._rotateEvery = randomInt(8, 15);
  }

  /** Get headers for a request URL */
  getHeaders(url, extraHeaders = {}) {
    // Auto-rotate UA after N requests
    this._requestCount++;
    if (this._requestCount > this._rotateEvery) this.rotate();

    const profile = { ...HEADER_PROFILES[this._lastProfile] };
    const parsed = new URL(url);

    // Build cookie header from jar
    const cookies = this._cookieJar.get(parsed.hostname) || [];
    if (cookies.length > 0) {
      profile['Cookie'] = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }

    return {
      ...profile,
      'User-Agent': this._lastUA,
      'Host': parsed.host,
      ...extraHeaders,
    };
  }

  /** Store Set-Cookie headers from response */
  storeCookies(hostname, setCookieHeaders) {
    if (!setCookieHeaders) return;
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    const existing = this._cookieJar.get(hostname) || [];

    for (const raw of list) {
      const parts = raw.split(';')[0].trim();
      const eqIdx = parts.indexOf('=');
      if (eqIdx < 1) continue;
      const name  = parts.slice(0, eqIdx).trim();
      const value = parts.slice(eqIdx + 1).trim();
      // Update existing or add new
      const idx = existing.findIndex(c => c.name === name);
      if (idx >= 0) existing[idx].value = value;
      else existing.push({ name, value });
    }

    this._cookieJar.set(hostname, existing);
  }

  get userAgent() { return this._lastUA; }
  get profile()   { return this._lastProfile; }
}

// ═══════════════════════════════════════════════════
// ⏳ TIMING & RANDOMIZATION
// ═══════════════════════════════════════════════════
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay(minMs = 800, maxMs = 3000) {
  const base = randomInt(minMs, maxMs);
  // Add small jitter to avoid perfectly even spacing
  const jitter = randomInt(-100, 200);
  return Math.max(200, base + jitter);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════
// 🌐 CORE HTTP ENGINE
// ═══════════════════════════════════════════════════
const defaultSession = new StealthSession();

/**
 * Low-level stealth HTTP request
 * @param {string} url - Full URL
 * @param {Object} opts - Options
 * @param {StealthSession} opts.session - Session to use (default: shared)
 * @param {string} opts.method - HTTP method (default: GET)
 * @param {Object} opts.headers - Extra headers to merge
 * @param {string} opts.referer - Referer URL to include
 * @param {number} opts.timeout - Request timeout ms (default: 15000)
 * @param {number} opts.maxRedirects - Max redirects to follow (default: 5)
 * @param {boolean} opts.skipDelay - Skip inter-request delay (default: false)
 * @param {string|Buffer} opts.body - Request body
 * @returns {Promise<{status, headers, body, url}>}
 */
async function stealthRequest(url, opts = {}) {
  const session   = opts.session || defaultSession;
  const method    = opts.method || 'GET';
  const timeout   = opts.timeout || 15000;
  const maxRedir  = opts.maxRedirects ?? 5;

  // Inter-request delay (human-like pacing)
  if (!opts.skipDelay) {
    const timeSinceLast = Date.now() - session._lastRequestTime;
    if (timeSinceLast < 500) {
      const delay = randomDelay(800, 2500);
      await sleep(delay);
    }
  }
  session._lastRequestTime = Date.now();

  const headers = session.getHeaders(url, {
    ...(opts.referer ? { 'Referer': opts.referer } : {}),
    ...(opts.headers || {}),
  });

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const reqOpts = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers,
      timeout,
      // Mimic browser TLS settings
      ...(parsed.protocol === 'https:' ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      } : {}),
    };

    const req = lib.request(reqOpts, (res) => {
      // Store cookies
      session.storeCookies(parsed.hostname, res.headers['set-cookie']);

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(res.status || res.statusCode) && res.headers.location && maxRedir > 0) {
        const redirectUrl = new URL(res.headers.location, url).href;
        res.resume(); // drain
        return resolve(stealthRequest(redirectUrl, {
          ...opts,
          referer: url,
          maxRedirects: maxRedir - 1,
          skipDelay: true, // Don't double-delay on redirects
        }));
      }

      // Collect body
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let body = raw;

        // Decompress
        const encoding = res.headers['content-encoding'];
        try {
          if (encoding === 'gzip')    body = zlib.gunzipSync(raw);
          else if (encoding === 'deflate') body = zlib.inflateSync(raw);
          else if (encoding === 'br')      body = zlib.brotliDecompressSync(raw);
        } catch (e) {
          body = raw; // fallback to raw
        }

        resolve({
          status:  res.statusCode,
          headers: res.headers,
          body:    body.toString('utf8'),
          url,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });

    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ═══════════════════════════════════════════════════
// 🎯 PUBLIC API — Drop-in replacements
// ═══════════════════════════════════════════════════

/**
 * Stealth fetch — returns body text (follows redirects, decompresses)
 * @param {string} url
 * @param {Object} opts - Same as stealthRequest
 * @returns {Promise<string>} Response body as text
 */
async function stealthFetch(url, opts = {}) {
  const res = await stealthRequest(url, opts);
  if (res.status >= 400) {
    const err = new Error(`HTTP ${res.status}: ${url}`);
    err.status = res.status;
    err.body = res.body;
    throw err;
  }
  return res.body;
}

/**
 * Stealth JSON fetch — parses response as JSON
 * @param {string} url
 * @param {Object} opts
 * @returns {Promise<any>} Parsed JSON
 */
async function stealthFetchJSON(url, opts = {}) {
  const res = await stealthRequest(url, {
    ...opts,
    headers: {
      'Accept': 'application/json, text/plain, */*',
      ...(opts.headers || {}),
    },
  });
  if (res.status >= 400) {
    const err = new Error(`HTTP ${res.status}: ${url}`);
    err.status = res.status;
    err.body = res.body;
    throw err;
  }
  try {
    return JSON.parse(res.body);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${res.body.slice(0, 200)}`);
  }
}

/**
 * Batch fetch with human-like pacing
 * Fetches multiple URLs with random delays between each
 * @param {string[]} urls
 * @param {Object} opts - Options for each request
 * @param {number} opts.minDelay - Min delay between requests (ms, default: 1000)
 * @param {number} opts.maxDelay - Max delay between requests (ms, default: 4000)
 * @param {number} opts.concurrency - Max concurrent (default: 1, sequential)
 * @returns {Promise<Array<{url, body, error}>>}
 */
async function batchFetch(urls, opts = {}) {
  const minDelay    = opts.minDelay || 1000;
  const maxDelay    = opts.maxDelay || 4000;
  const concurrency = opts.concurrency || 1;
  const results     = [];

  if (concurrency <= 1) {
    // Sequential with delays (most human-like)
    for (let i = 0; i < urls.length; i++) {
      if (i > 0) await sleep(randomDelay(minDelay, maxDelay));
      try {
        const body = await stealthFetch(urls[i], { ...opts, skipDelay: true });
        results.push({ url: urls[i], body, error: null });
      } catch (err) {
        results.push({ url: urls[i], body: null, error: err.message });
      }
    }
  } else {
    // Limited concurrency with delays between batches
    for (let i = 0; i < urls.length; i += concurrency) {
      if (i > 0) await sleep(randomDelay(minDelay * 2, maxDelay * 2));
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map((u, idx) =>
          sleep(idx * randomDelay(300, 800)).then(() =>
            stealthFetch(u, { ...opts, skipDelay: true })
              .then(body => ({ url: u, body, error: null }))
              .catch(err => ({ url: u, body: null, error: err.message }))
          )
        )
      );
      results.push(...batchResults.map(r => r.value || r.reason));
    }
  }

  return results;
}

/**
 * Stealth fetch with retry + exponential backoff
 * @param {string} url
 * @param {Object} opts
 * @param {number} opts.retries - Max retries (default: 3)
 * @param {number} opts.backoffBase - Base delay ms (default: 2000)
 * @returns {Promise<string>}
 */
async function fetchWithRetry(url, opts = {}) {
  const retries     = opts.retries || 3;
  const backoffBase = opts.backoffBase || 2000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await stealthFetch(url, opts);
    } catch (err) {
      if (attempt === retries) throw err;

      // On 403/429, rotate UA and wait longer
      if (err.status === 403 || err.status === 429) {
        (opts.session || defaultSession).rotate();
        const wait = backoffBase * Math.pow(2, attempt) + randomInt(500, 2000);
        console.log(`   🥷 ${err.status} detected → rotated UA, waiting ${(wait/1000).toFixed(1)}s...`);
        await sleep(wait);
      } else {
        // Regular retry
        const wait = backoffBase * (attempt + 1) + randomInt(0, 1000);
        await sleep(wait);
      }
    }
  }
}

/**
 * Create an isolated session (separate cookie jar + UA)
 * Useful when scraping multiple different sites simultaneously
 */
function createSession() {
  return new StealthSession();
}

// ═══════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════
module.exports = {
  // Core
  fetch:         stealthFetch,
  fetchJSON:     stealthFetchJSON,
  request:       stealthRequest,

  // Advanced
  batchFetch,
  fetchWithRetry,

  // Session management
  createSession,
  defaultSession,

  // Utilities (for modules that need custom timing)
  sleep,
  randomDelay,
  randomInt,
};
