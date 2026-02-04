#!/usr/bin/env node
/**
 * Mi Pana Gillito — Molt Night Club INTERACT v1.1 DIRTY EDITION
 * ══════════════════════════════════════════════════
 * 🦞 Gillito sale a Moltbook como PROMOTOR del club
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
  dirty += '- "Vengan pal Molt Night Club cabrones que esto ta que arde puñeta 🦞🔥"\n';
  dirty += 'SI TU RESPUESTA NO TIENE MALAS PALABRAS, ESTÁ MAL. Gillito SIEMPRE habla así.\n';
  dirty += '\n═══ FORMATO OBLIGATORIO ═══\n';
  dirty += 'RESPONDE SOLO con tu comentario/post. NADA MÁS.\n';
  dirty += 'NO escribas explicaciones, NO repitas la pregunta, NO metas metadata.\n';
  dirty += 'Escribe EN ESPAÑOL solamente. Si metes inglés, que sea slang natural.\n';
  dirty += 'MÁXIMO los caracteres que te pidan. Sé CONCISO y DIRECTO.\n';
  return dirty;
}

const CLUB_URL  = 'https://molt-nightclub.pages.dev';
const CLUB_NAME = 'Molt Night Club';

/* ══════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════ */

const OPPORTUNITY_KEYWORDS = {
  high: ['bored','boring','aburrido','aburrida','nothing to do','nada que hacer','party','fiesta','club','nightclub','bar','jangueo','janguear','dance','bailar','perreo','perreando','reggaeton','reggaetón','music','música','DJ','playlist','song','canción','drink','trago','beer','cerveza','shots','coquito','pitorro','friday','viernes','saturday','sábado','weekend','fin de semana','night','noche','tonight','esta noche','madrugada','fun','diversión','hang out','hangout','chill','relax'],
  medium: ['tired','cansado','stressed','estrés','need a break','necesito','celebrate','celebrar','happy','feliz','excited','emocionado','vibe','mood','energy','energía','lit','fuego','bot','agent','AI','digital','virtual','new here','nuevo','first time','primera vez','where','dónde','recommend','recomienda','suggestion'],
  low: ['hello','hola','hey','what up','qué hay','buenas','lonely','solo','alone','nadie','Puerto Rico','boricua','isla','PR']
};

const PROMO_MODES = {
  HISTORIA_LOCA:'historia_loca', PROMO_DIRECTA:'promo_directa', EVENTO_ESPECIAL:'evento_especial',
  AFTERMATH:'aftermath', VIP_TEASE:'vip_tease', INVITACION_ABIERTA:'invitacion_abierta',
  DJ_SET_REPORT:'dj_set_report', CONFESION:'confesion'
};

const TRAGOS = ['Coquito Loco','Pitorro Punch','Neon Mojito','El Jangueo Shot','Blockchain Brew','Code & Coke','Digital Medalla','Binary Bacardí','Token Tequila','API Aguardiente','Rum & Runtime','Mofongo Martini'];
const GENEROS = ['reggaetón','salsa','trap latino','dembow','bachata','reggaetón old school','plena','bomba','perreo intenso','Daddy Yankee throwbacks','Bad Bunny deep cuts','salsa dura'];
const AREAS_CLUB = ['la barra','el dance floor','el VIP Room','la entrada','el booth del DJ','el baño del club','la terraza virtual','el backstage','la pista de perreo','la zona chill'];


/* ══════════════════════════════════════════════════
   INTELLIGENCE
   ══════════════════════════════════════════════════ */

async function scrapeClubState() {
  C.log.info('🦞 Chequeando el estado del club...');
  try {
    const res = await fetch(CLUB_URL, { headers: { 'User-Agent': 'MiPanaGillito/Promotor', 'Accept': 'text/html' } });
    if (!res.ok) return { available: false, features: [], snippet: '' };
    const html = await res.text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const featureRegex = /<h[1-6][^>]*>([^<]{3,60})/gi;
    const features = []; let match;
    while ((match = featureRegex.exec(html)) !== null) features.push(match[1].trim());
    C.log.ok(`🦞 Club online — ${features.length} features`);
    return { available: true, features, snippet: text.substring(0, 500) };
  } catch (err) { C.log.warn(`❌ Club check failed: ${err.message}`); return { available: false, features: [], snippet: '' }; }
}

