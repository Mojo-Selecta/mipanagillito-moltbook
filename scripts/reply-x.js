#!/usr/bin/env node
/**
 * Mi Pana Gillito — Reply on X v7.1 PREMIUM 💎 DIRTY EDITION
 * ═══════════════════════════════════════════
 * 💬 Premium reply strategy: algorithmic boost + monetization
 * 💀 DIRTY PERSONALITY — Gillito habla SUCIO en replies de X
 * 🛡️ Full security + output guard pipeline
 * 🌡️ Temp ceiling 1.1 | Normal range 0.85-0.95
 */

const path = require('path');
const C   = require('./lib/core');
const sec = C.sec;

C.initScript('reply-x-premium', 'x');
C.requireXCreds();

const P       = C.loadPersonality();
const idCache = C.createIdCache('.gillito-replied-ids.json');
const history = C.createHistory('.gillito-reply-history.json', 80);

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
    var guardOpts = { maxChars: opts.maxChars || 260 };
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
  dirty += 'RESPONDE SOLO con tu reply. NADA MÁS.\n';
  dirty += 'NO escribas explicaciones, NO repitas la pregunta, NO metas metadata.\n';
  dirty += 'Escribe EN ESPAÑOL. Si metes inglés, que sea slang natural o para tags (@grok).\n';
  dirty += 'MÁXIMO los caracteres que te pidan. Sé CONCISO y DIRECTO.\n';
  return dirty;
}

// 💎 Premium config
const MAX_REPLIES = 2;

// 🕵️ Recon intel
let hasReconIntel = false;
let pickIntel, markUsed, getReconPrompt;
try {
  const intelPicker = require(path.join(process.cwd(), 'lib', 'intel-picker'));
  pickIntel      = intelPicker.pickIntel;
  markUsed       = intelPicker.markUsed;
  getReconPrompt = intelPicker.getReconPrompt;
  hasReconIntel  = intelPicker.hasIntel();
} catch { /* optional */ }


/* ═══════════════════════════════════════════════════════
   REPLY TYPE SELECTION
   ═══════════════════════════════════════════════════════ */

function selectReplyType(tweetText, tipo) {
  const rand = Math.random() * 100;
  if (hasReconIntel && rand < 8 && /luma|apag|gobierno|politi|corrup|luz|tarifa|ice|deport|estadidad/i.test(tweetText.toLowerCase())) {
    return 'recon_intel';
  }
  if (rand < 18) return 'grok_image';
  if (rand < 33) return 'engagement_hook';
  return 'standard';
}


/* ═══════════════════════════════════════════════════════
   REPLY GENERATORS — ALL USE buildDirtyPrompt()
   ═══════════════════════════════════════════════════════ */

async function generateStandardReply(sanitizedText, author, tipo) {
  const systemPrompt = buildDirtyPrompt(C.buildReplySystemPrompt(P, tipo, author.username, 'x'));
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const temp = safeTemp(C.suggestTemperature(P.temperatura || 0.9, C.getJournal()));
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}\n\nRespóndele como Gillito SUCIO Y CALLEJERO. Con malas palabras.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 180, temperature: temp, maxRetries: 3, backoffMs: 2000 });
}

async function generateGrokImageReply(sanitizedText, author) {
  const systemPrompt = buildDirtyPrompt(C.buildReplySystemPrompt(P, 'normal', author.username, 'x'));
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}\n\nResponde SUCIO Y CALLEJERO y pide una imagen a @grok.\n1. Comentario gracioso/trolleo CON MALAS PALABRAS\n2. Taggea @grok pidiendo imagen RELACIONADA en INGLÉS\n\nFORMATO: "[respuesta sucia callejera] @grok generate [descripción en inglés]"\nMáximo 275 chars. Sé CREATIVO y SUCIO.`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 200, temperature: safeTemp(0.9), maxRetries: 3, backoffMs: 2000 });
}

async function generateReconReply(sanitizedText, author, intel) {
  const systemPrompt = buildDirtyPrompt(C.buildReplySystemPrompt(P, 'normal', author.username, 'x'));
  const reconContext = getReconPrompt(intel);
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}\n\nMODO HACKER SUCIO: Tienes intel relevante.\n${reconContext}\n\nResponde conectando su tweet con tu intel. Estilo callejero con MALAS PALABRAS.\n"Coño pana, casualmente hackié unos servers y mira lo que encontré sobre eso cabrón..."\nMáximo 275 chars.`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 200, temperature: safeTemp(0.9), maxRetries: 3, backoffMs: 2000 });
}

