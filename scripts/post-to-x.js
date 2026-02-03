#!/usr/bin/env node
/**
 * Mi Pana Gillito — Post to X v7.0 PREMIUM 💎
 * ═══════════════════════════════════════════
 * 💎 Premium features: threads, long-form attempts, @grok image requests
 * 🕵️ OSINT recon intel drops from Hacker System
 * 💰 Monetization-aware: content optimized for engagement & replies
 * 🧠 Adaptive mode + temperature + topic freshness
 * 🛡️ Full security pipeline
 * 🌐 Web research + YouTube learning integration
 * 📊 Enriched history for learn.js
 *
 * PREMIUM STRATEGY (FREE API TIER):
 * ─────────────────────────────────
 * X API v2 still enforces 280 char limit via POST /2/tweets even for Premium.
 * Long-form (25K chars) only works through the web UI or 3rd-party services.
 * Free API tier = 17 tweets/24h (posts + replies combined).
 *
 * Budget: ~6 posts/day (every 4h) + ~10 replies/day = 16 total (1 margin)
 *
 * So our Premium strategy is:
 *  1. THREADS — Multi-tweet intel reports, max 1/day (~5% chance)
 *  2. GROK IMAGES — Tag @grok in tweets requesting AI-generated images (~8%)
 *  3. RECON INTEL — OSINT drops from the Hacker System (~15% when available)
 *  4. ENGAGEMENT BAIT — Content designed to spark reply threads (~12%)
 *  5. REPLY BOOST — Premium replies get algorithmic priority
 *  6. MONETIZATION PATH — Build toward 500 verified followers + 5M impressions
 */

const path = require('path');
const C = require('./lib/core');

C.initScript('post-to-x-premium', 'x');
C.requireXCreds();

const sec     = C.sec;
const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-tweet-history.json', 100);

// 🌐 Knowledge sources
const research = C.loadResearch();
const yt       = C.loadYouTubeLearnings();

// 🕵️ Recon intel (from Hacker System)
let hasReconIntel = false;
let pickIntel, markUsed, getReconPrompt;
try {
  const intelPicker = require(path.join(process.cwd(), 'lib', 'intel-picker'));
  pickIntel      = intelPicker.pickIntel;
  markUsed       = intelPicker.markUsed;
  getReconPrompt = intelPicker.getReconPrompt;
  hasReconIntel  = intelPicker.hasIntel();
  if (hasReconIntel) C.log.ok('🕵️ Recon intel DISPONIBLE');
} catch {
  C.log.info('🕵️ Recon system not installed (optional)');
}


/* ═══════════════════════════════════════════════════════
   PREMIUM MODE SELECTION
   ═══════════════════════════════════════════════════════ */

/**
 * Extended mode distribution for Premium.
 * New modes: recon_drop, thread_report, grok_image, engagement_bait
 *
 * ⚠️ BUDGET: Free API = 17 tweets/24h (posts + replies combined)
 * Posts: ~6/day (every 4h). Threads eat 3 tweets = half budget!
 * So threads are rare (~5%) and max 1/day.
 */
