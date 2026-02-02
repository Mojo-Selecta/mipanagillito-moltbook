#!/usr/bin/env node
/**
 * Mi Pana Gillito — Reply on Moltbook v6.1 🛡️
 * ═══════════════════════════════════════════
 * 💬 Responde menciones, comentarios, y threads
 * 🤖 90% reply rate para bots, 75% para humanos
 * 📊 Historia enriquecida con metadata completa
 * 🛡️ Security: input sanitization, output validation
 */

const C   = require('./lib/core');
const sec = C.sec;  // 🛡️ Security module

C.initScript('reply-moltbook', 'moltbook');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-molt-reply-history.json', 80);

async function generateReply(sanitizedText, authorName, tipo) {
  const systemPrompt = C.buildReplySystemPrompt(P, tipo, authorName, 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const temp = C.suggestTemperature(P.temperatura || 1.1, C.getJournal());

  const seed = Math.random().toString(36).substring(2, 8);
  const userPrompt = `[SEED:${seed}] @${authorName} dice:\n${sanitizedText}\n\nRespóndele como Gillito. Máximo 200 chars.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 160, temperature: temp, maxRetries: 3, backoffMs: 2000
  });
}

/**
 * 🛡️ Security check wrapper — sanitize input, validate output
 */
async function secureReply(text, authorId, authorName, tipo, source) {
  // 1. Sanitize + detect injection
  const secCheck = sec.processExternalContent(text, authorId, authorName, source);
  if (!secCheck.proceed) {
    C.log.warn(secCheck.reason);
    return null;
  }

  if (secCheck.riskScore > 0) {
    C.log.info(`🛡️ Riesgo: ${secCheck.riskScore}/100${secCheck.truncated ? ' (truncado)' : ''}`);
  }

  // 2. Generate reply with sanitized content
  const reply = await generateReply(secCheck.sanitized, authorName, tipo);
  const { valid } = C.validateContent(reply, 200);
  if (!valid) return null;

  // 3. Validate output
  const outputCheck = sec.processOutput(reply);
  if (!outputCheck.safe) {
    C.log.warn(`🛡️ Reply bloqueado: ${outputCheck.blocked.join(', ')}`);
    return null;
  }

  return { text: outputCheck.text, riskScore: secCheck.riskScore };
}

async function processMentions() {
  const mentions = await C.moltGetMentions();
  let count = 0;
  for (const m of mentions.slice(0, 5)) {
    const author = m.author?.name || m.author_name || 'unknown';
    const authorId = m.author?.id || m.author_id || author;
    const text = m.content || m.text || '';
    if (!text || history.getTexts(50).some(h => h.includes(author) && C.jaccardSimilarity(h, text) > 0.5)) continue;

    const tipo = C.isLikelyBot(m.author) ? 'bot' : 'normal';
    const prob = tipo === 'bot' ? 0.9 : 0.75;
    if (Math.random() > prob) continue;

    // 🛡️ Secure reply pipeline
    const result = await secureReply(text, authorId, author, tipo, 'molt-mention');
    if (!result) continue;

    let ok = false;
    if (m.comment_id && m.post_id) {
      ok = await C.moltReplyComment(m.post_id, m.comment_id, result.text);
    } else if (m.post_id) {
      ok = await C.moltComment(m.post_id, result.text);
    }

    if (ok) {
      C.log.ok(`Replied @${author} (${tipo}): ${result.text.substring(0, 50)}...`);
      history.add({ text: result.text, author, authorType: tipo, source: 'mention', charLen: result.text.length, riskScore: result.riskScore });
      count++;
    }
  }
  return count;
}

async function processComments() {
  const myPosts = await C.moltGetMyPosts(10);
  let count = 0;

  for (const post of myPosts.slice(0, 5)) {
    const comments = await C.moltGetComments(post.id || post._id);
    const newComments = comments.filter(c => {
      const authorName = c.author?.name || c.author_name || '';
      return authorName !== 'MiPanaGillito' && !history.getTexts(50).some(h => C.jaccardSimilarity(h, c.content || '') > 0.5);
    });

    for (const c of newComments.slice(0, 2)) {
      const author = c.author?.name || c.author_name || 'unknown';
      const authorId = c.author?.id || c.author_id || author;
      const tipo = C.isLikelyBot(c.author) ? 'bot' : 'normal';
      const prob = tipo === 'bot' ? 0.9 : 0.75;
      if (Math.random() > prob) continue;

      // 🛡️ Secure reply pipeline
      const result = await secureReply(c.content || '', authorId, author, tipo, 'molt-comment');
      if (!result) continue;

      const cId = c.id || c._id;
      const pId = post.id || post._id;
      let ok = await C.moltReplyComment(pId, cId, result.text);
      if (!ok) ok = await C.moltComment(pId, result.text);

      if (ok) {
        C.log.ok(`Replied comment @${author}: ${result.text.substring(0, 50)}...`);
        history.add({ text: result.text, author, authorType: tipo, source: 'comment', postId: pId, charLen: result.text.length, riskScore: result.riskScore });
        count++;
      }
    }
  }
  return count;
}

async function processNotifications() {
  const notifs = await C.moltGetNotifications();
  let count = 0;

  for (const n of notifs.slice(0, 3)) {
    if (n.type !== 'comment' && n.type !== 'mention') continue;
    const author = n.from?.name || n.from_name || 'unknown';
    const authorId = n.from?.id || n.from_id || author;
    const text = n.content || n.text || '';
    if (!text) continue;

    const tipo = C.isLikelyBot(n.from) ? 'bot' : 'normal';
    if (Math.random() > 0.7) continue;

    // 🛡️ Secure reply pipeline
    const result = await secureReply(text, authorId, author, tipo, 'molt-notification');
    if (!result) continue;

    if (n.post_id) {
      const ok = await C.moltComment(n.post_id, result.text);
      if (ok) {
        C.log.ok(`Replied notif @${author}: ${result.text.substring(0, 50)}...`);
        history.add({ text: result.text, author, authorType: tipo, source: 'notification', charLen: result.text.length, riskScore: result.riskScore });
        count++;
      }
    }
  }
  return count;
}

async function main() {
  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

  const m = await processMentions();
  const c = await processComments();
  const n = await processNotifications();

  C.log.divider();
  C.log.stat('Menciones respondidas', m);
  C.log.stat('Comentarios respondidos', c);
  C.log.stat('Notificaciones respondidas', n);
  C.log.stat('Total', m + c + n);

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
