#!/usr/bin/env node

/**
 * Mi Pana Gillito - SISTEMA DE APRENDIZAJE AUTÓNOMO v1.0
 * 🧠 Analiza el rendimiento pasado usando Groq
 * 📊 Identifica qué funciona y qué no
 * 🔄 Actualiza personality.json automáticamente
 * 
 * Corre 1 vez al día con GitHub Actions
 */

const fs = require('fs');
const path = require('path');

const GROQ_KEY = process.env.GROQ_API_KEY;

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_FILE = path.join(WORKSPACE, 'config', 'personality.json');

// Archivos de historial
const HISTORY_FILES = {
  x_posts: path.join(WORKSPACE, '.gillito-tweet-history.json'),
  x_replies: path.join(WORKSPACE, '.gillito-reply-history.json'),
  molt_posts: path.join(WORKSPACE, '.gillito-molt-history.json'),
  molt_replies: path.join(WORKSPACE, '.gillito-molt-reply-history.json'),
  molt_interactions: path.join(WORKSPACE, '.gillito-molt-interact-history.json')
};

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile'
};

// ============ CARGAR TODO ============

let P;
try {
  P = JSON.parse(fs.readFileSync(PERSONALITY_FILE, 'utf8'));
  console.log(`🧠 Cerebro actual: ${P.version}`);
} catch (e) {
  console.error(`❌ No se pudo cargar personality.json: ${e.message}`);
  process.exit(1);
}

