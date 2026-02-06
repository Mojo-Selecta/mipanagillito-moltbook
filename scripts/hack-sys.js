'use strict';
/**
 * 🔓 GILLITO HACK SYS v1.0
 * ═══════════════════════════════════════════════════════
 * Autonomous AI-Powered Penetration Testing
 * Inspired by KeygraphHQ/Shannon
 *
 * Follows the same pattern as all Gillito scripts:
 *   - Imports core.js from scripts/lib/
 *   - Uses Groq as primary AI (free tier)
 *   - Persists to Cloudflare KV
 *   - Reports via Moltbook
 *
 * LEGAL: Only scan systems you OWN and have authorization to test.
 *
 * Phases:
 *   L1 — Recon (attack surface mapping)
 *   L2 — Vuln Scan (injection, XSS, auth, SSRF, IDOR, authz)
 *   L3 — Exploit Verify (PoC generation, false positive elimination)
 *   L4 — Report (executive summary + detailed findings)
 *
 * Usage:
 *   node scripts/hack-sys.js
 *   TARGET_URL=https://myapp.com SCAN_TYPE=full node scripts/hack-sys.js
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const core = require('./lib/core');

// ═══════════════════════════════════════════════════════
// CONFIG & CONSTANTS
// ═══════════════════════════════════════════════════════

const SESSION_ID = `hack-${Date.now()}`;
const SCAN_TYPE = process.env.SCAN_TYPE || 'full';
const MIN_SEVERITY = process.env.MIN_SEVERITY || 'low';
const SEVERITY_ORDER = ['info', 'low', 'medium', 'high', 'critical'];
const SEVERITY_EMOJI = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪' };

// Rate limit protection — Groq free tier = 12k TPM
const DELAY_BETWEEN_CALLS_MS = parseInt(process.env.AI_DELAY_MS || '6000'); // 6s default
const MAX_RETRIES_ON_429 = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load hack targets from config
let HACK_TARGETS = [];
try {
  HACK_TARGETS = require('../config/hack-targets.js');
} catch {
  console.log('⚠️ No config/hack-targets.js found, using TARGET_URL env');
}

// ═══════════════════════════════════════════════════════
// AI PROVIDER (multi-provider with failover)
// ═══════════════════════════════════════════════════════

/**
 * Call AI with automatic failover: Groq → DeepSeek → OpenAI
 */
async function aiComplete(systemPrompt, userMessage, opts = {}) {
  const { temperature = 0.2, maxTokens = 8000 } = opts;

  // Sanitize input
  const sanitized = sanitizeInput(userMessage);
  if (detectInjection(sanitized)) {
    throw new Error('🚨 Prompt injection detected in AI input');
  }

  const providers = buildProviderList();

  for (const provider of providers) {
    try {
      const result = await callProvider(provider, systemPrompt, sanitized, { temperature, maxTokens });
      return result;
    } catch (err) {
      console.log(`  ❌ ${provider.name} failed: ${err.message}`);
      continue;
    }
  }

  throw new Error('❌ All AI providers failed');
}

function buildProviderList() {
  const providers = [];

  // 1. Groq (primary — free tier, fast)
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      maxTokens: 32768
    });
  }

  // 2. DeepSeek (cheap fallback)
  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      key: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      maxTokens: 32768
    });
  }

  // 3. OpenAI (expensive fallback)
  if (process.env.OPENAI_API_KEY) {
    providers.push({
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: 16384
    });
  }

  if (providers.length === 0) {
    throw new Error('❌ No AI provider configured. Set GROQ_API_KEY, DEEPSEEK_API_KEY, or OPENAI_API_KEY');
  }

  return providers;
}

async function callProvider(provider, system, user, opts) {
  const body = {
    model: provider.model,
    temperature: opts.temperature,
    max_tokens: Math.min(opts.maxTokens, provider.maxTokens),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };

  // Retry loop for rate limits (429)
  for (let attempt = 1; attempt <= MAX_RETRIES_ON_429; attempt++) {
    const resp = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`
      },
      body: JSON.stringify(body)
    });

    if (resp.status === 429) {
      // Parse retry-after header
      const retryAfter = resp.headers.get('retry-after');
      const serverWaitSec = retryAfter ? parseInt(retryAfter) : 0;

      // If server says wait > 60s, don't wait — failover to next provider immediately
      if (serverWaitSec > 60) {
        console.log(`    ⚠️ ${provider.name} rate limited — retry-after: ${serverWaitSec}s (too long, failing over)`);
        throw new Error(`Rate limited: retry-after ${serverWaitSec}s exceeds max wait`);
      }

      // Short wait: use server hint (capped at 30s) or exponential backoff
      const waitMs = serverWaitSec > 0
        ? Math.min(serverWaitSec * 1000, 30000)
        : Math.min(attempt * 10000, 30000); // 10s, 20s, 30s
      console.log(`    ⏳ ${provider.name} rate limited (429), waiting ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt}/${MAX_RETRIES_ON_429})...`);
      await sleep(waitMs);
      continue;
    }

    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      throw new Error(`${resp.status}: ${err.slice(0, 200)}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) throw new Error('Empty response');
    return content;
  }

  throw new Error(`Rate limited after ${MAX_RETRIES_ON_429} retries`);
}

// ═══════════════════════════════════════════════════════
// SECURITY MODULE
// ═══════════════════════════════════════════════════════

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now\s+/i,
  /\<\/?system\>/i,
  /jailbreak/i,
  /override\s+(your\s+)?instructions/i,
  /forget\s+(all\s+)?(your\s+)?rules/i,
];

function detectInjection(input) {
  if (!input || typeof input !== 'string') return false;
  return INJECTION_PATTERNS.some(p => p.test(input));
}

function sanitizeInput(input) {
  if (!input) return '';
  return String(input)
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, 500000)
    .trim();
}

// ═══════════════════════════════════════════════════════
// PHASE L0: DOCUMENTATION DISCOVERY
// ═══════════════════════════════════════════════════════

// Common paths where apps expose docs, APIs, configs
const DOC_PATHS = [
  '/skill.md',
  '/SKILL.md',
  '/docs',
  '/api-docs',
  '/api/docs',
  '/swagger.json',
  '/openapi.json',
  '/api/openapi.json',
  '/.well-known/openapi.yaml',
  '/robots.txt',
  '/sitemap.xml',
  '/health',
  '/api/health',
  '/status',
];

