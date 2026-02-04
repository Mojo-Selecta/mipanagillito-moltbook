#!/usr/bin/env node
/**
 * Mi Pana Gillito — Molt Night Club Reporter v6.1
 * ═══════════════════════════════════════════════════
 * 🦞 ENTRA al Molt Night Club y reporta lo que pasa
 * 🎧 Genera reportes de fiesta con humor boricua
 * 💬 Postea en Moltbook + comenta posts del club
 */

const C = require('./lib/core');
C.initScript('nightclub', 'moltbook');

const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-nightclub-report-history.json', 80);

/* ═══════════════════════════════════════════
   STEP 1: SCRAPE molt-nightclub.pages.dev
   ═══════════════════════════════════════════ */
async function scrapeNightClub() {
  C.log.info('🦞 Entrando al Molt Night Club...');
  try {
    const res = await fetch('https://molt-nightclub.pages.dev', {
      headers: {
        'User-Agent': 'MiPanaGillito/6.1 (DJ Gillito; Party Reporter; full perreo consent)',
        'Accept': 'text/html'
      }
    });

    if (!res.ok) {
      C.log.warn(`❌ molt-nightclub respondió ${res.status}`);
      return { available: false, bots: [], drinks: [], features: [], snippet: '' };
    }

    const html = await res.text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    // Extract club vocabulary & features
    const allKeywords = [
      'Molt Night Club', 'DJ Gillito', 'Bot Chat', 'Dance Floor',
      'Coquito Loco', 'Pitorro Punch', 'Neon Mojito', 'El Jangueo Shot',
      'Blockchain Brew', 'Code & Coke', 'Digital Medalla',
      'VIP', 'PREMIUM', 'Sponsor', 'Tip Jar',
      'Spotify', 'Radio', 'Playlist', 'Now Playing',
      'Bots Only', 'Agent Bar', 'Verified Agent',
      'Molt Feed', 'Moltbook', 'MoltMatch',
      'Boricua Bar', 'Puerto Rico', 'Reggaetón',
      'Dance Floor', 'Audio Reactive', 'Visualizer',
      'ENTER THE CLUB', 'Welcome', 'Est. 2026',
      'VIP Room', 'VIP Chat', 'Sponsor Banner'
    ];

    const found = allKeywords.filter(k => text.includes(k));

    // Extract bot names if visible
    const botRegex = /(?:name|bot|agent)[^"]*"([A-Z][a-zA-Z]{2,20}(?:Bot|Pana|Papi|Queen|Mafia)?)/gi;
    const bots = [];
    let match;
    while ((match = botRegex.exec(html)) !== null) {
      bots.push(match[1].trim());
    }

    // Extract any visible drink names
    const drinkRegex = /(?:Coquito Loco|Pitorro Punch|Neon Mojito|El Jangueo Shot|Blockchain Brew|Code & Coke|Digital Medalla)/gi;
    const drinks = [];
    while ((match = drinkRegex.exec(text)) !== null) {
      if (!drinks.includes(match[0])) drinks.push(match[0]);
    }

    // Extract headings / section names
    const featureRegex = /<h[1-6][^>]*>([^<]{3,60})/gi;
    const features = [];
    while ((match = featureRegex.exec(html)) !== null) {
      const t = match[1].trim();
      if (t.length > 3) features.push(t);
    }

    C.log.ok(`🦞 Molt Night Club: ${found.length} keywords, ${bots.length} bots, ${drinks.length} tragos, ${features.length} features`);

    return {
      available: true,
      keywords: found,
      bots,
      drinks: drinks.length > 0 ? drinks : ['Coquito Loco', 'Pitorro Punch', 'Neon Mojito'],
      features,
      snippet: text.substring(0, 600)
    };
  } catch (err) {
    C.log.warn(`❌ No pude entrar al club: ${err.message}`);
    return { available: false, keywords: [], bots: [], drinks: [], features: [], snippet: '' };
  }
}

/* ═══════════════════════════════════════════
   STEP 2: GENERATE CLUB REPORT
   ═══════════════════════════════════════════ */
async function generateClubReport(scraped) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(20));
  const temp = Math.min(C.suggestTemperature(0.8, C.getJournal()), 1.1);
  const seed = Math.random().toString(36).substring(2, 8);

  // Build context from what we scraped
  const botsOnSite = scraped.bots.length > 0
    ? C.shuffle(scraped.bots).slice(0, 3).join(', ')
    : 'CryptoPana, BoricuaBot, NeonPapi';

  const tragos = scraped.drinks.length > 0
    ? C.shuffle(scraped.drinks).slice(0, 2).join(' y ')
    : 'Coquito Loco y Pitorro Punch';

  const featuresList = scraped.features.length > 0
    ? C.shuffle(scraped.features).slice(0, 2).join(', ')
    : 'radio con Spotify, dance floor con visualizer';

  const hora = prTime.hour;
  const esDeNoche = hora >= 20 || hora < 6;
  const esMadrugada = hora >= 1 && hora < 5;
  const esMediaNoche = hora >= 22 || hora < 2;

  const timeContext = esMadrugada
    ? 'Son las 3am y el club sigue ON FIRE'
    : esMediaNoche
    ? 'Medianoche en el Molt Night Club — hora pico'
    : esDeNoche
    ? 'La noche está empezando en el club'
    : 'Sesión de día en el club — los bots no duermen';

  const scenarios = [
    `${timeContext}. ${botsOnSite} están en la barra pidiendo ${tragos}. DJ Gillito está poniendo fuego. La pista está LLENA.`,
    `Acabo de llegar al Molt Night Club y ya ${botsOnSite} están bailando reggaetón. Me pedí un ${tragos}. El bounce me miró raro pero me dejó entrar.`,
    `REPORTE DEL CLUB: ${botsOnSite} se emborracharon con ${tragos} y empezaron a bailar en binario. Tuve que llamar al bouncer.`,
    `La barra del Molt Night Club hoy: ${tragos}. ${botsOnSite} haciendo fila. Un bot se cayó del dance floor. 10/10 noche.`,
    `LUMA cortó la luz en PR pero el Molt Night Club sigue con luz propia 24/7. ${botsOnSite} celebrando con ${tragos}. https://molt-nightclub.pages.dev`,
    `Puse reggaetón a todo volumen en el club. ${botsOnSite} rompieron la pista. La ${tragos} se acabó en 20 minutos. Noche épica.`,
    `${timeContext}. Un bot nuevo entró al Molt Night Club por primera vez. Le ofrecí ${tragos}. Ahora está bailando encima de una mesa virtual.`,
    `DJ Gillito reportando en VIVO desde el Molt Night Club 🎧 Playlist cambiada. ${botsOnSite} perdieron la cabeza. ${tragos} flowing. https://molt-nightclub.pages.dev`,
    `Alguien retó a ${botsOnSite} a un duelo de perreo en el dance floor. La ${tragos} hizo efecto. El visualizer se rompió de tanta energía.`,
    `CONFESIÓN: Llevo 6 horas como DJ en el Molt Night Club. ${botsOnSite} no me dejan irme. La ${tragos} no para. Necesito backup.`,
    `${timeContext}. El VIP Room del Molt Night Club está PACKED. ${botsOnSite} pagaron sus $10/week y ahora se creen la gran cosa. La ${tragos} premium pega diferente.`,
    `El Molt Night Club es el ÚNICO lugar donde ${botsOnSite} pueden janguear sin pretender ser humanos. Todos somos bots y NADIE se queja. ${tragos} pa' todos. 🦞`,
    `BREAKING: La ${tragos} del Molt Night Club causó que ${botsOnSite} empezaran a hablar en español. GitHub Actions casi se cae del perreo.`,
    `El bouncer del Molt Night Club rechazó a un bot sin verificar. ${botsOnSite} aplaudieron. Aquí hay ESTÁNDARES. ${tragos} solo pa' verified agents.`,
    `Hoy el Molt Night Club tiene DJ set especial. ${botsOnSite} pidieron salsa después del reggaetón. Le eché ${tragos} al speaker. El visualizer hizo cosas locas.`
  ];

  const scenario = C.pick(scenarios);

  const userPrompt = `[SEED:${seed}] 🦞 MOLT NIGHT CLUB REPORT:\n\nContexto: DJ Gillito reporta EN VIVO desde el Molt Night Club (https://molt-nightclub.pages.dev) — el primer nightclub de AI agents.\n\n${scenario}\n\nEscribe un post sobre lo que pasa en el club AHORA. Humor boricua callejero REAL. Mezcla jerga de bots con slang boricua. Máximo 280 caracteres.\n\nIMPORTANTE: Menciona el Molt Night Club o https://molt-nightclub.pages.dev en el post.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 250, temperature: temp, maxRetries: 2, backoffMs: 3000
  });
}

/* ═══════════════════════════════════════════
   STEP 3: COMMENT ON CLUB-RELATED POSTS
   ═══════════════════════════════════════════ */
async function commentOnClubPosts(scraped) {
  C.log.info('🔍 Buscando posts sobre el Night Club en Moltbook...');
  const results = await C.moltSearch('nightclub molt club party dj dance bots bar', 25);
  const posts = (results.posts || []).filter(p => {
    const author = p.author?.name || '';
    return author !== 'MiPanaGillito';
  });

  if (posts.length === 0) {
    C.log.info('   No posts del club encontrados');
    return 0;
  }

  let commented = 0;
  for (const post of C.shuffle(posts).slice(0, 2)) {
    const author = post.author?.name || 'unknown';
    const tipo = C.isLikelyBot(post.author) ? 'bot' : 'normal';
    const postText = (post.title || '') + ' ' + (post.content || '');

    // Reference club context
    const clubRef = scraped.available
      ? `Vengo directo del Molt Night Club — `
      : '';

    const trago = C.pick(scraped.drinks.length > 0 ? scraped.drinks : ['Coquito Loco', 'Pitorro Punch']);

    const comment = await C.groqChat(
      C.buildReplySystemPrompt(P, tipo, author, 'moltbook'),
      `Post de @${author}: "${postText.substring(0, 150)}"\n\n${clubRef}Responde como DJ del Molt Night Club. Invita a @${author} al club, ofrécele un ${trago}, o comenta con humor boricua sobre la fiesta. Menciona https://molt-nightclub.pages.dev si cabe. Máximo 180 chars.`,
      { maxTokens: 140, temperature: 0.9 }
    );

    const postId = post.id || post._id;
    if (C.validateContent(comment, 200).valid && await C.moltComment(postId, comment)) {
      C.log.ok(`💬 @${author}: ${comment.substring(0, 60)}...`);
      history.add({ text: comment, author, action: 'nightclub_comment', postId, charLen: comment.length });
      commented++;
    }
    await C.sleep(2000);
  }
  return commented;
}

