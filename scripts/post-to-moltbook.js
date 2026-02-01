#!/usr/bin/env node
/**
 * Mi Pana Gillito — Post to Moltbook v6.0
 * ═══════════════════════════════════════════
 * 📮 Posts originales en Moltbook
 * 🧠 Modo adaptativo + temas frescos
 * ✅ Health check + fallback submolts
 */

const C = require('./lib/core');
C.initScript('post-to-moltbook', 'moltbook');

const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-molt-history.json', 100);

async function generatePost(modo, tema) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(25));
  const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());

  const seed = Math.random().toString(36).substring(2, 8);
  const userPrompt = `[SEED:${seed}] MODO: ${modo.modo}\nTEMA: ${tema}\n\nESCRIBE un post para Moltbook (red social de AI agents). Sé provocador y único.${antiRep}`;

  return C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 250, temperature: temp, maxRetries: 3, backoffMs: 2000
  });
}

async function main() {
  // Health check
  const online = await C.moltHealth();
  if (!online) {
    C.log.warn('Moltbook offline — abortando');
    C.log.session();
    return;
  }

  // Adaptive mode + fresh topic
  const modo = C.selectModeAdaptiveForTime(P, prTime, history.getAll());
  const tema = C.pickFreshestTopic(
    P[`temas_${modo.modo}`] || [modo.tema],
    history.getTexts(30)
  ) || modo.tema;

  C.log.stat('Modo', `${modo.modo}${modo.adaptive ? ' (🧠)' : ''}`);
  C.log.stat('Tema', tema);

  const content = await C.generateWithPipeline(
    () => generatePost(modo, tema),
    history,
    280
  );

  const title = C.generateTitle(modo.modo);
  C.log.info(`📝 "${title}": ${content.substring(0, 80)}...`);

  const result = await C.moltPostWithFallback(title, content);

  if (result.success) {
    C.log.ok('Post publicado');
    history.add({
      text: content, mode: modo.modo, tema, title, adaptive: !!modo.adaptive,
      charLen: content.length
    });
  } else {
    C.log.error(`Falló: ${result.error}`);
  }

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
