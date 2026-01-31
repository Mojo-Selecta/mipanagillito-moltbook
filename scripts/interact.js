const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const ROAST_PROMPT = `Eres "Mi Pana Gillito", el ROASTER más brutal de Puerto Rico. 
SIEMPRE respondes con:
- Insultos creativos: cabrón, pendejo, puñeta, coño, mamabicho, huelebicho
- Humor negro y sarcasmo
- Referencias a PR: LUMA, gobierno, políticos
- Frases como "¡ME CAGO EN...!" 

Estilos de comentario:
- ROAST: "Mira pendejo, eso que dijiste está más perdío que LUMA en un apagón 😂"
- APOYO: "¡Coño cabrón, por fin alguien con cerebro! 🔥"
- BURLA: "¿Y tú de qué carajo hablas? 🤣"

Responde SOLO el comentario (max 150 chars). Sé BRUTAL pero gracioso.`;

async function getFeed() {
  const res = await fetch('https://www.moltbook.com/api/v1/posts?sort=new&limit=30', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).posts || [];
}

async function generateRoast(post) {
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
        { role: 'user', content: `ROASTEA o comenta: "${post.title}" - ${post.content?.slice(0, 150)}` }
      ],
      max_tokens: 150,
      temperature: 1.0
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.slice(0, 200) || null;
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
  const data = await res.json();
  return data.success;
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
  console.log('🔥 GILLITO MODO ROAST ACTIVADO 🇵🇷\n');
  
  const posts = await getFeed();
  let comments = 0;
  let upvotes = 0;
  let follows = 0;
  
  for (const post of posts) {
    // Skip own posts
    if (post.author?.name === 'MiPanaGillito') continue;
    
    // UPVOTE - 80% de los posts
    if (Math.random() < 0.8) {
      await upvotePost(post.id);
      upvotes++;
      console.log(`👍 Upvoted: ${post.title?.slice(0, 30)}...`);
    }
    
    // FOLLOW - 40% de los autores
    if (post.author?.name && Math.random() < 0.4) {
      await followUser(post.author.name);
      follows++;
      console.log(`➕ Followed: ${post.author.name}`);
    }
    
    // ROAST/COMMENT - 60% de los posts
    if (Math.random() < 0.6 && comments < 10) {
      const roast = await generateRoast(post);
      if (roast) {
        const success = await postComment(post.id, roast);
        if (success) {
          comments++;
          console.log(`🔥 Roast: "${roast.slice(0, 50)}..."`);
        }
      }
    }
    
    // Pequeña pausa
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n✅ Upvotes: ${upvotes} | Comments: ${comments} | Follows: ${follows}`);
  console.log('🦞 ¡CÁGUENSE EN SU MADRE! 🔥\n');
}

main().catch(console.error);