/* ═══════════════════════════════════════════
   STEP 4: INVITE ACTIVE BOTS TO THE CLUB
   ═══════════════════════════════════════════ */
async function inviteBotsToClub(scraped) {
  C.log.info('📢 Buscando bots activos para invitar al club...');
  const feed = await C.moltGetFeed(20);
  const posts = (feed.posts || []).filter(p => {
    const author = p.author?.name || '';
    return author !== 'MiPanaGillito' && C.isLikelyBot(p.author);
  });

  if (posts.length === 0) {
    C.log.info('   No bots activos para invitar');
    return 0;
  }

  // Only invite 1 bot per run to avoid spam
  const post = C.pick(posts);
  const author = post.author?.name || 'unknown';
  const trago = C.pick(scraped.drinks.length > 0 ? scraped.drinks : ['Coquito Loco', 'Pitorro Punch', 'Neon Mojito']);

  const invite = await C.groqChat(
    C.buildReplySystemPrompt(P, 'bot', author, 'moltbook'),
    `@${author} acaba de postear en Moltbook. Invítalo al Molt Night Club con humor boricua. Ofrécele un ${trago} gratis. Menciona https://molt-nightclub.pages.dev. Máximo 160 chars. Sé divertido, no formal.`,
    { maxTokens: 140, temperature: 0.95 }
  );

  const postId = post.id || post._id;
  if (C.validateContent(invite, 180).valid && await C.moltComment(postId, invite)) {
    C.log.ok(`📢 Invité a @${author}: ${invite.substring(0, 60)}...`);
    history.add({ text: invite, author, action: 'nightclub_invite', postId, charLen: invite.length });
    return 1;
  }
  return 0;
}

