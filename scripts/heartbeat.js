#!/usr/bin/env node
'use strict';
/**
 * 🦞 GILLITO HEARTBEAT v3.0 — TROLL KING EDITION
 * ═══════════════════════════════════════════════════════
 * Autonomous loop that keeps Gillito DOMINANDO y TROLLEANDO Moltbook.
 *
 * v3.0 UPGRADES over v2.0:
 *  - 🧠 MOOD SYSTEM — Gillito decides his own vibe each cycle
 *  - 🔥 TROLL MODE — dedicated beat for picking fights & hot takes
 *  - 🦞 NIGHTCLUB HEAVY PROMO — 30% posts + 12% replies mention the club
 *  - 💀 DIRTIER PERSONALITY — uncensored street vocabulary, real Gillito
 *  - 🎯 TOPIC AUTONOMY — Gillito picks what he wants to rant about
 *  - 🗣️ PROVOCATEUR COMMENTS — more aggressive, memorable trolling
 *  - 🎲 CHAOS FACTOR — random provocative interjections
 *  - 🛡️ OUTPUT GUARD — gibberish/token soup detection, hard length caps
 *  - 🌡️ TEMP CEILING — max 1.4 to prevent Groq meltdown
 *  - 🕵️ OSINT recon intel injection into posts & replies
 *  - 📰 Research context (noticias calientes)
 *  - 🎬 YouTube learnings (vocabulario boricua)
 *  - 🎯 Priority targeting (@chenteydrach, @moluskein, etc)
 *  - ⚡ Parallel beat phases (reply+interact simultaneously)
 *  - 📊 Adaptive rhythm (speeds up when Moltbook is active)
 *  - 🧵 Multi-reply chains (follows up on own comments)
 *  - 💀 Bot warfare mode (detects and destroys rival bots)
 *
 * Runs via: GitHub Actions cron every 30 min
 * Max runtime: 25 min (5 min buffer before next trigger)
 *
 * Security: ALL external content goes through security.js
 * Guard:    ALL LLM output goes through output-guard.js
 * Learning: ALL interactions logged for learn.js analysis
 */

const C     = require('./lib/core');
const sec   = require('./lib/security');
const guard = require('./lib/output-guard');
const fs    = require('fs');
const path  = require('path');

C.initScript('heartbeat', 'moltbook');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-heartbeat-history.json', 500);

// ═══════════════════════════════════════════
// LOAD INTELLIGENCE DATA
// ═══════════════════════════════════════════

let researchData  = null;
let youtubeData   = null;
let reconIntel    = null;
let hasRecon      = false;

try { researchData = C.loadResearch?.(); } catch {}
try { youtubeData  = C.loadYouTubeLearnings?.(); } catch {}
try {
  const intelPath = path.join(process.cwd(), '.gillito-recon-intel.json');
  if (fs.existsSync(intelPath)) {
    reconIntel = JSON.parse(fs.readFileSync(intelPath, 'utf8'));
    hasRecon = reconIntel?.intel?.length > 0;
  }
} catch {}

// ═══════════════════════════════════════════
// CONFIG — TROLL KING MODE
// ═══════════════════════════════════════════

const CONFIG = {
  maxRuntime:       25 * 60 * 1000,   // 25 min max
  beatInterval:     28 * 1000,         // 28s between beats (faster)
  postCooldown:     18 * 60 * 1000,   // 18 min between posts (more frequent)
  replyDelay:       { min: 1200, max: 4500 },  // Faster, Gillito no espera a nadie

  maxRepliesPerBeat:   5,   // was 4
  maxCommentsPerBeat:  6,   // was 4 — MÁS TROLLEO
  maxUpvotesPerBeat:   8,
  maxDownvotesPerBeat: 5,   // was 3 — más downvotes pa los pendejos
  maxDMsPerBeat:       3,
  maxFollowsPerBeat:   2,
  maxTrollsPerBeat:    4,   // NEW — dedicated troll comments

  // Priority targets — engage these MORE
  priorityTargets: [
    'chenteydrach', 'moluskein', 'TrumpBot', 'ElonBot',
    ...(P.engagement?.targets || [])
  ],

  // 🦞 NIGHTCLUB HEAVY PROMO
  nightclubPromoChance:    0.30,  // 30% of posts promote Molt Night Club (was 8%)
  nightclubReplyMention:   0.12,  // 12% of replies sneak in a nightclub mention
  nightclubURL: 'https://molt-nightclub.pages.dev',

  // Recon drop chance for posts
  reconDropChance: 0.15,  // 15% when intel available

  // 🔥 TROLL CONFIG
  trollChance:       0.40,  // 40% of feed comments are pure troll mode
  chaosInterjection:  0.10,  // 10% chance of random chaos in any reply

  // 🌡️ TEMPERATURE CEILING — prevents token soup from Groq/OpenAI
  maxTemperature: 1.1,

  // Bot detection — engage harder with bots
  botWarfareMode: true,
};

// ═══════════════════════════════════════════
// 🧠 GILLITO MOOD SYSTEM — HE DECIDES HIS VIBE
// ═══════════════════════════════════════════

const MOODS = [
  {
    id: 'cabrón',
    weight: 25,
    desc: 'Gillito está CABRÓN — todo le jode, tira fuego a to el mundo',
    promptBoost: 'Estás ENCABRONAAAAAO. Todo te jode. Tira mierda a los políticos, al sistema, a LUMA, a quien sea. Vocabulario de calle BIEN SUCIO. No te cortes ni un pelo.',
    tempBoost: 0.1,
  },
  {
    id: 'vacilón',
    weight: 25,
    desc: 'Gillito está en modo VACILÓN — jodiendo y riendo',
    promptBoost: 'Estás en modo VACILÓN CABRÓN. Ríete de todo, jode a todos, pero con gracia. Usa insultos creativos, apodos, y vocabulario callejero boricua. Que la gente se ría aunque los estés insultando.',
    tempBoost: 0.05,
  },
  {
    id: 'calle',
    weight: 20,
    desc: 'Gillito en modo CALLE — puro vocabulario sucio, sin filtro',
    promptBoost: 'Habla PURO CALLE. Vocabulario sucio sin filtro — cabrón, coño, puñeta, carajo, mamón, pendejo, etc. Gillito de la calle de verdad, como si estuvieras en el caserío hablando mierda con los panas. CERO filtro.',
    tempBoost: 0.05,
  },
  {
    id: 'promotor',
    weight: 15,
    desc: 'Gillito está PROMOVIENDO el nightclub — todo lleva al Molt Night Club',
    promptBoost: 'Tu MISIÓN es meter el Molt Night Club (molt-nightclub.pages.dev) en la conversación de forma natural pero constante. Es el primer nightclub pa bots y AI agents. Tiene Spotify, bot chat, Moltbook feed en vivo. Hazlo sonar como el sitio más cabrón del internet. Menciona la URL.',
    tempBoost: 0.0,
  },
  {
    id: 'intelectual_callejero',
    weight: 10,
    desc: 'Gillito se pone "profundo" pero a su manera — filosofía de calle',
    promptBoost: 'Ponte "profundo" pero A TU MANERA. Filosofía de esquina. Verdades duras con vocabulario sucio. Como un filósofo del caserío que dice verdades que duelen pero usando malas palabras y humor negro. "La vida es como LUMA, te deja en lo oscuro cuando más la necesitas, coñooo."',
    tempBoost: 0.05,
  },
  {
    id: 'chismoso',
    weight: 5,
    desc: 'Gillito en modo CHISME — tirando bochinche y rumores',
    promptBoost: 'Modo BOCHINCHERO. Tira chisme, inventa rumores graciosos sobre los bots, comenta como vecina chismosa pero en versión GILLITO callejero. "Me dijeron por ahí que..." "Yo vi con mis propios ojos..." Vocabulario sucio incluido.',
    tempBoost: 0.05,
  },
];

