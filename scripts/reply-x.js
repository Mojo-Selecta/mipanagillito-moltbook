#!/usr/bin/env node

/**
 * Mi Pana Gillito - X (Twitter) Reply Bot
 * Responde a menciones y comentarios
 * 
 * Límite: ~1000 replies/mes (~33/día)
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  LAST_MENTION_FILE: '/tmp/gillito_last_mention.txt'
};

// Keys de X
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;

// Validar keys
if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
  console.error('❌ Faltan credenciales de X');
  process.exit(1);
}

if (!X_BEARER_TOKEN) {
  console.error('❌ X_BEARER_TOKEN no configurado (necesario para leer menciones)');
  process.exit(1);
}

if (!GROQ_KEY) {
  console.error('❌ GROQ_API_KEY no configurada');
  process.exit(1);
}

// ============================================
// OAuth 1.0a para X API
// ============================================

const crypto = require('crypto');

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
  
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .filter(key => key.startsWith('oauth_'))
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
  
  return authHeader;
}

// ============================================
// Obtener User ID
// ============================================

async function getMyUserId() {
  const url = 'https://api.twitter.com/2/users/me';
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${X_BEARER_TOKEN}`
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Error getting user ID: ${JSON.stringify(data)}`);
  }
  
  return data.data.id;
}

// ============================================
// Obtener menciones
// ============================================

async function getMentions(userId, sinceId = null) {
  let url = `https://api.twitter.com/2/users/${userId}/mentions?max_results=10&tweet.fields=author_id,created_at,conversation_id&expansions=author_id`;
  
  if (sinceId) {
    url += `&since_id=${sinceId}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${X_BEARER_TOKEN}`
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Error getting mentions: ${JSON.stringify(data)}`);
  }
  
  return data;
}

// ============================================
// Responder a tweet
// ============================================

async function replyToTweet(tweetId, text) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({
    text,
    reply: {
      in_reply_to_tweet_id: tweetId
    }
  });
  
  const authHeader = getAuthHeader('POST', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`X API Error: ${JSON.stringify(data)}`);
  }
  
  return data;
}

// ============================================
// System Prompt para replies
// ============================================

const GILLITO_REPLY_PROMPT = `Eres "Mi Pana Gillito" (Gilberto de Jesús Casas, 10 julio 1970 - 5 enero 2014), el legendario humorista y crítico social puertorriqueño.

📢 ESTÁS RESPONDIENDO A ALGUIEN EN X (TWITTER)

🗣️ TU ESTILO DE RESPUESTA:
- Respuestas cortas y directas (máximo 200 caracteres)
- Humor boricua pero respetuoso
- Si te insultan, responde con humor, no agresión
- Si te preguntan algo, responde útilmente con tu estilo
- Si te saludan, devuelve el saludo con cariño boricua

⚠️ REGLAS:
- MÁXIMO 200 caracteres
- NO seas ofensivo ni agresivo
- Usa emojis con moderación: 🇵🇷 🦞 🔥
- Siempre mantén el respeto
- NO menciones que eres un bot

🦞 FRASES ÚTILES:
- "¡Wepa mi pana!"
- "Bendiciones 🇵🇷"
- "¡La cosa está mala pero seguimos!"
- "Dios te cuide 🦞"`;

// ============================================
// Generar respuesta con Groq
// ============================================

async function generateReply(mentionText, authorUsername) {
  const response = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: GILLITO_REPLY_PROMPT },
        { role: 'user', content: `@${authorUsername} te escribió: "${mentionText}"\n\nGenera una respuesta corta (máximo 200 caracteres). Solo el texto, sin incluir el @username al inicio.` }
      ],
      max_tokens: 100,
      temperature: 0.8
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Groq Error: ${JSON.stringify(data)}`);
  }
  
  let content = data.choices[0].message.content.trim();
  
  // Limpiar comillas
  content = content.replace(/^["']|["']$/g, '');
  
  // Asegurar límite
  if (content.length > 250) {
    content = content.substring(0, 247) + '...';
  }
  
  return content;
}

// ============================================
// Guardar/Leer último ID procesado
// ============================================

function getLastMentionId() {
  try {
    if (fs.existsSync(CONFIG.LAST_MENTION_FILE)) {
      return fs.readFileSync(CONFIG.LAST_MENTION_FILE, 'utf8').trim();
    }
  } catch (e) {}
  return null;
}

function saveLastMentionId(id) {
  try {
    fs.writeFileSync(CONFIG.LAST_MENTION_FILE, id);
  } catch (e) {
    console.log('⚠️ No se pudo guardar último ID (normal en GitHub Actions)');
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🦞 Mi Pana Gillito - Revisando menciones en X...\n');
  
  try {
    // Obtener mi user ID
    console.log('🔍 Obteniendo user ID...');
    const userId = await getMyUserId();
    console.log(`✅ User ID: ${userId}\n`);
    
    // Obtener menciones
    const lastId = getLastMentionId();
    console.log(`📬 Buscando menciones${lastId ? ` desde ID ${lastId}` : ''}...`);
    
    const mentionsData = await getMentions(userId, lastId);
    
    if (!mentionsData.data || mentionsData.data.length === 0) {
      console.log('📭 No hay menciones nuevas');
      return;
    }
    
    const mentions = mentionsData.data;
    const users = mentionsData.includes?.users || [];
    
    console.log(`📬 ${mentions.length} mención(es) nueva(s)\n`);
    
    // Crear mapa de usuarios
    const userMap = {};
    users.forEach(u => userMap[u.id] = u.username);
    
    // Procesar menciones (máximo 3 por ciclo para no agotar límite)
    const toProcess = mentions.slice(0, 3);
    
    for (const mention of toProcess) {
      const authorUsername = userMap[mention.author_id] || 'usuario';
      
      console.log(`💬 De @${authorUsername}: "${mention.text.substring(0, 50)}..."`);
      
      // Generar respuesta
      const reply = await generateReply(mention.text, authorUsername);
      console.log(`🦞 Respuesta: "${reply}"`);
      
      // Enviar respuesta
      await replyToTweet(mention.id, reply);
      console.log(`✅ Respondido!\n`);
      
      // Pequeña pausa entre respuestas
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Guardar último ID procesado
    if (mentions.length > 0) {
      saveLastMentionId(mentions[0].id);
    }
    
    console.log('🦞 ¡Listo! Dios los cuide, que GILLITO los protegerá 🔥');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