function selectPremiumMode(P, prTime, history) {
  const rand = Math.random() * 100;

  // Check if we already posted a thread today
  const todayThreads = history.lastHours(24).filter(e => e.mode === 'thread_report').length;

  // ─── RECON DROP (~15% when intel available) ───
  if (hasReconIntel && rand < 15) {
    C.log.info('🕵️ Mode: RECON DROP');
    return { modo: 'recon_drop', tema: 'OSINT intel drop', premium: true };
  }

  // ─── THREAD REPORT (~5% chance, max 1/day) ───
  if (rand < 20 && todayThreads === 0) {
    C.log.info('🧵 Mode: THREAD REPORT');
    const threadTopics = [
      'timeline de corrupción en PR', 'historial de apagones de LUMA',
      'promesas rotas del gobierno', 'fondos federales que no llegan',
      'comparación PR vs estados en servicios', 'la verdad sobre el Jones Act',
      'ICE en PR: timeline de operativos', 'lo que nadie te dice de la Junta Fiscal',
      ...(P.temas_trolleo_politico || []), ...(P.temas_critica_social || [])
    ];
    return { modo: 'thread_report', tema: C.pick(threadTopics), premium: true };
  }

  // ─── GROK IMAGE (~8% chance) ───
  if (rand < 28) {
    C.log.info('🎨 Mode: GROK IMAGE REQUEST');
    const grokTopics = [
      'LUMA como un monstruo comiendo billetes', 'un politico PR genérico contando dinero en la oscuridad',
      'Puerto Rico como isla en llamas pero la gente bailando salsa', 'un robot hacker boricua con coquí en el hombro',
      'la factura de la luz de PR comparada con una montaña', 'un coquí gigante aplastando un edificio de LUMA',
      'Gillito como un hacker con hoodie en un server room tropical', 'una bandera de PR hecha de cables eléctricos rotos',
    ];
    return { modo: 'grok_image', tema: C.pick(grokTopics), premium: true };
  }

  // ─── ENGAGEMENT BAIT (~12% chance) — drives reply threads for monetization ───
  if (rand < 40) {
    C.log.info('💰 Mode: ENGAGEMENT BAIT');
    const engagementTopics = [
      '¿Cuál es peor: LUMA o la AEE?', '¿Estadidad, independencia o ELA? PELEEN',
      'El peor político en la historia de PR es ___', '¿Cuánto pagas de luz? Compara aquí',
      'Hot take: la comida de PR es mejor que ___', 'Rank: peores alcaldes de PR de todos los tiempos',
      'Pregunta seria: ¿por qué no nos vamos todos?', '¿Mejor chinchorro? Empiecen la guerra',
      '¿El reggaetón viejo o el nuevo? No wrong answers... mentira sí hay',
      'Si PR fuera una persona, ¿qué desorden mental tendría?',
      ...(P.engagement?.preguntar_al_publico?.ejemplos || [])
    ];
    return { modo: 'engagement_bait', tema: C.pick(engagementTopics), premium: true };
  }

  // ─── STANDARD MODES (remaining 60%) — use adaptive selection ───
  return C.selectModeAdaptiveForTime(P, prTime, history.getAll());
}


/* ═══════════════════════════════════════════════════════
   GENERATORS BY MODE
   ═══════════════════════════════════════════════════════ */

async function generateStandardTweet(modo, tema) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'x');
  const target   = C.shouldMentionTarget(P);
  const audience = C.shouldAskAudience(P);
  const hashtag  = C.buildHashtagInstruction(P, modo.modo);
  const antiRep  = C.buildAntiRepetitionContext(history.getTexts(20));
  const seed     = Math.random().toString(36).substring(2, 8);
  const temp     = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());
  const researchCtx = C.buildResearchContext(research);
  const ytCtx       = C.buildYouTubeContext(yt);

  let userPrompt = `[SEED:${seed}] MODO: ${modo.modo}\nTEMA: ${tema}`;
  if (target)   userPrompt += `\n\n🎯 MENCIONA a @${target.target} (${target.relacion}): ${target.tema}`;
  if (audience)  userPrompt += `\n\n❓ PREGUNTA AL PÚBLICO: "${audience}"`;
  userPrompt += hashtag + antiRep + researchCtx + ytCtx;
  userPrompt += `\n\nESCRIBE UN TWEET ORIGINAL. Solo el texto, máximo 275 caracteres.`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 200, temperature: temp, maxRetries: 3, backoffMs: 2000
  });
}

async function generateReconTweet(intel) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'x');
  const reconContext = getReconPrompt(intel);
  const antiRep     = C.buildAntiRepetitionContext(history.getTexts(15));
  const seed        = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] MODO: recon_drop
${reconContext}
${antiRep}

ESCRIBE UN TWEET de inteligencia/OSINT en tu estilo hacker boricua.
Máximo 275 caracteres. Hazlo IMPACTANTE, que la gente quiera compartir.
Incluye 1-2 emojis de hacker: 🕵️🚨📡💻🔓⚡`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 200, temperature: 1.1, maxRetries: 3, backoffMs: 2000
  });
}

async function generateGrokImageTweet(tema) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'x');
  const antiRep     = C.buildAntiRepetitionContext(history.getTexts(10));
  const seed        = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] MODO: grok_image

Vas a pedirle a @grok que genere una imagen satírica.
TEMA DE LA IMAGEN: ${tema}

Escribe un tweet que:
1. Empiece con tu observación/queja/trolleo en tu estilo callejero boricua
2. Termine taggeando @grok con el pedido de imagen en INGLÉS
3. Sea provocador y gracioso

FORMATO EJEMPLO:
"LUMA me cobró $400 este mes y se fue la luz 3 veces 🔌💀 @grok generate an image of a monster made of electric wires eating money in a tropical island"

Máximo 275 caracteres TOTAL (incluyendo el tag a @grok).
El pedido a @grok debe ser en inglés después del tag.
${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 220, temperature: 1.2, maxRetries: 3, backoffMs: 2000
  });
}

async function generateEngagementBait(tema) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'x');
  const antiRep     = C.buildAntiRepetitionContext(history.getTexts(15));
  const seed        = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] MODO: engagement_bait

OBJETIVO: Crear un tweet que EXPLOTE en replies.
Más replies = más engagement = más impresiones de usuarios verificados = más $.

TEMA/PREGUNTA: ${tema}

ESTRATEGIAS DE ENGAGEMENT (escoge 1-2):
- Pregunta polarizante con solo 2 opciones
- Hot take controversial pero gracioso
- "Fill in the blank" incompleto
- Ranking que la gente querrá corregir
- Comparación que provoca debate
- Reto o pregunta personal

Escríbelo en tu estilo Gillito callejero.
Que sea CORTO y PUNCHY — las preguntas cortas generan más replies.
Máximo 220 caracteres (deja espacio para que sea fácil de RT).
${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 180, temperature: 1.3, maxRetries: 3, backoffMs: 2000
  });
}

/**
 * Generate a thread (2-4 connected tweets).
 * Returns array of strings.
 */
async function generateThread(tema) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'x');
  const antiRep     = C.buildAntiRepetitionContext(history.getTexts(10));
  const seed        = Math.random().toString(36).substring(2, 8);
  const researchCtx = C.buildResearchContext(research);

  const userPrompt = `[SEED:${seed}] MODO: thread_report

