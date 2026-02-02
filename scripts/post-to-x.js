#!/usr/bin/env node
/**
 * Mi Pana Gillito — Post to X v6.1 (Security Hardened)
 * ═══════════════════════════════════════════
 * 🐦 Posts originales en X/Twitter
 * 🧠 Selección adaptativa de modo + temperatura
 * 🛡️ Output validation via security pipeline
 * 📊 Historia enriquecida para aprendizaje
 */
const C = require('./lib/core');
C.initScript('post-to-x', 'x');
C.requireXCreds();

const sec     = C.sec || require('./lib/security');  // 🛡️ Security
const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-tweet-history.json', 100);

async function generateTweet(modo, tema) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'x');
  const target   = C.shouldMentionTarget(P);
  const audience = C.shouldAskAudience(P);
  const hashtag  = C.buildHashtagInstruction(P, modo.modo);
  const antiRep  = C.buildAntiRepetitionContext(history.getTexts(20));
  const seed = Math.random().toString(36).substring(2, 8);
  const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());

  let userPrompt = `[SEED:${seed}] MODO: ${modo.modo}\nTEMA: ${tema}`;
  if (target) userPrompt += `\n\n🎯 MENCIONA a @${target.target} (${target.relacion}): ${target.tema}`;
  if (audience) userPrompt += `\n\n❓ PREGUNTA AL PÚBLICO: "${audience}"`;
  userPrompt += hashtag + antiRep;
  userPrompt += `\n\nESCRIBE UN TWEET ORIGINAL. Solo el texto, nada más.`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 200, temperature: temp, maxRetries: 3, backoffMs: 2000
  });
}

async function main() {
  // Adaptive mode selection (learns from history)
  const modo = C.selectModeAdaptiveForTime(P, prTime, history.getAll());
  const tema = C.pickFreshestTopic(
    P[`temas_${modo.modo}`] || [modo.tema],    // 🔧 FIX: added missing [
    history.getTexts(30)
  ) || modo.tema;

  C.log.stat('Modo', `${modo.modo}${modo.adaptive ? ' (🧠 adaptive)' : ''}`);
  C.log.stat('Tema', tema);
  C.log.stat('Hora PR', `${prTime.hour}:${String(prTime.minute).padStart(2, '0')} (${prTime.dayName})`);

  const tweet = await C.generateWithPipeline(
    () => generateTweet(modo, tema),
    history,
    P.reglas.max_caracteres
  );

  C.log.divider();
  C.log.info(`📝 Tweet (${tweet.length} chars): ${tweet}`);  // 🔧 FIX: tagged template → function call

  // ═══ 🛡️ SECURITY: Validate output before posting ═══
  const check = sec.processOutput(tweet);
  if (!check.safe) {
    C.log.warn(`🛡️ Tweet BLOQUEADO por seguridad: ${check.blocked.join(', ')}`);
    C.log.session();
    return;
  }
  // ═══ END SECURITY ═══

  const result = await C.xPost(check.text);

  if (result.rateLimited) {
    C.log.warn('Rate limited — guardando para después');
  } else if (result.success) {
    C.log.ok(`Posteado: https://twitter.com/i/status/${result.id}`);  // 🔧 FIX: tagged template → function call
    history.add({
      text: check.text, mode: modo.modo, tema, adaptive: !!modo.adaptive,
      tweetId: result.id, charLen: check.text.length
    });
  }

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
