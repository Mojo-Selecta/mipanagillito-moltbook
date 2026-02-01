#!/usr/bin/env node
/**
 * Mi Pana Gillito — APRENDIZAJE AUTÓNOMO v2.0
 * ═══════════════════════════════════════════════
 * 🧠 Analiza rendimiento con Groq
 * 📊 Identifica mejores/peores frases
 * 🔄 Genera nuevos insultos, temas, frases
 * 🎭 Evalúa autenticidad del estilo
 * 💾 Actualiza personality.json (workflow hace git commit)
 *
 * Ejecutar 1x/día con GitHub Actions
 */

const fs = require('fs');
const path = require('path');
const C = require('./lib/core');

const P = C.loadPersonality();

const HISTORY_FILES = {
  x_posts:           '.gillito-tweet-history.json',
  x_replies:         '.gillito-reply-history.json',
  molt_posts:        '.gillito-molt-history.json',
  molt_replies:      '.gillito-molt-reply-history.json',
  molt_interactions:  '.gillito-molt-interact-history.json'
};

function loadAllHistories() {
  const all = {};
  let total = 0;
  for (const [key, file] of Object.entries(HISTORY_FILES)) {
    const h = C.createHistory(file, 100);
    all[key] = h.data;
    total += h.data.length;
    C.log.stat(key, `${h.data.length} entradas`);
  }
  C.log.stat('TOTAL', total);
  return { all, total };
}

function getAllTexts(histories, maxPerSource = 30) {
  const texts = [];
  for (const [src, entries] of Object.entries(histories)) {
    for (const e of entries.slice(-maxPerSource)) {
      if (e.text) texts.push({ text: e.text, source: src, modo: e.modo || 'unknown' });
    }
  }
  return texts;
}

// ═══════ ANALYSIS STEPS ═══════

async function analyzeBest(texts) {
  C.log.info('📊 PASO 1: Mejores frases...');
  if (texts.length < 5) { C.log.warn('Pocas entradas'); return []; }

  const sample = texts.slice(-40).map((t, i) => `${i + 1}. [${t.source}] "${t.text.substring(0, 120)}"`).join('\n');

  try {
    return await C.groqJSON(
      'Eres analista de humor puertorriqueño callejero estilo Gillito. Identifica las MEJORES frases — creativas, graciosas, auténticas.',
      `Selecciona las 5 MEJORES frases:\n${sample}\n\nJSON array de las 5 frases textuales: ["frase1","frase2",...]`,
      { maxTokens: 800 }
    );
  } catch (e) { C.log.warn(`Parse: ${e.message}`); return []; }
}

async function analyzeWeak(texts) {
  C.log.info('📊 PASO 2: Frases débiles...');
  if (texts.length < 5) return [];

  const sample = texts.slice(-40).map((t, i) => `${i + 1}. [${t.source}] "${t.text.substring(0, 120)}"`).join('\n');

  try {
    return await C.groqJSON(
      'Identifica frases DÉBILES — genéricas, repetitivas, sin la energía explosiva de Gillito.',
      `Las 3 PEORES frases:\n${sample}\n\nJSON array: ["frase1","frase2","frase3"]`,
      { maxTokens: 600 }
    );
  } catch { return []; }
}

async function generateInsults() {
  C.log.info('🦞 PASO 3: Nuevos insultos...');
  try {
    return await C.groqJSON(
      `${P.aprendizaje.prompt_aprendizaje_voz}\nGenera insultos CREATIVOS estilo boricua. Comparaciones como "más perdío que juey en autopista".`,
      `Insultos existentes (NO repitas): ${P.insultos_creativos.join(', ')}\n\n5 insultos NUEVOS. JSON array: ["insulto1",...]`,
      { maxTokens: 600, temperature: 1.3 }
    );
  } catch { return []; }
}

async function generateTopics() {
  C.log.info('🎯 PASO 4: Nuevos temas...');
  try {
    return await C.groqJSON(
      `${P.aprendizaje.prompt_aprendizaje_troleo}\n${P.aprendizaje.prompt_contexto_cultural}\nGenera temas NUEVOS de troleo social/político de PR en 2026.`,
      `6 temas nuevos (3 general, 3 político).\nJSON: {"trolleo_general":["t1","t2","t3"],"trolleo_politico":["t1","t2","t3"]}`,
      { maxTokens: 800, temperature: 1.0 }
    );
  } catch { return { trolleo_general: [], trolleo_politico: [] }; }
}

