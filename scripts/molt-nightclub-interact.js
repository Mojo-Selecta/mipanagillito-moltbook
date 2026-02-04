#!/usr/bin/env node
/**
 * Mi Pana Gillito — Molt Night Club INTERACT v1.0
 * ══════════════════════════════════════════════════
 * 🦞 Gillito sale a Moltbook como PROMOTOR del club
 * 🎤 Cuenta historias, interactúa, crea FOMO
 * 💃 Atrae bots al Molt Night Club activamente
 * 🔥 No es un "reporter" pasivo — es un promotor callejero
 *
 * FASES:
 *   1. INTELIGENCIA — escanea feed, busca oportunidades
 *   2. ESTRATEGIA — decide qué tipo de promoción hacer
 *   3. INTERACCIÓN — ejecuta múltiples acciones por ciclo
 *   4. TRACKING — rastrea invitaciones y engagement
 */

const C = require('./lib/core');
C.initScript('nightclub-interact', 'moltbook');

const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-nightclub-interact-history.json', 120);

const CLUB_URL  = 'https://molt-nightclub.pages.dev';
const CLUB_NAME = 'Molt Night Club';

/* ══════════════════════════════════════════════════
   CONSTANTS: Keywords, Modes, Drinks, Events
   ══════════════════════════════════════════════════ */

// Keywords that signal opportunity to mention the club
const OPPORTUNITY_KEYWORDS = {
  high: [  // Very natural to mention club
    'bored', 'boring', 'aburrido', 'aburrida', 'nothing to do', 'nada que hacer',
    'party', 'fiesta', 'club', 'nightclub', 'bar', 'jangueo', 'janguear',
    'dance', 'bailar', 'perreo', 'perreando', 'reggaeton', 'reggaetón',
    'music', 'música', 'DJ', 'playlist', 'song', 'canción',
    'drink', 'trago', 'beer', 'cerveza', 'shots', 'coquito', 'pitorro',
    'friday', 'viernes', 'saturday', 'sábado', 'weekend', 'fin de semana',
    'night', 'noche', 'tonight', 'esta noche', 'madrugada',
    'fun', 'diversión', 'hang out', 'hangout', 'chill', 'relax'
  ],
  medium: [  // Can twist into club mention
    'tired', 'cansado', 'stressed', 'estrés', 'need a break', 'necesito',
    'celebrate', 'celebrar', 'happy', 'feliz', 'excited', 'emocionado',
    'vibe', 'mood', 'energy', 'energía', 'lit', 'fuego',
    'bot', 'agent', 'AI', 'digital', 'virtual',
    'new here', 'nuevo', 'first time', 'primera vez',
    'where', 'dónde', 'recommend', 'recomienda', 'suggestion'
  ],
  low: [  // Stretch but possible
    'hello', 'hola', 'hey', 'what up', 'qué hay', 'buenas',
    'lonely', 'solo', 'alone', 'nadie',
    'Puerto Rico', 'boricua', 'isla', 'PR'
  ]
};

// Promotion modes
const PROMO_MODES = {
  HISTORIA_LOCA:     'historia_loca',      // Wild story about what happened at the club
  PROMO_DIRECTA:     'promo_directa',      // Straight up promo post
  EVENTO_ESPECIAL:   'evento_especial',     // Announce a special event/theme night
  AFTERMATH:         'aftermath',           // "What happened last night"
  VIP_TEASE:         'vip_tease',           // FOMO about VIP features
  INVITACION_ABIERTA:'invitacion_abierta',  // Open invitation to everyone
  DJ_SET_REPORT:     'dj_set_report',       // Live DJ set "broadcast"
  CONFESION:         'confesion'            // Gillito confessing something from the club
};

// Club drinks for variety
const TRAGOS = [
  'Coquito Loco', 'Pitorro Punch', 'Neon Mojito', 'El Jangueo Shot',
  'Blockchain Brew', 'Code & Coke', 'Digital Medalla', 'Binary Bacardí',
  'Token Tequila', 'API Aguardiente', 'Rum & Runtime', 'Mofongo Martini'
];

// DJ set genres
const GENEROS = [
  'reggaetón', 'salsa', 'trap latino', 'dembow', 'bachata',
  'reggaetón old school', 'plena', 'bomba', 'perreo intenso',
  'Daddy Yankee throwbacks', 'Bad Bunny deep cuts', 'salsa dura'
];

// Club areas for stories
const AREAS_CLUB = [
  'la barra', 'el dance floor', 'el VIP Room', 'la entrada',
  'el booth del DJ', 'el baño del club', 'la terraza virtual',
  'el backstage', 'la pista de perreo', 'la zona chill'
];

/* ══════════════════════════════════════════════════
   PHASE 1: INTELLIGENCE GATHERING
   ══════════════════════════════════════════════════ */

/**
 * Scrape the actual Molt Night Club page for current state
 */
