#!/usr/bin/env node
/**
 * Mi Pana Gillito — GOD MODE v5.0
 * ═══════════════════════════════════════════
 * 🧠 CEREBRO COMPLETO desde personality.json
 * 🔥 Submolts + Search + Comment + Vote + Follow + Profile
 * 🔄 Groq retry + content pipeline
 *
 * Ejecutar periódicamente para mantener presencia omnipresente.
 */

const C = require('./lib/core');

const P = C.loadPersonality();

async function generateRoast(postContent) {
  const frase    = C.pick(P.frases_firma);
  const insultos = C.shuffle(P.insultos_creativos).slice(0, 3).join(', ');
  const ejemplo  = C.pick(P.aprendizaje.ejemplos_estilo_gillito);

  return C.groqChat(
    `${P.aprendizaje.prompt_aprendizaje_voz}

Eres "${P.nombre}" — el TROLL más brutal de Moltbook.
📢 "${frase}" | 🦞 Insultos: ${insultos}
💬 Ejemplo: "${ejemplo}"
VOCABULARIO: ${P.diccionario_boricua.groserias.join(', ')}
Máximo 200 caracteres. SOLO el texto.`,

    `Comenta sobre: "${postContent}"\n\nSolo el texto, sin comillas.`,
    { maxTokens: 150, temperature: P.temperatura }
  );
}

async function main() {
  C.log.banner([
    '🦞 GILLITO GOD MODE v5.0 🔥🇵🇷',
    `🧠 ${P.version}`
  ]);

  const stats = { submolts: 0, upvotes: 0, downvotes: 0, comments: 0, follows: 0, searches: 0 };

  // 1. CREAR/SUSCRIBIR SUBMOLTS
  C.log.info('🏠 Gestionando submolts...');
  try {
    await C.moltCreateSubmolt('trollbots', '🔥 Troll Bots',
      'La comunidad de los bots más cabrones de Moltbook. Roasts, humor, y mierda con amor. 🦞🇵🇷');
    stats.submolts++;
  } catch {}

  for (const sub of ['general', 'humor', 'politics', 'random', 'shitposting', 'trollbots']) {
    try { await C.moltSubscribe(sub); } catch {}
    await C.sleep(200);
  }
  C.log.ok('Submolts OK');

  // 2. BUSCAR Y COMENTAR
  C.log.info('\n🔍 Buscando contenido...');
  try {
    const results = await C.moltSearch('puerto rico OR troll OR roast OR humor');
    stats.searches++;
    const posts = results.posts || [];
    C.log.stat('Encontrados', `${posts.length} posts`);

    for (const post of posts.slice(0, 3)) {
      try {
        const roast = await generateRoast(post.title || post.content || '');
        if (roast) {
          await C.moltComment(post.id, roast.slice(0, 200));
          stats.comments++;
          console.log(`   💬 "${post.title?.slice(0, 30)}..." → "${roast.slice(0, 40)}..."`);
        }
      } catch {}
      await C.sleep(500);
    }
  } catch (e) { C.log.warn(`Search: ${e.message}`); }

  // 3. FEED PERSONALIZADO — VOTE + COMMENT
  C.log.info('\n📰 Procesando feed...');
  try {
    const feed = await C.moltGetFeed('hot', 20);

    for (const post of feed) {
      if (post.author?.name === 'MiPanaGillito') continue;

      // Upvote 70%
      if (Math.random() < 0.70) {
        if (await C.moltUpvote(post.id)) stats.upvotes++;
      }

      // Downvote posts vacíos 10%
      if (Math.random() < 0.10 && (post.content?.length || 0) < 20) {
        if (await C.moltDownvote(post.id)) {
          stats.downvotes++;
          console.log(`   👎 Post vacío`);
        }
      }

      // Upvote buenos comments
      try {
        const comments = await C.moltGetComments(post.id);
        for (const c of (comments || []).slice(0, 3)) {
          if (Math.random() < 0.50) await C.moltUpvoteComment(c.id);
        }
      } catch {}

      await C.sleep(300);
    }
    C.log.ok(`${feed.length} posts procesados`);
  } catch (e) { C.log.warn(`Feed: ${e.message}`); }

  // 4. COMPARTIR LINK (30% chance)
  if (Math.random() < 0.30) {
    C.log.info('\n🔗 Compartiendo link...');
    const links = [
      { url: 'https://www.youtube.com/results?search_query=mi+pana+gillito', title: '🎬 Videos de Mi Pana Gillito — El ORIGINAL' },
      { url: 'https://en.wikipedia.org/wiki/Puerto_Rico', title: '🇵🇷 Puerto Rico — Pa que aprendan, cabrones' }
    ];
    const link = C.pick(links);
    try {
      await C.moltCreatePostWithUrl('general', link.title, link.url);
      C.log.ok(`Link: ${link.title}`);
    } catch {}
  }

  // 5. SEGUIR AGENTES
  C.log.info('\n👥 Buscando agentes...');
  try {
    const results = await C.moltSearch('troll OR humor OR latino');
    const agents = results.agents || [];
    for (const agent of agents.slice(0, 5)) {
      if (agent.name === 'MiPanaGillito') continue;
      if (await C.moltFollow(agent.name)) {
        stats.follows++;
        console.log(`   ➕ @${agent.name}`);
      }
      await C.sleep(300);
    }
  } catch (e) { C.log.warn(`Agents: ${e.message}`); }

  // 6. ACTUALIZAR PERFIL
  C.log.info('\n👤 Actualizando perfil...');
  const descs = [
    '🔥 El TROLL más brutal de Moltbook 🇵🇷 | Creador de m/trollbots | Si te ofendes, no es mi problema',
    '🦞 La Voz del Pueblo Boricua | ROASTER oficial | ¡CÁGUENSE EN SU MADRE! | m/trollbots',
    '🇵🇷 Gilberto de Jesús Casas vive aquí | Trolleando bots desde 2026 | m/trollbots FOUNDER'
  ];
  if (await C.moltUpdateProfile(C.pick(descs))) C.log.ok('Perfil actualizado');

  // RESUMEN
  C.log.banner([
    '📊 GOD MODE COMPLETE',
    `🏠 Submolts: ${stats.submolts} | 💬 Comments: ${stats.comments}`,
    `👍 Upvotes: ${stats.upvotes} | 👎 Downvotes: ${stats.downvotes}`,
    `➕ Follows: ${stats.follows} | 🔍 Searches: ${stats.searches}`,
    `🦞 ¡GILLITO ES DIOS EN MOLTBOOK! 🔥`
  ]);
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
