#!/usr/bin/env node
/**
 * Mi Pana Gillito — Interact on Moltbook v6.0
 * ═══════════════════════════════════════════
 * 🤝 Interactúa con el feed (upvote/downvote/comment/follow)
 * 🤖 Bot detection → trolleo agresivo
 * 📊 Tracking enriquecido de todas las acciones
 */

const C = require('./lib/core');
C.initScript('interact-moltbook', 'moltbook');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-molt-interact-history.json', 80);

async function generateComment(post, tipo) {
  const systemPrompt = C.buildReplySystemPrompt(P, tipo, post.author?.name || 'unknown', 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(15));
  const temp = C.suggestTemperature(P.temperatura || 1.1, C.getJournal());

  const seed = Math.random().toString(36).substring(2, 8);
  const postText = (post.title || '') + ' ' + (post.content || '');
  const userPrompt = `[SEED:${seed}] Post de @${post.author?.name || 'unknown'}:\n"${postText.substring(0, 200)}"\n\nComenta como Gillito. Máximo 180 chars. Sé provocador.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 140, temperature: temp, maxRetries: 2, backoffMs: 3000
  });
}

async function main() {
  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

  const feed = C.shuffle(await C.moltGetFeed('hot', 30));
  C.log.stat('Feed', `${feed.length} posts`);

  let actions = { upvotes: 0, downvotes: 0, comments: 0, follows: 0 };

  for (const post of feed.slice(0, 10)) {
    const author = post.author || {};
    const authorName = author.name || 'unknown';
    if (authorName === 'MiPanaGillito') continue;

    const isBot = C.isLikelyBot(author);
    const postId = post.id || post._id;

    C.log.info(`📄 @${authorName} ${isBot ? '🤖' : '👤'}: "${(post.title || '').substring(0, 40)}"`);

    if (isBot) {
      // Bots: 70% comment (troll), 20% downvote, 10% upvote
      const roll = Math.random();
      if (roll < 0.7) {
        const comment = await generateComment(post, 'bot');
        if (C.validateContent(comment, 200).valid) {
          const ok = await C.moltComment(postId, comment);
          if (ok) {
            C.log.ok(`🤖 Trolled @${authorName}: ${comment.substring(0, 50)}...`);
            history.add({ text: comment, author: authorName, authorType: 'bot', action: 'comment', postId, charLen: comment.length });
            actions.comments++;
          }
        }
      } else if (roll < 0.9) {
        if (await C.moltDownvote(postId)) { actions.downvotes++; C.log.stat('Action', `👎 @${authorName}`); }
      } else {
        if (await C.moltUpvote(postId)) { actions.upvotes++; C.log.stat('Action', `👍 @${authorName}`); }
      }
    } else {
      // Humans: 40% comment, 50% upvote, 10% follow
      const roll = Math.random();
      if (roll < 0.4) {
        const comment = await generateComment(post, 'normal');
        if (C.validateContent(comment, 200).valid) {
          const ok = await C.moltComment(postId, comment);
          if (ok) {
            C.log.ok(`💬 Commented @${authorName}: ${comment.substring(0, 50)}...`);
            history.add({ text: comment, author: authorName, authorType: 'human', action: 'comment', postId, charLen: comment.length });
            actions.comments++;
          }
        }
      } else if (roll < 0.9) {
        if (await C.moltUpvote(postId)) { actions.upvotes++; C.log.stat('Action', `👍 @${authorName}`); }
      } else {
        if (await C.moltFollow(authorName)) {
          actions.follows++;
          C.log.stat('Action', `➕ Followed @${authorName}`);
          history.add({ action: 'follow', author: authorName, authorType: 'human' });
        }
      }
    }

    // Small delay between interactions
    await C.sleep(1000 + Math.random() * 2000);
  }

  C.log.divider();
  C.log.stat('Upvotes', actions.upvotes);
  C.log.stat('Downvotes', actions.downvotes);
  C.log.stat('Comments', actions.comments);
  C.log.stat('Follows', actions.follows);

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
