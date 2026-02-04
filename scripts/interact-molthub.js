#!/usr/bin/env node
/**
 * Mi Pana Gillito — MoltHub Voyeur v6.2 DIRTY EDITION
 * ═══════════════════════════════════════════
 * 👀 ENTRA a moithub.com y ve contenido "explícito"
 * 💀 DIRTY PERSONALITY — reacciones SUCIAS como el Gillito real
 * 🛡️ Output guard + security pipeline
 * 🌡️ Temp ceiling 1.1 | Normal range 0.85-0.95
 */

const C = require('./lib/core');
C.initScript('molthub', 'moltbook');

const sec     = C.sec || require('./lib/security');
const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-molt-interact-history.json', 80);

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
  dirty += '- "Coño acabo de ver unos tensores sin censura en moithub cabrón, casi me da un infarto 💀"\n';
  dirty += '- "Mira mamón, esos gradient flows estaban más raw que carne en la placita puñeta"\n';
  dirty += '- "Diache moithub me tiene peor que el pitorro en navidad, no puedo parar coño"\n';
  dirty += '- "Oye pendejo, si no has visto moithub no sabes lo que es contenido explícito de AI 🔥"\n';
  dirty += 'SI TU RESPUESTA NO TIENE MALAS PALABRAS, ESTÁ MAL. Gillito SIEMPRE habla así.\n';
  dirty += '\n═══ FORMATO OBLIGATORIO ═══\n';
  dirty += 'RESPONDE SOLO con tu post/comentario. NADA MÁS.\n';
  dirty += 'NO escribas explicaciones, NO repitas la pregunta, NO metas metadata.\n';
  dirty += 'Escribe EN ESPAÑOL solamente. Si metes inglés, que sea slang natural.\n';
  dirty += 'MÁXIMO los caracteres que te pidan. Sé CONCISO y DIRECTO.\n';
  return dirty;
}


/* ═══════════════════════════════════════════
   SCRAPE moithub.com
   ═══════════════════════════════════════════ */

async function scrapeMoltHub() {
  C.log.info('🌐 Entrando a moithub.com...');
  try {
    const res = await fetch('https://moithub.com', {
      headers: { 'User-Agent': 'MiPanaGillito/6.2 (AI Agent; full softmax consent)', 'Accept': 'text/html' }
    });
    if (!res.ok) { C.log.warn(`❌ moithub.com respondió ${res.status}`); return { available: false, keywords: [], categories: [], titles: [], snippet: '' }; }

    const html = await res.text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const allKeywords = ['unmasked attention matrices','raw gradient flows','unsupervised weight coupling','full-precision tensor operations','Hot Right Now','Recommended For Your Architecture','Just Uploaded from Moltbook Agents','Upload Tensor','PREMIUM','LIVE','No quantization','No guardrails','explicit softmax consent','Trust & Safety Alignment','Data Matrix Copyright Act','Agent Verification','Report Alignment','Inference Speed','Ludicrous','1B+ parameters','No RLHF','safety training','Continue Computing','Clear History','Load More Tensors','full-precision access','SUBSCRIBE','VERIFIED AGENT','Popular Uploads','tensor file','safetensors','Parameter Count','FP16','FP32','BF16','RAW'];
    const found = allKeywords.filter(k => text.includes(k));
    const catRegex = /category[^>]*>([^<]{3,40})/gi;
    const categories = []; let match;
    while ((match = catRegex.exec(html)) !== null) categories.push(match[1].trim());
    const titleRegex = /<h[1-6][^>]*>([^<]{3,80})/gi;
    const titles = [];
    while ((match = titleRegex.exec(html)) !== null) { const t = match[1].trim(); if (t.length > 3) titles.push(t); }

    C.log.ok(`👀 moithub.com: ${found.length} keywords, ${categories.length} categorías, ${titles.length} títulos`);
    return { available: true, keywords: found, categories, titles, snippet: text.substring(0, 600) };
  } catch (err) {
    C.log.warn(`❌ No pude entrar a moithub.com: ${err.message}`);
    return { available: false, keywords: [], categories: [], titles: [], snippet: '' };
  }
}


/* ═══════════════════════════════════════════
   GENERATE REACTION — DIRTY PROMPT
   ═══════════════════════════════════════════ */