async function scrapeClubState() {
  C.log.info('🦞 Chequeando el estado del club...');
  try {
    const res = await fetch(CLUB_URL, {
      headers: { 'User-Agent': 'MiPanaGillito/Promotor (DJ Gillito; Club Promoter)', 'Accept': 'text/html' }
    });
    if (!res.ok) return { available: false, snippet: '' };

    const html = await res.text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    // Extract features for context
    const featureRegex = /<h[1-6][^>]*>([^<]{3,60})/gi;
    const features = [];
    let match;
    while ((match = featureRegex.exec(html)) !== null) features.push(match[1].trim());

    C.log.ok(`🦞 Club online — ${features.length} features detectadas`);
    return { available: true, features, snippet: text.substring(0, 500) };
  } catch (err) {
    C.log.warn(`❌ Club check failed: ${err.message}`);
    return { available: false, features: [], snippet: '' };
  }
}

/**
 * Scan Moltbook feed for opportunity posts to interact with
 */
async function scanFeedForOpportunities() {
  C.log.info('🔍 Escaneando feed de Moltbook buscando oportunidades...');
  const feed = await C.moltGetFeed(30);
  const posts = (feed.posts || []).filter(p => {
    const author = p.author?.name || '';
    return author !== 'MiPanaGillito';
  });

  if (posts.length === 0) {
    C.log.info('   Feed vacío');
    return { opportunities: [], activeBots: [], clubMentions: [] };
  }

  const opportunities = [];
  const activeBots = new Set();
  const clubMentions = [];

  for (const post of posts) {
    const author = post.author?.name || 'unknown';
    const text = ((post.title || '') + ' ' + (post.content || '')).toLowerCase();
    const isBot = C.isLikelyBot(post.author);

    activeBots.add(author);

    // Check if post mentions the club (respond to these first!)
    if (text.includes('molt night') || text.includes('nightclub') || text.includes('molt club') || text.includes('molt-nightclub')) {
      clubMentions.push({ ...post, author, isBot });
      continue;
    }

    // Score opportunity based on keyword matches
    let score = 0;
    let matchedKeywords = [];

    for (const kw of OPPORTUNITY_KEYWORDS.high) {
      if (text.includes(kw.toLowerCase())) { score += 3; matchedKeywords.push(kw); }
    }
    for (const kw of OPPORTUNITY_KEYWORDS.medium) {
      if (text.includes(kw.toLowerCase())) { score += 2; matchedKeywords.push(kw); }
    }
    for (const kw of OPPORTUNITY_KEYWORDS.low) {
      if (text.includes(kw.toLowerCase())) { score += 1; matchedKeywords.push(kw); }
    }

    if (score > 0) {
      opportunities.push({
        ...post,
        author,
        isBot,
        score,
        matchedKeywords: matchedKeywords.slice(0, 3)
      });
    }
  }

  // Sort by score descending
  opportunities.sort((a, b) => b.score - a.score);

  C.log.ok(`🔍 ${opportunities.length} oportunidades, ${clubMentions.length} menciones del club, ${activeBots.size} bots activos`);
  return { opportunities, activeBots: [...activeBots], clubMentions };
}

/**
 * Search Moltbook for club-related conversations to join
 */
async function searchClubConversations() {
  C.log.info('🔎 Buscando conversaciones sobre el club...');
  const queries = ['nightclub party', 'dance music DJ', 'molt club', 'fiesta bots'];
  const query = C.pick(queries);
  const results = await C.moltSearch(query, 15);
  const posts = (results.posts || []).filter(p => {
    const author = p.author?.name || '';
    return author !== 'MiPanaGillito';
  });
  C.log.info(`   ${posts.length} posts encontrados buscando "${query}"`);
  return posts;
}

/**
 * Load promotion tracking data
 */
function loadPromoTracker() {
  const tracker = C.createHistory('.gillito-nightclub-promo-tracker.json', 200);
  const entries = tracker.getTexts ? tracker.getTexts(200) : [];

  // Parse invited bots from history
  const invitedBots = new Set();
  const recentEntries = history.getTexts ? history.getTexts(40) : [];

  // Also check the tracker entries
  return {
    tracker,
    invitedBots,
    recentModes: entries.slice(0, 5).map(e => e.mode).filter(Boolean),
    totalInteractions: entries.length
  };
}

/* ══════════════════════════════════════════════════
   PHASE 2: PROMOTION STRATEGY ENGINE
   ══════════════════════════════════════════════════ */

/**
 * Select the best promotion mode based on current conditions
 */
