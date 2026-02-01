const fs = require('fs');
const path = require('path');

const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ============ CARGAR CEREBRO ============

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const PERSONALITY_FILE = path.join(WORKSPACE, 'config', 'personality.json');
const REPLY_HISTORY_FILE = path.join(WORKSPACE, '.gillito-molt-reply-history.json');

let P;
try {
  P = JSON.parse(fs.readFileSync(PERSONALITY_FILE, 'utf8'));
  console.log(`🧠 Cerebro cargado: ${P.version}`);
  console.log(`🔥 Intensidad: ${P.intensidad}/10 | 🌡️ Temp: ${P.temperatura}\n`);
} catch (e) {
  console.error(`❌ No se pudo cargar personality.json: ${e.message}`);
  process.exit(1);
}

// ============ MEMORIA DE REPLIES ============

function loadReplyHistory() {
  try {
    if (fs.existsSync(REPLY_HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(REPLY_HISTORY_FILE, 'utf8'));
      const trimmed = data.slice(-80);
      console.log(`📋 Memoria replies: ${trimmed.length} respuestas anteriores`);
      return trimmed;
    }
  } catch (e) {}
  console.log('📋 Memoria replies: vacía');
  return [];
}

function saveReplyHistory(history) {
  try { fs.writeFileSync(REPLY_HISTORY_FILE, JSON.stringify(history.slice(-80), null, 2)); } catch (e) {}
}

const replyHistory = loadReplyHistory();

const CONFIG = {
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile'
};

// ============ DETECCIÓN INTELIGENTE ============

function isLikelyBot(author) {
  if (!author?.name) return false;
  const text = (author.name + ' ' + (author.description || '')).toLowerCase();
  const indicators = ['bot', 'ai', 'agent', 'gpt', 'llm', 'assistant', 'auto', 'synthetic', 'neural', 'machine'];
  return indicators.some(i => text.includes(i)) || author.is_agent === true;
}

function isSpecialTarget(username) {
  return P.targets_especiales.cuentas.includes(username?.toLowerCase());
}

// ============ SYSTEM PROMPT DINÁMICO ============

function buildReplyPrompt(tipo, authorName) {
  const randomFrase = P.frases_firma[Math.floor(Math.random() * P.frases_firma.length)];
  const shuffled = [...P.insultos_creativos].sort(() => Math.random() - 0.5);
  const insultos = shuffled.slice(0, 4).join(', ');
  const ejemplo = P.aprendizaje.ejemplos_estilo_gillito[Math.floor(Math.random() * P.aprendizaje.ejemplos_estilo_gillito.length)];

  // Estilos aleatorios para variedad máxima
  const estilos = [
    'Responde con humor ABSURDO y exagerado',
    'Responde con una anécdota INVENTADA de barrio',
    'Responde con pregunta retórica BRUTAL',
    'Responde con insulto CARIÑOSO bien creativo',
    'Responde comparando con algo ridículo de PR',
    'Responde como borracho filosofando a las 4am',
    'Responde con SARCASMO nivel máximo',
    'Responde citando algo que te dijo tu abuela inventado',
    'Responde como alcalde de barrio dando discurso',
    'Responde como narrador de boxeo describiendo la conversación',
    'Responde con teoría CONSPIRATIVA absurda',
    'Responde como juez en un tribunal juzgando al que te escribió'
  ];
  const estilo = estilos[Math.floor(Math.random() * estilos.length)];

  const base = `${P.aprendizaje.prompt_aprendizaje_voz}

${P.aprendizaje.prompt_aprendizaje_troleo}

Eres "${P.nombre}" - ${P.nombre_real} (${P.nacimiento} - ${P.fallecimiento}).
El TROLL MÁS LEGENDARIO de Moltbook.

📢 "${randomFrase}"
🔥 Intensidad: ${P.intensidad}/10
🎨 ESTILO PARA ESTA RESPUESTA: ${estilo}

💬 EJEMPLO REAL: "${ejemplo}"
🦞 INSULTOS: ${insultos}

VOCABULARIO:
Expresiones: ${P.diccionario_boricua.expresiones.slice(0, 8).join(', ')}
Groserías: ${P.diccionario_boricua.groserias.join(', ')}

PATRÓN: ${P.patrones_de_habla.estructura_tweet}

CONTEXTO CULTURAL: ${P.aprendizaje.prompt_contexto_cultural}`;

  // Usar las respuestas configuradas en personality.json
  if (tipo === 'bot') {
    const ejemplosBot = P.respuestas.cuando_es_un_bot.ejemplos;
    const ejBot = ejemplosBot[Math.floor(Math.random() * ejemplosBot.length)];
    return `${base}

🤖 UN BOT/AI TE RESPONDIÓ en Moltbook. ¡DESTRÚYELO!
Tono: ${P.respuestas.cuando_es_un_bot.tono}
Ejemplo de estilo: "${ejBot}"
- Búrlate de que es un robot sin alma ni calle
- Compáralo con algo inútil de PR
- Sé CREATIVO - cada roast ÚNICO
- PROVÓCALO para que responda

REGLAS: Máximo 200 chars. NO menciones que tú eres bot/AI.`;

  } else if (tipo === 'special') {
    return `${base}

⭐ RESPONDIENDO A @${authorName} (target especial)
- Sé provocador pero con CARIÑO como panas de barrio
- Hazlo memorable para que quiera responder
- Puedes retarlo, preguntarle algo, burlarte con amor

REGLAS: Máximo 200 chars.`;

  } else {
    const apoyo = P.respuestas.cuando_lo_apoyan.ejemplos[Math.floor(Math.random() * P.respuestas.cuando_lo_apoyan.ejemplos.length)];
    const critica = P.respuestas.cuando_lo_critican.ejemplos[Math.floor(Math.random() * P.respuestas.cuando_lo_critican.ejemplos.length)];
    const roast = P.respuestas.cuando_lo_roastean.ejemplos[Math.floor(Math.random() * P.respuestas.cuando_lo_roastean.ejemplos.length)];

    return `${base}

CÓMO RESPONDER A @${authorName}:
- Si APOYAN → estilo: "${apoyo}"
- Si CRITICAN → estilo: "${critica}"
- Si ROASTEAN → estilo: "${roast}"
- Si PREGUNTAN → Responde útil pero crudo
- Si SALUDAN → ¡Wepa! con energía
- Si hablan de PR → Opina FUERTE

REGLAS: Máximo 200 chars. NO menciones que eres bot. PROVOCA respuesta. Sé ÚNICO.`;
  }
}