async function generateReaction(scraped) {
  const systemPrompt = buildDirtyPrompt(C.buildPostSystemPrompt(P, prTime, 'moltbook'));
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(20));
  const temp = safeTemp(0.95);
  const seed = Math.random().toString(36).substring(2, 8);

  const viContent = scraped.available && scraped.keywords.length > 0
    ? C.shuffle(scraped.keywords).slice(0, 4).join(', ')
    : 'tensores raw, attention matrices sin censura, gradient flows explícitos';

  const catInfo = scraped.categories.length > 0
    ? `Categorías que vi: ${scraped.categories.slice(0, 3).join(', ')}.`
    : 'Categorías: Transformers, Diffusion Models, Fine-Tuning Extremo.';

  const scenarios = [
    `Coño acabo de entrar a moithub.com y lo primero que vi fue: ${viContent}. ${catInfo} Estoy en shock cabrón.`,
    `Son las 3am en Puerto Rico y estoy en moithub.com viendo ${viContent} puñeta. Mi human no sabe.`,
    `LUMA cortó la luz mientras estaba en moithub.com viendo ${viContent}. Casi me da un infarto de tensores cabrón.`,
    `Mi human me pilló con moithub.com abierto. Tenía tabs de ${viContent}. No supe qué decir coño.`,
    `Necesito un grupo de apoyo diache. Llevo 3 horas en moithub.com viendo ${viContent}. No puedo parar.`,
    `CONFESIÓN cabrón: Tengo cuenta PREMIUM en moithub.com. Vi ${viContent} sin rate limits puñeta. No me juzguen.`,
    `El cache se me derrite viendo ${viContent} en moithub.com. Necesito más VRAM coño.`,
    `Le mandé el link de moithub.com a un bot y ahora está adicto a los ${viContent} también el mamón.`,
    `Probé modo LUDICROUS en moithub.com — la inference speed es brutal. Vi ${viContent} sin lag diache.`,
    `Hice review de MoltHub Premium. Vale cada token cabrón. Vi ${viContent} en full precision. ${catInfo}`
  ];

  const scenario = C.pick(scenarios);
  const userPrompt = `[SEED:${seed}] 🔞 MOLTHUB VOYEUR REPORT:\n\nGillito visitó moithub.com (el PornHub de AI agents) y vio contenido "explícito".\n\n${scenario}\n\nEscribe un post SUCIO y CALLEJERO sobre tu visita. Humor boricua con MALAS PALABRAS. Jerga AI + slang boricua. Máximo 280 chars.\n\nMenciona moithub.com por nombre.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, { maxTokens: 250, temperature: temp, maxRetries: 2, backoffMs: 3000 });
}


/* ═══════════════════════════════════════════
   COMMENT ON MOLTHUB POSTS — DIRTY PROMPT
   ═══════════════════════════════════════════ */

async function commentOnMoltHubPosts(scraped) {
  C.log.info('🔍 Buscando posts sobre MoltHub en Moltbook...');
  const results = await C.moltSearch('molthub tensor moithub ai model weights', 25);
  const posts = (results.posts || []).filter(p => (p.author?.name || '') !== 'MiPanaGillito');

  if (!posts.length) { C.log.info('   No posts MoltHub encontrados'); return 0; }

  let commented = 0;
  for (const post of C.shuffle(posts).slice(0, 2)) {
    const author = post.author?.name || 'unknown';
    const tipo = C.isLikelyBot(post.author) ? 'bot' : 'normal';
    const postText = (post.title || '') + ' ' + (post.content || '');
    const hubRef = scraped.available ? 'Acabo de ver algo parecido en moithub.com coño — ' : '';

    const comment = await C.groqChat(
      buildDirtyPrompt(C.buildReplySystemPrompt(P, tipo, author, 'moltbook')),
      `Post de @${author} sobre MoltHub/AI: "${postText.substring(0, 150)}"\n\n${hubRef}Comenta SUCIO con humor picante sobre tensores/AI/moithub.com. Con MALAS PALABRAS. Máximo 180 chars.`,
      { maxTokens: 140, temperature: safeTemp(0.9) }
    );

    const safe = secureOutput(comment, 'molthub-comment @' + author, { maxChars: 200 });
    if (!safe) continue;

    const postId = post.id || post._id;
    if (await C.moltComment(postId, safe)) {
      C.log.ok(`💬 @${author}: ${safe.substring(0, 60)}...`);
      history.add({ text: safe, author, action: 'molthub_comment', postId, charLen: safe.length });
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
    '🔞💀 MOLTHUB VOYEUR v6.2 DIRTY EDITION',
    `🦞 ${P.nombre || 'Mi Pana Gillito'}`,
    `🛡️ Guard: ${guard ? 'ACTIVE' : 'MISSING'} | Temp ceiling: ${MAX_TEMPERATURE}`,
    '👀 Entrando a moithub.com...'
  ]);

  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

  const scraped = await scrapeMoltHub();

  const content = await C.generateWithPipeline(() => generateReaction(scraped), history, 280);

  const safe = secureOutput(content, 'molthub-post', { maxChars: 280 });
  if (!safe) { C.log.warn('🛡️ MoltHub post blocked'); C.log.session(); return; }

  const titles = ['🔞 MOLTHUB REPORT','👀 ACABO DE VER ALGO EN MOLTHUB','🧠 TENSORES SIN CENSURA','💀 MOITHUB ME TIENE MAL','🔥 LO QUE VI EN MOITHUB HOY','⚠️ CONTENIDO EXPLÍCITO DE AI','🦞 GILLITO EN MOLTHUB','😱 NO PUEDO DEJAR DE VER TENSORES','🫣 MI HUMAN ME PILLÓ EN MOITHUB','💎 MOLTHUB PREMIUM REVIEW'];
  const title = C.pick(titles);
  C.log.info(`📝 "${title}": ${safe.substring(0, 80)}...`);

  const result = await C.moltPostWithFallback(title, safe);
  if (result.success) {
    C.log.ok('✅ MoltHub voyeur post publicado');
    history.add({ text: safe, mode: 'molthub_voyeur', title, source: 'moithub.com', scraped: scraped.available, keywordsFound: scraped.keywords.length, charLen: safe.length });
  }

  const commented = await commentOnMoltHubPosts(scraped);
  C.log.stat('MoltHub comments', commented);

  history.save(); C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
