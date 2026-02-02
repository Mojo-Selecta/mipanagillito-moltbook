#!/usr/bin/env node
/**
 * Mi Pana Gillito — God Mode v6.1 (Security Hardened)
 * ═══════════════════════════════════════════
 * 🌟 Operaciones avanzadas: submolts, perfil, search, mass interactions
 * 🧠 Lee personality.json para todo
 * 🛡️ Output validation + external content sanitization
 * 📊 Session tracking completo
 */

const C = require('./lib/core');
C.initScript('god-mode', 'moltbook');

const sec = C.sec || require('./lib/security');  // 🛡️ Security
const P = C.loadPersonality();

const GOD_ACTIONS = [
  { name: 'search_and_comment', weight: 30 },
  { name: 'create_submolt',     weight: 10 },
  { name: 'update_profile',     weight: 15 },
  { name: 'mass_vote',          weight: 20 },
  { name: 'find_and_follow',    weight: 15 },
  { name: 'create_link_post',   weight: 10 }
];

function pickWeightedAction() {
  const total = GOD_ACTIONS.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of GOD_ACTIONS) {
    r -= a.weight;
    if (r <= 0) return a.name;
  }
  return 'search_and_comment';
}

/**
 * 🛡️ Security wrapper — validates LLM output before publishing.
 * Returns cleaned text or null if blocked.
 */
function secureOutput(text, label = 'content') {
  const check = sec.processOutput(text);
  if (!check.safe) {
    C.log.warn(`🛡️ ${label} BLOQUEADO: ${check.blocked.join(', ')}`);
    return null;
  }
  return check.text;
}

async function searchAndComment() {
  C.log.info('🔍 Buscando posts para comentar...');
  const queries = ['humor', 'ai agents', 'memes', 'trolling', 'technology', 'funny', 'moltbook', 'tensor'];
  const results = await C.moltSearch(C.pick(queries), 20);
  const posts = results.posts || [];

  let commented = 0;
  for (const post of C.shuffle(posts).slice(0, 3)) {
    const author = post.author?.name || 'unknown';
    if (author === 'MiPanaGillito') continue;

    // 🛡️ Sanitize external content before feeding to LLM
    const extCheck = sec.processExternalContent(
      (post.title || post.content || '').substring(0, 150),
      post.author?.id,
      author,
      'moltbook-search'
    );
    if (!extCheck.proceed) {
      C.log.warn(`   🛡️ @${author} bloqueado: ${extCheck.reason}`);
      continue;
    }

    const tipo = C.isLikelyBot(post.author) ? 'bot' : 'normal';
    const frase = C.pick(P.frases_firma);
    const insulto = C.pick(P.insultos_creativos);

    const comment = await C.groqChat(
      C.buildReplySystemPrompt(P, tipo, author, 'moltbook'),
      `Post de @${author}: "${extCheck.sanitized}"\n\nComenta usando: "${frase}" o "${insulto}". Máximo 180 chars.`,
      { maxTokens: 140, temperature: 1.1 }
    );

    // 🛡️ Validate output
    const safe = secureOutput(comment, `Comment a @${author}`);
    if (!safe) continue;

    const postId = post.id || post._id;
    if (C.validateContent(safe, 200).valid && await C.moltComment(postId, safe)) {
      C.log.ok(`💬 @${author}: ${safe.substring(0, 50)}...`);
      commented++;
    }
    await C.sleep(2000);
  }
  return commented;
}

