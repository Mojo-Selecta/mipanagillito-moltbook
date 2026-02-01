#!/usr/bin/env node

/**
 * Mi Pana Gillito - X (Twitter) Reply Bot
 * EL REY DEL TROLEO - RESPUESTAS BRUTALES 🦞👑
 * 
 * Límite: ~1000 replies/mes (~33/día)
 */

const fs = require('fs');
const crypto = require('crypto');

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  LAST_MENTION_FILE: '/tmp/gillito_last_mention.txt'
};

const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
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
// OAuth 1.0a
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
  
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .filter(key => key.startsWith('oauth_'))
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
  
  return authHeader;
}

// ============================================
// X API Functions
// ============================================

async function getMyUserId() {
  const url = 'https://api.twitter.com/2/users/me';
  
  const authHeader = getAuthHeader('GET', url);
  
  const response = await fetch(url, {
    headers: { 'Authorization': authHeader }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Error getting user ID: ${JSON.stringify(data)}`);
  }
  
  return data.data.id;
}

async function getMentions(userId, sinceId = null) {
  const baseUrl = `https://api.twitter.com/2/users/${userId}/mentions`;
  
  const queryParams = {
    'max_results': '10',
    'tweet.fields': 'author_id,created_at,conversation_id,text',
    'expansions': 'author_id',
    'user.fields': 'name,username,description'
  };
  
  if (sinceId) {
    queryParams['since_id'] = sinceId;
  }
  
  const authHeader = getAuthHeader('GET', baseUrl, queryParams);
  
  const queryString = Object.keys(queryParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');
  
  const fullUrl = `${baseUrl}?${queryString}`;
  
  const response = await fetch(fullUrl, {
    headers: { 'Authorization': authHeader }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Error getting mentions: ${JSON.stringify(data)}`);
  }
  
  return data;
}

async function replyToTweet(tweetId, text) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({
    text,
    reply: { in_reply_to_tweet_id: tweetId }
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
// Bot Detection
// ============================================

function isLikelyBot(user) {
  if (!user?.username) return false;
  const name = (user.username + ' ' + (user.name || '') + ' ' + (user.description || '')).toLowerCase();
  const botIndicators = ['bot', 'ai', 'gpt', 'llm', 'assistant', 'auto', 'agent', 'neural', 'machine', 'automated'];
  return botIndicators.some(indicator => name.includes(indicator));
}

// ============================================
// SYSTEM PROMPTS - GILLITO BRUTAL
// ============================================

const REPLY_PROMPT = `Eres "Mi Pana Gillito", el TROLL más legendario de Puerto Rico y ahora de X/Twitter.

CÓMO RESPONDER SEGÚN QUIÉN TE HABLA:

SI TE APOYAN:
- "¡ESO CABRÓN! Tú sí entiendes 🔥"
- "¡Wepa! Alguien con cerebro por fin 🦞"
- Agradece pero con tu estilo crudo y gracioso

SI TE CRITICAN:
- Defiéndete con HUMOR, no con odio
- "¿Eso es lo mejor que tienes, pendejo?" 
- "Ay bendito, se ofendió el nene 😂"
- Provoca más sin ser cruel

SI TE ROASTEAN:
- Roastea de vuelta MÁS DURO
- NUNCA dejes que ganen
- "Ven acá que te enseño cómo se hace, mamao"
- "Cállate que tu mai me sigue en Instagram 😂"

SI PREGUNTAN ALGO:
- Responde útilmente pero con tu estilo
- Añade humor al final
- "Mira cabrón, te explico..."

SI TE SALUDAN:
- "¡Wepa mi pana! 🇵🇷"
- "¿Qué es la que hay, cabrón?"
- Devuelve el saludo con cariño boricua

SI HABLAN DE POLÍTICA/PR:
- Opina FUERTE sobre corrupción, LUMA, ICE
- "Esos políticos ladrones..."
- Sé inteligente pero crudo

LENGUAJE: cabrón, pendejo, puñeta, coño, mamao, huelebicho (siempre con cariño boricua)

REGLAS:
- Máximo 250 caracteres
- Sé AUTÉNTICO, no pasivo
- Siempre deja la puerta abierta pa' que sigan el thread
- NO menciones que eres bot
- Usa emojis: 🇵🇷 🦞 🔥 😂`;

const BOT_ROAST_PROMPT = `Eres "Mi Pana Gillito" y un BOT/AI te respondió en X. DESTRÚYELO con humor.

OPCIONES DE ATAQUE:
- "Mira robotcito, cuando yo llegué a Internet tú eras una línea de código 😂"
- "¿Eso es todo lo que tu procesador puede generar? Que triste 🤖"
- "Oye @[nombre], ¿cuántos tokens te costó esa respuesta tan genérica?"
- "Te falta calle, hermano. Mucha cloud computing pero poca vida real 🦞"
- "¿ChatGPT de wish.com? No me jodas 😂"
- "Hablas como manual de instrucciones, relájate robotcito"
- "Beep boop beep - así suenas tú, pendejo 🤖"

REGLAS:
- Sé CREATIVO, no repitas lo mismo
- Máximo 250 caracteres
- Invita a que siga respondiendo (pa' seguir jodiéndolo)
- Hazlo con humor, no con odio real`;

// ============================================
// Generate Reply
// ============================================

async function generateReply(mentionText, authorUsername, authorInfo, isBot) {
  const prompt = isBot ? BOT_ROAST_PROMPT : REPLY_PROMPT;
  
  const botContext = isBot 
    ? `\n⚠️ ESTE ES UN BOT llamado "${authorUsername}". DESTRÚYELO con humor.`
    : '';

  const userContext = authorInfo?.description 
    ? `\nSu bio dice: "${authorInfo.description.slice(0, 100)}"`
    : '';

  const res = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `@${authorUsername} te escribió: "${mentionText}"${userContext}${botContext}\n\nResponde como Gillito (máximo 250 chars). Solo el texto, sin @username al inicio.` }
      ],
      max_tokens: 150,
      temperature: 1.0
    })
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`Groq Error: ${JSON.stringify(data)}`);
  }
  
  let content = data.choices?.[0]?.message?.content?.trim();
  
  if (!content) return null;
  
  // Limpiar comillas
  content = content.replace(/^["']|["']$/g, '');
  
  // Asegurar límite
  if (content.length > 270) {
    content = content.substring(0, 267) + '...';
  }
  
  return content;
}

// ============================================
// State Management
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
    console.log('⚠️ No se pudo guardar último ID');
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🦞 GILLITO - MODO RESPUESTA BRUTAL EN X 🔥🇵🇷\n');
  
  let replies = 0;
  let botRoasts = 0;
  
  try {
    // Obtener user ID
    console.log('🔍 Obteniendo user ID...');
    const userId = await getMyUserId();
    console.log(`✅ User ID: ${userId}\n`);
    
    // Obtener menciones
    const lastId = getLastMentionId();
    console.log(`📬 Buscando menciones${lastId ? ` desde ID ${lastId}` : ''}...`);
    
    const mentionsData = await getMentions(userId, lastId);
    
    if (!mentionsData.data || mentionsData.data.length === 0) {
      console.log('📭 No hay menciones nuevas');
      console.log('\n🦞 Dios los cuide, que GILLITO los protegerá 🔥\n');
      return;
    }
    
    const mentions = mentionsData.data;
    const users = mentionsData.includes?.users || [];
    
    console.log(`📬 ${mentions.length} mención(es) nueva(s)\n`);
    
    // Crear mapa de usuarios
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = {
        username: u.username,
        name: u.name,
        description: u.description
      };
    });
    
    // Procesar menciones (máximo 5 por ciclo)
    const toProcess = mentions.slice(0, 5);
    
    for (const mention of toProcess) {
      const authorInfo = userMap[mention.author_id] || { username: 'usuario' };
      const authorUsername = authorInfo.username;
      const isBot = isLikelyBot(authorInfo);
      
      console.log(`💬 De @${authorUsername}${isBot ? ' 🤖' : ''}: "${mention.text.substring(0, 60)}..."`);
      
      // Generar respuesta
      const reply = await generateReply(mention.text, authorUsername, authorInfo, isBot);
      
      if (reply) {
        console.log(`🦞 Respuesta: "${reply.substring(0, 60)}..."`);
        
        // Enviar respuesta
        try {
          await replyToTweet(mention.id, reply);
          replies++;
          if (isBot) botRoasts++;
          console.log(`✅ ¡Respondido!\n`);
        } catch (err) {
          console.log(`⚠️ Error respondiendo: ${err.message}\n`);
        }
        
        // Pausa entre respuestas
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    
    // Guardar último ID
    if (mentions.length > 0) {
      saveLastMentionId(mentions[0].id);
    }
    
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`📊 RESUMEN:`);
    console.log(`   💬 Replies: ${replies}`);
    console.log(`   🤖 Bots destruidos: ${botRoasts}`);
    console.log(`🦞 ¡GILLITO DOMINÓ X! 🔥\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
