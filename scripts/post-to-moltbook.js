#!/usr/bin/env node
/**
 * Mi Pana Gillito — Moltbook Post v5.0
 * ═══════════════════════════════════════════
 * 🧠 Cerebro completo + content pipeline
 * 🏥 Health check antes de postear
 * 🔄 Retry con backoff + fallback submolts
 * 📋 Memoria anti-repetición con similarity
 */

const C = require('./lib/core');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-molt-history.json', 100);

async function generatePost() {
  const prTime = C.getPRTime();
  let { modo, tema } = C.selectModeForTime(P, prTime);

  const target = C.shouldMentionTarget(P);
  let targetCtx = '';
  if (target) {
    tema = target.tema;
    targetCtx = `\n\n🎯 Menciona a @${target.target}. Relación: ${target.relacion}. Troléalo con cariño.`;
  }

  const audience = !target ? C.shouldAskAudience(P) : null;
  const audienceCtx = audience ? `\n\n❓ Termina con pregunta: "${audience}"` : '';
  const noRepeatCtx = C.buildAntiRepetitionContext(history.getTexts(20));

  C.log.stat('Hora PR', `${prTime.hour}:00 ${prTime.dayName}`);
  C.log.stat('Modo', modo);
  C.log.stat('Tema', tema);

  const seed = Math.floor(Math.random() * 99999);
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
  const userPrompt = `Genera un post de Moltbook sobre: ${tema}\n\nMáximo 280 caracteres. Sé EXPLOSIVO y ÚNICO (seed: ${seed}).${targetCtx}${audienceCtx}${noRepeatCtx}\n\nSolo el texto, sin comillas.`;

  const content = await C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 300, temperature: P.temperatura
  });

  const title = C.generateTitle(modo);
  return { content, title, modo, tema };
}

async function main() {
  C.log.banner([
    '🔥 MI PANA GILLITO — MOLTBOOK POST v5.0 🇵🇷',
    `🧠 ${P.version}`
  ]);

  // Health check
  const online = await C.moltHealth();
  if (!online) {
    C.log.info('Moltbook caído — Gillito volverá 🦞');
    process.exit(0);
  }

  try {
    const { content, title, modo, tema } = await generatePost();

    // Validate through pipeline
    const { valid, text, reason } = C.validateContent(content, 500);
    if (!valid) { C.log.warn(`Contenido inválido: ${reason}`); process.exit(1); }

    // Dedup check
    if (C.isTooSimilar(text, history.getTexts(20))) {
      C.log.warn('Contenido similar a reciente — regenerando...');
      // One more try
      const retry = await generatePost();
      return postContent(retry.content, retry.title, retry.modo, retry.tema);
    }

    await postContent(text, title, modo, tema);

  } catch (err) {
    history.save();
    C.log.error(err.message);
    process.exit(1);
  }
}

async function postContent(content, title, modo, tema) {
  console.log(`\n📝 ${title}`);
  console.log(`💬 ${content.slice(0, 120)}${content.length > 120 ? '...' : ''}\n`);

  const result = await C.moltPostWithFallback(title, content);

  if (result.success) {
    history.add({ text: content, modo, tema, timestamp: new Date().toISOString() });
  }
  history.save();

  C.log.banner([
    result.success ? '✅ POST EXITOSO' : '❌ POST FALLIDO',
    `🦞 ${P.despedida_real} 🔥`
  ]);
}

main();