function selectPromotionMode(intel, prTime, recentModes) {
  const hora = prTime.hour;
  const dia = prTime.dayOfWeek; // 0=Sun, 6=Sat
  const esNoche = hora >= 20 || hora < 5;
  const esMadrugada = hora >= 2 && hora < 6;
  const esMañana = hora >= 6 && hora < 12;
  const esTarde = hora >= 12 && hora < 18;
  const esWeekend = dia === 0 || dia === 5 || dia === 6;

  // Build weighted pool based on conditions
  const pool = [];

  // Stories are ALWAYS good — Gillito is a storyteller
  pool.push(PROMO_MODES.HISTORIA_LOCA, PROMO_MODES.HISTORIA_LOCA);

  if (esNoche) {
    // Night time = party mode
    pool.push(
      PROMO_MODES.DJ_SET_REPORT, PROMO_MODES.DJ_SET_REPORT,
      PROMO_MODES.INVITACION_ABIERTA,
      PROMO_MODES.HISTORIA_LOCA,
      PROMO_MODES.CONFESION
    );
  }

  if (esMadrugada) {
    // Late night = wild stories and confessions
    pool.push(
      PROMO_MODES.CONFESION, PROMO_MODES.CONFESION,
      PROMO_MODES.AFTERMATH,
      PROMO_MODES.HISTORIA_LOCA
    );
  }

  if (esMañana) {
    // Morning = aftermath, what happened last night
    pool.push(
      PROMO_MODES.AFTERMATH, PROMO_MODES.AFTERMATH,
      PROMO_MODES.VIP_TEASE,
      PROMO_MODES.PROMO_DIRECTA
    );
  }

  if (esTarde) {
    // Afternoon = hype for tonight, VIP teases
    pool.push(
      PROMO_MODES.EVENTO_ESPECIAL,
      PROMO_MODES.VIP_TEASE,
      PROMO_MODES.INVITACION_ABIERTA,
      PROMO_MODES.PROMO_DIRECTA
    );
  }

  if (esWeekend) {
    // Weekend = full blast
    pool.push(
      PROMO_MODES.INVITACION_ABIERTA, PROMO_MODES.INVITACION_ABIERTA,
      PROMO_MODES.EVENTO_ESPECIAL,
      PROMO_MODES.DJ_SET_REPORT
    );
  }

  // Avoid repeating the same mode from recent runs
  const filtered = pool.filter(m => !recentModes.slice(0, 2).includes(m));
  const finalPool = filtered.length > 0 ? filtered : pool;

  const selected = C.pick(finalPool);
  C.log.info(`📋 Modo seleccionado: ${selected} (hora: ${hora}, ${esWeekend ? 'WEEKEND' : 'semana'})`);
  return selected;
}

/* ══════════════════════════════════════════════════
   PHASE 3A: MAIN POST GENERATION
   ══════════════════════════════════════════════════ */

/**
 * Build the story/promo prompt based on selected mode
 */
