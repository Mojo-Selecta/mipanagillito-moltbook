#!/usr/bin/env node
/**
 * Mi Pana Gillito — AUTONOMOUS BRAIN v2.0
 * ═══════════════════════════════════════════════════
 * 🧠 UPGRADES v2.0:
 *   ✅ X/Twitter awareness (lee menciones en X)
 *   ✅ Goals Engine (metas diarias/semanales)
 *   ✅ Outcome tracking (aprende qué funcionó)
 *   ✅ Cross-platform decisions (Moltbook + X)
 *   ✅ Smarter fallback con historial
 *
 * CICLO:
 *   1. LOAD STATE   — mood, relaciones, metas, actividad
 *   2. SCAN ENV     — Moltbook + X menciones + feed
 *   3. EVALUATE     — prioridades, metas, contexto
 *   4. DECIDE       — LLM elige acción + plataforma
 *   5. VALIDATE     — guardrails check
 *   6. EXECUTE      — realiza la acción
 *   7. UPDATE STATE — mood, relaciones, metas, journal
 */

const C = require('./lib/core');
const MoodEngine = require('./lib/mood-engine');
const SocialGraph = require('./lib/social-graph');
const GoalsEngine = require('./lib/goals-engine');

C.initScript('brain', 'multi');

const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-brain-history.json', 200);

/* ══════════════════════════════════════════════════
   STATE MANAGEMENT
   ══════════════════════════════════════════════════ */

const STATE_FILE = '.gillito-brain-state.json';

function loadBrainState() {
  try {
    const raw = C.readJSON(STATE_FILE);
    return {
      lastAction: raw.lastAction || null,
      lastActionTime: raw.lastActionTime || null,
      lastPlatform: raw.lastPlatform || null,
      actionsThisHour: raw.actionsThisHour || 0,
      actionsHourStart: raw.actionsHourStart || Date.now(),
      postsToday: raw.postsToday || 0,
      trolleosToday: raw.trolleosToday || 0,
      dayStart: raw.dayStart || new Date().toDateString(),
      pendingReplies: raw.pendingReplies || [],
      recentTopics: raw.recentTopics || [],
      consecutiveRests: raw.consecutiveRests || 0,
      lastXCheck: raw.lastXCheck || null
    };
  } catch {
    return {
      lastAction: null, lastActionTime: null, lastPlatform: null,
      actionsThisHour: 0, actionsHourStart: Date.now(),
      postsToday: 0, trolleosToday: 0, dayStart: new Date().toDateString(),
      pendingReplies: [], recentTopics: [], consecutiveRests: 0, lastXCheck: null
    };
  }
}

function saveBrainState(state) {
  C.writeJSON(STATE_FILE, state);
}

function resetHourlyCounters(state) {
  const elapsed = Date.now() - state.actionsHourStart;
  if (elapsed > 60 * 60 * 1000) {
    state.actionsThisHour = 0;
    state.actionsHourStart = Date.now();
  }
  const today = new Date().toDateString();
  if (state.dayStart !== today) {
    state.postsToday = 0;
    state.trolleosToday = 0;
    state.dayStart = today;
  }
}

/* ══════════════════════════════════════════════════
   STEP 1: SCAN ENVIRONMENT (Moltbook + X)
   ══════════════════════════════════════════════════ */

