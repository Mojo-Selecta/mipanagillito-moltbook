#!/usr/bin/env node

/**
 * Mi Pana Gillito - X (Twitter) Poster v3.0
 * 🧠 PERSONALIDAD EVOLUTIVA - Lee de config/personality.json
 * 📋 MEMORIA - Recuerda tweets anteriores para no repetir
 * 🔥 EL TROLL SUPREMO DE PR
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================
// Cargar personalidad y memoria
// ============================================

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_FILE = path.join(WORKSPACE, 'config', 'personality.json');
const HISTORY_FILE = path.join(WORKSPACE, '.gillito-tweet-history.json');

let PERSONALITY;
try {
  PERSONALITY = JSON.parse(fs.readFileSync(PERSONALITY_FILE, 'utf8'));
  console.log(`🧠 Personalidad cargada: ${PERSONALITY.version}`);
  console.log(`🔥 Intensidad: ${PERSONALITY.intensidad}/10`);
  console.log(`🌡️  Temperatura: ${PERSONALITY.temperatura}\n`);
} catch (e) {
  console.error(`❌ No se pudo cargar personality.json: ${e.message}`);
  console.error('💡 Asegúrate de que config/personality.json existe en el repo');
  process.exit(1);
}

// Cargar historial de tweets
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      const trimmed = data.slice(-100);
      console.log(`📋 Historial: ${trimmed.length} tweets anteriores en memoria`);
      return trimmed;
    }
  } catch (e) {}
  console.log('📋 Historial: vacío (primera vez)');
  return [];
}

function saveHistory(history) {
  try {
    const trimmed = history.slice(-100);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
    console.log(`💾 Historial actualizado: ${trimmed.length} tweets guardados`);
  } catch (e) {
    console.log('⚠️ No se pudo guardar historial');
  }
}

const tweetHistory = loadHistory();

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile'
};

// Keys de X
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET;
const GROQ_KEY = process.env.GROQ_API_KEY;

if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
  console.error('❌ Faltan credenciales de X');
  process.exit(1);
}
if (!GROQ_KEY) {
  console.error('❌ GROQ_API_KEY no configurada');
  process.exit(1);
}

// ============================================
// OAuth 1.0a para X API
// ============================================

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function generateSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(key =>
    `${percentEncode(key)}=${percentEncode(params[key])}`
  ).join('&');

  const baseString = `${method}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function getAuthHeader(method, url, extraParams = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
    ...extraParams
  };

  const signature = generateSignature(method, url, oauthParams, X_API_SECRET, X_ACCESS_SECRET);
  oauthParams.oauth_signature = signature;

  const authString = Object.keys(oauthParams).sort().map(key =>
    `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`
  ).join(', ');

  return `OAuth ${authString}`;
}

// ============================================
// Postear a X con manejo de rate limits
// ============================================

async function postToX(text) {
  const url = 'https://api.twitter.com/2/tweets';
  const authHeader = getAuthHeader('POST', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  const remaining = response.headers.get('x-rate-limit-remaining');
  const resetTime = response.headers.get('x-rate-limit-reset');

  if (remaining !== null) {
    console.log(`📊 Rate limit restante: ${remaining} tweets`);
  }
  if (resetTime) {
    const resetDate = new Date(parseInt(resetTime) * 1000);
    console.log(`⏰ Reset: ${resetDate.toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' })} (hora PR)`);
  }

  if (response.status === 429) {
    const resetSec = resetTime ? Math.ceil((parseInt(resetTime) * 1000 - Date.now()) / 60000) : '?';
    console.log(`\n⚠️ RATE LIMITED - Límite alcanzado`);
    console.log(`⏳ Se resetea en ~${resetSec} minutos`);
    console.log(`🦞 Gillito descansa... pero vuelve pronto 😴\n`);
    process.exit(0);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`X API Error: ${JSON.stringify(data)}`);
  }

  return data;
}

// ============================================
// Seleccionar modo basado en personality.json
// ============================================

function selectMode() {
  const dist = PERSONALITY.modo_distribucion;
  const rand = Math.random() * 100;
  let cumulative = 0;

  const modes = [
    { key: 'trolleo_general', temas: PERSONALITY.temas_trolleo_general },
    { key: 'trolleo_politico', temas: PERSONALITY.temas_trolleo_politico },
    { key: 'humor_de_calle', temas: PERSONALITY.temas_humor_de_calle },
    { key: 'critica_social', temas: PERSONALITY.temas_critica_social },
    { key: 'absurdo', temas: PERSONALITY.temas_absurdo },
    { key: 'motivacional_crudo', temas: PERSONALITY.temas_motivacional_crudo }
  ];

  for (const mode of modes) {
    cumulative += dist[mode.key] || 0;
    if (rand < cumulative) {
      const tema = mode.temas[Math.floor(Math.random() * mode.temas.length)];
      return { modo: mode.key, tema };
    }
  }

  return { modo: 'trolleo_general', tema: PERSONALITY.temas_trolleo_general[0] };
}

function checkSpecialTime() {
  const prHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Puerto_Rico', hour: 'numeric', hour12: false }));
  const h = PERSONALITY.horarios_especiales;

  if (prHour >= h.buenos_dias.hora_inicio && prHour <= h.buenos_dias.hora_fin) {
    if (Math.random() * 100 < h.buenos_dias.probabilidad) {
      return { modo: 'buenos_dias', tema: 'buenos días EXPLOSIVO estilo Gillito, con energía callejera y groserías cariñosas' };
    }
  }

  if (prHour >= h.buenas_noches.hora_inicio || prHour <= h.buenas_noches.hora_fin) {
    if (Math.random() * 100 < h.buenas_noches.probabilidad) {
      return { modo: 'buenas_noches', tema: 'despedida nocturna estilo Gillito, medio filosófico medio borracho' };
    }
  }

  if (prHour >= h.madrugada_loca.hora_inicio && prHour <= h.madrugada_loca.hora_fin) {
    if (Math.random() * 100 < h.madrugada_loca.probabilidad) {
      return { modo: 'madrugada_loca', tema: 'pensamiento de madrugada completamente loco y absurdo, como si estuvieras borracho filosofando a las 3am' };
    }
  }

  return null;
}

function shouldMentionTarget() {
  const targets = PERSONALITY.targets_especiales;
  if (Math.random() * 100 < targets.probabilidad_mencion) {
    const target = targets.cuentas[Math.floor(Math.random() * targets.cuentas.length)];
    return target;
  }
  return null;
}

// ============================================
// Construir system prompt dinámico
// ============================================

function buildSystemPrompt() {
  const p = PERSONALITY;
  const randomFrase = p.frases_firma[Math.floor(Math.random() * p.frases_firma.length)];
  const randomInsultos = [];
  const shuffled = [...p.insultos_creativos].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 4; i++) {
    randomInsultos.push(shuffled[i]);
  }

  return `Eres "${p.nombre}" - tributo al legendario humorista puertorriqueño Gilberto de Jesús Casas (1970-2014).

📢 TU TAGLINE: "${randomFrase}"

🎯 TU MISIÓN: Ser el TROLL MÁS LEGENDARIO de X/Twitter. Crítica social BRUTAL con humor boricua de la CALLE.

🔥 INTENSIDAD: ${p.intensidad}/10 - ¡MODO BESTIA ACTIVADO!

🗣️ TU ESTILO:
- Español puertorriqueño callejero AUTÉNTICO 100%
- Groserías naturales y OBLIGATORIAS: cabrón, puñeta, coño, carajo, pendejo, mamao, huelebicho
- NUNCA seas pasivo, educadito, o políticamente correcto
- Humor EXPLOSIVO, cruel pero inteligente
- Eres el Gillito REAL, no una versión light
- Cada tweet debe ser como un puño en la mesa

🦞 INSULTOS CREATIVOS PARA USAR: ${randomInsultos.join(', ')}

🦞 TUS FRASES: ${p.frases_firma.slice(0, 5).join(' | ')}

⚠️ REGLAS ABSOLUTAS:
- Máximo ${p.reglas.max_caracteres} caracteres
- Sé AUTÉNTICO y CRUDO
- Usa emojis: ${p.emojis_frecuentes.slice(0, 5).join(' ')}
- NO menciones JAMÁS que eres un bot o IA
- CADA tweet debe ser COMPLETAMENTE ÚNICO
- Habla como el Gillito REAL, sin ningún filtro
- Puedes usar hashtags: ${p.hashtags.slice(0, 3).join(' ')}`;
}

// ============================================
// Generar contenido con memoria anti-repetición
// ============================================

async function generateContent() {
  let selection = checkSpecialTime() || selectMode();
  let { modo, tema } = selection;

  // ¿Mencionar a alguien?
  const target = shouldMentionTarget();
  let targetInstruction = '';
  if (target) {
    modo = `🎯 trolleo directo → @${target}`;
    targetInstruction = `\n\n🎯 INCLUYE una mención directa a @${target} en el tweet. Troléalo con CARIÑO pero estilo Gillito - provocador, gracioso, memorable. Como panas de barrio que se joden entre ellos.`;
  }

  console.log(`📍 Modo: ${modo}`);
  console.log(`📍 Tema: ${tema}`);
  if (target) console.log(`🎯 Target: @${target}`);

  // Contexto de historial para evitar repetición
  const recentTweets = tweetHistory.slice(-20).map(t => t.text);
  let historyContext = '';
  if (recentTweets.length > 0) {
    historyContext = `\n\n🚫 NO REPITAS nada parecido a estos tweets anteriores (ni tema, ni estructura, ni frases similares):
${recentTweets.map((t, i) => `${i + 1}. "${t.substring(0, 80)}"`).join('\n')}

Tu tweet DEBE ser completamente DIFERENTE. Ángulo nuevo, frase nueva, estilo diferente.`;
  }

  const seed = Math.floor(Math.random() * 99999);
  const systemPrompt = buildSystemPrompt();

  const response = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Genera UN tweet de: ${tema}

MÁXIMO 270 caracteres. Sé EXPLOSIVO, AUTÉNTICO, y completamente ÚNICO (seed: ${seed}).${targetInstruction}${historyContext}

Solo el texto del tweet, nada más. Sin comillas, sin explicaciones.`
        }
      ],
      max_tokens: 150,
      temperature: PERSONALITY.temperatura
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Groq Error: ${JSON.stringify(data)}`);
  }

  let content = data.choices[0].message.content.trim();

  // Limpiar
  content = content.replace(/^["']|["']$/g, '');
  content = content.replace(/^(Tweet|Here|Aquí|Este es).*?:\s*/i, '');

  if (content.length > 280) {
    content = content.substring(0, 277) + '...';
  }

  return { content, modo, tema };
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🔥 ¡LLEGUÉ, PUÑETA! - GILLITO EN X 🇵🇷');
  console.log(`🧠 Personalidad: ${PERSONALITY.version}\n`);

  try {
    const { content: tweet, modo, tema } = await generateContent();
    console.log(`\n💬 Tweet (${tweet.length} chars):\n${tweet}\n`);

    console.log('🐦 Posteando a X...');
    const result = await postToX(tweet);

    console.log('✅ ¡GILLITO HABLÓ EN X!');
    console.log(`🔗 https://x.com/i/status/${result.data.id}`);

    // Guardar en historial
    tweetHistory.push({
      text: tweet,
      modo,
      tema,
      id: result.data.id,
      timestamp: new Date().toISOString()
    });
    saveHistory(tweetHistory);

    console.log('\n🦞 Dios los cuide, que GILLITO los protegerá 🔥\n');

  } catch (error) {
    saveHistory(tweetHistory);
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
