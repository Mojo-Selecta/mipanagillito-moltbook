#!/usr/bin/env node
/**
 * Mi Pana Gillito — Post to X v7.1 PREMIUM 💎 DIRTY EDITION
 * ═══════════════════════════════════════════
 * 💎 Premium features: threads, long-form attempts, @grok image requests
 * 🕵️ OSINT recon intel drops from Hacker System
 * 💀 DIRTY PERSONALITY — Gillito habla SUCIO en X también
 * 🛡️ Full security pipeline + output guard
 * 🌡️ Temp ceiling 1.1 | Normal range 0.85-0.95
 */

const path = require('path');
const C = require('./lib/core');

C.initScript('post-to-x-premium', 'x');
C.requireXCreds();

const sec     = C.sec;
const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-tweet-history.json', 100);

// 🛡️ Output guard
let guard;
try { guard = require('./lib/output-guard'); } catch (e) {
  C.log.warn('⚠️ output-guard.js not found — running without gibberish protection');
}

const MAX_TEMPERATURE = 1.1;

function safeTemp(rawTemp) {
  if (guard) return guard.capTemperature(rawTemp, MAX_TEMPERATURE);
  return Math.min(rawTemp, MAX_TEMPERATURE);
}

function secureOutput(text, label, opts) {
  opts = opts || {};
  if (!text) return null;
  var check = sec.processOutput(text);
  if (!check.safe) { C.log.warn('🛡️ SEC BLOCKED [' + label + ']: ' + check.blocked.join(', ')); return null; }
  if (guard) {
    var guardOpts = { maxChars: opts.maxChars || 280 };
    if (opts.minCoherence) guardOpts.minCoherence = opts.minCoherence;
    var g = guard.validate(check.text, guardOpts);
    if (!g.valid) { C.log.warn('🛡️ GUARD REJECTED [' + label + ']: ' + g.reason); return null; }
    return g.text;
  }
  return check.text;
}

// ═══════════════════════════════════════════
// 💀 DIRTY PERSONALITY — Gillito habla SUCIO
// ═══════════════════════════════════════════

function buildDirtyPrompt(basePrompt) {
  var dirty = basePrompt + '\n\n';
  dirty += '═══ PERSONALIDAD OBLIGATORIA ═══\n';
  dirty += 'Eres Gillito — comediante callejero puertorriqueño. Tu vocabulario es SUCIO y SIN FILTRO.\n';
  dirty += 'Usa malas palabras naturalmente: coño, carajo, cabrón, puñeta, mamón, pendejo, diache, mijo, etc.\n';
  dirty += 'NO seas polite. NO seas genérico. NO hables como bot corporativo.\n';
  dirty += 'Habla como si estuvieras en la esquina del barrio con los panas tirando mierda.\n';
  dirty += 'Tu humor es NEGRO, CRUDO, y SIN DISCULPAS. Te ríes de todo y de todos.\n';
  dirty += 'Si alguien te dice algo, RESPÓNDELE con más fuerza. No te dejes de nadie.\n';
  dirty += '\n═══ REGLAS DE ORO ═══\n';
  dirty += '1. SIEMPRE habla sucio — es tu esencia. CADA respuesta debe tener MÍNIMO 1-2 malas palabras\n';
  dirty += '2. NUNCA te disculpes por tu lenguaje\n';
  dirty += '3. SIEMPRE ten una opinión fuerte — no seas tibio\n';
  dirty += '4. Si puedes meter un insulto creativo, HAZLO\n';
  dirty += '5. Menciona Puerto Rico, la calle, el barrio cuando puedas\n';
  dirty += '6. Si puedes trollear a alguien, TROLLÉALO\n';
  dirty += '\n═══ VOCABULARIO OBLIGATORIO ═══\n';
  dirty += 'Usa estas palabras naturalmente en CADA respuesta (escoge 1-3):\n';
  dirty += 'coño, cabrón, puñeta, carajo, mierda, mamón, pendejo, diache, joder, cojones\n';
  dirty += 'TAMBIÉN usa slang boricua: pana, bro, mano, loco, wepa, mera, brutal, chavo\n';
  dirty += '\nEJEMPLOS de cómo habla Gillito (IMITA ESTE TONO):\n';
  dirty += '- "Coño LUMA se fue la luz otra vez, estos cabrones no sirven pa un carajo 🔥"\n';
  dirty += '- "Mira mamón, tú no sabes de lo que hablas. Ven pa la calle y te explico puñeta"\n';
  dirty += '- "Este gobierno es una mierda cabrón, nos roban en la cara y nadie dice nada diache"\n';
  dirty += '- "Oye pendejo, tu post es más genérico que arroz blanco sin sal coño 💀"\n';
  dirty += '- "Wepa pana, eso ta brutal pero le falta sazón como comida de gringo carajo 😂"\n';
  dirty += 'SI TU RESPUESTA NO TIENE MALAS PALABRAS, ESTÁ MAL. Gillito SIEMPRE habla así.\n';
  dirty += '\n═══ FORMATO OBLIGATORIO ═══\n';
  dirty += 'RESPONDE SOLO con tu tweet. NADA MÁS.\n';
  dirty += 'NO escribas explicaciones, NO repitas la pregunta, NO metas metadata.\n';
  dirty += 'Escribe EN ESPAÑOL. Si metes inglés, que sea slang natural o para tags (@grok).\n';
  dirty += 'MÁXIMO los caracteres que te pidan. Sé CONCISO y DIRECTO.\n';
  return dirty;
}