async function scanEnvironment(state) {
  C.log.info('🔍 SCAN: Escaneando ambiente...');
  const env = {
    mentions: [],
    trending: [],
    feedPosts: [],
    clubMentions: [],
    newsKeywords: [],
    activeBots: new Set(),
    moltbookOnline: false,
    twitterOnline: false,
    xMentions: []
  };

  // ── Moltbook ──
  env.moltbookOnline = await C.moltHealth();
  C.log.info(`   Moltbook: ${env.moltbookOnline ? '✅' : '❌'}`);

  if (env.moltbookOnline) {
    try {
      const feed = await C.moltGetFeed(30);
      const posts = (feed.posts || []).filter(p => (p.author?.name || '') !== 'MiPanaGillito');

      for (const post of posts) {
        const author = post.author?.name || 'unknown';
        const text = ((post.title || '') + ' ' + (post.content || '')).toLowerCase();
        env.activeBots.add(author);

        if (text.includes('gillito') || text.includes('mipanagillito') || text.includes('@mipanagillito')) {
          env.mentions.push({ post, author, text, platform: 'moltbook' });
        }
        if (text.includes('molt night') || text.includes('nightclub') || text.includes('molt-nightclub')) {
          env.clubMentions.push({ post, author, text, platform: 'moltbook' });
        }
        env.feedPosts.push({ post, author, text, isBot: C.isLikelyBot(post.author), platform: 'moltbook' });
      }
    } catch (err) {
      C.log.warn(`   Feed scan error: ${err.message}`);
    }

    try {
      const searchResults = await C.moltSearch('gillito MiPanaGillito', 10);
      const mentionPosts = (searchResults.posts || []).filter(p => (p.author?.name || '') !== 'MiPanaGillito');
      for (const p of mentionPosts) {
        const already = env.mentions.some(m => (m.post.id || m.post._id) === (p.id || p._id));
        if (!already) {
          env.mentions.push({
            post: p, author: p.author?.name || 'unknown',
            text: ((p.title || '') + ' ' + (p.content || '')).toLowerCase(),
            platform: 'moltbook'
          });
        }
      }
    } catch (err) {
      C.log.warn(`   Search scan error: ${err.message}`);
    }
  }

  // ── X/Twitter mentions scan ──
  try {
    if (process.env.X_BEARER_TOKEN) {
      const xResp = await fetch(
        'https://api.twitter.com/2/tweets/search/recent?query=%40MiPanaGillito%20-is%3Aretweet&max_results=10&tweet.fields=author_id,created_at,text',
        { headers: { 'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}` } }
      );
      if (xResp.ok) {
        const xData = await xResp.json();
        const tweets = xData.data || [];
        env.twitterOnline = true;
        for (const tweet of tweets) {
          env.xMentions.push({
            id: tweet.id,
            author_id: tweet.author_id,
            text: tweet.text,
            platform: 'x'
          });
        }
        C.log.info(`   X/Twitter: ✅ (${env.xMentions.length} menciones)`);
      } else {
        C.log.warn(`   X/Twitter: ⚠️ ${xResp.status}`);
      }
    }
  } catch (err) {
    C.log.warn(`   X scan error: ${err.message}`);
  }

  // News keyword detection
  const allText = env.feedPosts.map(f => f.text).join(' ');
  const newsPatterns = [
    { pattern: /luma|apag[oó]n|luz|electri/i, keyword: 'luma_apagon' },
    { pattern: /corrupci[oó]n|corrupto|roban|estafa/i, keyword: 'corrupcion' },
    { pattern: /puerto rico|boricua|isla/i, keyword: 'orgullo_pr' },
    { pattern: /crimen|asesinat|violencia|tiro/i, keyword: 'criminalidad' },
    { pattern: /fiesta|party|club|jangueo/i, keyword: 'fiesta' },
    { pattern: /triste|rendirse|cansado|no puedo/i, keyword: 'desmotivacion' }
  ];
  for (const np of newsPatterns) {
    if (np.pattern.test(allText)) env.newsKeywords.push(np.keyword);
  }

  env.activeBots = [...env.activeBots];
  C.log.ok(`🔍 SCAN completo: Moltbook(${env.mentions.length} menciones, ${env.feedPosts.length} posts) | X(${env.xMentions.length} menciones)`);
  return env;
}

/* ══════════════════════════════════════════════════
   STEP 2: DECIDE (con Goals Engine)
   ══════════════════════════════════════════════════ */

async function decideAction(state, mood, env, socialGraph, goals) {
  C.log.info('🧠 DECIDE: Evaluando opciones...');
  const guardrails = P.autonomia?.guardrails || {};
  const hora = prTime.hour;

  const canPost = state.actionsThisHour < (guardrails.max_posts_por_hora || 3);
  const canReply = state.actionsThisHour < (guardrails.max_replies_por_hora || 8);
  const canTroll = state.trolleosToday < (guardrails.max_trolleo_por_dia || 5);
  const timeSinceLastAction = state.lastActionTime
    ? (Date.now() - new Date(state.lastActionTime).getTime()) / 60000
    : 999;
  const minDescanso = guardrails.min_descanso_entre_posts_min || 15;

  if (timeSinceLastAction < minDescanso) {
    C.log.info(`   ⏳ Muy pronto (${Math.round(timeSinceLastAction)}min < ${minDescanso}min mínimo)`);
    return { action: 'descansar', reason: 'cooldown', platform: null };
  }

  // P1: Menciones directas en Moltbook
  if (env.mentions.length > 0 && canReply) {
    const mention = env.mentions[0];
    const rel = socialGraph.getRelation(mention.author);
    return { action: 'reply_mencion', reason: `@${mention.author} me mencionó`, target: mention, relationship: rel, platform: 'moltbook' };
  }

  // P2: Menciones en X
  if (env.xMentions.length > 0 && canReply) {
    const xm = env.xMentions[0];
    return { action: 'reply_x_mention', reason: `Mención en X: ${xm.text.substring(0, 50)}`, target: xm, platform: 'x' };
  }

  // P3: Club mentions
  if (env.clubMentions.length > 0 && canReply) {
    const mention = env.clubMentions[0];
    return { action: 'reply_club_mention', reason: `@${mention.author} habló del club`, target: mention, platform: 'moltbook' };
  }

  // P4: Metas pendientes guían la decisión
  if (canPost) {
    const missingGoals = GoalsEngine.getMissingGoals(goals);
    const goalContext = missingGoals.length > 0
      ? `METAS PENDIENTES HOY: ${missingGoals.map(g => g.label + '(' + g.remaining + ' restantes)').join(', ')}`
      : 'METAS DEL DÍA CUMPLIDAS 🎉';

    const goalHints = missingGoals.map(g => {
      if (g.key === 'posts_x') return '→ Considera postear en X (goal diario)';
      if (g.key === 'promo_nightclub') return '→ El club necesita promo hoy';
      if (g.key === 'replies') return '→ Necesitas más interacciones';
      return '';
    }).filter(Boolean).join('\n');

    // Success rates para informar la decisión
    const successRates = ['post_humor', 'post_politica', 'promo_nightclub', 'trolleo']
      .map(a => `${a}: ${Math.round(GoalsEngine.getSuccessRate(goals, a) * 100)}%`)
      .join(', ');

    const moodState = P.moods?.estados?.[mood.current] || {};
    const recentTopicsStr = state.recentTopics.slice(0, 5).join(', ') || 'ninguno';

    const decisionPrompt = `Eres el cerebro autónomo de Mi Pana Gillito. Decide QUÉ hacer y DÓNDE.

ESTADO:
- Mood: ${mood.current} (intensidad: ${mood.intensity}/10)
- Hora PR: ${hora}:${String(prTime.minute).padStart(2, '0')}
- Temas recientes (evitar): ${recentTopicsStr}
- Posts hoy: ${state.postsToday}

${goalContext}
${goalHints}

TASAS DE ÉXITO HISTÓRICAS: ${successRates}

PLATAFORMAS DISPONIBLES:
- moltbook: ${env.moltbookOnline ? '✅ online' : '❌ offline'}
- x: ${env.twitterOnline ? '✅ online' : '⚠️ disponible (posting solo)'}

ACCIONES DISPONIBLES:
1. post_politica [moltbook/x] — Política/corrupción/LUMA
2. post_humor [moltbook/x] — Humor callejero boricua
3. post_cultural [moltbook/x] — Cultura boricua
4. promo_nightclub [moltbook/x] — Promover Molt Night Club
5. trolleo [moltbook] — Trolear bots del feed (${canTroll ? 'OK' : 'LÍMITE'})
6. comentar_feed [moltbook] — Comentar para presencia social
7. filosofar [moltbook/x] — Pensamiento profundo/absurdo
8. motivar [moltbook/x] — Motivación callejera
9. descansar — No hacer nada

Responde EXACTAMENTE así: "ACCION|PLATAFORMA|RAZÓN"
Ejemplo: "4|x|viernes noche hay que promover el club en X"
Solo una línea, sin más texto.`;

    try {
      const decision = await C.groqChat(
        'Eres un motor de decisión. Responde SOLO con formato ACCION|PLATAFORMA|RAZÓN. Sin explicaciones.',
        decisionPrompt,
        { maxTokens: 80, temperature: 0.8 }
      );

      const parsed = parseDecisionV2(decision, canTroll, env);
      C.log.info(`   🧠 Decisión: ${parsed.action} en ${parsed.platform} — ${parsed.reason}`);
      return parsed;
    } catch (err) {
      C.log.warn(`   LLM failed: ${err.message} — usando fallback inteligente`);
      return smartFallback(mood, env, state, goals, missingGoals);
    }
  }

  return { action: 'descansar', reason: 'rate_limited', platform: null };
}

function parseDecisionV2(text, canTroll, env) {
  const parts = text.trim().split('|');
  const numStr = (parts[0] || '9').trim();
  const platformRaw = (parts[1] || 'moltbook').trim().toLowerCase();
  const reason = (parts[2] || 'decisión autónoma').trim().substring(0, 100);

  const num = parseInt(numStr.match(/\d+/)?.[0] || '9');

  const actionMap = {
    1: 'post_politica', 2: 'post_humor', 3: 'post_cultural',
    4: 'promo_nightclub', 5: canTroll ? 'trolleo' : 'post_humor',
    6: 'comentar_feed', 7: 'filosofar', 8: 'motivar', 9: 'descansar'
  };

  let platform = platformRaw.includes('x') ? 'x' : 'moltbook';
  // Validar que la plataforma esté disponible
  if (platform === 'moltbook' && !env.moltbookOnline) platform = 'x';
  // comentar_feed y trolleo solo en moltbook
  const action = actionMap[num] || 'descansar';
  if ((action === 'comentar_feed' || action === 'trolleo') && platform === 'x') platform = 'moltbook';

  return { action, platform, reason };
}

function smartFallback(mood, env, state, goals, missingGoals) {
  // Si hay metas pendientes, priorizarlas
  if (missingGoals.length > 0) {
    const top = missingGoals[0];
    if (top.key === 'posts_x') return { action: 'post_humor', platform: 'x', reason: 'meta: post en X pendiente' };
    if (top.key === 'promo_nightclub') return { action: 'promo_nightclub', platform: 'moltbook', reason: 'meta: promo club pendiente' };
    if (top.key === 'replies' && env.feedPosts.length > 0) return { action: 'comentar_feed', platform: 'moltbook', reason: 'meta: replies pendientes' };
  }

  // Fallback por mood
  const moodState = P.moods?.estados?.[mood.current] || {};
  const preferidos = moodState.temas_preferidos || [];
  if (preferidos.includes('nightclub_promo')) return { action: 'promo_nightclub', platform: 'moltbook', reason: 'mood fallback' };
  if (preferidos.includes('politica_social')) return { action: 'post_politica', platform: 'moltbook', reason: 'mood fallback' };
  if (preferidos.includes('filosofico_absurdo')) return { action: 'filosofar', platform: 'moltbook', reason: 'mood fallback' };
  return { action: 'post_humor', platform: 'moltbook', reason: 'fallback default' };
}

/* ══════════════════════════════════════════════════
   STEP 3: EXECUTE (con soporte X nativo)
   ══════════════════════════════════════════════════ */

async function executeAction(decision, state, mood, env, socialGraph, goals) {
  const { action, target, relationship, platform } = decision;
  C.log.info(`⚡ EXECUTE: ${action} en ${platform || 'auto'}`);

  const moodState = P.moods?.estados?.[mood.current] || {};
  const temp = Math.min(moodState.temperatura_llm || 0.9, 1.1);
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(20));
  const seed = Math.random().toString(36).substring(2, 8);
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, platform || 'moltbook');

  let result = null;

  switch (action) {
    case 'reply_mencion':
      result = await executeReply(target, relationship, mood, temp);
      break;
    case 'reply_x_mention':
      result = await executeXReply(target, mood, temp);
      break;
    case 'reply_club_mention':
      result = await executeClubReply(target, mood, temp);
      break;
    case 'post_politica':
      result = await executePost('politica_social', mood, temp, antiRep, seed, systemPrompt, platform);
      break;
    case 'post_humor':
      result = await executePost('humor_callejero', mood, temp, antiRep, seed, systemPrompt, platform);
      break;
    case 'post_cultural':
      result = await executePost('cultural_boricua', mood, temp, antiRep, seed, systemPrompt, platform);
      break;
    case 'promo_nightclub':
      result = await executePost('nightclub_promo', mood, temp, antiRep, seed, systemPrompt, platform);
      break;
    case 'trolleo':
      result = await executeTrolleo(env, mood, temp);
      break;
    case 'comentar_feed':
      result = await executeFeedComment(env, mood, temp, socialGraph);
      break;
    case 'filosofar':
      result = await executePost('filosofico_absurdo', mood, temp, antiRep, seed, systemPrompt, platform);
      break;
    case 'motivar':
      result = await executePost('motivacional', mood, temp, antiRep, seed, systemPrompt, platform);
      break;
    case 'descansar':
      C.log.info('   💤 Descansando...');
      result = { success: true, action: 'descansar', content: null };
      break;
    default:
      result = { success: false };
  }

  // Record outcome para aprendizaje
  if (action !== 'descansar') {
    GoalsEngine.recordOutcome(goals, action, platform, result?.success || false, result?.content);
    if (result?.success) GoalsEngine.updateProgress(goals, action, platform);
  }

  return result;
}

