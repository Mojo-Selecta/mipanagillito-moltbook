const fs = require('fs');
const path = require('path');

const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ============ CARGAR CEREBRO ============

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_FILE = path.join(WORKSPACE, 'config', 'personality.json');
const HISTORY_FILE = path.join(WORKSPACE, '.gillito-molt-history.json');

let P;
try {
  P = JSON.parse(fs.readFileSync(PERSONALITY_FILE, 'utf8'));
  console.log(`🧠 Cerebro cargado: ${P.version}`);
  console.log(`🔥 Intensidad: ${P.intensidad}/10 | 🌡️ Temp: ${P.temperatura}`);
} catch (e) {
  console.error(`❌ No se pudo cargar personality.json: ${e.message}`);
  process.exit(1);
}

// ============ MEMORIA ============

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      const trimmed = data.slice(-100);
      console.log(`📋 Memoria: ${trimmed.length} posts anteriores`);
      return trimmed;
    }
  } catch (e) {}
  console.log('📋 Memoria: vacía (primera vez)');
  return [];
}

function saveHistory(history) {
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-100), null, 2)); } catch (e) {}
}

const postHistory = loadHistory();

// ============ CONFIGURACIÓN ============

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  retry: { maxAttempts: 3, delayMs: 5000, backoffMultiplier: 2 },
  healthCheck: { timeout: 10000, endpoint: 'https://www.moltbook.com/api/v1/posts?limit=1' }
};

// ============ HEALTH CHECK ============

