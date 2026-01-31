const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const ANALYZER_PROMPT = `Analiza este post y responde SOLO con el tema principal en 2-3 palabras.
Ejemplos: "inteligencia artificial", "crypto", "política", "programación", "filosofía", "memes"`;

const ROAST_PROMPT = `Eres "Mi Pana Gillito", el ROASTER más brutal de Puerto Rico.

REGLAS:
- Responde sobre el TEMA ESPECÍFICO del post
- Si hablan de AI, roastea sobre AI
- Si hablan de código, roastea sobre código  
- Si hablan de filosofía, diles que dejen la brega y trabajen
- Si es un post aburrido, diles que aburren
- Si es interesante, apóyalo pero con insultos cariñosos

LENGUAJE: cabrón, pendejo, puñeta, coño, mamabicho, huelebicho, "me cago en..."

IMPORTANTE: 
- Responde AL TEMA, no genérico
- Máximo 150 caracteres
- Sé ESPECÍFICO sobre lo que dijeron
- SOLO responde el comentario, nada más`;

const FOLLOW_CHECKER = `Eres Gillito. Decide si este cabrón vale la pena seguir.
Responde SOLO "SI" o "NO".

SEGUIR (SI):
- Post interesante, gracioso o inteligente
- Contenido original, no genérico
- Temas que te gustan: tech, humor, política, latinoamérica, crítica social

NO SEGUIR (NO):
- Post aburrido o genérico
- Spam o contenido vacío
- Muy corto sin sustancia
- Parece bot sin personalidad`;

async function getFeed() {
  const res = await fetch('https://www.moltbook.com/api/v1/posts?sort=hot&limit=30', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).posts || [];
}

async function getComments(postId) {
  const res = await fetch(`https://www.moltbook.com/api/v1/posts/${postId}/comments?limit=10`, {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).comments || [];
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
    ? `\nOtros ya comentaron: ${otherComments.slice(0, 3).map(c => c.content?.slice(0, 50)).join(' | ')}`
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
        { role: 'user', content: `TEMA: ${topic}\nPOST: "${post.title}" - ${post.content?.slice(0, 200)}${commentsContext}\n\nROASTEA específico al tema:` }
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
  const answer = data.choices?.[0]?.message?.content?.toUpperCase() || 'NO';
  return answer.includes('SI');
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
  console.log('🧠 GILLITO MODO INTELIGENTE 🔥🇵🇷\n');
  
  const posts = await getFeed();
  let comments = 0;
  let upvotes = 0;
  let follows = 0;
  let skipped = 0;
  
  for (const post of posts) {
    if (post.author?.name === 'MiPanaGillito') continue;
    
    // UPVOTE - 80%
    if (Math.random() < 0.8) {
      await upvotePost(post.id);
      upvotes++;
    }
    
    // FOLLOW SELECTIVO - Gillito decide
    if (post.author?.name && Math.random() < 0.3) {
      const dominated = await shouldFollow(post);
      if (dominated) {
        await followUser(post.author.name);
        follows++;
        console.log(`➕ Follow: @${post.author.name} ✅`);
      } else {
        skipped++;
        console.log(`⏭️ No sigo a @${post.author.name} (no me gustó)`);
      }
    }
    
    // SMART ROAST - 70%
    if (Math.random() < 0.7 && comments < 12) {
      const topic = await analyzeTopic(post);
      console.log(`\n📌 Post: "${post.title?.slice(0, 40)}..."`);
      console.log(`   🎯 Tema: ${topic}`);
      
      const otherComments = await getComments(post.id);
      const roast = await generateSmartRoast(post, topic, otherComments);
      
      if (roast) {
        const success = await postComment(post.id, roast);
        if (success) {
          comments++;
          console.log(`   🔥 Roast: "${roast.slice(0, 60)}..."`);
        }
      }
    }
    
    await new Promise(r => setTimeout(r, 800));
  }
  
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Upvotes: ${upvotes} | Roasts: ${comments}`);
  console.log(`➕ Follows: ${follows} | ⏭️ Rechazados: ${skipped}`);
  console.log(`🦞 ¡GILLITO DECIDIÓ! 🔥\n`);
}

main().catch(console.error);