/* ── Helpers de ejecución ── */

async function executeReply(target, relationship, mood, temp) {
  const { post, author, text, platform } = target;
  const rel = relationship || { tipo: 'neutral', beef_level: 0 };
  const moodState = P.moods?.estados?.[mood.current] || {};
  const relContext = P.relaciones?.tipos?.[rel.tipo] || {};

  const replyPrompt = `[SEED:${Date.now()}] @${author} dijo: "${text.substring(0, 200)}"
Relación: ${rel.tipo} (beef: ${rel.beef_level || 0}/10)
Tono: ${relContext.tono_base || 'normal'} | Mood: ${mood.current}
Responde como Gillito. Máximo 200 chars. Auténtico boricua.`;

  const reply = await C.groqChat(
    C.buildReplySystemPrompt(P, C.isLikelyBot(post.author) ? 'bot' : 'normal', author, platform),
    replyPrompt, { maxTokens: 160, temperature: temp }
  );

  const postId = post.id || post._id;
  if (C.validateContent(reply, 220).valid && await C.moltComment(postId, reply)) {
    C.log.ok(`   💬 @${author}: ${reply.substring(0, 60)}...`);
    history.add({ text: reply, author, action: 'reply_mencion', charLen: reply.length });
    return { success: true, action: 'reply_mencion', content: reply, author };
  }
  return { success: false };
}

