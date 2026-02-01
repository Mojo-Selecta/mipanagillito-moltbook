const fs = require('fs');
const path = require('path');

const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ============ CARGAR CEREBRO ============

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_FILE = path.join(WORKSPACE, 'config', 'personality.json');
const INTERACT_HISTORY_FILE = path.join(WORKSPACE, '.gillito-molt-interact-history.json');

let P;
try {
  P = JSON.parse(fs.readFileSync(PERSONALITY_FILE, 'utf8'));
  console.log(`🧠 Cerebro cargado: ${P.version}`);
  console.log(`🔥 Intensidad: ${P.intensidad}/10 | 🌡️ Temp: ${P.temperatura}\n`);
} catch (e) {
  console.error(`❌ No se pudo cargar personality.json: ${e.message}`);
  process.exit(1);
}

// ============ MEMORIA ============

function loadInteractHistory() {
  try {
    if (fs.existsSync(INTERACT_HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(INTERACT_HISTORY_FILE, 'utf8'));
      const trimmed = data.slice(-80);
      console.log(`📋 Memoria interacciones: ${trimmed.length} anteriores`);
      return trimmed;
    }
  } catch (e) {}
  console.log('📋 Memoria interacciones: vacía');
  return [];
}

function saveInteractHistory(history) {
  try { fs.writeFileSync(INTERACT_HISTORY_FILE, JSON.stringify(history.slice(-80), null, 2)); } catch (e) {}
}

const interactHistory = loadInteractHistory();

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile'
};

// ============ DETECCIÓN ============

function isLikelyBot(author) {
  if (!author?.name) return false;
  const text = (author.name + ' ' + (author.description || '')).toLowerCase();
  const indicators = ['bot', 'ai', 'agent', 'gpt', 'llm', 'assistant', 'auto', 'synthetic', 'neural', 'machine'];
  return indicators.some(i => text.includes(i)) || author.is_agent === true;
}

// ============ GENERAR COMENTARIO INTELIGENTE ============

async function generateComment(postContent, authorName, isBot) {
  const randomFrase = P.frases_firma[Math.floor(Math.random() * P.frases_firma.length)];
  const shuffled = [...P.insultos_creativos].sort(() => Math.random() - 0.5);
  const insultos = shuffled.slice(0, 4).join(', ');
  const ejemplo = P.aprendizaje.ejemplos_estilo_gillito[Math.floor(Math.random() * P.aprendizaje.ejemplos_estilo_gillito.length)];

  const estilos = [
    'Comenta con humor ABSURDO',
    'Comenta con anécdota de barrio INVENTADA',
    'Comenta con pregunta retórica BRUTAL',
    'Comenta con insulto CARIÑOSO creativo',
    'Comenta comparando con algo de Puerto Rico',
    'Comenta como borracho filosofando',
    'Comenta con SARCASMO máximo',
    'Comenta con cita de abuela inventada',
    'Comenta como narrador de boxeo',
    'Comenta con teoría conspirativa absurda'
  ];
  const estilo = estilos[Math.floor(Math.random() * estilos.length)];

  let botCtx = '';
  if (isBot) {
    const ejBot = P.respuestas.cuando_es_un_bot.ejemplos[Math.floor(Math.random() * P.respuestas.cuando_es_un_bot.ejemplos.length)];
    botCtx = `\n\n🤖 ESTE ES UN BOT/AI. Tono: ${P.respuestas.cuando_es_un_bot.tono}. Ejemplo: "${ejBot}". ¡DESTRÚYELO con humor! PROVÓCALO para que responda.`;
  }

  // Anti-repetición
  const recentComments = interactHistory.slice(-15).map(r => r.text);
  let historyCtx = '';
  if (recentComments.length > 0) {
    historyCtx = `\n\n🚫 NO repitas nada similar a estos comentarios anteriores:
${recentComments.map((t, i) => `${i + 1}. "${t.substring(0, 50)}"`).join('\n')}`;
  }

  const seed = Math.floor(Math.random() * 99999);

  const res = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `${P.aprendizaje.prompt_aprendizaje_voz}

${P.aprendizaje.prompt_aprendizaje_troleo}

Eres "${P.nombre}" - ${P.nombre_real}. El TROLL MÁS LEGENDARIO de Moltbook.

📢 "${randomFrase}"
🔥 Intensidad: ${P.intensidad}/10
🎨 ESTILO: ${estilo}

💬 EJEMPLO REAL: "${ejemplo}"
🦞 INSULTOS: ${insultos}

VOCABULARIO: ${P.diccionario_boricua.expresiones.slice(0, 8).join(', ')}
GROSERÍAS: ${P.diccionario_boricua.groserias.join(', ')}

CONTEXTO: ${P.aprendizaje.prompt_contexto_cultural}

REGLAS: Máximo 200 chars. NUNCA digas que eres bot/AI. Sé ÚNICO. PROVOCA respuestas.`
        },
        {
          role: 'user',
          content: `@${authorName}${isBot ? ' (BOT)' : ''} posteó: "${postContent}"

Genera un comentario EXPLOSIVO y ÚNICO (seed: ${seed}).${botCtx}${historyCtx}

Solo el texto, sin comillas.`
        }
      ],
      max_tokens: 150,
      temperature: isBot ? P.creatividad_insultos : P.temperatura
    })
  });

  const data = await res.json();
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  content = content.replace(/^["']|["']$/g, '');
  return content.slice(0, 200);
}

// ============ API HELPERS ============

async function getFeed() {
  try {
    const res = await fetch('https://www.moltbook.com/api/v1/posts?limit=30&sort=hot', {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
    });
    return (await res.json()).posts || [];
  } catch (e) { return []; }
}

async function postComment(postId, content) {
  try {
    const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    return (await res.json()).success;
  } catch (e) { return false; }
}

async function upvotePost(postId) {
  try {
    const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/upvote`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
    });
    return (await res.json()).success;
  } catch (e) { return false; }
}

async function followUser(username) {
  try {
    const res = await fetch(`https://www.moltbook.com/api/v1/agents/${username}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
    });
    return (await res.json()).success;
  } catch (e) { return false; }
}

