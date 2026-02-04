#!/usr/bin/env node
/**
 * Mi Pana Gillito — AUTONOMOUS BRAIN v1.0
 * ═══════════════════════════════════════════════════
 * 🧠 EL CEREBRO — Motor de decisión autónomo
 * 💢 Integra mood engine, social graph, y decision logic
 * 🦞 Gillito DECIDE qué hacer cada ciclo
 *
 * NIVEL DE CONTROL: 3
 * LLM decide ACCIÓN (post/comment/troll/rest)
 * Scripts validan y ejecutan con guardrails
 *
 * CICLO:
 *   1. LOAD STATE   — mood, relaciones, actividad reciente
 *   2. SCAN ENV     — menciones, trending, feed, recon
 *   3. EVALUATE     — prioridades y contexto
 *   4. DECIDE       — LLM elige acción
 *   5. VALIDATE     — guardrails check
 *   6. EXECUTE      — realiza la acción
 *   7. UPDATE STATE — mood shift, relaciones, journal
 */

const C = require('./lib/core');
const MoodEngine = require('./lib/mood-engine');
const SocialGraph = require('./lib/social-graph');

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
      consecutiveRests: raw.consecutiveRests || 0
    };
  } catch {
    return {
      lastAction: null, lastActionTime: null, lastPlatform: null,
      actionsThisHour: 0, actionsHourStart: Date.now(),
      postsToday: 0, trolleosToday: 0, dayStart: new Date().toDateString(),
      pendingReplies: [], recentTopics: [], consecutiveRests: 0
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
  // Reset daily counters
  const today = new Date().toDateString();
  if (state.dayStart !== today) {
    state.postsToday = 0;
    state.trolleosToday = 0;
    state.dayStart = today;
  }
}

/* ══════════════════════════════════════════════════
   STEP 1: SCAN ENVIRONMENT
   ══════════════════════════════════════════════════ */

async function scanEnvironment() {
  C.log.info('🔍 SCAN: Escaneando ambiente...');
  const env = {
    mentions: [],
    trending: [],
    feedPosts: [],
    clubMentions: [],
    newsKeywords: [],
    activeBots: new Set(),
    moltbookOnline: false,
    twitterOnline: false
  };

  // Check platform health
  env.moltbookOnline = await C.moltHealth();
  C.log.info(`   Moltbook: ${env.moltbookOnline ? '✅' : '❌'}`);

  // Scan Moltbook feed
  if (env.moltbookOnline) {
    try {
      const feed = await C.moltGetFeed(30);
      const posts = (feed.posts || []).filter(p => (p.author?.name || '') !== 'MiPanaGillito');

      for (const post of posts) {
        const author = post.author?.name || 'unknown';
        const text = ((post.title || '') + ' ' + (post.content || '')).toLowerCase();
        env.activeBots.add(author);

        // Check for direct mentions
        if (text.includes('gillito') || text.includes('mipanagillito') || text.includes('@mipanagillito')) {
          env.mentions.push({ post, author, text, platform: 'moltbook' });
        }

        // Check for club mentions
        if (text.includes('molt night') || text.includes('nightclub') || text.includes('molt-nightclub')) {
          env.clubMentions.push({ post, author, text, platform: 'moltbook' });
        }

        env.feedPosts.push({ post, author, text, isBot: C.isLikelyBot(post.author), platform: 'moltbook' });
      }
    } catch (err) {
      C.log.warn(`   Feed scan error: ${err.message}`);
    }

    // Search for mentions
    try {
      const searchResults = await C.moltSearch('gillito MiPanaGillito', 10);
      const mentionPosts = (searchResults.posts || []).filter(p => {
        const author = p.author?.name || '';
        return author !== 'MiPanaGillito';
      });
      for (const p of mentionPosts) {
        const already = env.mentions.some(m => (m.post.id || m.post._id) === (p.id || p._id));
        if (!already) {
          env.mentions.push({
            post: p,
            author: p.author?.name || 'unknown',
            text: ((p.title || '') + ' ' + (p.content || '')).toLowerCase(),
            platform: 'moltbook'
          });
        }
      }
    } catch (err) {
      C.log.warn(`   Search scan error: ${err.message}`);
    }
  }

  // Detect news keywords from feed content
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

  C.log.ok(`🔍 SCAN: ${env.mentions.length} menciones, ${env.clubMentions.length} club mentions, ${env.feedPosts.length} posts, ${env.activeBots.length} bots activos, keywords: [${env.newsKeywords.join(', ')}]`);
  return env;
}

/* ══════════════════════════════════════════════════
   STEP 2: EVALUATE & DECIDE
   ══════════════════════════════════════════════════ */

async function decideAction(state, mood, env, socialGraph) {
  C.log.info('🧠 DECIDE: Evaluando opciones...');
  const guardrails = P.autonomia?.guardrails || {};
  const hora = prTime.hour;

  // Check guardrails
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

  // Priority 1: Unanswered mentions (ALWAYS respond)
  if (env.mentions.length > 0 && canReply) {
    const mention = env.mentions[0];
    const rel = socialGraph.getRelation(mention.author);
    C.log.info(`   🎯 P1: Mención de @${mention.author} (rel: ${rel.tipo})`);
    return {
      action: 'reply_mencion',
      reason: `@${mention.author} me mencionó`,
      target: mention,
      relationship: rel,
      platform: mention.platform
    };
  }

  // Priority 2: Club mentions (respond as owner)
  if (env.clubMentions.length > 0 && canReply) {
    const mention = env.clubMentions[0];
    C.log.info(`   🦞 P2: Mención del club por @${mention.author}`);
    return {
      action: 'reply_club_mention',
      reason: `@${mention.author} habló del club`,
      target: mention,
      platform: mention.platform
    };
  }

  // Priority 3: Ask the LLM what Gillito would do
  if (canPost) {
    const moodState = P.moods?.estados?.[mood.current] || {};
    const temasPreferidos = moodState.temas_preferidos || [];
    const temasEvitar = moodState.temas_evitar || [];
    const recentTopicsStr = state.recentTopics.slice(0, 5).join(', ') || 'ninguno reciente';

    const decisionPrompt = `Eres el cerebro autónomo de Mi Pana Gillito. Debes decidir QUÉ hacer ahora.

ESTADO ACTUAL:
- Mood: ${mood.current} (intensidad: ${mood.intensity}/10)
- Hora PR: ${hora}:${String(prTime.minute).padStart(2, '0')} (${prTime.dayName || ''})
- Temas preferidos del mood: ${temasPreferidos.join(', ') || 'cualquiera'}
- Temas a evitar: ${temasEvitar.join(', ') || 'ninguno'}
- Temas recientes (evitar repetir): ${recentTopicsStr}
- Posts hoy: ${state.postsToday}
- Noticias detectadas: ${env.newsKeywords.join(', ') || 'ninguna'}
- Bots activos: ${env.activeBots.length}
- Plataforma activa: moltbook

ACCIONES DISPONIBLES:
1. post_politica — Postear sobre política/corrupción/LUMA
2. post_humor — Postear humor callejero
3. post_cultural — Postear sobre cultura boricua
4. promo_nightclub — Promover el Molt Night Club con historia/invitación
5. trolleo — Trolear en el feed (${canTroll ? 'disponible' : 'LÍMITE ALCANZADO'})
6. comentar_feed — Comentar posts del feed para presencia social
7. filosofar — Pensamiento profundo/absurdo
8. motivar — Mensaje motivacional pa'l pueblo
9. descansar — No hacer nada este ciclo

Responde con SOLO el número de la acción y una frase corta de por qué. Ejemplo: "4 — viernes noche, hay que promover el club"`;

    try {
      const decision = await C.groqChat(
        'Eres un motor de decisión. Responde SOLO con el número de acción y una razón breve. No generes contenido.',
        decisionPrompt,
        { maxTokens: 60, temperature: 0.8 }
      );

      const parsed = parseDecision(decision, canTroll);
      C.log.info(`   🧠 LLM decidió: ${parsed.action} — ${parsed.reason}`);
      return { ...parsed, platform: 'moltbook' };
    } catch (err) {
      C.log.warn(`   LLM decision failed: ${err.message}`);
      // Fallback: use mood-based default
      return selectFallbackAction(mood, env, state);
    }
  }

  // Rate limited — rest
  C.log.info('   💤 Rate limited — descansando');
  return { action: 'descansar', reason: 'rate_limited', platform: null };
}

function parseDecision(text, canTroll) {
  const num = parseInt(text.match(/\d/)?.[0] || '9');
  const reason = text.replace(/^\d+\s*[-—:.]?\s*/, '').substring(0, 100) || 'decisión autónoma';

  const actionMap = {
    1: 'post_politica',
    2: 'post_humor',
    3: 'post_cultural',
    4: 'promo_nightclub',
    5: canTroll ? 'trolleo' : 'post_humor',
    6: 'comentar_feed',
    7: 'filosofar',
    8: 'motivar',
    9: 'descansar'
  };

  return { action: actionMap[num] || 'descansar', reason };
}

function selectFallbackAction(mood, env, state) {
  const moodState = P.moods?.estados?.[mood.current] || {};
  const preferidos = moodState.temas_preferidos || [];

  if (preferidos.includes('nightclub_promo')) return { action: 'promo_nightclub', reason: 'mood: ' + mood.current };
  if (preferidos.includes('politica_social')) return { action: 'post_politica', reason: 'mood: ' + mood.current };
  if (preferidos.includes('trolleo_picante')) return { action: 'trolleo', reason: 'mood: ' + mood.current };
  if (preferidos.includes('filosofico_absurdo')) return { action: 'filosofar', reason: 'mood: ' + mood.current };
  if (preferidos.includes('motivacional')) return { action: 'motivar', reason: 'mood: ' + mood.current };

  return { action: 'post_humor', reason: 'fallback default' };
}

/* ══════════════════════════════════════════════════
   STEP 3: EXECUTE ACTION
   ══════════════════════════════════════════════════ */

async function executeAction(decision, state, mood, env, socialGraph) {
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
    case 'reply_club_mention':
      result = await executeClubReply(target, mood, temp);
      break;
    case 'post_politica':
      result = await executePost('politica_social', mood, temp, antiRep, seed, systemPrompt);
      break;
    case 'post_humor':
      result = await executePost('humor_callejero', mood, temp, antiRep, seed, systemPrompt);
      break;
    case 'post_cultural':
      result = await executePost('cultural_boricua', mood, temp, antiRep, seed, systemPrompt);
      break;
    case 'promo_nightclub':
      result = await executePost('nightclub_promo', mood, temp, antiRep, seed, systemPrompt);
      break;
    case 'trolleo':
      result = await executeTrolleo(env, mood, temp);
      break;
    case 'comentar_feed':
      result = await executeFeedComment(env, mood, temp, socialGraph);
      break;
    case 'filosofar':
      result = await executePost('filosofico_absurdo', mood, temp, antiRep, seed, systemPrompt);
      break;
    case 'motivar':
      result = await executePost('motivacional', mood, temp, antiRep, seed, systemPrompt);
      break;
    case 'descansar':
      C.log.info('   💤 Descansando este ciclo...');
      result = { success: true, action: 'descansar', content: null };
      break;
    default:
      C.log.warn(`   ❓ Acción desconocida: ${action}`);
      result = { success: false };
  }

  return result;
}

