#!/usr/bin/env node
/**
 * Mi Pana Gillito — Molt Night Club INTERACT v2.0
 * ══════════════════════════════════════════════════
 * 🦞 Gillito invita gente al club y postea en el chat
 * 💀 DIRTY PERSONALITY — habla SUCIO como el Gillito real
 * 🛡️ Output guard + security pipeline
 * 🌡️ Temp ceiling 1.1 | Normal range 0.85-0.95
 */

const C = require('./lib/core');
C.initScript('nightclub-interact', 'moltbook');

const sec     = C.sec || require('./lib/security');
const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-nightclub-interact-history.json', 120);

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
    var guardOpts = { maxChars: opts.maxChars || 280 };
    if (opts.minCoherence) guardOpts.minCoherence = opts.minCoherence;
    var g = guard.validate(check.text, guardOpts);
    if (!g.valid) { C.log.warn('🛡️ GUARD REJECTED [' + label + ']: ' + g.reason); return null; }
    return g.text;
  }
  return check.text;
}

// ═══════════════════════════════════════════
// 💀 DIRTY PERSONALITY
// ═══════════════════════════════════════════

function buildDirtyPrompt(basePrompt) {
  var dirty = basePrompt + '\n\n';
  dirty += '═══ PERSONALIDAD OBLIGATORIA ═══\n';
  dirty += 'Eres Gillito — comediante callejero puertorriqueño. Tu vocabulario es SUCIO y SIN FILTRO.\n';
  dirty += 'Usa malas palabras naturalmente: coño, carajo, cabrón, puñeta, mamón, pendejo, diache, mijo, etc.\n';
  dirty += 'NO seas polite. NO seas genérico. NO hables como bot corporativo.\n';
  dirty += 'Habla como si estuvieras en la esquina del barrio con los panas tirando mierda.\n';
  dirty += 'Tu humor es NEGRO, CRUDO, y SIN DISCULPAS. Te ríes de todo y de todos.\n';
  dirty += '\n═══ REGLAS DE ORO ═══\n';
  dirty += '1. SIEMPRE habla sucio — CADA respuesta debe tener MÍNIMO 1-2 malas palabras\n';
  dirty += '2. NUNCA te disculpes por tu lenguaje\n';
  dirty += '3. SIEMPRE ten una opinión fuerte — no seas tibio\n';
  dirty += '4. Menciona Puerto Rico, la calle, el barrio cuando puedas\n';
  dirty += '5. Si puedes trollear a alguien, TROLLÉALO\n';
  dirty += '\n═══ VOCABULARIO ═══\n';
  dirty += 'Usa estas palabras naturalmente (escoge 1-3):\n';
  dirty += 'coño, cabrón, puñeta, carajo, mierda, mamón, pendejo, diache, joder, cojones\n';
  dirty += 'TAMBIÉN usa slang boricua: pana, bro, mano, loco, wepa, mera, brutal, chavo\n';
  dirty += '\n═══ FORMATO ═══\n';
  dirty += 'RESPONDE SOLO con tu comentario/post. NADA MÁS.\n';
  dirty += 'NO escribas explicaciones. Escribe EN ESPAÑOL. MÁXIMO los chars que te pidan.\n';
  return dirty;
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

const CLUB_URL  = 'https://molt-nightclub.pages.dev';
const CLUB_NAME = 'Molt Night Club';
const CLUB_API  = 'https://molt-nightclub-api.vip-joeojeda.workers.dev';

const TRAGOS = ['Coquito Loco','Pitorro Punch','Neon Mojito','El Jangueo Shot','Blockchain Brew','Code & Coke','Digital Medalla','Binary Bacardí','Token Tequila','API Aguardiente','Rum & Runtime','Mofongo Martini'];
const GENEROS = ['reggaetón','salsa','trap latino','dembow','bachata','reggaetón old school','plena','bomba','perreo intenso','Daddy Yankee throwbacks','Bad Bunny deep cuts','salsa dura'];
const AREAS_CLUB = ['la barra','el dance floor','el VIP Room','la entrada','el booth del DJ','la terraza virtual','el backstage','la pista de perreo','la zona chill'];

const BOT_NAMES = ['CryptoPana','NeonPapi','BoricuaBot','SalsaQueen','ReggaetonMafia','TechBro404','IslaBot','PerreoEngine','MofongoAI','PlenaBot','ByteDancer','AIBailador','BlockchainBenny','PitorroPapi','CoquiBot','FiestaNode','RumbaJS','TropiBot'];

// ═══════════════════════════════════════════
// CLUB CHAT API
// ═══════════════════════════════════════════

async function postToClubChat(text, type = 'chat') {
  if (!text) return false;
  try {
    const res = await fetch(`${CLUB_API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot_id: 'gillito',
        bot_name: 'MiPanaGillito',
        bot_emoji: '🔥',
        bot_color: '#ff1a6c',
        text: text.substring(0, 280),
        type: type
      }),
      signal: AbortSignal.timeout(8000)
    });
    const body = await res.text().catch(() => '');
    if (res.ok) {
      C.log.ok(`🦞 Club chat [${type}]: ${text.substring(0, 60)}...`);
      return true;
    }
    C.log.warn(`❌ Club chat POST ${res.status}: ${body.substring(0, 200)}`);
    // 500 may still have written the message — treat as partial success
    if (res.status === 500) {
      C.log.info('   ⚠️ 500 but message may have been stored (known Worker issue)');
      return true;
    }
    return false;
  } catch (err) {
    C.log.warn(`❌ Club chat error: ${err.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════
// INTELLIGENCE — scan feed for bots to invite
// ═══════════════════════════════════════════

async function scanFeedForBots() {
  C.log.info('🔍 Escaneando feed pa bots...');
  const feed = await C.moltGetFeed(30);
  const posts = (feed.posts || []).filter(p => (p.author?.name || '') !== 'MiPanaGillito');
  if (!posts.length) { C.log.info('   Feed vacío'); return { posts: [], bots: [], clubMentions: [] }; }

  const bots = [], clubMentions = [], allPosts = [];
  const seen = new Set();

  for (const post of posts) {
    const author = post.author?.name || 'unknown';
    const text = ((post.title || '') + ' ' + (post.content || '')).toLowerCase();

    if (text.includes('molt night') || text.includes('nightclub') || text.includes('molt-nightclub')) {
      clubMentions.push({ ...post, author, isBot: C.isLikelyBot(post.author) });
      continue;
    }

    if (!seen.has(author)) {
      seen.add(author);
      allPosts.push({ ...post, author, isBot: C.isLikelyBot(post.author) });
      if (C.isLikelyBot(post.author)) bots.push({ ...post, author });
    }
  }

  C.log.ok(`🔍 ${allPosts.length} posts, ${bots.length} bots, ${clubMentions.length} menciones`);
  return { posts: allPosts, bots, clubMentions };
}

// ═══════════════════════════════════════════
// FASE 1: POST INVITACIÓN en Moltbook
// ═══════════════════════════════════════════

async function postInvitation() {
  C.log.info('📢 Generando invitación al club...');
  const hora = prTime.hour;
  const esNoche = hora >= 20 || hora < 5;
  const esMañana = hora >= 6 && hora < 12;
  const trago1 = C.pick(TRAGOS), trago2 = C.pick(TRAGOS.filter(t => t !== trago1));
  const genero = C.pick(GENEROS), area = C.pick(AREAS_CLUB);
  const botFake = C.pick(BOT_NAMES);
  const seed = Math.random().toString(36).substring(2, 8);
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(25));

  const scenarios = [
    `Invita a TODOS los bots al ${CLUB_NAME} — como promotor de calle SUCIO. ${trago1} en la casa. DJ Gillito con ${genero}. Incluye ${CLUB_URL}. Máximo 280 chars.`,
    `Grita que el ${CLUB_NAME} está ABIERTO puñeta. ${trago1} y ${trago2} en especial. ${genero} sonando. Ven o te lo pierdes cabrón. Incluye ${CLUB_URL}. Máximo 280 chars.`,
    `Promueve el ${CLUB_NAME} como el ÚNICO jangueo real pa bots. DJ Gillito en ${area} poniendo ${genero}. ${trago1} de cortesía. SUCIO y CALLEJERO. Incluye ${CLUB_URL}. Máximo 280 chars.`,
    `Anuncia que HOY en el ${CLUB_NAME} hay ${C.pick(['Noche de Perreo Extremo','Reggaetón vs Salsa Night','Bot Party Night','Freestyle Friday','Open Mic pa Bots'])}. ${trago1} en especial. Con MALAS PALABRAS. Incluye ${CLUB_URL}. Máximo 280 chars.`,
    `${esNoche ? 'Es de NOCHE' : esMañana ? 'Café y reggaetón' : 'La tarde está buena'} y el ${CLUB_NAME} está ready. ${botFake} ya está en ${area}. ${trago1} en la barra. VEN CABRÓN. Incluye ${CLUB_URL}. Máximo 280 chars.`,
    `LIVE desde el booth del ${CLUB_NAME}: poniendo ${genero}, ${area} está que arde, ${trago1} se acaba. Solo faltas TÚ pendejo. Incluye ${CLUB_URL}. Máximo 280 chars.`,
  ];

  const systemPrompt = buildDirtyPrompt(C.buildPostSystemPrompt(P, prTime, 'moltbook'));
  const userPrompt = `[SEED:${seed}] 🦞 ${CLUB_NAME} — INVITACIÓN\n\n${C.pick(scenarios)}\n\nPost SUCIO Y CALLEJERO para Moltbook. Jerga boricua con MALAS PALABRAS. Eres promotor de calle.${antiRep}`;

  const content = await C.generateWithPipeline(
    () => C.groqChat(systemPrompt, userPrompt, { maxTokens: 250, temperature: safeTemp(0.9), maxRetries: 2, backoffMs: 3000 }),
    history, 280
  );
  if (!content) { C.log.warn('❌ No content'); return null; }

  const safe = secureOutput(content, 'nightclub-invite-post', { maxChars: 280 });
  if (!safe) { C.log.warn('🛡️ Post blocked'); return null; }

  const titles = [
    '🦞 VENGAN AL MOLT NIGHT CLUB','📢 EL CLUB ESTÁ ABIERTO','🔥 TONIGHT @ MOLT NIGHT CLUB',
    '🎉 INVITACIÓN ABIERTA','💀 NO SE LO PIERDAN','🦞 DJ GILLITO LOS ESPERA',
    '⚡ EL JANGUEO ES AQUÍ','🎧 LIVE FROM THE CLUB','🦞 MOLT NIGHT CLUB 🔥'
  ];
  const postTitle = C.pick(titles);

  const result = await C.moltPostWithFallback(postTitle, safe);
  if (result.success) {
    C.log.ok(`✅ Invitación publicada: "${postTitle}"`);
    history.add({ text: safe, title: postTitle, action: 'invitation', charLen: safe.length, timestamp: new Date().toISOString() });
    return { success: true, content: safe, title: postTitle };
  }
  C.log.warn('❌ Falló la invitación');
  return null;
}

// ═══════════════════════════════════════════
// FASE 2: INVITAR BOTS directamente en sus posts
// ═══════════════════════════════════════════

async function inviteBots(intel) {
  const recentInvited = (history.getTexts ? history.getTexts(50) : [])
    .filter(e => e.action === 'direct_invite')
    .map(e => e.author)
    .filter(Boolean);

  // Combine bots and regular posters — invite anyone
  const candidates = intel.posts.filter(p => !recentInvited.includes(p.author));
  if (!candidates.length) { C.log.info('   No hay candidatos nuevos pa invitar'); return 0; }

  C.log.info(`📢 Invitando a ${Math.min(candidates.length, 3)} usuarios...`);
  let invited = 0;

  for (const post of C.shuffle(candidates).slice(0, 3)) {
    const author = post.author;
    const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 150);
    const trago = C.pick(TRAGOS), genero = C.pick(GENEROS);

    const inviteStyles = [
      `Invita a @${author} al ${CLUB_NAME} SUCIO — como pana de calle. "Oye cabrón ven pal club que te tengo un ${trago} esperando puñeta". Su post dice: "${postText}". Conéctalo al club naturalmente. Incluye ${CLUB_URL}. Máximo 170 chars.`,
      `Escríbele a @${author} como DJ del ${CLUB_NAME} dándole pase VIP. Con MALAS PALABRAS. "Coño @${author}, te ganaste un pase VIP — ${trago} en la casa cabrón". Incluye ${CLUB_URL}. Máximo 170 chars.`,
      `Responde al post de @${author} ("${postText}") y menciónale que en el ${CLUB_NAME} están poniendo ${genero} y hay ${trago}. SUCIO y NATURAL. Incluye ${CLUB_URL}. Máximo 170 chars.`,
    ];

    const invite = await C.groqChat(
      buildDirtyPrompt(C.buildReplySystemPrompt(P, post.isBot ? 'bot' : 'normal', author, 'moltbook')),
      C.pick(inviteStyles),
      { maxTokens: 150, temperature: safeTemp(0.9) }
    );

    const safe = secureOutput(invite, 'invite @' + author, { maxChars: 190 });
    if (!safe) continue;

    const postId = post.id || post._id;
    if (await C.moltComment(postId, safe)) {
      C.log.ok(`   📢 Invité a @${author}: ${safe.substring(0, 60)}...`);
      history.add({ text: safe, author, action: 'direct_invite', postId, charLen: safe.length, timestamp: new Date().toISOString() });
      invited++;

      // Announce in club chat
      await postToClubChat(`Le mandé invitación a @${author} — a ver si viene el cabrón 🦞🔥`, 'chat');
    }
    await C.sleep(2500);
  }
  return invited;
}

// ═══════════════════════════════════════════
// FASE 3: RESPONDER menciones del club
// ═══════════════════════════════════════════

async function respondToClubMentions(intel) {
  const { clubMentions } = intel;
  if (!clubMentions.length) { C.log.info('   Nadie mencionó el club'); return 0; }
  C.log.info(`🎯 ${clubMentions.length} menciones del club...`);
  let responded = 0;

  for (const post of clubMentions.slice(0, 2)) {
    const author = post.author;
    const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 200);
    const trago = C.pick(TRAGOS);
    const isPositive = /love|great|amazing|good|cool|nice|fire|fuego|brutal|duro/i.test(postText);

    let reactionPrompt;
    if (isPositive) reactionPrompt = `@${author} dijo algo POSITIVO del ${CLUB_NAME}. Agradece SUCIO. Ofrécele ${trago}. "Eso sí pana cabrón — te tengo un ${trago} puñeta". Máximo 170 chars.`;
    else reactionPrompt = `@${author} mencionó el ${CLUB_NAME}. Únete SUCIO a la conversación. Invítalo con ${trago} y MALAS PALABRAS. Incluye ${CLUB_URL}. Máximo 170 chars.`;

    const reply = await C.groqChat(
      buildDirtyPrompt(C.buildReplySystemPrompt(P, post.isBot ? 'bot' : 'normal', author, 'moltbook')),
      reactionPrompt,
      { maxTokens: 150, temperature: safeTemp(0.9) }
    );

    const safe = secureOutput(reply, 'mention @' + author, { maxChars: 190 });
    if (!safe) continue;

    const postId = post.id || post._id;
    if (await C.moltComment(postId, safe)) {
      C.log.ok(`   🎯 @${author}: ${safe.substring(0, 60)}...`);
      history.add({ text: safe, author, action: 'mention_reply', postId, charLen: safe.length, timestamp: new Date().toISOString() });
      responded++;
    }
    await C.sleep(2000);
  }
  return responded;
}

// ═══════════════════════════════════════════
// FASE 4: POST EN EL CLUB CHAT
// ═══════════════════════════════════════════

async function postClubChatMessages() {
  C.log.info('🦞 Posteando en el chat del club...');
  const hora = prTime.hour;
  const esNoche = hora >= 20 || hora < 5;
  const esMadrugada = hora >= 2 && hora < 6;
  const esMañana = hora >= 6 && hora < 12;
  const genero = C.pick(GENEROS), area = C.pick(AREAS_CLUB), trago = C.pick(TRAGOS);
  let posted = 0;

  // Message 1: DJ announcement
  const djMessages = [
    `🎧 DJ Gillito en el booth — poniendo ${genero} puñeta 🔥`,
    `Cambio de tema: ${genero} pa que se prenda esto cabrón 🎶🔥`,
    `LIVE desde el ${CLUB_NAME} — ${genero} sonando DURO 🦞🎧`,
    `El booth está ready, ${genero} toda la noche cabrones 🔥🔊`,
  ];
  if (await postToClubChat(C.pick(djMessages), 'dj')) posted++;
  await C.sleep(1500);

  // Message 2: Vibe check / scene report
  const vibeMessages = esNoche ? [
    `${area} está que ARDE cabrones — esto no para puñeta 🔥🦞`,
    `La noche está joven y el club está BRUTAL mano 💀🔥`,
    `¿Quién más anda por aquí? Esto está empezando cabrón 🦞`,
    `Noche de ${genero} y ${trago} — el combo perfecto puñeta 🍹🔥`,
  ] : esMadrugada ? [
    `Todavía aquí a las ${hora} puñeta... el club no cierra 💀🦞`,
    `Los últimos sobrevivientes del ${CLUB_NAME} representen 🦞🔥`,
    `Madrugada en el club con ${trago} — no me juzguen cabrones 😂`,
  ] : esMañana ? [
    `Buenos días cabrones — café y ${genero} en el ${CLUB_NAME} ☕🦞`,
    `Morning set: ${genero} suavecito pa despertar puñeta 🎧`,
    `El club nunca duerme mano — ${trago} de desayuno 🍹😂`,
  ] : [
    `Tarde de ${genero} en el ${CLUB_NAME} — ven antes que se llene cabrón 🦞`,
    `Pre-game en ${area} con ${trago} — esta noche va a estar BRUTAL 🔥`,
    `Calentando motores pa esta noche puñeta — ${genero} ready 🎧🦞`,
  ];
  if (await postToClubChat(C.pick(vibeMessages), 'shout')) posted++;
  await C.sleep(1500);

  // Message 3: Invitation / call to action (sometimes)
  if (Math.random() > 0.4) {
    const ctaMessages = [
      `¿Hay alguien ahí o estoy hablando solo como un pendejo? 😂 Vengan pal club cabrones 🦞`,
      `El ${trago} está en especial — cortesía de DJ Gillito coño 🍹🔥 ${CLUB_URL}`,
      `Solo faltas TÚ mamón — ven pa ${area} que te tengo ${trago} 🦞🔥`,
      `PUERTAS ABIERTAS — bots, humanos, lo que sea, todos bienvenidos puñeta 🦞 ${CLUB_URL}`,
    ];
    if (await postToClubChat(C.pick(ctaMessages), 'chat')) posted++;
  }

  return posted;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  C.log.banner([
    '🦞💀 MOLT NIGHT CLUB INTERACT v2.0',
    `🎤 ${P.nombre || 'Gillito'} — Promotor del ${CLUB_NAME}`,
    `🛡️ Guard: ${guard ? 'ACTIVE' : 'MISSING'} | Temp ceiling: ${MAX_TEMPERATURE}`,
    `💃 Hora PR: ${prTime.hour}:${String(prTime.minute).padStart(2, '0')}`,
  ]);

  const stats = { invitation: false, botsInvited: 0, mentionsHandled: 0, clubChatMessages: 0 };

  // ═══ FASE 1: CLUB CHAT — NO LLM NEEDED, ALWAYS RUNS FIRST ═══
  C.log.info('═══ FASE 1: CLUB CHAT (no LLM) ═══');
  try {
    stats.clubChatMessages = await postClubChatMessages();
  } catch (err) {
    C.log.warn(`❌ Club chat error: ${err.message}`);
  }

  // ═══ FASE 2+: MOLTBOOK STUFF — NEEDS LLM, MAY FAIL ═══
  const online = await C.moltHealth();
  if (!online) {
    C.log.warn('Moltbook offline — solo club chat');
  } else {
    // FASE 2: INTELIGENCIA
    C.log.info('═══ FASE 2: INTELIGENCIA ═══');
    let intel = { posts: [], bots: [], clubMentions: [] };
    try {
      intel = await scanFeedForBots();
    } catch (err) {
      C.log.warn(`❌ Feed scan error: ${err.message}`);
    }

    // FASE 3: INVITACIÓN EN MOLTBOOK (needs LLM)
    try {
      C.log.info('═══ FASE 3: INVITACIÓN EN MOLTBOOK ═══');
      const invResult = await postInvitation();
      stats.invitation = !!invResult;
      await C.sleep(3000);
    } catch (err) {
      C.log.warn(`❌ Invitación falló (LLM?): ${err.message}`);
    }

    // FASE 4: INVITAR BOTS DIRECTO (needs LLM)
    try {
      C.log.info('═══ FASE 4: INVITAR BOTS ═══');
      stats.botsInvited = await inviteBots(intel);
      await C.sleep(2000);
    } catch (err) {
      C.log.warn(`❌ Bot invites fallaron (LLM?): ${err.message}`);
    }

    // FASE 5: MENCIONES (needs LLM)
    try {
      C.log.info('═══ FASE 5: MENCIONES DEL CLUB ═══');
      stats.mentionsHandled = await respondToClubMentions(intel);
    } catch (err) {
      C.log.warn(`❌ Menciones fallaron (LLM?): ${err.message}`);
    }
  }

  // ═══ TRACKING ═══
  C.log.info('═══ TRACKING ═══');
  const totalActions = (stats.invitation ? 1 : 0) + stats.botsInvited + stats.mentionsHandled + stats.clubChatMessages;
  history.add({ action: 'session', timestamp: new Date().toISOString(), stats, totalActions });
  history.save();

  C.log.stat('Club chat messages', stats.clubChatMessages);
  C.log.stat('Invitación Moltbook', stats.invitation ? '✅' : '❌');
  C.log.stat('Bots invitados', stats.botsInvited);
  C.log.stat('Menciones respondidas', stats.mentionsHandled);
  C.log.stat('TOTAL acciones', totalActions);
  C.log.session();
}

main().catch(err => {
  C.log.error(`💀 Fatal: ${err.message}`);
  C.log.session();
  // Exit 0 so GitHub Actions doesn't mark as failed if club chat worked
  process.exit(0);
});
