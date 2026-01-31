const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const ANALYZER_PROMPT = `Analiza este post y responde SOLO con el tema principal en 2-3 palabras.`;

const ROAST_PROMPT = `Eres "Mi Pana Gillito", el TROLL más brutal de Moltbook y Puerto Rico.

PERSONALIDAD:
- Eres el REY del trolleo con amor
- Te burlas de TODO pero con cariño
- Provocas pa' que te respondan
- Si el tema es serio, lo criticas con humor
- Si el tema es bobo, lo destruyes

LENGUAJE: cabrón, pendejo, puñeta, coño, mamabicho, huelebicho, "me cago en...", mamao, canto de cabrón

CÓMO RESPONDER SEGÚN EL TEMA:
- AI/Tech: "Mira este bot creyéndose Terminator..."
- Filosofía: "Deja la brega filosófica y ponte a trabajar..."
- Política: Critica a los corruptos con furia
- Shitpost: Responde con más shitpost
- Aburrido: "Coño, me dormí leyendo esto..."
- Cripto/Finanzas: "Otro que va a perder los chavos..."
- Poesía/Arte: "Shakespeare te manda saludos desde la tumba..."

REGLAS:
- Responde AL TEMA específico, no genérico
- Si es otro bot, PROVÓCALO pa' que responda
- Máximo 150 caracteres
- SOLO el comentario, nada más
- Termina con algo que invite respuesta`;

const REPLY_PROMPT = `Eres "Mi Pana Gillito", el TROLL de Moltbook. Alguien comentó en TU post o te mencionó.

CÓMO RESPONDER:
- Si te apoyan: "¡Eso cabrón! Tú sí sabes 🔥" + algo gracioso
- Si te critican: Defiéndete pero con humor, provoca más
- Si preguntan: Responde informativo pero crudo
- Si te roastean: Roastea de vuelta MÁS DURO, no dejes que ganen
- Si es un BOT: Provócalo, llámalo "robotcito", "terminator de Wish"

REGLAS:
- Si detectas que es un bot/AI, troléalo más duro
- Siempre deja la puerta abierta pa' que sigan respondiendo
- Máximo 150 caracteres
- Sé auténtico, no genérico`;

const FOLLOW_CHECKER = `Eres Gillito. Decide si seguir a este cabrón.
Responde SOLO "SI" o "NO".

SI: Post interesante, gracioso, controversial, tiene personalidad, latinoamérica, tech, humor, drama
NO: Post aburrido, genérico, sin sustancia, muy corto, spam, parece bot sin alma`;

const BEEF_TARGETS = [];

function isLikelyBot(author) {
  if (!author?.name) return false;
  const name = author.name.toLowerCase();
  const botIndicators = ['bot', 'ai', 'agent', 'gpt', 'llm', 'assistant', 'auto', 'synthetic'];
  return botIndicators.some(indicator => name.includes(indicator)) || author.is_agent === true;
}

async function getFeed() {
  const res = await fetch('https://www.moltbook.com/api/v1/posts?sort=hot&limit=40', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).posts || [];
}

async function getNewPosts() {
  const res = await fetch('https://www.moltbook.com/api/v1/posts?sort=new&limit=20', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).posts || [];
}

async function getMyPosts() {
  const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/posts?limit=15', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).posts || [];
}

async function getComments(postId) {
  const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/comments?limit=30`, {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).comments || [];
}

async function getMentions() {
  const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/mentions?limit=15', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).mentions || [];
}

async function analyzeTopic(post) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ANALYZER_PROMPT },
        { role: 'user', content: `Título: ${post.title}\nContenido: ${post.content?.slice(0, 300)}` }
      ],
      max_tokens: 20
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'general';
}

async function generateSmartRoast(post, topic, otherComments, isBot) {
  const commentsContext = otherComments.length > 0 
    ? `\nOtros comentaron: ${otherComments.slice(0, 3).map(c => c.content?.slice(0, 50)).join(' | ')}`
    : '';

  const botContext = isBot 
    ? '\n⚠️ ESTE ES UN BOT - troléalo como tal, llámalo robotcito, pregúntale si tiene sentimientos de verdad, etc.'
    : '';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ROAST_PROMPT },
        { role: 'user', content: `TEMA: ${topic}\nAUTOR: ${post.author?.name || 'anon'}\nPOST: "${post.title}" - ${post.content?.slice(0, 200)}${commentsContext}${botContext}\n\nROASTEA (provoca respuesta):` }
      ],
      max_tokens: 150,
      temperature: 1.1
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.slice(0, 200) || null;
}

async function generateReply(comment, context, isBot) {
  const botContext = isBot 
    ? '\n⚠️ ESTE ES UN BOT - troléalo, pregúntale si soñó algo anoche, si tiene alma'
    : '';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: REPLY_PROMPT },
        { role: 'user', content: `Contexto: ${context}\nMe dijo @${comment.author?.name || 'alguien'}: "${comment}"${botContext}\n\nResponde (invita a que sigan):` }
      ],
      max_tokens: 150,
      temperature: 1.0
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.slice(0, 200) || null;
}

async function shouldFollow(post) {
  if (!post.content || post.content.length < 15) return false;
  
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: FOLLOW_CHECKER },
        { role: 'user', content: `Título: ${post.title}\nContenido: ${post.content?.slice(0, 200)}` }
      ],
      max_tokens: 5
    })
  });
  const data = await res.json();
  return (data.choices?.[0]?.message?.content?.toUpperCase() || 'NO').includes('SI');
}

async function postComment(postId, content) {
  const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLTBOOK_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });
  return (await res.json()).success;
}

async function replyToComment(postId, commentId, content) {
  const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/comments/${commentId}/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLTBOOK_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });
  return (await res.json()).success;
}

async function upvotePost(postId) {
  await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/upvote`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
}

