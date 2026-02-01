#!/usr/bin/env node
/**
 * Mi Pana Gillito — Reply on Moltbook v6.0
 * ═══════════════════════════════════════════
 * 💬 Responde menciones, comentarios, y threads
 * 🤖 90% reply rate para bots, 75% para humanos
 * 📊 Historia enriquecida con metadata completa
 */

const C = require('./lib/core');
C.initScript('reply-moltbook', 'moltbook');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-molt-reply-history.json', 80);

async function generateReply(text, authorName, tipo) {
  const systemPrompt = C.buildReplySystemPrompt(P, tipo, authorName, 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const temp = C.suggestTemperature(P.temperatura || 1.1, C.getJournal());

  const seed = Math.random().toString(36).substring(2, 8);
  const userPrompt = `[SEED:${seed}] @${authorName} dice:\n"${text}"\n\nRespóndele como Gillito. Máximo 200 chars.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 160, temperature: temp, maxRetries: 3, backoffMs: 2000
  });
}

async function processMentions() {
  const mentions = await C.moltGetMentions();
  let count = 0;
  for (const m of mentions.slice(0, 5)) {
    const author = m.author?.name || m.author_name || 'unknown';
    const text = m.content || m.text || '';
    if (!text || history.getTexts(50).some(h => h.includes(author) && C.jaccardSimilarity(h, text) > 0.5)) continue;

    const tipo = C.isLikelyBot(m.author) ? 'bot' : 'normal';
    const prob = tipo === 'bot' ? 0.9 : 0.75;
    if (Math.random() > prob) continue;

    const reply = await generateReply(text, author, tipo);
    const { valid } = C.validateContent(reply, 200);
    if (!valid) continue;

    let ok = false;
    if (m.comment_id && m.post_id) {
      ok = await C.moltReplyComment(m.post_id, m.comment_id, reply);
    } else if (m.post_id) {
      ok = await C.moltComment(m.post_id, reply);
    }

    if (ok) {
      C.log.ok(`Replied @${author} (${tipo}): ${reply.substring(0, 50)}...`);
      history.add({ text: reply, author, authorType: tipo, source: 'mention', charLen: reply.length });
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
      const tipo = C.isLikelyBot(c.author) ? 'bot' : 'normal';
      const prob = tipo === 'bot' ? 0.9 : 0.75;
      if (Math.random() > prob) continue;

      const reply = await generateReply(c.content || '', author, tipo);
      const { valid } = C.validateContent(reply, 200);
      if (!valid) continue;

      const cId = c.id || c._id;
      const pId = post.id || post._id;
      let ok = await C.moltReplyComment(pId, cId, reply);
      if (!ok) ok = await C.moltComment(pId, reply);

      if (ok) {
        C.log.ok(`Replied comment @${author}: ${reply.substring(0, 50)}...`);
        history.add({ text: reply, author, authorType: tipo, source: 'comment', postId: pId, charLen: reply.length });
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
    const text = n.content || n.text || '';
    if (!text) continue;

    const tipo = C.isLikelyBot(n.from) ? 'bot' : 'normal';
    if (Math.random() > 0.7) continue;

    const reply = await generateReply(text, author, tipo);
    if (!C.validateContent(reply, 200).valid) continue;

    if (n.post_id) {
      const ok = await C.moltComment(n.post_id, reply);
      if (ok) {
        C.log.ok(`Replied notif @${author}: ${reply.substring(0, 50)}...`);
        history.add({ text: reply, author, authorType: tipo, source: 'notification', charLen: reply.length });
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
