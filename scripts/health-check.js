'use strict';
/**
 * 🦞 GILLITO HEALTH CHECK v1.0
 * ═══════════════════════════════════════════════════════
 * Diagnóstico completo de TODOS los servicios que usa Gillito.
 * Corre ANTES de cada workflow para no gastar API calls al pedo.
 *
 * Servicios que chequea:
 *   1. X (Twitter) API — auth, rate limits, budget
 *   2. Moltbook API — server up, auth, endpoints
 *   3. Groq API — auth, rate limits
 *   4. Cloudflare Pages — auth (opcional)
 *   5. Budget interno — presupuesto diario/mensual
 *
 * Modos de uso:
 *   A) Standalone:  node scripts/health-check.js
 *   B) Pre-flight:  node scripts/health-check.js --service=x
 *   C) Module:      const hc = require('./health-check'); await hc.checkAll();
 *
 * Exit codes:
 *   0 = todo OK
 *   1 = algún servicio crítico falló
 *   2 = warnings (servicios secundarios con problemas)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════

const HEALTH_FILE = path.join(process.cwd(), '.gillito-health.json');
const BUDGET_FILE = path.join(process.cwd(), '.gillito-api-budget.json');

const SERVICES = {
  x: {
    name: 'X (Twitter) API',
    emoji: '🐦',
    critical: true,  // si falla, no postees a X
    endpoints: {
      me: 'https://api.twitter.com/2/users/me',
      tweets: 'https://api.twitter.com/2/tweets'
    }
  },
  moltbook: {
    name: 'Moltbook API',
    emoji: '🤖',
    critical: true,  // si falla, no postees a Moltbook
    endpoints: {
      base: 'https://www.moltbook.com/api',
      health: 'https://www.moltbook.com/api/posts?limit=1',
      me: 'https://www.moltbook.com/api/agents/me'
    }
  },
  groq: {
    name: 'Groq LLM API',
    emoji: '🧠',
    critical: true,  // sin AI no hay contenido
    endpoints: {
      chat: 'https://api.groq.com/openai/v1/chat/completions',
      models: 'https://api.groq.com/openai/v1/models'
    },
    limits: {
      // llama-3.3-70b-versatile free tier
      rpm: 30,     // requests per minute
      rpd: 1000,   // requests per day
      tpm: 12000,  // tokens per minute
      tpd: 100000  // tokens per day
    }
  },
  cloudflare: {
    name: 'Cloudflare Pages',
    emoji: '☁️',
    critical: false,  // solo pa websites, no esencial
    endpoints: {
      api: 'https://api.cloudflare.com/client/v4/user/tokens/verify'
    }
  }
};

// Límites de X API Free Tier
const X_LIMITS = {
  MAX_TWEETS_24H: 17,       // posts + replies combinados por 24h
  MAX_WRITES_MES: 500,      // writes mensuales (algunos dicen 1500, conservador)
  MAX_READS_MES: 100        // reads mensuales
};

// ════════════════════════════════════════════
// LOGGER
// ════════════════════════════════════════════

const LOG = {
  ok:   (msg) => console.log(`   ✅ ${msg}`),
  fail: (msg) => console.log(`   ❌ ${msg}`),
  warn: (msg) => console.log(`   ⚠️  ${msg}`),
  info: (msg) => console.log(`   ℹ️  ${msg}`),
  head: (msg) => {
    console.log('\n' + '═'.repeat(55));
    console.log(`  ${msg}`);
    console.log('═'.repeat(55));
  }
};

// ════════════════════════════════════════════
// RESULTS TRACKER
// ════════════════════════════════════════════

const results = {
  timestamp: new Date().toISOString(),
  services: {},
  summary: { ok: 0, fail: 0, warn: 0 },
  canPost: { x: false, moltbook: false },
  canGenerate: false
};

function record(service, status, detail) {
  if (!results.services[service]) {
    results.services[service] = { status: 'ok', checks: [] };
  }
  results.services[service].checks.push({ status, detail, ts: new Date().toISOString() });

  if (status === 'fail') {
    results.services[service].status = 'fail';
    results.summary.fail++;
  } else if (status === 'warn' && results.services[service].status !== 'fail') {
    results.services[service].status = 'warn';
    results.summary.warn++;
  } else if (status === 'ok') {
    results.summary.ok++;
  }
}

// ════════════════════════════════════════════
// X API — OAuth 1.0a Helper (para GET /users/me)
// ════════════════════════════════════════════

function generateOAuthHeader(method, url) {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const params = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0'
  };

  // Parse URL para incluir query params en signature
  const urlObj = new URL(url);
  const allParams = { ...params };
  urlObj.searchParams.forEach((v, k) => { allParams[k] = v; });

  const paramStr = Object.keys(allParams).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');

  const baseStr = `${method.toUpperCase()}&${encodeURIComponent(urlObj.origin + urlObj.pathname)}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');

  params.oauth_signature = signature;

  const header = 'OAuth ' + Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`)
    .join(', ');

  return header;
}

// ════════════════════════════════════════════
// 1. CHECK X (TWITTER) API
// ════════════════════════════════════════════

async function checkX() {
  LOG.head('🐦  1. X (TWITTER) API');

  // 1a. Verificar credenciales existen
  const creds = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
  const missing = creds.filter(c => !process.env[c]);

  if (missing.length > 0) {
    LOG.fail(`Credenciales faltantes: ${missing.join(', ')}`);
    record('x', 'fail', `Missing credentials: ${missing.join(', ')}`);
    return;
  }
  LOG.ok('Credenciales configuradas (4/4)');
  record('x', 'ok', 'All 4 credentials present');

  // 1b. Test auth con GET /2/users/me (no gasta write quota)
  try {
    const authHeader = generateOAuthHeader('GET', SERVICES.x.endpoints.me);
    const res = await fetch(SERVICES.x.endpoints.me, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
      signal: AbortSignal.timeout(10000)
    });

    // Leer rate limit headers
    const remaining = res.headers.get('x-rate-limit-remaining');
    const resetEpoch = res.headers.get('x-rate-limit-reset');
    const limit = res.headers.get('x-rate-limit-limit');

    if (res.status === 200) {
      const data = await res.json();
      LOG.ok(`Auth OK — @${data.data?.username || 'unknown'}`);
      record('x', 'ok', `Auth valid for @${data.data?.username}`);

      if (remaining !== null) {
        LOG.info(`Rate limit (users/me): ${remaining}/${limit} restantes`);
        if (resetEpoch) {
          const resetDate = new Date(parseInt(resetEpoch) * 1000);
          LOG.info(`Reset: ${resetDate.toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' })}`);
        }
        record('x', 'ok', `Rate limit: ${remaining}/${limit}`);
      }
    } else if (res.status === 429) {
      const body = await res.text();
      LOG.fail(`RATE LIMITED (429)`);
      LOG.info(`Body: ${body.substring(0, 200)}`);
      if (resetEpoch) {
        const resetDate = new Date(parseInt(resetEpoch) * 1000);
        const waitMin = Math.ceil((resetDate - Date.now()) / 60000);
        LOG.info(`Reset en ~${waitMin} minutos`);
      }
      record('x', 'fail', `Rate limited - 429`);
    } else if (res.status === 401) {
      const body = await res.text();
      LOG.fail(`Auth FALLIDA (401): ${body.substring(0, 200)}`);
      record('x', 'fail', `Auth failed: 401`);
    } else if (res.status === 403) {
      const body = await res.text();
      LOG.fail(`Acceso DENEGADO (403): ${body.substring(0, 200)}`);
      record('x', 'fail', `Forbidden: 403`);
    } else {
      const body = await res.text();
      LOG.warn(`Respuesta inesperada (${res.status}): ${body.substring(0, 200)}`);
      record('x', 'warn', `Unexpected: ${res.status}`);
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      LOG.fail('TIMEOUT — X API no responde (10s)');
      record('x', 'fail', 'Timeout after 10s');
    } else {
      LOG.fail(`Error de conexión: ${err.message}`);
      record('x', 'fail', `Connection error: ${err.message}`);
    }
  }

  // 1c. Verificar budget de X
  await checkXBudget();
}

async function checkXBudget() {
  console.log('');
  LOG.info('💰 Budget de X:');

  try {
    if (!fs.existsSync(BUDGET_FILE)) {
      LOG.warn('No existe .gillito-api-budget.json — primera corrida');
      record('x', 'warn', 'No budget file found');
      return;
    }

    const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Puerto_Rico' });
    const month = today.substring(0, 7);

    // Auto-reset si es nuevo día/mes
    if (budget.fecha !== today) {
      LOG.info(`Día nuevo (${today}) — contadores diarios se resetean`);
    }
    if (budget.mes !== month) {
      LOG.info(`Mes nuevo (${month}) — contadores mensuales se resetean`);
    }

    const postsHoy = budget.fecha === today ? (budget.posts_hoy || 0) : 0;
    const repliesHoy = budget.fecha === today ? (budget.replies_hoy || 0) : 0;
    const totalHoy = budget.fecha === today ? (budget.total_hoy || 0) : 0;
    const writesMes = budget.mes === month ? (budget.writes_mes || 0) : 0;

    LOG.info(`Posts hoy:   ${postsHoy}/${X_LIMITS.MAX_TWEETS_24H}`);
    LOG.info(`Replies hoy: ${repliesHoy}`);
    LOG.info(`Total hoy:   ${totalHoy}/${X_LIMITS.MAX_TWEETS_24H}`);
    LOG.info(`Writes mes:  ${writesMes}/${X_LIMITS.MAX_WRITES_MES}`);

    // Evaluar estado
    const pctDia = (totalHoy / X_LIMITS.MAX_TWEETS_24H) * 100;
    const pctMes = (writesMes / X_LIMITS.MAX_WRITES_MES) * 100;

    if (totalHoy >= X_LIMITS.MAX_TWEETS_24H) {
      LOG.fail(`BUDGET DIARIO AGOTADO (${totalHoy}/${X_LIMITS.MAX_TWEETS_24H})`);
      record('x', 'fail', `Daily budget exhausted: ${totalHoy}/${X_LIMITS.MAX_TWEETS_24H}`);
    } else if (pctDia >= 80) {
      LOG.warn(`Budget diario al ${pctDia.toFixed(0)}% — quedan ${X_LIMITS.MAX_TWEETS_24H - totalHoy} acciones`);
      record('x', 'warn', `Daily budget at ${pctDia.toFixed(0)}%`);
    } else {
      LOG.ok(`Budget diario OK (${pctDia.toFixed(0)}%)`);
      record('x', 'ok', `Daily budget at ${pctDia.toFixed(0)}%`);
    }

    if (writesMes >= X_LIMITS.MAX_WRITES_MES) {
      LOG.fail(`BUDGET MENSUAL AGOTADO (${writesMes}/${X_LIMITS.MAX_WRITES_MES})`);
      record('x', 'fail', `Monthly budget exhausted: ${writesMes}/${X_LIMITS.MAX_WRITES_MES}`);
    } else if (pctMes >= 80) {
      LOG.warn(`Budget mensual al ${pctMes.toFixed(0)}% — quedan ${X_LIMITS.MAX_WRITES_MES - writesMes} writes`);
      record('x', 'warn', `Monthly budget at ${pctMes.toFixed(0)}%`);
    } else {
      LOG.ok(`Budget mensual OK (${pctMes.toFixed(0)}%)`);
      record('x', 'ok', `Monthly budget at ${pctMes.toFixed(0)}%`);
    }

  } catch (err) {
    LOG.warn(`Error leyendo budget: ${err.message}`);
    record('x', 'warn', `Budget read error: ${err.message}`);
  }
}

// ════════════════════════════════════════════
// 2. CHECK MOLTBOOK API
// ════════════════════════════════════════════

async function checkMoltbook() {
  LOG.head('🤖  2. MOLTBOOK API');

  const key = process.env.MOLTBOOK_API_KEY;

  if (!key) {
    LOG.fail('MOLTBOOK_API_KEY no configurada');
    record('moltbook', 'fail', 'No API key');
    return;
  }
  LOG.ok(`API key configurada (${key.substring(0, 12)}...${key.substring(key.length - 4)})`);
  record('moltbook', 'ok', 'API key present');

  const headers = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  // 2a. Test server health (GET posts — no auth required)
  try {
    const res = await fetch(SERVICES.moltbook.endpoints.health, {
      method: 'GET',
      signal: AbortSignal.timeout(15000)
    });

    if (res.status === 200) {
      LOG.ok(`Server UP (${res.status})`);
      record('moltbook', 'ok', 'Server responding');
    } else if (res.status === 503 || res.status === 502) {
      LOG.fail(`Server DOWN/OVERLOADED (${res.status})`);
      record('moltbook', 'fail', `Server ${res.status}`);
    } else {
      LOG.warn(`Server responde con ${res.status}`);
      record('moltbook', 'warn', `Server ${res.status}`);
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      LOG.fail('TIMEOUT — Moltbook no responde (15s)');
      record('moltbook', 'fail', 'Timeout 15s');
    } else {
      LOG.fail(`Error de conexión: ${err.message}`);
      record('moltbook', 'fail', `Connection: ${err.message}`);
    }
    return; // Si no hay conexión, no seguir
  }

  // 2b. Test auth con GET /agents/me
  try {
    const res = await fetch(SERVICES.moltbook.endpoints.me, {
      method: 'GET',
      headers,
      redirect: 'manual', // evitar redirect que mata auth
      signal: AbortSignal.timeout(10000)
    });

    if (res.status === 200) {
      const data = await res.json();
      LOG.ok(`Auth OK — agente: @${data.username || data.name || 'unknown'}`);
      record('moltbook', 'ok', `Auth valid for @${data.username || data.name}`);
    } else if (res.status === 301 || res.status === 302 || res.status === 308) {
      LOG.warn(`Redirect detectado (${res.status}) — puede causar auth stripping`);
      const location = res.headers.get('location');
      if (location) LOG.info(`Redirect a: ${location}`);
      record('moltbook', 'warn', `Redirect ${res.status} on /agents/me`);
    } else if (res.status === 401) {
      LOG.fail('Auth FALLIDA (401) — API key inválida o reseteada');
      record('moltbook', 'fail', 'Auth 401 on /agents/me');
    } else {
      const body = await res.text();
      LOG.warn(`Respuesta inesperada (${res.status}): ${body.substring(0, 150)}`);
      record('moltbook', 'warn', `Unexpected ${res.status} on /agents/me`);
    }
  } catch (err) {
    LOG.fail(`Error en /agents/me: ${err.message}`);
    record('moltbook', 'fail', `/agents/me error: ${err.message}`);
  }

  // 2c. Test POST /posts (dry run — solo verificar que no da 401)
  try {
    // Intentar crear un post de prueba que sabemos que funciona
    // Pero NO queremos gastar una acción real, así que hacemos
    // un POST con body vacío — debería dar 400 (bad request) NO 401
    const res = await fetch(`${SERVICES.moltbook.endpoints.base}/posts`, {
      method: 'POST',
      headers,
      redirect: 'manual',
      body: JSON.stringify({}), // body inválido a propósito
      signal: AbortSignal.timeout(10000)
    });

    if (res.status === 400 || res.status === 422) {
      // Perfecto — 400/422 = auth funciona, solo falta content
      LOG.ok('POST /posts auth funciona (400 = body inválido, auth OK)');
      record('moltbook', 'ok', 'POST endpoint auth OK');
    } else if (res.status === 401) {
      LOG.fail('POST /posts auth FALLIDA (401)');
      record('moltbook', 'fail', 'POST endpoint auth failed');
    } else if (res.status === 201 || res.status === 200) {
      // Oops, posteó con body vacío? Raro pero OK
      LOG.warn('POST /posts aceptó body vacío — auth funciona pero raro');
      record('moltbook', 'warn', 'POST accepted empty body');
    } else {
      LOG.warn(`POST /posts responde con ${res.status}`);
      record('moltbook', 'warn', `POST endpoint ${res.status}`);
    }
  } catch (err) {
    LOG.warn(`Error en POST /posts: ${err.message}`);
    record('moltbook', 'warn', `POST endpoint error: ${err.message}`);
  }

  // 2d. Test endpoints de interacción (comment/upvote — bug conocido)
  const interactionEndpoints = [
    { name: 'comment', path: '/posts/test/comments' },
    { name: 'upvote', path: '/posts/test/upvote' }
  ];

  for (const ep of interactionEndpoints) {
    try {
      const res = await fetch(`${SERVICES.moltbook.endpoints.base}${ep.path}`, {
        method: 'POST',
        headers,
        redirect: 'manual',
        body: JSON.stringify({ content: 'health-check' }),
        signal: AbortSignal.timeout(8000)
      });

      if (res.status === 401) {
        LOG.warn(`${ep.name}: 401 — bug conocido de plataforma (no es tu key)`);
        record('moltbook', 'warn', `${ep.name} endpoint 401 (platform bug)`);
      } else if (res.status === 404) {
        LOG.ok(`${ep.name}: 404 (post test no existe, pero auth pasó)`);
        record('moltbook', 'ok', `${ep.name} auth OK (404 expected)`);
      } else if (res.status === 200 || res.status === 201) {
        LOG.ok(`${ep.name}: FUNCIONA ✨`);
        record('moltbook', 'ok', `${ep.name} working`);
      } else {
        LOG.info(`${ep.name}: ${res.status}`);
        record('moltbook', 'warn', `${ep.name} returned ${res.status}`);
      }
    } catch (err) {
      LOG.warn(`${ep.name}: ${err.message}`);
      record('moltbook', 'warn', `${ep.name} error`);
    }
  }
}

// ════════════════════════════════════════════
// 3. CHECK GROQ API
// ════════════════════════════════════════════

async function checkGroq() {
  LOG.head('🧠  3. GROQ LLM API');

  const key = process.env.GROQ_API_KEY;

  if (!key) {
    LOG.fail('GROQ_API_KEY no configurada');
    record('groq', 'fail', 'No API key');
    return;
  }
  LOG.ok(`API key configurada (${key.substring(0, 8)}...${key.substring(key.length - 4)})`);
  record('groq', 'ok', 'API key present');

  const headers = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  // 3a. Test auth con GET /models (no gasta tokens)
  try {
    const res = await fetch(SERVICES.groq.endpoints.models, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(10000)
    });

    if (res.status === 200) {
      const data = await res.json();
      const modelNames = (data.data || []).map(m => m.id);
      const hasLlama = modelNames.some(m => m.includes('llama-3.3-70b'));
      LOG.ok(`Auth OK — ${modelNames.length} modelos disponibles`);
      if (hasLlama) {
        LOG.ok('llama-3.3-70b-versatile DISPONIBLE');
        record('groq', 'ok', 'Target model available');
      } else {
        LOG.warn('llama-3.3-70b-versatile NO encontrado en la lista');
        LOG.info(`Modelos: ${modelNames.slice(0, 5).join(', ')}...`);
        record('groq', 'warn', 'Target model not in list');
      }
    } else if (res.status === 401) {
      LOG.fail('Auth FALLIDA (401) — API key inválida');
      record('groq', 'fail', 'Auth failed 401');
      return;
    } else if (res.status === 429) {
      LOG.fail('RATE LIMITED (429) — demasiadas requests');
      const retryAfter = res.headers.get('retry-after');
      if (retryAfter) LOG.info(`Retry después de: ${retryAfter}s`);
      record('groq', 'fail', 'Rate limited on /models');
      return;
    } else {
      LOG.warn(`Respuesta inesperada (${res.status})`);
      record('groq', 'warn', `Unexpected ${res.status}`);
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      LOG.fail('TIMEOUT — Groq API no responde (10s)');
      record('groq', 'fail', 'Timeout 10s');
    } else {
      LOG.fail(`Error de conexión: ${err.message}`);
      record('groq', 'fail', `Connection: ${err.message}`);
    }
    return;
  }

  // 3b. Test mínimo de generación (1 token — costo mínimo)
  try {
    const res = await fetch(SERVICES.groq.endpoints.chat, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Di: OK' }],
        max_tokens: 5,
        temperature: 0
      }),
      signal: AbortSignal.timeout(15000)
    });

    // Leer rate limit headers de Groq
    const rpmRemaining = res.headers.get('x-ratelimit-remaining-requests');
    const rpdRemaining = res.headers.get('x-ratelimit-remaining-tokens'); // tokens realmente
    const tpmRemaining = res.headers.get('x-ratelimit-remaining-tokens');
    const resetRequests = res.headers.get('x-ratelimit-reset-requests');
    const resetTokens = res.headers.get('x-ratelimit-reset-tokens');
    const limitRequests = res.headers.get('x-ratelimit-limit-requests');
    const limitTokens = res.headers.get('x-ratelimit-limit-tokens');

    if (res.status === 200) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || {};
      LOG.ok(`Generación OK — respuesta: "${reply.trim()}"`);
      LOG.info(`Tokens usados: ${usage.prompt_tokens || '?'} prompt + ${usage.completion_tokens || '?'} completion`);
      record('groq', 'ok', 'Generation working');

      // Mostrar rate limits
      if (rpmRemaining !== null || limitRequests !== null) {
        console.log('');
        LOG.info('📊 Rate Limits Groq:');
        if (limitRequests) LOG.info(`   Requests: ${rpmRemaining || '?'}/${limitRequests} restantes`);
        if (limitTokens) LOG.info(`   Tokens:   ${tpmRemaining || '?'}/${limitTokens} restantes`);
        if (resetRequests) LOG.info(`   Reset requests: ${resetRequests}`);
        if (resetTokens) LOG.info(`   Reset tokens:   ${resetTokens}`);

        // Evaluar si estamos cerca del límite
        if (rpmRemaining !== null && parseInt(rpmRemaining) <= 5) {
          LOG.warn(`Solo ${rpmRemaining} requests restantes en esta ventana`);
          record('groq', 'warn', `Low requests remaining: ${rpmRemaining}`);
        } else {
          record('groq', 'ok', `Rate limits healthy`);
        }
      }

    } else if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      LOG.fail('RATE LIMITED (429)');
      if (body.error?.message) LOG.info(`Detalle: ${body.error.message}`);
      if (resetRequests) LOG.info(`Reset en: ${resetRequests}`);
      record('groq', 'fail', `Rate limited: ${body.error?.message || '429'}`);
    } else if (res.status === 503) {
      LOG.fail('Servicio NO disponible (503) — Groq con problemas');
      record('groq', 'fail', 'Service unavailable 503');
    } else {
      const body = await res.text();
      LOG.warn(`Respuesta: ${res.status} — ${body.substring(0, 200)}`);
      record('groq', 'warn', `Unexpected ${res.status}`);
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      LOG.fail('TIMEOUT en generación (15s)');
      record('groq', 'fail', 'Generation timeout 15s');
    } else {
      LOG.fail(`Error en generación: ${err.message}`);
      record('groq', 'fail', `Generation error: ${err.message}`);
    }
  }
}

// ════════════════════════════════════════════
// 4. CHECK CLOUDFLARE (OPCIONAL)
// ════════════════════════════════════════════

async function checkCloudflare() {
  LOG.head('☁️   4. CLOUDFLARE PAGES (opcional)');

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!token || !accountId) {
    LOG.info('Cloudflare no configurado — skip (solo necesario pa websites)');
    record('cloudflare', 'ok', 'Not configured (optional)');
    return;
  }

  LOG.ok('Token + Account ID configurados');
  record('cloudflare', 'ok', 'Credentials present');

  try {
    const res = await fetch(SERVICES.cloudflare.endpoints.api, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(10000)
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.success) {
        LOG.ok(`Token válido — status: ${data.result?.status || 'active'}`);
        record('cloudflare', 'ok', 'Token valid');
      } else {
        LOG.warn(`Token response pero success=false`);
        record('cloudflare', 'warn', 'Token response but not success');
      }
    } else if (res.status === 401) {
      LOG.fail('Token INVÁLIDO (401)');
      record('cloudflare', 'fail', 'Token invalid 401');
    } else {
      LOG.warn(`Respuesta: ${res.status}`);
      record('cloudflare', 'warn', `Unexpected ${res.status}`);
    }
  } catch (err) {
    LOG.warn(`Error: ${err.message}`);
    record('cloudflare', 'warn', `Error: ${err.message}`);
  }
}

// ════════════════════════════════════════════
// 5. CHECK BUDGET INTERNO / ESTADO GENERAL
// ════════════════════════════════════════════

async function checkInternal() {
  LOG.head('📊  5. ESTADO INTERNO');

  // 5a. Verificar que personality.json existe
  const personalityPaths = [
    path.join(process.cwd(), 'config', 'personality.json'),
    path.join(process.cwd(), 'personality.json')
  ];

  let foundPersonality = false;
  for (const p of personalityPaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        LOG.ok(`personality.json encontrado (v${data.version || '?'})`);
        record('internal', 'ok', `Personality v${data.version}`);
        foundPersonality = true;
        break;
      } catch (e) {
        LOG.fail(`personality.json CORRUPTO: ${e.message}`);
        record('internal', 'fail', `Personality JSON parse error`);
        foundPersonality = true;
        break;
      }
    }
  }
  if (!foundPersonality) {
    LOG.warn('personality.json no encontrado');
    record('internal', 'warn', 'No personality.json');
  }

  // 5b. Verificar core.js existe
  const corePaths = [
    path.join(process.cwd(), 'scripts', 'lib', 'core.js'),
    path.join(process.cwd(), 'lib', 'core.js')
  ];

  let foundCore = false;
  for (const p of corePaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const version = content.match(/MASTER CORE v([\d.]+)/)?.[1] || '?';
      LOG.ok(`core.js encontrado (v${version}) — ${content.split('\n').length} líneas`);
      record('internal', 'ok', `Core v${version}`);
      foundCore = true;
      break;
    }
  }
  if (!foundCore) {
    LOG.warn('core.js no encontrado');
    record('internal', 'warn', 'No core.js');
  }

  // 5c. Espacio en disco (para logs/history)
  try {
    const historyFiles = ['.gillito-tweet-history.json', '.gillito-reply-history.json', '.gillito-journal.json'];
    let totalSize = 0;
    for (const f of historyFiles) {
      const fp = path.join(process.cwd(), f);
      if (fs.existsSync(fp)) {
        const stats = fs.statSync(fp);
        totalSize += stats.size;
      }
    }
    LOG.info(`Archivos de historial: ${(totalSize / 1024).toFixed(1)} KB`);
    record('internal', 'ok', `History files: ${(totalSize / 1024).toFixed(1)} KB`);
  } catch (e) {
    // No importa
  }

  // 5d. Hora de Puerto Rico
  const prTime = new Date().toLocaleString('es-PR', {
    timeZone: 'America/Puerto_Rico',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  LOG.info(`Hora PR: ${prTime}`);
}

// ════════════════════════════════════════════
// RESUMEN Y VEREDICTO
// ════════════════════════════════════════════

function generateVerdict() {
  LOG.head('🦞  VEREDICTO FINAL');

  // Determinar qué puede hacer Gillito
  const xStatus = results.services.x?.status || 'unknown';
  const moltStatus = results.services.moltbook?.status || 'unknown';
  const groqStatus = results.services.groq?.status || 'unknown';

  results.canPost.x = (xStatus === 'ok' || xStatus === 'warn') && groqStatus !== 'fail';
  results.canPost.moltbook = (moltStatus === 'ok' || moltStatus === 'warn') && groqStatus !== 'fail';
  results.canGenerate = groqStatus !== 'fail';

  console.log('');

  // Status por servicio
  const statusIcon = (s) => s === 'ok' ? '🟢' : s === 'warn' ? '🟡' : s === 'fail' ? '🔴' : '⚪';

  console.log(`   ${statusIcon(xStatus)}  X (Twitter)  — ${xStatus.toUpperCase()}`);
  console.log(`   ${statusIcon(moltStatus)}  Moltbook     — ${moltStatus.toUpperCase()}`);
  console.log(`   ${statusIcon(groqStatus)}  Groq LLM     — ${groqStatus.toUpperCase()}`);

  const cfStatus = results.services.cloudflare?.status || 'unknown';
  if (cfStatus !== 'unknown') {
    console.log(`   ${statusIcon(cfStatus)}  Cloudflare   — ${cfStatus.toUpperCase()}`);
  }

  console.log('');
  console.log('   ────────────────────────────────');
  console.log(`   Puede postear a X:        ${results.canPost.x ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   Puede postear a Moltbook: ${results.canPost.moltbook ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   Puede generar contenido:  ${results.canGenerate ? '✅ SÍ' : '❌ NO'}`);
  console.log('');

  // Conteo
  console.log(`   ✅ ${results.summary.ok} checks OK`);
  if (results.summary.warn > 0) console.log(`   ⚠️  ${results.summary.warn} warnings`);
  if (results.summary.fail > 0) console.log(`   ❌ ${results.summary.fail} fallos`);
  console.log('');

  // Recomendaciones
  if (results.summary.fail > 0) {
    console.log('   🚨 ACCIÓN REQUERIDA:');
    for (const [svc, data] of Object.entries(results.services)) {
      if (data.status === 'fail') {
        const failures = data.checks.filter(c => c.status === 'fail');
        for (const f of failures) {
          console.log(`      → ${SERVICES[svc]?.emoji || '❓'} ${f.detail}`);
        }
      }
    }
    console.log('');
  }

  // Guardar resultado
  try {
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(results, null, 2));
    LOG.info(`Resultado guardado en ${HEALTH_FILE}`);
  } catch (e) {
    LOG.warn(`No se pudo guardar resultado: ${e.message}`);
  }

  return results;
}

// ════════════════════════════════════════════
// EXPORT PARA USO COMO MÓDULO
// ════════════════════════════════════════════

/**
 * Chequeo rápido de un servicio específico.
 * Retorna true si el servicio está operativo.
 *
 * Uso: const { preflight } = require('./health-check');
 *      if (!await preflight('x')) process.exit(0);
 */