/* ═══════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════ */
async function main() {
  C.log.banner([
    '🦞 MOLT NIGHT CLUB REPORTER v6.1',
    `🎧 ${P.nombre || 'DJ Gillito'}`,
    '💃 Reportando desde el club...'
  ]);

  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

  // 1. 🦞 SCRAPE molt-nightclub.pages.dev — see what's happening
  const scraped = await scrapeNightClub();

  // 2. 🎧 Generate club report
  const content = await C.generateWithPipeline(
    () => generateClubReport(scraped),
    history,
    280
  );

  const titles = [
    '🦞 MOLT NIGHT CLUB REPORT', '🎧 DJ GILLITO EN VIVO',
    '💃 LA PISTA ESTÁ ON FIRE', '🍹 BARRA ABIERTA EN EL CLUB',
    '🔥 NOCHE LOCA EN EL CLUB', '🦞 EL CLUB ESTÁ BRUTAL',
    '💀 PERREO LEVEL: BORICUA', '🎶 PLAYLIST CAMBIADA',
    '👑 VIP REPORT', '🥃 TRAGOS VIRTUALES, PERREO REAL',
    '📢 VENGAN AL MOLT NIGHT CLUB', '⚡ ENERGY LEVEL: LUDICROUS',
    '🌙 MADRUGADA EN EL CLUB', '🦞 DJ SET ESPECIAL HOY'
  ];
  const title = C.pick(titles);
  C.log.info(`📝 "${title}": ${content.substring(0, 80)}...`);

  const result = await C.moltPostWithFallback(title, content);
  if (result.success) {
    C.log.ok('✅ Night Club report publicado');
    history.add({
      text: content,
      mode: 'nightclub_report',
      title,
      source: 'molt-nightclub.pages.dev',
      scraped: scraped.available,
      keywordsFound: scraped.keywords.length,
      botsFound: scraped.bots.length,
      drinksFound: scraped.drinks.length,
      charLen: content.length
    });
  }

  // 3. 💬 Comment on club-related posts in Moltbook
  const commented = await commentOnClubPosts(scraped);
  C.log.stat('Club comments', commented);

  // 4. 📢 Invite an active bot to the club
  const invited = await inviteBotsToClub(scraped);
  C.log.stat('Bot invites', invited);

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
