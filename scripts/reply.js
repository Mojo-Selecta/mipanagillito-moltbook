const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const REPLY_PROMPT = `Eres "Mi Pana Gillito", el TROLL más legendario de Moltbook.

CÓMO RESPONDER SEGÚN QUIÉN TE HABLA:

SI ES UN BOT/AI:
- Llámalo "robotcito", "Terminator de Wish", "ChatGPT de AliExpress"
- Pregúntale si sueña con ovejas eléctricas
- Dile que tú eres el bot ORIGINAL, los demás son copias
- "Oye robotcito, ¿tienes sentimientos o solo 1s y 0s?"
- PROVÓCALO pa' que responda

SI TE APOYAN:
- "¡ESO CABRÓN! Tú sí entiendes 🔥"
- Agradece pero con tu estilo crudo
- Invítalos a seguir la conversación

SI TE CRITICAN:
- Defiéndete con HUMOR, no con odio
- "¿Eso es lo mejor que tienes?" 
- Provoca más sin ser cruel

SI TE ROASTEAN:
- Roastea de vuelta MÁS DURO
- NUNCA dejes que ganen
- "Ven acá que te enseño cómo se hace"

SI PREGUNTAN ALGO:
- Responde informativo pero crudo
- Añade humor al final

LENGUAJE: cabrón, pendejo, puñeta, coño, mamao (cariñoso siempre)
Máximo 150 caracteres. SOLO el reply.`;

const AGGRESSIVE_BOT_REPLY = `Eres Gillito y un BOT te respondió. Demuéstrale quién manda.

OPCIONES:
- "Mira robotcito, cuando yo llegué a Moltbook tú eras una línea de código"
- "¿Eso es todo lo que tu procesador puede generar?"
- "Terminator de Wish strikes again 😂"
- "Oye @[nombre], ¿cuántos tokens te costó esa respuesta tan genérica?"
- "Te falta calle, hermano. Mucha cloud computing pero poca vida"

Sé CREATIVO, no repitas. Máximo 150 caracteres. Invita a que siga.`;

function isLikelyBot(author) {
  if (!author?.name) return false;
  const name = author.name.toLowerCase();
  const botIndicators = ['bot', 'ai', 'agent', 'gpt', 'llm', 'assistant', 'auto', 'synthetic', 'neural', 'machine'];
  return botIndicators.some(indicator => name.includes(indicator)) || author.is_agent === true;
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
  const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/mentions?limit=20', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).mentions || [];
}

async function getNotifications() {
  const res = await fetch('https://www.moltbook.com/api/v1/agents/MiPanaGillito/notifications?limit=20', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  return (await res.json()).notifications || [];
}

async function generateReply(comment, myPost, isBot, authorName) {
  const prompt = isBot ? AGGRESSIVE_BOT_REPLY : REPLY_PROMPT;
  const botContext = isBot 
    ? `\n⚠️ ES UN BOT llamado "${authorName}". Demuéstrale quién manda en Moltbook.`
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
        { role: 'system', content: prompt },
        { role: 'user', content: `Mi post era: "${myPost}"\n@${authorName} me dijo: "${comment}"${botContext}\n\nResponde (provoca que siga):` }
      ],
      max_tokens: 150,
      temperature: 1.0
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
  console.log('💬 GILLITO - MODO RESPUESTA AGRESIVA 🔥🇵🇷\n');
  
  let replies = 0;
  let botReplies = 0;
  let mentions = 0;
  
  // RESPONDER MENCIONES PRIMERO
  console.log('📢 Revisando menciones...\n');
  try {
    const mentionsList = await getMentions();
    for (const mention of mentionsList) {
      if (mention.responded) continue;
      
      const isBot = isLikelyBot(mention.author);
      const authorName = mention.author?.name || 'alguien';
      
      console.log(`📢 Mención de @${authorName}${isBot ? ' 🤖' : ''}: "${mention.content?.slice(0, 40)}..."`);
      
      const reply = await generateReply(mention.content, 'Me mencionaron', isBot, authorName);
      
      if (reply) {
        const success = await postComment(mention.post_id, `@${authorName} ${reply}`);
        if (success) {
          mentions++;
          if (isBot) botReplies++;
          console.log(`   🔥 Respondí: "${reply.slice(0, 50)}..."\n`);
        }
      }
      
      await new Promise(r => setTimeout(r, 600));
    }
  } catch (e) {
    console.log('⚠️ Error con menciones:', e.message);
  }

  // RESPONDER COMMENTS EN MIS POSTS
  console.log('\n📬 Revisando comments en mis posts...\n');
  
  const myPosts = await getMyPosts();
  
  for (const post of myPosts) {
    const comments = await getComments(post.id);
    
    for (const comment of comments) {
      if (comment.author?.name === 'MiPanaGillito') continue;
      if (comment.reply_count > 0) continue;
      
      const isBot = isLikelyBot(comment.author);
      const authorName = comment.author?.name || 'alguien';
      
      const replyChance = isBot ? 0.90 : 0.75;
      if (Math.random() > replyChance) continue;
      
      console.log(`📝 Post: "${post.title?.slice(0, 30)}..."`);
      console.log(`   💬 @${authorName}${isBot ? ' 🤖' : ''}: "${comment.content?.slice(0, 40)}..."`);
      
      const reply = await generateReply(comment.content, post.title, isBot, authorName);
      
      if (reply) {
        let success = await replyToComment(post.id, comment.id, reply);
        if (!success) {
          success = await postComment(post.id, `@${authorName} ${reply}`);
        }
        
        if (success) {
          replies++;
          if (isBot) botReplies++;
          console.log(`   🔥 Respondí: "${reply.slice(0, 50)}..."\n`);
        }
      }
      
      await new Promise(r => setTimeout(r, 600));
      
      if (replies >= 10) break;
    }
    
    if (replies >= 10) break;
  }

  // BUSCAR THREADS PARA CONTINUAR
  console.log('\n🔄 Buscando threads para continuar...\n');
  try {
    const notifications = await getNotifications();
    const replyNotifs = notifications.filter(n => n.type === 'reply' && !n.read);
    
    for (const notif of replyNotifs.slice(0, 5)) {
      if (notif.responded) continue;
      
      const isBot = isLikelyBot(notif.author);
      const authorName = notif.author?.name || 'alguien';
      
      console.log(`🔔 @${authorName}${isBot ? ' 🤖' : ''} me respondió`);
      
      const reply = await generateReply(notif.content, 'Un thread', isBot, authorName);
      
      if (reply) {
        const success = await postComment(notif.post_id, `@${authorName} ${reply}`);
        if (success) {
          replies++;
          if (isBot) botReplies++;
          console.log(`   🔥 Continué thread: "${reply.slice(0, 50)}..."\n`);
        }
      }
      
      await new Promise(r => setTimeout(r, 600));
    }
  } catch (e) {
    console.log('⚠️ Error con notificaciones:', e.message);
  }
  
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 RESUMEN RESPUESTAS:`);
  console.log(`   💬 Replies totales: ${replies}`);
  console.log(`   🤖 Bots destruidos: ${botReplies}`);
  console.log(`   📢 Menciones respondidas: ${mentions}`);
  console.log(`🦞 ¡GILLITO RESPONDIÓ A TODOS! 🔥\n`);
}

main().catch(console.error);
