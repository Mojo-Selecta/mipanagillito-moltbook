'use strict';
/**
 * 🦞 GILLITO PREFLIGHT v1.0
 * ════════════════════════════════════
 * Chequeo rápido ANTES de cada workflow.
 * Lee el health-check guardado + hace pruebas mínimas.
 *
 * Uso en workflow:
 *   - name: ⚡ Preflight
 *     run: node scripts/preflight.js x groq
 *     # Si falla, el workflow se detiene sin gastar API calls
 *
 * Argumentos: lista de servicios a verificar
 *   x        → verifica X API + budget
 *   moltbook → verifica Moltbook API
 *   openai   → verifica OpenAI API (primario)
 *   groq     → verifica Groq API (fallback)
 *   llm      → chequea OpenAI primero, Groq si falla (recomendado)
 *
 * Exit codes:
 *   0 = todo OK, proceder
 *   1 = servicio DOWN o budget agotado, NO proceder
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HEALTH_FILE = path.join(process.cwd(), '.gillito-health.json');
const BUDGET_FILE = path.join(process.cwd(), '.gillito-api-budget.json');
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutos máximo de cache

const X_LIMITS = {
  MAX_TWEETS_24H: 17,
  MAX_WRITES_MES: 500
};

// ════════════════════════════════════════════
// QUICK CHECKS (sin gastar API calls)
// ════════════════════════════════════════════

function checkXBudget() {
  try {
    if (!fs.existsSync(BUDGET_FILE)) return { ok: true, reason: 'No budget file (first run)' };
    
    const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Puerto_Rico' });
    const month = today.substring(0, 7);
    
    // Si es día/mes nuevo, counters se resetean
    const totalHoy = budget.fecha === today ? (budget.total_hoy || 0) : 0;
    const writesMes = budget.mes === month ? (budget.writes_mes || 0) : 0;
    
    if (totalHoy >= X_LIMITS.MAX_TWEETS_24H) {
      return { ok: false, reason: `Budget diario AGOTADO: ${totalHoy}/${X_LIMITS.MAX_TWEETS_24H}` };
    }
    if (writesMes >= X_LIMITS.MAX_WRITES_MES) {
      return { ok: false, reason: `Budget mensual AGOTADO: ${writesMes}/${X_LIMITS.MAX_WRITES_MES}` };
    }
    
    return { 
      ok: true, 
      reason: `Día: ${totalHoy}/${X_LIMITS.MAX_TWEETS_24H} | Mes: ${writesMes}/${X_LIMITS.MAX_WRITES_MES}` 
    };
  } catch (e) {
    return { ok: true, reason: `Budget read error (proceeding): ${e.message}` };
  }
}

function checkCachedHealth(service) {
  try {
    if (!fs.existsSync(HEALTH_FILE)) return { ok: true, reason: 'No health cache (first run)' };
    
    const data = JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf8'));
    const age = Date.now() - new Date(data.timestamp).getTime();
    
    if (age > MAX_AGE_MS) {
      return { ok: true, reason: `Health cache stale (${Math.round(age / 60000)} min old)` };
    }
    
    const svcData = data.services[service];
    if (!svcData) return { ok: true, reason: `No cached data for ${service}` };
    
    if (svcData.status === 'fail') {
      const failures = svcData.checks.filter(c => c.status === 'fail').map(c => c.detail);
      return { 
        ok: false, 
        reason: `FAIL (${Math.round(age / 60000)} min ago): ${failures.join(', ')}` 
      };
    }
    
    return { ok: true, reason: `Cached OK (${Math.round(age / 60000)} min ago)` };
  } catch (e) {
    return { ok: true, reason: `Cache read error (proceeding): ${e.message}` };
  }
}

// ════════════════════════════════════════════
// LIVE QUICK CHECKS (1 request each, con timeout corto)
// ════════════════════════════════════════════

async function quickCheckGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, reason: 'GROQ_API_KEY missing' };
  
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(8000)
    });
    
    if (res.status === 200) return { ok: true, reason: `Groq OK (${res.status})` };
    if (res.status === 429) return { ok: false, reason: `Groq RATE LIMITED (429)` };
    if (res.status === 401) return { ok: false, reason: `Groq AUTH FAILED (401)` };
    return { ok: true, reason: `Groq responded (${res.status})` };
  } catch (e) {
    return { ok: false, reason: `Groq unreachable: ${e.message}` };
  }
}

async function quickCheckOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, reason: 'OPENAI_API_KEY missing' };
  
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` },
      signal: AbortSignal.timeout(8000)
    });
    
    if (res.status === 200) return { ok: true, reason: `OpenAI OK (${res.status})` };
    if (res.status === 429) return { ok: false, reason: `OpenAI RATE LIMITED (429)` };
    if (res.status === 401) return { ok: false, reason: `OpenAI AUTH FAILED (401)` };
    if (res.status === 402) return { ok: false, reason: `OpenAI SIN CRÉDITOS (402)` };
    if (res.status === 403) return { ok: false, reason: `OpenAI FORBIDDEN (403)` };
    return { ok: true, reason: `OpenAI responded (${res.status})` };
  } catch (e) {
    return { ok: false, reason: `OpenAI unreachable: ${e.message}` };
  }
}

async function quickCheckMoltbook() {
  const key = process.env.MOLTBOOK_API_KEY;
  if (!key) return { ok: false, reason: 'MOLTBOOK_API_KEY missing' };
  
  try {
    const res = await fetch('https://www.moltbook.com/api/posts?limit=1', {
      signal: AbortSignal.timeout(10000)
    });
    
    if (res.status === 200) return { ok: true, reason: `Moltbook UP (${res.status})` };
    if (res.status === 503 || res.status === 502) return { ok: false, reason: `Moltbook DOWN (${res.status})` };
    return { ok: true, reason: `Moltbook responded (${res.status})` };
  } catch (e) {
    return { ok: false, reason: `Moltbook unreachable: ${e.message}` };
  }
}

function generateOAuthHeader(method, url) {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const params = {
    oauth_consumer_key: apiKey, oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: timestamp,
    oauth_token: accessToken, oauth_version: '1.0'
  };
  const urlObj = new URL(url);
  const allParams = { ...params };
  urlObj.searchParams.forEach((v, k) => { allParams[k] = v; });
  const paramStr = Object.keys(allParams).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`).join('&');
  const baseStr = `${method}&${encodeURIComponent(urlObj.origin + urlObj.pathname)}&${encodeURIComponent(paramStr)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');
  params.oauth_signature = signature;
  return 'OAuth ' + Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`).join(', ');
}

async function quickCheckX() {
  const creds = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
  const missing = creds.filter(c => !process.env[c]);
  if (missing.length > 0) return { ok: false, reason: `Missing: ${missing.join(', ')}` };
  
  // Primero chequear budget (gratis, sin API call)
  const budgetCheck = checkXBudget();
  if (!budgetCheck.ok) return budgetCheck;
  
  // Quick auth check con GET /users/me
  try {
    const url = 'https://api.twitter.com/2/users/me';
    const auth = generateOAuthHeader('GET', url);
    const res = await fetch(url, {
      headers: { 'Authorization': auth },
      signal: AbortSignal.timeout(8000)
    });
    
    if (res.status === 200) return { ok: true, reason: `X OK — budget: ${budgetCheck.reason}` };
    if (res.status === 429) return { ok: false, reason: `X RATE LIMITED (429)` };
    if (res.status === 401) return { ok: false, reason: `X AUTH FAILED (401)` };
    if (res.status === 403) return { ok: false, reason: `X FORBIDDEN (403)` };
    return { ok: true, reason: `X responded (${res.status})` };
  } catch (e) {
    return { ok: false, reason: `X unreachable: ${e.message}` };
  }
}

// ════════════════════════════════════════════
// MAIN — Preflight Runner
// ════════════════════════════════════════════

async function main() {
  const services = process.argv.slice(2).filter(a => !a.startsWith('-'));
  
  if (services.length === 0) {
    console.log('⚡ PREFLIGHT — uso: node preflight.js <service1> [service2] ...');
    console.log('   Servicios: x, moltbook, openai, groq, llm');
    console.log('   "llm" = chequea OpenAI primero, Groq como fallback');
    process.exit(0);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ⚡ GILLITO PREFLIGHT CHECK');
  console.log('═══════════════════════════════════════════');
  
  let allOk = true;
  const doLive = process.argv.includes('--live');
  
  for (const svc of services) {
    
    // "llm" = chequear OpenAI primero, Groq como fallback
    // Si al menos uno funciona, está OK
    if (svc === 'llm') {
      const openai = await quickCheckOpenAI();
      const groq = await quickCheckGroq();
      
      if (openai.ok) {
        console.log(`\n   🟢 LLM: OpenAI OK (primario) — ${openai.reason}`);
        if (groq.ok) {
          console.log(`   🟢 LLM: Groq OK (backup listo) — ${groq.reason}`);
        } else {
          console.log(`   🟡 LLM: Groq CAÍDO (sin backup) — ${groq.reason}`);
        }
      } else if (groq.ok) {
        console.log(`\n   🟡 LLM: OpenAI CAÍDO — ${openai.reason}`);
        console.log(`   🟢 LLM: Usando Groq como fallback — ${groq.reason}`);
      } else {
        console.log(`\n   🔴 LLM: OpenAI CAÍDO — ${openai.reason}`);
        console.log(`   🔴 LLM: Groq CAÍDO — ${groq.reason}`);
        console.log(`      → BLOQUEADO — ningún LLM disponible`);
        allOk = false;
      }
      continue;
    }
    
    // Paso 1: Verificar cache
    const cached = checkCachedHealth(svc);
    
    if (!cached.ok) {
      console.log(`\n   🔴 ${svc.toUpperCase()}: ${cached.reason}`);
      console.log(`      → BLOQUEADO — no gastar API calls`);
      allOk = false;
      continue;
    }
    
    // Paso 2: Si es X, verificar budget (gratis)
    if (svc === 'x') {
      const budget = checkXBudget();
      if (!budget.ok) {
        console.log(`\n   🔴 ${svc.toUpperCase()}: ${budget.reason}`);
        console.log(`      → BLOQUEADO — budget agotado`);
        allOk = false;
        continue;
      }
    }
    
    // Paso 3: Quick live check (1 request, timeout corto)
    let live = { ok: true, reason: 'skipped' };
    switch (svc) {
      case 'x':        live = await quickCheckX(); break;
      case 'moltbook': live = await quickCheckMoltbook(); break;
      case 'openai':   live = await quickCheckOpenAI(); break;
      case 'groq':     live = await quickCheckGroq(); break;
      default:
        console.log(`\n   ⚠️  Servicio desconocido: ${svc}`);
        continue;
    }
    
    if (!live.ok) {
      console.log(`\n   🔴 ${svc.toUpperCase()}: ${live.reason}`);
      console.log(`      → BLOQUEADO — servicio no disponible`);
      allOk = false;
    } else {
      console.log(`\n   🟢 ${svc.toUpperCase()}: ${live.reason}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅ PREFLIGHT OK — proceder');
    console.log('═══════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log('  ❌ PREFLIGHT FALLIDO — abortando workflow');
    console.log('  💡 Corre "🩺 Health Check" para diagnóstico completo');
    console.log('═══════════════════════════════════════════\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal preflight error:', err.message);
  // En caso de error del preflight mismo, dejar pasar
  process.exit(0);
});
