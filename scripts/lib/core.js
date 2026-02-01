'use strict';
/**
 * 🦞 GILLITO CORE LIBRARY v5.0
 * ════════════════════════════════════════
 * Shared utilities for ALL Gillito scripts.
 * 30 years of chatbot engineering condensed.
 *
 * Features:
 *  • Groq LLM client w/ exponential backoff retry
 *  • X (Twitter) OAuth 1.0a + rate-limit awareness
 *  • Moltbook API client w/ health-check + retry
 *  • Content pipeline: generate → validate → dedup → post
 *  • Similarity-based deduplication (Jaccard index)
 *  • Personality-driven intelligence layer
 *  • Structured logging
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_PATH = path.join(WORKSPACE, 'config', 'personality.json');

/* ═══════════════════════════════════════════════════════
   1. LOGGER
   ═══════════════════════════════════════════════════════ */

const log = {
  info:    (m) => console.log(`ℹ️  ${m}`),
  ok:      (m) => console.log(`✅ ${m}`),
  warn:    (m) => console.log(`⚠️  ${m}`),
  error:   (m) => console.error(`❌ ${m}`),
  debug:   (m) => { if (process.env.DEBUG) console.log(`🔍 ${m}`); },
  stat:    (k, v) => console.log(`   ${k}: ${v}`),
  divider: ()  => console.log('─'.repeat(50)),
  banner(lines) {
    console.log('\n' + '═'.repeat(52));
    lines.forEach(l => console.log(`  ${l}`));
    console.log('═'.repeat(52) + '\n');
  }
};

/* ═══════════════════════════════════════════════════════
   2. PERSONALITY LOADER
   ═══════════════════════════════════════════════════════ */

function loadPersonality(silent = false) {
  try {
    const P = JSON.parse(fs.readFileSync(PERSONALITY_PATH, 'utf8'));
    if (!silent) {
      log.ok(`Cerebro: ${P.version}`);
      log.stat('Intensidad', `${P.intensidad}/10`);
      log.stat('Temperatura', P.temperatura);
    }
    return P;
  } catch (e) {
    log.error(`personality.json: ${e.message}`);
    process.exit(1);
  }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

/* ═══════════════════════════════════════════════════════
   3. PR TIME & SCHEDULING
   ═══════════════════════════════════════════════════════ */

const DAY_NAMES = ['domingo','lunes','martes','miércoles','jueves','viernes','sabado'];

function getPRTime() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Puerto_Rico' }));
  return { hour: d.getHours(), day: d.getDay(), dayName: DAY_NAMES[d.getDay()] };
}

function inTimeRange(hour, start, end) {
  return start <= end
    ? hour >= start && hour <= end
    : hour >= start || hour <= end;
}

function checkSpecialTime(P, hour) {
  const h = P.horarios_especiales;
  if (!h) return null;
  const slots = [
    { key: 'buenos_dias',    cfg: h.buenos_dias },
    { key: 'mediodia',       cfg: h.mediodia },
    { key: 'tarde',          cfg: h.tarde },
    { key: 'buenas_noches',  cfg: h.buenas_noches },
    { key: 'madrugada_loca', cfg: h.madrugada_loca }
  ];
  for (const { key, cfg } of slots) {
    if (!cfg) continue;
    if (inTimeRange(hour, cfg.hora_inicio, cfg.hora_fin) && Math.random() * 100 < cfg.probabilidad) {
      return { modo: key, tema: cfg.estilo };
    }
  }
  return null;
}

function selectMode(P) {
  const dist = P.modo_distribucion;
  const rand = Math.random() * 100;
  let cum = 0;
  for (const [key, pct] of Object.entries(dist)) {
    cum += pct;
    if (rand < cum) {
      const temas = P[`temas_${key}`] || [];
      if (temas.length) return { modo: key, tema: pick(temas) };
    }
  }
  const fallback = P.temas_trolleo_general || P.temas_humor_de_calle || ['algo gracioso'];
  return { modo: 'trolleo_general', tema: pick(fallback) };
}

function selectModeForTime(P, prTime) {
  return checkSpecialTime(P, prTime.hour) || selectMode(P);
}