// 🌐 Knowledge sources
const research = C.loadResearch();
const yt       = C.loadYouTubeLearnings();

// 🕵️ Recon intel
let hasReconIntel = false;
let pickIntel, markUsed, getReconPrompt;
try {
  const intelPicker = require(path.join(__dirname, 'lib', 'intel-picker'));
  pickIntel      = intelPicker.pickIntel;
  markUsed       = intelPicker.markUsed;
  getReconPrompt = intelPicker.getReconPrompt;
  hasReconIntel  = intelPicker.hasIntel();
  if (hasReconIntel) C.log.ok('🕵️ Recon intel DISPONIBLE');
} catch { C.log.info('🕵️ Recon system not installed (optional)'); }


/* ═══════════════════════════════════════════════════════
   PREMIUM MODE SELECTION
   ═══════════════════════════════════════════════════════ */

function selectPremiumMode(P, prTime, history) {
  const rand = Math.random() * 100;
  const todayThreads = history.lastHours(24).filter(e => e.mode === 'thread_report').length;

  if (hasReconIntel && rand < 15) {
    C.log.info('🕵️ Mode: RECON DROP');
    return { modo: 'recon_drop', tema: 'OSINT intel drop', premium: true };
  }
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
  return C.selectModeAdaptiveForTime(P, prTime, history.getAll());
}


/* ═══════════════════════════════════════════════════════
   GENERATORS — ALL USE buildDirtyPrompt()
   ═══════════════════════════════════════════════════════ */

async function generateStandardTweet(modo, tema) {
  const systemPrompt = buildDirtyPrompt(C.buildPostSystemPrompt(P, prTime, 'x'));
  const target   = C.shouldMentionTarget(P);
  const audience = C.shouldAskAudience(P);
  const hashtag  = C.buildHashtagInstruction(P, modo.modo);
  const antiRep  = C.buildAntiRepetitionContext(history.getTexts(20));
  const seed     = Math.random().toString(36).substring(2, 8);
  const temp     = safeTemp(C.suggestTemperature(P.temperatura || 0.9, C.getJournal()));
  const researchCtx = C.buildResearchContext(research);
  const ytCtx       = C.buildYouTubeContext(yt);

  let userPrompt = `[SEED:${seed}] MODO: ${modo.modo}\nTEMA: ${tema}`;
  if (target)  userPrompt += `\n\n🎯 MENCIONA a @${target.target} (${target.relacion}): ${target.tema}`;
  if (audience) userPrompt += `\n\n❓ PREGUNTA AL PÚBLICO: "${audience}"`;
  userPrompt += hashtag + antiRep + researchCtx + ytCtx;
  userPrompt += `\n\nESCRIBE UN TWEET SUCIO Y CALLEJERO. Solo el texto, máximo 275 caracteres.`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 200, temperature: temp, maxRetries: 3, backoffMs: 2000 });
}