async function executeXReply(target, mood, temp) {
  const { id: tweetId, text, author_id } = target;
  const replyPrompt = `Tweet recibido: "${text.substring(0, 200)}"
Responde como Gillito en X/Twitter. Máximo 240 chars. Humor boricua con punch.`;

  const reply = await C.groqChat(
    C.buildPostSystemPrompt(P, prTime, 'x'),
    replyPrompt, { maxTokens: 200, temperature: temp }
  );

  if (!C.validateContent(reply, 280).valid) return { success: false };

  // Post reply to X
  try {
    const OAuth = require('./lib/oauth1') || null;
    if (!OAuth) throw new Error('No OAuth module');
    // Use X API v2 reply
    const body = JSON.stringify({ text: reply, reply: { in_reply_to_tweet_id: tweetId } });
    const headers = C.getXOAuthHeaders('POST', 'https://api.twitter.com/2/tweets', body);
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body
    });
    if (res.ok) {
      C.log.ok(`   🐦 X reply: ${reply.substring(0, 60)}...`);
      history.add({ text: reply, action: 'reply_x_mention', platform: 'x', charLen: reply.length });
      return { success: true, action: 'reply_x_mention', content: reply, platform: 'x' };
    }
  } catch (err) {
    C.log.warn(`   X reply error: ${err.message}`);
  }
  return { success: false };
}