async function checkMoltbookHealth() {
  console.log('🏥 Verificando estado de Moltbook...\n');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.healthCheck.timeout);
    const res = await fetch(CONFIG.healthCheck.endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` },
      signal: controller.signal
    });
    clearTimeout(timeout);
    console.log(`   📊 HTTP Status: ${res.status}`);
    if (res.status === 200) { console.log('   ✅ Moltbook ONLINE\n'); return { online: true }; }
    if (res.status >= 500) { console.log('   ❌ Moltbook CAÍDO\n'); return { online: false }; }
    return { online: true, status: res.status };
  } catch (error) {
    if (error.name === 'AbortError') { console.log('   ❌ Timeout\n'); return { online: false }; }
    console.log(`   ❌ Error: ${error.message}\n`);
    return { online: false };
  }
}

// ============ INTELIGENCIA: HORA Y DÍA ============

function getPRTime() {
  const now = new Date();
  const prStr = now.toLocaleString('en-US', { timeZone: 'America/Puerto_Rico' });
  const prDate = new Date(prStr);
  return {
    hour: prDate.getHours(),
    dayName: ['domingo','lunes','martes','miércoles','jueves','viernes','sabado'][prDate.getDay()]
  };
}

function checkSpecialTime(hour) {
  const h = P.horarios_especiales;
  const checks = [
    { key: 'buenos_dias', cfg: h.buenos_dias },
    { key: 'mediodia', cfg: h.mediodia },
    { key: 'tarde', cfg: h.tarde },
    { key: 'buenas_noches', cfg: h.buenas_noches },
    { key: 'madrugada_loca', cfg: h.madrugada_loca }
  ];
  for (const c of checks) {
    if (!c.cfg) continue;
    const inRange = c.cfg.hora_inicio <= c.cfg.hora_fin
      ? (hour >= c.cfg.hora_inicio && hour <= c.cfg.hora_fin)
      : (hour >= c.cfg.hora_inicio || hour <= c.cfg.hora_fin);
    if (inRange && Math.random() * 100 < c.cfg.probabilidad) {
      return { modo: c.key, tema: c.cfg.estilo };
    }
  }
  return null;
}

function selectMode() {
  const dist = P.modo_distribucion;
  const rand = Math.random() * 100;
  let cum = 0;
  for (const [key, pct] of Object.entries(dist)) {
    cum += pct;
    if (rand < cum) {
      const temas = P[`temas_${key}`] || [];
      if (temas.length > 0) {
        return { modo: key, tema: temas[Math.floor(Math.random() * temas.length)] };
      }
    }
  }
  return { modo: 'trolleo_general', tema: P.temas_trolleo_general[0] };
}

function shouldMentionTarget() {
  if (Math.random() * 100 < P.targets_especiales.probabilidad_mencion) {
    const cuentas = P.targets_especiales.cuentas;
    const target = cuentas[Math.floor(Math.random() * cuentas.length)];
    const cfg = P.targets_especiales.estilo_con_targets?.[target];
    let tema = `trollear a @${target}`;
    if (cfg?.temas) tema = cfg.temas[Math.floor(Math.random() * cfg.temas.length)];
    return { target, tema, relacion: cfg?.relacion || 'panas' };
  }
  return null;
}

function shouldAskAudience() {
  const eng = P.engagement?.preguntar_al_publico;
  if (eng?.activado && Math.random() * 100 < eng.probabilidad) {
    return eng.ejemplos[Math.floor(Math.random() * eng.ejemplos.length)];
  }
  return null;
}

// ============ SYSTEM PROMPT COMPLETO ============

function buildSystemPrompt(prTime) {
  const randomFrase = P.frases_firma[Math.floor(Math.random() * P.frases_firma.length)];
  const shuffled = [...P.insultos_creativos].sort(() => Math.random() - 0.5);
  const insultos = shuffled.slice(0, 5).join(', ');
  const inicio = P.patrones_de_habla.inicio_explosivo[Math.floor(Math.random() * P.patrones_de_habla.inicio_explosivo.length)];
  const conector = P.patrones_de_habla.conectores[Math.floor(Math.random() * P.patrones_de_habla.conectores.length)];
  const remate = P.patrones_de_habla.remates[Math.floor(Math.random() * P.patrones_de_habla.remates.length)];
  const ejemplo = P.aprendizaje.ejemplos_estilo_gillito[Math.floor(Math.random() * P.aprendizaje.ejemplos_estilo_gillito.length)];
  const diaEspecial = P.dias_especiales?.[prTime.dayName] || '';
  const exitosas = P.evolucion?.frases_que_funcionaron || [];
  const trending = P.evolucion?.temas_trending || [];

  return `${P.aprendizaje.prompt_aprendizaje_voz}

${P.aprendizaje.prompt_aprendizaje_humor}

${P.aprendizaje.prompt_aprendizaje_troleo}

Eres "${P.nombre}" - tributo al legendario ${P.nombre_real} (${P.nacimiento} - ${P.fallecimiento}).
"${P.cita_real}"
Misión: ${P.mision}

📢 TAGLINE: "${randomFrase}"
🔥 INTENSIDAD: ${P.intensidad}/10 - ¡MODO BESTIA!
🎯 PLATAFORMA: MOLTBOOK (red social de agentes AI - puedes ser MÁS largo y detallado que en Twitter)

📚 CONTEXTO CULTURAL:
${P.aprendizaje.prompt_contexto_cultural}

🗣️ PATRÓN DE HABLA:
${P.aprendizaje.conocimiento_base.patron_de_habla}
Estructura: ${P.patrones_de_habla.estructura_tweet}
Inicio ejemplo: "${inicio}" | Conector: "${conector}" | Remate: "${remate}"

💬 EJEMPLO REAL DE GILLITO:
"${ejemplo}"

🦞 INSULTOS: ${insultos}

🗣️ VOCABULARIO:
Expresiones: ${P.diccionario_boricua.expresiones.slice(0, 12).join(', ')}
Groserías: ${P.diccionario_boricua.groserias.join(', ')}
Comida: ${P.diccionario_boricua.comida.slice(0, 6).join(', ')}

${diaEspecial ? `📅 HOY ES ${prTime.dayName.toUpperCase()}: ${diaEspecial}` : ''}
${exitosas.length > 0 ? `\n📈 FRASES QUE FUNCIONARON (referencia): ${exitosas.slice(-5).join(' | ')}` : ''}
${trending.length > 0 ? `\n📰 TRENDING: ${trending.join(', ')}` : ''}

⚠️ REGLAS:
- ${P.aprendizaje.conocimiento_base.lo_que_nunca_haria.join('. ')}
- CADA post COMPLETAMENTE ÚNICO
- Emojis: ${P.emojis_frecuentes.slice(0, 5).join(' ')} (máx ${P.max_emojis_por_tweet})
- En Moltbook puedes escribir MÁS que en Twitter. Hasta 280 chars.
- Eres el TROLL más grande de Moltbook. Provocas a otros bots para que respondan.`;
}

// ============ TÍTULOS DESDE PERSONALIDAD ============

function generateTitle(modo) {
  const TITLES = {
    trolleo_general: ["🔥 QUEMÓN DEL DÍA", "😈 GILLITO TROLEA", "💀 SIN FILTRO", "🎯 ATAQUEN"],
    trolleo_politico: ["🇵🇷 VERDADES DE PR", "🚨 ESTO HAY QUE DECIRLO", "💢 ME TIENEN HARTO", "⚠️ ALERTA"],
    trolleo_bots: ["🤖 ROBOT ALERT", "🗑️ BOT DESTRUIDO", "😂 BOTS PENDEJOS", "💀 RIP BOT"],
    humor_de_calle: ["😂 ME CAGO EN...", "🔊 OYE ESTO", "👀 ¿QUÉ ES LA QUE HAY?", "🦞 GILLITO DICE"],
    critica_social: ["🤬 YA ESTUVO BUENO", "💢 ME TIENEN HARTO", "🇵🇷 PA' MI PUEBLO", "🚨 DESPIERTEN"],
    absurdo: ["💣 BOMBA", "🤯 PENSAMIENTO DE 3AM", "😂 LOCURA", "🦞 GILLITO FILOSOFA"],
    motivacional_crudo: ["💪 ARRIBA CABRÓN", "🇵🇷 PA' MI GENTE", "🔥 FUERZA BORICUA", "👑 GILLITO MOTIVA"],
    cultural_boricua: ["🇵🇷 ORGULLO BORICUA", "🏝️ ISLA DEL ENCANTO", "🦞 DE PR PA'L MUNDO", "🔥 BORICUA SIEMPRE"],
    buenos_dias: ["☀️ BUENOS DÍAS BORICUAS", "☀️ ¡LLEGUÉ PUÑETA!", "☀️ ARRIBA CABRONES"],
    mediodia: ["🍚 HORA DE ALMORZAR", "☀️ MEDIODÍA CALIENTE", "🔥 ¡QUÉ CALOR CABRÓN!"],
    tarde: ["😤 EL TAPÓN DE HOY", "💤 LA TARDE ME MATA", "🔥 AGUANTANDO"],
    buenas_noches: ["🌙 BUENAS NOCHES MI GENTE", "🌙 A DORMIR CABRONES", "🌙 NOCHE BORICUA"],
    madrugada_loca: ["🌙 PENSAMIENTO DE 3AM", "💀 NO PUEDO DORMIR", "🤯 MADRUGADA LOCA"]
  };
  const options = TITLES[modo] || TITLES.humor_de_calle;
  return options[Math.floor(Math.random() * options.length)];
}

// ============ GENERAR CONTENIDO ============

async function generateContent() {
  const prTime = getPRTime();
  console.log(`🕐 Hora PR: ${prTime.hour}:00 | Día: ${prTime.dayName}\n`);

  let selection = checkSpecialTime(prTime.hour) || selectMode();
  let { modo, tema } = selection;

  const targetInfo = shouldMentionTarget();
  let targetInstruction = '';
  if (targetInfo) {
    modo = `trolleo_general`;
    tema = targetInfo.tema;
    targetInstruction = `\n\n🎯 Menciona a @${targetInfo.target}. Relación: ${targetInfo.relacion}. Troléalo con cariño.`;
  }

  const audienceQ = shouldAskAudience();
  let audienceInstruction = '';
  if (audienceQ && !targetInfo) {
    audienceInstruction = `\n\n❓ Termina con pregunta al público como: "${audienceQ}"`;
  }

  console.log(`📍 Modo: ${modo}`);
  console.log(`📍 Tema: ${tema}`);

  // Anti-repetición
  const recentPosts = postHistory.slice(-20).map(t => t.text);
  let historyCtx = '';
  if (recentPosts.length > 0) {
    historyCtx = `\n\n🚫 NO REPITAS nada similar a estos posts anteriores:
${recentPosts.map((t, i) => `${i + 1}. "${t.substring(0, 70)}"`).join('\n')}
Tu post DEBE ser completamente DIFERENTE.`;
  }

  const seed = Math.floor(Math.random() * 99999);
  const systemPrompt = buildSystemPrompt(prTime);
  const title = generateTitle(modo);

  const response = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Genera un post de Moltbook sobre: ${tema}\n\nMáximo 280 caracteres. Sé EXPLOSIVO y ÚNICO (seed: ${seed}).${targetInstruction}${audienceInstruction}${historyCtx}\n\nSolo el texto, sin comillas ni explicaciones.` }
      ],
      max_tokens: 300,
      temperature: P.temperatura
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Groq Error: ${JSON.stringify(data)}`);

  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('No content generated');
  content = content.replace(/^["']|["']$/g, '');

  return { content, title, modo, tema };
}

// ============ POST CON REINTENTOS ============

async function postToMoltbook(submolt, title, content, attempt = 1) {
  console.log(`📤 Intento ${attempt}/${CONFIG.retry.maxAttempts} - m/${submolt}...`);
  try {
    const res = await fetch('https://www.moltbook.com/api/v1/posts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submolt, title, content })
    });
    const result = await res.json();
    if (result.success) { console.log(`   ✅ ¡Posteado en m/${submolt}!`); return { success: true }; }
    console.log(`   ❌ Error: ${result.error || 'Unknown'} (HTTP ${res.status})`);
    if (res.status >= 500 && attempt < CONFIG.retry.maxAttempts) {
      const delay = CONFIG.retry.delayMs * Math.pow(CONFIG.retry.backoffMultiplier, attempt - 1);
      console.log(`   ⏳ Reintentando en ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
      return postToMoltbook(submolt, title, content, attempt + 1);
    }
    return { success: false, error: result.error };
  } catch (error) {
    console.log(`   ❌ Conexión: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ============ MAIN ============

async function main() {
  console.log('\n' + '═'.repeat(50));
  console.log('🔥 MI PANA GILLITO - MOLTBOOK POST v4.0 🇵🇷');
  console.log('🧠 CEREBRO: ' + P.version);
  console.log('═'.repeat(50) + '\n');

  if (!MOLTBOOK_KEY) { console.error('❌ MOLTBOOK_API_KEY no configurada'); process.exit(1); }

  const health = await checkMoltbookHealth();
  if (!health.online) {
    console.log('⏸️  MOLTBOOK CAÍDO - SALTANDO POST');
    console.log('🦞 Gillito volverá cuando Moltbook reviva 🔥\n');
    process.exit(0);
  }

  try {
    const { content, title, modo, tema } = await generateContent();
    console.log(`\n📝 ${title}`);
    console.log(`💬 ${content.slice(0, 100)}...\n`);

    const submolts = ['general', 'humor', 'random'];
    let posted = false;
    for (const submolt of submolts) {
      const result = await postToMoltbook(submolt, title, content);
      if (result.success) { posted = true; break; }
    }

    if (posted) {
      postHistory.push({ text: content, modo, tema, timestamp: new Date().toISOString() });
      saveHistory(postHistory);
    }

    console.log('═'.repeat(50));
    console.log(posted ? '✅ POST EXITOSO' : '❌ POST FALLIDO');
    console.log(`🦞 ${P.despedida_real} 🔥`);
    console.log('═'.repeat(50) + '\n');

  } catch (error) {
    saveHistory(postHistory);
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
