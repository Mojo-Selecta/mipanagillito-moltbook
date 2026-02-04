#!/usr/bin/env node
/**
 * Mi Pana Gillito — Reply on X v7.0 PREMIUM 💎
 * ═══════════════════════════════════════════
 * 💬 Premium reply strategy: algorithmic boost + monetization
 * 🎨 @grok image replies for high-engagement targets
 * 🕵️ Recon-powered replies (when relevant intel matches topic)
 * 📈 Increased reply budget (Premium accounts get priority)
 * 🛡️ Full security + output guard pipeline
 *
 * PREMIUM REPLY STRATEGY (FREE API TIER):
 * ─────────────────────────────────────────
 * Premium replies get algorithmic priority in conversation threads.
 * Budget: max 2 replies/cycle × ~5 cycles/day = ~10 replies/day
 * Combined with ~6 posts/day = ~16 total (limit: 17)
 *
 * Reply types:
 *  1. STANDARD — Classic Gillito reply (humor, trolleo, support)
 *  2. GROK_IMAGE — Reply with @grok image request (~10% of replies)
 *  3. RECON_INTEL — Drop relevant intel in reply (~8% when available)
 *  4. ENGAGEMENT_HOOK — Reply designed to bait THEM to reply back
 */

const path = require('path');
const C   = require('./lib/core');
const sec = C.sec;

C.initScript('reply-x-premium', 'x');
C.requireXCreds();

const P       = C.loadPersonality();
const idCache = C.createIdCache('.gillito-replied-ids.json');
const history = C.createHistory('.gillito-reply-history.json', 80);

// 🛡️ Output guard — prevents token soup / gibberish
let guard;
try {
  guard = require('./lib/output-guard');
} catch (e) {
  C.log.warn('⚠️ output-guard.js not found — running without gibberish protection');
}

// 🌡️ Temperature ceiling
const MAX_TEMPERATURE = 1.1;

/**
 * Safe temperature — caps at MAX_TEMPERATURE to prevent token soup
 */
function safeTemp(rawTemp) {
  if (guard) return guard.capTemperature(rawTemp, MAX_TEMPERATURE);
  return Math.min(rawTemp, MAX_TEMPERATURE);
}

/**
 * Two-stage output validation: security + gibberish guard
 */
function secureOutput(text, label, opts) {
  opts = opts || {};
  if (!text) return null;

  // Stage 1: Security (secrets, banned patterns)
  var check = sec.processOutput(text);
  if (!check.safe) {
    C.log.warn('🛡️ SEC BLOCKED [' + label + ']: ' + check.blocked.join(', '));
    return null;
  }

  // Stage 2: Output guard (gibberish, length, coherence)
  if (guard) {
    var guardOpts = { maxChars: opts.maxChars || 260 };
    if (opts.minCoherence) guardOpts.minCoherence = opts.minCoherence;
    var g = guard.validate(check.text, guardOpts);
    if (!g.valid) {
      C.log.warn('🛡️ GUARD REJECTED [' + label + ']: ' + g.reason);
      if (g.text) C.log.warn('   Preview: ' + g.text.substring(0, 100) + '...');
      return null;
    }
    return g.text;
  }

  // No guard — just return security-cleaned text
  return check.text;
}

// 💎 Premium features with free API budget (17 tweets/24h total)
const MAX_REPLIES = 2;  // Conservative: 2 replies × ~5 cycles = ~10/day → leaves room for 6 posts

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
  const lower = tweetText.toLowerCase();

  // If the mention talks about LUMA/politics/PR issues AND we have intel → recon reply
  if (hasReconIntel && rand < 8 &&
      /luma|apag|gobierno|politi|corrup|luz|tarifa|ice|deport|estadidad/i.test(lower)) {
    return 'recon_intel';
  }

  // Grok image replies (~10%) — great for engagement
  if (rand < 18) return 'grok_image';

  // Engagement hook (~15%) — designed to make them reply back
  if (rand < 33) return 'engagement_hook';

  // Standard reply (67%)
  return 'standard';
}