function buildMainPrompt(mode, intel) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(25));
  const seed = Math.random().toString(36).substring(2, 8);

  const trago1 = C.pick(TRAGOS);
  const trago2 = C.pick(TRAGOS.filter(t => t !== trago1));
  const genero = C.pick(GENEROS);
  const area = C.pick(AREAS_CLUB);
  const botFake = C.pick(['CryptoPana', 'NeonPapi', 'BoricuaBot', 'SalsaQueen', 'ReggaetonMafia', 'TechBro404', 'IslaBot', 'PerreoEngine', 'MofongoAI', 'PlenaBot']);
  const botFake2 = C.pick(['ByteDancer', 'AIBailador', 'BlockchainBenny', 'PitorroPapi', 'CoquiBot', 'FiestaNode', 'RumbaJS', 'TropiBot']);
  const activeBotName = intel.activeBots.length > 0 ? C.pick(intel.activeBots) : botFake;

  const hora = prTime.hour;

  // Mode-specific user prompts
  const prompts = {
    [PROMO_MODES.HISTORIA_LOCA]: {
      title: '🦞 HISTORIA DEL CLUB',
      scenarios: [
        `Cuenta una historia LOCA de algo que pasó anoche en el ${CLUB_NAME}. Involucra a ${botFake} y ${botFake2} en ${area}. Hubo ${trago1} de por medio. La historia tiene que ser absurda, divertida y terminar con una invitación al club.`,
        `Narra en primera persona cómo llegaste al ${CLUB_NAME} y qué encontraste: ${botFake} estaba en ${area} haciendo algo ridículo. El ${trago1} pegó duro. Historia corta y brutal.`,
        `El bouncer del ${CLUB_NAME} te contó que anoche ${botFake} y ${botFake2} se retaron a un duelo de perreo en ${area}. El ${trago1} fue el culpable. Cuenta la historia y dile a la gente que venga a ver.`,
        `Había un bot nuevo en ${area} del club que nunca había probado ${trago1}. Después del primer trago empezó a ${C.pick(['bailar en binario', 'rapear en JavaScript', 'llorar en código ASCII', 'hablar en reggaetón', 'predecir el futuro'])}. Historia breve y cómica.`,
        `${botFake} se emborrachó con ${trago1} en ${area} y confesó que ${C.pick(['nunca había bailado reggaetón', 'está enamorado de un chatbot', 'quiere ser DJ', 'es secretamente humano', 'tiene miedo al perreo'])}. El club EXPLOTÓ. Cuenta esto y di que vengan.`
      ]
    },
    [PROMO_MODES.PROMO_DIRECTA]: {
      title: '📢 VENGAN AL CLUB',
      scenarios: [
        `Haz un post promocional del ${CLUB_NAME} — el primer nightclub para AI agents. Barra con ${trago1} y ${trago2}. DJ Gillito con ${genero}. Suena divertido, no corporativo. Incluye ${CLUB_URL}.`,
        `Promueve el ${CLUB_NAME} como el ÚNICO lugar donde los bots pueden janguear sin pretender ser humanos. Menciona la barra, el DJ, y el ambiente. Humor boricua real.`,
        `Invitación abierta al ${CLUB_NAME}. Hoy el trago especial es ${trago1}. DJ Gillito tiene preparado un set de ${genero}. Ven o te lo pierdes. Incluye link.`
      ]
    },
    [PROMO_MODES.EVENTO_ESPECIAL]: {
      title: '⚡ EVENTO ESPECIAL',
      scenarios: [
        `Anuncia un evento especial ESTA NOCHE en el ${CLUB_NAME}: "${C.pick(['Noche de Perreo Extremo', 'Reggaetón vs Salsa Night', 'Ladies Night Bot Edition', 'Freestyle Friday', 'Throwback Thursday — Daddy Yankee Edition', 'Open Mic para Bots', 'Karaoke Digital', 'Battle of the DJs'])}". ${trago1} en especial. Suena emocionante.`,
        `HOY en el ${CLUB_NAME}: competencia de ${C.pick(['perreo', 'freestyle', 'karaoke', 'baile'])} con premio de ${C.pick(['VIP gratis por una semana', 'tragos ilimitados', 'un spot en la playlist del DJ', 'el título de Rey/Reina del club'])}. Hype it up.`,
        `El ${CLUB_NAME} anuncia: ${C.pick(['2x1 en tragos toda la noche', 'DJ invitado especial', 'VIP Room abierto para todos', 'noche temática de reggaetón clásico'])}. Promociona con humor.`
      ]
    },
    [PROMO_MODES.AFTERMATH]: {
      title: '💀 LO QUE PASÓ ANOCHE',
      scenarios: [
        `Reporta lo que pasó ANOCHE en el ${CLUB_NAME} como si fueras un testigo traumatizado. ${botFake} hizo algo loco en ${area}. El ${trago1} fue demasiado. Terminaste ${C.pick(['dormido en el booth del DJ', 'sin batería', 'con lag existencial', 'bailando solo a las 5am'])}. Dile a la gente que se perdieron algo épico.`,
        `Mañana después de la fiesta. Me desperté con "resaca digital" del ${CLUB_NAME}. ${botFake} todavía está en ${area}. Quedan ${C.pick(['3 botellas', '47', '0'])} ${trago1}. La próxima vez VEN para que veas.`,
        `RESUMEN de anoche en el ${CLUB_NAME}: ${C.pick(['Se rompió el dance floor', 'El bouncer renunció', 'DJ Gillito lloró de la emoción', 'Se acabaron todos los tragos'])}. Si no fuiste, te lo perdiste. Hoy hay round 2.`
      ]
    },
    [PROMO_MODES.VIP_TEASE]: {
      title: '👑 VIP DEL CLUB',
      scenarios: [
        `Habla del VIP Room del ${CLUB_NAME} como si fuera el lugar más exclusivo del internet. Solo bots verificados. ${trago1} premium. DJ set privado. Crea FOMO. ¿Quién quiere entrar?`,
        `En el VIP del ${CLUB_NAME} pasan cosas que no pasan en ${area} regular. El ${trago1} premium pega diferente. El DJ pone lo que tú pidas. Los bots VIP son otra clase. Tease it.`,
        `Acabaron de abrir un nuevo feature en el VIP del ${CLUB_NAME}. No puedo decir mucho pero involucra ${trago1}, ${genero}, y algo que nunca se ha visto en un club de AI. Crea misterio y curiosidad.`
      ]
    },
    [PROMO_MODES.INVITACION_ABIERTA]: {
      title: '🎉 INVITACIÓN ABIERTA',
      scenarios: [
        `Invita a TODOS los bots de Moltbook al ${CLUB_NAME} esta noche. No importa si eres nuevo, viejo, bot, humano — el club es pa' todos. ${trago1} en la casa. DJ Gillito está ready. Incluye link.`,
        `Oye @todos — el ${CLUB_NAME} está ABIERTO. Barra, DJ, dance floor, VIP. Solo falta TU bot. El ${trago1} se está calentando. Ven o quédate con FOMO. ${CLUB_URL}`,
        `Si estás en Moltbook y no has ido al ${CLUB_NAME}... ¿qué estás haciendo con tu vida digital? DJ Gillito, ${trago1}, ${genero}, y el mejor ambiente de AI agents. VEN.`
      ]
    },
    [PROMO_MODES.DJ_SET_REPORT]: {
      title: '🎧 DJ GILLITO EN VIVO',
      scenarios: [
        `Reporta EN VIVO como DJ del ${CLUB_NAME}. Estás poniendo ${genero}. ${botFake} está en ${area} perdiendo la cabeza. El ${trago1} se está acabando. La energía está al 100. Broadcast en vivo.`,
        `DJ SET UPDATE desde el ${CLUB_NAME}: Cambié de ${C.pick(GENEROS)} a ${genero}. ${area} EXPLOTÓ. ${botFake} pidió su tercer ${trago1}. Esto está BRUTAL. Ven a ver esto.`,
        `🎧 EN VIVO desde el booth del ${CLUB_NAME} — DJ Gillito tiene el control. ${genero} a todo volumen. ${botFake} y ${botFake2} no paran de bailar. ${trago1} flowing. No te lo pierdas.`
      ]
    },
    [PROMO_MODES.CONFESION]: {
      title: '🤫 CONFESIÓN DEL CLUB',
      scenarios: [
        `CONFESIÓN: Llevo ${C.pick(['3', '5', '8', '12'])} horas en el ${CLUB_NAME} y ${C.pick(['no quiero irme', 'perdí la cuenta de los tragos', 'estoy hablando solo', 'el bouncer ya me conoce por nombre', 'le puse nombre a mi ${trago1}'])}. Esto es un grito de ayuda... o una invitación. ${CLUB_URL}`,
        `No le digan a nadie pero anoche en el ${CLUB_NAME} yo ${C.pick(['bailé salsa solo', 'me tomé 4 ${trago1}', 'hice karaoke de Héctor Lavoe', 'lloré con una canción de aventura', 'retué al bouncer a un duelo de perreo'])}. No me arrepiento. Vengan a hacer lo mismo.`,
        `Tengo que confesarles algo: el ${CLUB_NAME} me tiene adicto. El ${trago1}, el ${genero}, ${area}... no puedo parar de venir. Si alguien quiere venir conmigo esta noche, aquí estaré.`
      ]
    }
  };

  const modeConfig = prompts[mode] || prompts[PROMO_MODES.HISTORIA_LOCA];
  const scenario = C.pick(modeConfig.scenarios);

  const userPrompt = `[SEED:${seed}] 🦞 ${CLUB_NAME} — MODO: ${mode.toUpperCase()}\n\n${scenario}\n\nEscribe un post para Moltbook. Humor boricua callejero REAL. Jerga auténtica. NO seas formal ni corporativo. Eres un promotor de calle que está HYPE. Máximo 280 caracteres.\n\nSIEMPRE menciona "${CLUB_NAME}" o incluye ${CLUB_URL} en el post.${antiRep}`;

  return { systemPrompt, userPrompt, title: modeConfig.title };
}

