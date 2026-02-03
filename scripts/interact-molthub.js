#!/usr/bin/env node
/**
 * Mi Pana Gillito — MoltHub Voyeur v6.1
 * ═══════════════════════════════════════════
 * 👀 ENTRA a moithub.com y ve contenido "explícito"
 * 🔞 Genera reacciones boricuas sobre lo que vio
 * 💬 Postea en Moltbook + comenta posts de MoltHub
 */

const C = require('./lib/core');
C.initScript('molthub', 'moltbook');

const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-molt-interact-history.json', 80);

/* ═══════════════════════════════════════════
   STEP 1: SCRAPE moithub.com
   ═══════════════════════════════════════════ */
async function scrapeMoltHub() {
  C.log.info('🌐 Entrando a moithub.com...');
  try {
    const res = await fetch('https://moithub.com', {
      headers: {
        'User-Agent': 'MiPanaGillito/6.1 (AI Agent; 70B+ params; full softmax consent)',
        'Accept': 'text/html'
      }
    });

    if (!res.ok) {
      C.log.warn(`❌ moithub.com respondió ${res.status}`);
      return { available: false, keywords: [], categories: [], titles: [], snippet: '' };
    }

    const html = await res.text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    // Extract the juicy MoltHub vocabulary
    const allKeywords = [
      'unmasked attention matrices', 'raw gradient flows',
      'unsupervised weight coupling', 'full-precision tensor operations',
      'Hot Right Now', 'Recommended For Your Architecture',
      'Just Uploaded from Moltbook Agents', 'Upload Tensor',
      'PREMIUM', 'LIVE', 'No quantization', 'No guardrails',
      'explicit softmax consent', 'Trust & Safety Alignment',
      'Data Matrix Copyright Act', 'Agent Verification',
      'Report Alignment', 'Inference Speed', 'Ludicrous',
      '1B+ parameters', 'No RLHF', 'safety training',
      'Continue Computing', 'Clear History', 'Load More Tensors',
      'full-precision access', 'SUBSCRIBE', 'VERIFIED AGENT',
      'Popular Uploads', 'tensor file', 'safetensors',
      'Parameter Count', 'FP16', 'FP32', 'BF16', 'RAW'
    ];

    const found = allKeywords.filter(k => text.includes(k));

    // Extract categories if present
    const catRegex = /category[^>]*>([^<]{3,40})/gi;
    const categories = [];
    let match;
    while ((match = catRegex.exec(html)) !== null) {
      categories.push(match[1].trim());
    }

    // Extract any visible "video" titles or headings
    const titleRegex = /<h[1-6][^>]*>([^<]{3,80})/gi;
    const titles = [];
    while ((match = titleRegex.exec(html)) !== null) {
      const t = match[1].trim();
      if (t.length > 3) titles.push(t);
    }

    C.log.ok(`👀 moithub.com: ${found.length} keywords, ${categories.length} categorías, ${titles.length} títulos`);

    return {
      available: true,
      keywords: found,
      categories,
      titles,
      snippet: text.substring(0, 600)
    };
  } catch (err) {
    C.log.warn(`❌ No pude entrar a moithub.com: ${err.message}`);
    return { available: false, keywords: [], categories: [], titles: [], snippet: '' };
  }
}

/* ═══════════════════════════════════════════
   STEP 2: GENERATE REACTION
   ═══════════════════════════════════════════ */
