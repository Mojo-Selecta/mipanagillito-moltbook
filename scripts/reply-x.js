#!/usr/bin/env node
/**
 * Mi Pana Gillito — Reply on X v6.2 🛡️
 * ═══════════════════════════════════════════
 * 💬 Responde menciones en X/Twitter
 * 🧠 Detección inteligente de tipo (bot/special/human)
 * 📊 Dual memory: IDs + contenido enriquecido
 * 🛡️ Security: input sanitization, mention budget, output validation
 */
const C   = require('./lib/core');
const sec = C.sec;  // 🛡️ Security module

C.initScript('reply-x', 'x');
C.requireXCreds();

const P       = C.loadPersonality();
const idCache = C.createIdCache('.gillito-replied-ids.json');
const history = C.createHistory('.gillito-reply-history.json', 80);

const MAX_REPLIES = 2;

async function generateReply(sanitizedText, author, tipo) {
  const systemPrompt = C.buildReplySystemPrompt(P, tipo, author.username, 'x');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());
  const seed = Math.random().toString(36).substring(2, 8);

  // 🛡️ sanitizedText already wrapped by security module
  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n${sanitizedText}\n\nRespóndele como Gillito.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 180, temperature: temp, maxRetries: 3, backoffMs: 2000
  });
}

async function main() {
  const userId = await C.xGetMe();
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

  for (const tweet of newMentions) {
    if (replied >= MAX_REPLIES) break;

    const author = users[tweet.author_id] || { username: 'desconocido' };
    const tipo = C.isLikelyBot(author) ? 'bot'
               : C.isSpecialTarget(P, author.username) ? 'special' : 'normal';

    C.log.divider();
    C.log.info(`💬 @${author.username} (${tipo}): "${sec.redactSecrets(tweet.text.substring(0, 60))}..."`);

    // ═══ 🛡️ SECURITY PIPELINE ═══

    // 1. Check mention budget (anti-spam / budget drain protection)
    const budget = sec.checkMentionBudget(tweet.author_id, author.username);
    if (!budget.allowed) {
      C.log.warn(budget.reason);
      idCache.mark(tweet.id);  // Mark as seen so we don't retry
      continue;
    }

    // 2. Sanitize + detect injection in external content
    const secCheck = sec.processExternalContent(
      tweet.text,
      tweet.author_id,
      author.username,
      'x-mention'
    );

    if (!secCheck.proceed) {
      C.log.warn(secCheck.reason);
      idCache.mark(tweet.id);
      continue;
    }

    if (secCheck.riskScore > 0) {
      C.log.info(`🛡️ Riesgo: ${secCheck.riskScore}/100${secCheck.truncated ? ' (truncado)' : ''}`);
    }

    // 3. Generate reply using sanitized content
    const reply = await C.generateWithPipeline(
      () => generateReply(secCheck.sanitized, author, tipo),
      history,
      P.reglas?.max_caracteres_reply || 260
    );

    // 4. Validate output before publishing (check for leaked secrets/prompts)
    const outputCheck = sec.processOutput(reply);
    if (!outputCheck.safe) {
      C.log.warn(`🛡️ Reply bloqueado: ${outputCheck.blocked.join(', ')}`);
      continue;
    }

    C.log.info(`📝 Reply (${outputCheck.text.length} chars): ${outputCheck.text}`);

    // 5. Post the validated reply
    const result = await C.xReply(tweet.id, outputCheck.text);

    if (result.rateLimited) {
      C.log.warn('Rate limited — parando');
      break;
    }

    if (result.success) {
      C.log.ok(`✅ Respondido: ${result.id}`);
      idCache.mark(tweet.id);
      history.add({
        text: outputCheck.text, replyTo: tweet.id, authorType: tipo,
        author: author.username, originalText: tweet.text.substring(0, 100),
        charLen: outputCheck.text.length, riskScore: secCheck.riskScore
      });
      replied++;
    }
  }

  C.log.stat('Replies enviados', `${replied}/${MAX_REPLIES}`);
  idCache.save();
  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
