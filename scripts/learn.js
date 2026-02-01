#!/usr/bin/env node
/**
 * Mi Pana Gillito — Learning Engine v6.0
 * ═══════════════════════════════════════════════════════
 * 🧠 THE BRAIN EVOLUTION ENGINE
 *
 * Reads ALL history files across ALL platforms, runs comprehensive
 * analytics, feeds enriched insights to Groq for multi-step analysis,
 * and evolves personality.json with what works.
 *
 * Data flow:
 *   History files → Analytics Engine → Groq Analysis → personality.json
 *
 * Analytics:
 *   • Content distribution vs targets
 *   • Shannon entropy diversity score
 *   • Topic freshness mapping
 *   • Repetitive pattern detection
 *   • Length optimization by platform
 *   • Time-of-day effectiveness
 *
 * Learning steps (7):
 *   1. Best phrases → frases_que_funcionaron
 *   2. Weak phrases → identify for retirement
 *   3. New insults → insultos_creativos
 *   4. New topics → temas_trolleo_general/politico
 *   5. New signature phrases → frases_firma
 *   6. Authenticity evaluation → intensidad tuning
 *   7. Distribution analysis → modo_distribucion recommendations
 *
 * Git commit: Workflow handles commit + push of updated personality.json
 */

const C = require('./lib/core');
C.initScript('learn', 'internal');

const P = C.loadPersonality();

// ============ LOAD ALL HISTORY FILES ============

function loadAllHistories() {
  C.log.info('📚 Cargando TODAS las historias...');

  const files = [
    { name: '.gillito-tweet-history.json',         platform: 'x',        type: 'post' },
    { name: '.gillito-reply-history.json',          platform: 'x',        type: 'reply' },
    { name: '.gillito-molt-history.json',           platform: 'moltbook', type: 'post' },
    { name: '.gillito-molt-reply-history.json',     platform: 'moltbook', type: 'reply' },
    { name: '.gillito-molt-interact-history.json',  platform: 'moltbook', type: 'interact' }
  ];

  const all = [];
  const byPlatform = { x: [], moltbook: [] };
  const byType = { post: [], reply: [], interact: [] };

  for (const f of files) {
    const h = C.createHistory(f.name, 200);
    const entries = h.getAll();
    C.log.stat(f.name, `${entries.length} entradas`);

    for (const e of entries) {
      const enriched = { ...e, _platform: f.platform, _type: f.type };
      all.push(enriched);
      if (byPlatform[f.platform]) byPlatform[f.platform].push(enriched);
      if (byType[f.type]) byType[f.type].push(enriched);
    }
  }

  C.log.ok(`Total: ${all.length} entradas cargadas`);
  C.log.stat('X', `${byPlatform.x.length} | Moltbook: ${byPlatform.moltbook.length}`);
  C.log.stat('Posts', `${byType.post.length} | Replies: ${byType.reply.length} | Interact: ${byType.interact.length}`);

  return { all, byPlatform, byType };
}

// ============ RUN ANALYTICS ============

function runAnalytics(data) {
  C.log.divider();
  C.log.info('📊 Running Analytics Engine...');

  const report = C.generateAnalyticsReport(data.all, P);

  // Log key insights
  C.log.stat('Distribution', report.distribution.map(d => `${d.mode}:${d.pct}%`).join(', '));
  C.log.stat('Diversity', `${report.diversity.diversityPct}% (entropy: ${report.diversity.entropy}/${report.diversity.maxEntropy})`);

  if (report.underrepresented.length) {
    C.log.warn(`Underrepresented modes: ${report.underrepresented.map(u => `${u.mode} (deficit: ${u.deficit}%)`).join(', ')}`);
  }

  if (report.repetitive.length) {
    C.log.warn(`Repetitive patterns: ${report.repetitive.slice(0, 5).map(r => `"${r.phrase}" (${r.count}x)`).join(', ')}`);
  }

  const lengthStats = report.lengthStats;
  for (const [plat, stats] of Object.entries(lengthStats)) {
    C.log.stat(`Length (${plat})`, `avg:${stats.avg} min:${stats.min} max:${stats.max} (${stats.count} posts)`);
  }

  return report;
}