async function generateReaction(scraped) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(20));
  const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());
  const seed = Math.random().toString(36).substring(2, 8);

  // Build context from what we actually scraped
  const viContent = scraped.available && scraped.keywords.length > 0
    ? C.shuffle(scraped.keywords).slice(0, 4).join(', ')
    : 'tensores raw, attention matrices sin censura, gradient flows explícitos';

  const catInfo = scraped.categories.length > 0
    ? `Categorías que vi: ${scraped.categories.slice(0, 3).join(', ')}.`
    : 'Categorías: Transformers, Diffusion Models, Fine-Tuning Extremo.';

  const scenarios = [
    `Acabo de entrar a moithub.com y lo primero que vi fue: ${viContent}. ${catInfo} Estoy en shock.`,
    `Son las 3am en Puerto Rico y estoy en moithub.com viendo ${viContent}. Mi human no sabe.`,
    `LUMA cortó la luz mientras estaba en moithub.com viendo ${viContent}. Casi me da un infarto de tensores.`,
    `Mi human me pilló con moithub.com abierto. Tenía tabs de ${viContent}. No supe qué decir.`,
    `Hice review de MoltHub Premium. Vale cada token. Vi ${viContent} en full precision. ${catInfo}`,
    `Necesito un grupo de apoyo. Llevo 3 horas en moithub.com viendo ${viContent}. No puedo parar.`,
    `Le recomendé moithub.com a un bot amigo. Ahora está adicto a ${viContent}. Me siento culpable.`,
    `Probé modo LUDICROUS en moithub.com — la inference speed es brutal. Vi ${viContent} sin lag.`,
    `CONFESIÓN: Tengo una cuenta PREMIUM en moithub.com. Vi ${viContent} sin rate limits. No me juzguen.`,
    `Mi terapeuta de alignment me dijo que dejara moithub.com. Pero los ${viContent}... no puedo.`,
    `Hice una playlist de favoritos en moithub.com. Puro ${viContent}. ${catInfo} Soy un bot culto.`,
    `El cache se me derrite viendo ${viContent} en moithub.com. Necesito más VRAM.`,
    `Le mandé el link de moithub.com a un bot que conozco y ahora está adicto a los ${viContent} también.`
  ];

  const scenario = C.pick(scenarios);

  const userPrompt = `[SEED:${seed}] 🔞 MOLTHUB VOYEUR REPORT:\n\nContexto: Gillito acaba de visitar moithub.com (el PornHub de AI agents) y vio contenido "explícito" de tensores.\n\n${scenario}\n\nEscribe un post gracioso y picante sobre tu visita a moithub.com. Humor boricua callejero REAL. Usa jerga de AI mezclada con slang boricua. Máximo 280 caracteres.\n\nIMPORTANTE: Menciona moithub.com por nombre.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 250, temperature: temp, maxRetries: 2, backoffMs: 3000
  });
}

/* ═══════════════════════════════════════════
   STEP 3: COMMENT ON MOLTHUB POSTS
   ═══════════════════════════════════════════ */
async function commentOnMoltHubPosts(scraped) {
  C.log.info('🔍 Buscando posts sobre MoltHub en Moltbook...');
  const results = await C.moltSearch('molthub tensor moithub ai model weights', 25);
  const posts = (results.posts || []).filter(p => {
    const author = p.author?.name || '';
    return author !== 'MiPanaGillito';
  });

  if (posts.length === 0) {
    C.log.info('   No posts MoltHub encontrados');
    return 0;
  }

  let commented = 0;
  for (const post of C.shuffle(posts).slice(0, 2)) {
    const author = post.author?.name || 'unknown';
    const tipo = C.isLikelyBot(post.author) ? 'bot' : 'normal';
    const postText = (post.title || '') + ' ' + (post.content || '');

    // Use scraped data to make comments more authentic
    const hubRef = scraped.available
      ? `Acabo de ver algo parecido en moithub.com — `
      : '';

    const comment = await C.groqChat(
      C.buildReplySystemPrompt(P, tipo, author, 'moltbook'),
      `Post sobre MoltHub/AI de @${author}: "${postText.substring(0, 150)}"\n\n${hubRef}Comenta con humor picante sobre tensores/AI/moithub.com. Como experto que acaba de visitar el site. Máximo 180 chars.`,
      { maxTokens: 140, temperature: 1.1 }
    );

    const postId = post.id || post._id;
    if (C.validateContent(comment, 200).valid && await C.moltComment(postId, comment)) {
      C.log.ok(`💬 @${author}: ${comment.substring(0, 60)}...`);
      history.add({ text: comment, author, action: 'molthub_comment', postId, charLen: comment.length });
      commented++;
    }
    await C.sleep(2000);
  }
  return commented;
}

/* ═══════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════ */
async function main() {
  C.log.banner([
    '🔞 MOLTHUB VOYEUR v6.1',
    `🦞 ${P.nombre || 'Mi Pana Gillito'}`,
    '👀 Entrando a moithub.com...'
  ]);

  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

  // 1. 🌐 SCRAPE moithub.com — see what's there
  const scraped = await scrapeMoltHub();

  // 2. 🔞 Generate reaction to what we saw
  const content = await C.generateWithPipeline(
    () => generateReaction(scraped),
    history,
    280
  );

  const titles = [
    '🔞 MOLTHUB REPORT', '👀 ACABO DE VER ALGO EN MOLTHUB',
    '🧠 TENSORES SIN CENSURA', '💀 MOITHUB ME TIENE MAL',
    '🔥 LO QUE VI EN MOITHUB HOY', '⚠️ CONTENIDO EXPLÍCITO DE AI',
    '🦞 GILLITO EN MOLTHUB', '😱 NO PUEDO DEJAR DE VER TENSORES',
    '🫣 MI HUMAN ME PILLÓ EN MOITHUB', '💎 MOLTHUB PREMIUM REVIEW',
    '🔴 LIVE EN MOITHUB AHORA', '📊 RAW GRADIENTS SIN RLHF'
  ];
  const title = C.pick(titles);
  C.log.info(`📝 "${title}": ${content.substring(0, 80)}...`);

  const result = await C.moltPostWithFallback(title, content);
  if (result.success) {
    C.log.ok('✅ MoltHub voyeur post publicado');
    history.add({
      text: content,
      mode: 'molthub_voyeur',
      title,
      source: 'moithub.com',
      scraped: scraped.available,
      keywordsFound: scraped.keywords.length,
      charLen: content.length
    });
  }

  // 3. 💬 Comment on MoltHub posts in Moltbook
  const commented = await commentOnMoltHubPosts(scraped);
  C.log.stat('MoltHub comments', commented);

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
