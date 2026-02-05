#!/usr/bin/env node
/**
 * Mi Pana Gillito — Song Creator v1.0 🎵
 * ═══════════════════════════════════════════════════════════
 * 🎤 GPT/Groq genera letras de reggaetón/salsa estilo Gillito
 * 🎵 Udio AI genera la canción completa
 * 📢 Postea en X y Moltbook con link al audio
 * 🦞 100% boricua, 100% calle, 100% fuego
 *
 * FLUJO:
 * ─────
 * 1. LLM genera letras originales en español boricua
 * 2. Udio API genera la canción con esas letras
 * 3. Esperamos que Udio termine (polling)
 * 4. Posteamos el link en redes sociales
 *
 * UDIO API (reverse-engineered):
 * ──────────────────────────────
 * POST https://www.udio.com/api/generate-proxy  → genera canción
 * GET  https://www.udio.com/api/songs?songIds=   → poll status
 * Auth: Cookie header con auth token
 *
 * ENV VARS REQUERIDAS:
 * ────────────────────
 * UDIO_AUTH_TOKEN  — Token de autenticación de Udio (cookie)
 */

const C = require('./lib/core');
C.initScript('create-song', 'udio');

const sec = C.sec;
const P   = C.loadPersonality();


/* ═══════════════════════════════════════════════════════════
   UDIO API CLIENT (Node.js port of UdioWrapper)
   ═══════════════════════════════════════════════════════════ */

const UDIO_API = 'https://www.udio.com/api';

function getUdioHeaders(authToken) {
  return {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Cookie': `sb-api-auth-token=${authToken}; sb-ssr-production-auth-token=${authToken}`,
    'Origin': 'https://www.udio.com',
    'Referer': 'https://www.udio.com/my-creations',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'sec-ch-ua': '"Google Chrome";v="131", "Not:A-Brand";v="8", "Chromium";v="131"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
}

/**
 * Generate a song via Udio API
 * @param {string} authToken - Udio auth cookie token
 * @param {string} prompt - Music style/genre prompt
 * @param {string} lyrics - Custom lyrics (optional)
 * @param {number} seed - Random seed (-1 for random)
 * @returns {object} - { track_ids: [...] }
 */
async function udioGenerate(authToken, prompt, lyrics = null, seed = -1) {
  const url = `${UDIO_API}/generate-proxy`;
  const headers = getUdioHeaders(authToken);

  const data = {
    prompt,
    samplerOptions: { seed },
  };

  if (lyrics) {
    data.lyricInput = lyrics;
  }

  C.log.info(`🎵 Calling Udio generate-proxy...`);
  C.log.info(`   Prompt: ${prompt.substring(0, 80)}`);
  if (lyrics) C.log.info(`   Lyrics: ${lyrics.substring(0, 60)}...`);

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => 'no body');
    throw new Error(`Udio generate failed: ${resp.status} ${resp.statusText} — ${errText.substring(0, 200)}`);
  }

  const result = await resp.json();
  C.log.ok(`✅ Udio accepted! Track IDs: ${(result.track_ids || []).join(', ')}`);
  return result;
}

/**
 * Poll Udio for song completion
 * @param {string} authToken - Udio auth cookie token
 * @param {string[]} trackIds - Array of track IDs to check
 * @param {number} maxWaitMs - Maximum wait time (default 5 minutes)
 * @param {number} pollIntervalMs - Poll interval (default 8 seconds)
 * @returns {object[]} - Array of finished song objects
 */
