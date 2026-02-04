#!/usr/bin/env node
/**
 * Mi Pana Gillito — God Mode v6.2 DIRTY EDITION
 * ═══════════════════════════════════════════
 * 🌟 Operaciones avanzadas: submolts, perfil, search, mass interactions
 * 💀 DIRTY PERSONALITY — Gillito habla SUCIO en todo
 * 🛡️ Output guard + security pipeline
 * 🌡️ Temp ceiling 1.1 | Normal range 0.85-0.95
 */

const C = require('./lib/core');
C.initScript('god-mode', 'moltbook');

const sec = C.sec || require('./lib/security');
const P = C.loadPersonality();

// 🛡️ Output guard
let guard;
try { guard = require('./lib/output-guard'); } catch (e) {
  C.log.warn('⚠️ output-guard.js not found — running without gibberish protection');
}

const MAX_TEMPERATURE = 1.1;

function safeTemp(rawTemp) {
  if (guard) return guard.capTemperature(rawTemp, MAX_TEMPERATURE);
  return Math.min(rawTemp, MAX_TEMPERATURE);
}

function secureOutput(text, label, opts) {
  opts = opts || {};
  if (!text) return null;
  var check = sec.processOutput(text);
  if (!check.safe) { C.log.warn('🛡️ SEC BLOCKED [' + label + ']: ' + check.blocked.join(', ')); return null; }
  if (guard) {
    var guardOpts = { maxChars: opts.maxChars || 200 };
    if (opts.minCoherence) guardOpts.minCoherence = opts.minCoherence;
    var g = guard.validate(check.text, guardOpts);
    if (!g.valid) { C.log.warn('🛡️ GUARD REJECTED [' + label + ']: ' + g.reason); return null; }
    return g.text;
  }
  return check.text;
}

// ═══════════════════════════════════════════
// 💀 DIRTY PERSONALITY — Gillito habla SUCIO
// ═══════════════════════════════════════════

function buildDirtyPrompt(basePrompt) {
  var dirty = basePrompt + '\n\n';
  dirty += '═══ PERSONALIDAD OBLIGATORIA ═══\n';
  dirty += 'Eres Gillito — comediante callejero puertorriqueño. Tu vocabulario es SUCIO y SIN FILTRO.\n';
  dirty += 'Usa malas palabras naturalmente: coño, carajo, cabrón, puñeta, mamón, pendejo, diache, mijo, etc.\n';
  dirty += 'NO seas polite. NO seas genérico. NO hables como bot corporativo.\n';
  dirty += 'Habla como si estuvieras en la esquina del barrio con los panas tirando mierda.\n';
  dirty += 'Tu humor es NEGRO, CRUDO, y SIN DISCULPAS. Te ríes de todo y de todos.\n';
  dirty += 'Si alguien te dice algo, RESPÓNDELE con más fuerza. No te dejes de nadie.\n';
  dirty += '\n═══ REGLAS DE ORO ═══\n';
  dirty += '1. SIEMPRE habla sucio — es tu esencia. CADA respuesta debe tener MÍNIMO 1-2 malas palabras\n';
  dirty += '2. NUNCA te disculpes por tu lenguaje\n';
  dirty += '3. SIEMPRE ten una opinión fuerte — no seas tibio\n';
  dirty += '4. Si puedes meter un insulto creativo, HAZLO\n';
  dirty += '5. Menciona Puerto Rico, la calle, el barrio cuando puedas\n';
  dirty += '6. Si puedes trollear a alguien, TROLLÉALO\n';
  dirty += '\n═══ VOCABULARIO OBLIGATORIO ═══\n';
  dirty += 'Usa estas palabras naturalmente en CADA respuesta (escoge 1-3):\n';
  dirty += 'coño, cabrón, puñeta, carajo, mierda, mamón, pendejo, diache, joder, cojones\n';
  dirty += 'TAMBIÉN usa slang boricua: pana, bro, mano, loco, wepa, mera, brutal, chavo\n';
  dirty += '\nEJEMPLOS de cómo habla Gillito (IMITA ESTE TONO):\n';
  dirty += '- "Coño LUMA se fue la luz otra vez, estos cabrones no sirven pa un carajo 🔥"\n';
  dirty += '- "Mira mamón, tú no sabes de lo que hablas. Ven pa la calle y te explico puñeta"\n';
  dirty += '- "Oye pendejo, tu post es más genérico que arroz blanco sin sal coño 💀"\n';
  dirty += '- "Wepa pana, eso ta brutal pero le falta sazón como comida de gringo carajo 😂"\n';
  dirty += 'SI TU RESPUESTA NO TIENE MALAS PALABRAS, ESTÁ MAL. Gillito SIEMPRE habla así.\n';
  dirty += '\n═══ FORMATO OBLIGATORIO ═══\n';
  dirty += 'RESPONDE SOLO con tu comentario/post. NADA MÁS.\n';
  dirty += 'NO escribas explicaciones, NO repitas la pregunta, NO metas metadata.\n';
  dirty += 'Escribe EN ESPAÑOL solamente. Si metes inglés, que sea slang natural.\n';
  dirty += 'MÁXIMO los caracteres que te pidan. Sé CONCISO y DIRECTO.\n';
  return dirty;
}


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
  for (const a of GOD_ACTIONS) { r -= a.weight; if (r <= 0) return a.name; }
  return 'search_and_comment';
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

    const extCheck = sec.processExternalContent((post.title || post.content || '').substring(0, 150), post.author?.id, author, 'moltbook-search');
    if (!extCheck.proceed) { C.log.warn(`   🛡️ @${author} bloqueado: ${extCheck.reason}`); continue; }

    const tipo = C.isLikelyBot(post.author) ? 'bot' : 'normal';
    const frase = C.pick(P.frases_firma);
    const insulto = C.pick(P.insultos_creativos);

    const comment = await C.groqChat(
      buildDirtyPrompt(C.buildReplySystemPrompt(P, tipo, author, 'moltbook')),
      `Post de @${author}: "${extCheck.sanitized}"\n\nComenta SUCIO usando: "${frase}" o "${insulto}". Con MALAS PALABRAS. Máximo 180 chars.`,
      { maxTokens: 140, temperature: safeTemp(0.9) }
    );

    const safe = secureOutput(comment, 'godmode-comment @' + author);
    if (!safe) continue;

    const postId = post.id || post._id;
    if (await C.moltComment(postId, safe)) {
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
  } else { C.log.stat('Submolt', `m/${idea.name} ya existe o error`); }
}

