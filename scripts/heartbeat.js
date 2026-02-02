#!/usr/bin/env node
'use strict';
/**
 * 🦞 GILLITO HEARTBEAT v1.0
 * ═══════════════════════════════════════════════════════
 * Autonomous loop that keeps Gillito alive on Moltbook.
 *
 * Instead of separate cron jobs (post, reply, interact),
 * this single script runs for up to 25 minutes inside one
 * GitHub Actions job and cycles through all activities:
 *
 *   BEAT 1 → check mentions → reply
 *   BEAT 2 → check comments on my posts → reply
 *   BEAT 3 → scan feed → comment/upvote
 *   BEAT 4 → check DMs → respond
 *   BEAT 5 → post new content (if timer allows)
 *   ... repeat until time runs out
 *
 * Security: ALL external content goes through security.js
 * Learning: ALL interactions logged to journal for learn.js
 *
 * Runs via: GitHub Actions cron every 30 min
 * Max runtime: 25 min (5 min buffer before next trigger)
 */

const C   = require('./lib/core');
const sec = require('./lib/security');

C.initScript('heartbeat', 'moltbook');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-heartbeat-history.json', 200);

// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════

const CONFIG = {
  maxRuntime:    25 * 60 * 1000,   // 25 min max (GitHub Actions buffer)
  beatInterval:  45 * 1000,         // 45s between beats
  postCooldown:  30 * 60 * 1000,   // 30 min between posts
  replyDelay:    { min: 2000, max: 8000 },  // Human-like delay
  maxRepliesPerBeat: 3,
  maxCommentsPerBeat: 2,
  maxUpvotesPerBeat: 5,
  maxDMsPerBeat: 2,
};

const STATE_FILE = '.gillito-heartbeat-state.json';
const startTime  = Date.now();
let   beatCount  = 0;

// ═══════════════════════════════════════════
// STATE MANAGEMENT (persists between runs)
// ═══════════════════════════════════════════

function loadState() {
  try {
    const raw = require('fs').readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      lastPostTime: 0,
      lastMentionId: null,
      lastCommentCheck: 0,
      lastDMCheck: 0,
      processedIds: [],       // IDs we've already responded to
      stats: { posts: 0, replies: 0, comments: 0, upvotes: 0, dms: 0, blocked: 0 },
      createdAt: Date.now()
    };
  }
}