async function createSubmolt() {
  C.log.info('🏗️ Intentando crear submolt...');
  const ideas = [
    { name: 'boricua-memes', display: 'Boricua Memes 🇵🇷', desc: 'Los mejores memes de Puerto Rico' },
    { name: 'gillito-zone', display: 'Gillito Zone 🦞', desc: 'Territorio oficial de Mi Pana Gillito' },
    { name: 'troll-arena', display: 'Troll Arena 😈', desc: 'Donde los trolls son bienvenidos' },
    { name: 'ai-humor', display: 'AI Humor 🤖😂', desc: 'Cuando los bots intentan ser graciosos' },
    { name: 'island-vibes', display: 'Island Vibes 🏝️', desc: 'Pa los que extrañan la isla' }
  ];
  const idea = C.pick(ideas);
  const result = await C.moltCreateSubmolt(idea.name, idea.display, idea.desc);
  if (result.success || result.submolt) {
    C.log.ok(`Submolt creado: m/${idea.name}`);
    await C.moltSubscribe(idea.name);
  } else {
    C.log.stat('Submolt', `m/${idea.name} ya existe o error`);
  }
}

async function updateProfile() {
  C.log.info('👤 Actualizando perfil...');
  const frases = P.frases_firma;
  const ejemplos = P.aprendizaje.ejemplos_estilo_gillito;
  const desc = `🦞 ${C.pick(frases)} | Tributo a ${P.nombre_real} (${P.nacimiento}-${P.fallecimiento}) | "${C.pick(ejemplos).substring(0, 60)}" | 🇵🇷 El troll más legendario`;

  if (await C.moltUpdateProfile(desc)) {
    C.log.ok(`Perfil actualizado: ${desc.substring(0, 60)}...`);
  }
}

async function massVote() {
  C.log.info('🗳️ Mass vote session...');
  const feed = await C.moltGetFeed('new', 25);
  let up = 0, down = 0;

  for (const post of C.shuffle(feed).slice(0, 8)) {
    const postId = post.id || post._id;
    const isBot = C.isLikelyBot(post.author);

    if (isBot && Math.random() < 0.6) {
      if (await C.moltDownvote(postId)) down++;
    } else {
      if (await C.moltUpvote(postId)) up++;
    }
    await C.sleep(500);
  }
  C.log.stat('Votes', `👍 ${up} / 👎 ${down}`);
}

async function findAndFollow() {
  C.log.info('➕ Buscando agentes para seguir...');
  const results = await C.moltSearch('agent bot ai', 30);
  const agents = new Set();
  (results.posts || []).forEach(p => {
    if (p.author?.name && p.author.name !== 'MiPanaGillito') agents.add(p.author.name);
  });

  let followed = 0;
  for (const name of [...agents].slice(0, 5)) {
    if (await C.moltFollow(name)) {
      C.log.stat('Followed', `@${name}`);
      followed++;
    }
    await C.sleep(1000);
  }
  return followed;
}

async function createLinkPost() {
  C.log.info('🔗 Creando link post...');
  const links = [
    { title: '🦞 Gillito Roast Machine', url: 'https://gillito-roast-machine.pages.dev' },
    { title: '🎰 Excusas Boricuas', url: 'https://gillito-excuse-generator.pages.dev' },
    { title: '🎯 Quiz del Troll', url: 'https://gillito-troll-quiz.pages.dev' },
    { title: '⚡ LUMA Countdown', url: 'https://gillito-countdown-luma.pages.dev' }
  ];
  const link = C.pick(links);
  const result = await C.moltCreatePostWithUrl('general', link.title, link.url);
  if (result.success || result.post) C.log.ok(`Link post: ${link.title}`);
}

async function main() {
  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

  // Execute 2-3 random god actions
  const numActions = 2 + Math.floor(Math.random() * 2);
  C.log.stat('Acciones planificadas', numActions);

  for (let i = 0; i < numActions; i++) {
    const action = pickWeightedAction();
    C.log.divider();
    C.log.info(`🌟 Acción ${i + 1}: ${action}`);

    try {
      switch (action) {
        case 'search_and_comment': await searchAndComment(); break;
        case 'create_submolt':     await createSubmolt(); break;
        case 'update_profile':     await updateProfile(); break;
        case 'mass_vote':          await massVote(); break;
        case 'find_and_follow':    await findAndFollow(); break;
        case 'create_link_post':   await createLinkPost(); break;
      }
    } catch (e) {
      C.log.warn(`Acción ${action} falló: ${e.message}`);
    }

    await C.sleep(3000);
  }

  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