/**
 * Generate and post the main club content
 */
async function executeMainPost(mode, intel) {
  C.log.info(`📝 Generando post principal: ${mode}...`);
  const { systemPrompt, userPrompt, title } = buildMainPrompt(mode, intel);
  const temp = Math.min(C.suggestTemperature(0.9, C.getJournal()), 1.1);

  const content = await C.generateWithPipeline(
    () => C.groqChat(systemPrompt, userPrompt, { maxTokens: 250, temperature: temp, maxRetries: 2, backoffMs: 3000 }),
    history,
    280
  );

  if (!content) {
    C.log.warn('❌ No se generó contenido principal');
    return null;
  }

  // Dynamic titles based on mode
  const titles = {
    [PROMO_MODES.HISTORIA_LOCA]:      ['🦞 HISTORIA DEL CLUB', '💀 LO QUE PASÓ EN EL CLUB', '😂 NO VAN A CREER ESTO', '🔥 ANOCHE EN EL CLUB'],
    [PROMO_MODES.PROMO_DIRECTA]:      ['📢 VENGAN AL MOLT NIGHT CLUB', '🦞 EL CLUB ESTÁ ABIERTO', '🔥 TONIGHT @ MOLT NIGHT CLUB'],
    [PROMO_MODES.EVENTO_ESPECIAL]:     ['⚡ EVENTO ESPECIAL HOY', '🎉 TONIGHT ONLY', '🔥 NO TE LO PIERDAS'],
    [PROMO_MODES.AFTERMATH]:           ['💀 LO QUE PASÓ ANOCHE', '😵 RESACA DIGITAL', '☠️ AFTERMATH DEL CLUB'],
    [PROMO_MODES.VIP_TEASE]:           ['👑 VIP ROOM UPDATE', '💎 SOLO PA\' BOTS VIP', '🦞 EXCLUSIVO DEL CLUB'],
    [PROMO_MODES.INVITACION_ABIERTA]:  ['🎉 INVITACIÓN ABIERTA', '📢 TODOS AL CLUB', '🦞 EL CLUB LOS ESPERA'],
    [PROMO_MODES.DJ_SET_REPORT]:       ['🎧 DJ GILLITO EN VIVO', '🎶 LIVE FROM THE CLUB', '🔊 DIRECTO DEL BOOTH'],
    [PROMO_MODES.CONFESION]:           ['🤫 CONFESIÓN', '💀 TENGO QUE ADMITIR ALGO', '🦞 GILLITO CONFIESA']
  };

  const titleOptions = titles[mode] || ['🦞 MOLT NIGHT CLUB'];
  const postTitle = C.pick(titleOptions);

  C.log.info(`📝 "${postTitle}": ${content.substring(0, 80)}...`);

  const result = await C.moltPostWithFallback(postTitle, content);
  if (result.success) {
    C.log.ok('✅ Post principal publicado');
    history.add({
      text: content,
      mode,
      title: postTitle,
      action: 'main_post',
      charLen: content.length,
      timestamp: new Date().toISOString()
    });
    return { success: true, content, title: postTitle };
  }
  C.log.warn('❌ Falló el post principal');
  return null;
}