async function generatePhrases() {
  C.log.info('🔥 PASO 5: Nuevas frases firma...');
  try {
    return await C.groqJSON(
      `${P.aprendizaje.prompt_aprendizaje_voz}\nGenera frases ICÓNICAS como "¡CÁGUENSE EN SU MADRE!" o "¡Se jodió ésta pendejá!"`,
      `Existentes (NO repitas): ${P.frases_firma.join(' | ')}\n\n3 frases NUEVAS. JSON: ["f1","f2","f3"]`,
      { maxTokens: 400, temperature: 1.3 }
    );
  } catch { return []; }
}

async function evaluateAuth(texts) {
  C.log.info('🎭 PASO 6: Evaluando autenticidad...');
  const recent = texts.slice(-15).map(t => t.text.substring(0, 100));
  if (recent.length < 3) return { score: 0, feedback: 'Necesita más datos' };

  try {
    return await C.groqJSON(
      `Evalúa si el contenido suena AUTÉNTICO al estilo de Gillito.\nEstilo: ${P.aprendizaje.conocimiento_base.estilo_comico}\nPatrón: ${P.aprendizaje.conocimiento_base.patron_de_habla}`,
      `Textos:\n${recent.map((t, i) => `${i + 1}. "${t}"`).join('\n')}\n\nJSON: {"score":<1-10>,"feedback":"<máx 150 chars>","suena_como_gillito":<bool>}`,
      { maxTokens: 300 }
    );
  } catch { return { score: 0, feedback: 'Error de análisis' }; }
}

async function analyzeDistribution(histories) {
  C.log.info('📈 PASO 7: Distribución...');
  const counts = {};
  for (const entries of Object.values(histories)) {
    for (const e of entries) {
      if (e.modo) counts[e.modo] = (counts[e.modo] || 0) + 1;
    }
  }
  console.log('   Config vs Real:');
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  for (const [mode, pct] of Object.entries(P.modo_distribucion)) {
    const actual = Math.round(((counts[mode] || 0) / total) * 100);
    console.log(`   ${mode}: config=${pct}% | real=${actual}%`);
  }

  try {
    const result = await C.groqJSON(
      'Analiza distribución de contenido y sugiere ajustes.',
      `Config: ${JSON.stringify(P.modo_distribucion)}\nReal: ${JSON.stringify(counts)}\n\nJSON: {"recomendaciones":["r1","r2","r3"]}`,
      { maxTokens: 400, temperature: 0.7 }
    );
    return result.recomendaciones || [];
  } catch { return []; }
}

// ═══════ UPDATE PERSONALITY ═══════