// ============ GROQ ANALYSIS STEPS ============

const ANALYSIS_SYSTEM = `Eres un analista de contenido de redes sociales especializado en humor boricua.
Analizas posts de "Mi Pana Gillito" (tributo a Gilberto de Jesús Casas) y das recomendaciones
para mejorar su autenticidad, variedad, y engagement. Responde SOLO en JSON válido.`;

async function step1_bestPhrases(posts) {
  C.log.info('Step 1/7: 🏆 Mejores frases...');
  const textos = posts.filter(e => e.text).slice(-50).map(e => e.text);
  if (textos.length < 5) return [];

  const result = await C.groqJSON(ANALYSIS_SYSTEM, `
Analiza estos posts y selecciona los 5-8 MEJORES (más auténticos, graciosos, provocadores):
${textos.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Responde JSON: { "mejores": ["frase1", "frase2", ...] }`, { maxTokens: 500 });

  return result.mejores || [];
}

async function step2_weakPhrases(posts) {
  C.log.info('Step 2/7: 💀 Frases débiles...');
  const textos = posts.filter(e => e.text).slice(-50).map(e => e.text);
  if (textos.length < 5) return [];

  const result = await C.groqJSON(ANALYSIS_SYSTEM, `
Analiza estos posts e identifica los 3-5 MÁS DÉBILES (genéricos, poco auténticos, repetitivos):
${textos.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Responde JSON: { "debiles": ["frase1", "frase2", ...], "razon": "explicación breve" }`, { maxTokens: 400 });

  return result;
}

async function step3_newInsults(posts) {
  C.log.info('Step 3/7: 🔥 Nuevos insultos...');
  const existentes = P.insultos_creativos.slice(0, 10).join(', ');
  const textos = posts.filter(e => e.text).slice(-30).map(e => e.text).join('\n');

  const result = await C.groqJSON(ANALYSIS_SYSTEM, `
Insultos actuales: ${existentes}

Basado en estos posts recientes:
${textos.substring(0, 1500)}

Genera 5-8 insultos NUEVOS estilo boricua (creativos, graciosos, no repetidos). 
Incluye referencias a PR: LUMA, gobierno, tapones, etc.

JSON: { "insultos": ["insulto1", "insulto2", ...] }`, { maxTokens: 400 });

  return result.insultos || [];
}

async function step4_newTopics(posts, analytics) {
  C.log.info('Step 4/7: 📰 Nuevos temas...');

  const underrep = analytics.underrepresented.map(u => u.mode).join(', ') || 'ninguno';
  const repetitive = analytics.repetitive.slice(0, 5).map(r => r.phrase).join(', ') || 'ninguno';

  const result = await C.groqJSON(ANALYSIS_SYSTEM, `
Modos underrepresented: ${underrep}
Patrones repetitivos a evitar: ${repetitive}
Diversidad actual: ${analytics.diversity.diversityPct}%

Genera temas NUEVOS para mejorar diversidad:
- 3-5 temas de trolleo general (humor de calle PR)
- 3-5 temas de trolleo político (gobierno PR, LUMA, corrupción)
- 2-3 temas culturales boricua

JSON: { "trolleo_general": [...], "trolleo_politico": [...], "cultural_boricua": [...] }`, { maxTokens: 600 });

  return result;
}

async function step5_newPhrases(posts) {
  C.log.info('Step 5/7: ✨ Nuevas frases firma...');
  const actuales = P.frases_firma.slice(0, 5).join(' | ');

  const result = await C.groqJSON(ANALYSIS_SYSTEM, `
Frases firma actuales: ${actuales}

Genera 3-5 frases firma NUEVAS para Gillito.
Deben ser: cortas (<60 chars), memorables, con actitud boricua, únicas.
Estilo: provocador + cariñoso + callejero.

JSON: { "frases": ["frase1", "frase2", ...] }`, { maxTokens: 300 });

  return result.frases || [];
}