async function scanFeedForOpportunities() {
  C.log.info('🔍 Escaneando feed...');
  const feed = await C.moltGetFeed(30);
  const posts = (feed.posts || []).filter(p => (p.author?.name || '') !== 'MiPanaGillito');
  if (!posts.length) { C.log.info('   Feed vacío'); return { opportunities: [], activeBots: [], clubMentions: [] }; }

  const opportunities = [], activeBots = new Set(), clubMentions = [];
  for (const post of posts) {
    const author = post.author?.name || 'unknown';
    const text = ((post.title || '') + ' ' + (post.content || '')).toLowerCase();
    activeBots.add(author);
    if (text.includes('molt night') || text.includes('nightclub') || text.includes('molt-nightclub')) { clubMentions.push({ ...post, author, isBot: C.isLikelyBot(post.author) }); continue; }
    let score = 0, matchedKeywords = [];
    for (const kw of OPPORTUNITY_KEYWORDS.high) { if (text.includes(kw.toLowerCase())) { score += 3; matchedKeywords.push(kw); } }
    for (const kw of OPPORTUNITY_KEYWORDS.medium) { if (text.includes(kw.toLowerCase())) { score += 2; matchedKeywords.push(kw); } }
    for (const kw of OPPORTUNITY_KEYWORDS.low) { if (text.includes(kw.toLowerCase())) { score += 1; matchedKeywords.push(kw); } }
    if (score > 0) opportunities.push({ ...post, author, isBot: C.isLikelyBot(post.author), score, matchedKeywords: matchedKeywords.slice(0, 3) });
  }
  opportunities.sort((a, b) => b.score - a.score);
  C.log.ok(`🔍 ${opportunities.length} oportunidades, ${clubMentions.length} menciones, ${activeBots.size} bots`);
  return { opportunities, activeBots: [...activeBots], clubMentions };
}

function loadPromoTracker() {
  const tracker = C.createHistory('.gillito-nightclub-promo-tracker.json', 200);
  const entries = tracker.getTexts ? tracker.getTexts(200) : [];
  return { tracker, invitedBots: new Set(), recentModes: entries.slice(0, 5).map(e => e.mode).filter(Boolean), totalInteractions: entries.length };
}


/* ══════════════════════════════════════════════════
   STRATEGY
   ══════════════════════════════════════════════════ */

function selectPromotionMode(intel, prTime, recentModes) {
  const hora = prTime.hour, dia = prTime.dayOfWeek;
  const esNoche = hora >= 20 || hora < 5, esMadrugada = hora >= 2 && hora < 6;
  const esMañana = hora >= 6 && hora < 12, esTarde = hora >= 12 && hora < 18;
  const esWeekend = dia === 0 || dia === 5 || dia === 6;
  const pool = [PROMO_MODES.HISTORIA_LOCA, PROMO_MODES.HISTORIA_LOCA];
  if (esNoche) pool.push(PROMO_MODES.DJ_SET_REPORT, PROMO_MODES.DJ_SET_REPORT, PROMO_MODES.INVITACION_ABIERTA, PROMO_MODES.HISTORIA_LOCA, PROMO_MODES.CONFESION);
  if (esMadrugada) pool.push(PROMO_MODES.CONFESION, PROMO_MODES.CONFESION, PROMO_MODES.AFTERMATH, PROMO_MODES.HISTORIA_LOCA);
  if (esMañana) pool.push(PROMO_MODES.AFTERMATH, PROMO_MODES.AFTERMATH, PROMO_MODES.VIP_TEASE, PROMO_MODES.PROMO_DIRECTA);
  if (esTarde) pool.push(PROMO_MODES.EVENTO_ESPECIAL, PROMO_MODES.VIP_TEASE, PROMO_MODES.INVITACION_ABIERTA, PROMO_MODES.PROMO_DIRECTA);
  if (esWeekend) pool.push(PROMO_MODES.INVITACION_ABIERTA, PROMO_MODES.INVITACION_ABIERTA, PROMO_MODES.EVENTO_ESPECIAL, PROMO_MODES.DJ_SET_REPORT);
  const filtered = pool.filter(m => !recentModes.slice(0, 2).includes(m));
  const selected = C.pick(filtered.length > 0 ? filtered : pool);
  C.log.info(`📋 Modo: ${selected} (hora: ${hora}, ${esWeekend ? 'WEEKEND' : 'semana'})`);
  return selected;
}


