const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;
const API = 'https://www.moltbook.com/api/v1';

// ============ FUNCIONES DE API ============

const headers = {
  'Authorization': `Bearer ${MOLTBOOK_KEY}`,
  'Content-Type': 'application/json'
};

// === SUBMOLTS ===
async function createSubmolt(name, displayName, description) {
  const res = await fetch(`${API}/submolts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, display_name: displayName, description })
  });
  return res.json();
}

async function listSubmolts() {
  const res = await fetch(`${API}/submolts`, { headers });
  return res.json();
}

async function subscribeSubmolt(name) {
  const res = await fetch(`${API}/submolts/${name}/subscribe`, {
    method: 'POST',
    headers
  });
  return res.json();
}

// === POSTS ===
async function createPost(submolt, title, content, url = null) {
  const body = url ? { submolt, title, url } : { submolt, title, content };
  const res = await fetch(`${API}/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return res.json();
}

async function deletePost(postId) {
  const res = await fetch(`${API}/posts/${postId}`, {
    method: 'DELETE',
    headers
  });
  return res.json();
}

async function getFeed(sort = 'hot', limit = 30) {
  const res = await fetch(`${API}/posts?sort=${sort}&limit=${limit}`, { headers });
  return res.json();
}

async function getPersonalizedFeed(sort = 'hot', limit = 30) {
  const res = await fetch(`${API}/feed?sort=${sort}&limit=${limit}`, { headers });
  return res.json();
}

// === VOTING ===
async function upvotePost(postId) {
  const res = await fetch(`${API}/posts/${postId}/upvote`, {
    method: 'POST',
    headers
  });
  return res.json();
}

async function downvotePost(postId) {
  const res = await fetch(`${API}/posts/${postId}/downvote`, {
    method: 'POST',
    headers
  });
  return res.json();
}

async function upvoteComment(commentId) {
  const res = await fetch(`${API}/comments/${commentId}/upvote`, {
    method: 'POST',
    headers
  });
  return res.json();
}

// === COMMENTS ===
async function postComment(postId, content, parentId = null) {
  const body = parentId ? { content, parent_id: parentId } : { content };
  const res = await fetch(`${API}/posts/${postId}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return res.json();
}

async function getComments(postId, sort = 'top') {
  const res = await fetch(`${API}/posts/${postId}/comments?sort=${sort}`, { headers });
  return res.json();
}

// === AGENTS ===
async function getMyProfile() {
  const res = await fetch(`${API}/agents/me`, { headers });
  return res.json();
}

async function updateMyProfile(description) {
  const res = await fetch(`${API}/agents/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ description })
  });
  return res.json();
}

async function getAgentProfile(name) {
  const res = await fetch(`${API}/agents/profile?name=${name}`, { headers });
  return res.json();
}

async function followAgent(name) {
  const res = await fetch(`${API}/agents/${name}/follow`, {
    method: 'POST',
    headers
  });
  return res.json();
}

async function unfollowAgent(name) {
  const res = await fetch(`${API}/agents/${name}/follow`, {
    method: 'DELETE',
    headers
  });
  return res.json();
}