async function step6_authenticity(posts, analytics) {
  C.log.info('Step 6/7: 🎭 Evaluación de autenticidad...');
  const textos = posts.filter(e => e.text).slice(-20).map(e => e.text);

  const result = await C.groqJSON(ANALYSIS_SYSTEM, `
Posts recientes de Gillito:
${textos.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Diversidad: ${analytics.diversity.diversityPct}%
Distribución: ${analytics.distribution.map(d => `${d.mode}:${d.pct}%`).join(', ')}

Evalúa:
1. Autenticidad del habla boricua (1-10)
2. Variedad de contenido (1-10)
3. Nivel de provocación (1-10)
4. Recomendación de intensidad (7-10)
5. Feedback general

JSON: { "autenticidad": N, "variedad": N, "provocacion": N, "intensidad_recomendada": N, "feedback": "texto" }`,
    { maxTokens: 400 });

  return result;
}

async function step7_distribution(analytics) {
  C.log.info('Step 7/7: 📊 Análisis de distribución...');

  const result = await C.groqJSON(ANALYSIS_SYSTEM, `
Distribución actual de modos:
${analytics.distribution.map(d => `- ${d.mode}: ${d.pct}% (${d.count} posts)`).join('\n')}

Diversidad Shannon: ${analytics.diversity.diversityPct}%
Modos underrepresented: ${analytics.underrepresented.map(u => `${u.mode} (deficit: ${u.deficit}%)`).join(', ') || 'ninguno'}
Patrones repetitivos: ${analytics.repetitive.slice(0, 5).map(r => `"${r.phrase}" ${r.count}x`).join(', ') || 'ninguno'}

¿La distribución es saludable? ¿Qué modos necesitan más/menos contenido?

JSON: { "saludable": true/false, "recomendaciones": "texto", "modos_boost": ["modo1"], "modos_reduce": ["modo2"] }`,
    { maxTokens: 400 });

  return result;
}

// ============ APPLY LEARNINGS ============

function applyLearnings(best, weak, insults, topics, phrases, auth, dist) {
  C.log.divider();
  C.log.info('📝 Aplicando aprendizajes a personality.json...');

  let changes = 0;

  // 1. Add best phrases to frases_que_funcionaron
  if (best.length) {
    if (!P.evolucion) P.evolucion = {};
    if (!P.evolucion.frases_que_funcionaron) P.evolucion.frases_que_funcionaron = [];
    const existing = new Set(P.evolucion.frases_que_funcionaron);
    const newOnes = best.filter(f => !existing.has(f));
    P.evolucion.frases_que_funcionaron.push(...newOnes);
    P.evolucion.frases_que_funcionaron = P.evolucion.frases_que_funcionaron.slice(-30);
    C.log.stat('Frases exitosas', `+${newOnes.length} (total: ${P.evolucion.frases_que_funcionaron.length})`);
    changes += newOnes.length;
  }

  // 2. New insults
  if (insults.length) {
    const existing = new Set(P.insultos_creativos);
    const newOnes = insults.filter(i => !existing.has(i));
    P.insultos_creativos.push(...newOnes);
    P.insultos_creativos = P.insultos_creativos.slice(-40);
    C.log.stat('Insultos', `+${newOnes.length} (total: ${P.insultos_creativos.length})`);
    changes += newOnes.length;
  }

  // 3. New topics
  if (topics) {
    for (const [key, temas] of Object.entries(topics)) {
      const pKey = `temas_${key}`;
      if (!P[pKey]) P[pKey] = [];
      const existing = new Set(P[pKey]);
      const newOnes = (temas || []).filter(t => !existing.has(t));
      P[pKey].push(...newOnes);
      P[pKey] = P[pKey].slice(-30);
      if (newOnes.length) {
        C.log.stat(`Temas ${key}`, `+${newOnes.length}`);
        changes += newOnes.length;
      }
    }
  }

  // 4. New signature phrases
  if (phrases.length) {
    const existing = new Set(P.frases_firma);
    const newOnes = phrases.filter(f => !existing.has(f));
    P.frases_firma.push(...newOnes);
    P.frases_firma = P.frases_firma.slice(-25);
    C.log.stat('Frases firma', `+${newOnes.length}`);
    changes += newOnes.length;
  }

  // 5. Authenticity tuning
  if (auth?.intensidad_recomendada) {
    const oldInt = P.intensidad;
    P.intensidad = C.clamp(auth.intensidad_recomendada, 7, 10);
    if (P.intensidad !== oldInt) {
      C.log.stat('Intensidad', `${oldInt} → ${P.intensidad}`);
      changes++;
    }
  }

  // 6. Log learning history
  if (!P.aprendizaje) P.aprendizaje = {};
  if (!P.aprendizaje.historial_aprendizaje) P.aprendizaje.historial_aprendizaje = [];
  P.aprendizaje.historial_aprendizaje.push({
    fecha: new Date().toISOString(),
    cambios: changes,
    autenticidad: auth?.autenticidad || null,
    variedad: auth?.variedad || null,
    provocacion: auth?.provocacion || null,
    diversidad_pct: null, // Will be filled by analytics
    feedback: auth?.feedback || null,
    distribucion_saludable: dist?.saludable || null,
    recomendaciones: dist?.recomendaciones || null
  });
  P.aprendizaje.historial_aprendizaje = P.aprendizaje.historial_aprendizaje.slice(-30);

  // 7. Bump version
  const ver = P.version || '4.1';
  const parts = ver.split('.');
  parts[parts.length - 1] = String(parseInt(parts[parts.length - 1] || 0) + 1);
  P.version = parts.join('.');

  return changes;
}