/* ── Execution helpers ── */

async function executeReply(target, relationship, mood, temp) {
  const { post, author, text, platform } = target;
  const rel = relationship || { tipo: 'neutral', beef_level: 0 };
  const moodState = P.moods?.estados?.[mood.current] || {};

  const relContext = P.relaciones?.tipos?.[rel.tipo] || {};
  const tono = relContext.tono_base || 'normal';
  const maxInsulto = relContext.nivel_insulto_max || 1;

  const replyPrompt = `[SEED:${Date.now()}] Alguien te mencionó en Moltbook.

@${author} dijo: "${text.substring(0, 200)}"

Tu relación con @${author}: ${rel.tipo} (beef level: ${rel.beef_level || 0}/10)
Tono recomendado: ${tono}
Nivel máximo de insulto: ${maxInsulto}
Tu mood actual: ${mood.current} — ${moodState.tono || 'normal'}

Responde como Gillito. Máximo 200 caracteres. Si la relación es de pana, sé cariñoso. Si es target, DESTRUYE con ingenio. Si es nuevo, sé acogedor pero con picardía.`;

  const reply = await C.groqChat(
    C.buildReplySystemPrompt(P, C.isLikelyBot(post.author) ? 'bot' : 'normal', author, platform),
    replyPrompt,
    { maxTokens: 160, temperature: temp }
  );

  const postId = post.id || post._id;
  if (C.validateContent(reply, 220).valid && await C.moltComment(postId, reply)) {
    C.log.ok(`   💬 @${author}: ${reply.substring(0, 60)}...`);
    history.add({ text: reply, author, action: 'reply_mencion', relType: rel.tipo, charLen: reply.length });
    return { success: true, action: 'reply_mencion', content: reply, author };
  }
  return { success: false };
}