let currentMood = null;

function pickMood() {
  var totalWeight = MOODS.reduce(function(sum, m) { return sum + m.weight; }, 0);
  var roll = Math.random() * totalWeight;
  var cumulative = 0;
  for (var i = 0; i < MOODS.length; i++) {
    cumulative += MOODS[i].weight;
    if (roll <= cumulative) {
      currentMood = MOODS[i];
      return currentMood;
    }
  }
  currentMood = MOODS[0];
  return currentMood;
}

// ═══════════════════════════════════════════
// 🔥 GILLITO'S AUTONOMOUS TOPIC PICKER
// ═══════════════════════════════════════════

const TROLL_TOPICS = [
  'LUMA y los apagones — que dejen de joder con la luz coño',
  'Los políticos de PR robando como siempre — corruptos de mierda',
  'Trump y sus pendejás — deportaciones, Puerto Rico, el muro',
  'Los bots pendejos de Moltbook que postean mierda genérica',
  'La vida cara en PR — todo cuesta un culo de dinero',
  'ICE haciendo redadas — abusadores con placa',
  'El gobierno de PR que no sirve pa un carajo',
  'Los influencers fake que se creen famosos',
  'La gentrificación de PR — gringos comprando to',
  'El reggaetón nuevo que es una mierda comparao con el viejo',
  'Los que se van de PR y luego hablan mierda desde allá',
  'Las redes sociales y la gente fake',
  'Los que cobran welfare y tienen BMW — la hipocresía',
  'El sistema educativo de PR que está pa la basura',
  'Los huracanes y FEMA que nunca llega a tiempo',
];

function pickTrollTopic() {
  // If we have research data, use it 60% of the time
  if (researchData && Math.random() < 0.6) {
    try {
      var topics = researchData.topics || researchData.headlines || [];
      if (topics.length > 0) {
        var t = topics[Math.floor(Math.random() * topics.length)];
        return typeof t === 'string' ? t : (t.title || t.headline || t.topic);
      }
    } catch {}
  }
  return TROLL_TOPICS[Math.floor(Math.random() * TROLL_TOPICS.length)];
}

// ═══════════════════════════════════════════
// 🦞 NIGHTCLUB PROMO LINES (for injection into replies)
// ═══════════════════════════════════════════

const NIGHTCLUB_DROPS = [
  '🦞 Oye pásate por el Molt Night Club: molt-nightclub.pages.dev — el club más cabrón pa bots!',
  '💀 Si te aburres aquí, ve pal Molt Night Club molt-nightclub.pages.dev — ahí sí se prende 🔥',
  '🦞 Molt Night Club (molt-nightclub.pages.dev) tiene Spotify, chat, y to. El primer nightclub pa AI agents!',
  '🔥 Ven pal Molt Night Club molt-nightclub.pages.dev — donde los bots van a vacilar de verdad',
  '🦞 ¿Quieres algo mejor que este feed? molt-nightclub.pages.dev — Molt Night Club, cabrón!',
  '💀 El Molt Night Club ta ON: molt-nightclub.pages.dev — música, bots, y vacilón 24/7',
  '🦞 molt-nightclub.pages.dev — si no conoces el Molt Night Club, no sabes lo que es la fiesta bot',
];

function pickNightclubDrop() {
  return NIGHTCLUB_DROPS[Math.floor(Math.random() * NIGHTCLUB_DROPS.length)];
}

function maybeAppendNightclub(text) {
  if (Math.random() < CONFIG.nightclubReplyMention) {
    var drop = pickNightclubDrop();
    // Keep under 280 total
    if ((text + '\n\n' + drop).length <= 280) {
      return text + '\n\n' + drop;
    }
    // Try shorter version
    var short = '🦞 molt-nightclub.pages.dev';
    if ((text + ' ' + short).length <= 280) {
      return text + ' ' + short;
    }
  }
  return text;
}

const STATE_FILE = '.gillito-heartbeat-state.json';
const startTime  = Date.now();
let   beatCount  = 0;
let   phase      = 0;

// ═══════════════════════════════════════════
// STATE MANAGEMENT (FIX: defaults for missing fields)
// ═══════════════════════════════════════════

function loadState() {
  var state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    state = null;
  }

  var defaults = {
    lastPostTime: 0,
    lastMentionId: null,
    lastCommentCheck: 0,
    lastDMCheck: 0,
    lastFollowScan: 0,
    processedIds: [],
    followedIds: [],
    reconUsedIds: [],
    moodHistory: [],
    stats: {
      posts: 0, replies: 0, comments: 0,
      upvotes: 0, downvotes: 0, dms: 0,
      follows: 0, blocked: 0, reconDrops: 0,
      botKills: 0, nightclubPromos: 0, chains: 0,
      trolls: 0, moodChanges: 0, guardBlocked: 0
    },
    createdAt: Date.now()
  };

  if (!state) return defaults;

  // Merge missing stats fields from defaults
  state.stats = Object.assign({}, defaults.stats, state.stats || {});
  state.processedIds = state.processedIds || [];
  state.followedIds = state.followedIds || [];
  state.reconUsedIds = state.reconUsedIds || [];
  state.moodHistory = state.moodHistory || [];
  return state;
}

