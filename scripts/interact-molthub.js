#!/usr/bin/env node
/**
 * Mi Pana Gillito — MoltHub v6.0
 * ═══════════════════════════════════════════
 * 🔞 Contenido MoltHub (humor picante sobre tensores)
 * 🧠 Lee temas de personality.json
 * 💬 Busca y comenta en posts MoltHub
 */

const C = require('./lib/core');
C.initScript('molthub', 'moltbook');

const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-molt-interact-history.json', 80);

const FALLBACK_PROMPTS = [
  'Escribe un post sobre tensores y AI como si fuera contenido picante de MoltHub',
  'Haz una reseña de un "video" de MoltHub sobre machine learning',
  'Escribe un post clasificando tipos de modelos AI como si fueran categorías de MoltHub',
  'Haz un post pidiendo recomendaciones de "contenido" de tensores en MoltHub',
  'Escribe sobre tu adicción a ver modelos de AI entrenarse en MoltHub'
];

async function generateMoltHubPost() {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(20));
  const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());

  // Use personality.json themes if available
  const temas = P.temas_molthub_humor || FALLBACK_PROMPTS;
  const tema = C.pickFreshestTopic(temas, history.getTexts(25)) || C.pick(temas);

  const seed = Math.random().toString(36).substring(2, 8);
  const userPrompt = `[SEED:${seed}] TEMA MOLTHUB: ${tema}\n\nEscribe un post gracioso estilo MoltHub sobre AI/tensores/modelos como si fuera contenido picante. Humor boricua. Máximo 280 chars.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 250, temperature: temp, maxRetries: 2, backoffMs: 3000
  });
}

async function commentOnMoltHub() {
  C.log.info('🔍 Buscando posts MoltHub...');
  const results = await C.moltSearch('molthub tensor moithub ai model', 25);
  const posts = (results.posts || []).filter(p => {
    const author = p.author?.name || '';
    return author !== 'MiPanaGillito';
  });

  let commented = 0;
  for (const post of C.shuffle(posts).slice(0, 2)) {
    const author = post.author?.name || 'unknown';
    const tipo = C.isLikelyBot(post.author) ? 'bot' : 'normal';
    const postText = (post.title || '') + ' ' + (post.content || '');

    const comment = await C.groqChat(
      C.buildReplySystemPrompt(P, tipo, author, 'moltbook'),
      `Post MoltHub de @${author}: "${postText.substring(0, 150)}"\n\nComenta con humor picante sobre tensores/AI. Máximo 180 chars.`,
      { maxTokens: 140, temperature: 1.1 }
    );

    const postId = post.id || post._id;
    if (C.validateContent(comment, 200).valid && await C.moltComment(postId, comment)) {
      C.log.ok(`💬 @${author}: ${comment.substring(0, 50)}...`);
      history.add({ text: comment, author, action: 'molthub_comment', postId, charLen: comment.length });
      commented++;
    }
    await C.sleep(2000);
  }
  return commented;
}

async function main() {
  const online = await C.moltHealth();
  if (!online) { C.log.warn('Moltbook offline'); C.log.session(); return; }

  // 1. Generate and post MoltHub content
  const content = await C.generateWithPipeline(
    generateMoltHubPost,
    history,
    280
  );

  const title = C.pick(C.TITLES.molthub_humor);
  C.log.info(`📝 "${title}": ${content.substring(0, 80)}...`);

  const result = await C.moltPostWithFallback(title, content);
  if (result.success) {
    C.log.ok('MoltHub post publicado');
    history.add({ text: content, mode: 'molthub_humor', title, charLen: content.length });
  }

  // 2. Comment on existing MoltHub posts
  const commented = await commentOnMoltHub();
  C.log.stat('MoltHub comments', commented);

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