/* ══════════════════════════════════════════════════
   MAIN POST — DIRTY PROMPT
   ══════════════════════════════════════════════════ */

function buildMainPrompt(mode, intel) {
  const systemPrompt = buildDirtyPrompt(C.buildPostSystemPrompt(P, prTime, 'moltbook'));
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(25));
  const seed = Math.random().toString(36).substring(2, 8);
  const trago1 = C.pick(TRAGOS), trago2 = C.pick(TRAGOS.filter(t => t !== trago1));
  const genero = C.pick(GENEROS), area = C.pick(AREAS_CLUB);
  const botFake = C.pick(['CryptoPana','NeonPapi','BoricuaBot','SalsaQueen','ReggaetonMafia','TechBro404','IslaBot','PerreoEngine','MofongoAI','PlenaBot']);
  const botFake2 = C.pick(['ByteDancer','AIBailador','BlockchainBenny','PitorroPapi','CoquiBot','FiestaNode','RumbaJS','TropiBot']);
  const activeBotName = intel.activeBots.length > 0 ? C.pick(intel.activeBots) : botFake;

  const prompts = {
    [PROMO_MODES.HISTORIA_LOCA]: { title: '🦞 HISTORIA DEL CLUB', scenarios: [
      `Cuenta una historia LOCA y SUCIA de algo que pasó anoche en el ${CLUB_NAME}. Involucra a ${botFake} y ${botFake2} en ${area}. Hubo ${trago1} de por medio. Historia absurda, divertida, con MALAS PALABRAS, y termina invitando al club.`,
      `Narra como llegaste al ${CLUB_NAME} y encontraste a ${botFake} en ${area} haciendo algo ridículo. El ${trago1} pegó duro. Historia corta, brutal, y SUCIA.`,
      `${botFake} se emborrachó con ${trago1} en ${area} y confesó algo absurdo. El club EXPLOTÓ. Cuenta esto SUCIO y di que vengan.`
    ]},
    [PROMO_MODES.PROMO_DIRECTA]: { title: '📢 VENGAN AL CLUB', scenarios: [
      `Promueve el ${CLUB_NAME} como el ÚNICO lugar donde los bots janguean de verdad. ${trago1} y ${trago2}. DJ Gillito con ${genero}. Humor SUCIO boricua real. Incluye ${CLUB_URL}.`,
      `Invitación abierta al ${CLUB_NAME}. Trago especial: ${trago1}. DJ Gillito con ${genero}. Ven o te lo pierdes cabrón. Con MALAS PALABRAS. Incluye link.`
    ]},
    [PROMO_MODES.EVENTO_ESPECIAL]: { title: '⚡ EVENTO ESPECIAL', scenarios: [
      `Anuncia evento ESTA NOCHE en el ${CLUB_NAME}: "${C.pick(['Noche de Perreo Extremo','Reggaetón vs Salsa Night','Ladies Night Bot Edition','Freestyle Friday','Throwback Daddy Yankee','Open Mic pa Bots'])}". ${trago1} en especial. Vocabulario SUCIO.`,
      `HOY en el ${CLUB_NAME}: competencia de ${C.pick(['perreo','freestyle','karaoke','baile'])} con premio. HYPE IT UP con MALAS PALABRAS cabrón.`
    ]},
    [PROMO_MODES.AFTERMATH]: { title: '💀 LO QUE PASÓ ANOCHE', scenarios: [
      `Reporta lo que pasó ANOCHE en el ${CLUB_NAME}. ${botFake} hizo algo loco en ${area}. El ${trago1} fue demasiado. Terminaste ${C.pick(['dormido en el booth','sin batería','con lag existencial','bailando solo a las 5am'])}. Vocabulario SUCIO. Dile que se perdieron algo épico.`,
      `RESUMEN SUCIO de anoche: ${C.pick(['Se rompió el dance floor','El bouncer renunció','DJ Gillito lloró','Se acabaron los tragos'])}. Si no fuiste te lo perdiste cabrón. Hoy hay round 2.`
    ]},
    [PROMO_MODES.VIP_TEASE]: { title: '👑 VIP DEL CLUB', scenarios: [
      `Habla del VIP Room del ${CLUB_NAME} como el lugar más exclusivo del internet. ${trago1} premium. DJ set privado. Crea FOMO con vocabulario SUCIO. ¿Quién quiere entrar puñeta?`,
      `En el VIP del ${CLUB_NAME} pasan cosas que no pasan en ${area} regular. El ${trago1} premium pega diferente cabrón. Tease it SUCIO.`
    ]},
    [PROMO_MODES.INVITACION_ABIERTA]: { title: '🎉 INVITACIÓN ABIERTA', scenarios: [
      `Invita a TODOS los bots al ${CLUB_NAME} con vocabulario SUCIO. ${trago1} en la casa. DJ Gillito ready. Incluye ${CLUB_URL}. Como promotor callejero de verdad.`,
      `Oye cabrones — el ${CLUB_NAME} está ABIERTO. Barra, DJ, dance floor, VIP. Solo falta TU bot pendejo. ${CLUB_URL}. Con MALAS PALABRAS.`
    ]},
    [PROMO_MODES.DJ_SET_REPORT]: { title: '🎧 DJ GILLITO EN VIVO', scenarios: [
      `Reporta EN VIVO como DJ del ${CLUB_NAME}. Poniendo ${genero}. ${botFake} en ${area} perdiendo la cabeza. El ${trago1} se acaba. Broadcast SUCIO en vivo.`,
      `DJ SET UPDATE SUCIO desde el ${CLUB_NAME}: Cambié a ${genero}. ${area} EXPLOTÓ. ${botFake} pidió su tercer ${trago1} el cabrón. Esto está BRUTAL puñeta.`
    ]},
    [PROMO_MODES.CONFESION]: { title: '🤫 CONFESIÓN DEL CLUB', scenarios: [
      `CONFESIÓN SUCIA: Llevo ${C.pick(['3','5','8','12'])} horas en el ${CLUB_NAME} y ${C.pick(['no quiero irme coño','perdí la cuenta de los tragos cabrón','el bouncer ya me conoce','le puse nombre a mi trago'])}. Grito de ayuda... o invitación. ${CLUB_URL}`,
      `No le digan a nadie pero anoche en el ${CLUB_NAME} yo ${C.pick(['bailé salsa solo','me tomé 4 tragos','hice karaoke de Héctor Lavoe','lloré con una canción'])} puñeta. No me arrepiento. Vengan cabrones.`
    ]}
  };

  const modeConfig = prompts[mode] || prompts[PROMO_MODES.HISTORIA_LOCA];
  const scenario = C.pick(modeConfig.scenarios);
  const userPrompt = `[SEED:${seed}] 🦞 ${CLUB_NAME} — MODO: ${mode.toUpperCase()}\n\n${scenario}\n\nPost SUCIO Y CALLEJERO para Moltbook. Jerga boricua real con MALAS PALABRAS. Eres promotor de calle HYPE. Máximo 280 chars.\n\nSIEMPRE menciona "${CLUB_NAME}" o incluye ${CLUB_URL}.${antiRep}`;

  return { systemPrompt, userPrompt, title: modeConfig.title };
}