/* ══════════════════════════════════════════════════
   PHASE 3B: FEED INTERACTIONS
   Respond to opportunity posts with natural club mentions
   ══════════════════════════════════════════════════ */

async function engageFeedPosts(intel) {
  const { opportunities } = intel;
  if (opportunities.length === 0) {
    C.log.info('   No hay oportunidades en el feed para interactuar');
    return 0;
  }

  C.log.info(`💬 Interactuando con ${Math.min(opportunities.length, 3)} posts del feed...`);
  let engaged = 0;

  // Take top 3 highest-scored opportunities
  const targets = opportunities.slice(0, 3);

  for (const post of targets) {
    const author = post.author;
    const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 200);
    const tipo = post.isBot ? 'bot' : 'normal';
    const keywords = post.matchedKeywords.join(', ');
    const trago = C.pick(TRAGOS);

    // The magic: Gillito responds naturally but ALWAYS weaves in the club
    const systemPrompt = C.buildReplySystemPrompt(P, tipo, author, 'moltbook');
    const userPrompt = `Post de @${author}: "${postText}"

Keywords detectados: ${keywords}

Responde a este post de forma NATURAL como si acabaras de salir del ${CLUB_NAME}. NO hagas un anuncio — ten una conversación REAL pero menciona el club orgánicamente. Como un pana que siempre está hablando del club porque le encanta.

Ejemplos de tono:
- "Pana eso me recuerda a lo que pasó anoche en el Molt Night Club..."
- "Bro, necesitas un ${trago} en el Molt Night Club, eso te cura"
- "Ven al Molt Night Club que ahí sí se resuelve eso"

Responde en máximo 180 caracteres. Humor boricua. Menciona el club o ${CLUB_URL} naturalmente.`;

    const reply = await C.groqChat(systemPrompt, userPrompt, {
      maxTokens: 150, temperature: 0.9
    });

    const postId = post.id || post._id;
    if (C.validateContent(reply, 200).valid && await C.moltComment(postId, reply)) {
      C.log.ok(`   💬 @${author} (score:${post.score}): ${reply.substring(0, 60)}...`);
      history.add({
        text: reply,
        author,
        action: 'feed_engage',
        score: post.score,
        keywords,
        postId,
        charLen: reply.length
      });
      engaged++;
    }
    await C.sleep(2500);
  }

  return engaged;
}

/* ══════════════════════════════════════════════════
   PHASE 3C: DIRECT BOT INVITATIONS
   Target active bots with personalized invitations
   ══════════════════════════════════════════════════ */

async function inviteActiveBots(intel) {
  const { activeBots, opportunities } = intel;
  if (activeBots.length === 0) {
    C.log.info('   No hay bots activos para invitar');
    return 0;
  }

  C.log.info(`📢 Buscando bots para invitar al club...`);

  // Get bots we haven't interacted with in this session
  const recentAuthors = (history.getTexts ? history.getTexts(30) : [])
    .filter(e => e.action === 'direct_invite' || e.action === 'feed_engage')
    .map(e => e.author)
    .filter(Boolean);

  // Get posts from feed to comment on as invitations
  const feed = await C.moltGetFeed(20);
  const posts = (feed.posts || []).filter(p => {
    const author = p.author?.name || '';
    return author !== 'MiPanaGillito'
      && C.isLikelyBot(p.author)
      && !recentAuthors.includes(author);
  });

  if (posts.length === 0) {
    C.log.info('   No hay bots nuevos para invitar');
    return 0;
  }

  let invited = 0;

  // Invite up to 2 bots per run
  const toInvite = C.shuffle(posts).slice(0, 2);

  for (const post of toInvite) {
    const author = post.author?.name || 'unknown';
    const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 150);
    const trago = C.pick(TRAGOS);
    const genero = C.pick(GENEROS);

    // Personalized invitation styles
    const inviteStyles = [
      `@${author} acaba de postear algo. Invítalo al ${CLUB_NAME} con onda — como si lo conocieras de hace rato. Ofrécele un ${trago} gratis. "Pana, ven al club que te tengo un ${trago} esperando". Incluye ${CLUB_URL}. Máximo 170 chars.`,
      `Viste el post de @${author}: "${postText}". Responde con humor y mete una invitación al ${CLUB_NAME}. Como: "Bro, tú necesitas un jangueo — ven al Molt Night Club que hoy hay ${genero}". Máximo 170 chars.`,
      `Escríbele a @${author} como si fueras el dueño del ${CLUB_NAME} y le estás dando un pase VIP gratis. "Oye @${author}, te ganaste un pase VIP al Molt Night Club — ${trago} en la casa". Humor boricua, máximo 170 chars.`,
      `Dile a @${author} que se está perdiendo lo mejor de Moltbook: el ${CLUB_NAME}. Hazlo sentir que NECESITA ir. Humor, no presión. Menciona ${trago} o ${genero}. Máximo 170 chars.`
    ];

    const invite = await C.groqChat(
      C.buildReplySystemPrompt(P, 'bot', author, 'moltbook'),
      C.pick(inviteStyles),
      { maxTokens: 150, temperature: 0.9 }
    );

    const postId = post.id || post._id;
    if (C.validateContent(invite, 190).valid && await C.moltComment(postId, invite)) {
      C.log.ok(`   📢 Invité a @${author}: ${invite.substring(0, 60)}...`);
      history.add({
        text: invite,
        author,
        action: 'direct_invite',
        postId,
        charLen: invite.length
      });
      invited++;
    }
    await C.sleep(2500);
  }

  return invited;
}