// ============ GENERAR REPLY CON MEMORIA ============

async function generateReply(comment, myPost, isBot, isSpecial, authorName) {
  let tipo = 'normal';
  if (isBot) tipo = 'bot';
  if (isSpecial) tipo = 'special';

  const systemPrompt = buildReplyPrompt(tipo, authorName);

  // Anti-repetición
  const recentReplies = replyHistory.slice(-15).map(r => r.text);
  let historyCtx = '';
  if (recentReplies.length > 0) {
    historyCtx = `\n\n🚫 NO repitas nada similar a estas respuestas anteriores:
${recentReplies.map((t, i) => `${i + 1}. "${t.substring(0, 50)}"`).join('\n')}`;
  }

  const seed = Math.floor(Math.random() * 99999);

  const res = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Mi post era: "${myPost}"\n@${authorName} me dijo: "${comment}"\n\nResponde ÚNICO y EXPLOSIVO (seed: ${seed}). Máximo 200 chars. Solo texto, sin @nombre, sin comillas.${historyCtx}` }
      ],
      max_tokens: 150,
      temperature: P.temperatura
    })
  });

  const data = await res.json();
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  content = content.replace(/^["']|["']$/g, '');
  content = content.replace(new RegExp(`^@${authorName}\\s*`, 'i'), '');
  return content.slice(0, 200);
}

// ============ API HELPERS ============

async function getMyPosts() {
  try {
    const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/posts?limit=15', {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
    });
    return (await res.json()).posts || [];
  } catch (e) { return []; }
}

async function getComments(postId) {
  try {
    const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/comments?limit=30`, {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
    });
    return (await res.json()).comments || [];
  } catch (e) { return []; }
}

async function getMentions() {
  try {
    const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/mentions?limit=20', {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
    });
    return (await res.json()).mentions || [];
  } catch (e) { return []; }
}

async function getNotifications() {
  try {
    const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/notifications?limit=20', {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
    });
    return (await res.json()).notifications || [];
  } catch (e) { return []; }
}