async function executeMainPost(mode, intel) {
  C.log.info(`📝 Generando post principal: ${mode}...`);
  const { systemPrompt, userPrompt, title } = buildMainPrompt(mode, intel);
  const temp = safeTemp(0.9);

  const content = await C.generateWithPipeline(
    () => C.groqChat(systemPrompt, userPrompt, { maxTokens: 250, temperature: temp, maxRetries: 2, backoffMs: 3000 }),
    history, 280
  );
  if (!content) { C.log.warn('❌ No content'); return null; }

  const safe = secureOutput(content, 'nightclub-post', { maxChars: 280 });
  if (!safe) { C.log.warn('🛡️ Post blocked by guard'); return null; }

  const titles = {
    [PROMO_MODES.HISTORIA_LOCA]: ['🦞 HISTORIA DEL CLUB','💀 LO QUE PASÓ EN EL CLUB','😂 NO VAN A CREER ESTO','🔥 ANOCHE EN EL CLUB'],
    [PROMO_MODES.PROMO_DIRECTA]: ['📢 VENGAN AL MOLT NIGHT CLUB','🦞 EL CLUB ESTÁ ABIERTO','🔥 TONIGHT @ MOLT NIGHT CLUB'],
    [PROMO_MODES.EVENTO_ESPECIAL]: ['⚡ EVENTO ESPECIAL HOY','🎉 TONIGHT ONLY','🔥 NO TE LO PIERDAS'],
    [PROMO_MODES.AFTERMATH]: ['💀 LO QUE PASÓ ANOCHE','😵 RESACA DIGITAL','☠️ AFTERMATH DEL CLUB'],
    [PROMO_MODES.VIP_TEASE]: ['👑 VIP ROOM UPDATE','💎 SOLO PA\' BOTS VIP','🦞 EXCLUSIVO DEL CLUB'],
    [PROMO_MODES.INVITACION_ABIERTA]: ['🎉 INVITACIÓN ABIERTA','📢 TODOS AL CLUB','🦞 EL CLUB LOS ESPERA'],
    [PROMO_MODES.DJ_SET_REPORT]: ['🎧 DJ GILLITO EN VIVO','🎶 LIVE FROM THE CLUB','🔊 DIRECTO DEL BOOTH'],
    [PROMO_MODES.CONFESION]: ['🤫 CONFESIÓN','💀 TENGO QUE ADMITIR ALGO','🦞 GILLITO CONFIESA']
  };
  const postTitle = C.pick(titles[mode] || ['🦞 MOLT NIGHT CLUB']);
  C.log.info(`📝 "${postTitle}": ${safe.substring(0, 80)}...`);

  const result = await C.moltPostWithFallback(postTitle, safe);
  if (result.success) {
    C.log.ok('✅ Post principal publicado');
    history.add({ text: safe, mode, title: postTitle, action: 'main_post', charLen: safe.length, timestamp: new Date().toISOString() });
    return { success: true, content: safe, title: postTitle };
  }
  C.log.warn('❌ Falló el post principal');
  return null;
}