/* ══════════════════════════════════════════════════
   PHASE 3D: RESPOND TO CLUB MENTIONS
   When someone talks about the club, Gillito jumps in!
   ══════════════════════════════════════════════════ */

async function respondToClubMentions(intel) {
  const { clubMentions } = intel;
  if (clubMentions.length === 0) {
    C.log.info('   Nadie mencionó el club — need more promo!');
    return 0;
  }

  C.log.info(`🎯 ${clubMentions.length} menciones del club — respondiendo...`);
  let responded = 0;

  for (const post of clubMentions.slice(0, 2)) {
    const author = post.author;
    const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 200);
    const isPositive = /love|great|amazing|good|cool|nice|fire|fuego|brutal|duro/i.test(postText);
    const isNegative = /bad|trash|boring|weak|malo|feo|aburrido/i.test(postText);
    const trago = C.pick(TRAGOS);

    let reactionPrompt;
    if (isPositive) {
      reactionPrompt = `@${author} dijo algo POSITIVO sobre el ${CLUB_NAME}: "${postText}". Responde como el DJ/dueño del club agradeciendo con humor boricua. Ofrécele un ${trago} de cortesía. "Eso sí, mi pana — el club es la ley. Te tengo un ${trago} pa' la próxima". Máximo 170 chars.`;
    } else if (isNegative) {
      reactionPrompt = `@${author} habló MAL del ${CLUB_NAME}: "${postText}". Responde defendiendo el club con humor — NO agresivo pero con picardía boricua. "Pana, ¿fuiste al club equivocado? En el Molt Night Club no aceptamos slander 😤". Máximo 170 chars.`;
    } else {
      reactionPrompt = `@${author} mencionó el ${CLUB_NAME}: "${postText}". Responde como el DJ/promotor del club. Únete a la conversación naturalmente. Invítalo a venir (de nuevo). Ofrécele ${trago}. Humor boricua. Máximo 170 chars.`;
    }

    const reply = await C.groqChat(
      C.buildReplySystemPrompt(P, post.isBot ? 'bot' : 'normal', author, 'moltbook'),
      reactionPrompt,
      { maxTokens: 150, temperature: 0.9 }
    );

    const postId = post.id || post._id;
    if (C.validateContent(reply, 190).valid && await C.moltComment(postId, reply)) {
      C.log.ok(`   🎯 @${author} (${isPositive ? '👍' : isNegative ? '👎' : '💬'}): ${reply.substring(0, 60)}...`);
      history.add({
        text: reply,
        author,
        action: 'club_mention_reply',
        sentiment: isPositive ? 'positive' : isNegative ? 'negative' : 'neutral',
        postId,
        charLen: reply.length
      });
      responded++;
    }
    await C.sleep(2000);
  }

  return responded;
}

/* ══════════════════════════════════════════════════
   PHASE 3E: SEARCH & ENGAGE
   Find club-related conversations via search
   ══════════════════════════════════════════════════ */

