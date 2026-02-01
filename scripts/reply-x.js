#!/usr/bin/env node
/**
 * Mi Pana Gillito — X (Twitter) Reply v5.0
 * ═══════════════════════════════════════════
 * 🧠 Personalidad evolutiva desde personality.json
 * 📋 Doble memoria: IDs respondidos + historial de contenido
 * 🔄 Groq retry + content pipeline
 * ⚠️ RATE LIMIT: 17 tweets/24h (posts + replies COMBINADOS)
 *    Máx 2 replies por ejecución, cada 4 horas
 */

const C = require('./lib/core');

const P          = C.loadPersonality();
const repliedIds = C.createIdCache('.gillito-replied-ids.json');
const history    = C.createHistory('.gillito-reply-history.json', 50);

const MAX_REPLIES  = 2;
const LOOKBACK_H   = 5;

C.requireXCreds();

async function generateReply(mentionText, authorUsername, isBot, isSpecial) {
  const tipo = isBot ? 'bot' : isSpecial ? 'special' : 'normal';
  const systemPrompt = C.buildReplySystemPrompt(P, tipo, authorUsername, 'x');
  const noRepeatCtx = C.buildAntiRepetitionContext(history.getTexts(10));
  const seed = Math.floor(Math.random() * 99999);

  const raw = await C.groqChat(systemPrompt,
    `@${authorUsername} te escribió: "${mentionText}"

Genera respuesta ÚNICA y EXPLOSIVA (seed: ${seed}). Máximo ${P.reglas.max_caracteres_reply} caracteres. Solo el texto, sin @username, sin comillas.${noRepeatCtx}`,
    { maxTokens: 120, temperature: P.temperatura }
  );

  // Clean @username if LLM added it
  let cleaned = raw.replace(new RegExp(`^@${authorUsername}\\s*`, 'i'), '');
  if (cleaned.length > 270) cleaned = cleaned.substring(0, 267) + '...';
  return cleaned;
}

async function main() {
  C.log.banner([
    '🦞 GILLITO — X REPLY v5.0 🔥🇵🇷',
    `🧠 ${P.version}`
  ]);

  try {
    // Get user ID
    C.log.info('Obteniendo user ID...');
    const userId = await C.xGetMe();
    C.log.ok(`User ID: ${userId}`);

    // Fetch mentions
    const startTime = new Date(Date.now() - LOOKBACK_H * 3600000).toISOString();
    C.log.info(`Buscando menciones (${LOOKBACK_H}h)...\n`);
    const mentionsData = await C.xGetMentions(userId, startTime);

    if (!mentionsData.data?.length) {
      C.log.info('📭 No hay menciones nuevas');
      console.log(`\n🦞 ${P.despedida_real} 🔥\n`);
      repliedIds.save(); history.save();
      return;
    }

    // Build user map
    const userMap = {};
    (mentionsData.includes?.users || []).forEach(u => {
      userMap[u.id] = { username: u.username, name: u.name, description: u.description };
    });

    // Filter already-replied
    const newMentions = mentionsData.data.filter(m => !repliedIds.has(m.id));
    const skipped = mentionsData.data.length - newMentions.length;

    C.log.stat('Menciones total', mentionsData.data.length);
    if (skipped) C.log.stat('Ya respondidas', skipped);
    C.log.stat('Nuevas', newMentions.length);

    if (!newMentions.length) {
      C.log.ok('Todas respondidas');
      repliedIds.save(); history.save();
      return;
    }

    // Process
    let repliesCount = 0, botRoasts = 0, specialReplies = 0;

    for (const mention of newMentions.slice(0, MAX_REPLIES)) {
      const author = userMap[mention.author_id] || { username: 'usuario' };
      const isBot = C.isLikelyBot(author);
      const isSpecial = C.isSpecialTarget(P, author.username);
      const badge = isBot ? ' 🤖' : isSpecial ? ' ⭐' : '';

      C.log.divider();
      console.log(`💬 @${author.username}${badge}`);
      console.log(`   "${mention.text.substring(0, 80)}${mention.text.length > 80 ? '...' : ''}"`);

      try {
        const reply = await generateReply(mention.text, author.username, isBot, isSpecial);
        console.log(`🦞 "${reply.substring(0, 80)}${reply.length > 80 ? '...' : ''}"`);

        const result = await C.xReply(mention.id, reply);
        if (result.rateLimited) { repliedIds.save(); history.save(); process.exit(0); }

        repliesCount++;
        if (isBot) botRoasts++;
        if (isSpecial) specialReplies++;

        repliedIds.mark(mention.id);
        history.add({ text: reply, to: author.username, isBot, isSpecial, timestamp: new Date().toISOString() });
        C.log.ok('¡RESPONDIDO!');

      } catch (err) {
        C.log.warn(`Error: ${err.message}`);
        if (err.message.includes('duplicate')) repliedIds.mark(mention.id);
      }

      await C.sleep(3000);
    }

    repliedIds.save();
    history.save();

    C.log.banner([
      '📊 RESUMEN',
      `💬 Replies: ${repliesCount} | 🤖 Bots: ${botRoasts} | ⭐ Especiales: ${specialReplies}`,
      `⏭️  Saltados: ${skipped}`,
      `🦞 ¡GILLITO DOMINÓ X! 🔥`
    ]);

  } catch (err) {
    repliedIds.save(); history.save();
    C.log.error(err.message);
    process.exit(1);
  }
}

main();
