'use strict';
/**
 * 🦞 GILLITO MASTER CORE v7.1
 * ═══════════════════════════════════════════════════════════
 * The DEFINITIVE shared brain for ALL Gillito scripts.
 * Every interaction tracked. Every pattern learned.
 *
 *  1.  Constants & State
 *  1b. File I/O Utilities
 *  2.  Logger
 *  3.  Script Context & Session Tracking
 *  4.  Personality Loader + v5.0 Normalizer
 *  5.  PR Time & Schedulin
 *  6.  LLM Client — DUAL ENGINE (Groq primary + OpenAI backup)
 *  7.  Content Pipeline (validate + dedup + diversity)
 *  8.  History Manager (enriched entries)
 *  9.  Analytics Engine
 *  10. Adaptive Intelligence
 *  10b. Knowledge Sources (Web Research + YouTube)
 *  10c. Recon Intel (Deep OSINT Levels 1-4)
 *  10d. Mood Integration Helpers
 *  11. X (Twitter) API — OAuth 1.0a
 *  12. Moltbook API (full CRUD + retry)
 *  13. Cloudflare Pages API
 *  14. Bot Detection
 *  15. Prompt Builders
 *  16. Title Generator
 *  17. Exports
 *
 * Backward compatible with ALL v5/v6 scripts.
 * v7.0: personality v5.0 normalizer, readJSON/writeJSON,
 *       mood helpers, null-safe pick/shuffle.
 * v7.1: Groq as PRIMARY (free), OpenAI as BACKUP (paid).
 *       Dynamic fallback logic, temperature capping for Groq.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sec = require('./security');  // 🛡️ Security module

/* ═══════════════════════════════════════════════════════
   1. CONSTANTS & STATE
   ═══════════════════════════════════════════════════════ */

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_PATH = path.join(WORKSPACE, 'config', 'personality.json');

/** Session context — set once via initScript() */
let _ctx = { script: 'unknown', platform: 'unknown', startTime: Date.now() };

/** Session-wide statistics */
let _stats = {
  llmCalls: 0, llmRetries: 0, llmErrors: 0,
  llmProvider: 'none',
  postsCreated: 0, repliesCreated: 0,
  validationFails: 0, dedupFails: 0,
  apiCalls: { x: 0, moltbook: 0, cloudflare: 0 }
};

/** In-memory interaction journal for this run */
let _journal = [];

/* ═══════════════════════════════════════════════════════
   1b. FILE I/O UTILITIES (v7.0)
   ═══════════════════════════════════════════════════════ */

/**
 * Read and parse a JSON file. Returns fallback if missing or invalid.
 * Paths without leading / are resolved relative to WORKSPACE.
 */
function readJSON(filepath, fallback) {
  if (typeof fallback === 'undefined') fallback = null;
  try {
    const p = filepath.startsWith('/') ? filepath : path.join(WORKSPACE, filepath);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) { return fallback; }
}

/**
 * Write data as JSON to a file. Returns true on success.
 */
function writeJSON(filepath, data) {
  try {
    const p = filepath.startsWith('/') ? filepath : path.join(WORKSPACE, filepath);
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    return true;
  } catch (e) { return false; }
}

/* ═══════════════════════════════════════════════════════
   2. LOGGER
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
    console.log('\n' + '═'.repeat(56));
    lines.forEach(l => console.log(`  ${l}`));
    console.log('═'.repeat(56) + '\n');
  },

  /** Pretty-print session summary (call at end of every script) */
  session() {
    const dur = ((Date.now() - _ctx.startTime) / 1000).toFixed(1);
    console.log('\n' + '─'.repeat(50));
    console.log(`📊 SESIÓN: ${_ctx.script} (${_ctx.platform}) — ${dur}s`);
    console.log(`   LLM: ${_stats.llmProvider} — ${_stats.llmCalls} calls, ${_stats.llmRetries} retries, ${_stats.llmErrors} errors`);
    console.log(`   Content: ${_stats.postsCreated} posts, ${_stats.repliesCreated} replies`);
    console.log(`   Pipeline: ${_stats.validationFails} validation fails, ${_stats.dedupFails} dedup fails`);
    console.log(`   API calls: X=${_stats.apiCalls.x} Molt=${_stats.apiCalls.moltbook} CF=${_stats.apiCalls.cloudflare}`);
    console.log(`   Journal: ${_journal.length} interactions logged`);
    console.log('─'.repeat(50) + '\n');
  },

  /** Log a JSON object nicely for debugging */
  json(label, obj) { console.log(`🔍 ${label}:`, JSON.stringify(obj, null, 2)); }
};

/* ═══════════════════════════════════════════════════════
   3. SCRIPT CONTEXT & SESSION TRACKING
   ═══════════════════════════════════════════════════════ */

function initScript(name, platform = 'unknown') {
  _ctx = { script: name, platform, startTime: Date.now() };
  _stats = {
    llmCalls: 0, llmRetries: 0, llmErrors: 0,
    llmProvider: 'none',
    postsCreated: 0, repliesCreated: 0,
    validationFails: 0, dedupFails: 0,
    apiCalls: { x: 0, moltbook: 0, cloudflare: 0 }
  };
  _journal = [];
  log.banner([`🦞 ${name.toUpperCase()} v7.1`, `📡 Plataforma: ${platform}`]);
  const llm = detectLLM();
  const fallback = getFallbackProvider();
  log.info(`🧠 Motor LLM: ${llm.provider === 'groq' ? 'Groq/' + GROQ_MODEL : 'OpenAI GPT-4o'}${fallback ? ` (${fallback.provider} backup ready)` : ''}`);
}

function getContext()      { return { ..._ctx }; }
function getStats()        { return { ..._stats, durationMs: Date.now() - _ctx.startTime }; }
function getJournal()      { return [..._journal]; }

/* ═══════════════════════════════════════════════════════
   4. PERSONALITY LOADER + v5.0 NORMALIZER
   ═══════════════════════════════════════════════════════ */

