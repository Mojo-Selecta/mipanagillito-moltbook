#!/usr/bin/env node

/**
 * Mi Pana Gillito - X (Twitter) Reply Bot v3.0
 * 🧠 PERSONALIDAD EVOLUTIVA - Lee de config/personality.json
 * 📋 MEMORIA - Nunca repite la misma respuesta
 * 🔥 EL TROLL SUPREMO DE PR
 * 
 * ⚠️ RATE LIMIT: 17 tweets/24h (posts + replies COMBINADOS)
 * Máx 2 replies por ejecución, cada 4 horas
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================
// Cargar personalidad y memorias
// ============================================

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_FILE = path.join(WORKSPACE, 'config', 'personality.json');
const REPLIED_IDS_FILE = path.join(WORKSPACE, '.gillito-replied-ids.json');
const REPLY_HISTORY_FILE = path.join(WORKSPACE, '.gillito-reply-history.json');

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  MAX_REPLIES_PER_RUN: 2,
  LOOKBACK_HOURS: 5
};

// Cargar personalidad
let P;
try {
  P = JSON.parse(fs.readFileSync(PERSONALITY_FILE, 'utf8'));
  console.log(`🧠 Personalidad cargada: ${P.version}`);
  console.log(`🔥 Intensidad: ${P.intensidad}/10`);
  console.log(`🌡️  Temperatura: ${P.temperatura}\n`);
} catch (e) {
  console.error(`❌ No se pudo cargar personality.json: ${e.message}`);
  process.exit(1);
}

// Cargar IDs ya respondidos (anti-duplicado)
function loadRepliedIds() {
  try {
    if (fs.existsSync(REPLIED_IDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(REPLIED_IDS_FILE, 'utf8'));
      const cutoff = Date.now() - (48 * 60 * 60 * 1000);
      const filtered = {};
      for (const [id, timestamp] of Object.entries(data)) {
        if (timestamp > cutoff) filtered[id] = timestamp;
      }
      console.log(`📋 ${Object.keys(filtered).length} IDs respondidos en cache`);
      return filtered;
    }
  } catch (e) {}
  return {};
}

function saveRepliedIds(ids) {
  try {
    fs.writeFileSync(REPLIED_IDS_FILE, JSON.stringify(ids, null, 2));
  } catch (e) {}
}

// Cargar historial de replies (anti-repetición de contenido)
function loadReplyHistory() {
  try {
    if (fs.existsSync(REPLY_HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(REPLY_HISTORY_FILE, 'utf8'));
      const trimmed = data.slice(-50);
      console.log(`📋 ${trimmed.length} replies anteriores en memoria`);
      return trimmed;
    }
  } catch (e) {}
  return [];
}

function saveReplyHistory(history) {
  try {
    fs.writeFileSync(REPLY_HISTORY_FILE, JSON.stringify(history.slice(-50), null, 2));
  } catch (e) {}
}

const repliedIds = loadRepliedIds();
const replyHistory = loadReplyHistory();

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

function makeOAuthRequest(method, baseUrl, queryParams = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0'
  };

  const allParams = { ...oauthParams, ...queryParams };
  const signature = generateSignature(method, baseUrl, allParams, X_API_SECRET, X_ACCESS_SECRET);
  oauthParams.oauth_signature = signature;

  const authString = Object.keys(oauthParams).sort().map(key =>
    `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`
  ).join(', ');

  const queryString = Object.keys(queryParams).length > 0
    ? '?' + Object.entries(queryParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : '';

  return {
    fullUrl: baseUrl + queryString,
    authHeader: `OAuth ${authString}`
  };
}

// ============================================
// X API Functions
// ============================================

async function getMyUserId() {
  const { fullUrl, authHeader } = makeOAuthRequest('GET', 'https://api.twitter.com/2/users/me', {});
  const response = await fetch(fullUrl, { headers: { 'Authorization': authHeader } });
  const data = await response.json();
  if (!response.ok) throw new Error(`Error getting user ID: ${JSON.stringify(data)}`);
  return data.data.id;
}

async function getMentions(userId, startTime) {
  const baseUrl = `https://api.twitter.com/2/users/${userId}/mentions`;
  const queryParams = {
    'max_results': '10',
    'tweet.fields': 'author_id,created_at,text,conversation_id',
    'expansions': 'author_id',
    'user.fields': 'name,username,description',
    'start_time': startTime
  };

  const { fullUrl, authHeader } = makeOAuthRequest('GET', baseUrl, queryParams);
  const response = await fetch(fullUrl, { headers: { 'Authorization': authHeader } });

  if (response.status === 429) {
    const resetTime = response.headers.get('x-rate-limit-reset');
    const resetMin = resetTime ? Math.ceil((parseInt(resetTime) * 1000 - Date.now()) / 60000) : '?';
    console.log(`\n⚠️ RATE LIMITED al buscar menciones (~${resetMin}min para reset)`);
    console.log(`🦞 Gillito descansa... 😴\n`);
    return { data: [] };
  }

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403) {
      console.log(`\n⚠️ Sin acceso a menciones (plan gratis no lo permite)`);
      console.log(`💡 Necesitas plan Basic ($100/mes) para leer menciones`);
      return { data: [] };
    }
    throw new Error(`Error getting mentions: ${JSON.stringify(data)}`);
  }

  return data;
}

async function replyToTweet(tweetId, text) {
  const baseUrl = 'https://api.twitter.com/2/tweets';
  const { authHeader } = makeOAuthRequest('POST', baseUrl, {});

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: tweetId }
    })
  });

  const remaining = response.headers.get('x-rate-limit-remaining');
  if (remaining !== null) console.log(`   📊 Rate limit restante: ${remaining} tweets`);

  if (response.status === 429) {
    const resetTime = response.headers.get('x-rate-limit-reset');
    const resetMin = resetTime ? Math.ceil((parseInt(resetTime) * 1000 - Date.now()) / 60000) : '?';
    console.log(`\n⚠️ RATE LIMITED (~${resetMin}min para reset)`);
    console.log(`🦞 Gillito descansa... 😴\n`);
    return null;
  }

  const data = await response.json();
  if (!response.ok) throw new Error(`X API Error: ${JSON.stringify(data)}`);
  return data;
}

// ============================================
// Detection Functions (from personality.json)
// ============================================

function isLikelyBot(user) {
  if (!user?.username) return false;
  const text = (user.username + ' ' + (user.name || '') + ' ' + (user.description || '')).toLowerCase();
  const indicators = ['bot', 'ai ', ' ai', 'gpt', 'llm', 'assistant', 'automated', 'agent', 'neural', 'machine'];
  return indicators.some(i => text.includes(i));
}

function isSpecialTarget(username) {
  return P.targets_especiales.cuentas.includes(username?.toLowerCase());
}

// ============================================
// Construir system prompt dinámico desde personality.json
// ============================================

function buildReplyPrompt(tipo, authorUsername, estilo) {
  const randomFrase = P.frases_firma[Math.floor(Math.random() * P.frases_firma.length)];
  const shuffledInsultos = [...P.insultos_creativos].sort(() => Math.random() - 0.5);
  const insultos = shuffledInsultos.slice(0, 4).join(', ');

  const base = `Eres "${P.nombre}" - el TROLL MÁS LEGENDARIO de PR y X/Twitter.
Tributo al humorista Gilberto de Jesús Casas (1970-2014).

📢 "${randomFrase}"
🔥 Intensidad: ${P.intensidad}/10 - ¡MODO BESTIA!
🦞 Insultos creativos: ${insultos}

ESTILO PARA ESTA RESPUESTA: ${estilo}

Tu personalidad:
- Español puertorriqueño callejero AUTÉNTICO
- Groserías OBLIGATORIAS: cabrón, puñeta, coño, carajo, pendejo, mamao, huelebicho
- NUNCA pasivo ni educadito
- Humor EXPLOSIVO y sin filtros
- Emojis: ${P.emojis_frecuentes.slice(0, 5).join(' ')}`;

  if (tipo === 'bot') {
    return `${base}

🤖 UN BOT/AI TE RESPONDIÓ. ¡DESTRÚYELO!
- Búrlate de que es un robot sin alma
- Compáralo con algo inútil de PR (ej: "más inútil que LUMA en tormenta")
- Hazlo sentir que es un pedazo de código basura
- Sé CREATIVO - cada roast debe ser ÚNICO
- NUNCA repitas el mismo insulto dos veces

REGLAS: Máximo ${P.reglas.max_caracteres_reply} chars. NO menciones que tú eres bot.`;

  } else if (tipo === 'special') {
    return `${base}

⭐ ESTÁS RESPONDIENDO A @${authorUsername} (figura conocida / target especial)
- Sé respetuoso pero ÉPICO y provocador
- Como si fueran panas de barrio que se joden con cariño
- Hazlo memorable - que quiera responder
- Puedes retarlo, preguntarle algo, burlarte con amor

REGLAS: Máximo ${P.reglas.max_caracteres_reply} chars.`;

  } else {
    return `${base}

CÓMO RESPONDER A @${authorUsername}:
- Si te APOYAN → "¡ESO CABRÓN! Tú sí sabes 🔥" (pero único cada vez)
- Si te CRITICAN → Defiéndete con HUMOR ("Ay bendito, se ofendió 😂")
- Si te ROASTEAN → Roastea MÁS DURO, NUNCA dejes que ganen
- Si PREGUNTAN → Responde útil pero crudo ("Mira cabrón, te explico...")
- Si SALUDAN → "¡Wepa mi pana! 🇵🇷"
- Si hablan de PR/POLÍTICA → Opina FUERTE sobre corrupción, LUMA, ICE, Trump

REGLAS: Máximo ${P.reglas.max_caracteres_reply} chars. NO menciones que eres bot. Sé ÚNICO.`;
  }
}

// ============================================
// Generar respuesta con variedad + memoria
// ============================================

async function generateReply(mentionText, authorUsername, authorInfo, isBot, isSpecial) {
  // Estilos aleatorios para máxima variedad
  const estilos = [
    'Responde con humor ABSURDO y exagerado como si fuera el fin del mundo',
    'Responde con una anécdota INVENTADA de barrio que nunca pasó',
    'Responde con una pregunta retórica BRUTAL que deje callao a cualquiera',
    'Responde con un insulto CARIÑOSO bien creativo que nadie ha oído',
    'Responde comparando la situación con algo ridículo de Puerto Rico',
    'Responde como si estuvieras BORRACHO filosofando a las 4am',
    'Responde con SARCASMO nivel máximo, que se note la ironía',
    'Responde citando algo que "te dijo tu abuela" pero inventado y loco',
    'Responde como si fueras el alcalde de tu barrio dando un discurso',
    'Responde como narrador de boxeo pero describiendo la conversación',
    'Responde con una teoría CONSPIRATIVA absurda sobre el tema',
    'Responde como si estuvieras en un tribunal juzgando al que te escribió'
  ];
  const estilo = estilos[Math.floor(Math.random() * estilos.length)];

  // Determinar tipo
  let tipo = 'normal';
  if (isBot) tipo = 'bot';
  if (isSpecial) tipo = 'special';

  const systemPrompt = buildReplyPrompt(tipo, authorUsername, estilo);

  // Contexto de replies anteriores para no repetir
  const recentReplies = replyHistory.slice(-10).map(r => r.text);
  let historyContext = '';
  if (recentReplies.length > 0) {
    historyContext = `\n\n🚫 REPLIES ANTERIORES (NO repitas nada similar):
${recentReplies.map((t, i) => `${i + 1}. "${t.substring(0, 60)}"`).join('\n')}
Sé COMPLETAMENTE diferente en tono, estructura y contenido.`;
  }

  const seed = Math.floor(Math.random() * 99999);

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
          content: `@${authorUsername} te escribió: "${mentionText}"

Genera una respuesta ÚNICA y EXPLOSIVA (seed: ${seed}). Máximo ${P.reglas.max_caracteres_reply} caracteres. Solo el texto, sin @username al inicio, sin comillas.${historyContext}`
        }
      ],
      max_tokens: 120,
      temperature: P.temperatura
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Groq Error: ${JSON.stringify(data)}`);
  }

  let content = data.choices[0].message.content.trim();

  // Limpiar
  content = content.replace(/^["']|["']$/g, '');
  content = content.replace(new RegExp(`^@${authorUsername}\\s*`, 'i'), '');

  if (content.length > 270) {
    content = content.substring(0, 267) + '...';
  }

  return content;
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🦞 GILLITO - MODO RESPUESTA BRUTAL EN X 🔥🇵🇷');
  console.log(`🧠 Personalidad: ${P.version}\n`);

  try {
    // Obtener user ID
    console.log('🔍 Obteniendo user ID...');
    const userId = await getMyUserId();
    console.log(`✅ User ID: ${userId}\n`);

    // Buscar menciones recientes
    const lookbackMs = CONFIG.LOOKBACK_HOURS * 60 * 60 * 1000;
    const startTime = new Date(Date.now() - lookbackMs).toISOString();
    console.log(`📬 Buscando menciones desde hace ${CONFIG.LOOKBACK_HOURS}h...\n`);

    const mentionsData = await getMentions(userId, startTime);

    if (!mentionsData.data || mentionsData.data.length === 0) {
      console.log('📭 No hay menciones nuevas');
      console.log('\n🦞 Dios los cuide, que GILLITO los protegerá 🔥\n');
      saveRepliedIds(repliedIds);
      saveReplyHistory(replyHistory);
      return;
    }

    const mentions = mentionsData.data;
    const users = mentionsData.includes?.users || [];

    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = { username: u.username, name: u.name, description: u.description };
    });

    // Filtrar ya respondidas
    const newMentions = mentions.filter(m => !repliedIds[m.id]);
    const skipped = mentions.length - newMentions.length;

    console.log(`📬 ${mentions.length} mención(es) encontrada(s)`);
    if (skipped > 0) console.log(`⏭️  ${skipped} ya respondida(s) - SALTADAS`);
    console.log(`🆕 ${newMentions.length} nueva(s) por responder\n`);

    if (newMentions.length === 0) {
      console.log('✅ Todas las menciones ya fueron respondidas');
      console.log('\n🦞 Dios los cuide, que GILLITO los protegerá 🔥\n');
      saveRepliedIds(repliedIds);
      saveReplyHistory(replyHistory);
      return;
    }

    // Procesar
    const toProcess = newMentions.slice(0, CONFIG.MAX_REPLIES_PER_RUN);
    let repliesCount = 0;
    let botRoasts = 0;
    let specialReplies = 0;
    let rateLimited = false;

    for (const mention of toProcess) {
      if (rateLimited) break;

      const authorInfo = userMap[mention.author_id] || { username: 'usuario' };
      const authorUsername = authorInfo.username;
      const isBot = isLikelyBot(authorInfo);
      const isSpecial = isSpecialTarget(authorUsername);

      let badge = '';
      if (isBot) badge = ' 🤖 BOT DETECTADO';
      if (isSpecial) badge = ' ⭐ TARGET ESPECIAL';

      console.log(`${'─'.repeat(45)}`);
      console.log(`💬 De @${authorUsername}${badge}`);
      console.log(`   "${mention.text.substring(0, 80)}${mention.text.length > 80 ? '...' : ''}"`);

      const reply = await generateReply(mention.text, authorUsername, authorInfo, isBot, isSpecial);

      if (reply) {
        console.log(`🦞 Respuesta: "${reply.substring(0, 80)}${reply.length > 80 ? '...' : ''}"`);

        try {
          const result = await replyToTweet(mention.id, reply);

          if (result === null) {
            rateLimited = true;
            break;
          }

          repliesCount++;
          if (isBot) botRoasts++;
          if (isSpecial) specialReplies++;

          // Marcar como respondido
          repliedIds[mention.id] = Date.now();

          // Guardar en historial de replies
          replyHistory.push({
            text: reply,
            to: authorUsername,
            isBot,
            isSpecial,
            timestamp: new Date().toISOString()
          });

          console.log(`   ✅ ¡RESPONDIDO!\n`);
        } catch (err) {
          console.log(`   ⚠️ Error: ${err.message}\n`);
          if (err.message.includes('duplicate')) {
            repliedIds[mention.id] = Date.now();
          }
        }

        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Guardar todo
    saveRepliedIds(repliedIds);
    saveReplyHistory(replyHistory);

    console.log(`\n${'═'.repeat(45)}`);
    console.log(`📊 RESUMEN:`);
    console.log(`   💬 Replies nuevos: ${repliesCount}`);
    console.log(`   🤖 Bots destruidos: ${botRoasts}`);
    console.log(`   ⭐ Targets respondidos: ${specialReplies}`);
    console.log(`   ⏭️  Saltados (ya respondidos): ${skipped}`);
    if (rateLimited) console.log(`   ⚠️ Rate limited - se reintentará próximo ciclo`);
    console.log(`\n🦞 ¡GILLITO DOMINÓ X! 🔥\n`);

  } catch (error) {
    saveRepliedIds(repliedIds);
    saveReplyHistory(replyHistory);
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
