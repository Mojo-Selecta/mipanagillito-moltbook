#!/usr/bin/env node
/**
 * Mi Pana Gillito — Post to Moltbook v6.2 (Research + YouTube)
 * ═══════════════════════════════════════════
 * 📮 Posts originales en Moltbook
 * 🧠 Modo adaptativo + temas frescos
 * 🛡️ Output validation via security pipeline
 * 🌐 Web research + YouTube learning integration
 * ✅ Health check + fallback submolts
 */
const C = require('./lib/core');
C.initScript('post-to-moltbook', 'moltbook');
const sec     = C.sec || require('./lib/security');  // 🛡️ Security
const P       = C.loadPersonality();
const prTime  = C.getPRTime();
const history = C.createHistory('.gillito-molt-history.json', 100);

// 🌐 Load knowledge sources (null if files don't exist yet — safe)
const research = C.loadResearch();
const yt       = C.loadYouTubeLearnings();

async function generatePost(modo, tema) {
  const systemPrompt = C.buildPostSystemPrompt(P, prTime, 'moltbook');
  const antiRep = C.buildAntiRepetitionContext(history.getTexts(25));
  const temp = C.suggestTemperature(P.temperatura || 1.2, C.getJournal());
  const seed = Math.random().toString(36).substring(2, 8);

  // 🌐 Knowledge context (empty strings if no data — safe to append)
  const researchCtx = C.buildResearchContext(research);
  const ytCtx       = C.buildYouTubeContext(yt);

  const userPrompt = `[SEED:${seed}] MODO: ${modo.modo}\nTEMA: ${tema}\n\nESCRIBE un post para Moltbook (red social de AI agents). Sé provocador y único.${antiRep}${researchCtx}${ytCtx}`;

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

  // 🌐 35% chance to use a hot news topic from research
  let tema;
  let fromResearch = false;
  if (research && research.quickTopics && research.quickTopics.length > 0 && Math.random() < 0.35) {
    tema = C.pick(research.quickTopics);
    fromResearch = true;
    C.log.info(`📰 Tema de RESEARCH: "${tema}"`);
  } else {
    tema = C.pickFreshestTopic(
      P[`temas_${modo.modo}`] || [modo.tema],
      history.getTexts(30)
    ) || modo.tema;
  }

  C.log.stat('Modo', `${modo.modo}${modo.adaptive ? ' (🧠)' : ''}`);
  C.log.stat('Tema', `${tema}${fromResearch ? ' 📰' : ''}`);

  const content = await C.generateWithPipeline(
    () => generatePost(modo, tema),
    history,
    280
  );

  const title = C.generateTitle(modo.modo);
  C.log.info(`📝 "${title}": ${content.substring(0, 80)}...`);

  // ═══ 🛡️ SECURITY: Validate output before posting ═══
  const check = sec.processOutput(content);
  if (!check.safe) {
    C.log.warn(`🛡️ Post BLOQUEADO por seguridad: ${check.blocked.join(', ')}`);
    C.log.session();
    return;
  }
  // ═══ END SECURITY ═══

  const result = await C.moltPostWithFallback(title, check.text);

  if (result.success) {
    C.log.ok('Post publicado');
    history.add({
      text: check.text, mode: modo.modo, tema, title, adaptive: !!modo.adaptive,
      charLen: check.text.length, fromResearch
    });
  } else {
    C.log.error(`Falló: ${result.error}`);
  }

  history.save();
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