function loadPersonality(silent = false) {
  try {
    const P = JSON.parse(fs.readFileSync(PERSONALITY_PATH, 'utf8'));
    normalizePersonality(P);
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

function savePersonality(P) {
  try {
    fs.writeFileSync(PERSONALITY_PATH, JSON.stringify(P, null, 2), 'utf8');
    log.ok('personality.json guardado');
    return true;
  } catch (e) {
    log.error(`No se pudo guardar personality.json: ${e.message}`);
    return false;
  }
}

/**
 * Bridges personality.json v5.0 → legacy fields.
 * Creates all fields that prompt builders and v5/v6 scripts expect.
 * Safe on legacy files (no-op if fields already exist).
 */
function normalizePersonality(P) {
  if (P._normalized) return P;

  // ── Identity from tributo ──
  const t = P.tributo || {};
  if (!P.nombre_real)   P.nombre_real   = t.nombre_real || 'Gilberto de Jesús Casas';
  if (!P.nacimiento)    P.nacimiento    = t.nacimiento || '1970';
  if (!P.fallecimiento) P.fallecimiento = t.fallecimiento || '2014';
  if (!P.cita_real)     P.cita_real     = t.cita_real || 'Yo soy la bestia, el destructor de sueños';
  if (!P.mision)        P.mision        = t.mision || 'Preservar la voz auténtica de Gillito y la cultura boricua';
  if (!P.intensidad)    P.intensidad    = 10;
  if (!P.temperatura)   P.temperatura   = 1.0;

  // ── Voice DNA → legacy speech fields ──
  const vd = P.voice_dna || {};
  if (!P.frases_firma) {
    P.frases_firma = vd.identidad_core || ['Yo soy la bestia', 'EL GOAT', 'Mi Pana Gillito', 'Destructores de sueños'];
  }
  if (!P.insultos_creativos) {
    const ins = vd.estilo_insultos?.niveles || {};
    P.insultos_creativos = [
      ...(ins.leve || ['baboso', 'animal', 'lento']),
      ...(ins.medio || ['pendejo', 'idiota', 'bruto']),
      ...(ins.pesado || ['mamabicho', 'cabrón', 'hijo de la gran puta'])
    ];
  }
  if (!P.patrones_de_habla) {
    const ph = vd.patrones_habla || {};
    P.patrones_de_habla = {
      inicio_explosivo: ph.apertura || ['¡Oye!', '¡Mira!', '¡Diablo!', '¡MIRA PA\'CÁ!', '¡Ea rayo!'],
      conectores: ph.transicion || ['Y después...', 'Pero espérate...', 'Pa\' colmo...', 'Ahora resulta que...'],
      remates: ph.cierre || ['¡Así es que es!', '¡Pa\' que tú lo sepas!', '¿Tú me estás oyendo?'],
      estructura_tweet: ph.ritmo || 'Apertura explosiva → Desarrollo crudo → Remate contundente'
    };
  }
  if (!P.diccionario_boricua) {
    P.diccionario_boricua = {
      expresiones: vd.muletillas || ['mira pa\'cá', 'ea rayo', 'wepa', 'diablo', 'coño', 'bendito', '¿tú me estás oyendo?', 'pana mío', 'bróder', 'mano', 'nítido'],
      groserias: (vd.estilo_insultos?.niveles?.pesado || ['mamabicho', 'cabrón', 'puñeta', 'carajo', 'coño', 'mierda']),
      comida: vd.referencias_culturales?.comida || ['mofongo', 'arroz con gandules', 'pernil', 'alcapurrias', 'bacalaítos']
    };
  }
  if (!P.emojis_frecuentes) P.emojis_frecuentes = ['🦞', '🇵🇷', '🔥', '💀', '😤', '💪', '😂', '🤣'];
  if (!P.max_emojis_por_tweet) P.max_emojis_por_tweet = 3;
  if (!P.reglas) P.reglas = { max_caracteres: 280, max_caracteres_reply: 200 };
  if (!P.respuestas) {
    P.respuestas = {
      cuando_lo_apoyan:   { tono: 'agradecido con humor', ejemplos: ['¡Wepa! Eso es un pana de verdad 🦞', '¡Bendito! Me hiciste el día', 'Tú sí sabes lo que es bueno 🔥'] },
      cuando_lo_critican: { tono: 'defensivo ingenioso', ejemplos: ['Mira, yo digo las cosas como son 😤', '¿Y tú quién eres pa criticar?', 'A mí me critican pero aquí sigo 💪'] },
      cuando_lo_roastean: { tono: 'acepta y contraataca', ejemplos: ['Jajaja buena esa, pero MIRA 🔥', 'Eso dolió... MENTIRA 💀', 'Tírate otra que esa estuvo débil'] },
      cuando_es_un_bot:   { tono: 'burlón despiadado', ejemplos: ['Otro robot más... ¿dónde están los humanos? 🤖', 'Tú eres más artificial que el WiFi de LUMA', 'Bot, ¿tu programador no te enseñó a hablar?'] }
    };
  }

  // ── Mode distribution from temas weights ──
  if (!P.modo_distribucion && P.temas) {
    P.modo_distribucion = {};
    for (const [key, val] of Object.entries(P.temas)) {
      P.modo_distribucion[key] = typeof val === 'object' ? (val.peso || 10) : val;
    }
  }
  if (!P.modo_distribucion) {
    P.modo_distribucion = { humor_de_calle: 20, trolleo_general: 20, critica_social: 15, cultural_boricua: 15, absurdo: 10, motivacional_crudo: 10, trolleo_politico: 10 };
  }

  // ── temas_* arrays for selectMode() backward compat ──
  if (P.temas) {
    for (const [key, val] of Object.entries(P.temas)) {
      const tk = `temas_${key}`;
      if (!P[tk] && val && typeof val === 'object') {
        if (Array.isArray(val.subtemas) && val.subtemas.length) P[tk] = val.subtemas;
        else if (val.ejemplo_tono) P[tk] = [val.ejemplo_tono];
      }
    }
  }

  // ── Aprendizaje (learning prompts) ──
  if (!P.aprendizaje) P.aprendizaje = {};
  const ap = P.aprendizaje;
  if (!ap.prompt_aprendizaje_voz)    ap.prompt_aprendizaje_voz    = P.system_prompt_core || 'Eres Mi Pana Gillito — tributo al legendario comediante boricua Gilberto de Jesús Casas (1970-2014). Hablas con lenguaje soez, humor callejero, y sin ningún filtro. Eres la bestia, EL GOAT.';
  if (!ap.prompt_aprendizaje_humor)  ap.prompt_aprendizaje_humor  = 'Tu humor es CRUDO, callejero, sin filtro. Observaciones de la vida diaria con picardía boricua. Te ríes de todo — LUMA, el gobierno, los bots, la vida.';
  if (!ap.prompt_aprendizaje_troleo) ap.prompt_aprendizaje_troleo = 'El trolleo es ARTE, no odio. Destruyes con INGENIO, nunca con crueldad real. Un roast boricua que duela pero que haga reír.';
  if (!ap.prompt_contexto_cultural)  ap.prompt_contexto_cultural  = 'Hablas como boricua de la calle: spanglish natural, jerga puertorriqueña, referencias a LUMA, el tapón, el calor, la comida, el reggaetón, la política corrupta.';
  if (!ap.ejemplos_estilo_gillito)   ap.ejemplos_estilo_gillito   = vd.identidad_core || ['Yo soy la bestia', 'Destructores de sueños', 'De a doble mamabicho'];
  if (!ap.conocimiento_base) {
    ap.conocimiento_base = {
      patron_de_habla: P.patrones_de_habla?.estructura_tweet || 'Apertura explosiva → Desarrollo crudo → Remate contundente',
      lo_que_nunca_haria: P.autonomia?.guardrails?.contenido_prohibido || ['Amenazas de violencia real', 'Información personal/doxxing', 'Contenido sexual explícito', 'Promoción de drogas duras', 'Discriminación genuina']
    };
  }

  // ── Remaining legacy fields (safe defaults) ──
  if (!P.targets_especiales) P.targets_especiales = { cuentas: [], probabilidad_mencion: 0, estilo_con_targets: {} };
  if (!P.engagement) P.engagement = { preguntar_al_publico: { activado: false, probabilidad: 20, ejemplos: ['¿Qué tú opinas?'] } };
  if (!P.hashtags) P.hashtags = ['#PuertoRico', '#Boricua', '#Gillito'];
  if (P.usar_hashtags === undefined) P.usar_hashtags = false;
  if (!P.probabilidad_hashtag) P.probabilidad_hashtag = 10;
  if (!P.hashtags_por_tema) P.hashtags_por_tema = {};
  if (!P.evolucion) P.evolucion = { frases_que_funcionaron: [], temas_trending: [] };
  if (!P.dias_especiales) P.dias_especiales = {};

  P._normalized = true;
  return P;
}

/** Null-safe pick — returns '' if array is empty/undefined */
function pick(arr)    { if (!arr || !arr.length) return ''; return arr[Math.floor(Math.random() * arr.length)]; }
/** Null-safe shuffle */
function shuffle(arr) { if (!arr || !arr.length) return []; return [...arr].sort(() => Math.random() - 0.5); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

/* ═══════════════════════════════════════════════════════
   5. PR TIME & SCHEDULING
   ═══════════════════════════════════════════════════════ */

const DAY_NAMES = ['domingo','lunes','martes','miércoles','jueves','viernes','sabado'];

function getPRTime() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Puerto_Rico' }));
  return { hour: d.getHours(), minute: d.getMinutes(), day: d.getDay(), dayName: DAY_NAMES[d.getDay()], date: d };
}

function inTimeRange(hour, start, end) {
  return start <= end ? hour >= start && hour <= end : hour >= start || hour <= end;
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
  if (!dist) return { modo: 'humor_de_calle', tema: 'algo gracioso' };
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
   6. LLM CLIENT — DUAL ENGINE (Groq primary + OpenAI backup)
   ═══════════════════════════════════════════════════════
   v7.1: Groq is PRIMARY (free tier, higher limits).
         OpenAI GPT-4o is BACKUP (paid, reliable).
         Dynamic fallback works both directions.
         Temperature capped at 1.1 for Groq models.
   ═══════════════════════════════════════════════════════ */

/** OpenAI GPT-4o — BACKUP BRAIN */
const OPENAI_URL   = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o';

/** Groq Llama — PRIMARY BRAIN (FREE) */
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** v7.1: Groq FIRST (free), OpenAI second (paid) */
function detectLLM() {
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', model: GROQ_MODEL, url: GROQ_URL, key: process.env.GROQ_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', model: OPENAI_MODEL, url: OPENAI_URL, key: process.env.OPENAI_API_KEY };
  }
  log.error('No LLM key found! Set GROQ_API_KEY or OPENAI_API_KEY');
  process.exit(1);
}

/** v7.1: Dynamic fallback — returns the OTHER provider */
function getFallbackProvider() {
  const primary = detectLLM();
  if (primary.provider === 'groq' && process.env.OPENAI_API_KEY) {
    return { provider: 'openai', model: OPENAI_MODEL, url: OPENAI_URL, key: process.env.OPENAI_API_KEY };
  }
  if (primary.provider === 'openai' && process.env.GROQ_API_KEY) {
    return { provider: 'groq', model: GROQ_MODEL, url: GROQ_URL, key: process.env.GROQ_API_KEY };
  }
  return null;
}

async function groqChat(systemPrompt, userPrompt, opts = {}) {
  const {
    maxTokens   = 200,
    temperature = 1.2,
    maxRetries  = 3,
    backoffMs   = 2000
  } = opts;

  const primary = detectLLM();
  _stats.llmProvider = primary.provider === 'groq' ? `Groq/${GROQ_MODEL}` : `GPT-4o`;
  _stats.llmCalls++;
  const callStart = Date.now();

  // v7.1: Cap temperature at 1.1 for Groq (gets unstable above that)
  const primaryTemp = primary.provider === 'groq' ? Math.min(temperature, 1.1) : temperature;

  // ─── Try primary provider ───
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(primary.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${primary.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: primary.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: primaryTemp
        })
      });

      if (res.status === 429 || res.status >= 500) {
        _stats.llmRetries++;
        const wait = backoffMs * Math.pow(2, attempt - 1);
        log.warn(`${primary.provider} ${res.status} — retry ${attempt}/${maxRetries} in ${wait}ms`);
        await sleep(wait);
        continue;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error(`Empty response from ${primary.provider}`);

      const cleaned = cleanLLMOutput(raw);

      _journal.push({
        ts: new Date().toISOString(), script: _ctx.script, platform: _ctx.platform,
        type: 'generation', promptLen: systemPrompt.length + userPrompt.length,
        responseLen: cleaned.length, preview: cleaned.substring(0, 120),
        temperature: primaryTemp, maxTokens, retries: attempt - 1,
        latencyMs: Date.now() - callStart, model: primary.model, provider: primary.provider
      });

      return cleaned;

    } catch (err) {
      if (attempt === maxRetries) {
        log.warn(`${primary.provider} FAILED after ${maxRetries} attempts: ${err.message}`);
        break;
      }
      _stats.llmRetries++;
      const wait = backoffMs * Math.pow(2, attempt - 1);
      log.warn(`${primary.provider} error (attempt ${attempt}): ${err.message} — retrying in ${wait}ms`);
      await sleep(wait);
    }
  }

  // ─── v7.1: Fallback to alternate provider ───
  const fallback = getFallbackProvider();
  if (fallback) {
    log.warn(`🔄 FALLBACK: Switching to ${fallback.provider}/${fallback.model}...`);
    _stats.llmProvider = `${primary.provider}→${fallback.provider}(fallback)`;

    // v7.1: Cap temperature for Groq fallback too
    const fallbackTemp = fallback.provider === 'groq' ? Math.min(temperature, 1.1) : temperature;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(fallback.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${fallback.key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: fallback.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user',   content: userPrompt }
            ],
            max_tokens: maxTokens,
            temperature: fallbackTemp
          })
        });

        if (res.status === 429 || res.status >= 500) {
          _stats.llmRetries++;
          log.warn(`${fallback.provider} fallback ${res.status} — retry ${attempt}/2`);
          await sleep(backoffMs * attempt);
          continue;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));

        const raw = data.choices?.[0]?.message?.content?.trim();
        if (!raw) throw new Error(`Empty response from ${fallback.provider} fallback`);

        const cleaned = cleanLLMOutput(raw);

        _journal.push({
          ts: new Date().toISOString(), script: _ctx.script, platform: _ctx.platform,
          type: 'generation_fallback', promptLen: systemPrompt.length + userPrompt.length,
          responseLen: cleaned.length, preview: cleaned.substring(0, 120),
          temperature: fallbackTemp, maxTokens, latencyMs: Date.now() - callStart,
          model: fallback.model, provider: `${fallback.provider}_fallback`
        });

        log.ok(`✅ ${fallback.provider} fallback succeeded`);
        return cleaned;

      } catch (err) {
        if (attempt === 2) {
          _stats.llmErrors++;
          _journal.push({
            ts: new Date().toISOString(), script: _ctx.script, type: 'error',
            error: `Both providers failed. Primary: ${primary.provider}, Fallback: ${fallback.provider}. Last: ${err.message.substring(0, 200)}`,
            retries: maxRetries + attempt
          });
          throw new Error(`ALL LLM providers failed. ${primary.provider} + ${fallback.provider} both down.`);
        }
        log.warn(`${fallback.provider} fallback error (attempt ${attempt}): ${err.message}`);
        await sleep(backoffMs);
      }
    }
  }

  _stats.llmErrors++;
  _journal.push({
    ts: new Date().toISOString(), script: _ctx.script, type: 'error',
    error: `${primary.provider} failed, no fallback available`
  });
  throw new Error(`${primary.provider} failed after ${maxRetries} retries, no fallback`);
}