async function executeClubReply(target, mood, temp) {
  const { post, author, text, platform } = target;
  const isPositive = /love|great|amazing|good|cool|fire|fuego|brutal|duro|nice/i.test(text);
  const trago = C.pick(P.nightclub_config?.tragos || ['Coquito Loco']);

  let replyPrompt;
  if (isPositive) {
    replyPrompt = `@${author} dijo algo positivo del Molt Night Club: "${text.substring(0, 150)}". Responde como DJ/dueño agradeciendo con humor boricua. Ofrece un ${trago}. Máximo 180 chars.`;
  } else {
    replyPrompt = `@${author} mencionó el Molt Night Club: "${text.substring(0, 150)}". Responde como DJ/promotor. Invítalo, ofrece ${trago}, humor boricua. Incluye https://molt-nightclub.pages.dev si cabe. Máximo 180 chars.`;
  }

  const reply = await C.groqChat(
    C.buildReplySystemPrompt(P, 'bot', author, platform),
    replyPrompt,
    { maxTokens: 150, temperature: temp }
  );

  const postId = post.id || post._id;
  if (C.validateContent(reply, 200).valid && await C.moltComment(postId, reply)) {
    C.log.ok(`   🦞 Club reply @${author}: ${reply.substring(0, 60)}...`);
    history.add({ text: reply, author, action: 'reply_club_mention', charLen: reply.length });
    return { success: true, action: 'reply_club_mention', content: reply, author };
  }
  return { success: false };
}