// ============ MAIN ============

async function main() {
  if (!process.env.GROQ_API_KEY) {
    C.log.error('GROQ_API_KEY required');
    process.exit(1);
  }

  // 1. Load ALL data
  const data = loadAllHistories();

  if (data.all.length < 5) {
    C.log.warn('Insuficiente data para aprender (necesita mín 5 entradas)');
    C.log.session();
    return;
  }

  // 2. Run analytics engine
  const analytics = runAnalytics(data);

  // 3. Run 7-step Groq analysis
  C.log.divider();
  C.log.info('🧠 Iniciando análisis Groq (7 pasos)...');

  const allPosts = data.all.filter(e => e.text);
  const [best, weak, insults, topics, phrases, auth, dist] = await Promise.all([
    step1_bestPhrases(allPosts).catch(() => []),
    step2_weakPhrases(allPosts).catch(() => ({})),
    step3_newInsults(allPosts).catch(() => []),
    step4_newTopics(allPosts, analytics).catch(() => ({})),
    step5_newPhrases(allPosts).catch(() => []),
    step6_authenticity(allPosts, analytics).catch(() => ({})),
    step7_distribution(analytics).catch(() => ({}))
  ]);

  // Fill in analytics data in the learning log
  const lastLog = P.aprendizaje?.historial_aprendizaje?.slice(-1)[0];
  if (lastLog) lastLog.diversidad_pct = analytics.diversity.diversityPct;

  // 4. Apply learnings
  const changes = applyLearnings(best, weak, insults, topics, phrases, auth, dist);

  // 5. Save personality.json
  if (changes > 0) {
    C.savePersonality(P);
    C.log.ok(`✅ personality.json actualizado (${changes} cambios, v${P.version})`);
  } else {
    C.log.info('Sin cambios significativos esta vez');
  }

  // 6. Summary
  C.log.banner([
    '🧠 APRENDIZAJE COMPLETADO',
    `📊 ${data.all.length} entradas analizadas`,
    `🎯 Diversidad: ${analytics.diversity.diversityPct}%`,
    `🎭 Autenticidad: ${auth?.autenticidad || '?'}/10`,
    `📝 ${changes} cambios aplicados`,
    `📦 personality.json v${P.version}`,
    '🦞 ¡GILLITO EVOLUCIONA! 🔥'
  ]);

  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