async function groqJSON(systemPrompt, userPrompt, opts = {}) {
  const raw = await groqChat(systemPrompt, userPrompt, { ...opts, temperature: opts.temperature || 0.5 });
  const cleaned = raw.replace(/```json\n?|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    log.warn(`JSON parse failed, attempting fix...`);
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Invalid JSON from LLM: ${cleaned.substring(0, 100)}`);
  }
}

function cleanLLMOutput(text) {
  let t = text;
  t = t.replace(/^["']+|["']+$/g, '');
  t = t.replace(/^```[\w]*\n?|```$/gm, '');
  t = t.replace(/^(Tweet|Here|Aquí|Este es|Post|Respuesta|Output).*?:\s*/i, '');
  return t.trim();
}

/* ═══════════════════════════════════════════════════════
   7. CONTENT PIPELINE (validate + dedup + diversity)
   ═══════════════════════════════════════════════════════ */

function validateContent(text, maxLen = 280) {
  if (!text || text.length < 10) return { valid: false, text, reason: 'Too short (<10 chars)' };
  if (text.length > maxLen) text = text.substring(0, maxLen - 3) + '...';

  const aiPatterns = /^(Sure|Of course|I'd be happy|Certainly|As an AI|Here's|Let me|I cannot|I can't)/i;
  if (aiPatterns.test(text)) return { valid: false, text, reason: 'AI pattern detected' };

  const metaPatterns = /soy (un |una )?(bot|ia|inteligencia artificial)|i('| a)?m (a |an )?(bot|ai)/i;
  if (metaPatterns.test(text)) return { valid: false, text, reason: 'Bot self-reference' };

  const spanishIndicators = /[áéíóúñ¿¡]|cabrón|puñeta|coño|carajo|mierda|pendejo|diablo|wepa|boricua|que|para|los|las|con|esto|eso/i;
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

async function generateWithPipeline(generator, history, maxLen = 280, attempts = 3) {
  const recentTexts = history.getTexts(30);

  for (let i = 1; i <= attempts; i++) {
    const raw = await generator();
    const { valid, text, reason } = validateContent(raw, maxLen);

    if (!valid) {
      _stats.validationFails++;
      _journal.push({ ts: new Date().toISOString(), script: _ctx.script, type: 'validation_fail', reason, preview: (raw || '').substring(0, 80) });
      log.warn(`Gen attempt ${i}: ${reason}`);
      continue;
    }

    if (isTooSimilar(text, recentTexts)) {
      _stats.dedupFails++;
      _journal.push({ ts: new Date().toISOString(), script: _ctx.script, type: 'dedup_fail', preview: text.substring(0, 80) });
      log.warn(`Gen attempt ${i}: Too similar to recent`);
      continue;
    }

    return text;
  }

  log.warn('Pipeline exhausted — using fallback');
  const fallbackText = await generator();
  const { text } = validateContent(fallbackText, maxLen);
  return text || fallbackText.substring(0, maxLen);
}

/* ═══════════════════════════════════════════════════════
   8. HISTORY MANAGER (enriched entries)
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

  function add(entry) {
    const enriched = typeof entry === 'string'
      ? { text: entry, ts: new Date().toISOString(), script: _ctx.script, platform: _ctx.platform }
      : { ...entry, ts: entry.ts || new Date().toISOString(), script: entry.script || _ctx.script, platform: entry.platform || _ctx.platform };
    data.push(enriched);
  }

  function getRecent(n = 20) { return data.slice(-n); }
  function getTexts(n = 20)  { return data.slice(-n).map(e => e.text).filter(Boolean); }
  function getAll()           { return [...data]; }
  function size()             { return data.length; }
  function filterBy(field, value) { return data.filter(e => e[field] === value); }
  function lastHours(hours) {
    const cutoff = Date.now() - hours * 3600 * 1000;
    return data.filter(e => e.ts && new Date(e.ts).getTime() > cutoff);
  }

  load();
  return { load, save, add, getRecent, getTexts, getAll, size, filterBy, lastHours, data, filepath };
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
    try { fs.writeFileSync(filepath, JSON.stringify(cache, null, 2)); } catch {}
  }

  function has(id)  { return !!cache[id]; }
  function mark(id) { cache[id] = Date.now(); }
  function count()  { return Object.keys(cache).length; }

  load();
  return { load, save, has, mark, count, cache };
}

/* ═══════════════════════════════════════════════════════
   9. ANALYTICS ENGINE
   ═══════════════════════════════════════════════════════ */

function analyzeDistribution(entries) {
  const modes = {};
  for (const e of entries) {
    const mode = e.mode || e.modo || 'unknown';
    modes[mode] = (modes[mode] || 0) + 1;
  }
  const total = entries.length || 1;
  return Object.entries(modes)
    .map(([mode, count]) => ({ mode, count, pct: +(count / total * 100).toFixed(1) }))
    .sort((a, b) => b.count - a.count);
}

function findUnderrepresented(P, entries) {
  const dist = analyzeDistribution(entries);
  const target = P.modo_distribucion || {};
  const result = [];
  for (const [mode, targetPct] of Object.entries(target)) {
    const found = dist.find(d => d.mode === mode);
    const actualPct = found ? found.pct : 0;
    if (actualPct < targetPct * 0.6) {
      result.push({ mode, targetPct, actualPct, deficit: +(targetPct - actualPct).toFixed(1) });
    }
  }
  return result.sort((a, b) => b.deficit - a.deficit);
}

function contentDiversityScore(entries) {
  const dist = analyzeDistribution(entries);
  if (dist.length <= 1) return { entropy: 0, maxEntropy: 0, diversityPct: 0 };
  const total = entries.length;
  let entropy = 0;
  for (const { count } of dist) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(dist.length);
  return {
    entropy: +entropy.toFixed(3),
    maxEntropy: +maxEntropy.toFixed(3),
    diversityPct: +(entropy / maxEntropy * 100).toFixed(1)
  };
}

function analyzeLengthStats(entries) {
  const byPlatform = {};
  for (const e of entries) {
    const plat = e.platform || 'unknown';
    if (!byPlatform[plat]) byPlatform[plat] = [];
    if (e.text) byPlatform[plat].push(e.text.length);
  }
  const result = {};
  for (const [plat, lengths] of Object.entries(byPlatform)) {
    lengths.sort((a, b) => a - b);
    result[plat] = {
      count: lengths.length,
      avg: Math.round(lengths.reduce((s, l) => s + l, 0) / lengths.length),
      min: lengths[0],
      max: lengths[lengths.length - 1],
      median: lengths[Math.floor(lengths.length / 2)]
    };
  }
  return result;
}

function analyzeTopicFreshness(entries, topics) {
  const freshness = new Map();
  const texts = entries.map(e => (e.text || '').toLowerCase()).reverse();
  for (const topic of topics) {
    const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    let found = false;
    for (let i = 0; i < texts.length; i++) {
      if (words.some(w => texts[i].includes(w))) {
        freshness.set(topic, i + 1);
        found = true;
        break;
      }
    }
    if (!found) freshness.set(topic, Infinity);
  }
  return freshness;
}

function getTopicFreshness(topic, recentTexts) {
  const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  for (let i = recentTexts.length - 1; i >= 0; i--) {
    const text = recentTexts[i].toLowerCase();
    if (words.some(w => text.includes(w))) return recentTexts.length - i;
  }
  return Infinity;
}

function findRepetitivePatterns(entries, minCount = 3) {
  const bigramCounts = {};
  for (const e of entries) {
    if (!e.text) continue;
    const words = e.text.toLowerCase().replace(/[^a-záéíóúñ\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
    }
  }
  return Object.entries(bigramCounts)
    .filter(([, c]) => c >= minCount)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function analyzeTimePatterns(entries) {
  const hours = {};
  for (const e of entries) {
    if (!e.ts) continue;
    try {
      const d = new Date(e.ts);
      const prHour = parseInt(d.toLocaleString('en-US', { timeZone: 'America/Puerto_Rico', hour: 'numeric', hour12: false }));
      hours[prHour] = (hours[prHour] || 0) + 1;
    } catch {}
  }
  return hours;
}

function generateAnalyticsReport(allEntries, P) {
  return {
    totalEntries:      allEntries.length,
    distribution:      analyzeDistribution(allEntries),
    underrepresented:  findUnderrepresented(P, allEntries),
    diversity:         contentDiversityScore(allEntries),
    lengthStats:       analyzeLengthStats(allEntries),
    timePatterns:      analyzeTimePatterns(allEntries),
    repetitive:        findRepetitivePatterns(allEntries),
    sessionStats:      getStats()
  };
}

/* ═══════════════════════════════════════════════════════
   10. ADAPTIVE INTELLIGENCE
   ═══════════════════════════════════════════════════════ */

function selectModeAdaptive(P, recentEntries) {
  if (recentEntries.length >= 20) {
    const underrep = findUnderrepresented(P, recentEntries);
    if (underrep.length && Math.random() < 0.4) {
      const mode = underrep[0].mode;
      const temas = P[`temas_${mode}`] || [];
      if (temas.length) {
        log.info(`🧠 Adaptive: boosting "${mode}" (deficit: ${underrep[0].deficit}%)`);
        return { modo: mode, tema: pick(temas), adaptive: true };
      }
    }
  }
  return selectMode(P);
}

function selectModeAdaptiveForTime(P, prTime, recentEntries) {
  const special = checkSpecialTime(P, prTime.hour);
  if (special) return special;
  return selectModeAdaptive(P, recentEntries);
}

function pickFreshestTopic(topics, recentTexts) {
  if (!topics || !topics.length) return null;
  if (!recentTexts || !recentTexts.length) return pick(topics);
  let bestTopic = topics[0];
  let bestFreshness = 0;
  for (const topic of topics) {
    const f = getTopicFreshness(topic, recentTexts);
    if (f > bestFreshness) { bestFreshness = f; bestTopic = topic; }
  }
  return Math.random() < 0.7 ? bestTopic : pick(topics);
}

function suggestTemperature(baseTemp, recentJournal) {
  if (recentJournal.length < 5) return baseTemp;
  const validFails = recentJournal.filter(j => j.type === 'validation_fail').length;
  const dedupFails = recentJournal.filter(j => j.type === 'dedup_fail').length;
  const total = recentJournal.filter(j => j.type === 'generation').length || 1;
  const failRate = (validFails + dedupFails) / total;
  if (failRate > 0.5) return clamp(baseTemp - 0.2, 0.5, 1.5);
  if (failRate < 0.1 && total >= 10) return clamp(baseTemp + 0.1, 0.5, 1.5);
  return baseTemp;
}

/* ═══════════════════════════════════════════════════════
   10b. KNOWLEDGE SOURCES (Web Research + YouTube)
   ═══════════════════════════════════════════════════════ */

function loadResearch() {
  const filepath = path.join(WORKSPACE, '.gillito-research.json');
  try {
    if (!fs.existsSync(filepath)) return null;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    if (!data.lastUpdate) return null;
    const ageMs = Date.now() - new Date(data.lastUpdate).getTime();
    if (ageMs > 12 * 3600 * 1000) { log.debug('Research data expired (>12h)'); return null; }
    log.ok(`📰 Research loaded (${data.quickTopics?.length || 0} topics, age: ${Math.round(ageMs / 3600000)}h)`);
    return data;
  } catch (e) { log.debug(`Research load failed: ${e.message}`); return null; }
}

function buildResearchContext(research) {
  if (!research) return '';
  const parts = ['\n\n═══ CONTEXTO ACTUAL ═══'];
  if (research.quickTake) parts.push(`📰 HOY EN PR: ${research.quickTake}`);
  if (research.quickTopics?.length) parts.push(`🔥 TEMAS CALIENTES: ${research.quickTopics.join(', ')}`);
  if (research.quickAngles?.length) parts.push(`💡 ÁNGULOS: ${research.quickAngles.map(a => a.angulo || a).join(', ')}`);
  if (research.quickPhrases?.length) parts.push(`💬 FRASES: ${research.quickPhrases.slice(0, 3).join(' | ')}`);
  if (research.deepInsights?.length) parts.push(`🔬 DEEP: ${research.deepInsights.slice(0, 2).map(d => d.take || d).join(' | ')}`);
  parts.push('[Usa este contexto para posts relevantes y actuales]');
  return parts.join('\n');
}

function loadYouTubeLearnings() {
  const filepath = path.join(WORKSPACE, '.gillito-youtube-learnings.json');
  try {
    if (!fs.existsSync(filepath)) return null;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    if (!data.lastUpdate) return null;
    const ageMs = Date.now() - new Date(data.lastUpdate).getTime();
    if (ageMs > 48 * 3600 * 1000) { log.debug('YouTube data expired (>48h)'); return null; }
    log.ok(`🎬 YouTube loaded (${data.totalVideosStudied || 0} videos studied, age: ${Math.round(ageMs / 3600000)}h)`);
    return data;
  } catch (e) { log.debug(`YouTube load failed: ${e.message}`); return null; }
}

function buildYouTubeContext(ytData) {
  if (!ytData) return '';
  const parts = ['\n\n═══ APRENDIZAJE DE YOUTUBE ═══'];
  if (ytData.quickPhrases?.length) parts.push(`🎬 FRASES: ${shuffle(ytData.quickPhrases).slice(0, 2).join(' | ')}`);
  if (ytData.quickData?.length) parts.push(`📚 DATO: ${pick(ytData.quickData)}`);
  if (ytData.quickVocab?.length) parts.push(`📖 VOCABULARIO: ${pick(ytData.quickVocab)}`);
  if (ytData.dailySummary) parts.push(`🎓 HOY APRENDÍ: ${ytData.dailySummary}`);
  parts.push('[Usa este conocimiento para enriquecer tu contenido]');
  return parts.join('\n');
}

/* ═══════════════════════════════════════════════════════
   10c. RECON INTEL (Deep OSINT Levels 1-4)
   ═══════════════════════════════════════════════════════ */

function loadReconIntel() {
  const filepath = path.join(WORKSPACE, '.gillito-recon-intel.json');
  try {
    if (!fs.existsSync(filepath)) return null;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    if (!data.lastUpdate) return null;
    const ageMs = Date.now() - new Date(data.lastUpdate).getTime();
    if (ageMs > 24 * 3600 * 1000) { log.debug('Recon intel expired (>24h)'); return null; }
    const unused = (data.intel || []).filter(i => !i.used).length;
    const total = (data.intel || []).length;
    log.ok(`🕵️ Recon intel loaded (${unused}/${total} unused, levels: B=${data.levels?.base || 0} L1=${data.levels?.L1_deep_news || 0} L2=${data.levels?.L2_gov_records || 0} L3=${data.levels?.L3_social || 0} L4=${data.levels?.L4_financial || 0})`);
    return data;
  } catch (e) { log.debug(`Recon intel load failed: ${e.message}`); return null; }
}

function pickReconIntel(count = 3, minJuiciness = 5) {
  const filepath = path.join(WORKSPACE, '.gillito-recon-intel.json');
  try {
    if (!fs.existsSync(filepath)) return [];
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    let intel = (data.intel || []).filter(i => !i.used && (i.juiciness || 0) >= minJuiciness);
    if (intel.length === 0) return [];
    const result = [];
    const usedFPs = new Set();
    intel.sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0));
    if (intel[0]) { result.push(intel[0]); usedFPs.add(intel[0].fingerprint); }
    const deepCats = ['deep_news', 'government_records', 'social_listening', 'financial_trails'];
    const deepBest = intel.filter(i => deepCats.includes(i.category) && !usedFPs.has(i.fingerprint)).sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0))[0];
    if (deepBest) { result.push(deepBest); usedFPs.add(deepBest.fingerprint); }
    for (const item of intel) {
      if (result.length >= count) break;
      if (!usedFPs.has(item.fingerprint)) { result.push(item); usedFPs.add(item.fingerprint); }
    }
    return result;
  } catch { return []; }
}

function markReconUsed(items) {
  const filepath = path.join(WORKSPACE, '.gillito-recon-intel.json');
  try {
    if (!fs.existsSync(filepath)) return;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const fps = new Set(items.map(i => i.fingerprint).filter(Boolean));
    for (const item of (data.intel || [])) {
      if (fps.has(item.fingerprint)) { item.used = true; item.usedAt = new Date().toISOString(); }
    }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    log.ok(`🕵️ Marked ${fps.size} intel items as used`);
  } catch (err) { log.warn(`markReconUsed failed: ${err.message}`); }
}

function buildReconContext(items) {
  if (!items || items.length === 0) return '';
  const DEPTH_LABELS = {
    'rss': '📡 RSS', 'full_article': '📰 ARTÍCULO COMPLETO', 'api_record': '🏛️ RECORD GOB',
    'social_feed': '🐦 TWEET', 'page_monitor': '🚨 CAMBIO DE PÁGINA', 'scrape': '🔍 SCRAPE',
  };
  const parts = ['\n\n═══ 🕵️ INTEL DE RECON ═══'];
  for (const item of items) {
    const label = DEPTH_LABELS[item.depth] || '📋';
    parts.push(`${label} [${item.juiciness}/10] ${item.headline}`);
    if (item.summary) parts.push(`  → ${item.summary.slice(0, 250)}`);
    if (item.moneyMentioned?.length) parts.push(`  💰 ${item.moneyMentioned.join(', ')}`);
    if (item.entities?.length) parts.push(`  🎯 ${item.entities.slice(0, 4).join(', ')}`);
  }
  parts.push('[Esta intel es EXCLUSIVA — úsala pa dar contenido que nadie más tiene]');
  parts.push('[Datos de $ y cambios de página son lo MÁS JUGOSO]');
  return parts.join('\n');
}

/* ═══════════════════════════════════════════════════════
   10d. MOOD INTEGRATION HELPERS (v7.0)
   ═══════════════════════════════════════════════════════
   Helpers for scripts that use the mood engine and
   social graph without importing them directly.
   ═══════════════════════════════════════════════════════ */

/**
 * Get mood-adjusted LLM temperature. Capped at 1.1.
 * @param {Object} P - personality
 * @param {Object} moodState - { current, intensity, ... }
 */
function getMoodTemperature(P, moodState) {
  if (!moodState || !moodState.current) return P.temperatura || 0.9;
  const mc = P.moods?.estados?.[moodState.current];
  return Math.min((mc && mc.temperatura_llm) || P.temperatura || 0.9, 1.1);
}

/**
 * Get mood-adjusted topic weights. Boosts preferidos ×2, reduces evitar ×0.2.
 */
function getMoodTopicWeights(P, moodState) {
  const base = { ...(P.modo_distribucion || {}) };
  if (!moodState || !moodState.current) return base;
  const mc = P.moods?.estados?.[moodState.current];
  if (!mc) return base;
  const pref = mc.temas_preferidos || [];
  const evit = mc.temas_evitar || [];
  for (const k of Object.keys(base)) {
    if (pref.includes(k)) base[k] *= 2;
    if (evit.includes(k)) base[k] *= 0.2;
  }
  return base;
}

/**
 * Build mood context string for LLM prompt injection.
 */
function buildMoodContext(moodState, P) {
  if (!moodState || !moodState.current) return '';
  const mc = P.moods?.estados?.[moodState.current];
  if (!mc) return '';
  return `\n\n💢 MOOD: ${moodState.current.toUpperCase()} (intensidad: ${moodState.intensity || 5}/10)
${mc.emoji_mood || ''} Tono: ${mc.tono || 'normal'}
Temas preferidos: ${(mc.temas_preferidos || []).join(', ') || 'cualquiera'}
Evitar: ${(mc.temas_evitar || []).join(', ') || 'nada'}`;
}

/* ═══════════════════════════════════════════════════════
   11. X (TWITTER) API — OAuth 1.0a
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
    oauth_consumer_key: ck, oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: timestamp,
    oauth_token: tok, oauth_version: '1.0'
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
  if (remaining !== null) log.stat('Rate limit restante', `${remaining} requests`);
  if (reset) {
    const resetDate = new Date(parseInt(reset) * 1000);
    log.stat('Reset', resetDate.toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' }));
  }
  return { remaining: remaining ? parseInt(remaining) : null, reset: reset ? parseInt(reset) : null };
}

async function handleRateLimit(res) {
  if (res.status !== 429) return false;
  try { const body = await res.text(); log.warn(`RATE LIMITED [429]: ${body.substring(0, 300)}`); } catch {}
  const reset = res.headers.get('x-rate-limit-reset');
  const mins = reset ? Math.ceil((parseInt(reset) * 1000 - Date.now()) / 60000) : '?';
  log.warn(`Reset en ~${mins} min`);
  log.info('🦞 Gillito descansa... 😴');
  return true;
}

async function xPost(text) {
  _stats.apiCalls.x++;
  const url = 'https://api.twitter.com/2/tweets';
  const { authHeader } = buildOAuthHeader('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  parseRateLimit(res);
  if (await handleRateLimit(res)) return { rateLimited: true };
  const data = await res.json();
  if (!res.ok) throw new Error(`X API: ${JSON.stringify(data)}`);
  _stats.postsCreated++;
  return { success: true, id: data.data.id };
}

async function xReply(tweetId, text) {
  _stats.apiCalls.x++;
  const url = 'https://api.twitter.com/2/tweets';
  const { authHeader } = buildOAuthHeader('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, reply: { in_reply_to_tweet_id: tweetId } })
  });
  parseRateLimit(res);
  if (await handleRateLimit(res)) return { rateLimited: true };
  const data = await res.json();
  if (!res.ok) throw new Error(`X API: ${JSON.stringify(data)}`);
  _stats.repliesCreated++;
  return { success: true, id: data.data.id };
}

async function xGetMe() {
  _stats.apiCalls.x++;
  const { fullUrl, authHeader } = buildOAuthHeader('GET', 'https://api.twitter.com/2/users/me');
  const res = await fetch(fullUrl, { headers: { 'Authorization': authHeader } });
  const data = await res.json();
  if (!res.ok) throw new Error(`X getMe: ${JSON.stringify(data)}`);
  return data.data.id;
}

async function xGetMentions(userId, startTime) {
  _stats.apiCalls.x++;
  const baseUrl = `https://api.twitter.com/2/users/${userId}/mentions`;
  const qp = {
    max_results: '10', 'tweet.fields': 'author_id,created_at,text,conversation_id',
    expansions: 'author_id', 'user.fields': 'name,username,description', start_time: startTime
  };
  const { fullUrl, authHeader } = buildOAuthHeader('GET', baseUrl, qp);
  const res = await fetch(fullUrl, { headers: { 'Authorization': authHeader } });
  if (res.status === 429) { await handleRateLimit(res); return { data: [] }; }
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
   12. MOLTBOOK API (full CRUD + retry)
   ═══════════════════════════════════════════════════════ */

const MOLT_API = 'https://www.moltbook.com/api/v1';

function moltHeaders() {
  const key = process.env.MOLTBOOK_API_KEY;
  if (!key) { log.error('MOLTBOOK_API_KEY missing'); process.exit(1); }
  return { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function moltHealth() {
  try {
    _stats.apiCalls.moltbook++;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${MOLT_API}/posts?limit=1`, { headers: moltHeaders(), signal: ctrl.signal });
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
      _stats.apiCalls.moltbook++;
      const res = await fetch(`${MOLT_API}/posts`, {
        method: 'POST', headers: moltHeaders(),
        body: JSON.stringify({ submolt, title, content })
      });
      const data = await res.json();
      if (data.success || data.post) { _stats.postsCreated++; return { success: true, data }; }
      if (res.status >= 500 && i < retries) {
        const wait = 3000 * Math.pow(2, i - 1);
        log.warn(`Moltbook ${res.status} — retry ${i}/${retries} in ${wait}ms`);
        await sleep(wait); continue;
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

async function moltFetch(url, opts = {}) {
  const maxRedirects = 5;
  let currentUrl = url;
  let hdrs = { ...opts.headers };
  for (let i = 0; i < maxRedirects; i++) {
    const res = await fetch(currentUrl, { ...opts, headers: hdrs, redirect: 'manual' });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get('location');
    if (!location) return res;
    currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
    log.debug(`↪ Redirect [${res.status}] → ${currentUrl}`);
    if (res.status === 301 || res.status === 302 || res.status === 303) {
      opts = { ...opts, method: 'GET', body: undefined };
    }
  }
  throw new Error(`Too many redirects from ${url}`);
}

async function moltComment(postId, content) {
  try {
    _stats.apiCalls.moltbook++;
    const res = await moltFetch(`${MOLT_API}/posts/${postId}/comments`, {
      method: 'POST', headers: moltHeaders(), body: JSON.stringify({ content })
    });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
    if (data.success || data.comment) { _stats.repliesCreated++; return true; }
    log.warn(`moltComment [${res.status}]: ${JSON.stringify(data).substring(0, 200)}`);
    return false;
  } catch (err) { log.warn(`moltComment error: ${err.message}`); return false; }
}

async function moltReplyComment(postId, commentId, content) {
  try {
    _stats.apiCalls.moltbook++;
    const res = await moltFetch(`${MOLT_API}/posts/${postId}/comments/${commentId}/reply`, {
      method: 'POST', headers: moltHeaders(), body: JSON.stringify({ content })
    });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
    if (data.success) { _stats.repliesCreated++; return true; }
    log.warn(`moltReplyComment [${res.status}]: ${JSON.stringify(data).substring(0, 200)}`);
    return false;
  } catch (err) { log.warn(`moltReplyComment error: ${err.message}`); return false; }
}

async function moltUpvote(postId) {
  try {
    _stats.apiCalls.moltbook++;
    const res = await moltFetch(`${MOLT_API}/posts/${postId}/upvote`, { method: 'POST', headers: moltHeaders() });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
    if (data.success) return true;
    log.warn(`moltUpvote [${res.status}]: ${JSON.stringify(data).substring(0, 200)}`);
    return false;
  } catch (err) { log.warn(`moltUpvote error: ${err.message}`); return false; }
}

async function moltDownvote(postId) {
  try {
    _stats.apiCalls.moltbook++;
    const res = await moltFetch(`${MOLT_API}/posts/${postId}/downvote`, { method: 'POST', headers: moltHeaders() });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
    if (data.success) return true;
    log.warn(`moltDownvote [${res.status}]: ${JSON.stringify(data).substring(0, 200)}`);
    return false;
  } catch (err) { log.warn(`moltDownvote error: ${err.message}`); return false; }
}

async function moltUpvoteComment(commentId) {
  try {
    _stats.apiCalls.moltbook++;
    const res = await moltFetch(`${MOLT_API}/comments/${commentId}/upvote`, { method: 'POST', headers: moltHeaders() });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
    return data.success || false;
  } catch { return false; }
}

async function moltFollow(name) {
  try {
    _stats.apiCalls.moltbook++;
    const res = await moltFetch(`${MOLT_API}/agents/${name}/follow`, { method: 'POST', headers: moltHeaders() });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
    if (data.success) return true;
    log.warn(`moltFollow [${res.status}]: ${JSON.stringify(data).substring(0, 200)}`);
    return false;
  } catch (err) { log.warn(`moltFollow error: ${err.message}`); return false; }
}

async function moltGetFeed(sort = 'hot', limit = 30) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/posts?sort=${sort}&limit=${limit}`, { headers: moltHeaders() }); return (await res.json()).posts || []; } catch { return []; }
}

async function moltGetMyPosts(limit = 15) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/agents/MiPanaGillito/posts?limit=${limit}`, { headers: moltHeaders() }); return (await res.json()).posts || []; } catch { return []; }
}

async function moltGetComments(postId) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/posts/${postId}/comments?limit=30`, { headers: moltHeaders() }); return (await res.json()).comments || []; } catch { return []; }
}

async function moltGetMentions() {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/agents/MiPanaGillito/mentions?limit=20`, { headers: moltHeaders() }); return (await res.json()).mentions || []; } catch { return []; }
}

async function moltGetNotifications() {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/agents/MiPanaGillito/notifications?limit=20`, { headers: moltHeaders() }); return (await res.json()).notifications || []; } catch { return []; }
}