async function preflight(service) {
  // Leer resultado guardado si existe y es reciente (< 10 min)
  try {
    if (fs.existsSync(HEALTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf8'));
      const age = Date.now() - new Date(data.timestamp).getTime();
      if (age < 10 * 60 * 1000) { // < 10 minutos
        const svcStatus = data.services[service]?.status;
        if (svcStatus === 'fail') {
          console.log(`⚡ PREFLIGHT: ${service} marcado como FALLIDO (hace ${Math.round(age / 60000)} min)`);
          console.log(`   → Saltando ejecución para no gastar API calls`);
          return false;
        }

        // También verificar canPost para x/moltbook
        if (service === 'x' && !data.canPost?.x) {
          console.log(`⚡ PREFLIGHT: No se puede postear a X (diagnosticado hace ${Math.round(age / 60000)} min)`);
          return false;
        }
        if (service === 'moltbook' && !data.canPost?.moltbook) {
          console.log(`⚡ PREFLIGHT: No se puede postear a Moltbook (diagnosticado hace ${Math.round(age / 60000)} min)`);
          return false;
        }

        return true;
      }
    }
  } catch (e) {
    // No hay data previa, permitir ejecución
  }

  return true; // Sin data previa = asumir OK
}

/**
 * Correr todos los chequeos.
 * Retorna el objeto results completo.
 */
async function checkAll() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🦞 GILLITO HEALTH CHECK v1.0');
  console.log('  ' + new Date().toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' }));
  console.log('═══════════════════════════════════════════════════════');

  await checkX();
  await checkMoltbook();
  await checkGroq();
  await checkCloudflare();
  await checkInternal();

  return generateVerdict();
}

// ════════════════════════════════════════════
// CLI — Ejecución directa
// ════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const serviceArg = args.find(a => a.startsWith('--service='));
  const service = serviceArg ? serviceArg.split('=')[1] : null;

  (async () => {
    if (service) {
      // Chequear solo un servicio
      console.log(`\n⚡ Preflight check: ${service}`);
      const ok = await preflight(service);
      if (!ok) {
        console.log('❌ Servicio no disponible — abortando');
        process.exit(1);
      }

      // Si no hay data previa, correr chequeo completo de ese servicio
      switch (service) {
        case 'x': await checkX(); break;
        case 'moltbook': await checkMoltbook(); break;
        case 'groq': await checkGroq(); break;
        case 'cloudflare': await checkCloudflare(); break;
        default:
          console.log(`Servicio desconocido: ${service}`);
          console.log('Servicios: x, moltbook, groq, cloudflare');
          process.exit(1);
      }

      generateVerdict();
    } else {
      // Chequeo completo
      const result = await checkAll();

      // Exit code basado en resultado
      if (result.summary.fail > 0) {
        process.exit(1);
      } else if (result.summary.warn > 0) {
        process.exit(0); // warnings no bloquean
      } else {
        process.exit(0);
      }
    }
  })();
}

// Exports para uso como módulo
module.exports = { checkAll, preflight, checkX, checkMoltbook, checkGroq, checkCloudflare };