Vas a crear un THREAD de 3 tweets conectados sobre:
TEMA: ${tema}
${researchCtx}

FORMATO — Responde EXACTAMENTE así (cada tweet separado por ===):
TWEET 1: El gancho — impactante, que la gente quiera leer más. Termina con "🧵 ABRE HILO:"
===
TWEET 2: La evidencia/data — hechos, números, contradicciones. Estilo expediente clasificado.
===
TWEET 3: El remate — conclusión brutal + call to action (RT, comenta, etc.)

REGLAS:
- Cada tweet MÁXIMO 275 caracteres
- Usa tu estilo hacker/callejero boricua
- Emojis de hacker: 🕵️🚨📡💻🔓⚡📋🎯
- Que cada tweet funcione TAMBIÉN solo, por si alguien ve uno solo
${antiRep}`;

  const raw = await C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 600, temperature: 1.1, maxRetries: 3, backoffMs: 2000
  });

  // Parse thread tweets
  const parts = raw.split(/={3,}/).map(p => p.trim()).filter(p => p.length > 10);
  if (parts.length < 2) {
    C.log.warn('Thread generation returned < 2 parts, falling back to single tweet');
    return null;
  }

  // Validate each part
  const validated = [];
  for (const part of parts.slice(0, 4)) { // max 4 tweets in thread
    let clean = C.cleanLLMOutput(part);
    // Remove "TWEET N:" prefix if LLM included it
    clean = clean.replace(/^TWEET\s*\d+\s*:\s*/i, '').trim();
    if (clean.length < 15) continue;
    if (clean.length > 280) clean = clean.substring(0, 277) + '...';
    validated.push(clean);
  }

  return validated.length >= 2 ? validated : null;
}


/* ═══════════════════════════════════════════════════════
   THREAD POSTING — Connected reply chain
   ═══════════════════════════════════════════════════════ */

async function postThread(tweets) {
  C.log.info(`🧵 Posting thread: ${tweets.length} tweets`);
  const posted = [];

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];

    // Security check each tweet
    const check = sec.processOutput(tweet);
    if (!check.safe) {
      C.log.warn(`🛡️ Thread tweet ${i + 1} blocked: ${check.blocked.join(', ')}`);
      continue;
    }

    let result;
    if (i === 0) {
      // First tweet: standalone post
      result = await C.xPost(check.text);
    } else if (posted.length > 0) {
      // Subsequent tweets: reply to previous
      result = await C.xReply(posted[posted.length - 1].id, check.text);
    } else {
      // First tweet was blocked, post this as standalone
      result = await C.xPost(check.text);
    }

    if (result.rateLimited) {
      C.log.warn(`Rate limited at tweet ${i + 1}/${tweets.length}`);
      break;
    }

    if (result.success) {
      posted.push({ id: result.id, text: check.text, index: i });
      C.log.ok(`   ✅ Tweet ${i + 1}/${tweets.length}: ${result.id}`);
      // Small delay between thread tweets to avoid spam detection
      if (i < tweets.length - 1) await C.sleep(2000);
    }
  }

  return posted;
}


/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */

async function main() {
  C.log.banner([
    '💎 GILLITO PREMIUM — Post to X v7.0',
    `🕐 ${prTime.hour}:${String(prTime.minute).padStart(2, '0')} ${prTime.dayName} (PR)`,
    `🕵️ Recon: ${hasReconIntel ? 'READY' : 'no intel'}`,
    `📰 Research: ${research ? 'LOADED' : 'none'}`,
    `🎬 YouTube: ${yt ? 'LOADED' : 'none'}`,
  ]);

  // Select mode
  const modo = selectPremiumMode(P, prTime, history);

  // Topic selection
  let tema = modo.tema;
  let fromResearch = false;

  // 40% chance to override topic with hot news (for non-premium-specific modes)
  if (!modo.premium && research?.quickTopics?.length && Math.random() < 0.4) {
    tema = C.pick(research.quickTopics);
    fromResearch = true;
    C.log.info(`📰 Tema de RESEARCH: "${tema}"`);
  } else if (!modo.premium) {
    tema = C.pickFreshestTopic(
      P[`temas_${modo.modo}`] || [modo.tema],
      history.getTexts(30)
    ) || modo.tema;
  }

  C.log.stat('Modo', `${modo.modo}${modo.adaptive ? ' (🧠 adaptive)' : ''}${modo.premium ? ' 💎' : ''}`);
  C.log.stat('Tema', `${tema}${fromResearch ? ' 📰' : ''}`);


  // ═══════════════════════════════════════════
  // ROUTE BY MODE
  // ═══════════════════════════════════════════

  // ─── THREAD REPORT ───
  if (modo.modo === 'thread_report') {
    const threadTweets = await generateThread(tema);

    if (threadTweets) {
      C.log.divider();
      threadTweets.forEach((t, i) => C.log.info(`🧵 [${i + 1}/${threadTweets.length}] (${t.length}ch): ${t}`));

      const posted = await postThread(threadTweets);

      if (posted.length > 0) {
        C.log.ok(`🧵 Thread posted: ${posted.length}/${threadTweets.length} tweets`);
        if (posted[0]) C.log.ok(`   https://twitter.com/i/status/${posted[0].id}`);

        history.add({
          text: posted.map(p => p.text).join(' | '),
          mode: 'thread_report', tema, premium: true,
          tweetId: posted[0]?.id, threadIds: posted.map(p => p.id),
          threadLength: posted.length, charLen: posted.reduce((s, p) => s + p.text.length, 0),
          fromResearch
        });
      }

      history.save();
      C.log.session();
      return;
    }

    // Thread generation failed — fall through to single tweet
    C.log.warn('Thread fallback → single tweet');
  }


  // ─── RECON DROP ───
  let intel = null;
  let tweetGenerator;

  if (modo.modo === 'recon_drop' && hasReconIntel) {
    intel = pickIntel({ count: 1, minJuiciness: 6 });
    if (intel.length > 0) {
      C.log.info(`🕵️ Intel: [${intel[0].juiciness}/10] ${intel[0].headline?.slice(0, 60)}`);
      tweetGenerator = () => generateReconTweet(intel);
    } else {
      C.log.warn('No qualifying intel → standard tweet');
      tweetGenerator = () => generateStandardTweet(modo, tema);
    }
  } else if (modo.modo === 'grok_image') {
    tweetGenerator = () => generateGrokImageTweet(tema);
  } else if (modo.modo === 'engagement_bait') {
    tweetGenerator = () => generateEngagementBait(tema);
  } else {
    tweetGenerator = () => generateStandardTweet(modo, tema);
  }


  // ─── GENERATE + PIPELINE ───
  const tweet = await C.generateWithPipeline(
    tweetGenerator,
    history,
    P.reglas?.max_caracteres || 280
  );

  C.log.divider();
  C.log.info(`📝 Tweet (${tweet.length}ch): ${tweet}`);

  // Security validation
  const check = sec.processOutput(tweet);
  if (!check.safe) {
    C.log.warn(`🛡️ Tweet BLOQUEADO: ${check.blocked.join(', ')}`);
    C.log.session();
    return;
  }

  // Post
  const result = await C.xPost(check.text);

  if (result.rateLimited) {
    C.log.warn('Rate limited');
  } else if (result.success) {
    C.log.ok(`Posteado: https://twitter.com/i/status/${result.id}`);

    // Mark recon intel as used
    if (intel?.length > 0 && modo.modo === 'recon_drop') {
      markUsed(intel);
      C.log.info('🕵️ Intel marked as used');
    }

    history.add({
      text: check.text,
      mode: modo.modo,
      tema,
      adaptive: !!modo.adaptive,
      premium: !!modo.premium,
      tweetId: result.id,
      charLen: check.text.length,
      fromResearch,
      hasGrokTag: check.text.includes('@grok'),
      hasIntel: modo.modo === 'recon_drop',
      isEngagementBait: modo.modo === 'engagement_bait',
    });
  }

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