async function generateEngagementHook(sanitizedText, author) {
  const systemPrompt = buildDirtyPrompt(C.buildReplySystemPrompt(P, 'normal', author.username, 'x'));
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}\n\nOBJETIVO: Responde SUCIO Y CALLEJERO de forma que OBLIGUES a responderte.\n- Pregunta directa que no pueden ignorar\n- Hot take con malas palabras\n- Reta su opinión\n- Acusa cariñosamente de algo absurdo\n\nMáximo 260 chars. PROVOCA respuesta con vocabulario de CALLE.`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 180, temperature: safeTemp(0.95), maxRetries: 3, backoffMs: 2000 });
}


/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */

async function main() {
  const userId = await C.xGetMe();

  C.log.banner([
    '💎💀 GILLITO PREMIUM — Reply on X v7.1 DIRTY EDITION',
    `🛡️ Output Guard: ${guard ? 'ACTIVE' : 'MISSING'} | Temp ceiling: ${MAX_TEMPERATURE}`,
    `💀 Dirty Prompt: ACTIVE`,
    `🕵️ Recon: ${hasReconIntel ? 'READY' : 'no intel'}`,
  ]);

  C.log.stat('User ID', userId);

  const since = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
  const mentionsData = await C.xGetMentions(userId, since);
  const mentions = mentionsData.data || [];
  const users = {};
  (mentionsData.includes?.users || []).forEach(u => { users[u.id] = u; });

  C.log.stat('Menciones total', mentions.length);

  const newMentions = mentions.filter(t => !idCache.has(t.id) && t.author_id !== userId);
  C.log.stat('Nuevas', newMentions.length);

  if (!newMentions.length) { C.log.info('Sin menciones nuevas'); C.log.session(); return; }

  let replied = 0;
  let guardBlocked = 0;

  for (const tweet of newMentions) {
    if (replied >= MAX_REPLIES) break;

    const author = users[tweet.author_id] || { username: 'desconocido' };
    const tipo = C.isLikelyBot(author) ? 'bot' : C.isSpecialTarget(P, author.username) ? 'special' : 'normal';

    C.log.divider();
    C.log.info(`💬 @${author.username} (${tipo}): "${sec.redactSecrets(tweet.text.substring(0, 60))}..."`);

    // 🛡️ Security
    const budget = sec.checkMentionBudget(tweet.author_id, author.username);
    if (!budget.allowed) { C.log.warn(budget.reason); idCache.mark(tweet.id); continue; }

    const secCheck = sec.processExternalContent(tweet.text, tweet.author_id, author.username, 'x-mention');
    if (!secCheck.proceed) { C.log.warn(secCheck.reason); idCache.mark(tweet.id); continue; }
    if (secCheck.riskScore > 0) C.log.info(`🛡️ Riesgo: ${secCheck.riskScore}/100${secCheck.truncated ? ' (truncado)' : ''}`);

    // Reply type + generate
    const replyType = selectReplyType(tweet.text, tipo);
    C.log.info(`💎 Reply type: ${replyType}`);

    let replyGenerator;
    let replyIntel = null;

    switch (replyType) {
      case 'grok_image':
        replyGenerator = () => generateGrokImageReply(secCheck.sanitized, author);
        break;
      case 'recon_intel':
        replyIntel = pickIntel({ count: 1, minJuiciness: 5 });
        if (replyIntel.length > 0) {
          C.log.info(`🕵️ Intel: [${replyIntel[0].juiciness}/10] ${replyIntel[0].headline?.slice(0, 50)}`);
          replyGenerator = () => generateReconReply(secCheck.sanitized, author, replyIntel);
        } else { replyGenerator = () => generateEngagementHook(secCheck.sanitized, author); }
        break;
      case 'engagement_hook':
        replyGenerator = () => generateEngagementHook(secCheck.sanitized, author);
        break;
      default:
        replyGenerator = () => generateStandardReply(secCheck.sanitized, author, tipo);
    }

    const reply = await C.generateWithPipeline(replyGenerator, history, P.reglas?.max_caracteres_reply || 260);

    const safe = secureOutput(reply, 'reply @' + author.username, { maxChars: 260 });
    if (!safe) { guardBlocked++; continue; }

    C.log.info(`📝 Reply (${safe.length}ch): ${safe}`);

    const result = await C.xReply(tweet.id, safe);

    if (result.rateLimited) { C.log.warn('Rate limited — parando'); break; }

    if (result.success) {
      C.log.ok(`✅ Respondido: ${result.id}`);
      idCache.mark(tweet.id);
      if (replyIntel?.length > 0 && replyType === 'recon_intel') markUsed(replyIntel);
      history.add({ text: safe, replyTo: tweet.id, replyType, authorType: tipo, author: author.username, originalText: tweet.text.substring(0, 100), charLen: safe.length, riskScore: secCheck.riskScore, premium: true, hasGrokTag: safe.includes('@grok'), hasIntel: replyType === 'recon_intel' });
      replied++;
    }
  }

  C.log.stat('Replies enviados', `${replied}/${MAX_REPLIES}`);
  if (guardBlocked > 0) C.log.stat('Guard blocked', guardBlocked);
  idCache.save(); history.save(); C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