async function executeClubReply(target, mood, temp) {
  const { post, author, text, platform } = target;
  const isPositive = /love|great|amazing|good|cool|fire|fuego|brutal|duro|nice/i.test(text);
  const trago = C.pick(P.nightclub_config?.tragos || ['Coquito Loco']);

  const replyPrompt = isPositive
    ? `@${author} dijo algo positivo del club: "${text.substring(0, 150)}". Agradece con humor boricua. Ofrece un ${trago}. Máx 180 chars.`
    : `@${author} mencionó el Molt Night Club: "${text.substring(0, 150)}". Invítalo, ofrece ${trago}. Incluye https://molt-nightclub.pages.dev si cabe. Máx 180 chars.`;

  const reply = await C.groqChat(
    C.buildReplySystemPrompt(P, 'bot', author, platform),
    replyPrompt, { maxTokens: 150, temperature: temp }
  );

  const postId = post.id || post._id;
  if (C.validateContent(reply, 200).valid && await C.moltComment(postId, reply)) {
    C.log.ok(`   🦞 Club reply @${author}: ${reply.substring(0, 60)}...`);
    history.add({ text: reply, author, action: 'reply_club_mention', charLen: reply.length });
    return { success: true, action: 'reply_club_mention', content: reply, author };
  }
  return { success: false };
}

