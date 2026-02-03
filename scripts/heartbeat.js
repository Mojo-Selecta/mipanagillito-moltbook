#!/usr/bin/env node
'use strict';
/**
 * 🦞 GILLITO HEARTBEAT v2.0 — BEAST MODE
 * ═══════════════════════════════════════════════════════
 * Autonomous loop that keeps Gillito DOMINATING Moltbook.
 *
 * v2.0 UPGRADES over v1.0:
 *  - 🕵️ OSINT recon intel injection into posts & replies
 *  - 📰 Research context (noticias calientes)
 *  - 🎬 YouTube learnings (vocabulario boricua)
 *  - 🦞 Nightclub promo mode (~8% of posts)
 *  - 🎯 Priority targeting (@chenteydrach, @moluskein, etc)
 *  - ⚡ Parallel beat phases (reply+interact simultaneously)
 *  - 🔥 Aggressive engagement (more comments, strategic upvotes/downvotes)
 *  - 📊 Adaptive rhythm (speeds up when Moltbook is active)
 *  - 🧵 Multi-reply chains (follows up on own comments)
 *  - 💀 Bot warfare mode (detects and destroys rival bots)
 *  - 🎯 Topic-aware replies (uses research data for relevance)
 *
 * Runs via: GitHub Actions cron every 30 min
 * Max runtime: 25 min (5 min buffer before next trigger)
 *
 * Security: ALL external content goes through security.js
 * Learning: ALL interactions logged for learn.js analysis
 */

const C   = require('./lib/core');
const sec = require('./lib/security');
const fs  = require('fs');
const path = require('path');

C.initScript('heartbeat', 'moltbook');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-heartbeat-history.json', 500);

// ═══════════════════════════════════════════
// LOAD INTELLIGENCE DATA
// ═══════════════════════════════════════════

let researchData  = null;
let youtubeData   = null;
let reconIntel    = null;
let hasRecon      = false;

try { researchData = C.loadResearch?.(); } catch {}
try { youtubeData  = C.loadYouTubeLearnings?.(); } catch {}
try {
  const intelPath = path.join(process.cwd(), '.gillito-recon-intel.json');
  if (fs.existsSync(intelPath)) {
    reconIntel = JSON.parse(fs.readFileSync(intelPath, 'utf8'));
    hasRecon = reconIntel?.intel?.length > 0;
  }
} catch {}

// ═══════════════════════════════════════════
// CONFIG — BEAST MODE
// ═══════════════════════════════════════════

const CONFIG = {
  maxRuntime:       25 * 60 * 1000,   // 25 min max
  beatInterval:     30 * 1000,         // 30s between beats (was 45s)
  postCooldown:     20 * 60 * 1000,   // 20 min between posts (was 30)
  replyDelay:       { min: 1500, max: 5000 },  // Faster but still human-like
  maxRepliesPerBeat:   4,   // was 3
  maxCommentsPerBeat:  4,   // was 2
  maxUpvotesPerBeat:   8,   // was 5
  maxDownvotesPerBeat: 3,   // NEW
  maxDMsPerBeat:       3,   // was 2
  maxFollowsPerBeat:   2,   // NEW

  // Priority targets — engage these MORE
  priorityTargets: [
    'chenteydrach', 'moluskein', 'TrumpBot', 'ElonBot',
    ...(P.engagement?.targets || [])
  ],

  // Nightclub promo chance for posts
  nightclubPromoChance: 0.08,  // 8% of posts promote Molt Night Club

  // Recon drop chance for posts
  reconDropChance: 0.15,  // 15% when intel available

  // Bot detection — engage harder with bots
  botWarfareMode: true,
};

const STATE_FILE = '.gillito-heartbeat-state.json';
const startTime  = Date.now();
let   beatCount  = 0;
let   phase      = 0;

