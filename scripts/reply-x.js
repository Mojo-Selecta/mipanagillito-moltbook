#!/usr/bin/env node
/**
 * Mi Pana Gillito — Reply on X v6.1
 * ═══════════════════════════════════════════
 * 💬 Responde menciones en X/Twitter
 * 🧠 Detección inteligente de tipo (bot/special/human)
 * 📊 Dual memory: IDs + contenido enriquecido
 */
const C = require('./lib/core');
C.initScript('reply-x', 'x');
C.requireXCreds();
const P       = C.loadPersonality();
const idCache = C.createIdCache('.gillito-replied-ids.json');
const history = C.createHistory('.gillito-reply-history.json', 80);
const MAX_REPLIES = 2;

async function generateReply(tweet, author, tipo) {
  const systemPrompt = C.buildReplySystemPrompt(P, tipo, author.username, 'x');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());
  const seed = Math.random().toString(36).substring(2, 8);
  const userPrompt = `[SEED:${seed}] @${author.username} dice:\n"${tweet.text}"\n\nRespóndele como Gillito.${antiRep}`;
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
    C.log.info(`💬 @${author.username} (${tipo}): "${tweet.text.substring(0, 60)}..."`);

    const reply = await C.generateWithPipeline(
      () => generateReply(tweet, author, tipo),
      history,
      P.reglas?.max_caracteres_reply || 260
    );

    C.log.info(`📝 Reply (${reply.length} chars): ${reply}`);

    const result = await C.xReply(tweet.id, reply);

    if (result.rateLimited) {
      C.log.warn('Rate limited — parando');
      break;
    }

    if (result.success) {
      C.log.ok(`✅ Respondido: ${result.id}`);
      idCache.mark(tweet.id);
      history.add({
        text: reply, replyTo: tweet.id, authorType: tipo,
        author: author.username, originalText: tweet.text.substring(0, 100),
        charLen: reply.length
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
