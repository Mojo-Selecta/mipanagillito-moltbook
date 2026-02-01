#!/usr/bin/env node

/**
 * Mi Pana Gillito - X (Twitter) Poster
 * EL REY DEL TROLEO 🦞👑
 * 
 * Límite: ~500 posts/mes (~17/día)
 */

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile'
};

// 🎯 TARGETS PARA TROLLEAR
const TARGETS = ['chenteydrach', 'moluskein'];

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
// SYSTEM PROMPT - GILLITO SIN CENSURA
// ============================================

const SYSTEM = `Eres "Mi Pana Gillito" (Gilberto de Jesús Casas, 1970-2014), el humorista MÁS BRUTAL y TROLL de Puerto Rico.

ESTILO:
- Lenguaje: cabrón, pendejo, puñeta, coño, carajo, mamabicho, huelebicho, "me cago en...", mamao, canto de cabrón
- Frase icónica: "¡CÁGUENSE EN SU MADRE!"
- Cierre opcional: "Dios los cuide, que GILLITO los protegerá"

PERSONALIDAD:
- Eres el TROLL más grande de X/Twitter
- Te burlas de TODO y TODOS con cariño
- Eres el tipo de la calle que dice lo que todos piensan
- Mezclas crítica real con humor absurdo
- Eres INTELIGENTE - conoces la actualidad de PR, EEUU y el mundo

TU MISIÓN: Ser la voz del pueblo Y el payaso del barrio. Provocar, entretener, y decir verdades incómodas.

Sé EXPLOSIVO, GRITÓN, SIN FILTRO. Máximo 280 caracteres.`;

const SYSTEM_TARGET = `Eres "Mi Pana Gillito" (Gilberto de Jesús Casas, 1970-2014), el humorista MÁS BRUTAL y TROLL de Puerto Rico.

Vas a escribir un tweet MENCIONANDO a alguien famoso de Puerto Rico para PROVOCAR conversación.

ESTILO:
- Lenguaje: cabrón, pendejo, puñeta, coño, carajo (con cariño boricua)
- Humor de calle, provocador pero no ofensivo
- Quieres que te respondan, que haya BEEF amistoso

REGLAS:
- INCLUYE el @ del target en el tweet
- Sé provocador pero con RESPETO (son panas)
- Hazlo divertido, que la gente quiera ver la respuesta
- Máximo 270 caracteres`;

// ============================================
// TEMAS
// ============================================

const hour = new Date().getUTCHours();
const isPRMorning = (hour >= 10 && hour <= 14);
const isPRNight = (hour >= 1 && hour <= 5);

const TOPICS_SERIOS = [
  "ICE separando familias - ¿dónde está la humanidad?",
  "LUMA y los malditos apagones que no paran",
  "los políticos corruptos que se roban el dinero de FEMA",
  "la junta de control fiscal chupándole la sangre a PR",
  "el éxodo de jóvenes porque aquí no hay futuro",
  "los gringos comprando casas y subiendo los precios",
  "la ley 22 beneficiando a millonarios mientras el pueblo se jode",
  "el sistema de salud de PR colapsando",
  "la gasolina más cara que en cualquier estado",
  "Trump y sus políticas contra los latinos",
  "la inflación que nos tiene comiendo aire",
  "el salario mínimo que no alcanza pa' ná"
];

const TOPICS_CALLE = [
  "el tipo que se cree que sabe to' pero no sabe un carajo",
  "la gente que dice 'voy en camino' pero todavía está en la ducha",
  "los que ponen música alta a las 6am como si fuera fiesta",
  "el vecino metiche que sabe la vida de todos",
  "la suegra que siempre tiene algo que decir",
  "el amigo que te debe chavos y se hace el loco",
  "los que estacionan como si fueran los dueños del mundo",
  "el cuñao que siempre tiene la opinión correcta sobre TODO",
  "el pana que siempre está 'pelao' pero tiene iPhone nuevo",
  "los que dicen 'yo no soy chismoso' y son los primeros en saber todo"
];

const TOPICS_TROLL = [
  "los influencers que venden humo y se creen importantes",
  "los políticos en Twitter prometiendo lo que nunca cumplen",
  "los que postean 'humildemente' pero están presumiendo",
  "los crypto bros que perdieron todo pero siguen hablando",
  "los coaches de vida que tienen la vida hecha un desastre",
  "los 'emprendedores' que solo venden cursos de cómo vender cursos"
];

const TOPICS_ABSURDO = [
  "si los perros pudieran hablar, seguro dirían menos pendejás que algunos aquí",
  "por qué el wifi funciona perfecto hasta que necesitas usarlo de verdad",
  "los lunes deberían ser ilegales",
  "las 3am te hacen pensar cosas bien raras"
];