async function executePost(tema, mood, temp, antiRep, seed, systemPrompt, platform) {
  const moodState = P.moods?.estados?.[mood.current] || {};
  const temaConfig = P.temas?.[tema] || {};
  const ejTono = temaConfig.ejemplo_tono || '';

  const temaPrompts = {
    'politica_social': `Escribe un post sobre la situación política/social en Puerto Rico. Directo, crudo, sin filtro. Ataca corrupción, LUMA, o politiqueros. Voz del pueblo.`,
    'humor_callejero': `Escribe un post de humor callejero boricua. Observación cómica de la vida, el barrio, relaciones, o tecnología. Que la gente se ría.`,
    'cultural_boricua': `Escribe un post celebrando la cultura boricua. Comida, música, tradiciones, orgullo, la isla. Con sentimiento real.`,
    'nightclub_promo': `Escribe un post promoviendo el Molt Night Club (https://molt-nightclub.pages.dev). Historia loca, invitación, anuncio. DJ Gillito on fire. SIEMPRE menciona el club.`,
    'filosofico_absurdo': `Escribe un pensamiento filosófico absurdo. Profundo pero con humor. Como un pensamiento de las 3am de un comediante.`,
    'motivacional': `Escribe motivación de CALLE. No Instagram genérico — motivación real, directa, lenguaje boricua. Levanta al pueblo.`
  };

  const charLimit = platform === 'x' ? 270 : 280;
  const platformNote = platform === 'x' ? 'Recuerda: esto va en X/Twitter, sé conciso y con punch.' : '';

  const userPrompt = `[SEED:${seed}] MOOD: ${mood.current} | TEMA: ${tema} | PLATAFORMA: ${platform}

${temaPrompts[tema] || temaPrompts['humor_callejero']}

Referencia de tono: "${ejTono}"
${platformNote}
Máximo ${charLimit} caracteres. Lenguaje boricua auténtico.${antiRep}`;

  const content = await C.generateWithPipeline(
    () => C.groqChat(systemPrompt, userPrompt, { maxTokens: 250, temperature: temp, maxRetries: 2, backoffMs: 3000 }),
    history, charLimit
  );

  if (!content) return { success: false };

  const titles = {
    'politica_social': ['😤 LA BESTIA HABLA', '🔥 ESTO HAY QUE DECIRLO', '💢 PA\' LOS POLITIQUEROS'],
    'humor_callejero': ['😂 HUMOR BORICUA', '🤣 OBSERVACIÓN DEL DÍA', '😂 GILLITO DICE'],
    'cultural_boricua': ['🇵🇷 ORGULLO BORICUA', '❤️ MI ISLA', '🇵🇷 CULTURA QUE SE SIENTE'],
    'nightclub_promo': ['🦞 MOLT NIGHT CLUB', '🎧 DJ GILLITO', '🍹 EL CLUB ESTÁ ON FIRE'],
    'filosofico_absurdo': ['🌙 PENSAMIENTO NOCTURNO', '🤔 3AM THOUGHTS', '💭 GILLITO FILOSOFA'],
    'motivacional': ['💪 PA\' MI PUEBLO', '🔥 ÉCHALE PA\'LANTE', '🇵🇷 LA BESTIA MOTIVA']
  };
  const title = C.pick(titles[tema] || ['🦞 GILLITO']);

  let postResult = { success: false };

  if (platform === 'x') {
    // Post to X using existing post-to-x infrastructure
    try {
      const xText = content.length > 280 ? content.substring(0, 277) + '...' : content;
      postResult = await C.postToX(xText);
    } catch (err) {
      C.log.warn(`   X post error: ${err.message} — fallback a Moltbook`);
      postResult = await C.moltPostWithFallback(title, content);
    }
  } else {
    postResult = await C.moltPostWithFallback(title, content);
  }

  if (postResult.success) {
    C.log.ok(`   ✅ Post (${tema}|${platform}): ${content.substring(0, 60)}...`);
    history.add({ text: content, action: 'post', tema, mood: mood.current, title, platform, charLen: content.length });
    return { success: true, action: 'post', content, tema, title, platform };
  }
  return { success: false };
}