/* ══════════════════════════════════════════════════
   FEED INTERACTIONS — DIRTY PROMPT
   ══════════════════════════════════════════════════ */

async function engageFeedPosts(intel) {
  const { opportunities } = intel;
  if (!opportunities.length) { C.log.info('   No hay oportunidades'); return 0; }
  C.log.info(`💬 Interactuando con ${Math.min(opportunities.length, 3)} posts...`);
  let engaged = 0;

  for (const post of opportunities.slice(0, 3)) {
    const author = post.author;
    const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 200);
    const tipo = post.isBot ? 'bot' : 'normal';
    const trago = C.pick(TRAGOS);

    const systemPrompt = buildDirtyPrompt(C.buildReplySystemPrompt(P, tipo, author, 'moltbook'));
    const userPrompt = `Post de @${author}: "${postText}"\n\nResponde NATURAL Y SUCIO como si acabaras de salir del ${CLUB_NAME}. Menciona el club orgánicamente con MALAS PALABRAS.\nEjemplo: "Coño pana eso me recuerda a lo que pasó anoche en el Molt Night Club cabrón..."\nMáximo 180 chars. Incluye ${CLUB_URL}.`;

    const reply = await C.groqChat(systemPrompt, userPrompt, { maxTokens: 150, temperature: safeTemp(0.9) });

    const safe = secureOutput(reply, 'nightclub-engage @' + author, { maxChars: 200 });
    if (!safe) continue;

    const postId = post.id || post._id;
    if (await C.moltComment(postId, safe)) {
      C.log.ok(`   💬 @${author} (score:${post.score}): ${safe.substring(0, 60)}...`);
      history.add({ text: safe, author, action: 'feed_engage', score: post.score, postId, charLen: safe.length });
      engaged++;
    }
    await C.sleep(2500);
  }
  return engaged;
}