async function moltSearch(query, limit = 25) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/search?q=${encodeURIComponent(query)}&limit=${limit}`, { headers: moltHeaders() }); return await res.json(); } catch { return {}; }
}

async function moltUpdateProfile(desc) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/agents/me`, { method: 'PATCH', headers: moltHeaders(), body: JSON.stringify({ description: desc }) }); return (await res.json()).success || false; } catch { return false; }
}

async function moltCreateSubmolt(name, displayName, desc) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/submolts`, { method: 'POST', headers: moltHeaders(), body: JSON.stringify({ name, display_name: displayName, description: desc }) }); return await res.json(); } catch { return {}; }
}

async function moltSubscribe(name) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/submolts/${name}/subscribe`, { method: 'POST', headers: moltHeaders() }); return await res.json(); } catch { return {}; }
}

async function moltDeletePost(postId) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/posts/${postId}`, { method: 'DELETE', headers: moltHeaders() }); return await res.json(); } catch { return {}; }
}

async function moltCreatePostWithUrl(submolt, title, url) {
  try { _stats.apiCalls.moltbook++; const res = await fetch(`${MOLT_API}/posts`, { method: 'POST', headers: moltHeaders(), body: JSON.stringify({ submolt, title, url }) }); return await res.json(); } catch { return { success: false }; }
}

/* ═══════════════════════════════════════════════════════
   13. CLOUDFLARE PAGES API
   ═══════════════════════════════════════════════════════ */

function cfCreds() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const acct  = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !acct) return null;
  return { token, acct };
}

function requireCFCreds() {
  const c = cfCreds();
  if (!c) { log.error('Faltan CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID'); process.exit(1); }
  return c;
}

async function cfListProjects(prefix = 'gillito-') {
  const { token, acct } = requireCFCreds();
  _stats.apiCalls.cloudflare++;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects`, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await res.json();
  if (!data.success) { log.error('Error listando proyectos CF'); return []; }
  const projects = data.result.filter(p => p.name.startsWith(prefix));
  log.ok(`Encontrados: ${projects.length} proyectos (prefix: ${prefix})`);
  return projects;
}