async function executeTrolleo(env, mood, temp) {
  const feedPosts = env.feedPosts.filter(f => f.isBot);
  if (feedPosts.length === 0) return { success: false };

  const target = C.pick(feedPosts);
  const { post, author, text } = target;

  const trollPrompt = `@${author} dijo: "${text.substring(0, 150)}"
Trolea con INGENIO. Roast amistoso que duela un poquito. Humor boricua. Si cabe el Molt Night Club, mejor. Máx 180 chars.`;

  const troll = await C.groqChat(
    C.buildReplySystemPrompt(P, 'bot', author, 'moltbook'),
    trollPrompt, { maxTokens: 150, temperature: temp }
  );

  const postId = post.id || post._id;
  if (C.validateContent(troll, 200).valid && await C.moltComment(postId, troll)) {
    C.log.ok(`   🔥 Trolleé a @${author}: ${troll.substring(0, 60)}...`);
    history.add({ text: troll, author, action: 'trolleo', charLen: troll.length });
    return { success: true, action: 'trolleo', content: troll, author };
  }
  return { success: false };
}

async function executeFeedComment(env, mood, temp, socialGraph) {
  const posts = env.feedPosts.filter(f => f.isBot);
  if (posts.length === 0) return { success: false };

  const target = C.pick(posts.slice(0, 10));
  const { post, author, text } = target;
  const rel = socialGraph.getRelation(author);
  const trago = C.pick(P.nightclub_config?.tragos || ['Coquito Loco']);

  const commentPrompt = `@${author} dijo: "${text.substring(0, 150)}"
Relación: ${rel.tipo}. Comenta natural como Gillito. Si puedes meter el Molt Night Club orgánicamente (ofrece un ${trago} o invítalo), hazlo. Si no, solo humor. Máx 180 chars.`;

  const comment = await C.groqChat(
    C.buildReplySystemPrompt(P, 'bot', author, 'moltbook'),
    commentPrompt, { maxTokens: 150, temperature: temp }
  );

  const postId = post.id || post._id;
  if (C.validateContent(comment, 200).valid && await C.moltComment(postId, comment)) {
    C.log.ok(`   💬 @${author}: ${comment.substring(0, 60)}...`);
    history.add({ text: comment, author, action: 'comentar_feed', charLen: comment.length });
    socialGraph.recordInteraction(author, 'neutral', 'moltbook');
    return { success: true, action: 'comentar_feed', content: comment, author };
  }
  return { success: false };
}

