/**
 * 🕵️ RECON UTILITIES
 * ═══════════════════════════════════════════
 * Shared tools for all recon modules:
 * - HTTP client with timeout + retries
 * - RSS/XML parser (no dependencies)
 * - Entity extraction
 * - Text classification
 * - Dedup fingerprinting
 */

const crypto = require('crypto');

/* ─── HTTP Client ─── */

async function safeRequest(url, opts = {}) {
  const { timeout = 15000, retries = 2 } = opts;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);

      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'GillitoRecon/1.0 (PR News Monitor)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          ...(opts.headers || {})
        }
      });
      clearTimeout(timer);

      if (!res.ok) {
        if (attempt < retries && res.status >= 500) continue;
        return null;
      }

      return await res.text();
    } catch (err) {
      if (attempt < retries && err.name !== 'AbortError') continue;
      return null;
    }
  }
  return null;
}

/* ─── RSS Parser (no external deps) ─── */

function parseRSS(xml) {
  if (!xml) return [];
  const items = [];

  // Handle both RSS <item> and Atom <entry>
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] || match[2];

    const title       = extractTag(block, 'title');
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
    const link        = extractLink(block);
    const pubDate     = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const source      = extractTag(block, 'source') || extractTag(block, 'dc:creator') || extractTag(block, 'author');

    items.push({ title, description, link, pubDate, source });
  }

  return items;
}

function extractTag(block, tag) {
  // Handle CDATA: <title><![CDATA[actual content]]></title>
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = block.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular tags
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(regex);
  if (m) return stripHtml(m[1].trim());

  return '';
}

function extractLink(block) {
  // Atom: <link href="..." />
  const atomLink = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (atomLink) return atomLink[1];

  // RSS: <link>...</link>
  return extractTag(block, 'link');
}

function stripHtml(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ─── Entity Extraction ─── */

function extractEntities(text, entityList) {
  if (!text || !entityList) return [];
  const lower = text.toLowerCase();
  const found = [];

  for (const entity of entityList) {
    const name = typeof entity === 'string' ? entity : entity.name;
    const aliases = typeof entity === 'object' ? (entity.aliases || []) : [];
    const allNames = [name, ...aliases];

    for (const n of allNames) {
      if (lower.includes(n.toLowerCase())) {
        found.push(name);
        break;
      }
    }
  }

  return [...new Set(found)];
}

/* ─── Text Classification ─── */

const SIGNAL_PATTERNS = {
  scandal:     /escándalo|scandal|investig|corrup|fraude|malvers|soborno|acus|indict|arrest|arres/i,
  outage:      /apagón|blackout|sin luz|power outage|interrup|cortaron la luz|se fue la luz/i,
  price_hike:  /aument|subió|tarifa|factura|cobr|rate hike|surcharge|cargo/i,
  protest:     /protest|manifest|marcha|paro|huelga|strike|rally|demonstr/i,
  corruption:  /corrup|malvers|robo|desvío|fondos|kickback|bribe|embezzle/i,
  deportation: /deport|ice|redada|raid|operativo|deten|immigration|migra/i,
  disaster:    /huracán|hurricane|terremoto|earthquake|inundación|flood|emergencia|emergency/i,
  funding:     /fondos|fund|presupuesto|budget|asignación|grant|fema|hud/i,
  resignation: /renunci|resign|dimis|fired|desped|removed|suspend/i,
  violence:    /asesinat|murder|bala|shoot|violen|homicid|crimen|crime/i,
};

const CATEGORY_MAP = {
  scandal:     'scandal',
  corruption:  'scandal',
  outage:      'crisis',
  disaster:    'crisis',
  violence:    'crisis',
  protest:     'unrest',
  price_hike:  'economic',
  funding:     'economic',
  deportation: 'federal',
  resignation: 'political',
};

function classifyText(text) {
  const signals = [];
  for (const [signal, pattern] of Object.entries(SIGNAL_PATTERNS)) {
    if (pattern.test(text)) signals.push(signal);
  }

  // Primary category from highest-priority signal
  let category = 'general';
  for (const s of signals) {
    if (CATEGORY_MAP[s]) { category = CATEGORY_MAP[s]; break; }
  }

  return { signals, category };
}

/* ─── Fingerprinting (dedup) ─── */

function fingerprint(text) {
  if (!text) return '';
  const normalized = text.toLowerCase()
    .replace(/[^a-záéíóúñ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 3)
    .sort()
    .join(' ');
  return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 12);
}

/* ─── Time Utils ─── */

function isRecent(dateStr, maxHours = 48) {
  if (!dateStr) return true; // if no date, assume recent
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    return (Date.now() - d.getTime()) < maxHours * 3600 * 1000;
  } catch {
    return true;
  }
}

/* ─── Sanitization ─── */

function sanitize(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')       // strip HTML
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1000);
}

/* ─── Exports ─── */

module.exports = {
  safeRequest,
  parseRSS,
  extractTag,
  extractLink,
  stripHtml,
  extractEntities,
  classifyText,
  SIGNAL_PATTERNS,
  fingerprint,
  isRecent,
  sanitize,
};
