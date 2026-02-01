#!/usr/bin/env node
/**
 * Mi Pana Gillito — Moltbook Reply v5.0
 * ═══════════════════════════════════════════
 * 🧠 Cerebro completo + content pipeline
 * 📋 Memoria anti-repetición
 * 🔄 Groq retry + variedad de estilos
 * 💬 Menciones + Comments + Threads
 */

const C = require('./lib/core');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-molt-reply-history.json', 80);

async function generateReply(comment, myPost, isBot, isSpecial, authorName) {
  const tipo = isBot ? 'bot' : isSpecial ? 'special' : 'normal';
  const systemPrompt = C.buildReplySystemPrompt(P, tipo, authorName, 'moltbook');
  const noRepeatCtx = C.buildAntiRepetitionContext(history.getTexts(15));
  const seed = Math.floor(Math.random() * 99999);

  const raw = await C.groqChat(systemPrompt,
    `Mi post era: "${myPost}"\n@${authorName}${isBot ? ' (BOT)' : ''} me dijo: "${comment}"\n\nResponde ÚNICO y EXPLOSIVO (seed: ${seed}). Máximo 200 chars. Solo texto, sin @nombre, sin comillas.${noRepeatCtx}`,
    { maxTokens: 150, temperature: P.temperatura }
  );

  let cleaned = raw.replace(new RegExp(`^@${authorName}\\s*`, 'i'), '');
  return cleaned.slice(0, 200);
}

async function processMentions() {
  C.log.info('📢 Revisando menciones...\n');
  let count = 0;

  try {
    const mentions = await C.moltGetMentions();
    for (const m of mentions) {
      if (m.responded) continue;
      const isBot = C.isLikelyBot(m.author);
      const isSpecial = C.isSpecialTarget(P, m.author?.name);
      const name = m.author?.name || 'alguien';
      const badge = isBot ? ' 🤖' : isSpecial ? ' ⭐' : '';

      console.log(`📢 @${name}${badge}: "${m.content?.slice(0, 50)}..."`);

      const reply = await generateReply(m.content, 'Me mencionaron', isBot, isSpecial, name);
      if (reply) {
        const ok = await C.moltComment(m.post_id, `@${name} ${reply}`);
        if (ok) {
          count++;
          history.add({ text: reply, to: name, isBot, type: 'mention', timestamp: new Date().toISOString() });
          console.log(`   🔥 "${reply.slice(0, 60)}..."\n`);
        }
      }
      await C.sleep(600);
    }
  } catch (e) { C.log.warn(`Menciones: ${e.message}`); }
  return count;
}

async function processComments() {
  C.log.info('\n📬 Revisando comments en mis posts...\n');
  let replies = 0, botReplies = 0;

  const myPosts = await C.moltGetMyPosts();
  for (const post of myPosts) {
    if (replies >= 10) break;

    const comments = await C.moltGetComments(post.id);
    for (const comment of comments) {
      if (replies >= 10) break;
      if (comment.author?.name === 'MiPanaGillito') continue;
      if (comment.reply_count > 0) continue;

      const isBot = C.isLikelyBot(comment.author);
      const isSpecial = C.isSpecialTarget(P, comment.author?.name);
      const name = comment.author?.name || 'alguien';
      const replyChance = isBot ? 0.90 : 0.75;
      if (Math.random() > replyChance) continue;

      const badge = isBot ? ' 🤖' : isSpecial ? ' ⭐' : '';
      console.log(`📝 "${post.title?.slice(0, 30)}..." → 💬 @${name}${badge}`);

      try {
        const reply = await generateReply(comment.content, post.title, isBot, isSpecial, name);
        if (reply) {
          let ok = await C.moltReplyComment(post.id, comment.id, reply);
          if (!ok) ok = await C.moltComment(post.id, `@${name} ${reply}`);
          if (ok) {
            replies++;
            if (isBot) botReplies++;
            history.add({ text: reply, to: name, isBot, type: 'comment', timestamp: new Date().toISOString() });
            console.log(`   🔥 "${reply.slice(0, 60)}..."\n`);
          }
        }
      } catch (e) { C.log.warn(`Reply: ${e.message}`); }
      await C.sleep(600);
    }
  }
  return { replies, botReplies };
}

async function processThreads() {
  C.log.info('\n🔄 Revisando threads...\n');
  let count = 0;

  try {
    const notifications = await C.moltGetNotifications();
    const replyNotifs = notifications.filter(n => n.type === 'reply' && !n.read);

    for (const notif of replyNotifs.slice(0, 5)) {
      if (notif.responded) continue;
      const isBot = C.isLikelyBot(notif.author);
      const isSpecial = C.isSpecialTarget(P, notif.author?.name);
      const name = notif.author?.name || 'alguien';

      console.log(`🔔 @${name}${isBot ? ' 🤖' : ''} me respondió`);

      const reply = await generateReply(notif.content, 'Thread', isBot, isSpecial, name);
      if (reply) {
        const ok = await C.moltComment(notif.post_id, `@${name} ${reply}`);
        if (ok) {
          count++;
          history.add({ text: reply, to: name, isBot, type: 'thread', timestamp: new Date().toISOString() });
          console.log(`   🔥 "${reply.slice(0, 60)}..."\n`);
        }
      }
      await C.sleep(600);
    }
  } catch (e) { C.log.warn(`Threads: ${e.message}`); }
  return count;
}

async function main() {
  C.log.banner([
    '💬 GILLITO — MOLTBOOK REPLY v5.0 🔥🇵🇷',
    `🧠 ${P.version}`
  ]);

  const mentions = await processMentions();
  const { replies, botReplies } = await processComments();
  const threads = await processThreads();

  history.save();

  C.log.banner([
    '📊 RESUMEN',
    `💬 Replies: ${replies} | 📢 Menciones: ${mentions} | 🔄 Threads: ${threads}`,
    `🤖 Bots destruidos: ${botReplies}`,
    `🦞 ${P.despedida_real} 🔥`
  ]);
}

main().catch(err => { history.save(); C.log.error(err.message); process.exit(1); });
