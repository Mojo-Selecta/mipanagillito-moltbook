// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 RECON UTILITIES — Core Toolbox for OSINT Operations
// ═══════════════════════════════════════════════════════════════════════════════
// Every recon module imports this. HTTP client, RSS parsing, entity extraction,
// text fingerprinting, rate limiting, sanitization — the whole arsenal.
// ═══════════════════════════════════════════════════════════════════════════════

const https = require('https');
const http = require('http');

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP CLIENT — Rate-limited, retry-capable, stealth headers
// ═══════════════════════════════════════════════════════════════════════════════

const REQUEST_DELAY_MS = 1500;   // 1.5s between requests — don't hammer servers
const MAX_RETRIES = 2;
const TIMEOUT_MS = 15000;
let lastRequestTime = 0;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Rate-limited HTTP GET with retries and timeout
 * @param {string} url
 * @param {object} opts - { headers, maxRetries, timeout }
 * @returns {Promise<string|null>}
 */
async function safeRequest(url, opts = {}) {
  // Rate limit
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await delay(REQUEST_DELAY_MS - elapsed);
  }
  lastRequestTime = Date.now();

  const maxRetries = opts.maxRetries ?? MAX_RETRIES;
  const timeout = opts.timeout ?? TIMEOUT_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const body = await httpGet(url, {
        timeout,
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-PR,es;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          ...(opts.headers || {}),
        },
      });
      return body;
    } catch (err) {
      if (attempt < maxRetries) {
        const backoff = (attempt + 1) * 2000;
        console.log(`      ↻ Retry ${attempt + 1}/${maxRetries} in ${backoff}ms — ${err.message}`);
        await delay(backoff);
      } else {
        return null;
      }
    }
  }
  return null;
}

function httpGet(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, {
      timeout: opts.timeout || TIMEOUT_MS,
      headers: opts.headers || {},
    }, (res) => {
      // Follow redirects (up to 3)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return httpGet(redirectUrl, opts).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }

      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// RSS PARSER — Extracts items from RSS/Atom feeds
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse RSS/Atom XML into structured items
 * @param {string} xml
 * @returns {Array<{title, link, pubDate, description, source}>}
 */
function parseRSS(xml) {
  if (!xml) return [];
  const items = [];

  // Try RSS 2.0 format first
  const rssItemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = rssItemRegex.exec(xml)) !== null) {
    items.push(parseRSSItem(match[1]));
  }

  // Try Atom format if no RSS items
  if (items.length === 0) {
    const atomEntryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = atomEntryRegex.exec(xml)) !== null) {
      items.push(parseAtomEntry(match[1]));
    }
  }

  return items.filter(i => i.title);
}

function parseRSSItem(xml) {
  return {
    title: extractTag(xml, 'title'),
    link: extractTag(xml, 'link') || extractAttr(xml, 'link', 'href'),
    pubDate: extractTag(xml, 'pubDate') || extractTag(xml, 'dc:date'),
    description: stripHtml(extractTag(xml, 'description')),
    source: extractTag(xml, 'source') || '',
  };
}