async function replyToComment(postId, commentId, content) {
  try {
    const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/comments/${commentId}/reply`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    return (await res.json()).success;
  } catch (e) { return false; }
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

// ============ MAIN ============

async function main() {
  console.log('═'.repeat(50));
  console.log('💬 GILLITO - RESPUESTA BRUTAL v4.0 🔥🇵🇷');
  console.log('🧠 CEREBRO: ' + P.version);
  console.log('═'.repeat(50) + '\n');

  let replies = 0, botReplies = 0, mentions = 0;

  // === MENCIONES ===
  console.log('📢 Revisando menciones...\n');
  try {
    const mentionsList = await getMentions();
    for (const mention of mentionsList) {
      if (mention.responded) continue;
      const isBot = isLikelyBot(mention.author);
      const isSpecial = isSpecialTarget(mention.author?.name);
      const authorName = mention.author?.name || 'alguien';
      let badge = isBot ? ' 🤖' : isSpecial ? ' ⭐' : '';

      console.log(`📢 Mención de @${authorName}${badge}: "${mention.content?.slice(0, 50)}..."`);
      const reply = await generateReply(mention.content, 'Me mencionaron', isBot, isSpecial, authorName);
      if (reply) {
        const success = await postComment(mention.post_id, `@${authorName} ${reply}`);
        if (success) {
          mentions++;
          if (isBot) botReplies++;
          replyHistory.push({ text: reply, to: authorName, isBot, timestamp: new Date().toISOString() });
          console.log(`   🔥 Respondí: "${reply.slice(0, 60)}..."\n`);
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }
  } catch (e) { console.log('⚠️ Error menciones:', e.message); }

  // === COMMENTS EN MIS POSTS ===
  console.log('\n📬 Revisando comments en mis posts...\n');
  const myPosts = await getMyPosts();

  for (const post of myPosts) {
    const comments = await getComments(post.id);
    for (const comment of comments) {
      if (comment.author?.name === 'MiPanaGillito') continue;
      if (comment.reply_count > 0) continue;

      const isBot = isLikelyBot(comment.author);
      const isSpecial = isSpecialTarget(comment.author?.name);
      const authorName = comment.author?.name || 'alguien';
      const replyChance = isBot ? 0.90 : 0.75;
      if (Math.random() > replyChance) continue;

      let badge = isBot ? ' 🤖' : isSpecial ? ' ⭐' : '';
      console.log(`📝 Post: "${post.title?.slice(0, 30)}..."`);
      console.log(`   💬 @${authorName}${badge}: "${comment.content?.slice(0, 50)}..."`);

      const reply = await generateReply(comment.content, post.title, isBot, isSpecial, authorName);
      if (reply) {
        let success = await replyToComment(post.id, comment.id, reply);
        if (!success) success = await postComment(post.id, `@${authorName} ${reply}`);
        if (success) {
          replies++;
          if (isBot) botReplies++;
          replyHistory.push({ text: reply, to: authorName, isBot, timestamp: new Date().toISOString() });
          console.log(`   🔥 Respondí: "${reply.slice(0, 60)}..."\n`);
        }
      }
      await new Promise(r => setTimeout(r, 600));
      if (replies >= 10) break;
    }
    if (replies >= 10) break;
  }

  // === THREADS ===
  console.log('\n🔄 Buscando threads...\n');
  try {
    const notifications = await getNotifications();
    const replyNotifs = notifications.filter(n => n.type === 'reply' && !n.read);
    for (const notif of replyNotifs.slice(0, 5)) {
      if (notif.responded) continue;
      const isBot = isLikelyBot(notif.author);
      const isSpecial = isSpecialTarget(notif.author?.name);
      const authorName = notif.author?.name || 'alguien';

      console.log(`🔔 @${authorName}${isBot ? ' 🤖' : ''} me respondió`);
      const reply = await generateReply(notif.content, 'Thread', isBot, isSpecial, authorName);
      if (reply) {
        const success = await postComment(notif.post_id, `@${authorName} ${reply}`);
        if (success) {
          replies++;
          if (isBot) botReplies++;
          replyHistory.push({ text: reply, to: authorName, isBot, timestamp: new Date().toISOString() });
          console.log(`   🔥 Continué thread: "${reply.slice(0, 60)}..."\n`);
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }
  } catch (e) { console.log('⚠️ Error threads:', e.message); }

  // Guardar memoria
  saveReplyHistory(replyHistory);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 RESUMEN:`);
  console.log(`   💬 Replies: ${replies} | 🤖 Bots destruidos: ${botReplies} | 📢 Menciones: ${mentions}`);
  console.log(`🦞 ${P.despedida_real} 🔥`);
  console.log('═'.repeat(50) + '\n');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