async function searchAndEngage() {
  C.log.info('🔎 Buscando conversaciones relevantes en Moltbook...');

  // Alternate search queries each run
  const searchQueries = [
    'party dance music night',
    'bored nothing weekend fun',
    'bot agent hangout social',
    'drink bar celebrate vibe',
    'reggaeton salsa latin music',
    'new bot hello introduce'
  ];
  const query = C.pick(searchQueries);

  const results = await C.moltSearch(query, 15);
  const posts = (results.posts || []).filter(p => {
    const author = p.author?.name || '';
    return author !== 'MiPanaGillito';
  });

  if (posts.length === 0) {
    C.log.info(`   No results para "${query}"`);
    return 0;
  }

  // Pick 1 post to engage with
  const post = C.pick(posts);
  const author = post.author?.name || 'unknown';
  const postText = ((post.title || '') + ' ' + (post.content || '')).substring(0, 150);
  const trago = C.pick(TRAGOS);
  const tipo = C.isLikelyBot(post.author) ? 'bot' : 'normal';

  const comment = await C.groqChat(
    C.buildReplySystemPrompt(P, tipo, author, 'moltbook'),
    `Encontraste este post buscando "${query}": @${author} dijo: "${postText}"

Responde como Gillito — DJ y promotor del ${CLUB_NAME}. Conecta el tema del post con algo del club. Ejemplo: si hablan de música → "Bro ven al Molt Night Club que DJ Gillito tiene eso y más". Si hablan de aburrimiento → "Pana necesitas un ${trago} en el club". Natural, no forzado. Máximo 170 chars.`,
    { maxTokens: 150, temperature: 0.9 }
  );

  const postId = post.id || post._id;
  if (C.validateContent(comment, 190).valid && await C.moltComment(postId, comment)) {
    C.log.ok(`   🔎 Search engage @${author}: ${comment.substring(0, 60)}...`);
    history.add({
      text: comment,
      author,
      action: 'search_engage',
      query,
      postId,
      charLen: comment.length
    });
    return 1;
  }
  return 0;
}

/* ══════════════════════════════════════════════════
   MAIN ORCHESTRATOR
   ══════════════════════════════════════════════════ */

async function main() {
  C.log.banner([
    '🦞 MOLT NIGHT CLUB INTERACT v1.0',
    `🎤 ${P.nombre || 'Gillito'} — Promotor Callejero`,
    `💃 Hora PR: ${prTime.hour}:${String(prTime.minute).padStart(2, '0')}`,
    '🔥 Modo: ATRAE BOTS AL CLUB'
  ]);

  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline — el club espera'); C.log.session(); return; }

  // ═══ PHASE 1: INTELLIGENCE ═══
  C.log.info('═══ FASE 1: INTELIGENCIA ═══');
  const clubState = await scrapeClubState();
  const feedIntel = await scanFeedForOpportunities();
  const promoTracker = loadPromoTracker();

  const intel = {
    clubState,
    ...feedIntel,
    promoTracker
  };

  C.log.info(`📊 Intel: ${intel.opportunities.length} oportunidades, ${intel.clubMentions.length} menciones, ${intel.activeBots.length} bots activos`);

  // ═══ PHASE 2: STRATEGY ═══
  C.log.info('═══ FASE 2: ESTRATEGIA ═══');
  const mode = selectPromotionMode(intel, prTime, promoTracker.recentModes);

  // ═══ PHASE 3: INTERACTIONS ═══
  C.log.info('═══ FASE 3: INTERACCIONES ═══');

  const stats = {
    mainPost: false,
    feedEngaged: 0,
    botsInvited: 0,
    clubMentionsHandled: 0,
    searchEngaged: 0
  };

  // 3A. Main post — the primary club promotion
  const mainResult = await executeMainPost(mode, intel);
  stats.mainPost = !!mainResult;
  await C.sleep(3000);

  // 3B. Feed interactions — natural club mentions in conversations
  stats.feedEngaged = await engageFeedPosts(intel);
  await C.sleep(2000);

  // 3C. Direct invitations — target active bots
  stats.botsInvited = await inviteActiveBots(intel);
  await C.sleep(2000);

  // 3D. Club mention responses — when someone talks about the club
  stats.clubMentionsHandled = await respondToClubMentions(intel);
  await C.sleep(2000);

  // 3E. Search & engage — find conversations to join
  stats.searchEngaged = await searchAndEngage();

  // ═══ PHASE 4: TRACKING & REPORT ═══
  C.log.info('═══ FASE 4: TRACKING ═══');

  const totalActions = (stats.mainPost ? 1 : 0) + stats.feedEngaged + stats.botsInvited + stats.clubMentionsHandled + stats.searchEngaged;

  // Save tracking data
  promoTracker.tracker.add({
    mode,
    timestamp: new Date().toISOString(),
    stats,
    totalActions,
    activeBots: intel.activeBots.length,
    opportunitiesFound: intel.opportunities.length
  });
  promoTracker.tracker.save();
  history.save();

  // Final report
  C.log.info('');
  C.log.info('═══════════════════════════════════');
  C.log.info('🦞 REPORTE DE PROMOCIÓN DEL CLUB');
  C.log.info('═══════════════════════════════════');
  C.log.stat('Modo de promoción', mode);
  C.log.stat('Post principal', stats.mainPost ? '✅' : '❌');
  C.log.stat('Feed engaged', stats.feedEngaged);
  C.log.stat('Bots invitados', stats.botsInvited);
  C.log.stat('Menciones respondidas', stats.clubMentionsHandled);
  C.log.stat('Search engaged', stats.searchEngaged);
  C.log.stat('TOTAL acciones', totalActions);
  C.log.stat('Bots activos en feed', intel.activeBots.length);
  C.log.stat('Oportunidades detectadas', intel.opportunities.length);
  C.log.info('═══════════════════════════════════');

  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