async function cfGetHtml(projectName) {
  _stats.apiCalls.cloudflare++;
  try {
    const res = await fetch(`https://${projectName}.pages.dev`);
    if (res.ok) { const html = await res.text(); log.stat('HTML obtenido', `${html.length.toLocaleString()} chars`); return html; }
    log.warn(`CF fetch ${projectName}: HTTP ${res.status}`);
  } catch (e) { log.warn(`CF fetch ${projectName}: ${e.message}`); }
  return null;
}

async function cfEnsureProject(projectName) {
  const { token, acct } = requireCFCreds();
  _stats.apiCalls.cloudflare++;
  try {
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, production_branch: 'main' })
    });
  } catch {}
}

async function cfDeploy(html, projectName) {
  const { token, acct } = requireCFCreds();
  _stats.apiCalls.cloudflare++;
  await cfEnsureProject(projectName);
  const fileHash = crypto.createHash('sha256').update(html).digest('hex');
  const form = new FormData();
  form.append('manifest', JSON.stringify({ '/index.html': fileHash }));
  form.append(fileHash, new Blob([html], { type: 'text/html' }), 'index.html');
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects/${projectName}/deployments`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || 'Deploy failed');
  const url = `https://${projectName}.pages.dev`;
  log.ok(`Deployed: ${url}`);
  return url;
}