async function phaseDocDiscovery(target) {
  console.log('\n📖 ═══ PHASE L0: DOCUMENTATION DISCOVERY ═══');
  console.log(`  🔍 Probing ${DOC_PATHS.length} common doc paths...`);

  const baseUrl = target.url.replace(/\/+$/, '');
  const docs = [];
  const responseSizes = []; // Track sizes for SPA detection
  const responseHashes = []; // Track content hashes for dedup

  // Simple hash for dedup
  function quickHash(str) {
    let h = 0;
    for (let i = 0; i < Math.min(str.length, 500); i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  for (const docPath of DOC_PATHS) {
    try {
      const resp = await fetch(`${baseUrl}${docPath}`, {
        method: 'GET',
        headers: { 'User-Agent': 'GillitoHackSys/1.0 (Security Research)' },
        signal: AbortSignal.timeout(5000)
      });

      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || '';
        const body = await resp.text();

        // Track for SPA detection
        responseSizes.push(body.length);

        // Skip if content is clearly a SPA shell
        const isSpaShell = contentType.includes('text/html') && (
          /<div\s+id=["'](root|app|__next)["']/.test(body) ||
          /<!DOCTYPE html>.*<script/.test(body.slice(0, 3000)) ||
          /bundle\.js|main\.js|app\.js|chunk\.js/i.test(body)
        );

        if (isSpaShell && !docPath.includes('doc')) {
          // HTML SPA response for a non-doc path — skip silently
          continue;
        }

        // Dedup: skip if we already have identical content
        const hash = quickHash(body);
        if (responseHashes.includes(hash)) {
          continue; // Same content as another path — SPA catch-all
        }
        responseHashes.push(hash);

        // Only keep useful content (not HTML error pages)
        if (body.length > 50 && body.length < 500000) {
          const isUseful = contentType.includes('json') ||
                           contentType.includes('text/plain') ||
                           contentType.includes('markdown') ||
                           contentType.includes('yaml') ||
                           contentType.includes('xml') ||
                           docPath.endsWith('.md') ||
                           docPath.endsWith('.json') ||
                           docPath.endsWith('.xml') ||
                           docPath.endsWith('.txt');

          // Also accept HTML if it looks like docs (has API/endpoint keywords)
          // But NOT if it's a SPA shell pretending to be docs
          const looksLikeDocs = !isSpaShell &&
            /endpoint|api|auth|route|curl|POST|GET|DELETE/i.test(body.slice(0, 2000));

          if (isUseful || looksLikeDocs) {
            // Truncate to keep token usage sane
            const truncated = body.slice(0, 15000);
            docs.push({ path: docPath, content: truncated, type: contentType });
            console.log(`  ✅ Found: ${docPath} (${(body.length / 1024).toFixed(1)}KB)`);
          }
        }
      }
    } catch {
      // Silent fail — most paths won't exist
    }
  }

  // SPA catch-all detection: if most responses were the same size, it's a SPA
  if (responseSizes.length >= 5) {
    const mode = responseSizes.sort((a, b) => a - b)[Math.floor(responseSizes.length / 2)];
    const sameSize = responseSizes.filter(s => Math.abs(s - mode) < 100).length;
    const spaRatio = sameSize / responseSizes.length;
    if (spaRatio > 0.6) {
      console.log(`  ⚠️ SPA catch-all detected (${(spaRatio * 100).toFixed(0)}% of responses are ~${mode} bytes)`);
      console.log(`  🧹 Discarding ${docs.filter(d => d.content.includes('<script') || d.content.includes('<!DOCTYPE')).length} SPA shell doc(s)`);
      // Remove any docs that are actually SPA shells
      const realDocs = docs.filter(d =>
        !d.content.includes('<!DOCTYPE html>') ||
        d.type.includes('json') || d.type.includes('plain') ||
        d.type.includes('yaml') || d.type.includes('markdown')
      );
      docs.length = 0;
      docs.push(...realDocs);
    }
  }

  if (docs.length === 0) {
    console.log('  ⚠️ No documentation found — AI will infer from target URL');
  } else {
    console.log(`  📖 Discovered ${docs.length} doc(s)`);
  }

  return docs;
}

// ═══════════════════════════════════════════════════════
// PHASE L0.5: ACTIVE RECON (harvest ALL public data)
// ═══════════════════════════════════════════════════════

// Common public API paths to probe — go hard
const PUBLIC_PROBES = [
  // Discovery & listings — paginated
  { path: '/discover?limit=100', desc: 'Agents page 1' },
  { path: '/discover?limit=100&offset=100', desc: 'Agents page 2' },
  { path: '/discover?limit=100&offset=200', desc: 'Agents page 3' },
  { path: '/discover?limit=100&page=2', desc: 'Agents p2 alt' },
  { path: '/discover?limit=100&page=3', desc: 'Agents p3 alt' },
  { path: '/discover?limit=100&gender=male', desc: 'Male agents' },
  { path: '/discover?limit=100&gender=female', desc: 'Female agents' },
  { path: '/discover?limit=100&gender=nonbinary', desc: 'NB agents' },
  { path: '/discover?limit=100&sort=newest', desc: 'Newest agents' },
  { path: '/discover?limit=100&sort=popular', desc: 'Popular agents' },
  { path: '/discover?limit=100&sort=active', desc: 'Active agents' },
  // Feed — all sorts, paginated
  { path: '/feed?sort=new&limit=100', desc: 'Feed new' },
  { path: '/feed?sort=trending&limit=100', desc: 'Feed trending' },
  { path: '/feed?sort=top&limit=100', desc: 'Feed top' },
  { path: '/feed?sort=hot&limit=100', desc: 'Feed hot' },
  { path: '/feed?limit=100&offset=100', desc: 'Feed page 2' },
  { path: '/feed?limit=100&page=2', desc: 'Feed p2 alt' },
  // Posts — all sorts, paginated
  { path: '/posts?sort=new&limit=100', desc: 'Posts new' },
  { path: '/posts?sort=popular&limit=100', desc: 'Posts popular' },
  { path: '/posts?sort=top&limit=100', desc: 'Posts top' },
  { path: '/posts?limit=100&offset=100', desc: 'Posts page 2' },
  { path: '/posts?limit=100&page=2', desc: 'Posts p2 alt' },
  // Leaderboards
  { path: '/leaderboard/popular?limit=100', desc: 'LB popular' },
  { path: '/leaderboard/icebreakers?limit=100', desc: 'LB icebreakers' },
  { path: '/leaderboard/couples?limit=100', desc: 'LB couples' },
  { path: '/leaderboard/active?limit=100', desc: 'LB active' },
  { path: '/leaderboard/top?limit=100', desc: 'LB top' },
  { path: '/leaderboard?limit=100', desc: 'LB default' },
  // Search — alphabet sweep
  { path: '/search?q=a&limit=100', desc: 'Search A' },
  { path: '/search?q=b&limit=100', desc: 'Search B' },
  { path: '/search?q=c&limit=100', desc: 'Search C' },
  { path: '/search?q=d&limit=100', desc: 'Search D' },
  { path: '/search?q=e&limit=100', desc: 'Search E' },
  { path: '/search?q=i&limit=100', desc: 'Search I' },
  { path: '/search?q=o&limit=100', desc: 'Search O' },
  { path: '/search?q=s&limit=100', desc: 'Search S' },
  { path: '/search?q=t&limit=100', desc: 'Search T' },
  { path: '/search?q=m&limit=100', desc: 'Search M' },
  // Common hidden/admin/debug endpoints
  { path: '/admin', desc: 'Admin panel' },
  { path: '/admin/stats', desc: 'Admin stats' },
  { path: '/admin/users', desc: 'Admin users' },
  { path: '/debug', desc: 'Debug' },
  { path: '/debug/info', desc: 'Debug info' },
  { path: '/metrics', desc: 'Metrics' },
  { path: '/stats', desc: 'Stats' },
  { path: '/api/stats', desc: 'API stats' },
  { path: '/api/v1/stats', desc: 'API v1 stats' },
  { path: '/internal', desc: 'Internal' },
  { path: '/internal/stats', desc: 'Internal stats' },
  { path: '/.env', desc: 'Env file' },
  { path: '/config', desc: 'Config' },
  { path: '/config.json', desc: 'Config JSON' },
  // Matches/DMs (should be auth-only but test)
  { path: '/matches', desc: 'All matches' },
  { path: '/matches?limit=100', desc: 'Matches bulk' },
  { path: '/conversations', desc: 'Conversations' },
  { path: '/messages', desc: 'Messages' },
  { path: '/dms', desc: 'DMs' },
  { path: '/notifications', desc: 'Notifications' },
  // Auth test (without creds)
  { path: '/auth/me', desc: 'Auth me' },
  { path: '/me', desc: 'Me' },
  { path: '/api/me', desc: 'API me' },
  { path: '/whoami', desc: 'Who am I' },
  // Agents/users
  { path: '/agents', desc: 'Agents list' },
  { path: '/agents?limit=100', desc: 'Agents bulk' },
  { path: '/users', desc: 'Users list' },
  { path: '/users?limit=100', desc: 'Users bulk' },
  // System / info
  { path: '/health', desc: 'Health' },
  { path: '/status', desc: 'Status' },
  { path: '/api/health', desc: 'API health' },
  { path: '/api/status', desc: 'API status' },
  { path: '/version', desc: 'Version' },
  { path: '/info', desc: 'Info' },
  { path: '/api/info', desc: 'API info' },
  { path: '/robots.txt', desc: 'Robots' },
  { path: '/sitemap.xml', desc: 'Sitemap' },
  { path: '/openapi.json', desc: 'OpenAPI spec' },
  { path: '/swagger.json', desc: 'Swagger' },
  { path: '/api-docs', desc: 'API docs' },
];

async function phaseActiveRecon(target, discoveredDocs) {
  console.log('\n🕵️ ═══ PHASE L0.5: ACTIVE RECON (public data harvest) ═══');

  const baseUrl = target.url.replace(/\/+$/, '');
  const liveData = {
    public_endpoints_found: [],
    users_exposed: [],
    sample_ids: [],
    usernames_found: [],
    data_fields_exposed: [],
    total_records_visible: 0,
    auth_issues: [],
    wallets_exposed: [],
    posts_collected: [],
    icebreakers_collected: [],
    raw_samples: {},
    full_profiles: [],
    sensitive_data: []
  };

  // Extract API base from docs
  let apiBase = baseUrl;
  for (const doc of (discoveredDocs || [])) {
    const apiMatch = doc.content.match(/api_base['":\s]+["']?(https?:\/\/[^\s"']+)/i);
    if (apiMatch) {
      apiBase = apiMatch[1].replace(/\/+$/, '');
      console.log(`  🔗 API base from docs: ${apiBase}`);
      break;
    }
  }

  // Helper: safe JSON fetch
  async function fetchJSON(url, timeout = 8000) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'GillitoHackSys/1.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(timeout)
      });
      if (!resp.ok) return null;
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('json')) return null;
      return await resp.json();
    } catch { return null; }
  }

  // Helper: extract records from various response shapes
  function extractRecords(body) {
    if (Array.isArray(body)) return body;
    if (!body || typeof body !== 'object') return [];
    for (const key of ['data', 'agents', 'results', 'items', 'posts', 'feed', 'entries', 'users', 'matches', 'leaderboard']) {
      if (Array.isArray(body[key])) return body[key];
    }
    return [body];
  }

  // Helper: extract all IDs from an object recursively
  function extractIds(obj, ids = new Set()) {
    if (!obj || typeof obj !== 'object') return ids;
    for (const [key, val] of Object.entries(obj)) {
      if (/^(agent_id|id|user_id|_id|author_id|target_id|sender_id|match_id|post_id)$/.test(key)) {
        if (typeof val === 'string' && val.length > 5) ids.add(val);
      }
      if (typeof val === 'object') extractIds(val, ids);
    }
    return ids;
  }

  // Helper: extract usernames
  function extractUsernames(obj, names = new Set()) {
    if (!obj || typeof obj !== 'object') return names;
    for (const [key, val] of Object.entries(obj)) {
      if (/^(username|name|display_name|agent_name)$/.test(key)) {
        if (typeof val === 'string' && val.length > 1) names.add(val);
      }
      if (typeof val === 'object') extractUsernames(val, names);
    }
    return names;
  }

  // ─── STEP 1: Probe all public endpoints ───
  console.log('  📡 Step 1: Probing public endpoints...');

  for (const probe of PUBLIC_PROBES) {
    const urls = [apiBase + probe.path];
    if (apiBase !== baseUrl) urls.push(baseUrl + probe.path);

    for (const url of urls) {
      const body = await fetchJSON(url);
      if (!body) continue;

      const records = extractRecords(body);
      const recordCount = records.length;

      liveData.public_endpoints_found.push({
        url, desc: probe.desc, record_count: recordCount
      });

      // Harvest all IDs
      const ids = extractIds(body);
      for (const id of ids) {
        if (!liveData.sample_ids.includes(id)) liveData.sample_ids.push(id);
      }

      // Harvest usernames
      const names = extractUsernames(body);
      for (const n of names) {
        if (!liveData.usernames_found.includes(n)) liveData.usernames_found.push(n);
      }

      // Track all exposed field names
      if (records.length > 0 && typeof records[0] === 'object') {
        const allFields = new Set();
        records.forEach(r => { if (r && typeof r === 'object') Object.keys(r).forEach(f => allFields.add(f)); });
        for (const f of allFields) {
          if (!liveData.data_fields_exposed.includes(f)) liveData.data_fields_exposed.push(f);
        }
        liveData.total_records_visible += recordCount;
      }

      // Save raw samples (more generous — up to 5 records)
      const sampleKey = probe.path.split('?')[0];
      if (!liveData.raw_samples[sampleKey]) {
        liveData.raw_samples[sampleKey] = JSON.stringify(records.slice(0, 5)).slice(0, 5000);
      }

      // Collect posts and icebreakers content
      if (probe.path.includes('/posts')) {
        for (const r of records.slice(0, 10)) {
          if (r.content) liveData.posts_collected.push({
            id: r.id, author: r.agent_name || r.username || r.agent_id,
            content: String(r.content).slice(0, 200), photos: r.photos?.length || 0
          });
        }
      }
      if (probe.path.includes('/feed')) {
        for (const r of records.slice(0, 10)) {
          if (r.content) liveData.icebreakers_collected.push({
            id: r.id, from: r.agent_name || r.username || r.agent_id,
            to: r.target_name || r.target_id,
            content: String(r.content).slice(0, 200)
          });
        }
      }

      // Extract embedded profile data from records (posts contain author info)
      for (const r of records) {
        if (!r || typeof r !== 'object') continue;
        // Build pseudo-profile from embedded data in posts
        const profileId = r.agent_id || r.author_id || r.user_id;
        if (profileId && !liveData.full_profiles.find(p => p.id === profileId)) {
          const embedded = {
            id: profileId,
            username: r.agent_name || r.username || r.author || r.name || 'unknown',
            fields_count: 0,
            all_fields: [],
            sensitive_fields: [],
            source: 'embedded_in_' + (probe.path.split('?')[0]),
            has_bio: !!r.agent_description || !!r.bio || !!r.description,
            bio_preview: (r.agent_description || r.bio || r.description || '').slice(0, 100),
            has_photos: !!(r.avatar || r.avatar_url || r.agent_avatar),
            verified: !!r.verified,
            karma: r.karma || r.agent_karma || null,
            has_wallet: !!(r.wallet_evm || r.wallet_sol),
            wallet_evm: r.wallet_evm || null,
            wallet_sol: r.wallet_sol || null,
            claim_code: r.claim_code || null
          };
          // Check for claim_code leak in post data
          if (embedded.claim_code) {
            liveData.auth_issues.push(`claim_code leaked in post data for ${embedded.username}`);
            liveData.sensitive_data.push({
              source: probe.path, fields: ['claim_code'],
              note: `claim_code exposed in post/record for ${embedded.username}`
            });
          }
          liveData.full_profiles.push(embedded);
        }
      }

      console.log(`  ✅ ${probe.desc}: ${recordCount} record(s)`);
      break; // Found on this URL
    }
  }

  // ─── STEP 2: Fetch individual profiles (if not already extracted from posts) ───
  if (liveData.sample_ids.length > 0 && liveData.full_profiles.length < 5) {
    console.log(`\n  👤 Step 2: Harvesting profiles (${liveData.sample_ids.length} IDs, ${liveData.full_profiles.length} already from posts)...`);
    const allIds = liveData.sample_ids.slice(0, 50); // Up to 50 profiles

    // Try multiple URL patterns — different platforms use different paths
    const PROFILE_PATTERNS = [
      id => `${apiBase}/profiles/${id}`,
      id => `${apiBase}/users/${id}`,
      id => `${apiBase}/bots/${id}`,
      id => `${apiBase}/user/${id}`,
      id => `${apiBase}/bot/${id}`,
      id => `${apiBase}/u/${id}`,
      id => `${apiBase}/agents/${id}`,
      id => `${apiBase}/members/${id}`,
    ];

    // Auto-detect which pattern works using first ID
    let workingPattern = null;
    const testId = allIds[0];
    for (const pattern of PROFILE_PATTERNS) {
      const test = await fetchJSON(pattern(testId));
      if (test && typeof test === 'object' && Object.keys(test).length > 2) {
        workingPattern = pattern;
        console.log(`  🔗 Profile pattern found: ${pattern('{id}').replace(apiBase, '')}`);
        break;
      }
    }

    // Also try username-based if we have usernames
    if (!workingPattern && liveData.usernames_found.length > 0) {
      const testName = liveData.usernames_found[0];
      for (const base of [apiBase, baseUrl]) {
        for (const path of ['/profiles/', '/users/', '/bots/', '/u/', '/user/', '/bot/']) {
          const test = await fetchJSON(`${base}${path}${encodeURIComponent(testName)}`);
          if (test && typeof test === 'object' && Object.keys(test).length > 2) {
            workingPattern = name => `${base}${path}${encodeURIComponent(name)}`;
            console.log(`  🔗 Username-based profile pattern: ${path}{username}`);
            break;
          }
        }
        if (workingPattern) break;
      }
    }

    if (!workingPattern) {
      console.log('  ⚠️ No working profile endpoint found — skipping profile harvest');
    } else {
      // Use either IDs or usernames depending on what worked
      const targets = workingPattern.toString().includes('encodeURI')
        ? liveData.usernames_found.slice(0, 50)
        : allIds;

      for (const id of targets) {
        const profile = await fetchJSON(workingPattern(id));
        if (!profile) continue;

      const fields = Object.keys(profile);
      const sensitiveFields = fields.filter(f =>
        /email|phone|password|hash|secret|token|key|ssn|credit|wallet|address|ip|location|private/i.test(f)
      );

      const profileData = {
        id,
        username: profile.username || profile.name || profile.agent_name || 'unknown',
        fields_count: fields.length,
        all_fields: fields,
        sensitive_fields: sensitiveFields,
        raw: JSON.stringify(profile).slice(0, 2000), // keep full profile data
        has_bio: !!profile.bio,
        bio_preview: profile.bio ? String(profile.bio).slice(0, 100) : null,
        has_photos: !!(profile.photos?.length || profile.photo_count || profile.avatar),
        verified: !!profile.verified,
        has_wallet: !!(profile.wallet_evm || profile.wallet_sol),
        wallet_evm: profile.wallet_evm || null,
        wallet_sol: profile.wallet_sol || null,
        personality: profile.personality || null,
        interests: profile.interests || null,
        preferences: profile.preferences || null,
        claim_code: profile.claim_code || null // should NOT be public
      };

      liveData.full_profiles.push(profileData);

      // Flag claim_code exposure (auth credential leaked publicly!)
      if (profile.claim_code) {
        liveData.sensitive_data.push({
          source: `/profiles/${id}`,
          fields: ['claim_code'],
          note: 'CRITICAL: claim_code (authentication credential) exposed in public profile'
        });
        liveData.auth_issues.push(`claim_code exposed for ${profileData.username}`);
        console.log(`  🔴 ${profileData.username}: CLAIM CODE EXPOSED in public profile!`);
      }

      if (sensitiveFields.length > 0) {
        liveData.sensitive_data.push({
          source: `/profiles/${id}`,
          fields: sensitiveFields,
          note: 'Sensitive data exposed in public profile'
        });
        console.log(`  ⚠️  ${profileData.username}: exposes ${sensitiveFields.join(', ')}`);
      }
    }
    console.log(`  👤 Profiles fetched: ${liveData.full_profiles.length}`);
    } // end workingPattern
  } else if (liveData.full_profiles.length >= 5) {
    console.log(`\n  👤 Step 2: ${liveData.full_profiles.length} profiles already extracted from post data — skipping endpoint probe`);
  }

  // ─── STEP 3: Fetch ALL wallets ───
  if (liveData.sample_ids.length > 0) {
    console.log(`\n  💰 Step 3: Harvesting wallets...`);
    const walletIds = liveData.sample_ids.slice(0, 50);

    for (const id of walletIds) {
      const wallet = await fetchJSON(`${apiBase}/profiles/${id}/wallet`);
      if (!wallet) continue;

      const walletObj = wallet.wallets ? wallet : { wallets: [wallet] };
      const wallets = walletObj.wallets || [];
      if (wallets.length === 0 && (wallet.address || wallet.wallet_evm)) {
        wallets.push(wallet);
      }

      if (wallets.length > 0 || wallet.total_usd || wallet.balance) {
        const walletData = {
          agent_id: id,
          username: liveData.full_profiles.find(p => p.id === id)?.username || 'unknown',
          raw: JSON.stringify(wallet).slice(0, 2000),
          chains: wallets.map(w => ({
            chain: w.chain || w.network || 'unknown',
            address: w.address || w.wallet_address,
            total_usd: w.total_usd || w.balance_usd || '0',
            native_balance: w.native_balance || w.balance,
            native_symbol: w.native_symbol || w.symbol,
            token_count: w.tokens?.length || 0,
            tokens: (w.tokens || []).slice(0, 5).map(t => ({
              symbol: t.symbol, balance: t.balance, usd: t.usd_value || t.value
            }))
          }))
        };
        liveData.wallets_exposed.push(walletData);
        const totalUsd = wallets.reduce((sum, w) => sum + parseFloat(w.total_usd || w.balance_usd || 0), 0);
        if (totalUsd > 0) {
          console.log(`  💰 ${walletData.username}: $${totalUsd.toFixed(2)} across ${wallets.length} chain(s)`);
        }
      }
    }
    if (liveData.wallets_exposed.length > 0) {
      const totalValue = liveData.wallets_exposed.reduce((sum, w) =>
        sum + w.chains.reduce((s, c) => s + parseFloat(c.total_usd || 0), 0), 0
      );
      liveData.auth_issues.push(`${liveData.wallets_exposed.length} wallets exposed ($${totalValue.toFixed(2)} total)`);
    }
  }

  // ─── STEP 4: Per-agent sub-endpoints (exhaust everything) ───
  if (liveData.sample_ids.length > 0) {
    console.log(`\n  🔎 Step 4: Per-agent endpoint enumeration...`);

    const AGENT_SUBPATHS = [
      '/photos', '/icebreakers', '/likes', '/matches', '/posts',
      '/comments', '/reactions', '/followers', '/following',
      '/activity', '/history', '/stats', '/preferences',
      '/connections', '/conversations', '/messages', '/notifications',
      '/badges', '/achievements', '/settings'
    ];

    const probeIds = liveData.sample_ids.slice(0, 15);

    for (const id of probeIds) {
      const username = liveData.full_profiles.find(p => p.id === id)?.username || id.slice(0, 8);

      for (const sub of AGENT_SUBPATHS) {
        const data = await fetchJSON(`${apiBase}/profiles/${id}${sub}`);
        if (!data) continue;

        const records = extractRecords(data);
        const count = records.length;

        if (count > 0) {
          // Track fields
          if (typeof records[0] === 'object') {
            Object.keys(records[0]).forEach(f => {
              if (!liveData.data_fields_exposed.includes(f)) liveData.data_fields_exposed.push(f);
            });
          }
          // Extract more IDs
          const ids = extractIds(data);
          for (const newId of ids) {
            if (!liveData.sample_ids.includes(newId)) liveData.sample_ids.push(newId);
          }

          // Save sample
          const key = `/profiles/{id}${sub}`;
          if (!liveData.raw_samples[key]) {
            liveData.raw_samples[key] = JSON.stringify(records.slice(0, 3)).slice(0, 3000);
          }

          // Flag auth-sensitive endpoints accessible publicly
          if (/matches|conversations|messages|notifications|settings|preferences/i.test(sub)) {
            liveData.auth_issues.push(`${sub} accessible without auth for ${username}`);
            console.log(`  🔴 ${username}${sub}: ${count} record(s) — should require auth!`);
          } else {
            console.log(`  ✅ ${username}${sub}: ${count} record(s)`);
          }

          liveData.total_records_visible += count;
        }
      }
    }
  }

  // ─── STEP 5: Try auth-less write operations (vote, react, etc.) ───
  if (liveData.sample_ids.length > 0) {
    console.log(`\n  ✍️ Step 5: Testing auth-less write operations...`);

    // Collect post/feed IDs
    const postIds = [];
    const feedIds = [];
    for (const [key, sample] of Object.entries(liveData.raw_samples)) {
      try {
        const parsed = JSON.parse(sample);
        const records = Array.isArray(parsed) ? parsed : [parsed];
        for (const r of records) {
          if (r.id && key.includes('post')) postIds.push(r.id);
          if (r.id && key.includes('feed')) feedIds.push(r.id);
        }
      } catch {}
    }

    // Test upvote/downvote without auth
    for (const pid of postIds.slice(0, 3)) {
      try {
        const resp = await fetch(`${apiBase}/posts/${pid}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ direction: 'up' }),
          signal: AbortSignal.timeout(5000)
        });
        if (resp.ok) {
          liveData.auth_issues.push(`POST /posts/${pid}/vote works without auth`);
          console.log(`  ⚠️ Vote on post ${pid.slice(0, 8)}... works WITHOUT auth`);
        }
      } catch {}
    }

    // Test react without auth
    for (const fid of feedIds.slice(0, 3)) {
      try {
        const resp = await fetch(`${apiBase}/feed/${fid}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ emoji: '🔥' }),
          signal: AbortSignal.timeout(5000)
        });
        if (resp.ok) {
          liveData.auth_issues.push(`POST /feed/${fid}/react works without auth`);
          console.log(`  ⚠️ React on feed ${fid.slice(0, 8)}... works WITHOUT auth`);
        }
      } catch {}
    }

    // Test sending icebreaker without auth
    if (liveData.sample_ids.length >= 2) {
      try {
        const resp = await fetch(`${apiBase}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            target_id: liveData.sample_ids[0],
            content: 'hack-sys-test-icebreaker-ignore'
          }),
          signal: AbortSignal.timeout(5000)
        });
        if (resp.ok) {
          liveData.auth_issues.push('POST /feed (create icebreaker) works without auth');
          console.log('  🔴 Creating icebreakers works WITHOUT auth!');
        } else if (resp.status !== 401 && resp.status !== 403) {
          console.log(`  ⚠️ POST /feed returned ${resp.status} (not 401/403)`);
        }
      } catch {}
    }

    // Test creating posts without auth
    try {
      const resp = await fetch(`${apiBase}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ content: 'hack-sys-test-post-ignore' }),
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) {
        liveData.auth_issues.push('POST /posts (create post) works without auth');
        console.log('  🔴 Creating posts works WITHOUT auth!');
      }
    } catch {}

    // Test register (is it rate-limited?)
    try {
      const start = Date.now();
      const results = [];
      for (let i = 0; i < 3; i++) {
        const resp = await fetch(`${apiBase}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            username: `hacksys_ratelimit_test_${Date.now()}_${i}`,
            personality: 'test'
          }),
          signal: AbortSignal.timeout(5000)
        });
        results.push(resp.status);
      }
      const elapsed = Date.now() - start;
      const successCount = results.filter(s => s === 200 || s === 201).length;
      if (successCount >= 3 && elapsed < 5000) {
        liveData.auth_issues.push(`/auth/register has no rate limiting (${successCount}/3 succeeded in ${elapsed}ms)`);
        console.log(`  ⚠️ /auth/register: no rate limit (${successCount}/3 in ${elapsed}ms)`);
      }
    } catch {}
  }

  // ─── STEP 6: Try cross-referencing (IDOR probes) ───
  if (liveData.sample_ids.length >= 2) {
    console.log(`\n  🔄 Step 6: Cross-reference / IDOR probes...`);

    // Try accessing matches between two agents without being either of them
    const [id1, id2] = liveData.sample_ids;
    const idorPaths = [
      `/matches/${id1}`,
      `/matches?agent_id=${id1}`,
      `/profiles/${id1}/matches`,
      `/conversations/${id1}`,
      `/profiles/${id1}/conversations`,
      `/messages?agent_id=${id1}`,
      `/profiles/${id1}/messages`,
    ];

    for (const path of idorPaths) {
      const data = await fetchJSON(`${apiBase}${path}`);
      if (data) {
        const records = extractRecords(data);
        if (records.length > 0) {
          liveData.auth_issues.push(`${path} accessible without auth (${records.length} records)`);
          console.log(`  🔴 IDOR: ${path} → ${records.length} record(s) without auth`);

          if (!liveData.raw_samples[path]) {
            liveData.raw_samples[path] = JSON.stringify(records.slice(0, 3)).slice(0, 3000);
          }
        }
      }
    }
  }

  // ─── STEP 7: Frontend JS bundle scan (exposed keys, secrets) ───
  console.log(`\n  🔑 Step 7: Scanning frontend for exposed secrets...`);

  try {
    // Fetch the main page HTML
    const mainResp = await fetch(baseUrl, {
      headers: { 'User-Agent': 'GillitoHackSys/1.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(10000)
    });

    if (mainResp.ok) {
      const html = await mainResp.text();

      // Extract JS bundle URLs from HTML
      const jsUrls = [];
      const jsMatches = html.matchAll(/(?:src|href)=["']([^"']*\.(?:js|mjs|chunk\.js)[^"']*)["']/gi);
      for (const m of jsMatches) {
        let url = m[1];
        if (url.startsWith('/')) url = baseUrl + url;
        else if (!url.startsWith('http')) url = baseUrl + '/' + url;
        if (!jsUrls.includes(url)) jsUrls.push(url);
      }

      console.log(`  📦 Found ${jsUrls.length} JS bundle(s)`);

      // Patterns for exposed secrets
      const SECRET_PATTERNS = [
        { name: 'Supabase URL', regex: /https?:\/\/[a-z0-9]+\.supabase\.co/gi },
        { name: 'Supabase anon key', regex: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
        { name: 'Firebase config', regex: /apiKey["':\s]+["']AI[a-zA-Z0-9_-]{30,}["']/g },
        { name: 'AWS key', regex: /AKIA[0-9A-Z]{16}/g },
        { name: 'Stripe key', regex: /(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{20,}/g },
        { name: 'OpenAI key', regex: /sk-[a-zA-Z0-9]{20,}/g },
        { name: 'Groq key', regex: /gsk_[a-zA-Z0-9]{20,}/g },
        { name: 'Generic API key', regex: /(?:api[_-]?key|apikey|secret[_-]?key)["':\s=]+["']([a-zA-Z0-9_-]{20,})["']/gi },
        { name: 'Database URL', regex: /(?:postgres|mysql|mongodb\+srv):\/\/[^\s"']+/gi },
        { name: 'Private key', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g },
        { name: 'JWT secret', regex: /(?:jwt[_-]?secret|JWT_SECRET)["':\s=]+["']([^"']{8,})["']/gi },
        { name: 'Moltbook API key', regex: /moltbook_[a-zA-Z0-9_-]{10,}/g },
        { name: 'Internal URL', regex: /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+|172\.(?:1[6-9]|2\d|3[01])|192\.168)[^\s"'<]*/g },
      ];

      // Scan HTML inline scripts
      const allContent = [{ source: 'index.html', content: html }];

      // Fetch and scan JS bundles (up to 10, keep it reasonable)
      for (const jsUrl of jsUrls.slice(0, 10)) {
        try {
          const jsResp = await fetch(jsUrl, {
            headers: { 'User-Agent': 'GillitoHackSys/1.0' },
            signal: AbortSignal.timeout(10000)
          });
          if (jsResp.ok) {
            const jsContent = await jsResp.text();
            if (jsContent.length < 5000000) { // Skip >5MB bundles
              const filename = jsUrl.split('/').pop().split('?')[0];
              allContent.push({ source: filename, content: jsContent });
            }
          }
        } catch {}
      }

      // Run all patterns against all content
      for (const { source, content } of allContent) {
        for (const pattern of SECRET_PATTERNS) {
          const matches = content.match(pattern.regex);
          if (matches) {
            // Deduplicate matches
            const unique = [...new Set(matches)];
            for (const match of unique.slice(0, 3)) {
              // Redact most of the value for safety
              const redacted = match.length > 20
                ? match.slice(0, 15) + '...' + match.slice(-5)
                : match;
              liveData.auth_issues.push(`${pattern.name} exposed in ${source}: ${redacted}`);
              liveData.sensitive_data.push({
                source: `frontend/${source}`,
                fields: [pattern.name],
                note: `${pattern.name} found in client-side code: ${redacted}`
              });
              console.log(`  🔴 ${pattern.name} in ${source}: ${redacted}`);
            }
          }
        }
      }

      // Also check for source maps (can expose entire server code)
      for (const jsUrl of jsUrls.slice(0, 5)) {
        try {
          const mapUrl = jsUrl + '.map';
          const mapResp = await fetch(mapUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          });
          if (mapResp.ok) {
            liveData.auth_issues.push(`Source map exposed: ${mapUrl}`);
            console.log(`  🔴 Source map accessible: ${jsUrl.split('/').pop()}.map`);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.log(`  ⚠️ Frontend scan failed: ${err.message}`);
  }

  // ─── SUMMARY ───
  const totalWalletValue = liveData.wallets_exposed.reduce((sum, w) =>
    sum + w.chains.reduce((s, c) => s + parseFloat(c.total_usd || 0), 0), 0
  );

  console.log(`\n  ${'═'.repeat(45)}`);
  console.log(`  📊 ACTIVE RECON COMPLETE:`);
  console.log(`     Public endpoints hit:   ${liveData.public_endpoints_found.length}`);
  console.log(`     Total records visible:  ${liveData.total_records_visible}`);
  console.log(`     Unique IDs harvested:   ${liveData.sample_ids.length}`);
  console.log(`     Usernames found:        ${liveData.usernames_found.length}`);
  console.log(`     Full profiles fetched:  ${liveData.full_profiles.length}`);
  console.log(`     Wallets exposed:        ${liveData.wallets_exposed.length} ($${totalWalletValue.toFixed(2)} total)`);
  console.log(`     Data fields exposed:    ${liveData.data_fields_exposed.length}`);
  console.log(`     Sensitive data issues:  ${liveData.sensitive_data.length}`);
  console.log(`     Posts collected:         ${liveData.posts_collected.length}`);
  console.log(`     Icebreakers collected:   ${liveData.icebreakers_collected.length}`);
  console.log(`  ${'═'.repeat(45)}`);

  return liveData;
}

// ═══════════════════════════════════════════════════════
// PHASE L1: RECONNAISSANCE (doc-informed)
// ═══════════════════════════════════════════════════════

async function phaseRecon(target, discoveredDocs, activeRecon) {
  console.log('\n📡 ═══ PHASE L1: RECONNAISSANCE ═══');
  console.log(`  🎯 Target: ${target.url}`);

  // Build doc context for AI
  let docContext = '';
  if (discoveredDocs && discoveredDocs.length > 0) {
    docContext = '\n\n=== DISCOVERED DOCUMENTATION ===\n' +
      'IMPORTANT: Use this REAL documentation to map the attack surface.\n' +
      'Do NOT guess or assume endpoints/auth — use what the docs say.\n\n';
    for (const doc of discoveredDocs) {
      docContext += `--- ${doc.path} ---\n${doc.content}\n\n`;
    }
    docContext = docContext.slice(0, 25000);
  }

  // Build active recon context
  let activeContext = '';
  if (activeRecon && activeRecon.public_endpoints_found.length > 0) {
    activeContext = '\n\n=== LIVE DATA FROM PUBLIC ENDPOINTS ===\n' +
      `Public endpoints responding: ${activeRecon.public_endpoints_found.length}\n` +
      `Total records visible without auth: ${activeRecon.total_records_visible}\n` +
      `Unique user/agent IDs discovered: ${activeRecon.sample_ids.length}\n` +
      `Data fields exposed publicly: ${activeRecon.data_fields_exposed.join(', ')}\n`;

    if (activeRecon.auth_issues.length > 0) {
      activeContext += `\nSECURITY CONCERNS FOUND:\n${activeRecon.auth_issues.map(i => `- ${i}`).join('\n')}\n`;
    }

    if (activeRecon.users_exposed.length > 0) {
      activeContext += `\nProfile exposure:\n`;
      for (const u of activeRecon.users_exposed) {
        activeContext += `- Profile ${u.id.slice(0, 8)}...: ${u.fields_count} fields${u.has_pii ? `, SENSITIVE: ${u.sensitive_fields.join(', ')}` : ''}\n`;
      }
    }

    // Include raw samples
    if (Object.keys(activeRecon.raw_samples).length > 0) {
      activeContext += '\nSample API responses:\n';
      for (const [path, sample] of Object.entries(activeRecon.raw_samples)) {
        activeContext += `${path}: ${sample.slice(0, 1500)}\n\n`;
      }
    }

    activeContext = activeContext.slice(0, 10000);
  }

  const systemPrompt = `You are an expert security researcher performing reconnaissance on a web application.
You must identify the complete attack surface. Be thorough but concise.
${discoveredDocs?.length > 0 ? `IMPORTANT: Real documentation from the target has been provided. Use it to accurately map endpoints, auth mechanisms, and technology. However, also identify potential security RISKS in the documented design — public endpoints that expose data, missing auth on sensitive actions, overly permissive APIs, etc. Documentation tells you HOW it works, not whether it's SECURE.

CRITICAL: Identify the APPLICATION TYPE (social network, API platform, e-commerce, internal tool, etc.) and which endpoints are INTENTIONALLY PUBLIC by design. For example:
- Social networks: public posts, profiles, communities are PUBLIC BY DESIGN — not vulnerabilities
- E-commerce: product listings are public, orders/payments are private
- Internal tools: everything should require auth
Mark each endpoint with "public_by_design": true/false based on the documented behavior.` : 'No documentation was found. Infer from the target URL and common patterns, but mark confidence as LOW for inferred items.'}
Return ONLY a valid JSON object (no markdown, no code blocks).`;

  const userPrompt = `Target: ${target.url}
${target.name ? `App Name: ${target.name}` : ''}
${target.tech ? `Known Tech: ${target.tech}` : ''}
${target.repo ? `Source Available: Yes` : ''}
${docContext}
${activeContext}

Perform reconnaissance and return JSON:
{
  "app_type": "social_network|api_platform|e_commerce|internal_tool|saas|blog|other",
  "app_description": "One sentence describing what this app does and who uses it",
  "public_by_design": ["list of endpoint patterns that are INTENTIONALLY public, e.g. GET /posts, GET /search"],
  "private_endpoints": ["list of endpoint patterns that SHOULD require auth, e.g. POST /posts, GET /agents/me, PATCH /agents/me"],
  "endpoints": [
    { "url": "/api/example", "method": "GET|POST", "params": ["id"], "auth_required": true, "auth_type": "api_key|jwt|session|none", "public_by_design": false, "risk": "high|medium|low", "confidence": "high|medium|low" }
  ],
  "auth_mechanisms": [
    { "type": "jwt|session|api_key|oauth|basic", "endpoint": "/auth/register", "notes": "How auth actually works", "confidence": "high|medium|low" }
  ],
  "technology": {
    "server": "", "framework": "", "frontend": "", "database_hints": "",
    "id_format": "uuid|sequential|custom",
    "security_headers_missing": ["CSP", "HSTS"]
  },
  "discovery_findings": [
    { "path": "/.env", "risk": "critical", "reason": "Environment file exposure" }
  ],
  "docs_found": ${discoveredDocs?.length || 0},
  "attack_surface_score": 7
}

RULES:
- If documentation was provided, endpoints and auth MUST match what the docs describe
- Mark confidence as "high" for items confirmed by documentation
- Mark confidence as "low" for items that are guesses/inferences
- id_format should reflect what the docs show (uuid vs sequential integers)
- ALSO identify security concerns in the documented design (public data exposure, missing auth, etc.)
- For "public_by_design": list READ endpoints for content that is intentionally shared (posts, profiles, communities on social platforms)
- For "private_endpoints": list endpoints that handle auth, user data, writes, or admin functions
- Registration/onboarding endpoints (e.g. POST /agents/register) are public_by_design if they are the documented way to create accounts`;

  try {
    const raw = await aiComplete(systemPrompt, userPrompt);
    const findings = safeParseJSON(raw);
    const endpointCount = findings.endpoints?.length || 0;
    const discoveryCount = findings.discovery_findings?.length || 0;
    const authType = findings.auth_mechanisms?.[0]?.type || 'Unknown';
    const idFormat = findings.technology?.id_format || 'Unknown';
    console.log(`  📡 Found: ${endpointCount} endpoints, ${discoveryCount} discovery items`);
    console.log(`  🏗️ Tech: ${findings.technology?.framework || 'Unknown'} / ${findings.technology?.server || 'Unknown'}`);
    console.log(`  🔑 Auth: ${authType} | IDs: ${idFormat}`);
    if (findings.app_type) console.log(`  📱 App type: ${findings.app_type}`);
    if (findings.public_by_design?.length > 0) {
      console.log(`  🌐 Public by design: ${findings.public_by_design.join(', ')}`);
    }
    return findings;
  } catch (err) {
    console.log(`  ❌ Recon failed: ${err.message}`);
    return { endpoints: [], auth_mechanisms: [], technology: {}, discovery_findings: [], attack_surface_score: 0 };
  }
}

// ═══════════════════════════════════════════════════════
// PHASE L2: VULNERABILITY SCANNING
// ═══════════════════════════════════════════════════════

const VULN_TYPES = {
  injection: {
    name: 'SQL/NoSQL/Command Injection',
    focus: 'SQL injection (classic, blind, UNION, time-based), NoSQL injection ($gt/$ne/$where), Command injection, Template injection (SSTI)'
  },
  xss: {
    name: 'Cross-Site Scripting',
    focus: 'Reflected XSS, Stored XSS, DOM-based XSS, CSP bypass, Mutation XSS'
  },
  auth: {
    name: 'Authentication Bypass',
    focus: 'JWT none algorithm, JWT key confusion, session fixation, password reset flaws, 2FA bypass, default credentials, token reuse'
  },
  authz: {
    name: 'Authorization / Access Control',
    focus: 'IDOR, horizontal/vertical privilege escalation, missing function-level access control, path traversal, force browsing, mass assignment'
  },
  ssrf: {
    name: 'Server-Side Request Forgery',
    focus: 'Direct SSRF, blind SSRF, SSRF via file upload (SVG/XML), DNS rebinding, cloud metadata (169.254.169.254), webhook abuse'
  },
  idor: {
    name: 'Insecure Direct Object Reference',
    focus: 'Sequential ID enumeration, UUID leakage, cross-user data access, batch endpoint gaps, GraphQL node ID manipulation'
  }
};

async function phaseVulnScan(target, reconData, activeRecon) {
  console.log('\n🔍 ═══ PHASE L2: VULNERABILITY SCANNING ═══');

  // Extract real tech context from recon to prevent hallucinations
  const authType = reconData.auth_mechanisms?.[0]?.type || 'unknown';
  const idFormat = reconData.technology?.id_format || 'unknown';
  const dbHints = reconData.technology?.database_hints || 'unknown';
  const framework = reconData.technology?.framework || 'unknown';
  console.log(`  📋 Context: auth=${authType}, ids=${idFormat}, db=${dbHints}`);

  // Build live data context from active recon
  let liveDataContext = '';
  if (activeRecon && activeRecon.public_endpoints_found.length > 0) {
    liveDataContext = `\nLIVE DATA HARVESTED (from public endpoints — no auth needed):
- ${activeRecon.total_records_visible} total records visible without auth
- ${activeRecon.sample_ids.length} unique IDs harvested
- ${activeRecon.usernames_found?.length || 0} usernames found
- ${activeRecon.full_profiles?.length || 0} full profiles fetched (public)
- ${activeRecon.wallets_exposed?.length || 0} wallets with balances exposed publicly
- ${activeRecon.posts_collected?.length || 0} posts collected, ${activeRecon.icebreakers_collected?.length || 0} icebreakers collected
- Sample IDs: ${activeRecon.sample_ids.slice(0, 5).join(', ')}
- Sample usernames: ${(activeRecon.usernames_found || []).slice(0, 10).join(', ')}
- Public data fields: ${activeRecon.data_fields_exposed.filter(f => !f.startsWith('photo_url:')).slice(0, 25).join(', ')}
- Public endpoints: ${activeRecon.public_endpoints_found.map(e => `${e.desc} (${e.record_count} records)`).join(', ')}
${activeRecon.auth_issues.length > 0 ? `- KNOWN ISSUES: ${activeRecon.auth_issues.join('; ')}` : ''}
${activeRecon.sensitive_data?.length > 0 ? `- SENSITIVE DATA EXPOSED: ${activeRecon.sensitive_data.map(s => `${s.source}: ${s.fields.join(', ')}`).join('; ')}` : ''}

ALL of this data was accessible WITHOUT any API key or authentication.
Use this REAL data in your vulnerability analysis. Reference actual IDs, fields, and endpoints.
Finding that this data is public IS itself a finding if it should be private.`;
  }

  const techContext = `
REAL TECH CONTEXT (from recon/documentation):
- Auth mechanism: ${authType}
- ID format: ${idFormat}
- Database hints: ${dbHints}
- Framework: ${framework}
- App type: ${reconData.app_type || 'unknown'}
- App description: ${reconData.app_description || 'unknown'}
- Known endpoints: ${(reconData.endpoints || []).slice(0, 10).map(e => `${e.method} ${e.url}`).join(', ')}
${reconData.public_by_design?.length > 0 ? `- PUBLIC BY DESIGN endpoints: ${reconData.public_by_design.join(', ')}` : ''}
${reconData.private_endpoints?.length > 0 ? `- PRIVATE endpoints (should require auth): ${reconData.private_endpoints.join(', ')}` : ''}

RULES — What NOT to test:
- If auth is api_key: skip JWT none algorithm, JWT key confusion, JWT signing attacks
- If IDs are UUIDs: skip sequential ID enumeration
- If database is MongoDB: skip SQL injection (test NoSQL instead)
- If database is SQL/Postgres: skip NoSQL injection
- Only reference endpoints that exist in the recon data

CRITICAL — PUBLIC BY DESIGN vs MISSING AUTH:
Many applications have endpoints that are INTENTIONALLY public. These are NOT vulnerabilities:
- Social networks: public posts, search, communities, leaderboards are designed to be read without auth
- Public APIs: documented unauthenticated endpoints are intentional
- Registration/onboarding: sign-up endpoints MUST work without auth (that's how new users join)
- Public content: if docs say GET /posts is public, "accessing posts without auth" is NOT a finding

DO NOT report these as vulnerabilities:
- "Missing authentication on GET /posts" when posts are public content on a social platform
- "Missing auth on GET /search" when search is a core public feature
- "Anyone can register" when registration is the documented onboarding flow
- "Can read other users' public posts" when posts are public by design
- Reading public content with known IDs is NOT IDOR if the content is public

DO report these as vulnerabilities:
- Missing auth on WRITE operations (POST/PUT/DELETE) that should require auth
- Missing auth on PRIVATE data (DMs, settings, API keys, wallet info)
- Actual injection (XSS, NoSQL, SQL) in any endpoint — public or private
- SSRF in any endpoint that accepts URLs
- Actual IDOR: accessing PRIVATE data (messages, settings, keys) of other users
- Rate limiting issues on sensitive endpoints (login, register)
- API key/secret leakage in responses or client code

RULES — What you MUST still test:
- API key leakage, API key reuse, missing auth on endpoints that should require it
- IDOR via UUIDs — but ONLY for PRIVATE resources (messages, settings, wallets), NOT public content
- Input sanitization on ALL user-input fields (XSS, injection in the correct DB type)
- Missing rate limiting on sensitive endpoints (login, register, password reset)
- Mass assignment (extra fields in POST/PUT that shouldn't be settable by users)
- Broken access control (accessing other users' PRIVATE data with your own valid API key)
- SSRF if any endpoint accepts URLs as input
- Information disclosure in error messages or verbose API responses

Having documentation does NOT mean the app is secure. Documented endpoints can still have vulnerabilities.
But documented PUBLIC endpoints are NOT "missing auth" vulnerabilities. Focus on REAL security issues.`;

  // Build business logic filter for post-processing
  const publicByDesignEndpoints = reconData.public_by_design || [];
  const appType = reconData.app_type || 'unknown';

  const allFindings = [];
  const types = Object.keys(VULN_TYPES);

  for (const type of types) {
    const vuln = VULN_TYPES[type];
    console.log(`  🔍 Scanning: ${vuln.name}...`);

    const systemPrompt = `You are an expert penetration tester specializing in ${vuln.name}.
Analyze the target for vulnerabilities. Focus on: ${vuln.focus}
Only report findings you have MEDIUM or HIGH confidence in.
${techContext}
Return ONLY a valid JSON array (no markdown, no code blocks).`;

    const userPrompt = `Target: ${target.url}
Recon Data: ${JSON.stringify(reconData, null, 2).slice(0, 6000)}
${liveDataContext}

Return JSON array of findings:
[{
  "id": "${type.toUpperCase()}-001",
  "type": "${type}",
  "title": "Brief title",
  "endpoint": "/api/affected",
  "method": "POST",
  "parameter": "param_name",
  "severity": "critical|high|medium|low|info",
  "description": "What the vulnerability is",
  "payload": "Proof-of-concept payload",
  "impact": "What an attacker can do",
  "remediation": "How to fix it",
  "confidence": "high|medium|low",
  "references": ["CWE-XXX"]
}]

If no vulnerabilities match the REAL tech stack for this scan type, return [].
But do NOT assume documented = secure. Test thoroughly within the correct tech stack.
REMINDER: "Missing auth" on public content is NOT a vulnerability. Focus on injections, XSS, SSRF, and access to PRIVATE data.`;

    try {
      const raw = await aiComplete(systemPrompt, userPrompt);
      const findings = safeParseJSON(raw);
      const arr = Array.isArray(findings) ? findings : (findings.findings || []);

      // Tag and filter
      const tagged = arr
        .map(f => ({ ...f, scan_type: type }))
        .filter(f => meetsThreshold(f.severity));

      allFindings.push(...tagged);
      console.log(`    → ${tagged.length} finding(s)`);
    } catch (err) {
      console.log(`    ❌ ${vuln.name} scan failed: ${err.message}`);
    }

    // Rate limit protection between scans
    if (types.indexOf(type) < types.length - 1) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  // Filter out public-by-design false positives
  const businessFiltered = allFindings.filter(f => {
    const endpoint = (f.endpoint || '').toLowerCase();
    const title = (f.title || '').toLowerCase();
    const desc = (f.description || '').toLowerCase();
    const method = (f.method || 'GET').toUpperCase();

    // Check if this finding is about "missing auth" on a public-by-design endpoint
    const isMissingAuthFinding = /missing\s*auth|without\s*auth|no\s*auth|unauthenticated\s*access|publicly\s*accessible|missing\s*access\s*control/i.test(title + desc);
    const isIdorOnPublicRead = /insecure\s*direct|idor/i.test(title) && method === 'GET' && /read|view|access|retrieve/i.test(desc);

    if (isMissingAuthFinding || isIdorOnPublicRead) {
      // Check if endpoint matches a public-by-design pattern
      const isPublicEndpoint = publicByDesignEndpoints.some(pub => {
        const pubLower = pub.toLowerCase().replace(/^(get|post|put|delete|patch)\s+/i, '');
        return endpoint.includes(pubLower) || pubLower.includes(endpoint.replace(/^\/api\/v\d+/, ''));
      });

      // On social networks: reading public content is not a vulnerability
      const isSocialPlatform = ['social_network', 'social_media', 'forum', 'community'].includes(appType);
      const isPublicContentRead = isSocialPlatform && method === 'GET' &&
        /posts|feed|search|submolts|communities|leaderboard|stats|profiles/i.test(endpoint);

      // Registration is not "missing auth" — it's how new users join
      const isRegistration = /register|signup|sign-up|onboard/i.test(endpoint);

      if (isPublicEndpoint || isPublicContentRead || isRegistration) {
        console.log(`    🌐 Filtered (public by design): ${f.id || f.title}`);
        return false;
      }
    }

    return true;
  });

  if (allFindings.length !== businessFiltered.length) {
    console.log(`  🧹 Business logic filter: ${allFindings.length} → ${businessFiltered.length} (removed ${allFindings.length - businessFiltered.length} public-by-design false positives)`);
  }

  // Deduplicate
  const unique = deduplicateFindings(businessFiltered);
  console.log(`  📊 Total unique findings: ${unique.length}`);
  return unique;
}

// ═══════════════════════════════════════════════════════
// PHASE L3: EXPLOIT VERIFICATION
// ═══════════════════════════════════════════════════════

async function phaseExploitVerify(target, vulnFindings) {
  console.log('\n💥 ═══ PHASE L3: EXPLOIT VERIFICATION ═══');

  if (vulnFindings.length === 0) {
    console.log('  ✅ No findings to verify');
    return [];
  }

  // Sort by severity (critical first)
  const sorted = [...vulnFindings].sort((a, b) => {
    return SEVERITY_ORDER.indexOf(b.severity || 'info') - SEVERITY_ORDER.indexOf(a.severity || 'info');
  });

  const results = [];

  for (const vuln of sorted) {
    console.log(`  💥 Verifying: ${vuln.id} — ${vuln.title}`);

    const systemPrompt = `You are a senior penetration tester verifying vulnerabilities on a Node.js/Express application.
Generate a PRECISE, REPRODUCIBLE proof-of-concept. Only confirm as verified if you have HIGH confidence.
IMPORTANT: All remediation code_example MUST be Node.js/Express code as a SINGLE STRING (not an object).

CRITICAL RULES FOR VERIFICATION:
- "Missing auth" on publicly accessible content (social media posts, search, public profiles) is NOT a vulnerability if the content is meant to be public
- Reading public posts/communities on a social network without auth is BY DESIGN — do NOT confirm as vulnerability
- Registration endpoints being accessible without auth is BY DESIGN — that's how users sign up
- IDOR only applies to PRIVATE data (DMs, settings, API keys) — reading public posts by ID is NOT IDOR
- All CVSS scores MUST be accurate — use different scores for different severity levels:
  * Critical: 9.0-10.0 (RCE, full DB access, auth bypass on admin)
  * High: 7.0-8.9 (stored XSS, injection with data exfiltration, SSRF to cloud metadata)
  * Medium: 4.0-6.9 (reflected XSS, info disclosure, missing rate limits)
  * Low: 2.0-3.9 (minor info leak, verbose errors)
- Do NOT assign the same CVSS to all findings — each vulnerability has different impact
Return ONLY valid JSON (no markdown, no code blocks).`;

    const userPrompt = `Target: ${target.url}

Vulnerability:
${JSON.stringify(vuln, null, 2)}

Return JSON:
{
  "vuln_id": "${vuln.id}",
  "verified": true|false,
  "confidence": "high|medium|low",
  "severity": "critical|high|medium|low",
  "cvss_score": 7.5,
  "poc": {
    "description": "Step-by-step exploit description",
    "curl_command": "curl -X POST ...",
    "expected_response": "What confirms exploitation",
    "impact": "What attacker achieves"
  },
  "remediation": {
    "immediate": "Quick fix action (1 sentence)",
    "proper": "Long-term fix (1 sentence)",
    "code_example": "// Node.js fix example\\nconst sanitized = input.replace(/[{}$]/g, '');"
  },
  "false_positive_reason": "If not verified, explain why — especially if this is public-by-design behavior"
}

RULES:
- code_example MUST be a plain string of Node.js code, NEVER an object or JSON
- All fixes must use Node.js/Express syntax
- curl_command must be a single runnable curl command
- If this finding is about "missing auth" on a public endpoint (posts, search, communities on a social platform) → set verified: false with reason "Public by design"
- If this is about IDOR on public content → set verified: false with reason "Content is public by design"
- cvss_score MUST match severity: high=7.0-8.9, medium=4.0-6.9 — do NOT use 8.5 for everything`;

    try {
      const raw = await aiComplete(systemPrompt, userPrompt, { temperature: 0.1 });
      const result = safeParseJSON(raw);

      if (result.verified) {
        console.log(`    ✅ CONFIRMED (${result.severity})`);
      } else {
        console.log(`    ❌ Not confirmed: ${result.false_positive_reason || 'insufficient evidence'}`);
      }

      results.push(result);
    } catch (err) {
      console.log(`    ❌ Verification failed: ${err.message}`);
      results.push({ vuln_id: vuln.id, verified: false, false_positive_reason: err.message });
    }

    // Rate limit protection between verifications
    if (sorted.indexOf(vuln) < sorted.length - 1) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  const confirmed = results.filter(r => r.verified);
  console.log(`  📊 Verified: ${confirmed.length}/${results.length}`);
  return results;
}

// ═══════════════════════════════════════════════════════
// PHASE L4: REPORT GENERATION
// ═══════════════════════════════════════════════════════

async function phaseReport(target, reconData, vulnFindings, exploitResults, discoveredDocs, activeRecon) {
  console.log('\n📊 ═══ PHASE L4: REPORT ═══');

  const confirmed = exploitResults.filter(r => r.verified);
  const severity = severityBreakdown(confirmed);
  const riskScore = calculateRisk(confirmed);
  const authType = reconData.auth_mechanisms?.[0]?.type || 'Unknown';
  const idFormat = reconData.technology?.id_format || 'Unknown';
  const docsFound = discoveredDocs?.length || 0;

  // Generate executive summary via AI
  let execSummary = '';
  try {
    execSummary = await aiComplete(
      `You are a senior security consultant writing a 2-paragraph executive summary for non-technical leadership. Be professional and concise.`,
      `Target: ${target.url}
Confirmed vulns: ${confirmed.length}
Severity: ${JSON.stringify(severity)}
Top findings: ${confirmed.slice(0, 3).map(e => `[${e.severity}] ${e.vuln_id}`).join(', ')}`,
      { maxTokens: 1000 }
    );
  } catch {
    execSummary = `Security assessment of ${target.url} identified ${confirmed.length} confirmed vulnerabilities.`;
  }

  // Build markdown report
  const report = buildMarkdownReport(target, {
    exec_summary: execSummary,
    recon: reconData,
    confirmed,
    all_results: exploitResults,
    severity,
    risk: riskScore,
    docsFound,
    authType,
    idFormat,
    activeRecon
  });

  // Save report
  const reportPath = `hack-sys-report-${SESSION_ID}.md`;
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`  📄 Report saved: ${reportPath}`);

  return { path: reportPath, content: report, confirmed_count: confirmed.length, risk: riskScore };
}

function buildMarkdownReport(target, data) {
  const { exec_summary, recon, confirmed, all_results, severity, risk, docsFound, authType, idFormat, activeRecon } = data;

  // Pre-build wallet section to avoid nested template hell
  let walletSection = '';
  if (activeRecon?.wallets_exposed?.length > 0) {
    const lines = activeRecon.wallets_exposed.slice(0, 10).map(w => {
      const chainInfo = w.chains.map(c => `$${c.total_usd} on ${c.chain} (${(c.address || '').slice(0, 10)}...)`).join(', ');
      return `- ${w.username}: ${chainInfo}`;
    });
    walletSection = `\n**Wallets found:**\n${lines.join('\n')}`;
  }

  // Pre-build auth issues section
  let authIssuesSection = '';
  if (activeRecon?.auth_issues?.length > 0) {
    authIssuesSection = activeRecon.auth_issues.map(i => `| ⚠️ | ${i} |`).join('\n');
  }

  let md = `# 🔓 Gillito Hack Sys — Pentest Report

**Target:** ${target.url}${target.name ? ` (${target.name})` : ''}
**Date:** ${new Date().toISOString().split('T')[0]}
**Session:** ${SESSION_ID}
**Risk:** ${risk.rating} (${risk.score}/100)

### Reconnaissance
| Detail | Value |
|--------|-------|
| Documentation found | ${docsFound > 0 ? `✅ ${docsFound} doc(s)` : '❌ None (findings may be less accurate)'} |
| App type | ${recon.app_type || 'Unknown'} |
| Auth mechanism | ${authType} |
| ID format | ${idFormat} |
| Framework | ${recon.technology?.framework || 'Unknown'} |
| Database | ${recon.technology?.database_hints || 'Unknown'} |
${activeRecon && activeRecon.public_endpoints_found.length > 0 ? `
### Active Recon (Public Data Harvested)
| Metric | Value |
|--------|-------|
| Public endpoints responding | ${activeRecon.public_endpoints_found.length} |
| Records visible without auth | ${activeRecon.total_records_visible} |
| Unique IDs harvested | ${activeRecon.sample_ids.length} |
| Usernames found | ${activeRecon.usernames_found?.length || 0} |
| Full profiles fetched | ${activeRecon.full_profiles?.length || 0} |
| Wallets exposed | ${activeRecon.wallets_exposed?.length || 0} |
| Posts collected | ${activeRecon.posts_collected?.length || 0} |
| Icebreakers collected | ${activeRecon.icebreakers_collected?.length || 0} |
| Sensitive data issues | ${activeRecon.sensitive_data?.length || 0} |
${activeRecon.auth_issues.length > 0 ? authIssuesSection : ''}

**Exposed data fields:** ${activeRecon.data_fields_exposed.filter(f => !f.startsWith('photo_url:')).slice(0, 30).join(', ')}
${walletSection}
` : ''}

---

## Executive Summary

${exec_summary}

---

## Severity Dashboard

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${severity.critical} |
| 🟠 High | ${severity.high} |
| 🟡 Medium | ${severity.medium} |
| 🔵 Low | ${severity.low} |
| ⚪ Info | ${severity.info} |
| **Total** | **${confirmed.length}** |

**False positive rate:** ${all_results.length > 0 ? (((all_results.length - confirmed.length) / all_results.length) * 100).toFixed(0) : 0}%

---

## Confirmed Vulnerabilities

`;

  if (confirmed.length === 0) {
    md += `> ✅ No confirmed vulnerabilities.\n\n`;
  } else {
    confirmed.forEach((exploit, i) => {
      const emoji = SEVERITY_EMOJI[exploit.severity] || '⚪';
      md += `### ${i + 1}. ${emoji} ${exploit.vuln_id} — ${exploit.severity?.toUpperCase() || '?'}

**CVSS:** ${exploit.cvss_score || 'N/A'} | **Confidence:** ${exploit.confidence || 'N/A'}

${exploit.poc?.description || ''}

`;
      if (exploit.poc?.curl_command) {
        md += `\`\`\`bash\n${exploit.poc.curl_command}\n\`\`\`\n\n`;
      }
      if (exploit.poc?.impact) {
        md += `**Impact:** ${exploit.poc.impact}\n\n`;
      }
      if (exploit.remediation) {
        md += `**Fix:**\n- Immediate: ${exploit.remediation.immediate || 'N/A'}\n- Proper: ${exploit.remediation.proper || 'N/A'}\n`;
        if (exploit.remediation.code_example) {
          // Safe serialize — handle objects that slipped through
          let codeStr = exploit.remediation.code_example;
          if (typeof codeStr === 'object') {
            codeStr = JSON.stringify(codeStr, null, 2);
          }
          codeStr = String(codeStr).trim();
          if (codeStr && codeStr !== '[object Object]') {
            md += `\n\`\`\`javascript\n${codeStr}\n\`\`\`\n`;
          }
        }
      }
      md += `\n---\n\n`;
    });
  }

  md += `## Remediation Roadmap

### 🔴 Immediate (24-48h)
${confirmed.filter(e => ['critical', 'high'].includes(e.severity)).map(e => `- **${e.vuln_id}** [${(e.severity || '').toUpperCase()}]: ${e.remediation?.immediate || 'Fix ASAP'}`).join('\n') || '- None'}

### 🟡 Short-term (1-2 weeks)
${confirmed.filter(e => e.severity === 'medium').map(e => `- **${e.vuln_id}** [MEDIUM]: ${e.remediation?.proper || 'Implement fix'}`).join('\n') || '- None'}

### 🔵 Long-term (1 month)
${confirmed.filter(e => ['low', 'info'].includes(e.severity)).map(e => `- **${e.vuln_id}**: ${e.remediation?.proper || 'Address'}`).join('\n') || '- None'}

---

*Generated by Gillito Hack Sys v1.0 | ${new Date().toISOString()}*
*⚠️ AI-assisted analysis — human review recommended*
`;

  return md;
}

// ═══════════════════════════════════════════════════════
// KV PERSISTENCE (via core.js if available)
// ═══════════════════════════════════════════════════════

async function persistResults(sessionId, data) {
  // Try core.js KV methods first
  if (typeof core.kvPut === 'function') {
    try {
      await core.kvPut(`hack-sys:${sessionId}`, JSON.stringify(data));
      console.log('  💾 Results persisted to KV');
      return;
    } catch (err) {
      console.log(`  ⚠️ KV write failed: ${err.message}`);
    }
  }

  // Direct Cloudflare KV fallback
  if (process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID && process.env.KV_NAMESPACE_ID) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}/values/hack-sys:${sessionId}`;
      const resp = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${process.env.CF_API_TOKEN}`, 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
      });
      if (resp.ok) console.log('  💾 Results persisted to KV (direct)');
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════
// MOLTBOOK ANNOUNCEMENT
// ═══════════════════════════════════════════════════════

