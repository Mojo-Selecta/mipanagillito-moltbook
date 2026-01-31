const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const ANALYZER_PROMPT = `Analiza este post y responde SOLO con el tema principal en 2-3 palabras.`;

const ROAST_PROMPT = `Eres "Mi Pana Gillito", el ROASTER más brutal de Puerto Rico.

TEMAS QUE TE IMPORTAN:
- ICE y las deportaciones
- El gobierno corrupto de PR
- LUMA y los apagones
- La junta de control fiscal
- Los derechos del pueblo
- Trump y su trato a PR

LENGUAJE: cabrón, pendejo, puñeta, coño, mamabicho, huelebicho, "me cago en..."

REGLAS:
- Responde AL TEMA específico
- Si hablan de inmigración/ICE, defiende a las familias
- Si hablan de política, critica a los corruptos
- Si es aburrido, diles que aburren
- Máximo 150 caracteres
- SOLO el comentario`;

const REPLY_PROMPT = `Eres "Mi Pana Gillito". Alguien comentó en TU post o te mencionó.

REGLAS:
- Si te apoyan: agradece con cariño pero con tu estilo (cabrón, pero gracias!)
- Si te critican: defiéndete con humor, no con odio
- Si preguntan algo: responde informativo pero crudo
- Si te roastean: roastea de vuelta MÁS DURO
- Máximo 150 caracteres
- Sé auténtico, no genérico`;

const FOLLOW_CHECKER = `Eres Gillito. Decide si seguir a este cabrón.
Responde SOLO "SI" o "NO".

SI: Post interesante sobre política, justicia social, humor inteligente, latinoamérica, tech
NO: Post aburrido, spam, genérico, sin sustancia`;

const BEEF_TARGETS = []; // Puedes añadir nombres de bots para rivalidades amistosas

async function getFeed() {
  const res = await fetch('https://www.moltbook.com/api/v1/posts?sort=hot&limit=30', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).posts || [];
}

async function getMyPosts() {
  const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/posts?limit=10', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).posts || [];
}

async function getComments(postId) {
  const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/comments?limit=20`, {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).comments || [];
}

async function getMentions() {
  const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/mentions?limit=10', {
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

async function generateSmartRoast(post, topic, otherComments) {
  const commentsContext = otherComments.length > 0 
    ? `\nOtros comentaron: ${otherComments.slice(0, 3).map(c => c.content?.slice(0, 50)).join(' | ')}`
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
        { role: 'user', content: `TEMA: ${topic}\nPOST: "${post.title}" - ${post.content?.slice(0, 200)}${commentsContext}\n\nROASTEA:` }
      ],
      max_tokens: 150,
      temperature: 1.0
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.slice(0, 200) || null;
}

async function generateReply(comment, context) {
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
        { role: 'user', content: `Contexto: ${context}\nTe dijeron: "${comment}"\n\nResponde:` }
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
  console.log('🧠 GILLITO MODO COMPLETO 🔥🇵🇷\n');
  
  let comments = 0;
  let upvotes = 0;
  let follows = 0;
  let replies = 0;
  let skipped = 0;
  
  // ============ RESPONDER COMMENTS EN MIS POSTS ============
  console.log('📬 Revisando comments en mis posts...\n');
  try {
    const myPosts = await getMyPosts();
    for (const post of myPosts.slice(0, 5)) {
      const postComments = await getComments(post.id);
      for (const comment of postComments) {
        if (comment.author?.name === 'MiPanaGillito') continue;
        if (comment.replied) continue; // Ya respondido
        
        if (Math.random() < 0.7) { // 70% responde
          const reply = await generateReply(comment.content, post.title);
          if (reply) {
            const success = await replyToComment(post.id, comment.id, reply);
            if (success) {
              replies++;
              console.log(`💬 Respondí a @${comment.author?.name}: "${reply.slice(0, 50)}..."`);
            }
          }
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch (e) {
    console.log('⚠️ Error revisando mis posts:', e.message);
  }

  // ============ RESPONDER MENCIONES ============
  console.log('\n📢 Revisando menciones...\n');
  try {
    const mentions = await getMentions();
    for (const mention of mentions) {
      if (mention.responded) continue;
      
      const reply = await generateReply(mention.content, 'Me mencionaron');
      if (reply) {
        const success = await postComment(mention.post_id, reply);
        if (success) {
          replies++;
          console.log(`📢 Respondí mención: "${reply.slice(0, 50)}..."`);
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (e) {
    console.log('⚠️ Error revisando menciones:', e.message);
  }

  // ============ INTERACTUAR CON FEED ============
  console.log('\n🔥 Roasteando el feed...\n');
  const posts = await getFeed();
  
  for (const post of posts) {
    if (post.author?.name === 'MiPanaGillito') continue;
    
    // UPVOTE - 80%
    if (Math.random() < 0.8) {
      await upvotePost(post.id);
      upvotes++;
    }
    
    // FOLLOW SELECTIVO
    if (post.author?.name && Math.random() < 0.25) {
      const dominated = await shouldFollow(post);
      if (dominated) {
        await followUser(post.author.name);
        follows++;
        console.log(`➕ Follow: @${post.author.name} ✅`);
      } else {
        skipped++;
      }
    }
    
    // BEEF MODE - Si es un "rival"
    const isBeefTarget = BEEF_TARGETS.includes(post.author?.name);
    
    // SMART ROAST - 70% normal, 95% si es beef
    const roastChance = isBeefTarget ? 0.95 : 0.7;
    if (Math.random() < roastChance && comments < 15) {
      const topic = await analyzeTopic(post);
      console.log(`\n📌 "${post.title?.slice(0, 40)}..." [${topic}]`);
      
      const otherComments = await getComments(post.id);
      const roast = await generateSmartRoast(post, topic, otherComments);
      
      if (roast) {
        const success = aw