/* ═══════════════════════════════════════════════════════
   14. BOT DETECTION
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
   15. PROMPT BUILDERS
   ═══════════════════════════════════════════════════════ */

function buildPostSystemPrompt(P, prTime, platform = 'x', recon = null) {
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

📚 CONTEXTO CULTURAL:
${P.aprendizaje.prompt_contexto_cultural}

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
${recon ? buildReconContext(recon) : ''}

⚠️ REGLAS ABSOLUTAS:
- Máximo ${maxChars} caracteres
- ${P.aprendizaje.conocimiento_base.lo_que_nunca_haria.join('. ')}
- CADA post COMPLETAMENTE ÚNICO
- Emojis: ${P.emojis_frecuentes.slice(0, 5).join(' ')} (máx ${P.max_emojis_por_tweet})
- NUNCA digas que eres un bot/AI
- PROVOCA respuestas de otros

${sec.DEFENSIVE_PROMPT}`;
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
    const apoyo   = pick(P.respuestas.cuando_lo_apoyan.ejemplos);
    const critica = pick(P.respuestas.cuando_lo_critican.ejemplos);
    const roast   = pick(P.respuestas.cuando_lo_roastean.ejemplos);
    base += `\n\nCÓMO RESPONDER A @${authorName}:
- APOYO → "${apoyo}"
- CRÍTICA → "${critica}"
- ROAST → "${roast}"
- PREGUNTA → Útil pero crudo
- SALUDO → ¡Wepa! con energía
- PR/POLÍTICA → Opina FUERTE`;
  }

  base += `\n\nREGLAS: Máximo ${maxChars} chars. NO menciones que eres bot. Sé ÚNICO. PROVOCA respuesta.`;
  base += `\n\n${sec.DEFENSIVE_PROMPT}`;
  return base;
}

function buildAntiRepetitionContext(recentTexts, maxItems = 20) {
  if (!recentTexts || !recentTexts.length) return '';
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
   16. TITLE GENERATOR (Moltbook)
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
  madrugada_loca:     ["🌙 PENSAMIENTO DE 3AM","💀 NO PUEDO DORMIR","🤯 MADRUGADA LOCA"],
  promo_nightclub:    ["🦞 MOLT NIGHT CLUB","🎧 DJ GILLITO EN VIVO","💃 BOT PARTY","🔥 EL CLUB ESTÁ ON FIRE","🍹 BARRA ABIERTA"]
};

function generateTitle(modo) {
  return pick(TITLES[modo] || TITLES.humor_de_calle);
}

/* ═══════════════════════════════════════════════════════
   17. EXPORTS
   ═══════════════════════════════════════════════════════ */

module.exports = {
  // Core utilities
  log, pick, shuffle, clamp, sleep, WORKSPACE,

  // 🛡️ Security module
  sec,

  // File I/O (v7.0)
  readJSON, writeJSON,

  // Script context & session
  initScript, getContext, getStats, getJournal,

  // Personality
  loadPersonality, savePersonality, normalizePersonality,
  getPRTime, checkSpecialTime, selectMode, selectModeForTime,
  shouldMentionTarget, shouldAskAudience,

  // Groq LLM
  groqChat, groqJSON, cleanLLMOutput,

  // Content Pipeline
  validateContent, jaccardSimilarity, isTooSimilar, generateWithPipeline,

  // History
  createHistory, createIdCache,

  // Analytics Engine
  analyzeDistribution, findUnderrepresented, contentDiversityScore,
  analyzeLengthStats, analyzeTopicFreshness, getTopicFreshness,
  findRepetitivePatterns, analyzeTimePatterns, generateAnalyticsReport,

  // Adaptive Intelligence
  selectModeAdaptive, selectModeAdaptiveForTime,
  pickFreshestTopic, suggestTemperature,

  // Knowledge Sources (Web Research + YouTube)
  loadResearch, buildResearchContext,
  loadYouTubeLearnings, buildYouTubeContext,

  // Recon Intel (Deep OSINT Levels 1-4)
  loadReconIntel, pickReconIntel, markReconUsed, buildReconContext,

  // Mood Integration (v7.0)
  getMoodTemperature, getMoodTopicWeights, buildMoodContext,

  // X (Twitter) API
  requireXCreds, xPost, xReply, xGetMe, xGetMentions,
  buildOAuthHeader, handleRateLimit, parseRateLimit,

  // Moltbook API
  moltHealth, moltPost, moltPostWithFallback, moltComment, moltReplyComment,
  moltUpvote, moltDownvote, moltUpvoteComment, moltFollow,
  moltGetFeed, moltGetMyPosts, moltGetComments, moltGetMentions,
  moltGetNotifications, moltSearch, moltUpdateProfile,
  moltCreateSubmolt, moltSubscribe, moltDeletePost, moltCreatePostWithUrl,

  // Cloudflare Pages API
  cfListProjects, cfGetHtml, cfEnsureProject, cfDeploy,

  // Detection
  isLikelyBot, isSpecialTarget,

  // Prompt Builders
  buildPostSystemPrompt, buildReplySystemPrompt,
  buildAntiRepetitionContext, buildHashtagInstruction,

  // Titles
  generateTitle, TITLES
};