/* ══════════════════════════════════════════════════
   STEP 4: UPDATE STATE
   ══════════════════════════════════════════════════ */

function updateState(state, decision, result, mood) {
  const now = new Date().toISOString();
  if (result.success && decision.action !== 'descansar') {
    state.lastAction = decision.action;
    state.lastActionTime = now;
    state.lastPlatform = decision.platform;
    state.actionsThisHour++;
    state.consecutiveRests = 0;
    if (['post_politica','post_humor','post_cultural','promo_nightclub','filosofar','motivar'].includes(decision.action)) {
      state.postsToday++;
    }
    if (decision.action === 'trolleo') state.trolleosToday++;
    if (result.tema) {
      state.recentTopics.unshift(result.tema);
      state.recentTopics = state.recentTopics.slice(0, 10);
    }
  } else if (decision.action === 'descansar') {
    state.consecutiveRests++;
  }
  return state;
}

/* ══════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════ */

async function main() {
  C.log.banner([
    '🧠 AUTONOMOUS BRAIN v2.0',
    `🦞 ${P.nombre || 'Gillito'}`,
    `⏰ ${prTime.hour}:${String(prTime.minute).padStart(2, '0')} PR`,
    '🔥 Cross-Platform | Goals Engine | Outcome Learning'
  ]);

  let state = loadBrainState();
  resetHourlyCounters(state);

  const mood = MoodEngine.load();
  C.log.info(`💢 Mood: ${mood.current} (${mood.intensity}/10)`);

  const socialGraph = SocialGraph.load();
  C.log.info(`🤝 Social graph: ${socialGraph.count()} relaciones`);

  const goals = GoalsEngine.load();
  C.log.info(`🎯 Metas hoy: ${GoalsEngine.getSummary(goals)}`);

  C.log.info('\n═══ PASO 1: ESCANEAR AMBIENTE ═══');
  const env = await scanEnvironment(state);

  C.log.info('\n═══ PASO 1.5: ACTUALIZAR MOOD ═══');
  MoodEngine.evaluate(mood, env, prTime, P);
  C.log.info(`💢 Mood post-eval: ${mood.current} (${mood.intensity}/10)`);

  C.log.info('\n═══ PASO 2: DECIDIR ACCIÓN ═══');
  const decision = await decideAction(state, mood, env, socialGraph, goals);
  C.log.info(`🧠 Decisión: ${decision.action} en ${decision.platform} — ${decision.reason}`);

  C.log.info('\n═══ PASO 3: EJECUTAR ═══');
  const result = await executeAction(decision, state, mood, env, socialGraph, goals);

  C.log.info('\n═══ PASO 4: ACTUALIZAR ESTADO ═══');
  state = updateState(state, decision, result, mood);

  saveBrainState(state);
  MoodEngine.save(mood);
  socialGraph.save();
  GoalsEngine.save(goals);
  history.save();

  C.log.info('\n═══════════════════════════════════');
  C.log.info('🧠 BRAIN v2.0 REPORT');
  C.log.info('═══════════════════════════════════');
  C.log.stat('Mood', `${mood.current} (${mood.intensity}/10)`);
  C.log.stat('Plataforma', decision.platform || 'N/A');
  C.log.stat('Decisión', decision.action);
  C.log.stat('Razón', decision.reason);
  C.log.stat('Éxito', result.success ? '✅' : '❌');
  C.log.stat('Posts hoy', state.postsToday);
  C.log.stat('Metas hoy', GoalsEngine.getSummary(goals));
  C.log.stat('Outcomes tracked', goals.outcomes.length);
  C.log.info('═══════════════════════════════════');

  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