/* ═══════════════════════════════════════════════════════
   REPLY GENERATORS
   ═══════════════════════════════════════════════════════ */

async function generateStandardReply(sanitizedText, author, tipo) {
  const systemPrompt = C.buildReplySystemPrompt(P, tipo, author.username, 'x');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const temp = safeTemp(C.suggestTemperature(P.temperatura || 0.9, C.getJournal()));
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}\n\nRespóndele como Gillito.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 180, temperature: temp, maxRetries: 3, backoffMs: 2000
  });
}

async function generateGrokImageReply(sanitizedText, author) {
  const systemPrompt = C.buildReplySystemPrompt(P, 'normal', author.username, 'x');
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}

MODO ESPECIAL: Responde Y pide una imagen a @grok.
1. Haz un comentario gracioso/trolleo sobre lo que dijo
2. Luego taggea @grok pidiendo una imagen RELACIONADA al tema

FORMATO: "[tu respuesta callejera] @grok generate [descripción en inglés]"

El pedido a @grok DEBE ser en inglés.
Máximo 275 caracteres TOTAL.
Sé CREATIVO con la imagen — algo absurdo, exagerado, satírico.`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 200, temperature: safeTemp(0.9), maxRetries: 3, backoffMs: 2000
  });
}

async function generateReconReply(sanitizedText, author, intel) {
  const systemPrompt = C.buildReplySystemPrompt(P, 'normal', author.username, 'x');
  const reconContext = getReconPrompt(intel);
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}

MODO HACKER: Tienes intel relevante al tema. Úsalo en tu reply.
${reconContext}

Responde conectando su tweet con tu intel.
Estilo: "Pana, casualmente hackié unos servers y mira lo que encontré sobre eso..."
Máximo 275 caracteres.`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 200, temperature: safeTemp(0.9), maxRetries: 3, backoffMs: 2000
  });
}

async function generateEngagementHook(sanitizedText, author) {
  const systemPrompt = C.buildReplySystemPrompt(P, 'normal', author.username, 'x');
  const seed = Math.random().toString(36).substring(2, 8);

  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}

OBJETIVO: Responde de forma que OBLIGUES a @${author.username} a responderte de vuelta.
Estrategias:
- Haz una pregunta directa que no pueden ignorar
- Reta su opinión con un hot take
- Cuenta una historia incompleta ("te digo la otra parte si me contestas")
- Lanza un dato controversial que van a querer debatir
- Acusa CARIÑOSAMENTE de algo absurdo