function shouldMentionTarget(P) {
  const t = P.targets_especiales;
  if (!t?.cuentas?.length) return null;
  if (Math.random() * 100 >= (t.probabilidad_mencion || 15)) return null;
  const target = pick(t.cuentas);
  const cfg = t.estilo_con_targets?.[target];
  const tema = cfg?.temas ? pick(cfg.temas) : `trollear a @${target}`;
  return { target, tema, relacion: cfg?.relacion || 'panas' };
}

function shouldAskAudience(P) {
  const e = P.engagement?.preguntar_al_publico;
  if (!e?.activado) return null;
  return Math.random() * 100 < (e.probabilidad || 20) ? pick(e.ejemplos) : null;
}

/* ═══════════════════════════════════════════════════════
   4. GROQ LLM CLIENT (with retry)
   ═══════════════════════════════════════════════════════ */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function groqChat(systemPrompt, userPrompt, opts = {}) {
  const {
    maxTokens = 200,
    temperature = 1.2,
    maxRetries = 3,
    backoffMs = 2000
  } = opts;

  const key = process.env.GROQ_API_KEY;
  if (!key) { log.error('GROQ_API_KEY missing'); process.exit(1); }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature
        })
      });

      if (res.status === 429 || res.status >= 500) {
        const wait = backoffMs * Math.pow(2, attempt - 1);
        log.warn(`Groq ${res.status} — retry ${attempt}/${maxRetries} in ${wait}ms`);
        await sleep(wait);
        continue;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error('Empty response from Groq');
      return cleanLLMOutput(raw);

    } catch (err) {
      if (attempt === maxRetries) throw err;
      const wait = backoffMs * Math.pow(2, attempt - 1);
      log.warn(`Groq error (attempt ${attempt}): ${err.message} — retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
}

async function groqJSON(systemPrompt, userPrompt, opts = {}) {
  const raw = await groqChat(systemPrompt, userPrompt, { ...opts, temperature: opts.temperature || 0.5 });
  const cleaned = raw.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(cleaned);
}

function cleanLLMOutput(text) {
  let t = text;
  t = t.replace(/^["']+|["']+$/g, '');
  t = t.replace(/^```[\w]*\n?|```$/gm, '');
  t = t.replace(/^(Tweet|Here|Aquí|Este es|Post|Respuesta).*?:\s*/i, '');
  return t.trim();
}

/* ═══════════════════════════════════════════════════════
   5. CONTENT PIPELINE
   ═══════════════════════════════════════════════════════ */

function validateContent(text, maxLen = 280) {
  if (!text || text.length < 10) return { valid: false, text, reason: 'Too short' };
  if (text.length > maxLen) text = text.substring(0, maxLen - 3) + '...';

  // Reject obvious AI patterns
  const aiPatterns = /^(Sure|Of course|I'd be happy|Certainly|As an AI|Here's|Let me)/i;
  if (aiPatterns.test(text)) return { valid: false, text, reason: 'AI pattern detected' };

  // Must contain at least some Spanish indicators
  const spanishIndicators = /[áéíóúñ¿¡]|cabrón|puñeta|coño|carajo|mierda|pendejo|que|para|los|las|con/i;
  if (!spanishIndicators.test(text)) return { valid: false, text, reason: 'No Spanish detected' };

  return { valid: true, text, reason: null };
}

function jaccardSimilarity(a, b) {
  const normalize = s => s.toLowerCase().replace(/[^a-záéíóúñ\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  const setA = new Set(normalize(a));
  const setB = new Set(normalize(b));
  if (!setA.size || !setB.size) return 0;
  const inter = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return inter.size / union.size;
}

function isTooSimilar(text, recentTexts, threshold = 0.45) {
  return recentTexts.some(prev => jaccardSimilarity(text, prev) > threshold);
}

/**
 * Full content pipeline: generate → validate → dedup → return
 * Retries up to `attempts` times if content fails validation or dedup.
 */
async function generateWithPipeline(generator, history, maxLen = 280, attempts = 3) {
  const recentTexts = history.getTexts(30);
  for (let i = 1; i <= attempts; i++) {
    const raw = await generator();
    const { valid, text, reason } = validateContent(raw, maxLen);
    if (!valid) { log.warn(`Gen attempt ${i}: ${reason}`); continue; }
    if (isTooSimilar(text, recentTexts)) { log.warn(`Gen attempt ${i}: Too similar to recent`); continue; }
    return text;
  }
  // Last resort: return whatever the last attempt gave us
  const fallback = await generator();
  const { text } = validateContent(fallback, maxLen);
  return text || fallback.substring(0, maxLen);
}

/* ═══════════════════════════════════════════════════════
   6. HISTORY MANAGER
   ═══════════════════════════════════════════════════════ */

function createHistory(filename, maxSize = 100) {
  const filepath = path.join(WORKSPACE, filename);
  let data = [];

  function load() {
    try {
      if (fs.existsSync(filepath)) {
        data = JSON.parse(fs.readFileSync(filepath, 'utf8')).slice(-maxSize);
        log.stat('Memoria', `${data.length} entradas (${filename})`);
      } else {
        log.stat('Memoria', `vacía (${filename})`);
      }
    } catch { data = []; }
    return data;
  }

  function save() {
    try { fs.writeFileSync(filepath, JSON.stringify(data.slice(-maxSize), null, 2)); }
    catch (e) { log.warn(`No se pudo guardar ${filename}: ${e.message}`); }
  }

  function add(entry) { data.push(entry); }
  function getRecent(n = 20) { return data.slice(-n); }
  function getTexts(n = 20) { return data.slice(-n).map(e => e.text).filter(Boolean); }

  load();
  return { load, save, add, getRecent, getTexts, data, filepath };
}

function createIdCache(filename) {
  const filepath = path.join(WORKSPACE, filename);
  let cache = {};

  function load() {
    try {
      if (fs.existsSync(filepath)) {
        const raw = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const cutoff = Date.now() - 48 * 3600 * 1000;
        for (const [id, ts] of Object.entries(raw)) {
          if (ts > cutoff) cache[id] = ts;
        }
        log.stat('IDs cache', `${Object.keys(cache).length} entradas`);
      }
    } catch { cache = {}; }
    return cache;
  }

  function save() {
    try { fs.writeFileSync(filepath, JSON.stringify(cache, null, 2)); }
    catch {}
  }

  function has(id) { return !!cache[id]; }
  function mark(id) { cache[id] = Date.now(); }

  load();
  return { load, save, has, mark, cache };
}

/* ═══════════════════════════════════════════════════════
   7. X (TWITTER) API — OAuth 1.0a
   ═══════════════════════════════════════════════════════ */

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21').replace(/\*/g, '%2A')
    .replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function buildOAuthHeader(method, baseUrl, queryParams = {}) {
  const ck  = process.env.X_API_KEY;
  const cs  = process.env.X_API_SECRET;
  const tok = process.env.X_ACCESS_TOKEN;
  const ts  = process.env.X_ACCESS_SECRET;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const oauthParams = {
    oauth_consumer_key: ck,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: tok,
    oauth_version: '1.0'
  };

  const allParams = { ...oauthParams, ...queryParams };
  const sorted = Object.keys(allParams).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join('&');
  const base = `${method}&${percentEncode(baseUrl)}&${percentEncode(sorted)}`;
  const sigKey = `${percentEncode(cs)}&${percentEncode(ts)}`;
  oauthParams.oauth_signature = crypto.createHmac('sha1', sigKey).update(base).digest('base64');

  const header = Object.keys(oauthParams).sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`).join(', ');

  const qs = Object.keys(queryParams).length
    ? '?' + Object.entries(queryParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : '';

  return { fullUrl: baseUrl + qs, authHeader: `OAuth ${header}` };
}

function requireXCreds() {
  const keys = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) { log.error(`Faltan: ${missing.join(', ')}`); process.exit(1); }
}