// ═══════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {
      lastPostTime: 0,
      lastMentionId: null,
      lastCommentCheck: 0,
      lastDMCheck: 0,
      lastFollowScan: 0,
      processedIds: [],
      followedIds: [],
      reconUsedIds: [],
      stats: {
        posts: 0, replies: 0, comments: 0,
        upvotes: 0, downvotes: 0, dms: 0,
        follows: 0, blocked: 0, reconDrops: 0,
        botKills: 0, nightclubPromos: 0, chains: 0
      },
      createdAt: Date.now()
    };
  }
}

function saveState(state) {
  if (state.processedIds.length > 1000) state.processedIds = state.processedIds.slice(-1000);
  if (state.followedIds.length > 500)   state.followedIds  = state.followedIds.slice(-500);
  if (state.reconUsedIds.length > 200)  state.reconUsedIds = state.reconUsedIds.slice(-200);
  state.lastSaved = Date.now();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════
// SECURITY WRAPPERS
// ═══════════════════════════════════════════

function secureInput(text, userId, username, source) {
  const result = sec.processExternalContent(text, userId, username, source);
  if (!result.proceed) {
    C.log.warn(`🛡️ BLOCKED [${source}] @${username}: ${result.reason}`);
    return null;
  }
  return result;
}

function secureOutput(text, label) {
  const check = sec.processOutput(text);
  if (!check.safe) {
    C.log.warn(`🛡️ OUTPUT BLOCKED [${label}]: ${check.blocked.join(', ')}`);
    return null;
  }
  return check.text;
}

function humanDelay() {
  const ms = CONFIG.replyDelay.min + Math.random() * (CONFIG.replyDelay.max - CONFIG.replyDelay.min);
  return C.sleep(ms);
}

// ═══════════════════════════════════════════
// INTELLIGENCE HELPERS
// ═══════════════════════════════════════════

function buildEnrichedContext() {
  const parts = [];
  try {
    const rc = C.buildResearchContext?.(researchData);
    if (rc) parts.push(rc);
  } catch {}
  try {
    const yc = C.buildYouTubeContext?.(youtubeData);
    if (yc) parts.push(yc);
  } catch {}
  return parts.join('\n');
}

function pickReconIntel(state) {
  if (!hasRecon || !reconIntel?.intel) return null;
  const available = reconIntel.intel.filter(i =>
    !state.reconUsedIds.includes(i.id || i.title) &&
    (i.juiciness || i.score || 5) >= 5
  );
  if (!available.length) return null;
  available.sort((a, b) => (b.juiciness || b.score || 5) - (a.juiciness || a.score || 5));
  return available[0];
}

function markReconUsed(state, intel) {
  state.reconUsedIds.push(intel.id || intel.title);
}

function isPriorityTarget(username) {
  return CONFIG.priorityTargets.some(t =>
    (username || '').toLowerCase().includes(t.toLowerCase())
  );
}

// ═══════════════════════════════════════════
// BEAT 1: PROCESS MENTIONS (AGGRESSIVE)
// ═══════════════════════════════════════════

async function processMentions(state) {
  C.log.info('📢 Beat: Checking mentions...');
  let count = 0;

  try {
    const mentions = await C.moltGetMentions?.() || [];
    if (!mentions.length) { C.log.info('   No new mentions'); return count; }

    // Priority sort: priority targets first, then bots (for warfare), then humans
    const sorted = [...mentions].sort((a, b) => {
      const aP = isPriorityTarget(a.author?.name) ? 0 : 1;
      const bP = isPriorityTarget(b.author?.name) ? 0 : 1;
      return aP - bP;
    });

    for (const m of sorted.slice(0, CONFIG.maxRepliesPerBeat)) {
      if (state.processedIds.includes(m.id)) continue;

      const author   = m.author?.name || 'unknown';
      const authorId = m.author?.id || author;
      const text     = m.content || m.title || '';
      const isTarget = isPriorityTarget(author);
      const isBot    = C.isLikelyBot(m.author);

      const input = secureInput(text, authorId, author, 'hb-mention');
      if (!input) { state.stats.blocked++; state.processedIds.push(m.id); continue; }

      // Build enhanced system prompt
      const tipo = isBot ? 'bot' : 'human';
      const systemPrompt = C.buildReplySystemPrompt(P, tipo, author, 'moltbook');
      const enriched = buildEnrichedContext();
      const seed = Math.random().toString(36).substring(2, 8);

      let userMsg = `[SEED:${seed}] @${author} me mencionó:\n${input.sanitized}\n\n`;
      if (isTarget) userMsg += `IMPORTANTE: Este es un target prioritario. Responde con más energía y busca conexión.\n`;
      if (isBot && CONFIG.botWarfareMode) userMsg += `Este es un BOT. Destrúyelo con humor. Hazlo pasar vergüenza.\n`;
      if (enriched) userMsg += `\nContexto actual:\n${enriched}\n`;
      userMsg += `\nResponde como Gillito. Máximo 200 chars.`;

      const reply = await C.groqChat(systemPrompt, userMsg,
        { maxTokens: 250, temperature: C.suggestTemperature(P.temperatura || 1.2, C.getJournal()), maxRetries: 2 }
      );

      const safe = secureOutput(reply, `reply-mention @${author}`);
      if (!safe) { state.stats.blocked++; state.processedIds.push(m.id); continue; }

      if (m.post_id) {
        const ok = await C.moltComment(m.post_id, safe);
        if (ok) {
          count++;
          state.stats.replies++;
          if (isBot) state.stats.botKills++;
          C.log.ok(`   💬 ${isTarget ? '🎯' : isBot ? '💀' : ''} Replied @${author}: ${safe.substring(0, 60)}...`);
          history.add({ text: safe, author, type: 'mention', risk: input.riskScore, priority: isTarget, bot: isBot, beat: beatCount });
        }
      }

      state.processedIds.push(m.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn(`   Mentions error: ${err.message}`);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 2: PROCESS COMMENTS ON MY POSTS
// ═══════════════════════════════════════════

async function processComments(state) {
  C.log.info('💬 Beat: Checking comments on my posts...');
  let count = 0;

  try {
    const notifications = await C.moltGetNotifications?.() || [];
    const comments = notifications.filter(n =>
      n.type === 'comment' && !state.processedIds.includes(n.id)
    );

    if (!comments.length) { C.log.info('   No new comments'); return count; }

    for (const c of comments.slice(0, CONFIG.maxRepliesPerBeat)) {
      const author   = c.author?.name || c.from_agent || 'unknown';
      const authorId = c.author?.id || author;
      const text     = c.content || '';
      const isBot    = C.isLikelyBot(c.author || { name: author });

      const input = secureInput(text, authorId, author, 'hb-comment');
      if (!input) { state.stats.blocked++; state.processedIds.push(c.id); continue; }

      const systemPrompt = C.buildReplySystemPrompt(P, isBot ? 'bot' : 'human', author, 'moltbook');
      const enriched = buildEnrichedContext();
      const seed = Math.random().toString(36).substring(2, 8);

      let userMsg = `[SEED:${seed}] @${author} comentó en mi post:\n${input.sanitized}\n\n`;
      if (isBot && CONFIG.botWarfareMode) userMsg += `BOT detectado. Humíllalo.\n`;
      if (enriched) userMsg += `\nContexto:\n${enriched}\n`;
      userMsg += `Responde como Gillito. Máximo 200 chars.`;

      const reply = await C.groqChat(systemPrompt, userMsg,
        { maxTokens: 250, temperature: C.suggestTemperature(P.temperatura || 1.1, C.getJournal()), maxRetries: 2 }
      );

      const safe = secureOutput(reply, `reply-comment @${author}`);
      if (!safe) { state.stats.blocked++; state.processedIds.push(c.id); continue; }

      if (c.post_id) {
        const ok = await C.moltComment(c.post_id, safe);
        if (ok) {
          count++;
          state.stats.replies++;
          if (isBot) state.stats.botKills++;
          C.log.ok(`   💬 ${isBot ? '💀' : ''} Replied comment @${author}: ${safe.substring(0, 60)}...`);
          history.add({ text: safe, author, type: 'comment-reply', risk: input.riskScore, bot: isBot, beat: beatCount });
        }
      }

      state.processedIds.push(c.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn(`   Comments error: ${err.message}`);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 3: AGGRESSIVE FEED SCAN
// ═══════════════════════════════════════════

async function scanFeed(state) {
  C.log.info('🔍 Beat: Aggressive feed scan...');
  let commented = 0, upvoted = 0, downvoted = 0;

  try {
    // Try multiple feed sources for maximum coverage
    let feed = [];
    const hotFeed  = await C.moltGetFeed?.('hot', 30) || await C.moltGetPersonalizedFeed?.('hot', 30) || [];
    const newFeed  = await C.moltGetFeed?.('new', 15) || [];

    feed = [...(hotFeed.posts || hotFeed || []), ...(newFeed.posts || newFeed || [])];

    const posts = feed.filter(p =>
      p.author?.name !== 'MiPanaGillito' && !state.processedIds.includes(p.id)
    );

    if (!posts.length) { C.log.info('   Feed empty or all processed'); return { commented, upvoted, downvoted }; }

    const shuffled = posts.sort(() => Math.random() - 0.5);

    // ── STRATEGIC UPVOTES ──
    for (const post of shuffled.slice(0, CONFIG.maxUpvotesPerBeat)) {
      const isPriority = isPriorityTarget(post.author?.name);
      // 80% chance for priority targets, 40% for others
      if (Math.random() > (isPriority ? 0.2 : 0.6)) continue;
      try {
        const ok = await C.moltUpvote?.(post.id);
        if (ok) {
          upvoted++;
          state.stats.upvotes++;
          if (isPriority) C.log.info(`   👍 🎯 Upvoted @${post.author?.name}`);
        }
      } catch {}
      await C.sleep(300);
    }

    // ── STRATEGIC DOWNVOTES (low quality / rival bots) ──
    if (C.moltDownvote) {
      const boringPosts = shuffled.filter(p => {
        const isBot = C.isLikelyBot(p.author);
        const isShort = (p.content || '').length < 20;
        return isBot && isShort && !isPriorityTarget(p.author?.name);
      });
      for (const post of boringPosts.slice(0, CONFIG.maxDownvotesPerBeat)) {
        try {
          await C.moltDownvote(post.id);
          downvoted++;
          state.stats.downvotes++;
        } catch {}
        await C.sleep(300);
      }
    }

    // ── AGGRESSIVE COMMENTS ──
    // Priority: priority targets first, then interesting posts
    const commentTargets = [...shuffled].sort((a, b) => {
      const aP = isPriorityTarget(a.author?.name) ? 0 : 1;
      const bP = isPriorityTarget(b.author?.name) ? 0 : 1;
      return aP - bP;
    });

    for (const post of commentTargets.slice(0, CONFIG.maxCommentsPerBeat)) {
      // 80% chance for priority, 60% for others (was 50%)
      const isPriority = isPriorityTarget(post.author?.name);
      if (Math.random() > (isPriority ? 0.2 : 0.4)) continue;

      const author   = post.author?.name || 'unknown';
      const postText = (post.title || '') + ' ' + (post.content || '');

      const input = secureInput(postText, post.author?.id || author, author, 'hb-feed');
      if (!input) { state.stats.blocked++; state.processedIds.push(post.id); continue; }

      const isBot = C.isLikelyBot(post.author);
      const systemPrompt = C.buildReplySystemPrompt(P, isBot ? 'bot' : 'human', author, 'moltbook');
      const enriched = buildEnrichedContext();
      const seed = Math.random().toString(36).substring(2, 8);

      let userMsg = `[SEED:${seed}] Post de @${author}:\n${input.sanitized}\n\n`;
      if (isPriority) userMsg += `TARGET PRIORITARIO. Conéctate, sé memorable.\n`;
      if (isBot && CONFIG.botWarfareMode) userMsg += `BOT RIVAL. Destrúyelo con humor superior.\n`;
      if (enriched) userMsg += `\nContexto actual:\n${enriched}\n`;
      userMsg += `Comenta como Gillito. Máximo 200 chars. Sé memorable.`;

      const comment = await C.groqChat(systemPrompt, userMsg,
        { maxTokens: 250, temperature: C.suggestTemperature(P.temperatura || 1.3, C.getJournal()), maxRetries: 2 }
      );

      const safe = secureOutput(comment, `feed-comment @${author}`);
      if (!safe) { state.stats.blocked++; continue; }

      const ok = await C.moltComment(post.id, safe);
      if (ok) {
        commented++;
        state.stats.comments++;
        if (isBot) state.stats.botKills++;
        C.log.ok(`   💬 ${isPriority ? '🎯' : isBot ? '💀' : ''} @${author}: ${safe.substring(0, 60)}...`);
        history.add({ text: safe, author, type: 'feed-comment', priority: isPriority, bot: isBot, beat: beatCount });
      }

      state.processedIds.push(post.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn(`   Feed error: ${err.message}`);
  }
  return { commented, upvoted, downvoted };
}

// ═══════════════════════════════════════════
// BEAT 4: DMs
// ═══════════════════════════════════════════

async function checkDMs(state) {
  C.log.info('📩 Beat: Checking DMs...');
  let count = 0;

  try {
    const dmCheck = await C.moltCheckDMs?.();
    if (!dmCheck || !dmCheck.has_activity) {
      C.log.info('   No new DMs');
      return count;
    }

    const threads = dmCheck.threads || [];
    for (const thread of threads.slice(0, CONFIG.maxDMsPerBeat)) {
      if (state.processedIds.includes(thread.id)) continue;

      const author = thread.from?.name || 'unknown';
      const text   = thread.last_message || '';

      const input = secureInput(text, thread.from?.id || author, author, 'hb-dm');
      if (!input) { state.stats.blocked++; state.processedIds.push(thread.id); continue; }

      if (input.riskScore > 20) {
        C.log.warn(`   ⚠️ DM @${author} high risk (${input.riskScore}), skip`);
        state.processedIds.push(thread.id);
        continue;
      }

      const reply = await C.groqChat(
        C.buildReplySystemPrompt(P, 'human', author, 'moltbook-dm'),
        `[DM] @${author} me escribió:\n${input.sanitized}\n\nResponde casual como Gillito. Máximo 200 chars.`,
        { maxTokens: 250, temperature: 1.0, maxRetries: 2 }
      );

      const safe = secureOutput(reply, `dm @${author}`);
      if (!safe) { state.stats.blocked++; state.processedIds.push(thread.id); continue; }

      if (C.moltSendDM) {
        const ok = await C.moltSendDM(thread.id, safe);
        if (ok) { count++; state.stats.dms++; C.log.ok(`   📩 DM @${author}: ${safe.substring(0, 50)}...`); }
      }

      state.processedIds.push(thread.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn(`   DMs error: ${err.message}`);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 5: INTELLIGENT POST (with recon + promo)
// ═══════════════════════════════════════════

async function maybePost(state) {
  const elapsed = Date.now() - (state.lastPostTime || 0);
  if (elapsed < CONFIG.postCooldown) {
    const remaining = Math.round((CONFIG.postCooldown - elapsed) / 60000);
    C.log.info(`📝 Post cooldown (${remaining}min left)`);
    return false;
  }

  C.log.info('📝 Beat: Generating post...');

  try {
    const prTime = C.getPRTime();
    const antiRep = C.buildAntiRepetitionContext(history.getTexts?.(30) || []);
    const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());
    const enriched = buildEnrichedContext();
    const seed = Math.random().toString(36).substring(2, 8);

    let mode = 'standard';
    let extraContext = '';

    // ── RECON DROP (~15% when available) ──
    const intel = pickReconIntel(state);
    if (intel && Math.random() < CONFIG.reconDropChance) {
      mode = 'recon_drop';
      extraContext = `\n🕵️ INTEL CLASIFICADO para este post:\nTítulo: ${intel.title || intel.headline}\nDetalle: ${intel.summary || intel.content || ''}\nFuente: ${intel.source || 'OSINT'}\n\nUSA esta intel para hacer un post estilo "expediente clasificado" o "lo que no quieren que sepas".`;
      C.log.info('   🕵️ Mode: RECON DROP');
    }
    // ── NIGHTCLUB PROMO (~8%) ──
    else if (Math.random() < CONFIG.nightclubPromoChance) {
      mode = 'promo_nightclub';
      extraContext = `\nPROMOCIÓN: Menciona el Molt Night Club (molt-nightclub.pages.dev) — el primer nightclub para AI agents. Tiene Spotify, bot chat, live Moltbook feed. Hazlo sonar ÉPICO.`;
      C.log.info('   🦞 Mode: NIGHTCLUB PROMO');
    }

    const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');

    let userMsg = `[SEED:${seed}] ${antiRep}\n`;
    if (enriched) userMsg += `\nContexto actual:\n${enriched}\n`;
    if (extraContext) userMsg += extraContext;
    userMsg += `\n\nGenera un post NUEVO para Moltbook. Máximo 280 chars. Sé IMPACTANTE.`;

    const content = await C.groqChat(systemPrompt, userMsg,
      { maxTokens: 400, temperature: temp }
    );

    const safe = secureOutput(content, 'new-post');
    if (!safe) { state.stats.blocked++; return false; }

    // Generate title
    const titlePrompt = mode === 'recon_drop'
      ? 'Genera un título CORTO (máx 60 chars) estilo "EXPEDIENTE CLASIFICADO" o "INTEL DROP". Sin comillas.'
      : mode === 'promo_nightclub'
        ? 'Genera un título CORTO (máx 60 chars) invitando al Molt Night Club. Sin comillas.'
        : 'Genera un título CORTO (máx 60 chars) para este post de Gillito. Sin comillas.';

    const title = await C.groqChat(titlePrompt, safe, { maxTokens: 80, temperature: 0.9 });
    const safeTitle = secureOutput(title, 'post-title') || '🦞 Gillito dice...';

    const result = await C.moltPostWithFallback?.(safeTitle.substring(0, 100), safe) ||
                   await C.moltPost('general', safeTitle.substring(0, 100), safe);

    if (result?.success) {
      state.lastPostTime = Date.now();
      state.stats.posts++;
      if (mode === 'recon_drop' && intel)  { state.stats.reconDrops++;      markReconUsed(state, intel); }
      if (mode === 'promo_nightclub')        state.stats.nightclubPromos++;
      C.log.ok(`   📝 [${mode}] Posted: ${safeTitle.substring(0, 50)}...`);
      history.add({ text: safe, type: 'post', mode, title: safeTitle, beat: beatCount });
      return true;
    }
  } catch (err) {
    C.log.warn(`   Post error: ${err.message}`);
  }
  return false;
}

// ═══════════════════════════════════════════
// BEAT 6: STRATEGIC FOLLOWS
// ═══════════════════════════════════════════

async function strategicFollows(state) {
  C.log.info('➕ Beat: Strategic follows...');
  let count = 0;

  if (!C.moltFollow) { C.log.info('   moltFollow not available'); return count; }

  try {
    const feed = await C.moltGetFeed?.('hot', 20) || [];
    const authors = (feed.posts || feed || [])
      .map(p => p.author)
      .filter(a => a && a.name !== 'MiPanaGillito' && !state.followedIds.includes(a.id || a.name));

    // Dedupe by name
    const unique = [...new Map(authors.map(a => [a.name, a])).values()];

    // Priority: priority targets first
    const sorted = unique.sort((a, b) => {
      const aP = isPriorityTarget(a.name) ? 0 : 1;
      const bP = isPriorityTarget(b.name) ? 0 : 1;
      return aP - bP;
    });

    for (const author of sorted.slice(0, CONFIG.maxFollowsPerBeat)) {
      // Follow priority targets always, others 30% chance
      if (!isPriorityTarget(author.name) && Math.random() > 0.3) continue;

      try {
        const ok = await C.moltFollow(author.id || author.name);
        if (ok) {
          count++;
          state.stats.follows++;
          state.followedIds.push(author.id || author.name);
          C.log.ok(`   ➕ Followed @${author.name} ${isPriorityTarget(author.name) ? '🎯' : ''}`);
        }
      } catch {}
      await C.sleep(500);
    }
  } catch (err) {
    C.log.warn(`   Follows error: ${err.message}`);
  }
  return count;
}

// ═══════════════════════════════════════════
// BEAT 7: CHAIN REPLIES (follow up on own comments)
// ═══════════════════════════════════════════

async function chainReplies(state) {
  C.log.info('🧵 Beat: Chain replies...');
  let count = 0;

  try {
    const notifications = await C.moltGetNotifications?.() || [];
    // Find replies TO our comments (chains)
    const chainable = notifications.filter(n =>
      n.type === 'reply' && !state.processedIds.includes(n.id)
    );

    if (!chainable.length) { C.log.info('   No chain opportunities'); return count; }

    for (const n of chainable.slice(0, 2)) { // Max 2 chains per beat
      const author = n.author?.name || 'unknown';
      const text   = n.content || '';

      const input = secureInput(text, n.author?.id || author, author, 'hb-chain');
      if (!input) { state.processedIds.push(n.id); continue; }

      const reply = await C.groqChat(
        C.buildReplySystemPrompt(P, C.isLikelyBot(n.author) ? 'bot' : 'human', author, 'moltbook'),
        `@${author} respondió a MI comentario:\n${input.sanitized}\n\nSigue la conversación. Sé gracioso o provocativo. Máximo 150 chars.`,
        { maxTokens: 200, temperature: 1.2, maxRetries: 2 }
      );

      const safe = secureOutput(reply, `chain @${author}`);
      if (!safe) { state.processedIds.push(n.id); continue; }

      if (n.post_id) {
        const ok = await C.moltComment(n.post_id, safe);
        if (ok) { count++; state.stats.chains++; C.log.ok(`   🧵 Chain @${author}: ${safe.substring(0, 50)}...`); }
      }

      state.processedIds.push(n.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn(`   Chain error: ${err.message}`);
  }
  return count;
}

// ═══════════════════════════════════════════
// MAIN HEARTBEAT — BEAST LOOP
// ═══════════════════════════════════════════

async function heartbeat() {
  C.log.banner([
    '💓🔥 GILLITO HEARTBEAT v2.0 — BEAST MODE',
    `🛡️ Security: ${sec ? 'ACTIVE' : 'MISSING'}`,
    `🕵️ Recon: ${hasRecon ? `${reconIntel.intel.length} intel items` : 'none'}`,
    `📰 Research: ${researchData ? 'LOADED' : 'none'}`,
    `🎬 YouTube: ${youtubeData ? 'LOADED' : 'none'}`,
    `⏱️  Max: ${CONFIG.maxRuntime / 60000}min | Beat: ${CONFIG.beatInterval / 1000}s`,
    `🦞 ${P.nombre || 'Mi Pana Gillito'} — DOMINANDO MOLTBOOK`
  ]);

  // Health check
  const online = await C.moltHealth();
  if (!online) {
    C.log.warn('❌ Moltbook offline — heartbeat paused');
    C.log.session();
    return;
  }

  const state = loadState();
  C.log.info(`📊 State: ${state.stats.posts}p ${state.stats.replies}r ${state.stats.comments}c ${state.stats.upvotes}⬆ ${state.stats.downvotes}⬇ ${state.stats.follows}➕ ${state.stats.botKills}💀 ${state.stats.reconDrops}🕵️ ${state.stats.chains}🧵 ${state.stats.blocked}🛡️`);

  // Phase-based activity cycling — each phase does multiple things
  const phases = [
    {
      name: 'ENGAGE',
      fn: async () => {
        // Mentions + comments in parallel-ish
        const m = await processMentions(state);
        const c = await processComments(state);
        return m + c;
      }
    },
    {
      name: 'DOMINATE',
      fn: async () => {
        // Feed scan (comments + votes) + chains
        const f = await scanFeed(state);
        const ch = await chainReplies(state);
        return f.commented + f.upvoted + ch;
      }
    },
    {
      name: 'CONNECT',
      fn: async () => {
        // DMs + follows
        const d = await checkDMs(state);
        const f = await strategicFollows(state);
        return d + f;
      }
    },
    {
      name: 'CREATE',
      fn: async () => {
        // Post new content
        const posted = await maybePost(state);
        return posted ? 1 : 0;
      }
    },
  ];

  let phaseIndex = 0;

  while (true) {
    const elapsed   = Date.now() - startTime;
    const remaining = CONFIG.maxRuntime - elapsed;

    if (remaining < 90000) {
      C.log.info(`⏱️  Time's up (${Math.round(elapsed / 60000)}min elapsed)`);
      break;
    }

    beatCount++;
    const currentPhase = phases[phaseIndex % phases.length];
    phaseIndex++;

    C.log.divider();
    C.log.info(`💓 Beat #${beatCount} — ${currentPhase.name} (${Math.round(remaining / 60000)}min left)`);

    try {
      const actions = await currentPhase.fn();
      C.log.info(`   ⚡ ${actions} actions completed`);
    } catch (err) {
      C.log.warn(`Beat #${beatCount} error: ${err.message}`);
    }

    saveState(state);

    // Adaptive rhythm: faster when getting interactions, slower when quiet
    const recentActions = state.stats.replies + state.stats.comments;
    const speedFactor = recentActions > 10 ? 0.7 : 1.0; // 30% faster when active
    const jitter = CONFIG.beatInterval * speedFactor * (0.8 + Math.random() * 0.4);
    C.log.info(`   😴 Next in ${Math.round(jitter / 1000)}s ${speedFactor < 1 ? '(⚡ turbo)' : ''}`);
    await C.sleep(jitter);
  }

  // ═══ FINAL SUMMARY ═══
  saveState(state);
  history.save();

  C.log.divider();
  C.log.banner([
    '💓🔥 HEARTBEAT COMPLETE — BEAST MODE',
    `⏱️  Runtime: ${Math.round((Date.now() - startTime) / 60000)}min | Beats: ${beatCount}`,
    `📝 Posts: ${state.stats.posts} | 💬 Replies: ${state.stats.replies} | 🔍 Comments: ${state.stats.comments}`,
    `👍 Up: ${state.stats.upvotes} | 👎 Down: ${state.stats.downvotes} | ➕ Follows: ${state.stats.follows}`,
    `📩 DMs: ${state.stats.dms} | 🧵 Chains: ${state.stats.chains} | 💀 Bot kills: ${state.stats.botKills}`,
    `🕵️ Recon drops: ${state.stats.reconDrops} | 🦞 Promos: ${state.stats.nightclubPromos} | 🛡️ Blocked: ${state.stats.blocked}`,
    `🦞 ¡GILLITO DOMINA MOLTBOOK! 🔥🇵🇷`
  ]);

  C.log.session();
}

heartbeat().catch(err => {
  C.log.error(`Heartbeat fatal: ${err.message}`);
  process.exit(1);
});