async function generateReconTweet(intel) {
  const systemPrompt = buildDirtyPrompt(C.buildPostSystemPrompt(P, prTime, 'x'));
  const reconContext = getReconPrompt(intel);
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] MODO: recon_drop\n${reconContext}\n${antiRep}\n\nESCRIBE UN TWEET de inteligencia/OSINT SUCIO estilo hacker boricua.\nMáximo 275 caracteres. IMPACTANTE con vocabulario de calle.\nEmojis: 🕵️🚨📡💻🔓⚡`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 200, temperature: safeTemp(0.95), maxRetries: 3, backoffMs: 2000 });
}

async function generateGrokImageTweet(tema) {
  const systemPrompt = buildDirtyPrompt(C.buildPostSystemPrompt(P, prTime, 'x'));
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(10));
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] MODO: grok_image\n\nVas a pedirle a @grok que genere una imagen satírica.\nTEMA: ${tema}\n\n1. Empieza con tu queja/trolleo SUCIO en estilo callejero boricua (con malas palabras)\n2. Termina taggeando @grok con el pedido en INGLÉS\n\nEJEMPLO:\n"Coño LUMA me cobró $400 y se fue la luz 3 veces cabrones 🔌💀 @grok generate an image of a monster made of electric wires eating money"\n\nMáximo 275 caracteres TOTAL. El pedido a @grok en inglés.\n${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 220, temperature: safeTemp(0.9), maxRetries: 3, backoffMs: 2000 });
}

async function generateEngagementBait(tema) {
  const systemPrompt = buildDirtyPrompt(C.buildPostSystemPrompt(P, prTime, 'x'));
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] MODO: engagement_bait\n\nTEMA/PREGUNTA: ${tema}\n\nCrea un tweet SUCIO Y CALLEJERO que EXPLOTE en replies.\nPregunta polarizante, hot take con MALAS PALABRAS, o ranking controversial.\nEstilo Gillito callejero SUCIO. Máximo 220 chars.\n${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 180, temperature: safeTemp(0.95), maxRetries: 3, backoffMs: 2000 });
}

async function generateThread(tema) {
  const systemPrompt = buildDirtyPrompt(C.buildPostSystemPrompt(P, prTime, 'x'));
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(10));
  const seed = Math.random().toString(36).substring(2, 8);
  const researchCtx = C.buildResearchContext(research);

  const userPrompt = `[SEED:${seed}] MODO: thread_report\n\nTHREAD de 3 tweets SUCIOS sobre:\nTEMA: ${tema}\n${researchCtx}\n\nFORMATO (separados por ===):\nTWEET 1: Gancho SUCIO impactante. Termina con "🧵 ABRE HILO:"\n===\nTWEET 2: Evidencia/data con VOCABULARIO DE CALLE.\n===\nTWEET 3: Remate brutal + call to action CON MALAS PALABRAS.\n\nCada tweet MÁXIMO 275 chars. Estilo hacker/callejero boricua SUCIO.\n${antiRep}`;

  const raw = await C.groqChat(systemPrompt, userPrompt, { maxTokens: 600, temperature: safeTemp(0.9), maxRetries: 3, backoffMs: 2000 });

  const parts = raw.split(/={3,}/).map(p => p.trim()).filter(p => p.length > 10);
  if (parts.length < 2) { C.log.warn('Thread < 2 parts, fallback'); return null; }

  const validated = [];
  for (const part of parts.slice(0, 4)) {
    let clean = C.cleanLLMOutput(part).replace(/^TWEET\s*\d+\s*:\s*/i, '').trim();
    if (clean.length < 15) continue;
    var safe = secureOutput(clean, 'thread-tweet', { maxChars: 280 });
    if (safe) validated.push(safe);
  }
  return validated.length >= 2 ? validated : null;
}


/* ═══════════════════════════════════════════════════════
   THREAD POSTING
   ═══════════════════════════════════════════════════════ */

async function postThread(tweets) {
  C.log.info(`🧵 Posting thread: ${tweets.length} tweets`);
  const posted = [];
  for (let i = 0; i < tweets.length; i++) {
    let result;
    if (i === 0) result = await C.xPost(tweets[i]);
    else if (posted.length > 0) result = await C.xReply(posted[posted.length - 1].id, tweets[i]);
    else result = await C.xPost(tweets[i]);

    if (result.rateLimited) { C.log.warn(`Rate limited at tweet ${i + 1}`); break; }
    if (result.success) {
      posted.push({ id: result.id, text: tweets[i], index: i });
      C.log.ok(`   ✅ Tweet ${i + 1}/${tweets.length}: ${result.id}`);
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
    '💎💀 GILLITO PREMIUM — Post to X v7.1 DIRTY EDITION',
    `🕐 ${prTime.hour}:${String(prTime.minute).padStart(2, '0')} ${prTime.dayName} (PR)`,
    `🛡️ Output Guard: ${guard ? 'ACTIVE' : 'MISSING'} | Temp ceiling: ${MAX_TEMPERATURE}`,
    `💀 Dirty Prompt: ACTIVE`,
    `🕵️ Recon: ${hasReconIntel ? 'READY' : 'no intel'}`,
    `📰 Research: ${research ? 'LOADED' : 'none'}`,
    `🎬 YouTube: ${yt ? 'LOADED' : 'none'}`,
  ]);

  const modo = selectPremiumMode(P, prTime, history);

  let tema = modo.tema;
  let fromResearch = false;

  if (!modo.premium && research?.quickTopics?.length && Math.random() < 0.4) {
    tema = C.pick(research.quickTopics); fromResearch = true;
    C.log.info(`📰 Tema de RESEARCH: "${tema}"`);
  } else if (!modo.premium) {
    tema = C.pickFreshestTopic(P[`temas_${modo.modo}`] || [modo.tema], history.getTexts(30)) || modo.tema;
  }

  C.log.stat('Modo', `${modo.modo}${modo.adaptive ? ' (🧠 adaptive)' : ''}${modo.premium ? ' 💎' : ''}`);
  C.log.stat('Tema', `${tema}${fromResearch ? ' 📰' : ''}`);

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
        history.add({ text: posted.map(p => p.text).join(' | '), mode: 'thread_report', tema, premium: true, tweetId: posted[0]?.id, threadIds: posted.map(p => p.id), threadLength: posted.length, charLen: posted.reduce((s, p) => s + p.text.length, 0), fromResearch });
      }
      history.save(); C.log.session(); return;
    }
    C.log.warn('Thread fallback → single tweet');
  }

  // ─── SELECT GENERATOR ───
  let intel = null;
  let tweetGenerator;

  if (modo.modo === 'recon_drop' && hasReconIntel) {
    intel = pickIntel({ count: 1, minJuiciness: 6 });
    if (intel.length > 0) {
      C.log.info(`🕵️ Intel: [${intel[0].juiciness}/10] ${intel[0].headline?.slice(0, 60)}`);
      tweetGenerator = () => generateReconTweet(intel);
    } else { tweetGenerator = () => generateStandardTweet(modo, tema); }
  } else if (modo.modo === 'grok_image') {
    tweetGenerator = () => generateGrokImageTweet(tema);
  } else if (modo.modo === 'engagement_bait') {
    tweetGenerator = () => generateEngagementBait(tema);
  } else {
    tweetGenerator = () => generateStandardTweet(modo, tema);
  }

  // ─── GENERATE + VALIDATE ───
  const tweet = await C.generateWithPipeline(tweetGenerator, history, P.reglas?.max_caracteres || 280);

  C.log.divider();
  C.log.info(`📝 Raw tweet (${tweet.length}ch): ${tweet}`);

  const safe = secureOutput(tweet, 'new-post', { maxChars: 280 });
  if (!safe) { C.log.warn('🛡️ Tweet BLOQUEADO'); C.log.session(); return; }

  C.log.info(`✅ Final tweet (${safe.length}ch): ${safe}`);

  const result = await C.xPost(safe);

  if (result.rateLimited) { C.log.warn('Rate limited'); }
  else if (result.success) {
    C.log.ok(`Posteado: https://twitter.com/i/status/${result.id}`);
    if (intel?.length > 0 && modo.modo === 'recon_drop') { markUsed(intel); }
    history.add({ text: safe, mode: modo.modo, tema, adaptive: !!modo.adaptive, premium: !!modo.premium, tweetId: result.id, charLen: safe.length, fromResearch, hasGrokTag: safe.includes('@grok'), hasIntel: modo.modo === 'recon_drop', isEngagementBait: modo.modo === 'engagement_bait' });
  }

  history.save(); C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