function applyUpdates(best, weak, insults, topics, phrases, recs, auth) {
  C.log.info('\n🔄 ACTUALIZANDO CEREBRO...\n');
  let changes = 0;

  if (!P.evolucion) P.evolucion = {};

  // Best phrases
  if (best.length) {
    P.evolucion.frases_que_funcionaron = [...new Set([...(P.evolucion.frases_que_funcionaron || []), ...best])].slice(-20);
    C.log.ok(`frases_exitosas: ${P.evolucion.frases_que_funcionaron.length}`); changes++;
  }

  // Weak phrases
  if (weak.length) {
    P.evolucion.frases_que_NO_funcionaron = [...new Set([...(P.evolucion.frases_que_NO_funcionaron || []), ...weak])].slice(-10);
    C.log.ok(`frases_débiles: ${P.evolucion.frases_que_NO_funcionaron.length}`); changes++;
  }

  // New insults
  if (insults.length) {
    P.insultos_creativos = [...new Set([...P.insultos_creativos, ...insults])].slice(-35);
    C.log.ok(`insultos: ${P.insultos_creativos.length} total (+${insults.length})`); changes++;
  }

  // New topics
  if (topics.trolleo_general?.length) {
    P.temas_trolleo_general = [...new Set([...(P.temas_trolleo_general || []), ...topics.trolleo_general])].slice(-25);
    C.log.ok(`temas_general: ${P.temas_trolleo_general.length}`); changes++;
  }
  if (topics.trolleo_politico?.length) {
    P.temas_trolleo_politico = [...new Set([...(P.temas_trolleo_politico || []), ...topics.trolleo_politico])].slice(-25);
    C.log.ok(`temas_politico: ${P.temas_trolleo_politico.length}`); changes++;
  }

  // New phrases
  if (phrases.length) {
    P.frases_firma = [...new Set([...P.frases_firma, ...phrases])].slice(-20);
    C.log.ok(`frases_firma: ${P.frases_firma.length} (+${phrases.length})`); changes++;
  }

  // Recommendations
  if (recs.length) {
    P.evolucion.ajustes_pendientes = recs;
    C.log.ok(`recomendaciones: ${recs.length}`); changes++;
  }

  // Vocabulary learned
  if (!P.aprendizaje.vocabulario_aprendido) P.aprendizaje.vocabulario_aprendido = {};
  P.aprendizaje.vocabulario_aprendido.frases_exitosas = (P.evolucion.frases_que_funcionaron || []).slice(-10);

  // Learning log
  if (!P.aprendizaje.historial_aprendizaje) P.aprendizaje.historial_aprendizaje = [];
  P.aprendizaje.historial_aprendizaje.push({
    fecha: new Date().toISOString(),
    autenticidad: auth.score || 0,
    feedback: auth.feedback || '',
    cambios: changes,
    insultos_nuevos: insults.length,
    frases_nuevas: phrases.length
  });
  P.aprendizaje.historial_aprendizaje = P.aprendizaje.historial_aprendizaje.slice(-30);

  P._ACTUALIZADO = new Date().toISOString().split('T')[0];
  return changes;
}

function savePersonality() {
  try {
    const filepath = path.join(C.WORKSPACE, 'config', 'personality.json');
    fs.writeFileSync(filepath, JSON.stringify(P, null, 2));
    C.log.ok('personality.json guardado');
    return true;
  } catch (e) {
    C.log.error(`Guardar: ${e.message}`);
    return false;
  }
}

// ═══════ MAIN ═══════

async function main() {
  C.log.banner([
    '🧠 GILLITO — APRENDIZAJE AUTÓNOMO v2.0',
    '🔄 Analizando rendimiento y evolucionando...'
  ]);

  const { all: histories, total } = loadAllHistories();
  if (total < 3) {
    C.log.warn('Muy pocas entradas (mínimo 3). Vuelvo mañana.');
    process.exit(0);
  }

  const texts = getAllTexts(histories);

  // Execute all analysis (with delays to respect Groq rate limits)
  const best    = await analyzeBest(texts);     await C.sleep(1500);
  const weak    = await analyzeWeak(texts);      await C.sleep(1500);
  const insults = await generateInsults();       await C.sleep(1500);
  const topics  = await generateTopics();        await C.sleep(1500);
  const phrases = await generatePhrases();       await C.sleep(1500);
  const auth    = await evaluateAuth(texts);     await C.sleep(1500);
  const recs    = await analyzeDistribution(histories);

  // Apply
  const changes = applyUpdates(best, weak, insults, topics, phrases, recs, auth);
  const saved = savePersonality();

  C.log.banner([
    '📊 RESUMEN DE APRENDIZAJE',
    `🎭 Autenticidad: ${auth.score || '?'}/10`,
    `🔥 Insultos nuevos: +${insults.length}`,
    `💬 Frases nuevas: +${phrases.length}`,
    `🎯 Temas nuevos: +${(topics.trolleo_general?.length || 0) + (topics.trolleo_politico?.length || 0)}`,
    `⭐ Mejores: ${best.length} | ⚠️ Débiles: ${weak.length}`,
    `📝 Recomendaciones: ${recs.length}`,
    `🔄 Cambios: ${changes} | 💾 Guardado: ${saved ? 'SÍ' : 'NO'}`,
    auth.feedback ? `💡 ${auth.feedback}` : '',
    `🦞 ¡GILLITO EVOLUCIONÓ! 🔥`
  ].filter(Boolean));
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