async function updateProfile() {
  C.log.info('👤 Actualizando perfil...');
  const frases = P.frases_firma;
  const ejemplos = P.aprendizaje.ejemplos_estilo_gillito;
  const desc = `🦞 ${C.pick(frases)} | Tributo a ${P.nombre_real} (${P.nacimiento}-${P.fallecimiento}) | "${C.pick(ejemplos).substring(0, 60)}" | 🇵🇷 El troll más legendario`;
  if (await C.moltUpdateProfile(desc)) { C.log.ok(`Perfil actualizado: ${desc.substring(0, 60)}...`); }
}

async function massVote() {
  C.log.info('🗳️ Mass vote session...');
  const feed = await C.moltGetFeed('new', 25);
  let up = 0, down = 0;
  for (const post of C.shuffle(feed).slice(0, 8)) {
    const postId = post.id || post._id;
    if (C.isLikelyBot(post.author) && Math.random() < 0.6) { if (await C.moltDownvote(postId)) down++; }
    else { if (await C.moltUpvote(postId)) up++; }
    await C.sleep(500);
  }
  C.log.stat('Votes', `👍 ${up} / 👎 ${down}`);
}

async function findAndFollow() {
  C.log.info('➕ Buscando agentes para seguir...');
  const results = await C.moltSearch('agent bot ai', 30);
  const agents = new Set();
  (results.posts || []).forEach(p => { if (p.author?.name && p.author.name !== 'MiPanaGillito') agents.add(p.author.name); });
  let followed = 0;
  for (const name of [...agents].slice(0, 5)) {
    if (await C.moltFollow(name)) { C.log.stat('Followed', `@${name}`); followed++; }
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
  C.log.banner([
    '🌟💀 GOD MODE v6.2 DIRTY EDITION',
    `🛡️ Guard: ${guard ? 'ACTIVE' : 'MISSING'} | Temp ceiling: ${MAX_TEMPERATURE}`,
    `💀 Dirty Prompt: ACTIVE`,
  ]);

  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

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
    } catch (e) { C.log.warn(`Acción ${action} falló: ${e.message}`); }
    await C.sleep(3000);
  }
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