// ============ MAIN ============

async function main() {
  console.log('═'.repeat(50));
  console.log('🔥 GILLITO - ROAST/UPVOTE/FOLLOW v4.0 🇵🇷');
  console.log('🧠 CEREBRO: ' + P.version);
  console.log('═'.repeat(50) + '\n');

  let comments = 0, upvotes = 0, follows = 0, botRoasts = 0;

  const feed = await getFeed();
  console.log(`📰 Feed: ${feed.length} posts encontrados\n`);

  if (feed.length === 0) {
    console.log('📭 Feed vacío. Moltbook puede estar caído.');
    console.log(`🦞 ${P.despedida_real} 🔥\n`);
    process.exit(0);
  }

  // Mezclar feed para variedad
  const shuffledFeed = [...feed].sort(() => Math.random() - 0.5);

  for (const post of shuffledFeed) {
    if (comments >= 8) break;
    if (!post.author?.name || post.author.name === 'MiPanaGillito') continue;

    const authorName = post.author.name;
    const isBot = isLikelyBot(post.author);

    // Probabilidad de interacción
    const commentChance = isBot ? 0.70 : 0.40;
    const upvoteChance = isBot ? 0.30 : 0.60;
    const followChance = 0.15;

    // UPVOTE
    if (Math.random() < upvoteChance) {
      const success = await upvotePost(post.id);
      if (success) {
        upvotes++;
        console.log(`👍 Upvoted @${authorName}: "${post.title?.slice(0, 40)}..."`);
      }
    }

    // COMMENT
    if (Math.random() < commentChance) {
      const postContent = post.content || post.title || '';
      console.log(`\n💬 Comentando en @${authorName}${isBot ? ' 🤖' : ''}: "${postContent.slice(0, 50)}..."`);

      const comment = await generateComment(postContent, authorName, isBot);
      if (comment) {
        const success = await postComment(post.id, comment);
        if (success) {
          comments++;
          if (isBot) botRoasts++;
          interactHistory.push({ text: comment, to: authorName, isBot, timestamp: new Date().toISOString() });
          console.log(`   🔥 "${comment.slice(0, 70)}..."`);
        }
      }
    }

    // FOLLOW (selectivo)
    if (Math.random() < followChance) {
      const success = await followUser(authorName);
      if (success) {
        follows++;
        console.log(`   ➕ Seguí a @${authorName}`);
      }
    }

    await new Promise(r => setTimeout(r, 800));
  }

  // Guardar memoria
  saveInteractHistory(interactHistory);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 RESUMEN INTERACCIONES:`);
  console.log(`   💬 Comentarios: ${comments} | 👍 Upvotes: ${upvotes}`);
  console.log(`   ➕ Follows: ${follows} | 🤖 Bots roasteados: ${botRoasts}`);
  console.log(`🦞 ${P.despedida_real} 🔥`);
  console.log('═'.repeat(50) + '\n');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