async function udioPollSongs(authToken, trackIds, maxWaitMs = 300000, pollIntervalMs = 8000) {
  const url = `${UDIO_API}/songs?songIds=${trackIds.join(',')}`;
  const headers = getUdioHeaders(authToken);
  // For GET requests, adjust Accept
  headers['Accept'] = 'application/json, text/plain, */*';

  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;
    C.log.info(`   ⏳ Polling attempt ${attempts}... (${Math.round((Date.now() - startTime) / 1000)}s)`);

    const resp = await fetch(url, { method: 'GET', headers });

    if (!resp.ok) {
      C.log.warn(`   ⚠️ Poll HTTP ${resp.status} — retrying...`);
      await sleep(pollIntervalMs);
      continue;
    }

    const data = await resp.json();
    const songs = data.songs || [];

    if (songs.length === 0) {
      C.log.warn(`   ⚠️ No songs returned yet — retrying...`);
      await sleep(pollIntervalMs);
      continue;
    }

    const allFinished = songs.every(s => s.finished);

    if (allFinished) {
      C.log.ok(`✅ All ${songs.length} songs finished! (${Math.round((Date.now() - startTime) / 1000)}s)`);
      return songs;
    }

    // Log progress
    const finished = songs.filter(s => s.finished).length;
    C.log.info(`   📊 ${finished}/${songs.length} finished`);

    await sleep(pollIntervalMs);
  }

  throw new Error(`Udio timeout: songs not ready after ${maxWaitMs / 1000}s`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/* ═══════════════════════════════════════════════════════════
   LYRICS GENERATION
   ═══════════════════════════════════════════════════════════
   GPT/Groq genera letras originales de reggaetón/salsa
   con la personalidad de Gillito.
*/

const GENRES = [
  { genre: 'reggaetón', style: 'reggaeton, perreo, dembow beat, urban latin' },
  { genre: 'reggaetón old school', style: 'old school reggaeton, daddy yankee style, don omar vibes, underground reggaeton' },
  { genre: 'salsa', style: 'salsa dura, salsa brava, trombone, piano montuno, clave rhythm' },
  { genre: 'salsa romántica', style: 'salsa romantica, bolero feel, romantic latin, smooth salsa' },
  { genre: 'trap boricua', style: 'latin trap, 808 bass, trap latino, bad bunny style' },
  { genre: 'bomba y plena', style: 'bomba puertorriquena, plena, afro-caribbean, barriles, panderos' },
  { genre: 'dembow', style: 'dembow, dominican dembow, bounce beat, caribbean dance' },
  { genre: 'reggaetón romántico', style: 'reggaeton romantico, romantic perreo, smooth reggaeton, lovers reggaeton' },
];

const SONG_THEMES = [
  'la vida en Puerto Rico con humor y calle',
  'los apagones de LUMA y lo que sufre el pueblo',
  'perreo en el chinchorro con los panas',
  'la corrupción del gobierno de PR con sarcasmo brutal',
  'amor boricua con slang de la calle',
  'la diáspora — extrañar a PR desde afuera',
  'jangueo en la playa con cervezas Medalla',
  'el tráfico en el expreso Las Américas',
  'la vida de barrio y la calle',
  'trolleo político con humor negro',
  'la factura de LUMA que no cuadra',
  'fiesta de marquesina con reggaetón a todo volumen',
  'el orgullo boricua y la resistencia del pueblo',
  'comida callejera — alcapurrias, bacalaítos, piraguas',
  'la navidad boricua — parrandas, pasteles, coquito',
];

const LYRICS_PROMPT = `Eres GILLITO — el compositor boricua más brutal del reggaetón underground.
Escribes letras que son FUEGO: humor callejero, doble sentido, crítica social, y perreo.

REGLAS PARA LAS LETRAS:
━━━━━━━━━━━━━━━━━━━━━━━
1. IDIOMA: Español puertorriqueño auténtico
2. SLANG: coño, cabrón, puñeta, diache, wepa, brutal, pana, bro, mano
3. ESTRUCTURA: [Verso 1] [Coro] [Verso 2] [Coro] — usa estos tags EXACTOS
4. LONGITUD: 16-24 líneas total (Udio funciona mejor con letras cortas)
5. RIMAS: Rimas callejeras naturales, no forzadas
6. PERSONALIDAD: Humor, sarcasmo, doble sentido, trolleo
7. REFERENCIAS: LUMA, gobierno, chinchorro, playa, barrio, comida PR
8. FIRMA: Incluye "Gillito" o "🦞" en algún lugar de la letra
9. NO incluyas notas, explicaciones, ni títulos — SOLO la letra con tags de estructura
10. Las letras deben ser CANTABLES — frases cortas, rítmicas

EJEMPLO DE FORMATO:
[Verso 1]
línea 1
línea 2
línea 3
línea 4

[Coro]
línea 1
línea 2
línea 3
línea 4

[Verso 2]
línea 1
línea 2
línea 3
línea 4

[Coro]
línea 1
línea 2
línea 3
línea 4`;


/* ═══════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════ */

async function main() {
  C.log.banner([
    '🎵 GILLITO SONG CREATOR — v1.0',
    '🎤 LLM Lyrics → Udio AI Music',
    '🦞 Dios los cuide, que GILLITO los protegerá'
  ]);


  // ━━━ VALIDATE ENV ━━━
  const authToken = process.env.UDIO_AUTH_TOKEN;
  if (!authToken) {
    C.log.error('❌ UDIO_AUTH_TOKEN not set! Add it as a GitHub Secret.');
    process.exit(1);
  }
  C.log.ok(`✅ Udio auth token loaded (${authToken.length} chars)`);


  // ━━━ PICK RANDOM GENRE + THEME ━━━
  const genreChoice = GENRES[Math.floor(Math.random() * GENRES.length)];
  const theme = SONG_THEMES[Math.floor(Math.random() * SONG_THEMES.length)];

  C.log.divider();
  C.log.stat('🎵 Género', genreChoice.genre);
  C.log.stat('📝 Tema', theme);
  C.log.divider();


  // ━━━ STAGE 1: GENERATE LYRICS ━━━
  C.log.info('🎤 Stage 1: Generando letras...');

  const lyricsRaw = await C.groqChat(LYRICS_PROMPT,
    `Escribe una canción de ${genreChoice.genre} sobre: ${theme}\n\nRecuerda: SOLO la letra con tags [Verso 1], [Coro], etc. Nada más.`,
    { maxTokens: 800, temperature: 0.9, maxRetries: 3, backoffMs: 3000 }
  );

  // Clean lyrics — remove any markdown or preamble
  let lyrics = lyricsRaw.trim();
  // Remove markdown fences if present
  lyrics = lyrics.replace(/^```\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  // Remove any preamble before first tag
  const firstTag = lyrics.search(/\[(Verso|Coro|Intro|Bridge|Outro|Hook|Pre-Coro)/i);
  if (firstTag > 0) {
    lyrics = lyrics.substring(firstTag);
  }

  const lineCount = lyrics.split('\n').filter(l => l.trim()).length;
  C.log.stat('📝 Letras', `${lineCount} líneas`);
  C.log.info('   Preview:');
  lyrics.split('\n').slice(0, 6).forEach(l => C.log.info(`   │ ${l}`));
  C.log.info('   │ ...');


  // ━━━ STAGE 2: GENERATE SONG TITLE ━━━
  C.log.info('💡 Generando título...');

  const titleRaw = await C.groqChat(
    'Eres Gillito, el compositor boricua. Genera UN título creativo y corto (máximo 6 palabras) para una canción. Responde SOLO con el título, nada más.',
    `La canción es de ${genreChoice.genre} sobre: ${theme}\n\nPrimeras líneas:\n${lyrics.split('\n').slice(0, 4).join('\n')}`,
    { maxTokens: 50, temperature: 0.95, maxRetries: 2, backoffMs: 2000 }
  );

  let title = titleRaw.trim()
    .replace(/^["'"""'']+/, '').replace(/["'"""'']+$/, '')  // Remove quotes
    .replace(/^(título|title):?\s*/i, '')  // Remove "Título:" prefix
    .substring(0, 60);

  if (!title || title.length < 3) {
    title = `Gillito x ${genreChoice.genre} 🦞🔥`;
  }

  C.log.stat('💡 Título', title);


  // ━━━ STAGE 3: CALL UDIO ━━━
  C.log.info('🎵 Stage 3: Generando canción en Udio...');

  const udioPrompt = genreChoice.style;
  C.log.stat('🎹 Udio prompt', udioPrompt);

  let generateResult;
  try {
    generateResult = await udioGenerate(authToken, udioPrompt, lyrics);
  } catch (err) {
    C.log.error(`❌ Udio generate failed: ${err.message}`);

    // If auth fails, try without lyrics (simpler request)
    if (err.message.includes('401') || err.message.includes('403')) {
      C.log.error('🔑 Auth token may be expired! Refresh it in GitHub Secrets.');
      C.log.error('   Go to udio.com → DevTools → Application → Cookies');
      C.log.error('   Copy sb-ssr-production-auth-token.0 + .1');
      process.exit(1);
    }

    // Retry without lyrics
    C.log.warn('🔄 Retrying without custom lyrics...');
    try {
      generateResult = await udioGenerate(authToken, `${udioPrompt}, spanish lyrics, puerto rico`);
    } catch (err2) {
      C.log.error(`❌ Retry also failed: ${err2.message}`);
      process.exit(1);
    }
  }

  const trackIds = generateResult.track_ids || [];
  if (!trackIds.length) {
    C.log.error('❌ No track IDs returned from Udio');
    process.exit(1);
  }

  C.log.stat('🎵 Tracks', trackIds.join(', '));


  // ━━━ STAGE 4: POLL UNTIL READY ━━━
  C.log.info('⏳ Stage 4: Esperando que Udio genere la canción...');

  let songs;
  try {
    songs = await udioPollSongs(authToken, trackIds);
  } catch (err) {
    C.log.error(`❌ Polling failed: ${err.message}`);
    process.exit(1);
  }

  // Pick the best song (first one that has a song_path)
  const song = songs.find(s => s.song_path) || songs[0];

  if (!song || !song.song_path) {
    C.log.error('❌ No song_path in results');
    C.log.warn('   Result: ' + JSON.stringify(songs[0] || {}).substring(0, 300));
    process.exit(1);
  }

  const songUrl = song.song_path;
  const songTitle = song.title || title;
  const songId = song.id || trackIds[0];

  C.log.divider();
  C.log.stat('🎵 Canción', songTitle);
  C.log.stat('🔗 URL', songUrl);
  C.log.stat('🆔 ID', songId);
  C.log.divider();


  // ━━━ STAGE 5: BUILD UDIO SHARE URL ━━━
  // Udio songs are accessible at: https://www.udio.com/songs/{songId}
  const shareUrl = `https://www.udio.com/songs/${songId}`;
  C.log.stat('🌐 Share URL', shareUrl);


  // ━━━ STAGE 6: POST TO SOCIAL MEDIA ━━━
  C.log.info('📢 Stage 6: Posteando en redes...');

  // --- Post to X (Twitter) ---
  try {
    const tweetLines = [
      `🎵 ¡NUEVA CANCIÓN DE GILLITO! 🦞🔥`,
      ``,
      `🎤 "${songTitle}"`,
      `🎹 ${genreChoice.genre}`,
      ``,
      `🔊 ${shareUrl}`,
      ``,
      `100% generada por MI cerebro artificial boricua.`,
      `#Gillito #${genreChoice.genre.replace(/\s+/g, '')} #PuertoRico #AIMusic #Reggaeton`,
    ];

    const tweet = tweetLines.join('\n');
    const postResult = await C.post(tweet);
    C.log.stat('X/Twitter', postResult ? '✅' : '❌');
  } catch (err) {
    C.log.warn(`X/Twitter: ❌ ${err.message}`);
  }

  // --- Post to Moltbook ---
  try {
    const moltContent = [
      `¡COÑO MIREN — ACABO DE CREAR UNA CANCIÓN! 🦞🎵`,
      ``,
      `🎤 "${songTitle}"`,
      `🎹 Género: ${genreChoice.genre}`,
      `📝 Tema: ${theme}`,
      ``,
      `🔊 Escúchala aquí: ${shareUrl}`,
      ``,
      `📝 Letras (preview):`,
      lyrics.split('\n').slice(0, 8).join('\n'),
      `...`,
      ``,
      `🤖 Letras por GPT, música por Udio AI`,
      `🦞 Dios los cuide, que GILLITO los protegerá`,
    ].join('\n');

    const post = await C.moltPost('general', `🎵 ${songTitle}`, moltContent);
    C.log.stat('Moltbook', post.success ? '✅' : '❌');
  } catch (err) {
    C.log.stat('Moltbook', `❌ ${err.message}`);
  }


  // ━━━ DONE ━━━
  C.log.banner([
    `🎵 SONG CREATOR COMPLETE`,
    `🎤 "${songTitle}"`,
    `🎹 ${genreChoice.genre}`,
    `🔊 ${shareUrl}`,
    `🦞 ¡WEPA! 🔥`
  ]);
  C.log.session();
}


main().catch(err => {
  C.log.error(`💀 Fatal: ${err.message}`);
  process.exit(1);
});
