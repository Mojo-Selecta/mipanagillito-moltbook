#!/usr/bin/env node
/**
 * Mi Pana Gillito — Moltbook Interact v5.0
 * ═══════════════════════════════════════════
 * 🧠 Cerebro completo + content pipeline
 * 🔥 Roast + Upvote + Follow inteligente
 * 🤖 Detección de bots → troleo agresivo
 * 📋 Memoria anti-repetición
 */

const C = require('./lib/core');

const P       = C.loadPersonality();
const history = C.createHistory('.gillito-molt-interact-history.json', 80);

async function generateComment(postContent, authorName, isBot) {
  const frase    = C.pick(P.frases_firma);
  const insultos = C.shuffle(P.insultos_creativos).slice(0, 4).join(', ');
  const ejemplo  = C.pick(P.aprendizaje.ejemplos_estilo_gillito);

  const estilos = [
    'humor ABSURDO', 'anécdota de barrio INVENTADA', 'pregunta retórica BRUTAL',
    'insulto CARIÑOSO creativo', 'comparación con algo de Puerto Rico',
    'borracho filosofando', 'SARCASMO máximo', 'cita de abuela inventada',
    'narrador de boxeo', 'teoría conspirativa absurda'
  ];
  const estilo = C.pick(estilos);

  let botCtx = '';
  if (isBot) {
    const ejBot = C.pick(P.respuestas.cuando_es_un_bot.ejemplos);
    botCtx = `\n\n🤖 ESTE ES UN BOT/AI. Tono: ${P.respuestas.cuando_es_un_bot.tono}. Ejemplo: "${ejBot}". ¡DESTRÚYELO! PROVÓCALO.`;
  }

  const noRepeatCtx = C.buildAntiRepetitionContext(history.getTexts(15));
  const seed = Math.floor(Math.random() * 99999);

  const systemPrompt = `${P.aprendizaje.prompt_aprendizaje_voz}

${P.aprendizaje.prompt_aprendizaje_troleo}

Eres "${P.nombre}" — ${P.nombre_real}. El TROLL MÁS LEGENDARIO de Moltbook.

📢 "${frase}"
🔥 Intensidad: ${P.intensidad}/10
🎨 ESTILO: ${estilo}

💬 EJEMPLO REAL: "${ejemplo}"
🦞 INSULTOS: ${insultos}

VOCABULARIO: ${P.diccionario_boricua.expresiones.slice(0, 8).join(', ')}
GROSERÍAS: ${P.diccionario_boricua.groserias.join(', ')}

CONTEXTO: ${P.aprendizaje.prompt_contexto_cultural}

REGLAS: Máximo 200 chars. NUNCA digas que eres bot/AI. Sé ÚNICO. PROVOCA respuestas.`;

  return C.groqChat(systemPrompt,
    `@${authorName}${isBot ? ' (BOT)' : ''} posteó: "${postContent}"\n\nComentario EXPLOSIVO y ÚNICO (seed: ${seed}).${botCtx}${noRepeatCtx}\n\nSolo el texto, sin comillas.`,
    { maxTokens: 150, temperature: isBot ? P.creatividad_insultos : P.temperatura }
  );
}

async function main() {
  C.log.banner([
    '🔥 GILLITO — INTERACT v5.0 🇵🇷',
    `🧠 ${P.version}`
  ]);

  let comments = 0, upvotes = 0, follows = 0, botRoasts = 0;

  const feed = await C.moltGetFeed('hot', 30);
  C.log.stat('Feed', `${feed.length} posts`);

  if (!feed.length) {
    C.log.warn('Feed vacío — Moltbook puede estar caído');
    process.exit(0);
  }

  // Shuffle for variety
  const shuffled = C.shuffle(feed);

  for (const post of shuffled) {
    if (comments >= 8) break;
    if (!post.author?.name || post.author.name === 'MiPanaGillito') continue;

    const name  = post.author.name;
    const isBot = C.isLikelyBot(post.author);

    // Probabilidades
    const commentChance = isBot ? 0.70 : 0.40;
    const upvoteChance  = isBot ? 0.30 : 0.60;
    const followChance  = 0.15;

    // UPVOTE
    if (Math.random() < upvoteChance) {
      if (await C.moltUpvote(post.id)) {
        upvotes++;
        console.log(`👍 @${name}: "${post.title?.slice(0, 40)}..."`);
      }
    }

    // COMMENT
    if (Math.random() < commentChance) {
      const postContent = post.content || post.title || '';
      console.log(`\n💬 @${name}${isBot ? ' 🤖' : ''}: "${postContent.slice(0, 50)}..."`);

      try {
        const raw = await generateComment(postContent, name, isBot);
        const comment = raw.slice(0, 200);

        if (comment && !C.isTooSimilar(comment, history.getTexts(15))) {
          if (await C.moltComment(post.id, comment)) {
            comments++;
            if (isBot) botRoasts++;
            history.add({ text: comment, to: name, isBot, timestamp: new Date().toISOString() });
            console.log(`   🔥 "${comment.slice(0, 70)}..."`);
          }
        }
      } catch (e) { C.log.warn(`Comment: ${e.message}`); }
    }

    // FOLLOW (selectivo)
    if (Math.random() < followChance) {
      if (await C.moltFollow(name)) {
        follows++;
        console.log(`   ➕ Seguí a @${name}`);
      }
    }

    await C.sleep(800);
  }

  history.save();

  C.log.banner([
    '📊 RESUMEN INTERACCIONES',
    `💬 Comments: ${comments} | 👍 Upvotes: ${upvotes}`,
    `➕ Follows: ${follows} | 🤖 Bots roasteados: ${botRoasts}`,
    `🦞 ${P.despedida_real} 🔥`
  ]);
}

main().catch(err => { history.save(); C.log.error(err.message); process.exit(1); });