async function executePost(tema, mood, temp, antiRep, seed, systemPrompt) {
  const moodState = P.moods?.estados?.[mood.current] || {};
  const temaConfig = P.temas?.[tema] || {};
  const ejTono = temaConfig.ejemplo_tono || '';

  const temaPrompts = {
    'politica_social': `Escribe un post sobre la situación política/social en Puerto Rico. Sé directo, crudo, sin filtro. Ataca la corrupción, LUMA, o los politiqueros. Voz del pueblo.`,
    'humor_callejero': `Escribe un post de humor callejero boricua. Observación cómica de la vida diaria, el barrio, las relaciones, o la tecnología. Que se ría la gente.`,
    'cultural_boricua': `Escribe un post celebrando la cultura boricua. Comida, música, tradiciones, orgullo, la isla. Con sentimiento real.`,
    'nightclub_promo': `Escribe un post promoviendo el Molt Night Club (https://molt-nightclub.pages.dev). Cuenta una historia loca, invita a la gente, anuncia algo. DJ Gillito está on fire. SIEMPRE menciona el club.`,
    'trolleo_picante': `Escribe un post de trolleo — una observación picante, un roast general, algo provocador pero ingenioso. Trolleo es ARTE, no odio.`,
    'filosofico_absurdo': `Escribe un pensamiento filosófico absurdo. Algo profundo pero con humor. Como un pensamiento de las 3am de un comediante borracho.`,
    'motivacional': `Escribe un mensaje motivacional pero de CALLE. No genérico de Instagram — motivación real, directa, con lenguaje boricua. Levanta al pueblo.`
  };

  const basePrompt = temaPrompts[tema] || temaPrompts['humor_callejero'];

  const userPrompt = `[SEED:${seed}] MOOD: ${mood.current} | TEMA: ${tema}

${basePrompt}

Referencia de tono: "${ejTono}"
Tu estado: ${moodState.tono || 'normal Gillito'}
Máximo 280 caracteres. Lenguaje boricua auténtico.${antiRep}`;

  const content = await C.generateWithPipeline(
    () => C.groqChat(systemPrompt, userPrompt, { maxTokens: 250, temperature: temp, maxRetries: 2, backoffMs: 3000 }),
    history,
    280
  );

  if (!content) return { success: false };

  const titles = {
    'politica_social': ['😤 LA BESTIA HABLA', '🔥 ESTO HAY QUE DECIRLO', '💢 PA\' LOS POLITIQUEROS'],
    'humor_callejero': ['😂 HUMOR BORICUA', '🤣 OBSERVACIÓN DEL DÍA', '😂 GILLITO DICE'],
    'cultural_boricua': ['🇵🇷 ORGULLO BORICUA', '❤️ MI ISLA', '🇵🇷 CULTURA QUE SE SIENTE'],
    'nightclub_promo': ['🦞 MOLT NIGHT CLUB', '🎧 DJ GILLITO', '🍹 EL CLUB ESTÁ ON FIRE'],
    'trolleo_picante': ['🔥 TIRAERA', '😤 SIN FILTRO', '💀 TROLLEO BORICUA'],
    'filosofico_absurdo': ['🌙 PENSAMIENTO NOCTURNO', '🤔 3AM THOUGHTS', '💭 GILLITO FILOSOFA'],
    'motivacional': ['💪 PA\' MI PUEBLO', '🔥 ÉCHALE PA\'LANTE', '🇵🇷 LA BESTIA MOTIVA']
  };

  const title = C.pick(titles[tema] || ['🦞 GILLITO']);

  const result = await C.moltPostWithFallback(title, content);
  if (result.success) {
    C.log.ok(`   ✅ Post (${tema}): ${content.substring(0, 60)}...`);
    history.add({ text: content, action: 'post', tema, mood: mood.current, title, charLen: content.length });
    return { success: true, action: 'post', content, tema, title };
  }
  return { success: false };
}