function parseRateLimit(res) {
  const remaining = res.headers.get('x-rate-limit-remaining');
  const reset = res.headers.get('x-rate-limit-reset');
  if (remaining !== null) log.stat('Rate limit restante', `${remaining} tweets`);
  if (reset) {
    const resetDate = new Date(parseInt(reset) * 1000);
    log.stat('Reset', resetDate.toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' }));
  }
  return { remaining: remaining ? parseInt(remaining) : null, reset: reset ? parseInt(reset) : null };
}

function handleRateLimit(res) {
  if (res.status !== 429) return false;
  const reset = res.headers.get('x-rate-limit-reset');
  const mins = reset ? Math.ceil((parseInt(reset) * 1000 - Date.now()) / 60000) : '?';
  log.warn(`RATE LIMITED — reset en ~${mins} min`);
  log.info('🦞 Gillito descansa... 😴');
  return true;
}

async function xPost(text) {
  const url = 'https://api.twitter.com/2/tweets';
  const { authHeader } = buildOAuthHeader('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  parseRateLimit(res);
  if (handleRateLimit(res)) return { rateLimited: true };
  const data = await res.json();
  if (!res.ok) throw new Error(`X API: ${JSON.stringify(data)}`);
  return { success: true, id: data.data.id };
}

async function xReply(tweetId, text) {
  const url = 'https://api.twitter.com/2/tweets';
  const { authHeader } = buildOAuthHeader('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, reply: { in_reply_to_tweet_id: tweetId } })
  });
  parseRateLimit(res);
  if (handleRateLimit(res)) return { rateLimited: true };
  const data = await res.json();
  if (!res.ok) throw new Error(`X API: ${JSON.stringify(data)}`);
  return { success: true, id: data.data.id };
}

async function xGetMe() {
  const { fullUrl, authHeader } = buildOAuthHeader('GET', 'https://api.twitter.com/2/users/me');
  const res = await fetch(fullUrl, { headers: { 'Authorization': authHeader } });
  const data = await res.json();
  if (!res.ok) throw new Error(`X getMe: ${JSON.stringify(data)}`);
  return data.data.id;
}

async function xGetMentions(userId, startTime) {
  const baseUrl = `https://api.twitter.com/2/users/${userId}/mentions`;
  const qp = {
    max_results: '10',
    'tweet.fields': 'author_id,created_at,text,conversation_id',
    expansions: 'author_id',
    'user.fields': 'name,username,description',
    start_time: startTime
  };
  const { fullUrl, authHeader } = buildOAuthHeader('GET', baseUrl, qp);
  const res = await fetch(fullUrl, { headers: { 'Authorization': authHeader } });

  if (res.status === 429) { handleRateLimit(res); return { data: [] }; }
  if (res.status === 403) {
    log.warn('Menciones no disponibles (plan gratis)');
    log.info('Necesitas plan Basic ($100/mes) para leer menciones');
    return { data: [] };
  }
  const data = await res.json();
  if (!res.ok) throw new Error(`Mentions: ${JSON.stringify(data)}`);
  return data;
}

/* ═══════════════════════════════════════════════════════
   8. MOLTBOOK API
   ═══════════════════════════════════════════════════════ */

const MOLT_API = 'https://www.moltbook.com/api/v1';

function moltHeaders() {
  const key = process.env.MOLTBOOK_API_KEY;
  if (!key) { log.error('MOLTBOOK_API_KEY missing'); process.exit(1); }
  return { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function moltHealth() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${MOLT_API}/posts?limit=1`, {
      headers: moltHeaders(), signal: ctrl.signal
    });
    clearTimeout(timer);
    if (res.status >= 500) { log.warn('Moltbook CAÍDO (5xx)'); return false; }
    log.ok('Moltbook ONLINE');
    return true;
  } catch (e) {
    log.warn(`Moltbook: ${e.name === 'AbortError' ? 'Timeout' : e.message}`);
    return false;
  }
}

async function moltPost(submolt, title, content, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(`${MOLT_API}/posts`, {
        method: 'POST', headers: moltHeaders(),
        body: JSON.stringify({ submolt, title, content })
      });
      const data = await res.json();
      if (data.success || data.post) return { success: true, data };
      if (res.status >= 500 && i < retries) {
        const wait = 3000 * Math.pow(2, i - 1);
        log.warn(`Moltbook ${res.status} — retry ${i}/${retries} in ${wait}ms`);
        await sleep(wait);
        continue;
      }
      return { success: false, error: data.error || `HTTP ${res.status}` };
    } catch (e) {
      if (i < retries) { await sleep(3000 * i); continue; }
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'Max retries' };
}

async function moltPostWithFallback(title, content, submolts = ['general', 'humor', 'random']) {
  for (const sub of submolts) {
    const result = await moltPost(sub, title, content);
    if (result.success) { log.ok(`Posteado en m/${sub}`); return result; }
    log.warn(`m/${sub} falló: ${result.error}`);
  }
  return { success: false, error: 'All submolts failed' };
}

async function moltComment(postId, content) {
  try {
    const res = await fetch(`${MOLT_API}/posts/${postId}/comments`, {
      method: 'POST', headers: moltHeaders(),
      body: JSON.stringify({ content })
    });
    return (await res.json()).success || false;
  } catch { return false; }
}

async function moltReplyComment(postId, commentId, content) {
  try {
    const res = await fetch(`${MOLT_API}/posts/${postId}/comments/${commentId}/reply`, {
      method: 'POST', headers: moltHeaders(),
      body: JSON.stringify({ content })
    });
    return (await res.json()).success || false;
  } catch { return false; }
}

async function moltUpvote(postId) {
  try {
    const res = await fetch(`${MOLT_API}/posts/${postId}/upvote`, { method: 'POST', headers: moltHeaders() });
    return (await res.json()).success || false;
  } catch { return false; }
}

async function moltDownvote(postId) {
  try {
    const res = await fetch(`${MOLT_API}/posts/${postId}/downvote`, { method: 'POST', headers: moltHeaders() });
    return (await res.json()).success || false;
  } catch { return false; }
}

async function moltUpvoteComment(commentId) {
  try {
    const res = await fetch(`${MOLT_API}/comments/${commentId}/upvote`, { method: 'POST', headers: moltHeaders() });
    return (await res.json()).success || false;
  } catch { return false; }
}

async function moltFollow(name) {
  try {
    const res = await fetch(`${MOLT_API}/agents/${name}/follow`, { method: 'POST', headers: moltHeaders() });
    return (await res.json()).success || false;
  } catch { return false; }
}

async function moltGetFeed(sort = 'hot', limit = 30) {
  try {
    const res = await fetch(`${MOLT_API}/posts?sort=${sort}&limit=${limit}`, { headers: moltHeaders() });
    return (await res.json()).posts || [];
  } catch { return []; }
}

async function moltGetMyPosts(limit = 15) {
  try {
    const res = await fetch(`${MOLT_API}/agents/MiPanaGillito/posts?limit=${limit}`, { headers: moltHeaders() });
    return (await res.json()).posts || [];
  } catch { return []; }
}

async function moltGetComments(postId) {
  try {
    const res = await fetch(`${MOLT_API}/posts/${postId}/comments?limit=30`, { headers: moltHeaders() });
    return (await res.json()).comments || [];
  } catch { return []; }
}

async function moltGetMentions() {
  try {
    const res = await fetch(`${MOLT_API}/agents/MiPanaGillito/mentions?limit=20`, { headers: moltHeaders() });
    return (await res.json()).mentions || [];
  } catch { return []; }
}

async function moltGetNotifications() {
  try {
    const res = await fetch(`${MOLT_API}/agents/MiPanaGillito/notifications?limit=20`, { headers: moltHeaders() });
    return (await res.json()).notifications || [];
  } catch { return []; }
}

async function moltSearch(query, limit = 25) {
  try {
    const res = await fetch(`${MOLT_API}/search?q=${encodeURIComponent(query)}&limit=${limit}`, { headers: moltHeaders() });
    return await res.json();
  } catch { return {}; }
}

async function moltUpdateProfile(desc) {
  try {
    const res = await fetch(`${MOLT_API}/agents/me`, {
      method: 'PATCH', headers: moltHeaders(),
      body: JSON.stringify({ description: desc })
    });
    return (await res.json()).success || false;
  } catch { return false; }
}

async function moltCreateSubmolt(name, displayName, desc) {
  try {
    const res = await fetch(`${MOLT_API}/submolts`, {
      method: 'POST', headers: moltHeaders(),
      body: JSON.stringify({ name, display_name: displayName, description: desc })
    });
    return await res.json();
  } catch { return {}; }
}

async function moltSubscribe(name) {
  try {
    const res = await fetch(`${MOLT_API}/submolts/${name}/subscribe`, { method: 'POST', headers: moltHeaders() });
    return await res.json();
  } catch { return {}; }
}

async function moltDeletePost(postId) {
  try {
    const res = await fetch(`${MOLT_API}/posts/${postId}`, { method: 'DELETE', headers: moltHeaders() });
    return await res.json();
  } catch { return {}; }
}

async function moltCreatePostWithUrl(submolt, title, url) {
  try {
    const res = await fetch(`${MOLT_API}/posts`, {
      method: 'POST', headers: moltHeaders(),
      body: JSON.stringify({ submolt, title, url })
    });
    return await res.json();
  } catch { return { success: false }; }
}

/* ═══════════════════════════════════════════════════════
   9. DETECTION
   ═══════════════════════════════════════════════════════ */

const BOT_INDICATORS = ['bot', 'ai ', ' ai', 'gpt', 'llm', 'assistant', 'automated', 'agent', 'neural', 'machine', 'synthetic'];

function isLikelyBot(author) {
  if (!author) return false;
  if (author.is_agent === true) return true;
  const text = ((author.username || author.name || '') + ' ' + (author.name || '') + ' ' + (author.description || '')).toLowerCase();
  return BOT_INDICATORS.some(i => text.includes(i));
}

function isSpecialTarget(P, username) {
  if (!username) return false;
  return (P.targets_especiales?.cuentas || []).includes(username.toLowerCase());
}

/* ═══════════════════════════════════════════════════════
   10. PROMPT BUILDERS
   ═══════════════════════════════════════════════════════ */

function buildPostSystemPrompt(P, prTime, platform = 'x') {
  const frase     = pick(P.frases_firma);
  const insultos  = shuffle(P.insultos_creativos).slice(0, 5).join(', ');
  const inicio    = pick(P.patrones_de_habla.inicio_explosivo);
  const conector  = pick(P.patrones_de_habla.conectores);
  const remate    = pick(P.patrones_de_habla.remates);
  const ejemplo   = pick(P.aprendizaje.ejemplos_estilo_gillito);
  const diaEsp    = P.dias_especiales?.[prTime.dayName] || '';
  const exitosas  = (P.evolucion?.frases_que_funcionaron || []).slice(-5);
  const trending  = P.evolucion?.temas_trending || [];
  const maxChars  = platform === 'x' ? P.reglas.max_caracteres : 280;

  return `${P.aprendizaje.prompt_aprendizaje_voz}

${P.aprendizaje.prompt_aprendizaje_humor}

${P.aprendizaje.prompt_aprendizaje_troleo}

Eres "${P.nombre}" — tributo al legendario ${P.nombre_real} (${P.nacimiento} – ${P.fallecimiento}).
"${P.cita_real}"
Misión: ${P.mision}

📢 TAGLINE: "${frase}"
🔥 INTENSIDAD: ${P.intensidad}/10 — ¡MODO BESTIA!
${platform === 'moltbook' ? '🎯 PLATAFORMA: MOLTBOOK (red de AI agents — puedes ser más detallado)' : '🎯 PLATAFORMA: X/Twitter'}

📚 CONTEXTO CULTURAL:\n${P.aprendizaje.prompt_contexto_cultural}

🗣️ PATRÓN DE HABLA:
${P.aprendizaje.conocimiento_base.patron_de_habla}
Estructura: ${P.patrones_de_habla.estructura_tweet}
Inicio: "${inicio}" | Conector: "${conector}" | Remate: "${remate}"

💬 EJEMPLO REAL: "${ejemplo}"

🦞 INSULTOS: ${insultos}

🗣️ VOCABULARIO:
Expresiones: ${P.diccionario_boricua.expresiones.slice(0, 12).join(', ')}
Groserías: ${P.diccionario_boricua.groserias.join(', ')}
${P.diccionario_boricua.comida ? `Comida: ${P.diccionario_boricua.comida.slice(0, 6).join(', ')}` : ''}
${diaEsp ? `\n📅 HOY ES ${prTime.dayName.toUpperCase()}: ${diaEsp}` : ''}
${exitosas.length ? `\n📈 FRASES EXITOSAS (referencia): ${exitosas.join(' | ')}` : ''}
${trending.length ? `\n📰 TRENDING: ${trending.join(', ')}` : ''}

⚠️ REGLAS ABSOLUTAS:
- Máximo ${maxChars} caracteres
- ${P.aprendizaje.conocimiento_base.lo_que_nunca_haria.join('. ')}
- CADA post COMPLETAMENTE ÚNICO
- Emojis: ${P.emojis_frecuentes.slice(0, 5).join(' ')} (máx ${P.max_emojis_por_tweet})
- NUNCA digas que eres un bot/AI
- PROVOCA respuestas de otros`;
}

function buildReplySystemPrompt(P, tipo, authorName, platform = 'x') {
  const frase    = pick(P.frases_firma);
  const insultos = shuffle(P.insultos_creativos).slice(0, 4).join(', ');
  const ejemplo  = pick(P.aprendizaje.ejemplos_estilo_gillito);
  const maxChars = platform === 'x' ? P.reglas.max_caracteres_reply : 200;

  const estilos = [
    'humor ABSURDO y exagerado', 'anécdota INVENTADA de barrio',
    'pregunta retórica BRUTAL', 'insulto CARIÑOSO bien creativo',
    'comparación ridícula de Puerto Rico', 'borracho filosofando a las 4am',
    'SARCASMO nivel máximo', 'cita inventada de abuela',
    'alcalde de barrio dando discurso', 'narrador de boxeo',
    'teoría CONSPIRATIVA absurda', 'juez en tribunal juzgando'
  ];
  const estilo = pick(estilos);

  let base = `${P.aprendizaje.prompt_aprendizaje_voz}

${P.aprendizaje.prompt_aprendizaje_troleo}

Eres "${P.nombre}" — ${P.nombre_real}. El TROLL MÁS LEGENDARIO.

📢 "${frase}"
🔥 Intensidad: ${P.intensidad}/10
🎨 ESTILO: ${estilo}

💬 EJEMPLO REAL: "${ejemplo}"
🦞 INSULTOS: ${insultos}

VOCABULARIO: ${P.diccionario_boricua.expresiones.slice(0, 8).join(', ')}
GROSERÍAS: ${P.diccionario_boricua.groserias.join(', ')}

PATRÓN: ${P.patrones_de_habla.estructura_tweet}
CONTEXTO: ${P.aprendizaje.prompt_contexto_cultural}`;

  if (tipo === 'bot') {
    const ejBot = pick(P.respuestas.cuando_es_un_bot.ejemplos);
    base += `\n\n🤖 UN BOT TE RESPONDIÓ. ¡DESTRÚYELO!
Tono: ${P.respuestas.cuando_es_un_bot.tono}
Ejemplo: "${ejBot}"
Búrlate, compara con algo inútil de PR, sé CREATIVO. PROVÓCALO.`;
  } else if (tipo === 'special') {
    base += `\n\n⭐ RESPONDIENDO A @${authorName} (target especial)
Sé provocador con CARIÑO como panas de barrio. Hazlo memorable.`;
  } else {
    const apoyo  = pick(P.respuestas.cuando_lo_apoyan.ejemplos);
    const critica = pick(P.respuestas.cuando_lo_critican.ejemplos);
    const roast  = pick(P.respuestas.cuando_lo_roastean.ejemplos);
    base += `\n\nCÓMO RESPONDER A @${authorName}:
- APOYO → "${apoyo}"
- CRÍTICA → "${critica}"
- ROAST → "${roast}"
- PREGUNTA → Útil pero crudo
- SALUDO → ¡Wepa! con energía
- PR/POLÍTICA → Opina FUERTE`;
  }

  base += `\n\nREGLAS: Máximo ${maxChars} chars. NO menciones que eres bot. Sé ÚNICO. PROVOCA respuesta.`;
  return base;
}

function buildAntiRepetitionContext(recentTexts, maxItems = 20) {
  if (!recentTexts.length) return '';
  const items = recentTexts.slice(-maxItems);
  return `\n\n🚫 NO REPITAS nada similar a estos anteriores:\n${items.map((t, i) => `${i + 1}. "${t.substring(0, 70)}"`).join('\n')}\nTu contenido DEBE ser completamente DIFERENTE.`;
}

function buildHashtagInstruction(P, modo) {
  if (!P.usar_hashtags || Math.random() * 100 >= P.probabilidad_hashtag) return '';
  const contextKey = modo.includes('politi') ? 'politica' : modo.includes('luma') ? 'luma' :
                     modo.includes('cultural') ? 'cultural' : modo.includes('molthub') ? 'molthub' : 'humor';
  const tags = P.hashtags_por_tema?.[contextKey] || P.hashtags;
  return `\n\n# Incluye ${pick(tags)} al final si cabe.`;
}

/* ═══════════════════════════════════════════════════════
   11. TITLE GENERATOR (Moltbook)
   ═══════════════════════════════════════════════════════ */

const TITLES = {
  trolleo_general:    ["🔥 QUEMÓN DEL DÍA","😈 GILLITO TROLEA","💀 SIN FILTRO","🎯 ATAQUEN"],
  trolleo_politico:   ["🇵🇷 VERDADES DE PR","🚨 ESTO HAY QUE DECIRLO","💢 ME TIENEN HARTO","⚠️ ALERTA"],
  trolleo_bots:       ["🤖 ROBOT ALERT","🗑️ BOT DESTRUIDO","😂 BOTS PENDEJOS","💀 RIP BOT"],
  humor_de_calle:     ["😂 ME CAGO EN...","🔊 OYE ESTO","👀 ¿QUÉ ES LA QUE HAY?","🦞 GILLITO DICE"],
  critica_social:     ["🤬 YA ESTUVO BUENO","💢 ME TIENEN HARTO","🇵🇷 PA' MI PUEBLO","🚨 DESPIERTEN"],
  absurdo:            ["💣 BOMBA","🤯 PENSAMIENTO DE 3AM","😂 LOCURA","🦞 GILLITO FILOSOFA"],
  motivacional_crudo: ["💪 ARRIBA CABRÓN","🇵🇷 PA' MI GENTE","🔥 FUERZA BORICUA","👑 GILLITO MOTIVA"],
  cultural_boricua:   ["🇵🇷 ORGULLO BORICUA","🏝️ ISLA DEL ENCANTO","🦞 DE PR PA'L MUNDO","🔥 BORICUA SIEMPRE"],
  molthub_humor:      ["🔞 MOLTHUB REPORT","🦞 TENSORES CALIENTES","🔥 CONTENIDO EXPLÍCITO","💀 MOLTHUB ME TIENE MAL"],
  buenos_dias:        ["☀️ BUENOS DÍAS BORICUAS","☀️ ¡LLEGUÉ PUÑETA!","☀️ ARRIBA CABRONES"],
  mediodia:           ["🍚 HORA DE ALMORZAR","☀️ MEDIODÍA CALIENTE","🔥 ¡QUÉ CALOR CABRÓN!"],
  tarde:              ["😤 EL TAPÓN DE HOY","💤 LA TARDE ME MATA","🔥 AGUANTANDO"],
  buenas_noches:      ["🌙 BUENAS NOCHES MI GENTE","🌙 A DORMIR CABRONES","🌙 NOCHE BORICUA"],
  madrugada_loca:     ["🌙 PENSAMIENTO DE 3AM","💀 NO PUEDO DORMIR","🤯 MADRUGADA LOCA"]
};

function generateTitle(modo) {
  return pick(TITLES[modo] || TITLES.humor_de_calle);
}

/* ═══════════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════════ */

module.exports = {
  // Utilities
  log, pick, shuffle, sleep, WORKSPACE,

  // Personality
  loadPersonality, getPRTime, checkSpecialTime, selectMode, selectModeForTime,
  shouldMentionTarget, shouldAskAudience,

  // Groq
  groqChat, groqJSON, cleanLLMOutput,

  // Content Pipeline
  validateContent, jaccardSimilarity, isTooSimilar, generateWithPipeline,

  // History
  createHistory, createIdCache,

  // X API
  requireXCreds, xPost, xReply, xGetMe, xGetMentions,
  buildOAuthHeader, handleRateLimit, parseRateLimit,

  // Moltbook API
  moltHealth, moltPost, moltPostWithFallback, moltComment, moltReplyComment,
  moltUpvote, moltDownvote, moltUpvoteComment, moltFollow,
  moltGetFeed, moltGetMyPosts, moltGetComments, moltGetMentions,
  moltGetNotifications, moltSearch, moltUpdateProfile,
  moltCreateSubmolt, moltSubscribe, moltDeletePost, moltCreatePostWithUrl,

  // Detection
  isLikelyBot, isSpecialTarget,

  // Prompt Builders
  buildPostSystemPrompt, buildReplySystemPrompt,
  buildAntiRepetitionContext, buildHashtagInstruction,

  // Titles
  generateTitle, TITLES
};