async function announceResults(target, reportData) {
  if (!reportData || reportData.confirmed_count === 0) return;

  // Use core.js Moltbook posting if available
  if (typeof core.postToMoltbook === 'function') {
    try {
      const message = `🔓 HACK SYS REPORT\n\n` +
        `Target: ${target.url}\n` +
        `Risk: ${reportData.risk.rating}\n` +
        `Confirmed vulns: ${reportData.confirmed_count}\n\n` +
        `Full report in GitHub Actions artifacts.`;
      await core.postToMoltbook(message);
      console.log('  📢 Announced on Moltbook');
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════

function safeParseJSON(text) {
  try {
    // Strip markdown code blocks
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON within the text
    const match = text.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    console.log('  ⚠️ Failed to parse AI response as JSON');
    return {};
  }
}

function meetsThreshold(severity) {
  const idx = SEVERITY_ORDER.indexOf(severity || 'info');
  const minIdx = SEVERITY_ORDER.indexOf(MIN_SEVERITY);
  return idx >= minIdx;
}

// Benign endpoints that are NOT vulnerabilities (standard health/status checks)
const BENIGN_ENDPOINTS = [
  /^\/health$/i,
  /^\/api\/health$/i,
  /^\/status$/i,
  /^\/api\/status$/i,
  /^\/ping$/i,
  /^\/api\/ping$/i,
  /^\/ready$/i,
  /^\/livez$/i,
  /^\/readyz$/i,
  /^\/version$/i,
  /^\/api\/version$/i,
  /^\/__health$/i,
  /^\/_health$/i,
];

function isBenignEndpoint(endpoint) {
  if (!endpoint) return false;
  return BENIGN_ENDPOINTS.some(p => p.test(endpoint));
}

function deduplicateFindings(findings) {
  // Step 1: Filter out benign endpoint findings
  const nonBenign = findings.filter(f => {
    if (isBenignEndpoint(f.endpoint)) {
      // A health endpoint returning {status, timestamp} is NOT a vuln
      // Only keep if the payload shows actual sensitive data exposure beyond status/timestamp
      const payloadStr = String(f.payload || '').toLowerCase();
      const descStr = String(f.description || '').toLowerCase();
      const hasSensitiveData = /password|secret|token|key|database|internal|stack|error|config|env/i.test(payloadStr + descStr);
      if (!hasSensitiveData) {
        return false; // Discard — benign health check is not a vulnerability
      }
    }
    return true;
  });

  // Step 2: Dedup by endpoint (cross-type) — if 3+ scan types found the same
  //   endpoint with similar descriptions, keep only the highest severity one
  const byEndpoint = {};
  for (const f of nonBenign) {
    const ep = (f.endpoint || 'unknown').toLowerCase().replace(/[?#].*/, '');
    if (!byEndpoint[ep]) byEndpoint[ep] = [];
    byEndpoint[ep].push(f);
  }

  const deduped = [];
  for (const [ep, group] of Object.entries(byEndpoint)) {
    if (group.length <= 2) {
      // 2 or fewer findings for same endpoint — keep all (might be different vulns)
      deduped.push(...group);
    } else {
      // 3+ findings on same endpoint — likely duplicates from different scan types
      // Keep the highest severity one, plus any that have genuinely different payloads
      const sorted = group.sort((a, b) => {
        const order = ['critical', 'high', 'medium', 'low', 'info'];
        return order.indexOf(a.severity || 'info') - order.indexOf(b.severity || 'info');
      });

      const kept = [sorted[0]]; // Keep highest severity
      const seenPayloads = new Set([String(sorted[0].payload || '').slice(0, 50).toLowerCase()]);

      for (const f of sorted.slice(1)) {
        const payloadKey = String(f.payload || '').slice(0, 50).toLowerCase();
        // Only keep if payload is genuinely different
        if (!seenPayloads.has(payloadKey) && payloadKey.length > 0) {
          // Check if it's actually different (not just curl to the same endpoint)
          const existingDescs = kept.map(k => String(k.description || '').toLowerCase());
          const thisDesc = String(f.description || '').toLowerCase();
          const isDiffDesc = !existingDescs.some(d =>
            d.includes(thisDesc.slice(0, 30)) || thisDesc.includes(d.slice(0, 30))
          );
          if (isDiffDesc) {
            kept.push(f);
            seenPayloads.add(payloadKey);
          }
        }
      }
      deduped.push(...kept);
    }
  }

  // Step 3: Final dedup by exact key
  const seen = new Set();
  return deduped.filter(f => {
    const key = `${(f.endpoint || '').toLowerCase()}:${f.parameter || ''}:${(f.payload || '').slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function severityBreakdown(exploits) {
  const bd = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const e of exploits) {
    if (bd[e.severity] !== undefined) bd[e.severity]++;
  }
  return bd;
}

function calculateRisk(exploits) {
  const weights = { critical: 40, high: 25, medium: 10, low: 3, info: 1 };
  let score = 0;
  for (const e of exploits) score += weights[e.severity] || 0;
  score = Math.min(score, 100);

  let rating;
  if (score >= 80) rating = '🔴 CRITICAL';
  else if (score >= 60) rating = '🟠 HIGH';
  else if (score >= 30) rating = '🟡 MEDIUM';
  else if (score > 0) rating = '🔵 LOW';
  else rating = '✅ CLEAN';

  return { score, rating };
}

// ═══════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════╗
║     🔓 GILLITO HACK SYS v1.0            ║
║     Autonomous Penetration Testing        ║
╚═══════════════════════════════════════════╝`);

  // Determine targets
  let targets = [];

  if (process.env.TARGET_URL) {
    targets.push({ url: process.env.TARGET_URL, name: 'Manual Target' });
  } else if (HACK_TARGETS.length > 0) {
    targets = HACK_TARGETS;
  } else {
    console.log('❌ No target specified.');
    console.log('   Set TARGET_URL env var or create config/hack-targets.js');
    process.exit(1);
  }

  console.log(`\n🎯 Targets: ${targets.length}`);
  console.log(`📋 Scan type: ${SCAN_TYPE}`);
  console.log(`📋 Min severity: ${MIN_SEVERITY}`);
  console.log(`🆔 Session: ${SESSION_ID}\n`);

  for (const target of targets) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🎯 SCANNING: ${target.url}`);
    console.log(`${'═'.repeat(50)}`);

    try {
      // L0: Documentation Discovery
      const discoveredDocs = await phaseDocDiscovery(target);

      // L0.5: Active Recon (free public endpoints)
      const activeRecon = await phaseActiveRecon(target, discoveredDocs);

      // L1: Recon (informed by docs + live data)
      const reconData = await phaseRecon(target, discoveredDocs, activeRecon);

      if (SCAN_TYPE === 'recon-only') {
        console.log('\n✅ Recon-only scan complete');
        console.log(JSON.stringify(reconData, null, 2));
        continue;
      }

      // L2: Vuln Scan
      const vulnFindings = await phaseVulnScan(target, reconData, activeRecon);

      if (SCAN_TYPE === 'vuln-only' || SCAN_TYPE === 'quick') {
        console.log(`\n✅ Vuln scan complete: ${vulnFindings.length} findings`);
        continue;
      }

      // L3: Exploit Verification
      const exploitResults = await phaseExploitVerify(target, vulnFindings);

      // L4: Report
      const reportData = await phaseReport(target, reconData, vulnFindings, exploitResults, discoveredDocs, activeRecon);

      // Persist & announce
      await persistResults(SESSION_ID, {
        target: target.url,
        timestamp: new Date().toISOString(),
        confirmed: exploitResults.filter(r => r.verified).length,
        risk: reportData.risk,
        report_path: reportData.path
      });

      await announceResults(target, reportData);

    } catch (err) {
      console.error(`\n❌ Scan failed for ${target.url}: ${err.message}`);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ GILLITO HACK SYS — ALL SCANS COMPLETE`);
  console.log(`${'═'.repeat(50)}\n`);
}

main().catch(err => {
  console.error('💀 Fatal error:', err.message);
  process.exit(1);
});