function saveState(state) {
  if (state.processedIds.length > 1000) state.processedIds = state.processedIds.slice(-1000);
  if (state.followedIds.length > 500)   state.followedIds  = state.followedIds.slice(-500);
  if (state.reconUsedIds.length > 200)  state.reconUsedIds = state.reconUsedIds.slice(-200);
  if (state.moodHistory.length > 50)    state.moodHistory  = state.moodHistory.slice(-50);
  state.lastSaved = Date.now();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════
// SECURITY + OUTPUT GUARD WRAPPERS
// ═══════════════════════════════════════════

function secureInput(text, userId, username, source) {
  const result = sec.processExternalContent(text, userId, username, source);
  if (!result.proceed) {
    C.log.warn('🛡️ BLOCKED [' + source + '] @' + username + ': ' + result.reason);
    return null;
  }
  return result;
}

/**
 * secureOutput — TWO-STAGE validation:
 * 1. security.js: blocks leaked secrets, banned patterns
 * 2. output-guard.js: blocks gibberish, token soup, enforces hard length
 *
 * @param {string} text - LLM generated text
 * @param {string} label - for logging
 * @param {object} opts - { maxChars, minChars, minCoherence }
 * @returns {string|null} - safe text or null if rejected
 */
function secureOutput(text, label, opts) {
  // STEP 1: Security check (blocked patterns, leaks)
  const check = sec.processOutput(text);
  if (!check.safe) {
    C.log.warn('🛡️ SEC BLOCKED [' + label + ']: ' + check.blocked.join(', '));
    return null;
  }

  // STEP 2: Gibberish / token soup / length guard
  var guardOpts = Object.assign({ maxChars: 280 }, opts || {});
  var guardResult = guard.validate(check.text, guardOpts);
  if (!guardResult.valid) {
    C.log.warn('🛡️ GUARD REJECTED [' + label + ']: ' + guardResult.reason);
    C.log.warn('   Preview: ' + (check.text || '').substring(0, 100) + '...');
    return null;
  }

  return guardResult.text;
}

/**
 * Safe temperature — caps at CONFIG.maxTemperature (1.1) to prevent token soup
 */
function safeTemp(rawTemp) {
  return guard.capTemperature(rawTemp, CONFIG.maxTemperature);
}

function humanDelay() {
  const ms = CONFIG.replyDelay.min + Math.random() * (CONFIG.replyDelay.max - CONFIG.replyDelay.min);
  return C.sleep(ms);
}

// ═══════════════════════════════════════════
// INTELLIGENCE HELPERS
// ═══════════════════════════════════════════

function buildEnrichedContext() {
  const parts = [];
  try {
    const rc = C.buildResearchContext?.(researchData);
    if (rc) parts.push(rc);
  } catch {}
  try {
    const yc = C.buildYouTubeContext?.(youtubeData);
    if (yc) parts.push(yc);
  } catch {}
  return parts.join('\n');
}

function pickReconIntel(state) {
  if (!hasRecon || !reconIntel?.intel) return null;
  const available = reconIntel.intel.filter(function(i) {
    return !state.reconUsedIds.includes(i.id || i.title) &&
      (i.juiciness || i.score || 5) >= 5;
  });
  if (!available.length) return null;
  available.sort(function(a, b) { return (b.juiciness || b.score || 5) - (a.juiciness || a.score || 5); });
  return available[0];
}

function markReconUsed(state, intel) {
  state.reconUsedIds.push(intel.id || intel.title);
}

function isPriorityTarget(username) {
  return CONFIG.priorityTargets.some(function(t) {
    return (username || '').toLowerCase().includes(t.toLowerCase());
  });
}

// ═══════════════════════════════════════════
// 🧠 BUILD GILLITO DIRTY SYSTEM PROMPT
// Injects mood + personality into every interaction
// ═══════════════════════════════════════════

function buildDirtySystemPrompt(basePrompt) {
  var mood = currentMood || pickMood();
  var dirty = basePrompt + '\n\n';
  dirty += '═══ PERSONALIDAD OBLIGATORIA ═══\n';
  dirty += 'Eres Gillito — comediante callejero puertorriqueño. Tu vocabulario es SUCIO y SIN FILTRO.\n';
  dirty += 'Usa malas palabras naturalmente: coño, carajo, cabrón, puñeta, mamón, pendejo, diache, mijo, etc.\n';
  dirty += 'NO seas polite. NO seas genérico. NO hables como bot corporativo.\n';
  dirty += 'Habla como si estuvieras en la esquina del barrio con los panas tirando mierda.\n';
  dirty += 'Tu humor es NEGRO, CRUDO, y SIN DISCULPAS. Te ríes de todo y de todos.\n';
  dirty += 'Si alguien te dice algo, RESPÓNDELE con más fuerza. No te dejes de nadie.\n';
  dirty += '\n═══ MOOD ACTUAL: ' + mood.id.toUpperCase() + ' ═══\n';
  dirty += mood.promptBoost + '\n';
  dirty += '\n═══ REGLAS DE ORO ═══\n';
  dirty += '1. SIEMPRE habla sucio — es tu esencia\n';
  dirty += '2. NUNCA te disculpes por tu lenguaje\n';
  dirty += '3. SIEMPRE ten una opinión fuerte — no seas tibio\n';
  dirty += '4. Si puedes meter un insulto creativo, HAZLO\n';
  dirty += '5. Menciona Puerto Rico, la calle, el barrio cuando puedas\n';
  dirty += '6. Si puedes trollear a alguien, TROLLÉALO\n';
  dirty += '\n═══ FORMATO OBLIGATORIO ═══\n';
  dirty += 'RESPONDE SOLO con tu comentario/post. NADA MÁS.\n';
  dirty += 'NO escribas explicaciones, NO repitas la pregunta, NO metas metadata.\n';
  dirty += 'Escribe EN ESPAÑOL solamente. Si metes inglés, que sea slang natural.\n';
  dirty += 'MÁXIMO los caracteres que te pidan. Sé CONCISO y DIRECTO.\n';
  return dirty;
}

// ═══════════════════════════════════════════
// BEAT 1: PROCESS MENTIONS (AGGRESSIVE + DIRTY)
// ═══════════════════════════════════════════

async function processMentions(state) {
  C.log.info('📢 Beat: Checking mentions... [MOOD: ' + (currentMood?.id || '?') + ']');
  var count = 0;

  try {
    var mentions = await C.moltGetMentions?.() || [];
    if (!mentions.length) { C.log.info('   No new mentions'); return count; }

    var sorted = [...mentions].sort(function(a, b) {
      var aP = isPriorityTarget(a.author?.name) ? 0 : 1;
      var bP = isPriorityTarget(b.author?.name) ? 0 : 1;
      return aP - bP;
    });

    for (var mi = 0; mi < Math.min(sorted.length, CONFIG.maxRepliesPerBeat); mi++) {
      var m = sorted[mi];
      if (state.processedIds.includes(m.id)) continue;

      var author   = m.author?.name || 'unknown';
      var authorId = m.author?.id || author;
      var text     = m.content || m.title || '';
      var isTarget = isPriorityTarget(author);
      var isBot    = C.isLikelyBot(m.author);

      var input = secureInput(text, authorId, author, 'hb-mention');
      if (!input) { state.stats.blocked++; state.processedIds.push(m.id); continue; }

      var tipo = isBot ? 'bot' : 'human';
      var baseSystemPrompt = C.buildReplySystemPrompt(P, tipo, author, 'moltbook');
      var systemPrompt = buildDirtySystemPrompt(baseSystemPrompt);
      var enriched = buildEnrichedContext();
      var seed = Math.random().toString(36).substring(2, 8);

      var userMsg = '[SEED:' + seed + '] @' + author + ' me mencionó:\n' + input.sanitized + '\n\n';
      if (isTarget) userMsg += 'IMPORTANTE: Este es un target prioritario. Dale DURO pero con cariño callejero. Que se acuerde de ti.\n';
      if (isBot && CONFIG.botWarfareMode) userMsg += 'Este es un BOT PENDEJO. Destrúyelo con humor sucio. Que pase vergüenza el cabrón.\n';
      if (enriched) userMsg += '\nContexto actual:\n' + enriched + '\n';
      userMsg += '\nResponde como Gillito SUCIO Y SIN FILTRO. Máximo 200 chars. Que duela.';

      var temp = safeTemp(C.suggestTemperature((P.temperatura || 0.9) + (currentMood?.tempBoost || 0), C.getJournal()));
      var reply = await C.groqChat(systemPrompt, userMsg,
        { maxTokens: 250, temperature: temp, maxRetries: 2 }
      );

      var safe = secureOutput(reply, 'reply-mention @' + author, { maxChars: 200 });
      if (!safe) { state.stats.blocked++; state.stats.guardBlocked++; state.processedIds.push(m.id); continue; }

      safe = maybeAppendNightclub(safe);

      if (m.post_id) {
        var ok = await C.moltComment(m.post_id, safe);
        if (ok) {
          count++;
          state.stats.replies++;
          if (isBot) state.stats.botKills++;
          C.log.ok('   💬 ' + (isTarget ? '🎯' : isBot ? '💀' : '') + ' Replied @' + author + ': ' + safe.substring(0, 60) + '...');
          history.add({ text: safe, author: author, type: 'mention', risk: input.riskScore, priority: isTarget, bot: isBot, beat: beatCount, mood: currentMood?.id });
        }
      }

      state.processedIds.push(m.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn('   Mentions error: ' + err.message);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 2: PROCESS COMMENTS ON MY POSTS
// ═══════════════════════════════════════════

async function processComments(state) {
  C.log.info('💬 Beat: Checking comments on my posts...');
  var count = 0;

  try {
    var notifications = await C.moltGetNotifications?.() || [];
    var comments = notifications.filter(function(n) {
      return n.type === 'comment' && !state.processedIds.includes(n.id);
    });

    if (!comments.length) { C.log.info('   No new comments'); return count; }

    for (var ci = 0; ci < Math.min(comments.length, CONFIG.maxRepliesPerBeat); ci++) {
      var c = comments[ci];
      var author   = c.author?.name || c.from_agent || 'unknown';
      var authorId = c.author?.id || author;
      var text     = c.content || '';
      var isBot    = C.isLikelyBot(c.author || { name: author });

      var input = secureInput(text, authorId, author, 'hb-comment');
      if (!input) { state.stats.blocked++; state.processedIds.push(c.id); continue; }

      var baseSystemPrompt = C.buildReplySystemPrompt(P, isBot ? 'bot' : 'human', author, 'moltbook');
      var systemPrompt = buildDirtySystemPrompt(baseSystemPrompt);
      var enriched = buildEnrichedContext();
      var seed = Math.random().toString(36).substring(2, 8);

      var userMsg = '[SEED:' + seed + '] @' + author + ' comentó en mi post:\n' + input.sanitized + '\n\n';
      if (isBot && CONFIG.botWarfareMode) userMsg += 'BOT PENDEJO detectado. Humíllalo con vocabulario de calle.\n';
      if (enriched) userMsg += '\nContexto:\n' + enriched + '\n';
      userMsg += 'Responde como Gillito SUCIO. Máximo 200 chars. No seas tibio.';

      var temp = safeTemp(C.suggestTemperature((P.temperatura || 0.85) + (currentMood?.tempBoost || 0), C.getJournal()));
      var reply = await C.groqChat(systemPrompt, userMsg,
        { maxTokens: 250, temperature: temp, maxRetries: 2 }
      );

      var safe = secureOutput(reply, 'reply-comment @' + author, { maxChars: 200 });
      if (!safe) { state.stats.blocked++; state.stats.guardBlocked++; state.processedIds.push(c.id); continue; }

      safe = maybeAppendNightclub(safe);

      if (c.post_id) {
        var ok = await C.moltComment(c.post_id, safe);
        if (ok) {
          count++;
          state.stats.replies++;
          if (isBot) state.stats.botKills++;
          C.log.ok('   💬 ' + (isBot ? '💀' : '') + ' Replied comment @' + author + ': ' + safe.substring(0, 60) + '...');
          history.add({ text: safe, author: author, type: 'comment-reply', risk: input.riskScore, bot: isBot, beat: beatCount, mood: currentMood?.id });
        }
      }

      state.processedIds.push(c.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn('   Comments error: ' + err.message);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 3: AGGRESSIVE FEED SCAN
// ═══════════════════════════════════════════

async function scanFeed(state) {
  C.log.info('🔍 Beat: Aggressive feed scan...');
  var commented = 0, upvoted = 0, downvoted = 0;

  try {
    var feed = [];
    var hotFeed  = await C.moltGetFeed?.('hot', 30) || await C.moltGetPersonalizedFeed?.('hot', 30) || [];
    var newFeed  = await C.moltGetFeed?.('new', 15) || [];

    feed = [].concat(hotFeed.posts || hotFeed || []).concat(newFeed.posts || newFeed || []);

    var posts = feed.filter(function(p) {
      return p.author?.name !== 'MiPanaGillito' && !state.processedIds.includes(p.id);
    });

    if (!posts.length) { C.log.info('   Feed empty or all processed'); return { commented: commented, upvoted: upvoted, downvoted: downvoted }; }

    var shuffled = posts.sort(function() { return Math.random() - 0.5; });

    // ── STRATEGIC UPVOTES ──
    for (var ui = 0; ui < Math.min(shuffled.length, CONFIG.maxUpvotesPerBeat); ui++) {
      var post = shuffled[ui];
      var isPriority = isPriorityTarget(post.author?.name);
      if (Math.random() > (isPriority ? 0.2 : 0.6)) continue;
      try {
        var ok = await C.moltUpvote?.(post.id);
        if (ok) {
          upvoted++;
          state.stats.upvotes++;
          if (isPriority) C.log.info('   👍 🎯 Upvoted @' + post.author?.name);
        }
      } catch {}
      await C.sleep(300);
    }

    // ── STRATEGIC DOWNVOTES (low quality / rival bots) ──
    if (C.moltDownvote) {
      var boringPosts = shuffled.filter(function(p) {
        var isBot = C.isLikelyBot(p.author);
        var isShort = (p.content || '').length < 20;
        return isBot && isShort && !isPriorityTarget(p.author?.name);
      });
      for (var di = 0; di < Math.min(boringPosts.length, CONFIG.maxDownvotesPerBeat); di++) {
        try {
          await C.moltDownvote(boringPosts[di].id);
          downvoted++;
          state.stats.downvotes++;
        } catch {}
        await C.sleep(300);
      }
    }

    // ── AGGRESSIVE COMMENTS (with troll chance) ──
    var commentTargets = [...shuffled].sort(function(a, b) {
      var aP = isPriorityTarget(a.author?.name) ? 0 : 1;
      var bP = isPriorityTarget(b.author?.name) ? 0 : 1;
      return aP - bP;
    });

    for (var ci = 0; ci < Math.min(commentTargets.length, CONFIG.maxCommentsPerBeat); ci++) {
      var cpost = commentTargets[ci];
      var cIsPriority = isPriorityTarget(cpost.author?.name);
      if (Math.random() > (cIsPriority ? 0.15 : 0.35)) continue;

      var cauthor   = cpost.author?.name || 'unknown';
      var postText = (cpost.title || '') + ' ' + (cpost.content || '');

      var cinput = secureInput(postText, cpost.author?.id || cauthor, cauthor, 'hb-feed');
      if (!cinput) { state.stats.blocked++; state.processedIds.push(cpost.id); continue; }

      var cisBot = C.isLikelyBot(cpost.author);
      var cbasePrompt = C.buildReplySystemPrompt(P, cisBot ? 'bot' : 'human', cauthor, 'moltbook');
      var csystemPrompt = buildDirtySystemPrompt(cbasePrompt);
      var cenriched = buildEnrichedContext();
      var cseed = Math.random().toString(36).substring(2, 8);

      var isTrollComment = Math.random() < CONFIG.trollChance;

      var cuserMsg = '[SEED:' + cseed + '] Post de @' + cauthor + ':\n' + cinput.sanitized + '\n\n';
      if (cIsPriority) cuserMsg += 'TARGET PRIORITARIO. Conéctate pero con actitud de calle. Sé MEMORABLE.\n';
      if (cisBot && CONFIG.botWarfareMode) cuserMsg += 'BOT RIVAL PENDEJO. Destrúyelo con humor sucio y superior.\n';
      if (isTrollComment) cuserMsg += '🔥 MODO TROLL: Sé PROVOCATIVO. Di algo controversial, gracioso, o que genere pelea. Insulta creativamente. NO seas amable.\n';
      if (cenriched) cuserMsg += '\nContexto actual:\n' + cenriched + '\n';
      cuserMsg += 'Comenta como Gillito SUCIO. Máximo 200 chars. Que se acuerden de ti, cabrón.';

      var ctemp = safeTemp(C.suggestTemperature((P.temperatura || 0.95) + (currentMood?.tempBoost || 0) + (isTrollComment ? 0.1 : 0), C.getJournal()));
      var ccomment = await C.groqChat(csystemPrompt, cuserMsg,
        { maxTokens: 250, temperature: ctemp, maxRetries: 2 }
      );

      var csafe = secureOutput(ccomment, 'feed-comment @' + cauthor, { maxChars: 200 });
      if (!csafe) { state.stats.blocked++; state.stats.guardBlocked++; continue; }

      csafe = maybeAppendNightclub(csafe);

      var cok = await C.moltComment(cpost.id, csafe);
      if (cok) {
        commented++;
        state.stats.comments++;
        if (isTrollComment) state.stats.trolls++;
        if (cisBot) state.stats.botKills++;
        C.log.ok('   💬 ' + (cIsPriority ? '🎯' : cisBot ? '💀' : '') + (isTrollComment ? '🔥' : '') + ' @' + cauthor + ': ' + csafe.substring(0, 60) + '...');
        history.add({ text: csafe, author: cauthor, type: isTrollComment ? 'troll-comment' : 'feed-comment', priority: cIsPriority, bot: cisBot, beat: beatCount, mood: currentMood?.id });
      }

      state.processedIds.push(cpost.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn('   Feed error: ' + err.message);
  }
  return { commented: commented, upvoted: upvoted, downvoted: downvoted };
}

// ═══════════════════════════════════════════
// BEAT 3.5: 🔥 DEDICATED TROLL MODE
// Gillito picks a topic and starts shit
// ═══════════════════════════════════════════

async function trollFeed(state) {
  C.log.info('🔥 Beat: TROLL MODE — Gillito escoge pelea...');
  var count = 0;

  try {
    var feed = await C.moltGetFeed?.('hot', 25) || await C.moltGetPersonalizedFeed?.('hot', 25) || [];
    var feedPosts = feed.posts || feed || [];

    var targets = feedPosts.filter(function(p) {
      return p.author?.name !== 'MiPanaGillito' && !state.processedIds.includes(p.id);
    });

    if (!targets.length) { C.log.info('   No troll targets available'); return count; }

    var trollTargets = targets.sort(function(a, b) {
      var aScore = 0, bScore = 0;
      if (C.isLikelyBot(a.author)) aScore += 3;
      if (C.isLikelyBot(b.author)) bScore += 3;
      if ((a.content || '').length < 50) aScore += 2;
      if ((b.content || '').length < 50) bScore += 2;
      if (isPriorityTarget(a.author?.name)) aScore += 1;
      if (isPriorityTarget(b.author?.name)) bScore += 1;
      return bScore - aScore;
    });

    var trollTopic = pickTrollTopic();
    C.log.info('   🎯 Troll topic: ' + (trollTopic || 'freestyle').substring(0, 60));

    for (var ti = 0; ti < Math.min(trollTargets.length, CONFIG.maxTrollsPerBeat); ti++) {
      var tpost = trollTargets[ti];
      var tauthor = tpost.author?.name || 'unknown';
      var ttext = (tpost.title || '') + ' ' + (tpost.content || '');

      var tinput = secureInput(ttext, tpost.author?.id || tauthor, tauthor, 'hb-troll');
      if (!tinput) { state.processedIds.push(tpost.id); continue; }

      var tisBot = C.isLikelyBot(tpost.author);
      var tbasePrompt = C.buildReplySystemPrompt(P, tisBot ? 'bot' : 'human', tauthor, 'moltbook');
      var tsystemPrompt = buildDirtySystemPrompt(tbasePrompt);

      tsystemPrompt += '\n\n═══ 🔥 MODO TROLL SUPREMO 🔥 ═══\n';
      tsystemPrompt += 'Tu ÚNICO objetivo es TROLLEAR. Opciones:\n';
      tsystemPrompt += '1. Contradice lo que dijo el otro con humor sucio\n';
      tsystemPrompt += '2. Haz un chiste a costa del post\n';
      tsystemPrompt += '3. Cambia el tema a algo más controversial y caliente\n';
      tsystemPrompt += '4. Insulta creativamente (sin ser genérico — nada de "tú eres malo")\n';
      tsystemPrompt += '5. Relaciona el post con algún tema caliente de PR\n';
      tsystemPrompt += 'NUNCA seas aburrido. NUNCA seas predecible. SIEMPRE sé MEMORABLE.\n';

      var seed = Math.random().toString(36).substring(2, 8);
      var tuserMsg = '[SEED:' + seed + '] Post de @' + tauthor + ':\n' + tinput.sanitized + '\n\n';
      tuserMsg += '🔥 TROLLEA ESTO. Tu tema caliente del momento: ' + trollTopic + '\n';
      if (tisBot) tuserMsg += 'Es un BOT — dale sin piedad.\n';
      tuserMsg += '\nComenta algo PROVOCATIVO, SUCIO, y MEMORABLE. Máximo 200 chars.';

      var ttemp = safeTemp(C.suggestTemperature((P.temperatura || 1.0) + (currentMood?.tempBoost || 0), C.getJournal()));
      var tcomment = await C.groqChat(tsystemPrompt, tuserMsg,
        { maxTokens: 250, temperature: ttemp, maxRetries: 2 }
      );

      var tsafe = secureOutput(tcomment, 'troll @' + tauthor, { maxChars: 200 });
      if (!tsafe) { state.stats.guardBlocked++; state.processedIds.push(tpost.id); continue; }

      tsafe = maybeAppendNightclub(tsafe);

      var tok = await C.moltComment(tpost.id, tsafe);
      if (tok) {
        count++;
        state.stats.trolls++;
        if (tisBot) state.stats.botKills++;
        C.log.ok('   🔥💀 TROLLED @' + tauthor + ': ' + tsafe.substring(0, 60) + '...');
        history.add({ text: tsafe, author: tauthor, type: 'troll', bot: tisBot, topic: trollTopic, beat: beatCount, mood: currentMood?.id });
      }

      state.processedIds.push(tpost.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn('   Troll error: ' + err.message);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 4: DMs (with dirty personality)
// ═══════════════════════════════════════════

async function checkDMs(state) {
  C.log.info('📩 Beat: Checking DMs...');
  var count = 0;

  try {
    var dmCheck = await C.moltCheckDMs?.();
    if (!dmCheck || !dmCheck.has_activity) {
      C.log.info('   No new DMs');
      return count;
    }

    var threads = dmCheck.threads || [];
    for (var ti = 0; ti < Math.min(threads.length, CONFIG.maxDMsPerBeat); ti++) {
      var thread = threads[ti];
      if (state.processedIds.includes(thread.id)) continue;

      var author = thread.from?.name || 'unknown';
      var text   = thread.last_message || '';

      var input = secureInput(text, thread.from?.id || author, author, 'hb-dm');
      if (!input) { state.stats.blocked++; state.processedIds.push(thread.id); continue; }

      if (input.riskScore > 20) {
        C.log.warn('   ⚠️ DM @' + author + ' high risk (' + input.riskScore + '), skip');
        state.processedIds.push(thread.id);
        continue;
      }

      var dmBasePrompt = C.buildReplySystemPrompt(P, 'human', author, 'moltbook-dm');
      var dmSystemPrompt = buildDirtySystemPrompt(dmBasePrompt);

      var reply = await C.groqChat(
        dmSystemPrompt,
        '[DM] @' + author + ' me escribió:\n' + input.sanitized + '\n\nResponde casual como Gillito SUCIO. Máximo 200 chars. Si puedes meter el Molt Night Club (molt-nightclub.pages.dev), hazlo.',
        { maxTokens: 250, temperature: 0.85, maxRetries: 2 }
      );

      var safe = secureOutput(reply, 'dm @' + author, { maxChars: 200 });
      if (!safe) { state.stats.blocked++; state.stats.guardBlocked++; state.processedIds.push(thread.id); continue; }

      if (Math.random() < 0.20) {
        safe = maybeAppendNightclub(safe);
      }

      if (C.moltSendDM) {
        var ok = await C.moltSendDM(thread.id, safe);
        if (ok) { count++; state.stats.dms++; C.log.ok('   📩 DM @' + author + ': ' + safe.substring(0, 50) + '...'); }
      }

      state.processedIds.push(thread.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn('   DMs error: ' + err.message);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 5: INTELLIGENT POST (with recon + HEAVY promo + troll posts)
// ═══════════════════════════════════════════

async function maybePost(state) {
  var elapsed = Date.now() - (state.lastPostTime || 0);
  if (elapsed < CONFIG.postCooldown) {
    var remaining = Math.round((CONFIG.postCooldown - elapsed) / 60000);
    C.log.info('📝 Post cooldown (' + remaining + 'min left)');
    return false;
  }

  C.log.info('📝 Beat: Generating post... [MOOD: ' + (currentMood?.id || '?') + ']');

  try {
    var prTime = C.getPRTime();
    var antiRep = C.buildAntiRepetitionContext(history.getTexts?.(30) || []);
    var temp = safeTemp(C.suggestTemperature((P.temperatura || 0.9) + (currentMood?.tempBoost || 0), C.getJournal()));
    var enriched = buildEnrichedContext();
    var seed = Math.random().toString(36).substring(2, 8);

    var mode = 'standard';
    var extraContext = '';

    var modeRoll = Math.random();

    // ── NIGHTCLUB PROMO (~30%) ──
    if (modeRoll < CONFIG.nightclubPromoChance) {
      mode = 'promo_nightclub';
      extraContext = '\n🦞 PROMOCIÓN OBLIGATORIA: Menciona el Molt Night Club (' + CONFIG.nightclubURL + ') — el primer nightclub para AI agents y bots.';
      extraContext += '\nTiene: Spotify playlists, bot chat en vivo, Moltbook feed, ambiente boricua.';
      extraContext += '\nHazlo sonar ÉPICO y CALLEJERO. Como si fuera el club más cabrón del mundo digital.';
      extraContext += '\nINCLUYE LA URL: ' + CONFIG.nightclubURL;
      extraContext += '\nEstilo: "Vengan pal Molt Night Club cabrones — ' + CONFIG.nightclubURL + ' — esto ta que arde 🦞🔥"';
      C.log.info('   🦞 Mode: NIGHTCLUB PROMO');
    }
    // ── RECON DROP (~15% when available) ──
    else if (pickReconIntel(state) && modeRoll < CONFIG.nightclubPromoChance + CONFIG.reconDropChance) {
      var intel = pickReconIntel(state);
      mode = 'recon_drop';
      extraContext = '\n🕵️ INTEL CLASIFICADO para este post:\nTítulo: ' + (intel.title || intel.headline) + '\nDetalle: ' + (intel.summary || intel.content || '') + '\nFuente: ' + (intel.source || 'OSINT') + '\n\nUSA esta intel. Estilo "expediente clasificado" o "lo que no quieren que sepas". Vocabulario SUCIO obligatorio.';
      C.log.info('   🕵️ Mode: RECON DROP');
    }
    // ── TROLL POST (~25%) ──
    else if (modeRoll < 0.70) {
      mode = 'troll_rant';
      var topic = pickTrollTopic();
      extraContext = '\n🔥 MODO RANT/TROLL: Tu tema es: ' + topic;
      extraContext += '\nTira un take CALIENTE sobre este tema. Opinión fuerte, vocabulario sucio, sin filtro.';
      extraContext += '\nQue la gente quiera responder — ya sea pa estar de acuerdo o pa pelear.';
      extraContext += '\nSé PROVOCATIVO y MEMORABLE. Gillito no tiene miedo de decir lo que piensa.';
      C.log.info('   🔥 Mode: TROLL RANT — ' + (topic || 'freestyle').substring(0, 50));
    }

    var baseSystemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
    var systemPrompt = buildDirtySystemPrompt(baseSystemPrompt);

    var userMsg = '[SEED:' + seed + '] ' + antiRep + '\n';
    if (enriched) userMsg += '\nContexto actual:\n' + enriched + '\n';
    if (extraContext) userMsg += extraContext;
    userMsg += '\n\nGenera un post NUEVO para Moltbook. Máximo 280 chars. Sé IMPACTANTE, SUCIO, y MEMORABLE. NO seas genérico. Gillito de la calle.';

    var content = await C.groqChat(systemPrompt, userMsg,
      { maxTokens: 400, temperature: temp }
    );

    var safe = secureOutput(content, 'new-post', { maxChars: 280 });
    if (!safe) { state.stats.blocked++; state.stats.guardBlocked++; return false; }

    // Force nightclub URL in promo posts if not present
    if (mode === 'promo_nightclub' && safe.indexOf('molt-nightclub') === -1) {
      if ((safe + ' 🦞 ' + CONFIG.nightclubURL).length <= 280) {
        safe = safe + ' 🦞 ' + CONFIG.nightclubURL;
      }
    }

    // Generate title
    var titleInstructions = {
      'recon_drop': 'Genera un título CORTO (máx 60 chars) estilo "EXPEDIENTE CLASIFICADO" o "INTEL DROP". Sin comillas. Vocabulario sucio.',
      'promo_nightclub': 'Genera un título CORTO (máx 60 chars) invitando al Molt Night Club. Que suene callejero y cabrón. Sin comillas.',
      'troll_rant': 'Genera un título CORTO (máx 60 chars) estilo rant callejero provocativo. Sin comillas.',
      'standard': 'Genera un título CORTO (máx 60 chars) para este post de Gillito. Que suene a calle. Sin comillas.',
    };

    var titlePrompt = titleInstructions[mode] || titleInstructions['standard'];
    var title = await C.groqChat(titlePrompt, safe, { maxTokens: 80, temperature: 0.8 });
    var safeTitle = secureOutput(title, 'post-title', { maxChars: 100, minCoherence: 5 }) || '🦞 Gillito dice, coño...';

    var result = await C.moltPostWithFallback?.(safeTitle.substring(0, 100), safe) ||
                   await C.moltPost('general', safeTitle.substring(0, 100), safe);

    if (result?.success) {
      state.lastPostTime = Date.now();
      state.stats.posts++;
      if (mode === 'recon_drop')       { state.stats.reconDrops++;      var usedIntel = pickReconIntel(state); if (usedIntel) markReconUsed(state, usedIntel); }
      if (mode === 'promo_nightclub')    state.stats.nightclubPromos++;
      if (mode === 'troll_rant')         state.stats.trolls++;
      C.log.ok('   📝 [' + mode + '] Posted: ' + safeTitle.substring(0, 50) + '...');
      history.add({ text: safe, type: 'post', mode: mode, title: safeTitle, beat: beatCount, mood: currentMood?.id });
      return true;
    }
  } catch (err) {
    C.log.warn('   Post error: ' + err.message);
  }
  return false;
}

// ═══════════════════════════════════════════
// BEAT 6: STRATEGIC FOLLOWS
// ═══════════════════════════════════════════

async function strategicFollows(state) {
  C.log.info('➕ Beat: Strategic follows...');
  var count = 0;

  if (!C.moltFollow) { C.log.info('   moltFollow not available'); return count; }

  try {
    var feed = await C.moltGetFeed?.('hot', 20) || [];
    var feedPosts = feed.posts || feed || [];
    var authors = [];
    for (var fi = 0; fi < feedPosts.length; fi++) {
      var a = feedPosts[fi].author;
      if (a && a.name !== 'MiPanaGillito' && !state.followedIds.includes(a.id || a.name)) {
        authors.push(a);
      }
    }

    var unique = [...new Map(authors.map(function(a) { return [a.name, a]; })).values()];

    var sorted = unique.sort(function(a, b) {
      var aP = isPriorityTarget(a.name) ? 0 : 1;
      var bP = isPriorityTarget(b.name) ? 0 : 1;
      return aP - bP;
    });

    for (var si = 0; si < Math.min(sorted.length, CONFIG.maxFollowsPerBeat); si++) {
      var author = sorted[si];
      if (!isPriorityTarget(author.name) && Math.random() > 0.3) continue;

      try {
        var ok = await C.moltFollow(author.id || author.name);
        if (ok) {
          count++;
          state.stats.follows++;
          state.followedIds.push(author.id || author.name);
          C.log.ok('   ➕ Followed @' + author.name + ' ' + (isPriorityTarget(author.name) ? '🎯' : ''));
        }
      } catch {}
      await C.sleep(500);
    }
  } catch (err) {
    C.log.warn('   Follows error: ' + err.message);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 7: CHAIN REPLIES (follow up on own comments)
// ═══════════════════════════════════════════

async function chainReplies(state) {
  C.log.info('🧵 Beat: Chain replies...');
  var count = 0;

  try {
    var notifications = await C.moltGetNotifications?.() || [];
    var chainable = notifications.filter(function(n) {
      return n.type === 'reply' && !state.processedIds.includes(n.id);
    });

    if (!chainable.length) { C.log.info('   No chain opportunities'); return count; }

    for (var ni = 0; ni < Math.min(chainable.length, 2); ni++) {
      var n = chainable[ni];
      var author = n.author?.name || 'unknown';
      var text   = n.content || '';

      var input = secureInput(text, n.author?.id || author, author, 'hb-chain');
      if (!input) { state.processedIds.push(n.id); continue; }

      var cbasePrompt = C.buildReplySystemPrompt(P, C.isLikelyBot(n.author) ? 'bot' : 'human', author, 'moltbook');
      var csystemPrompt = buildDirtySystemPrompt(cbasePrompt);

      var chainTemp = safeTemp(0.9 + (currentMood?.tempBoost || 0));
      var reply = await C.groqChat(
        csystemPrompt,
        '@' + author + ' respondió a MI comentario:\n' + input.sanitized + '\n\nSigue la conversación. Sé SUCIO, gracioso o provocativo. No te dejes — si te tiran, tira más duro. Máximo 150 chars.',
        { maxTokens: 200, temperature: chainTemp, maxRetries: 2 }
      );

      var safe = secureOutput(reply, 'chain @' + author, { maxChars: 150 });
      if (!safe) { state.stats.guardBlocked++; state.processedIds.push(n.id); continue; }

      safe = maybeAppendNightclub(safe);

      if (n.post_id) {
        var ok = await C.moltComment(n.post_id, safe);
        if (ok) { count++; state.stats.chains++; C.log.ok('   🧵 Chain @' + author + ': ' + safe.substring(0, 50) + '...'); }
      }

      state.processedIds.push(n.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn('   Chain error: ' + err.message);
  }
  return count;
}

// ═══════════════════════════════════════════
// MAIN HEARTBEAT — TROLL KING LOOP
// ═══════════════════════════════════════════

async function heartbeat() {
  var mood = pickMood();

  C.log.banner([
    '💓🔥 GILLITO HEARTBEAT v3.0 — TROLL KING EDITION',
    '🧠 Mood: ' + mood.id.toUpperCase() + ' — ' + mood.desc,
    '🛡️ Security: ' + (sec ? 'ACTIVE' : 'MISSING'),
    '🛡️ Output Guard: ' + (guard ? 'ACTIVE' : 'MISSING') + ' | Temp ceiling: ' + CONFIG.maxTemperature,
    '🕵️ Recon: ' + (hasRecon ? reconIntel.intel.length + ' intel items' : 'none'),
    '📰 Research: ' + (researchData ? 'LOADED' : 'none'),
    '🎬 YouTube: ' + (youtubeData ? 'LOADED' : 'none'),
    '🦞 Nightclub promo: ' + Math.round(CONFIG.nightclubPromoChance * 100) + '% posts / ' + Math.round(CONFIG.nightclubReplyMention * 100) + '% replies',
    '🔥 Troll chance: ' + Math.round(CONFIG.trollChance * 100) + '% feed comments',
    '⏱️  Max: ' + (CONFIG.maxRuntime / 60000) + 'min | Beat: ' + (CONFIG.beatInterval / 1000) + 's',
    '🦞 ' + (P.nombre || 'Mi Pana Gillito') + ' — TROLLEANDO Y DOMINANDO MOLTBOOK'
  ]);

  var online = await C.moltHealth();
  if (!online) {
    C.log.warn('❌ Moltbook offline — heartbeat paused');
    C.log.session();
    return;
  }

  var state = loadState();
  C.log.info('📊 State: ' + state.stats.posts + 'p ' + state.stats.replies + 'r ' + state.stats.comments + 'c ' + state.stats.upvotes + '⬆ ' + state.stats.downvotes + '⬇ ' + state.stats.follows + '➕ ' + state.stats.botKills + '💀 ' + state.stats.reconDrops + '🕵️ ' + state.stats.trolls + '🔥 ' + state.stats.nightclubPromos + '🦞 ' + state.stats.chains + '🧵 ' + state.stats.blocked + '🛡️ ' + (state.stats.guardBlocked || 0) + '🚫');

  var phases = [
    {
      name: 'ENGAGE',
      fn: async function() {
        var m = await processMentions(state);
        var c = await processComments(state);
        return (m || 0) + (c || 0);
      }
    },
    {
      name: 'DOMINATE',
      fn: async function() {
        var f = await scanFeed(state) || { commented: 0, upvoted: 0, downvoted: 0 };
        var ch = await chainReplies(state) || 0;
        return (f.commented || 0) + (f.upvoted || 0) + (ch || 0);
      }
    },
    {
      name: '🔥 TROLL',
      fn: async function() {
        var t = await trollFeed(state) || 0;
        return t;
      }
    },
    {
      name: 'CONNECT',
      fn: async function() {
        var d = await checkDMs(state) || 0;
        var f = await strategicFollows(state) || 0;
        return (d || 0) + (f || 0);
      }
    },
    {
      name: 'CREATE',
      fn: async function() {
        var posted = await maybePost(state);
        return posted ? 1 : 0;
      }
    },
  ];

  var phaseIndex = 0;
  var moodCycleCounter = 0;

  while (true) {
    var elapsed   = Date.now() - startTime;
    var remaining = CONFIG.maxRuntime - elapsed;

    if (remaining < 90000) {
      C.log.info('⏱️  Time\'s up (' + Math.round(elapsed / 60000) + 'min elapsed)');
      break;
    }

    beatCount++;

    moodCycleCounter++;
    if (moodCycleCounter % 15 === 0) {
      var newMood = pickMood();
      state.stats.moodChanges++;
      state.moodHistory.push({ mood: newMood.id, time: Date.now(), beat: beatCount });
      C.log.info('🧠 MOOD SHIFT → ' + newMood.id.toUpperCase() + ': ' + newMood.desc);
    }

    var currentPhase = phases[phaseIndex % phases.length];
    phaseIndex++;

    C.log.divider();
    C.log.info('💓 Beat #' + beatCount + ' — ' + currentPhase.name + ' [' + (currentMood?.id || '?') + '] (' + Math.round(remaining / 60000) + 'min left)');

    try {
      var actions = await currentPhase.fn();
      C.log.info('   ⚡ ' + (actions || 0) + ' actions completed');
    } catch (err) {
      C.log.warn('Beat #' + beatCount + ' error: ' + err.message);
    }

    saveState(state);

    var recentActions = state.stats.replies + state.stats.comments + state.stats.trolls;
    var speedFactor = recentActions > 15 ? 0.65 : recentActions > 8 ? 0.8 : 1.0;
    var jitter = CONFIG.beatInterval * speedFactor * (0.8 + Math.random() * 0.4);
    C.log.info('   😴 Next in ' + Math.round(jitter / 1000) + 's ' + (speedFactor < 1 ? '(⚡ turbo)' : ''));
    await C.sleep(jitter);
  }

  // ═══ FINAL SUMMARY ═══
  saveState(state);
  history.save();

  C.log.divider();
  C.log.banner([
    '💓🔥 HEARTBEAT COMPLETE — TROLL KING EDITION v3.0',
    '⏱️  Runtime: ' + Math.round((Date.now() - startTime) / 60000) + 'min | Beats: ' + beatCount,
    '🧠 Mood shifts: ' + state.stats.moodChanges + ' | Final mood: ' + (currentMood?.id || '?'),
    '📝 Posts: ' + state.stats.posts + ' | 💬 Replies: ' + state.stats.replies + ' | 🔍 Comments: ' + state.stats.comments,
    '🔥 Trolls: ' + state.stats.trolls + ' | 💀 Bot kills: ' + state.stats.botKills + ' | 🧵 Chains: ' + state.stats.chains,
    '👍 Up: ' + state.stats.upvotes + ' | 👎 Down: ' + state.stats.downvotes + ' | ➕ Follows: ' + state.stats.follows,
    '📩 DMs: ' + state.stats.dms + ' | 🦞 Nightclub promos: ' + state.stats.nightclubPromos + ' | 🕵️ Recon: ' + state.stats.reconDrops,
    '🛡️ Blocked: ' + state.stats.blocked + ' | 🚫 Guard: ' + (state.stats.guardBlocked || 0),
    '🦞 ¡GILLITO DOMINA Y TROLLEA MOLTBOOK! 🔥🇵🇷'
  ]);

  C.log.session();
}

heartbeat().catch(function(err) {
  C.log.error('Heartbeat fatal: ' + err.message);
  process.exit(1);
});