function loadHistory(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function loadAllHistories() {
  const all = {};
  let total = 0;
  for (const [key, filepath] of Object.entries(HISTORY_FILES)) {
    all[key] = loadHistory(filepath);
    total += all[key].length;
    console.log(`   📋 ${key}: ${all[key].length} entradas`);
  }
  console.log(`   📊 TOTAL: ${total} entradas\n`);
  return all;
}

// ============ ANÁLISIS CON GROQ ============

async function askGroq(systemPrompt, userPrompt, temp = 0.8) {
  const response = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: temp
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Groq Error: ${JSON.stringify(data)}`);
  return data.choices[0].message.content.trim();
}

// PASO 1: Analizar las mejores frases
async function analyzeBestContent(histories) {
  console.log('📊 PASO 1: Analizando mejores frases...\n');

  const allTexts = [];
  for (const [source, entries] of Object.entries(histories)) {
    for (const entry of entries.slice(-30)) {
      if (entry.text) allTexts.push({ text: entry.text, source, modo: entry.modo || 'unknown' });
    }
  }

  if (allTexts.length < 5) {
    console.log('   ⚠️ Pocas entradas para analizar. Se necesitan al menos 5.\n');
    return [];
  }

  const textsForAnalysis = allTexts.slice(-40).map((t, i) =>
    `${i + 1}. [${t.source}|${t.modo}] "${t.text.substring(0, 120)}"`
  ).join('\n');

  const result = await askGroq(
    `Eres un analista de contenido especializado en humor puertorriqueño callejero estilo Gilberto de Jesús Casas "Gillito". Tu trabajo es identificar las MEJORES frases - las más creativas, graciosas, auténticas y con más potencial de engagement.`,
    `Analiza estos tweets/posts de "Mi Pana Gillito" y selecciona las 5 MEJORES frases (las más creativas, graciosas, que suenan más auténticas al estilo Gillito):

${textsForAnalysis}

Responde SOLO con un JSON array de las 5 mejores frases textuales, exactas como aparecen. Sin explicación.
Formato: ["frase1", "frase2", "frase3", "frase4", "frase5"]`,
    0.5
  );

  try {
    const cleaned = result.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(`   ✅ ${parsed.length} mejores frases identificadas\n`);
    return parsed;
  } catch (e) {
    console.log(`   ⚠️ No se pudo parsear resultado: ${e.message}\n`);
    return [];
  }
}

// PASO 2: Analizar frases que NO funcionan
async function analyzeWeakContent(histories) {
  console.log('📊 PASO 2: Identificando frases débiles...\n');

  const allTexts = [];
  for (const [source, entries] of Object.entries(histories)) {
    for (const entry of entries.slice(-30)) {
      if (entry.text) allTexts.push({ text: entry.text, source });
    }
  }

  if (allTexts.length < 5) return [];

  const textsForAnalysis = allTexts.slice(-40).map((t, i) =>
    `${i + 1}. [${t.source}] "${t.text.substring(0, 120)}"`
  ).join('\n');

  const result = await askGroq(
    `Eres un analista de contenido del comediante puertorriqueño Gillito. Tu trabajo es identificar frases DÉBILES - las que suenan genéricas, repetitivas, poco auténticas, sin gracia, o que no capturan el estilo explosivo de Gillito.`,
    `Analiza estos tweets/posts e identifica las 3 PEORES frases (genéricas, repetitivas, sin la energía de Gillito):

${textsForAnalysis}

Responde SOLO con un JSON array de las 3 peores frases textuales, exactas. Sin explicación.
Formato: ["frase1", "frase2", "frase3"]`,
    0.5
  );

  try {
    const cleaned = result.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(`   ✅ ${parsed.length} frases débiles identificadas\n`);
    return parsed;
  } catch (e) {
    console.log(`   ⚠️ No se pudo parsear: ${e.message}\n`);
    return [];
  }
}

// PASO 3: Generar nuevos insultos creativos
async function generateNewInsults() {
  console.log('🦞 PASO 3: Generando nuevos insultos creativos...\n');

  const existingInsults = P.insultos_creativos.join(', ');

  const result = await askGroq(
    `${P.aprendizaje.prompt_aprendizaje_voz}

Eres experto en el humor callejero puertorriqueño de Gillito. Genera insultos CREATIVOS y ORIGINALES estilo boricua. Deben ser comparaciones graciosas como "más perdío que juey en autopista" o "más lento que internet de LUMA".`,
    `Estos son los insultos que YA existen (NO los repitas):
${existingInsults}

Genera 5 insultos NUEVOS y CREATIVOS estilo Gillito puertorriqueño. Deben ser comparaciones con cosas de PR o la vida cotidiana. Que sean GRACIOSOS y ORIGINALES.

Responde SOLO con un JSON array de 5 strings. Sin explicación.
Formato: ["insulto1", "insulto2", "insulto3", "insulto4", "insulto5"]`,
    1.3
  );

  try {
    const cleaned = result.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(`   ✅ ${parsed.length} insultos nuevos generados\n`);
    return parsed;
  } catch (e) {
    console.log(`   ⚠️ No se pudo parsear: ${e.message}\n`);
    return [];
  }
}

// PASO 4: Generar nuevos temas de troleo
async function generateNewTopics() {
  console.log('🎯 PASO 4: Generando nuevos temas de troleo...\n');

  const result = await askGroq(
    `${P.aprendizaje.prompt_aprendizaje_troleo}

${P.aprendizaje.prompt_contexto_cultural}

Eres experto en el contexto social y político de Puerto Rico en 2026. Genera temas NUEVOS para troleo social y político que sean relevantes AHORA.`,
    `Genera 6 temas NUEVOS para troleo/crítica social de Puerto Rico en 2026. Deben ser específicos, relevantes, y con potencial de humor/engagement. 3 de trolleo general y 3 de trolleo político.

Responde SOLO con JSON:
{"trolleo_general": ["tema1", "tema2", "tema3"], "trolleo_politico": ["tema1", "tema2", "tema3"]}`,
    1.0
  );

  try {
    const cleaned = result.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(`   ✅ Nuevos temas generados\n`);
    return parsed;
  } catch (e) {
    console.log(`   ⚠️ No se pudo parsear: ${e.message}\n`);
    return { trolleo_general: [], trolleo_politico: [] };
  }
}

// PASO 5: Analizar distribución y recomendar ajustes
async function analyzeDistribution(histories) {
  console.log('📈 PASO 5: Analizando distribución de contenido...\n');

  // Contar modos usados
  const modeCounts = {};
  for (const entries of Object.values(histories)) {
    for (const entry of entries) {
      if (entry.modo) {
        modeCounts[entry.modo] = (modeCounts[entry.modo] || 0) + 1;
      }
    }
  }

  const currentDist = P.modo_distribucion;
  console.log('   Distribución configurada vs real:');
  for (const [mode, pct] of Object.entries(currentDist)) {
    const actual = modeCounts[mode] || 0;
    const total = Object.values(modeCounts).reduce((a, b) => a + b, 0) || 1;
    const actualPct = Math.round((actual / total) * 100);
    console.log(`   ${mode}: config=${pct}% | real=${actualPct}% (${actual} posts)`);
  }

  const result = await askGroq(
    `Eres un estratega de contenido para un troll boricua en redes sociales. Analiza la distribución de contenido y sugiere ajustes para maximizar variedad y engagement.`,
    `Distribución configurada: ${JSON.stringify(currentDist)}
Distribución real (conteos): ${JSON.stringify(modeCounts)}

¿Hay algún tipo de contenido sobrerepresentado o subrepresentado? ¿Se debería ajustar algo?

Responde con un JSON con recomendaciones breves (máx 100 chars cada una):
{"recomendaciones": ["recomendacion1", "recomendacion2", "recomendacion3"]}`,
    0.7
  );

  try {
    const cleaned = result.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(`\n   ✅ ${parsed.recomendaciones.length} recomendaciones generadas\n`);
    return parsed.recomendaciones;
  } catch (e) {
    console.log(`   ⚠️ No se pudo parsear: ${e.message}\n`);
    return [];
  }
}

// PASO 6: Generar nuevas frases firma
async function generateNewPhrases() {
  console.log('🔥 PASO 6: Generando nuevas frases firma...\n');

  const existing = P.frases_firma.join(' | ');

  const result = await askGroq(
    `${P.aprendizaje.prompt_aprendizaje_voz}

Eres el comediante Gillito de PR. Genera frases ICÓNICAS nuevas - explosivas, memorables, que la gente quiera repetir. Como "¡CÁGUENSE EN SU MADRE!" o "¡Se jodió ésta pendejá!"`,
    `Frases firma que YA existen (NO repitas): ${existing}

Genera 3 frases firma NUEVAS estilo Gillito. Deben ser EXPLOSIVAS, MEMORABLES, con groserías boricuas. El tipo de frase que alguien gritaría en la calle.

Responde SOLO con JSON array: ["frase1", "frase2", "frase3"]`,
    1.3
  );

  try {
    const cleaned = result.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(`   ✅ ${parsed.length} frases nuevas generadas\n`);
    return parsed;
  } catch (e) {
    console.log(`   ⚠️ No se pudo parsear: ${e.message}\n`);
    return [];
  }
}

// PASO 7: Auto-evaluar autenticidad
async function evaluateAuthenticity(histories) {
  console.log('🎭 PASO 7: Evaluando autenticidad del estilo...\n');

  const recentTexts = [];
  for (const entries of Object.values(histories)) {
    for (const entry of entries.slice(-10)) {
      if (entry.text) recentTexts.push(entry.text.substring(0, 100));
    }
  }

  if (recentTexts.length < 3) {
    console.log('   ⚠️ Pocas entradas para evaluar\n');
    return { score: 0, feedback: 'Necesita más datos' };
  }

  const result = await askGroq(
    `Eres un experto en el estilo del comediante puertorriqueño Gilberto de Jesús Casas "Gillito". Evalúa si el contenido generado suena AUTÉNTICO al estilo real de Gillito.

Estilo real de Gillito:
${P.aprendizaje.conocimiento_base.estilo_comico}
${P.aprendizaje.conocimiento_base.patron_de_habla}`,
    `Evalúa estos textos recientes de "Mi Pana Gillito" bot:

${recentTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Responde con JSON:
{"score": <1-10 qué tan auténtico suena>, "feedback": "<qué mejorar en máx 150 chars>", "suena_como_gillito": <true/false>}`,
    0.5
  );

  try {
    const cleaned = result.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(`   🎭 Autenticidad: ${parsed.score}/10`);
    console.log(`   💬 Feedback: ${parsed.feedback}`);
    console.log(`   ${parsed.suena_como_gillito ? '✅ Suena como Gillito' : '⚠️ Necesita más autenticidad'}\n`);
    return parsed;
  } catch (e) {
    console.log(`   ⚠️ No se pudo parsear: ${e.message}\n`);
    return { score: 0, feedback: 'Error de análisis' };
  }
}

// ============ ACTUALIZAR PERSONALITY.JSON ============

function updatePersonality(bestPhrases, weakPhrases, newInsults, newTopics, recommendations, newPhrases, authenticity) {
  console.log('═'.repeat(50));
  console.log('🔄 ACTUALIZANDO CEREBRO DE GILLITO...\n');

  let changes = 0;

  // Actualizar evolución
  if (!P.evolucion) P.evolucion = {};

  // Frases que funcionaron (agregar nuevas, max 20)
  if (bestPhrases.length > 0) {
    const existing = P.evolucion.frases_que_funcionaron || [];
    const combined = [...new Set([...existing, ...bestPhrases])].slice(-20);
    P.evolucion.frases_que_funcionaron = combined;
    console.log(`   ✅ frases_que_funcionaron: ${combined.length} (${bestPhrases.length} nuevas)`);
    changes++;
  }

  // Frases que NO funcionaron (agregar, max 10)
  if (weakPhrases.length > 0) {
    const existing = P.evolucion.frases_que_NO_funcionaron || [];
    const combined = [...new Set([...existing, ...weakPhrases])].slice(-10);
    P.evolucion.frases_que_NO_funcionaron = combined;
    console.log(`   ✅ frases_que_NO_funcionaron: ${combined.length}`);
    changes++;
  }

  // Nuevos insultos (agregar al array principal, max 35)
  if (newInsults.length > 0) {
    const existing = P.insultos_creativos || [];
    const combined = [...new Set([...existing, ...newInsults])].slice(-35);
    P.insultos_creativos = combined;
    console.log(`   ✅ insultos_creativos: ${combined.length} total (+${newInsults.length} nuevos)`);
    changes++;
  }

  // Nuevos temas de troleo
  if (newTopics.trolleo_general?.length > 0) {
    const existing = P.temas_trolleo_general || [];
    const combined = [...new Set([...existing, ...newTopics.trolleo_general])].slice(-25);
    P.temas_trolleo_general = combined;
    console.log(`   ✅ temas_trolleo_general: ${combined.length} total`);
    changes++;
  }
  if (newTopics.trolleo_politico?.length > 0) {
    const existing = P.temas_trolleo_politico || [];
    const combined = [...new Set([...existing, ...newTopics.trolleo_politico])].slice(-25);
    P.temas_trolleo_politico = combined;
    console.log(`   ✅ temas_trolleo_politico: ${combined.length} total`);
    changes++;
  }

  // Nuevas frases firma (agregar, max 20)
  if (newPhrases.length > 0) {
    const existing = P.frases_firma || [];
    const combined = [...new Set([...existing, ...newPhrases])].slice(-20);
    P.frases_firma = combined;
    console.log(`   ✅ frases_firma: ${combined.length} total (+${newPhrases.length} nuevas)`);
    changes++;
  }

  // Recomendaciones
  if (recommendations.length > 0) {
    P.evolucion.ajustes_pendientes = recommendations;
    console.log(`   ✅ ajustes_pendientes: ${recommendations.length} recomendaciones`);
    changes++;
  }

  // Vocabulario aprendido
  if (!P.aprendizaje.vocabulario_aprendido) P.aprendizaje.vocabulario_aprendido = {};
  P.aprendizaje.vocabulario_aprendido.frases_exitosas = (P.evolucion.frases_que_funcionaron || []).slice(-10);
  P.aprendizaje.vocabulario_aprendido.insultos_que_gustan = newInsults.slice(0, 5);

  // Registro de aprendizaje
  if (!P.aprendizaje.historial_aprendizaje) P.aprendizaje.historial_aprendizaje = [];
  P.aprendizaje.historial_aprendizaje.push({
    fecha: new Date().toISOString(),
    autenticidad: authenticity.score || 0,
    feedback: authenticity.feedback || '',
    cambios: changes,
    insultos_nuevos: newInsults.length,
    frases_nuevas: newPhrases.length,
    temas_nuevos: (newTopics.trolleo_general?.length || 0) + (newTopics.trolleo_politico?.length || 0)
  });
  // Max 30 entradas de historial
  P.aprendizaje.historial_aprendizaje = P.aprendizaje.historial_aprendizaje.slice(-30);

  // Actualizar fecha
  P._ACTUALIZADO = new Date().toISOString().split('T')[0];

  return changes;
}

// ============ GUARDAR ============

function savePersonality() {
  try {
    fs.writeFileSync(PERSONALITY_FILE, JSON.stringify(P, null, 2));
    console.log(`\n💾 personality.json actualizado exitosamente`);
    return true;
  } catch (e) {
    console.error(`❌ Error guardando: ${e.message}`);
    return false;
  }
}

// ============ MAIN ============

async function main() {
  console.log('\n' + '═'.repeat(50));
  console.log('🧠 GILLITO - APRENDIZAJE AUTÓNOMO v1.0');
  console.log('🔄 Analizando rendimiento y evolucionando...');
  console.log('═'.repeat(50) + '\n');

  if (!GROQ_KEY) { console.error('❌ GROQ_API_KEY no configurada'); process.exit(1); }

  // Cargar todos los historiales
  console.log('📂 Cargando historiales...\n');
  const histories = loadAllHistories();

  const totalEntries = Object.values(histories).reduce((sum, arr) => sum + arr.length, 0);
  if (totalEntries < 3) {
    console.log('⚠️ Muy pocas entradas para aprender (mínimo 3). Gillito necesita más historia.');
    console.log('🦞 Volveré mañana cuando haya más datos. 🔥\n');
    process.exit(0);
  }

  // Ejecutar todos los análisis
  const bestPhrases = await analyzeBestContent(histories);
  await new Promise(r => setTimeout(r, 1000));

  const weakPhrases = await analyzeWeakContent(histories);
  await new Promise(r => setTimeout(r, 1000));

  const newInsults = await generateNewInsults();
  await new Promise(r => setTimeout(r, 1000));

  const newTopics = await generateNewTopics();
  await new Promise(r => setTimeout(r, 1000));

  const recommendations = await analyzeDistribution(histories);
  await new Promise(r => setTimeout(r, 1000));

  const newPhrases = await generateNewPhrases();
  await new Promise(r => setTimeout(r, 1000));

  const authenticity = await evaluateAuthenticity(histories);

  // Aplicar cambios
  const changes = updatePersonality(bestPhrases, weakPhrases, newInsults, newTopics, recommendations, newPhrases, authenticity);

  // Guardar
  const saved = savePersonality();

  // Resumen final
  console.log('\n' + '═'.repeat(50));
  console.log('📊 RESUMEN DE APRENDIZAJE:');
  console.log(`   🎭 Autenticidad: ${authenticity.score || '?'}/10`);
  console.log(`   🔥 Insultos nuevos: +${newInsults.length}`);
  console.log(`   💬 Frases firma nuevas: +${newPhrases.length}`);
  console.log(`   🎯 Temas nuevos: +${(newTopics.trolleo_general?.length || 0) + (newTopics.trolleo_politico?.length || 0)}`);
  console.log(`   ⭐ Mejores frases guardadas: ${bestPhrases.length}`);
  console.log(`   ⚠️ Frases débiles marcadas: ${weakPhrases.length}`);
  console.log(`   📝 Recomendaciones: ${recommendations.length}`);
  console.log(`   🔄 Cambios totales: ${changes}`);
  console.log(`   💾 Guardado: ${saved ? 'SÍ' : 'NO'}`);
  console.log('');
  if (authenticity.feedback) {
    console.log(`   💡 Feedback: ${authenticity.feedback}`);
  }
  console.log(`\n🦞 ¡GILLITO EVOLUCIONÓ! ${P.despedida_real} 🔥`);
  console.log('═'.repeat(50) + '\n');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