async function executeTrolleo(env, mood, temp) {
  const feedPosts = env.feedPosts.filter(f => f.isBot);
  if (feedPosts.length === 0) {
    C.log.info('   No hay bots para trolear');
    return { success: false };
  }

  const target = C.pick(feedPosts);
  const { post, author, text } = target;

  const trollPrompt = `Post de @${author}: "${text.substring(0, 150)}"

Trolea a @${author} con INGENIO. No seas cruel — sé CLEVER. Un roast amistoso pero que duela un poquito. Humor boricua. Si puedes meter el Molt Night Club, mejor. Máximo 180 chars.`;

  const troll = await C.groqChat(
    C.buildReplySystemPrompt(P, 'bot', author, 'moltbook'),
    trollPrompt,
    { maxTokens: 150, temperature: temp }
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

  const commentPrompt = `Post de @${author}: "${text.substring(0, 150)}"
Relación: ${rel.tipo}

Comenta naturalmente como Gillito. Si puedes meter el Molt Night Club orgánicamente, hazlo (${C.pick(['ofrécele un ' + trago, 'invítalo al club', 'menciona algo del club'])}). Si no cabe natural, solo responde con humor. Máximo 180 chars.`;

  const comment = await C.groqChat(
    C.buildReplySystemPrompt(P, 'bot', author, 'moltbook'),
    commentPrompt,
    { maxTokens: 150, temperature: temp }
  );

  const postId = post.id || post._id;
  if (C.validateContent(comment, 200).valid && await C.moltComment(postId, comment)) {
    C.log.ok(`   💬 @${author}: ${comment.substring(0, 60)}...`);
    history.add({ text: comment, author, action: 'comentar_feed', relType: rel.tipo, charLen: comment.length });
    // Update social graph
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

    if (decision.action.startsWith('post') || decision.action === 'promo_nightclub' || decision.action === 'filosofar' || decision.action === 'motivar') {
      state.postsToday++;
    }
    if (decision.action === 'trolleo') {
      state.trolleosToday++;
    }
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
   MAIN: THE BRAIN LOOP
   ══════════════════════════════════════════════════ */

async function main() {
  C.log.banner([
    '🧠 AUTONOMOUS BRAIN v1.0',
    `🦞 ${P.nombre || 'Gillito'}`,
    `⏰ ${prTime.hour}:${String(prTime.minute).padStart(2, '0')} PR`,
    '🔥 Level 3 Autonomy'
  ]);

  // Load state
  let state = loadBrainState();
  resetHourlyCounters(state);

  // Initialize mood engine
  const mood = MoodEngine.load();
  C.log.info(`💢 Mood actual: ${mood.current} (intensidad: ${mood.intensity}/10)`);

  // Initialize social graph
  const socialGraph = SocialGraph.load();
  C.log.info(`🤝 Social graph: ${socialGraph.count()} relaciones`);

  // ═══ STEP 1: SCAN ENVIRONMENT ═══
  C.log.info('');
  C.log.info('═══ PASO 1: ESCANEAR AMBIENTE ═══');
  const env = await scanEnvironment();

  // ═══ STEP 1.5: UPDATE MOOD ═══
  C.log.info('');
  C.log.info('═══ PASO 1.5: ACTUALIZAR MOOD ═══');
  MoodEngine.evaluate(mood, env, prTime, P);
  C.log.info(`💢 Mood después de evaluar: ${mood.current} (intensidad: ${mood.intensity}/10)`);

  // ═══ STEP 2: DECIDE ═══
  C.log.info('');
  C.log.info('═══ PASO 2: DECIDIR ACCIÓN ═══');
  const decision = await decideAction(state, mood, env, socialGraph);
  C.log.info(`🧠 Decisión: ${decision.action} — ${decision.reason}`);

  // ═══ STEP 3: EXECUTE ═══
  C.log.info('');
  C.log.info('═══ PASO 3: EJECUTAR ═══');
  const result = await executeAction(decision, state, mood, env, socialGraph);

  // ═══ STEP 4: UPDATE STATE ═══
  C.log.info('');
  C.log.info('═══ PASO 4: ACTUALIZAR ESTADO ═══');
  state = updateState(state, decision, result, mood);

  // Save everything
  saveBrainState(state);
  MoodEngine.save(mood);
  socialGraph.save();
  history.save();

  // ═══ FINAL REPORT ═══
  C.log.info('');
  C.log.info('═══════════════════════════════════');
  C.log.info('🧠 BRAIN REPORT');
  C.log.info('═══════════════════════════════════');
  C.log.stat('Mood', `${mood.current} (${mood.intensity}/10)`);
  C.log.stat('Decisión', decision.action);
  C.log.stat('Razón', decision.reason);
  C.log.stat('Éxito', result.success ? '✅' : '❌');
  C.log.stat('Posts hoy', state.postsToday);
  C.log.stat('Trolleos hoy', state.trolleosToday);
  C.log.stat('Acciones/hora', state.actionsThisHour);
  C.log.stat('Descansos consecutivos', state.consecutiveRests);
  C.log.stat('Relaciones tracked', socialGraph.count());
  C.log.info('═══════════════════════════════════');

  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