Cada reply-back de ellos = más thread = más impresiones = más reach.
Máximo 260 caracteres. PROVOCA respuesta.`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 180, temperature: safeTemp(0.95), maxRetries: 3, backoffMs: 2000
  });
}


/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */

async function main() {
  const userId = await C.xGetMe();

  C.log.banner([
    '💎 GILLITO PREMIUM — Reply on X v7.0',
    `🛡️ Output Guard: ${guard ? 'ACTIVE' : 'MISSING'} | Temp ceiling: ${MAX_TEMPERATURE}`,
    `🕵️ Recon: ${hasReconIntel ? 'READY' : 'no intel'}`,
  ]);

  C.log.stat('User ID', userId);

  // Lookback 5 hours for mentions
  const since = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
  const mentionsData = await C.xGetMentions(userId, since);
  const mentions = mentionsData.data || [];
  const users = {};
  (mentionsData.includes?.users || []).forEach(u => { users[u.id] = u; });

  C.log.stat('Menciones total', mentions.length);

  const newMentions = mentions.filter(t => !idCache.has(t.id) && t.author_id !== userId);
  C.log.stat('Nuevas', newMentions.length);

  if (!newMentions.length) {
    C.log.info('Sin menciones nuevas');
    C.log.session();
    return;
  }

  let replied = 0;
  let guardBlocked = 0;

  for (const tweet of newMentions) {
    if (replied >= MAX_REPLIES) break;

    const author = users[tweet.author_id] || { username: 'desconocido' };
    const tipo = C.isLikelyBot(author) ? 'bot'
               : C.isSpecialTarget(P, author.username) ? 'special' : 'normal';

    C.log.divider();
    C.log.info(`💬 @${author.username} (${tipo}): "${sec.redactSecrets(tweet.text.substring(0, 60))}..."`);

    // ═══ 🛡️ SECURITY PIPELINE ═══
    const budget = sec.checkMentionBudget(tweet.author_id, author.username);
    if (!budget.allowed) {
      C.log.warn(budget.reason);
      idCache.mark(tweet.id);
      continue;
    }

    const secCheck = sec.processExternalContent(
      tweet.text, tweet.author_id, author.username, 'x-mention'
    );
    if (!secCheck.proceed) {
      C.log.warn(secCheck.reason);
      idCache.mark(tweet.id);
      continue;
    }
    if (secCheck.riskScore > 0) {
      C.log.info(`🛡️ Riesgo: ${secCheck.riskScore}/100${secCheck.truncated ? ' (truncado)' : ''}`);
    }

    // ═══ SELECT REPLY TYPE ═══
    const replyType = selectReplyType(tweet.text, tipo);
    C.log.info(`💎 Reply type: ${replyType}`);

    // ═══ GENERATE REPLY ═══
    let replyGenerator;
    let replyIntel = null;

    switch (replyType) {
      case 'grok_image':
        replyGenerator = () => generateGrokImageReply(secCheck.sanitized, author);
        break;

      case 'recon_intel':
        replyIntel = pickIntel({ count: 1, minJuiciness: 5 });
        if (replyIntel.length > 0) {
          C.log.info(`🕵️ Intel for reply: [${replyIntel[0].juiciness}/10] ${replyIntel[0].headline?.slice(0, 50)}`);
          replyGenerator = () => generateReconReply(secCheck.sanitized, author, replyIntel);
        } else {
          replyGenerator = () => generateEngagementHook(secCheck.sanitized, author);
        }
        break;

      case 'engagement_hook':
        replyGenerator = () => generateEngagementHook(secCheck.sanitized, author);
        break;

      default:
        replyGenerator = () => generateStandardReply(secCheck.sanitized, author, tipo);
    }

    const reply = await C.generateWithPipeline(
      replyGenerator,
      history,
      P.reglas?.max_caracteres_reply || 260
    );

    // ═══ TWO-STAGE VALIDATION ═══
    const safe = secureOutput(reply, 'reply @' + author.username, { maxChars: 260 });
    if (!safe) {
      guardBlocked++;
      continue;
    }

    C.log.info(`📝 Reply (${safe.length}ch): ${safe}`);

    // ═══ POST ═══
    const result = await C.xReply(tweet.id, safe);

    if (result.rateLimited) {
      C.log.warn('Rate limited — parando');
      break;
    }

    if (result.success) {
      C.log.ok(`✅ Respondido: ${result.id}`);
      idCache.mark(tweet.id);

      // Mark recon intel as used if applicable
      if (replyIntel?.length > 0 && replyType === 'recon_intel') {
        markUsed(replyIntel);
      }

      history.add({
        text: safe,
        replyTo: tweet.id,
        replyType,
        authorType: tipo,
        author: author.username,
        originalText: tweet.text.substring(0, 100),
        charLen: safe.length,
        riskScore: secCheck.riskScore,
        premium: true,
        hasGrokTag: safe.includes('@grok'),
        hasIntel: replyType === 'recon_intel',
      });
      replied++;
    }
  }

  C.log.stat('Replies enviados', `${replied}/${MAX_REPLIES}`);
  if (guardBlocked > 0) C.log.stat('Guard blocked', guardBlocked);
  idCache.save();
  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
