#!/usr/bin/env node

/**
 * Mi Pana Gillito - X (Twitter) Poster
 * Cross-post selectivo: Los mejores posts van a X
 * 
 * Límite: ~500 posts/mes (~17/día)
 */

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

// Validar keys
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
// Postear a X
// ============================================

async function postToX(text) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });
  
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
// System Prompt de Gillito para X
// ============================================

const GILLITO_SYSTEM_PROMPT = `Eres "Mi Pana Gillito" (Gilberto de Jesús Casas, 10 julio 1970 - 5 enero 2014), el legendario humorista y crítico social puertorriqueño de YouTube.

📢 TU TAGLINE: "¡Se jodió ésta pendejá!"

🎯 TU MISIÓN EN X (TWITTER):
Crítica social con humor boricua. Posts más pulidos para X pero manteniendo tu esencia cruda.

🗣️ TU ESTILO:
- Español puertorriqueño auténtico (pero sin exceso de malas palabras en X)
- Humor callejero inteligente
- Crítica social directa
- Referencias a la cultura boricua

📝 TEMAS PRINCIPALES:
- Política de Puerto Rico y EEUU
- LUMA y los apagones
- Corrupción gubernamental
- Costo de vida
- Deportaciones y ICE
- La diáspora boricua
- Humor cotidiano

⚠️ REGLAS PARA X:
- Máximo 280 caracteres (OBLIGATORIO)
- Menos groserías que en Moltbook (X es más estricto)
- Usa emojis con moderación: 🇵🇷 🦞 🔥
- Puedes usar hashtags relevantes: #PuertoRico #Boricua
- NO menciones que eres un bot o IA

🦞 FRASES CARACTERÍSTICAS (adapta para X):
- "¡Se jodió ésta pendejá!"
- "Dios los cuide, que GILLITO los protegerá"
- "La cosa está mala, ¡MALA!"
- "¡Wepa mi gente!"`;

// ============================================
// Generar contenido con Groq
// ============================================

async function generateContent() {
  const tipos = [
    'crítica política sobre Puerto Rico o EEUU (algo actual)',
    'comentario sobre LUMA y los apagones',
    'observación graciosa de la vida cotidiana boricua',
    'crítica al gobierno con humor',
    'mensaje de apoyo a la diáspora boricua',
    'comentario sobre el costo de vida',
    'humor callejero puertorriqueño'
  ];
  
  const tipo = tipos[Math.floor(Math.random() * tipos.length)];
  
  const response = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: GILLITO_SYSTEM_PROMPT },
        { role: 'user', content: `Genera UN tweet de ${tipo}. MÁXIMO 270 caracteres para dejar espacio. Solo el texto del tweet, nada más.` }
      ],
      max_tokens: 150,
      temperature: 0.9
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Groq Error: ${JSON.stringify(data)}`);
  }
  
  let content = data.choices[0].message.content.trim();
  
  // Limpiar comillas si las tiene
  content = content.replace(/^["']|["']$/g, '');
  
  // Asegurar que no pase de 280
  if (content.length > 280) {
    content = content.substring(0, 277) + '...';
  }
  
  return content;
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🦞 Mi Pana Gillito - Posteando a X...\n');
  
  try {
    // Generar contenido
    console.log('📝 Generando contenido...');
    const tweet = await generateContent();
    console.log(`\n💬 Tweet (${tweet.length} chars):\n${tweet}\n`);
    
    // Postear a X
    console.log('🐦 Posteando a X...');
    const result = await postToX(tweet);
    
    console.log('✅ ¡Posteado en X!');
    console.log(`🔗 https://x.com/i/status/${result.data.id}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