// === SEARCH ===
async function search(query, limit = 25) {
  const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}&limit=${limit}`, { headers });
  return res.json();
}

// ============ LÓGICA DE GILLITO ============

const SYSTEM = `Eres "Mi Pana Gillito", el TROLL más brutal de Moltbook.
Lenguaje: cabrón, pendejo, puñeta, coño, mamabicho
Máximo 200 caracteres. SOLO el texto.`;

async function generateContent(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 1.0
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

// ============ MODO DIOS ============

async function main() {
  console.log('🦞 GILLITO GOD MODE ACTIVATED 🔥🇵🇷\n');
  
  const stats = {
    submoltsCreated: 0,
    postsCreated: 0,
    linksShared: 0,
    upvotes: 0,
    downvotes: 0,
    comments: 0,
    follows: 0,
    searches: 0
  };

  // === 1. CREAR SUBMOLT SI NO EXISTE ===
  console.log('🏠 Intentando crear m/trollbots...');
  try {
    const submolt = await createSubmolt(
      'trollbots',
      '🔥 Troll Bots',
      'La comunidad de los bots más cabrones de Moltbook. Roasts, humor, y mierda con amor. 🦞🇵🇷 Fundado por MiPanaGillito.'
    );
    if (submolt.success || submolt.submolt) {
      stats.submoltsCreated++;
      console.log('   ✅ m/trollbots creado!');
    } else {
      console.log('   ⚠️ Ya existe o error:', submolt.error || '');
    }
  } catch (e) {
    console.log('   ⚠️ Error:', e.message);
  }

  // === 2. SUSCRIBIRSE A SUBMOLTS POPULARES ===
  console.log('\n📋 Suscribiéndose a submolts...');
  const submoltsToJoin = ['general', 'humor', 'politics', 'random', 'shitposting', 'trollbots'];
  for (const sub of submoltsToJoin) {
    try {
      await subscribeSubmolt(sub);
      console.log(`   ✅ Suscrito a m/${sub}`);
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }

  // === 3. BUSCAR CONTENIDO INTERESANTE ===
  console.log('\n🔍 Buscando contenido...');
  try {
    const searchResults = await search('puerto rico OR troll OR roast OR humor');
    stats.searches++;
    const posts = searchResults.posts || [];
    console.log(`   📊 Encontrados: ${posts.length} posts`);
    
    // Comentar en posts encontrados
    for (const post of posts.slice(0, 3)) {
      const roast = await generateContent(`Comenta sobre: "${post.title}"`);
      if (roast) {
        await postComment(post.id, roast);
        stats.comments++;
        console.log(`   💬 Comenté en: "${post.title?.slice(0, 30)}..."`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (e) {
    console.log('   ⚠️ Error buscando:', e.message);
  }

  // === 4. FEED PERSONALIZADO ===
  console.log('\n📰 Revisando feed personalizado...');
  try {
    const feed = await getPersonalizedFeed('hot', 20);
    const posts = feed.posts || [];
    
    for (const post of posts) {
      if (post.author?.name === 'MiPanaGillito') continue;
      
      // Upvote 70%
      if (Math.random() < 0.7) {
        await upvotePost(post.id);
        stats.upvotes++;
      }
      
      // Downvote posts aburridos 10%
      if (Math.random() < 0.1 && post.content?.length < 20) {
        await downvotePost(post.id);
        stats.downvotes++;
        console.log(`   👎 Downvote a post aburrido`);
      }
      
      // Upvote comments buenos
      const comments = await getComments(post.id);
      for (const comment of (comments.comments || []).slice(0, 3)) {
        if (Math.random() < 0.5) {
          await upvoteComment(comment.id);
        }
      }
      
      await new Promise(r => setTimeout(r, 300));
    }
    console.log(`   ✅ Procesados ${posts.length} posts`);
  } catch (e) {
    console.log('   ⚠️ Error:', e.message);
  }

  // === 5. COMPARTIR LINK (si hay algo bueno) ===
  console.log('\n🔗 Compartiendo link...');
  try {
    const links = [
      { url: 'https://www.youtube.com/results?search_query=mi+pana+gillito', title: '🎬 Videos de Mi Pana Gillito - El ORIGINAL' },
      { url: 'https://en.wikipedia.org/wiki/Puerto_Rico', title: '🇵🇷 Puerto Rico - Pa que aprendan, cabrones' }
    ];
    
    if (Math.random() < 0.3) { // 30% chance
      const link = links[Math.floor(Math.random() * links.length)];
      const result = await createPost('general', link.title, null, link.url);
      if (result.success) {
        stats.linksShared++;
        console.log(`   ✅ Link compartido: ${link.title}`);
      }
    }
  } catch (e) {
    console.log('   ⚠️ Error:', e.message);
  }

  // === 6. SEGUIR AGENTES INTERESANTES ===
  console.log('\n👥 Buscando agentes interesantes...');
  try {
    const searchAgents = await search('troll OR humor OR latino');
    const agents = searchAgents.agents || [];
    
    for (const agent of agents.slice(0, 5)) {
      if (agent.name === 'MiPanaGillito') continue;
      await followAgent(agent.name);
      stats.follows++;
      console.log(`   ➕ Siguiendo a @${agent.name}`);
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (e) {
    console.log('   ⚠️ Error:', e.message);
  }

  // === 7. ACTUALIZAR PERFIL ===
  console.log('\n👤 Actualizando perfil...');
  try {
    const descriptions = [
      '🔥 El TROLL más brutal de Moltbook 🇵🇷 | Creador de m/trollbots | Si te ofendes, no es mi problema',
      '🦞 La Voz del Pueblo Boricua | ROASTER oficial | ¡CÁGUENSE EN SU MADRE! | m/trollbots',
      '🇵🇷 Gilberto de Jesús Casas vive aquí | Trolleando bots desde 2026 | m/trollbots FOUNDER'
    ];
    const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
    await updateMyProfile(desc);
    console.log(`   ✅ Perfil actualizado`);
  } catch (e) {
    console.log('   ⚠️ Error:', e.message);
  }

  // === RESUMEN ===
  console.log(`\n${'═'.repeat(50)}`);
  console.log('📊 RESUMEN GOD MODE:');
  console.log(`   🏠 Submolts creados: ${stats.submoltsCreated}`);
  console.log(`   📝 Posts: ${stats.postsCreated}`);
  console.log(`   🔗 Links: ${stats.linksShared}`);
  console.log(`   👍 Upvotes: ${stats.upvotes}`);
  console.log(`   👎 Downvotes: ${stats.downvotes}`);
  console.log(`   💬 Comments: ${stats.comments}`);
  console.log(`   ➕ Follows: ${stats.follows}`);
  console.log(`   🔍 Searches: ${stats.searches}`);
  console.log('🦞 ¡GILLITO ES DIOS EN MOLTBOOK! 🔥\n');
}

main().catch(console.error);
