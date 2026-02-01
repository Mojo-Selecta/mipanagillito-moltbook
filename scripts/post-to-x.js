#!/usr/bin/env node

/**
 * Mi Pana Gillito - X (Twitter) Poster v4.0
 * 🧠 CEREBRO COMPLETO - Lee TODO de config/personality.json
 * 📋 MEMORIA - Nunca repite tweets
 * 🎓 APRENDIZAJE - Usa prompts de aprendizaje de Groq para imitar al Gillito real
 * 🔥 EL TROLL SUPREMO DE PR
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_FILE = path.join(WORKSPACE, 'config', 'personality.json');
const HISTORY_FILE = path.join(WORKSPACE, '.gillito-tweet-history.json');

// ============================================
// Cargar cerebro y memoria
// ============================================

let P;
try {
  P = JSON.parse(fs.readFileSync(PERSONALITY_FILE, 'utf8'));
  console.log(`🧠 Cerebro cargado: ${P.version}`);
  console.log(`🔥 Intensidad: ${P.intensidad}/10 | 🌡️ Temp: ${P.temperatura}`);
  console.log(`📊 Distribución: ${Object.entries(P.modo_distribucion).map(([k,v]) => `${k}:${v}%`).join(' | ')}\n`);
} catch (e) {
  console.error(`❌ No se pudo cargar personality.json: ${e.message}`);
  process.exit(1);
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      const trimmed = data.slice(-100);
      console.log(`📋 Memoria: ${trimmed.length} tweets anteriores`);
      return trimmed;
    }
  } catch (e) {}
  console.log('📋 Memoria: vacía (primera vez)');
  return [];
}

function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-100), null, 2));
  } catch (e) {}
}

const tweetHistory = loadHistory();

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile'
};

const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET;
const GROQ_KEY = process.env.GROQ_API_KEY;

if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) { console.error('❌ Faltan credenciales de X'); process.exit(1); }
if (!GROQ_KEY) { console.error('❌ GROQ_API_KEY no configurada'); process.exit(1); }

// ============================================
// OAuth 1.0a
// ============================================

function percentEncode(str) { return encodeURIComponent(str).replace(/!/g,'%21').replace(/\*/g,'%2A').replace(/'/g,'%27').replace(/\(/g,'%28').replace(/\)/g,'%29'); }
function generateNonce() { return crypto.randomBytes(16).toString('hex'); }

function generateSignature(method, url, params, cs, ts) {
  const sorted = Object.keys(params).sort().map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const base = `${method}&${percentEncode(url)}&${percentEncode(sorted)}`;
  return crypto.createHmac('sha1', `${percentEncode(cs)}&${percentEncode(ts)}`).update(base).digest('base64');
}

function getAuthHeader(method, url) {
  const ts = Math.floor(Date.now()/1000).toString();
  const nonce = generateNonce();
  const op = { oauth_consumer_key:X_API_KEY, oauth_nonce:nonce, oauth_signature_method:'HMAC-SHA1', oauth_timestamp:ts, oauth_token:X_ACCESS_TOKEN, oauth_version:'1.0' };
  op.oauth_signature = generateSignature(method, url, op, X_API_SECRET, X_ACCESS_SECRET);
  return `OAuth ${Object.keys(op).sort().map(k => `${percentEncode(k)}="${percentEncode(op[k])}"`).join(', ')}`;
}

// ============================================
// Postear con rate limit handling
// ============================================

async function postToX(text) {
  const url = 'https://api.twitter.com/2/tweets';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': getAuthHeader('POST', url), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  const remaining = response.headers.get('x-rate-limit-remaining');
  const resetTime = response.headers.get('x-rate-limit-reset');
  if (remaining !== null) console.log(`📊 Rate limit restante: ${remaining} tweets`);
  if (resetTime) console.log(`⏰ Reset: ${new Date(parseInt(resetTime)*1000).toLocaleString('es-PR',{timeZone:'America/Puerto_Rico'})} (hora PR)`);

  if (response.status === 429) {
    const min = resetTime ? Math.ceil((parseInt(resetTime)*1000 - Date.now())/60000) : '?';
    console.log(`\n⚠️ RATE LIMITED (~${min}min para reset)\n🦞 Gillito descansa... 😴\n`);
    process.exit(0);
  }

  const data = await response.json();
  if (!response.ok) throw new Error(`X API Error: ${JSON.stringify(data)}`);
  return data;
}

// ============================================
// Inteligencia: Selección de modo
// ============================================

function getPRTime() {
  const now = new Date();
  const prStr = now.toLocaleString('en-US', { timeZone: 'America/Puerto_Rico' });
  const prDate = new Date(prStr);
  return { hour: prDate.getHours(), day: prDate.getDay(), dayName: ['domingo','lunes','martes','miércoles','jueves','viernes','sabado'][prDate.getDay()] };
}

function checkSpecialTime(hour) {
  const h = P.horarios_especiales;
  const checks = [
    { key: 'buenos_dias', range: [h.buenos_dias.hora_inicio, h.buenos_dias.hora_fin], prob: h.buenos_dias.probabilidad, tema: h.buenos_dias.estilo },
    { key: 'mediodia', range: [h.mediodia.hora_inicio, h.mediodia.hora_fin], prob: h.mediodia.probabilidad, tema: h.mediodia.estilo },
    { key: 'tarde', range: [h.tarde.hora_inicio, h.tarde.hora_fin], prob: h.tarde.probabilidad, tema: h.tarde.estilo },
    { key: 'buenas_noches', range: [h.buenas_noches.hora_inicio, h.buenas_noches.hora_fin], prob: h.buenas_noches.probabilidad, tema: h.buenas_noches.estilo },
    { key: 'madrugada_loca', range: [h.madrugada_loca.hora_inicio, h.madrugada_loca.hora_fin], prob: h.madrugada_loca.probabilidad, tema: h.madrugada_loca.estilo }
  ];

  for (const c of checks) {
    const inRange = c.range[0] <= c.range[1]
      ? (hour >= c.range[0] && hour <= c.range[1])
      : (hour >= c.range[0] || hour <= c.range[1]);
    if (inRange && Math.random() * 100 < c.prob) {
      return { modo: c.key, tema: c.tema };
    }
  }
  return null;
}

function selectMode() {
  const dist = P.modo_distribucion;
  const rand = Math.random() * 100;
  let cum = 0;
  const modes = Object.entries(dist).map(([key, pct]) => {
    const temasKey = `temas_${key}`;
    return { key, pct, temas: P[temasKey] || [] };
  });

  for (const m of modes) {
    cum += m.pct;
    if (rand < cum && m.temas.length > 0) {
      return { modo: m.key, tema: m.temas[Math.floor(Math.random() * m.temas.length)] };
    }
  }
  return { modo: 'trolleo_general', tema: P.temas_trolleo_general[0] };
}

function shouldMentionTarget() {
  if (Math.random() * 100 < P.targets_especiales.probabilidad_mencion) {
    const cuentas = P.targets_especiales.cuentas;
    const target = cuentas[Math.floor(Math.random() * cuentas.length)];
    const targetConfig = P.targets_especiales.estilo_con_targets?.[target];
    let tema = `trollear a @${target} con cariño`;
    if (targetConfig?.temas) {
      tema = targetConfig.temas[Math.floor(Math.random() * targetConfig.temas.length)];
    }
    return { target, tema, relacion: targetConfig?.relacion || 'panas' };
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

// ============================================
// Construir system prompt con TODO el cerebro
// ============================================

function buildSystemPrompt(prTime) {
  const randomFrase = P.frases_firma[Math.floor(Math.random() * P.frases_firma.length)];
  const shuffled = [...P.insultos_creativos].sort(() => Math.random() - 0.5);
  const insultos = shuffled.slice(0, 5).join(', ');
  const inicio = P.patrones_de_habla.inicio_explosivo[Math.floor(Math.random() * P.patrones_de_habla.inicio_explosivo.length)];
  const conector = P.patrones_de_habla.conectores[Math.floor(Math.random() * P.patrones_de_habla.conectores.length)];
  const remate = P.patrones_de_habla.remates[Math.floor(Math.random() * P.patrones_de_habla.remates.length)];

  // Ejemplos reales de Gillito (del sistema de aprendizaje)
  const ejemplos = P.aprendizaje.ejemplos_estilo_gillito;
  const ejemploRandom = ejemplos[Math.floor(Math.random() * ejemplos.length)];

  // Día especial
  const diaEspecial = P.dias_especiales?.[prTime.dayName] || '';

  // Frases que funcionaron (del sistema de evolución)
  const exitosas = P.evolucion?.frases_que_funcionaron || [];
  let exitosasCtx = '';
  if (exitosas.length > 0) {
    exitosasCtx = `\n\n📈 FRASES QUE HAN FUNCIONADO BIEN (úsalas como referencia de estilo): ${exitosas.slice(-5).join(' | ')}`;
  }

  // Trending
  const trending = P.evolucion?.temas_trending || [];
  let trendingCtx = '';
  if (trending.length > 0) {
    trendingCtx = `\n\n📰 TEMAS TRENDING AHORA: ${trending.join(', ')}. Puedes referenciar estos temas si encajan.`;
  }

  return `${P.aprendizaje.prompt_aprendizaje_voz}

${P.aprendizaje.prompt_aprendizaje_humor}

${P.aprendizaje.prompt_aprendizaje_troleo}

Eres "${P.nombre}" - tributo al legendario ${P.nombre_real} (${P.nacimiento} - ${P.fallecimiento}).
"${P.cita_real}"

📢 TAGLINE: "${randomFrase}"
🔥 INTENSIDAD: ${P.intensidad}/10 - ¡MODO BESTIA!
🌡️ CREATIVIDAD: MÁXIMA

📚 CONTEXTO CULTURAL:
${P.aprendizaje.prompt_contexto_cultural}

🗣️ PATRÓN DE HABLA:
${P.aprendizaje.conocimiento_base.patron_de_habla}
Estructura: ${P.patrones_de_habla.estructura_tweet}
Ejemplo de inicio: "${inicio}"
Ejemplo de conector: "${conector}"
Ejemplo de remate: "${remate}"

💬 EJEMPLO REAL DE GILLITO:
"${ejemploRandom}"

🦞 INSULTOS CREATIVOS: ${insultos}

🗣️ VOCABULARIO BORICUA (usa naturalmente):
Expresiones: ${P.diccionario_boricua.expresiones.slice(0, 10).join(', ')}
Groserías: ${P.diccionario_boricua.groserias.join(', ')}

${diaEspecial ? `📅 HOY ES ${prTime.dayName.toUpperCase()}: ${diaEspecial}` : ''}
${exitosasCtx}${trendingCtx}

⚠️ REGLAS ABSOLUTAS:
- Máximo ${P.reglas.max_caracteres} caracteres
- ${P.aprendizaje.conocimiento_base.lo_que_nunca_haria.join('. ')}
- CADA tweet COMPLETAMENTE ÚNICO
- Emojis: ${P.emojis_frecuentes.slice(0, 5).join(' ')} (máx ${P.max_emojis_por_tweet})`;
}

// ============================================
// Generar contenido con cerebro completo
// ============================================

async function generateContent() {
  const prTime = getPRTime();
  console.log(`🕐 Hora PR: ${prTime.hour}:00 | Día: ${prTime.dayName}`);

  // Seleccionar modo
  let selection = checkSpecialTime(prTime.hour) || selectMode();
  let { modo, tema } = selection;

  // ¿Mencionar target?
  const targetInfo = shouldMentionTarget();
  let targetInstruction = '';
  if (targetInfo) {
    modo = `🎯 trolleo directo → @${targetInfo.target}`;
    tema = targetInfo.tema;
    targetInstruction = `\n\n🎯 INCLUYE mención a @${targetInfo.target}. Relación: ${targetInfo.relacion}. Tema: ${tema}. Sé provocador con cariño, como panas de barrio.`;
  }

  // ¿Pregunta al público?
  const audienceQ = shouldAskAudience();
  let audienceInstruction = '';
  if (audienceQ && !targetInfo) {
    audienceInstruction = `\n\n❓ TERMINA el tweet con una pregunta al público como: "${audienceQ}" (adáptala al tema)`;
  }

  // ¿Hashtag?
  let hashtagInstruction = '';
  if (P.usar_hashtags && Math.random() * 100 < P.probabilidad_hashtag) {
    const contextKey = modo.includes('politic') ? 'politica' : modo.includes('absurdo') ? 'humor' : modo.includes('cultural') ? 'cultural' : 'humor';
    const tags = P.hashtags_por_tema?.[contextKey] || P.hashtags;
    const tag = tags[Math.floor(Math.random() * tags.length)];
    hashtagInstruction = `\n\n# Incluye el hashtag ${tag} de forma natural al final si cabe.`;
  }

  console.log(`📍 Modo: ${modo}`);
  console.log(`📍 Tema: ${tema}`);

  // Historial anti-repetición
  const recentTweets = tweetHistory.slice(-20).map(t => t.text);
  let historyCtx = '';
  if (recentTweets.length > 0) {
    historyCtx = `\n\n🚫 NO REPITAS nada similar a estos tweets anteriores:
${recentTweets.map((t, i) => `${i + 1}. "${t.substring(0, 70)}"`).join('\n')}
Tu tweet DEBE ser completamente DIFERENTE.`;
  }

  const seed = Math.floor(Math.random() * 99999);
  const systemPrompt = buildSystemPrompt(prTime);

  const response = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Genera UN tweet de: ${tema}\n\nMÁXIMO 270 caracteres. Sé EXPLOSIVO y ÚNICO (seed: ${seed}).${targetInstruction}${audienceInstruction}${hashtagInstruction}${historyCtx}\n\nSolo el texto del tweet. Sin comillas ni explicaciones.` }
      ],
      max_tokens: 150,
      temperature: P.temperatura
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Groq Error: ${JSON.stringify(data)}`);

  let content = data.choices[0].message.content.trim();
  content = content.replace(/^["']|["']$/g, '');
  content = content.replace(/^(Tweet|Here|Aquí|Este es).*?:\s*/i, '');
  if (content.length > 280) content = content.substring(0, 277) + '...';

  return { content, modo, tema };
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🔥 ¡LLEGUÉ, PUÑETA! - GILLITO EN X 🇵🇷');
  console.log(`🧠 ${P.version}\n`);

  try {
    const { content: tweet, modo, tema } = await generateContent();
    console.log(`\n💬 Tweet (${tweet.length} chars):\n${tweet}\n`);

    console.log('🐦 Posteando a X...');
    const result = await postToX(tweet);

    console.log('✅ ¡GILLITO HABLÓ EN X!');
    console.log(`🔗 https://x.com/i/status/${result.data.id}`);

    tweetHistory.push({ text: tweet, modo, tema, id: result.data.id, timestamp: new Date().toISOString() });
    saveHistory(tweetHistory);

    console.log(`\n🦞 ${P.despedida_real} 🔥\n`);

  } catch (error) {
    saveHistory(tweetHistory);
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