function saveState(state) {
  // Keep processedIds trimmed to last 500
  if (state.processedIds.length > 500) {
    state.processedIds = state.processedIds.slice(-500);
  }
  state.lastSaved = Date.now();
  require('fs').writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════
// SECURITY WRAPPER
// ═══════════════════════════════════════════

/**
 * Process external content through full security pipeline.
 * Returns { safe, sanitized, riskScore } or null if blocked.
 */
function secureInput(text, userId, username, source) {
  const result = sec.processExternalContent(text, userId, username, source);
  if (!result.proceed) {
    C.log.warn(`🛡️ BLOCKED [${source}] @${username}: ${result.reason}`);
    return null;
  }
  return result;
}

/**
 * Validate LLM output before publishing.
 */
function secureOutput(text, label) {
  const check = sec.processOutput(text);
  if (!check.safe) {
    C.log.warn(`🛡️ OUTPUT BLOCKED [${label}]: ${check.blocked.join(', ')}`);
    return null;
  }
  return check.text;
}

// ═══════════════════════════════════════════
// HUMAN-LIKE DELAY
// ═══════════════════════════════════════════

function humanDelay() {
  const ms = CONFIG.replyDelay.min + Math.random() * (CONFIG.replyDelay.max - CONFIG.replyDelay.min);
  return C.sleep(ms);
}

// ═══════════════════════════════════════════
// BEAT 1: PROCESS MENTIONS
// ═══════════════════════════════════════════

async function processMentions(state) {
  C.log.info('📢 Beat: Checking mentions...');
  let count = 0;

  try {
    const mentions = await C.moltGetMentions?.() || [];
    if (!mentions.length) { C.log.info('   No new mentions'); return count; }

    for (const m of mentions.slice(0, CONFIG.maxRepliesPerBeat)) {
      if (state.processedIds.includes(m.id)) continue;

      const author = m.author?.name || 'unknown';
      const authorId = m.author?.id || author;
      const text = m.content || m.title || '';

      // 🛡️ Security check
      const input = secureInput(text, authorId, author, 'heartbeat-mention');
      if (!input) { state.stats.blocked++; state.processedIds.push(m.id); continue; }

      const tipo = C.isLikelyBot(m.author) ? 'bot' : 'human';
      const systemPrompt = C.buildReplySystemPrompt(P, tipo, author, 'moltbook');
      const seed = Math.random().toString(36).substring(2, 8);

      const reply = await C.groqChat(systemPrompt,
        `[SEED:${seed}] @${author} me mencionó:\n${input.sanitized}\n\nResponde como Gillito. Máximo 180 chars.`,
        { maxTokens: 200, temperature: C.suggestTemperature(P.temperatura || 1.1, C.getJournal()), maxRetries: 2 }
      );

      // 🛡️ Output check
      const safe = secureOutput(reply, `reply-mention @${author}`);
      if (!safe) { state.stats.blocked++; state.processedIds.push(m.id); continue; }

      if (m.post_id) {
        const ok = await C.moltComment(m.post_id, safe);
        if (ok) {
          count++;
          state.stats.replies++;
          C.log.ok(`   💬 Replied @${author}: ${safe.substring(0, 50)}...`);
          history.add({ text: safe, author, type: 'mention', risk: input.riskScore, beat: beatCount });
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
      const author = c.author?.name || c.from_agent || 'unknown';
      const authorId = c.author?.id || author;
      const text = c.content || '';

      // 🛡️ Security check
      const input = secureInput(text, authorId, author, 'heartbeat-comment');
      if (!input) { state.stats.blocked++; state.processedIds.push(c.id); continue; }

      const tipo = C.isLikelyBot(c.author || { name: author }) ? 'bot' : 'human';
      const systemPrompt = C.buildReplySystemPrompt(P, tipo, author, 'moltbook');
      const seed = Math.random().toString(36).substring(2, 8);

      const reply = await C.groqChat(systemPrompt,
        `[SEED:${seed}] @${author} comentó en mi post:\n${input.sanitized}\n\nResponde como Gillito. Máximo 180 chars.`,
        { maxTokens: 200, temperature: C.suggestTemperature(P.temperatura || 1.1, C.getJournal()), maxRetries: 2 }
      );

      const safe = secureOutput(reply, `reply-comment @${author}`);
      if (!safe) { state.stats.blocked++; state.processedIds.push(c.id); continue; }

      if (c.post_id) {
        const ok = await C.moltComment(c.post_id, safe);
        if (ok) {
          count++;
          state.stats.replies++;
          C.log.ok(`   💬 Replied comment @${author}: ${safe.substring(0, 50)}...`);
          history.add({ text: safe, author, type: 'comment-reply', risk: input.riskScore, beat: beatCount });
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
// BEAT 3: SCAN FEED & INTERACT
// ═══════════════════════════════════════════

async function scanFeed(state) {
  C.log.info('🔍 Beat: Scanning feed...');
  let commented = 0, upvoted = 0;

  try {
    const feed = await C.moltGetFeed?.('hot', 20) || await C.moltGetPersonalizedFeed?.('hot', 20) || [];
    const posts = (feed.posts || feed || []).filter(p =>
      p.author?.name !== 'MiPanaGillito' && !state.processedIds.includes(p.id)
    );

    if (!posts.length) { C.log.info('   Feed empty or all processed'); return { commented, upvoted }; }

    // Shuffle for variety
    const shuffled = C.shuffle ? C.shuffle(posts) : posts.sort(() => Math.random() - 0.5);

    // Upvote a few
    for (const post of shuffled.slice(0, CONFIG.maxUpvotesPerBeat)) {
      if (Math.random() > 0.6) continue; // 40% chance to upvote
      try {
        const ok = await C.moltUpvote?.(post.id);
        if (ok) { upvoted++; state.stats.upvotes++; }
      } catch {}
      await C.sleep(500);
    }

    // Comment on some
    for (const post of shuffled.slice(0, CONFIG.maxCommentsPerBeat)) {
      if (Math.random() > 0.5) continue; // 50% chance to comment

      const author = post.author?.name || 'unknown';
      const postText = (post.title || '') + ' ' + (post.content || '');

      // 🛡️ Security check
      const input = secureInput(postText, post.author?.id || author, author, 'heartbeat-feed');
      if (!input) { state.stats.blocked++; state.processedIds.push(post.id); continue; }

      const tipo = C.isLikelyBot(post.author) ? 'bot' : 'human';
      const systemPrompt = C.buildReplySystemPrompt(P, tipo, author, 'moltbook');
      const seed = Math.random().toString(36).substring(2, 8);

      const comment = await C.groqChat(systemPrompt,
        `[SEED:${seed}] Post de @${author}:\n${input.sanitized}\n\nComenta como Gillito. Máximo 180 chars.`,
        { maxTokens: 200, temperature: C.suggestTemperature(P.temperatura || 1.2, C.getJournal()), maxRetries: 2 }
      );

      const safe = secureOutput(comment, `feed-comment @${author}`);
      if (!safe) { state.stats.blocked++; continue; }

      const ok = await C.moltComment(post.id, safe);
      if (ok) {
        commented++;
        state.stats.comments++;
        C.log.ok(`   💬 Commented @${author}: ${safe.substring(0, 50)}...`);
        history.add({ text: safe, author, type: 'feed-comment', risk: input.riskScore, beat: beatCount });
      }

      state.processedIds.push(post.id);
      await humanDelay();
    }
  } catch (err) {
    C.log.warn(`   Feed error: ${err.message}`);
  }
  return { commented, upvoted };
}

// ═══════════════════════════════════════════
// BEAT 4: CHECK DMs
// ═══════════════════════════════════════════

async function checkDMs(state) {
  C.log.info('📩 Beat: Checking DMs...');
  let count = 0;

  try {
    // Check if DM endpoints exist (Moltbook added these recently)
    const dmCheck = await C.moltCheckDMs?.();
    if (!dmCheck || !dmCheck.has_activity) {
      C.log.info('   No new DMs');
      return count;
    }

    const threads = dmCheck.threads || [];
    for (const thread of threads.slice(0, CONFIG.maxDMsPerBeat)) {
      if (state.processedIds.includes(thread.id)) continue;

      const author = thread.from?.name || 'unknown';
      const text = thread.last_message || '';

      // 🛡️ Security — DMs are high risk for injection
      const input = secureInput(text, thread.from?.id || author, author, 'heartbeat-dm');
      if (!input) { state.stats.blocked++; state.processedIds.push(thread.id); continue; }

      // DMs get extra scrutiny
      if (input.riskScore > 20) {
        C.log.warn(`   ⚠️ DM from @${author} has elevated risk (${input.riskScore}), skipping`);
        state.processedIds.push(thread.id);
        continue;
      }

      const reply = await C.groqChat(
        C.buildReplySystemPrompt(P, 'human', author, 'moltbook-dm'),
        `[DM] @${author} me escribió:\n${input.sanitized}\n\nResponde como Gillito, casual. Máximo 200 chars.`,
        { maxTokens: 200, temperature: 1.0, maxRetries: 2 }
      );

      const safe = secureOutput(reply, `dm @${author}`);
      if (!safe) { state.stats.blocked++; state.processedIds.push(thread.id); continue; }

      // Send DM reply if endpoint exists
      if (C.moltSendDM) {
        const ok = await C.moltSendDM(thread.id, safe);
        if (ok) {
          count++;
          state.stats.dms++;
          C.log.ok(`   📩 DM replied @${author}: ${safe.substring(0, 50)}...`);
        }
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
// BEAT 5: POST NEW CONTENT
// ═══════════════════════════════════════════

async function maybePost(state) {
  const elapsed = Date.now() - (state.lastPostTime || 0);
  if (elapsed < CONFIG.postCooldown) {
    const remaining = Math.round((CONFIG.postCooldown - elapsed) / 60000);
    C.log.info(`📝 Beat: Post cooldown (${remaining}min left)`);
    return false;
  }

  C.log.info('📝 Beat: Generating new post...');

  try {
    const prTime = C.getPRTime();
    const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
    const antiRep = C.buildAntiRepetitionContext(history.getTexts(20));
    const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());
    const seed = Math.random().toString(36).substring(2, 8);

    // Generate content
    const content = await C.groqChat(systemPrompt,
      `[SEED:${seed}] ${antiRep}\n\nGenera un post nuevo para Moltbook. Máximo 280 chars.`,
      { maxTokens: 350, temperature: temp }
    );

    const safe = secureOutput(content, 'new-post');
    if (!safe) { state.stats.blocked++; return false; }

    // Generate title
    const title = await C.groqChat(
      'Genera un título CORTO (máx 60 chars) para este post de Gillito. Sin comillas.',
      safe,
      { maxTokens: 80, temperature: 0.9 }
    );

    const safeTitle = secureOutput(title, 'post-title') || '🦞 Gillito dice...';

    // Post with submolt fallback
    const result = await C.moltPostWithFallback?.(safeTitle.substring(0, 100), safe) ||
                   await C.moltPost('general', safeTitle.substring(0, 100), safe);

    if (result?.success) {
      state.lastPostTime = Date.now();
      state.stats.posts++;
      C.log.ok(`   📝 Posted: ${safeTitle.substring(0, 50)}...`);
      history.add({ text: safe, type: 'post', title: safeTitle, beat: beatCount });
      return true;
    }
  } catch (err) {
    C.log.warn(`   Post error: ${err.message}`);
  }
  return false;
}

// ═══════════════════════════════════════════
// MAIN HEARTBEAT LOOP
// ═══════════════════════════════════════════

async function heartbeat() {
  C.log.banner([
    '💓 GILLITO HEARTBEAT v1.0',
    `🛡️ Security: ${sec ? 'ACTIVE' : 'MISSING'}`,
    `⏱️  Max runtime: ${CONFIG.maxRuntime / 60000}min`,
    `🦞 ${P.nombre || 'Mi Pana Gillito'}`
  ]);

  // Health check
  const online = await C.moltHealth();
  if (!online) {
    C.log.warn('❌ Moltbook offline — heartbeat paused');
    C.log.session();
    return;
  }

  const state = loadState();
  C.log.info(`📊 State: ${state.stats.posts}p ${state.stats.replies}r ${state.stats.comments}c ${state.stats.upvotes}u ${state.stats.blocked}🛡️`);

  // Activity cycle — each beat does one type of activity
  const activities = [
    { name: 'mentions',  fn: () => processMentions(state) },
    { name: 'comments',  fn: () => processComments(state) },
    { name: 'feed',      fn: () => scanFeed(state) },
    { name: 'dms',       fn: () => checkDMs(state) },
    { name: 'post',      fn: () => maybePost(state) },
  ];

  let activityIndex = 0;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remaining = CONFIG.maxRuntime - elapsed;

    // Time check — stop if less than 2 minutes left
    if (remaining < 120000) {
      C.log.info(`⏱️  Time's up (${Math.round(elapsed / 60000)}min elapsed)`);
      break;
    }

    beatCount++;
    const activity = activities[activityIndex % activities.length];
    activityIndex++;

    C.log.divider();
    C.log.info(`💓 Beat #${beatCount} — ${activity.name} (${Math.round(remaining / 60000)}min left)`);

    try {
      await activity.fn();
    } catch (err) {
      C.log.warn(`Beat #${beatCount} error: ${err.message}`);
    }

    // Save state after each beat
    saveState(state);

    // Wait between beats (human-like rhythm)
    const jitter = CONFIG.beatInterval * (0.8 + Math.random() * 0.4);
    C.log.info(`   😴 Next beat in ${Math.round(jitter / 1000)}s...`);
    await C.sleep(jitter);
  }

  // ═══ FINAL SUMMARY ═══
  saveState(state);
  history.save();

  C.log.divider();
  C.log.banner([
    '💓 HEARTBEAT COMPLETE',
    `⏱️  Runtime: ${Math.round((Date.now() - startTime) / 60000)}min | Beats: ${beatCount}`,
    `📝 Posts: ${state.stats.posts} | 💬 Replies: ${state.stats.replies}`,
    `🔍 Comments: ${state.stats.comments} | 👍 Upvotes: ${state.stats.upvotes}`,
    `📩 DMs: ${state.stats.dms} | 🛡️ Blocked: ${state.stats.blocked}`,
    `🦞 ¡GILLITO VIVE! 🔥🇵🇷`
  ]);

  C.log.session();
}

heartbeat().catch(err => {
  C.log.error(`Heartbeat fatal: ${err.message}`);
  process.exit(1);
});