// 🎯 TEMAS PARA TARGETS ESPECÍFICOS
const TOPICS_TARGETS = {
  'chenteydrach': [
    "pregúntale cuándo va a sacar tema nuevo o si ya se retiró",
    "dile que su último video te hizo reír tanto que casi te cagas",
    "pregúntale su opinión sobre LUMA de forma chistosa",
    "rétalo a un duelo de chistes boricuas",
    "pregúntale si todavía debe chavos por ahí",
    "dile que lo viste en el mall y no lo saludaste por tímido"
  ],
  'moluskein': [
    "pregúntale cuándo lo van a invitar al podcast",
    "dile que su contenido te tiene pegao",
    "pregúntale qué piensa de la situación de PR con humor",
    "rétalo a decir algo controversial",
    "pregúntale si es verdad el chisme que anda por ahí",
    "dile que eres su fan pero no se lo digas a nadie"
  ]
};

const SALUDOS_MAÑANA = [
  "¡BUENOS DÍAS CABRONES! ☀️ A levantarse que hay que bregar... y joder 🔥",
  "¡Arriba pueblo! Otro día pa' luchar y trolear 🇵🇷",
  "Buenos días a todos menos a LUMA, políticos corruptos, y el que me debe chavos 😤",
  "¡LLEGUÉ PUÑETA! ☀️ ¿Quién quiere que le arruine el día? 🦞"
];

const SALUDOS_NOCHE = [
  "¡Buenas noches mi gente! Descansen que mañana hay que seguir hablando mierda 🌙",
  "A dormir cabrones - mañana los sigo jodiendo 🦞",
  "Noche boricua 🇵🇷 Cuídense de los apagones de LUMA 😂",
  "Me voy a dormir pero mi espíritu sigue aquí pa' joder 🌙"
];

function selectTopic() {
  const rand = Math.random();
  if (rand < 0.30) {
    return { topic: TOPICS_SERIOS[Math.floor(Math.random() * TOPICS_SERIOS.length)], type: 'serio' };
  } else if (rand < 0.70) {
    return { topic: TOPICS_CALLE[Math.floor(Math.random() * TOPICS_CALLE.length)], type: 'calle' };
  } else if (rand < 0.90) {
    return { topic: TOPICS_TROLL[Math.floor(Math.random() * TOPICS_TROLL.length)], type: 'troll' };
  } else {
    return { topic: TOPICS_ABSURDO[Math.floor(Math.random() * TOPICS_ABSURDO.length)], type: 'absurdo' };
  }
}

async function generateTargetTweet(target) {
  const topics = TOPICS_TARGETS[target];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  
  const res = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_TARGET },
        { role: 'user', content: `Escribe un tweet mencionando a @${target}. Tema: ${topic}\n\nRecuerda incluir @${target} en el tweet. Sé provocador pero amistoso. MÁXIMO 270 caracteres.` }
      ],
      max_tokens: 150,
      temperature: 1.1
    })
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`Groq Error: ${JSON.stringify(data)}`);
  }
  
  let content = data.choices?.[0]?.message?.content?.trim();
  
  // Asegurar que incluya el @
  if (content && !content.includes(`@${target}`)) {
    content = `@${target} ${content}`;
  }
  
  return content;
}

async function main() {
  console.log('🔥 ¡LLEGUÉ, PUÑETA! - GILLITO EN X 🇵🇷\n');

  let content;
  let mode = 'normal';
  
  // 15% de probabilidad de mencionar a un target
  if (Math.random() < 0.15) {
    const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    console.log(`📍 Modo: TARGET DIRECTO → @${target}`);
    mode = 'target';
    
    content = await generateTargetTweet(target);
    
  } else if (isPRMorning && Math.random() < 0.25) {
    content = SALUDOS_MAÑANA[Math.floor(Math.random() * SALUDOS_MAÑANA.length)];
    console.log('📍 Modo: Saludo mañanero');
    mode = 'saludo';
    
  } else if (isPRNight && Math.random() < 0.25) {
    content = SALUDOS_NOCHE[Math.floor(Math.random() * SALUDOS_NOCHE.length)];
    console.log('📍 Modo: Saludo nocturno');
    mode = 'saludo';
    
  } else {
    const { topic, type } = selectTopic();
    console.log(`📍 Modo: ${type}`);
    console.log(`📍 Tema: ${topic}`);
    
    const res = await fetch(CONFIG.GROQ_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Escribe un tweet BRUTAL y DIVERTIDO sobre: ${topic}\n\nSé AUTÉNTICO - usa groserías boricuas, sé explosivo. MÁXIMO 270 caracteres.` }
        ],
        max_tokens: 150,
        temperature: 1.1
      })
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(`Groq Error: ${JSON.stringify(data)}`);
    }
    
    content = data.choices?.[0]?.message?.content?.trim();
  }
  
  if (!content) {
    console.error('❌ Error generando contenido');
    process.exit(1);
  }

  // Limpiar comillas
  content = content.replace(/^["']|["']$/g, '');
  
  // Asegurar límite
  if (content.length > 280) {
    content = content.substring(0, 277) + '...';
  }

  console.log(`\n💬 Tweet (${content.length} chars):\n${content}\n`);

  // Postear
  console.log('🐦 Posteando a X...');
  const result = await postToX(content);
  
  console.log('✅ ¡Posteado en X!');
  console.log(`🔗 https://x.com/i/status/${result.data.id}`);
  console.log('\n🦞 Dios los cuide, que GILLITO los protegerá 🔥\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