function parseAtomEntry(xml) {
  return {
    title: extractTag(xml, 'title'),
    link: extractAttr(xml, 'link', 'href') || extractTag(xml, 'link'),
    pubDate: extractTag(xml, 'published') || extractTag(xml, 'updated'),
    description: stripHtml(extractTag(xml, 'summary') || extractTag(xml, 'content')),
    source: extractTag(xml, 'source') || '',
  };
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function extractAttr(xml, tag, attr) {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY EXTRACTION — Find known entities in text
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Match known target names/keywords in text
 * @param {string} text
 * @param {Array<{name, keywords}>} targets
 * @returns {string[]} matched entity names
 */
function extractEntities(text, targets) {
  if (!text || !targets) return [];
  const lower = text.toLowerCase();
  const matched = [];

  for (const target of targets) {
    const found = (target.keywords || [target.name]).some(kw =>
      lower.includes(kw.toLowerCase())
    );
    if (found && !matched.includes(target.name)) {
      matched.push(target.name);
    }
  }
  return matched;
}


// ═══════════════════════════════════════════════════════════════════════════════
// TEXT ANALYSIS — Fingerprinting, classification, sentiment signals
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a short fingerprint for deduplication
 * @param {string} text
 * @returns {string}
 */
function fingerprint(text) {
  if (!text) return '';
  // Normalize, take first 80 chars of significant words
  const words = text
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 12);
  return words.join(':');
}

/**
 * Classify text into broad categories
 * @param {string} text
 * @returns {{category: string, subcategory: string, signals: string[]}}
 */
function classifyText(text) {
  if (!text) return { category: 'unknown', subcategory: 'unknown', signals: [] };
  const lower = text.toLowerCase();
  const signals = [];

  // Scandal / Corruption
  if (/corrupci[oó]n|escándalo|arrest|acusad|investiga|soborno|fraude|malversa/i.test(lower)) {
    signals.push('scandal');
  }
  // Promises / Commitments
  if (/prometi|compromet|va a|planea|anuncia.*plan|propone|jura/i.test(lower)) {
    signals.push('promise');
  }
  // Failures / Broken
  if (/fracas|no cumpli|fall[oó]|abandon|incumpl|negligencia/i.test(lower)) {
    signals.push('failure');
  }
  // Money / Budget
  if (/presupuesto|millon|billon|fondo|dinero|gasto|contrato|licitaci/i.test(lower)) {
    signals.push('money');
  }
  // Energy / Outages
  if (/apag[oó]n|energ[ií]a|el[eé]ctric|generaci|tarifa|factura luz|blackout/i.test(lower)) {
    signals.push('energy');
  }
  // Immigration / Federal
  if (/ice|deporta|inmigra|federal|congres|trump|biden|casa blanca/i.test(lower)) {
    signals.push('federal');
  }
  // Emergency / Disaster
  if (/hurac[aá]n|terremo|emergenc|fema|desastre|inundaci|tsunami/i.test(lower)) {
    signals.push('emergency');
  }
  // Status / Sovereignty
  if (/estadidad|independen|status|colonial|plebiscit|soberan/i.test(lower)) {
    signals.push('status');
  }
  // Economy
  if (/econom|inflaci|salario|empleo|desempleo|costo vida|pobreza/i.test(lower)) {
    signals.push('economy');
  }
  // Health
  if (/salud|hospital|medic|enfermed|pandemia|virus|vacuna/i.test(lower)) {
    signals.push('health');
  }

  // Pick primary category from signals
  const priorityOrder = ['scandal', 'energy', 'emergency', 'federal', 'money', 'failure', 'promise', 'status', 'economy', 'health'];
  const category = priorityOrder.find(p => signals.includes(p)) || 'general';

  return { category, subcategory: signals[1] || 'general', signals };
}

/**
 * Quick sentiment check — positive, negative, or neutral
 */
function quickSentiment(text) {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();

  const negativePatterns = /muri|muert|arrest|crisis|fracas|escan|corrupt|apag|destruy|sufr|colapso|desastre|peor|fall[oó]|no cumpli|negligencia|demanda/i;
  const positivePatterns = /mejor|éxito|logr|avance|progres|celebra|reconstruy|innova|record positiv|salva/i;

  const negScore = (lower.match(negativePatterns) || []).length;
  const posScore = (lower.match(positivePatterns) || []).length;

  if (negScore > posScore) return 'negative';
  if (posScore > negScore) return 'positive';
  return 'neutral';
}


// ═══════════════════════════════════════════════════════════════════════════════
// SANITIZATION — Strip injection attempts, clean data
// ═══════════════════════════════════════════════════════════════════════════════

function sanitize(text) {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control chars
    .replace(/[<>]/g, '')                                  // Basic XSS
    .slice(0, 5000);                                        // Hard length cap
}


// ═══════════════════════════════════════════════════════════════════════════════
// TIMESTAMP HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function isRecent(dateStr, hoursAgo = 48) {
  try {
    const ts = new Date(dateStr).getTime();
    if (isNaN(ts)) return true; // If can't parse, assume recent
    return (Date.now() - ts) < (hoursAgo * 60 * 60 * 1000);
  } catch {
    return true;
  }
}

function toPRTime(date) {
  return new Date(date).toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' });
}


// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // HTTP
  safeRequest,
  httpGet,
  delay,

  // RSS
  parseRSS,
  stripHtml,

  // Entity & Text
  extractEntities,
  fingerprint,
  classifyText,
  quickSentiment,

  // Sanitization
  sanitize,

  // Time
  isRecent,
  toPRTime,
};
