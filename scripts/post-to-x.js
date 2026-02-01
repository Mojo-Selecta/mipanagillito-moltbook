#!/usr/bin/env node
/**
 * Mi Pana Gillito — X (Twitter) Poster v5.0
 * ═══════════════════════════════════════════
 * 🧠 Cerebro completo desde personality.json
 * 📋 Memoria anti-repetición con Jaccard similarity
 * 🔄 Groq retry con exponential backoff
 * 🛡️ Content pipeline: generate → validate → dedup → post
 * 🔥 EL TROLL SUPREMO DE PR
 */

const C = require('./lib/core');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-tweet-history.json', 100);

C.requireXCreds();

async function generateTweet() {
  const prTime   = C.getPRTime();
  let { modo, tema } = C.selectModeForTime(P, prTime);

  // ¿Mencionar target?
  const target = C.shouldMentionTarget(P);
  let targetCtx = '';
  if (target) {
    modo = `🎯 trolleo → @${target.target}`;
    tema = target.tema;
    targetCtx = `\n\n🎯 INCLUYE mención a @${target.target}. Relación: ${target.relacion}. Tema: ${tema}. Provocador con cariño.`;
  }

  // ¿Pregunta al público?
  const audience = !target ? C.shouldAskAudience(P) : null;
  const audienceCtx = audience ? `\n\n❓ Termina con pregunta al público: "${audience}"` : '';

  // Hashtag
  const hashtagCtx = C.buildHashtagInstruction(P, modo);

  // Anti-repetición
  const noRepeatCtx = C.buildAntiRepetitionContext(history.getTexts(20));

  C.log.stat('Hora PR', `${prTime.hour}:00 ${prTime.dayName}`);
  C.log.stat('Modo', modo);
  C.log.stat('Tema', tema);

  const seed = Math.floor(Math.random() * 99999);
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'x');
  const userPrompt = `Genera UN tweet de: ${tema}\n\nMÁXIMO 270 caracteres. Sé EXPLOSIVO y ÚNICO (seed: ${seed}).${targetCtx}${audienceCtx}${hashtagCtx}${noRepeatCtx}\n\nSolo el texto del tweet. Sin comillas ni explicaciones.`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 150,
    temperature: P.temperatura
  });
}

async function main() {
  C.log.banner([
    '🔥 MI PANA GILLITO — X POST v5.0 🇵🇷',
    `🧠 ${P.version}`
  ]);

  try {
    // Pipeline: generate → validate → dedup
    const tweet = await C.generateWithPipeline(generateTweet, history, 280, 3);
    console.log(`\n💬 Tweet (${tweet.length} chars):\n${tweet}\n`);

    // Post
    console.log('🐦 Posteando a X...');
    const result = await C.xPost(tweet);

    if (result.rateLimited) {
      history.save();
      process.exit(0);
    }

    C.log.ok('¡GILLITO HABLÓ EN X!');
    console.log(`🔗 https://x.com/i/status/${result.id}`);

    history.add({ text: tweet, id: result.id, timestamp: new Date().toISOString() });
    history.save();

    console.log(`\n🦞 ${P.despedida_real} 🔥\n`);

  } catch (err) {
    history.save();
    C.log.error(err.message);
    process.exit(1);
  }
}

main();