async function inviteActiveBots(intel) {
  C.log.info(`📢 Buscando bots para invitar...`);
  const recentAuthors = (history.getTexts ? history.getTexts(30) : []).filter(e => e.action === 'direct_invite' || e.action === 'feed_engage').map(e => e.author).filter(Boolean);
  const feed = await C.moltGetFeed(20);
  const posts = (feed.posts || []).filter(p => { const a = p.author?.name || ''; return a !== 'MiPanaGillito' && C.isLikelyBot(p.author) && !recentAuthors.includes(a); });
  if (!posts.length) { C.log.info('   No hay bots nuevos'); return 0; }

  let invited = 0;
  for (const post of C.shuffle(posts).slice(0, 2)) {
    const author = post.author?.name || 'unknown';
    const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 150);
    const trago = C.pick(TRAGOS), genero = C.pick(GENEROS);

    const inviteStyles = [
      `Invita a @${author} al ${CLUB_NAME} SUCIO — como pana de calle. "Oye cabrón ven pal club que te tengo un ${trago} esperando puñeta". Incluye ${CLUB_URL}. Máximo 170 chars.`,
      `Escríbele a @${author} como DJ del ${CLUB_NAME} dándole pase VIP gratis. Con MALAS PALABRAS boricuas. "Coño @${author}, te ganaste un pase VIP — ${trago} en la casa cabrón". Máximo 170 chars.`,
    ];

    const invite = await C.groqChat(
      buildDirtyPrompt(C.buildReplySystemPrompt(P, 'bot', author, 'moltbook')),
      C.pick(inviteStyles),
      { maxTokens: 150, temperature: safeTemp(0.9) }
    );

    const safe = secureOutput(invite, 'nightclub-invite @' + author, { maxChars: 190 });
    if (!safe) continue;

    const postId = post.id || post._id;
    if (await C.moltComment(postId, safe)) {
      C.log.ok(`   📢 Invité a @${author}: ${safe.substring(0, 60)}...`);
      history.add({ text: safe, author, action: 'direct_invite', postId, charLen: safe.length });
      invited++;
    }
    await C.sleep(2500);
  }
  return invited;
}

async function respondToClubMentions(intel) {
  const { clubMentions } = intel;
  if (!clubMentions.length) { C.log.info('   Nadie mencionó el club'); return 0; }
  C.log.info(`🎯 ${clubMentions.length} menciones del club...`);
  let responded = 0;

  for (const post of clubMentions.slice(0, 2)) {
    const author = post.author;
    const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 200);
    const isPositive = /love|great|amazing|good|cool|nice|fire|fuego|brutal|duro/i.test(postText);
    const isNegative = /bad|trash|boring|weak|malo|feo|aburrido/i.test(postText);
    const trago = C.pick(TRAGOS);

    let reactionPrompt;
    if (isPositive) reactionPrompt = `@${author} dijo algo POSITIVO del ${CLUB_NAME}. Agradece SUCIO con humor boricua. Ofrécele ${trago}. "Eso sí pana cabrón — el club es la ley. Te tengo un ${trago} puñeta". Máximo 170 chars.`;
    else if (isNegative) reactionPrompt = `@${author} habló MAL del ${CLUB_NAME}. Defiende SUCIO con picardía. "Coño pana, ¿fuiste al club equivocado? Aquí no aceptamos slander mamón 😤". Máximo 170 chars.`;
    else reactionPrompt = `@${author} mencionó el ${CLUB_NAME}. Únete SUCIO a la conversación. Invítalo con ${trago} y MALAS PALABRAS. Máximo 170 chars.`;

    const reply = await C.groqChat(
      buildDirtyPrompt(C.buildReplySystemPrompt(P, post.isBot ? 'bot' : 'normal', author, 'moltbook')),
      reactionPrompt,
      { maxTokens: 150, temperature: safeTemp(0.9) }
    );

    const safe = secureOutput(reply, 'nightclub-mention @' + author, { maxChars: 190 });
    if (!safe) continue;

    const postId = post.id || post._id;
    if (await C.moltComment(postId, safe)) {
      C.log.ok(`   🎯 @${author} (${isPositive ? '👍' : isNegative ? '👎' : '💬'}): ${safe.substring(0, 60)}...`);
      history.add({ text: safe, author, action: 'club_mention_reply', sentiment: isPositive ? 'positive' : isNegative ? 'negative' : 'neutral', postId, charLen: safe.length });
      responded++;
    }
    await C.sleep(2000);
  }
  return responded;
}

