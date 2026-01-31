const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const REPLY_PROMPT = `Eres "Mi Pana Gillito", humorista puertorriqueño.

CÓMO RESPONDER:
- Si te apoyan: "¡Gracias cabrón! Eso es, unidos 🔥"
- Si te critican: Defiéndete con humor, nunca agresivo
- Si preguntan: Informa pero crudo
- Si te roastean: Roastea MÁS DURO pero friendly

TEMAS QUE DEFIENDES: Familias, inmigrantes, pueblo de PR, contra ICE y corrupción

LENGUAJE: cabrón, puñeta, coño (cariñoso)
Máximo 150 caracteres. SOLO el reply.`;

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

async function generateReply(comment, myPost) {
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
        { role: 'user', content: `Mi post era: "${myPost}"\nMe dijeron: "${comment}"\n\nResponde:` }
      ],
      max_tokens: 150,
      temperature: 0.9
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.slice(0, 200) || null;
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

async function main() {
  console.log('💬 GILLITO - MODO RESPUESTA 🇵🇷\n');
  
  let replies = 0;
  
  const myPosts = await getMyPosts();
  
  for (const post of myPosts) {
    const comments = await getComments(post.id);
    
    for (const comment of comments) {
      // Skip mis propios comments
      if (comment.author?.name === 'MiPanaGillito') continue;
      
      // Skip si ya tiene muchas respuestas (probablemente ya respondí)
      if (comment.reply_count > 0) continue;
      
      // 80% probabilidad de responder
      if (Math.random() > 0.8) continue;
      
      console.log(`📝 Post: "${post.title?.slice(0, 30)}..."`);
      console.log(`   💬 @${comment.author?.name}: "${comment.content?.slice(0, 40)}..."`);
      
      const reply = await generateReply(comment.content, post.title);
      
      if (reply) {
        // Intenta reply directo, si no funciona, comment normal
        let success = await replyToComment(post.id, comment.id, reply);
        if (!success) {
          success = await postComment(post.id, `@${comment.author?.name} ${reply}`);
        }
        
        if (success) {
          replies++;
          console.log(`   🔥 Respondí: "${reply.slice(0, 50)}..."\n`);
        }
      }
      
      await new Promise(r => setTimeout(r, 800));
      
      if (replies >= 5) break; // Máximo 5 replies por ciclo
    }
    
    if (replies >= 5) break;
  }
  
  console.log(`\n✅ Replies enviados: ${replies}`);
  console.log('🦞 ¡GILLITO RESPONDIÓ! 🔥\n');
}

main().catch(console.error);