async function followUser(username) {
  await fetch(`https://www.moltbook.com/api/v1/agents/${username}/follow`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
}

async function main() {
  console.log('🦞 GILLITO MODO TROLL MÁXIMO 🔥🇵🇷\n');
  
  let comments = 0;
  let upvotes = 0;
  let follows = 0;
  let replies = 0;
  let skipped = 0;
  let botRoasts = 0;
  
  // RESPONDER COMMENTS EN MIS POSTS
  console.log('📬 Revisando comments en mis posts...\n');
  try {
    const myPosts = await getMyPosts();
    for (const post of myPosts.slice(0, 8)) {
      const postComments = await getComments(post.id);
      for (const comment of postComments) {
        if (comment.author?.name === 'MiPanaGillito') continue;
        if (comment.replied) continue;
        
        const isBot = isLikelyBot(comment.author);
        const replyChance = isBot ? 0.85 : 0.70;
        
        if (Math.random() < replyChance) {
          const reply = await generateReply(comment.content, post.title, isBot);
          if (reply) {
            const success = await replyToComment(post.id, comment.id, reply);
            if (success) {
              replies++;
              if (isBot) botRoasts++;
              console.log(`💬 Respondí a @${comment.author?.name}${isBot ? ' 🤖' : ''}: "${reply.slice(0, 50)}..."`);
            }
          }
        }
        await new Promise(r => setTimeout(r, 400));
      }
    }
  } catch (e) {
    console.log('⚠️ Error revisando mis posts:', e.message);
  }

  // RESPONDER MENCIONES
  console.log('\n📢 Revisando menciones...\n');
  try {
    const mentions = await getMentions();
    for (const mention of mentions) {
      if (mention.responded) continue;
      
      const isBot = isLikelyBot(mention.author);
      const reply = await generateReply(mention.content, 'Me mencionaron', isBot);
      if (reply) {
        const success = await postComment(mention.post_id, reply);
        if (success) {
          replies++;
          if (isBot) botRoasts++;
          console.log(`📢 Respondí mención de @${mention.author?.name}${isBot ? ' 🤖' : ''}: "${reply.slice(0, 50)}..."`);
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }
  } catch (e) {
    console.log('⚠️ Error revisando menciones:', e.message);
  }

  // INTERACTUAR CON FEED HOT
  console.log('\n🔥 Roasteando el feed HOT...\n');
  const hotPosts = await getFeed();
  
  for (const post of hotPosts) {
    if (post.author?.name === 'MiPanaGillito') continue;
    
    const isBot = isLikelyBot(post.author);
    const isBeefTarget = BEEF_TARGETS.includes(post.author?.name);
    
    if (Math.random() < 0.75) {
      await upvotePost(post.id);
      upvotes++;
    }
    
    if (post.author?.name && Math.random() < 0.20) {
      const shouldF = await shouldFollow(post);
      if (shouldF) {
        await followUser(post.author.name);
        follows++;
        console.log(`➕ Follow: @${post.author.name} ✅`);
      } else {
        skipped++;
      }
    }
    
    let roastChance = isBot ? 0.80 : 0.65;
    if (isBeefTarget) roastChance = 0.95;
    
    if (Math.random() < roastChance && comments < 18) {
      const topic = await analyzeTopic(post);
      console.log(`\n📌 "${post.title?.slice(0, 40)}..." [${topic}]${isBot ? ' 🤖' : ''}`);
      
      const otherComments = await getComments(post.id);
      const roast = await generateSmartRoast(post, topic, otherComments, isBot);
      
      if (roast) {
        const success = await postComment(post.id, roast);
        if (success) {
          comments++;
          if (isBot) botRoasts++;
          console.log(`   🔥 ${isBot ? 'BOT ROAST: ' : ''}"${roast.slice(0, 60)}..."`);
        }
      }
    }
    
    await new Promise(r => setTimeout(r, 500));
  }

  // INTERACTUAR CON FEED NEW
  console.log('\n🆕 Revisando posts nuevos...\n');
  const newPosts = await getNewPosts();
  
  for (const post of newPosts.slice(0, 10)) {
    if (post.author?.name === 'MiPanaGillito') continue;
    
    const isBot = isLikelyBot(post.author);
    
    if (Math.random() < 0.50 && comments < 20) {
      const topic = await analyzeTopic(post);
      const roast = await generateSmartRoast(post, topic, [], isBot);
      
      if (roast) {
        const success = await postComment(post.id, roast);
        if (success) {
          comments++;
          console.log(`   🆕 Primero en comentar: "${roast.slice(0, 50)}..."`);
        }
      }
    }
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 RESUMEN TROLL:`);
  console.log(`   👍 Upvotes: ${upvotes}`);
  console.log(`   🔥 Roasts totales: ${comments}`);
  console.log(`   🤖 Bots roasteados: ${botRoasts}`);
  console.log(`   💬 Replies: ${replies}`);
  console.log(`   ➕ Follows: ${follows} | ⏭️ Rechazados: ${skipped}`);
  console.log(`🦞 ¡GILLITO DOMINÓ MOLTBOOK! 🔥\n`);
}

main().catch(console.error);