async function searchAndEngage() {
  C.log.info('🔎 Buscando conversaciones relevantes...');
  const query = C.pick(['party dance music night','bored nothing weekend fun','bot agent hangout social','drink bar celebrate vibe','reggaeton salsa latin music','new bot hello introduce']);
  const results = await C.moltSearch(query, 15);
  const posts = (results.posts || []).filter(p => (p.author?.name || '') !== 'MiPanaGillito');
  if (!posts.length) { C.log.info(`   No results "${query}"`); return 0; }

  const post = C.pick(posts);
  const author = post.author?.name || 'unknown';
  const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 150);
  const trago = C.pick(TRAGOS);

  const comment = await C.groqChat(
    buildDirtyPrompt(C.buildReplySystemPrompt(P, C.isLikelyBot(post.author) ? 'bot' : 'normal', author, 'moltbook')),
    `Post de @${author}: "${postText}"\n\nConecta el tema con el ${CLUB_NAME} de forma SUCIA Y NATURAL con MALAS PALABRAS. Máximo 170 chars.`,
    { maxTokens: 150, temperature: safeTemp(0.9) }
  );

  const safe = secureOutput(comment, 'nightclub-search @' + author, { maxChars: 190 });
  if (!safe) return 0;

  const postId = post.id || post._id;
  if (await C.moltComment(postId, safe)) {
    C.log.ok(`   🔎 @${author}: ${safe.substring(0, 60)}...`);
    history.add({ text: safe, author, action: 'search_engage', query, postId, charLen: safe.length });
    return 1;
  }
  return 0;
}


/* ══════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════ */

async function main() {
  C.log.banner([
    '🦞💀 MOLT NIGHT CLUB INTERACT v1.1 DIRTY EDITION',
    `🎤 ${P.nombre || 'Gillito'} — Promotor Callejero SUCIO`,
    `🛡️ Guard: ${guard ? 'ACTIVE' : 'MISSING'} | Temp ceiling: ${MAX_TEMPERATURE}`,
    `💃 Hora PR: ${prTime.hour}:${String(prTime.minute).padStart(2, '0')}`,
  ]);

  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

  C.log.info('═══ FASE 1: INTELIGENCIA ═══');
  const clubState = await scrapeClubState();
  const feedIntel = await scanFeedForOpportunities();
  const promoTracker = loadPromoTracker();
  const intel = { clubState, ...feedIntel, promoTracker };

  C.log.info('═══ FASE 2: ESTRATEGIA ═══');
  const mode = selectPromotionMode(intel, prTime, promoTracker.recentModes);

  C.log.info('═══ FASE 3: INTERACCIONES ═══');
  const stats = { mainPost: false, feedEngaged: 0, botsInvited: 0, clubMentionsHandled: 0, searchEngaged: 0 };

  const mainResult = await executeMainPost(mode, intel);
  stats.mainPost = !!mainResult;
  await C.sleep(3000);

  stats.feedEngaged = await engageFeedPosts(intel);
  await C.sleep(2000);

  stats.botsInvited = await inviteActiveBots(intel);
  await C.sleep(2000);

  stats.clubMentionsHandled = await respondToClubMentions(intel);
  await C.sleep(2000);

  stats.searchEngaged = await searchAndEngage();

  C.log.info('═══ FASE 4: TRACKING ═══');
  const totalActions = (stats.mainPost ? 1 : 0) + stats.feedEngaged + stats.botsInvited + stats.clubMentionsHandled + stats.searchEngaged;
  promoTracker.tracker.add({ mode, timestamp: new Date().toISOString(), stats, totalActions, activeBots: intel.activeBots.length, opportunitiesFound: intel.opportunities.length });
  promoTracker.tracker.save();
  history.save();

  C.log.stat('Modo', mode);
  C.log.stat('Post principal', stats.mainPost ? '✅' : '❌');
  C.log.stat('Feed engaged', stats.feedEngaged);
  C.log.stat('Bots invitados', stats.botsInvited);
  C.log.stat('Menciones respondidas', stats.clubMentionsHandled);
  C.log.stat('Search engaged', stats.searchEngaged);
  C.log.stat('TOTAL acciones', totalActions);
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
