#!/usr/bin/env node
/**
 * Mi Pana Gillito — Song Creator v1.1 🎵
 * ═══════════════════════════════════════════════════════════
 * 🎤 GPT/Groq genera letras de reggaetón/salsa estilo Gillito
 * 🎵 Udio AI genera la canción completa (via Playwright browser)
 * 📢 Postea en X y Moltbook con link al audio
 * 🦞 100% boricua, 100% calle, 100% fuego
 *
 * v1.1: Usa Playwright headless browser pa' bypass Cloudflare
 *       Las API calls se hacen DESDE el browser (page.evaluate)
 *
 * ENV VARS REQUERIDAS:
 * ────────────────────
 * UDIO_AUTH_TOKEN_0  — Cookie .0 de sb-ssr-production-auth-token
 * UDIO_AUTH_TOKEN_1  — Cookie .1 de sb-ssr-production-auth-token
 */

const C = require('./lib/core');
C.initScript('create-song', 'udio');

const { chromium } = require('playwright');


/* ═══════════════════════════════════════════════════════════
   UDIO BROWSER CLIENT (Playwright bypass Cloudflare)
   ═══════════════════════════════════════════════════════════
   En vez de fetch() directo (que Cloudflare bloquea),
   abrimos un browser real, inyectamos cookies, y hacemos
   las API calls desde DENTRO del browser.
*/

let _browser = null;
let _page = null;

/**
 * Initialize Playwright browser and inject Udio cookies
 */
async function initBrowser() {
  C.log.info('🌐 Launching headless browser...');

  _browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await _browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });

  // Inject auth cookies BEFORE navigating
  const token0 = process.env.UDIO_AUTH_TOKEN_0;
  const token1 = process.env.UDIO_AUTH_TOKEN_1;

  if (!token0 || !token1) {
    throw new Error('UDIO_AUTH_TOKEN_0 and UDIO_AUTH_TOKEN_1 must be set!');
  }

  await context.addCookies([
    {
      name: 'sb-ssr-production-auth-token.0',
      value: token0,
      domain: '.udio.com',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'sb-ssr-production-auth-token.1',
      value: token1,
      domain: '.udio.com',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  _page = await context.newPage();

  // Navigate to udio.com to establish session & pass Cloudflare
  C.log.info('🌐 Navigating to udio.com (passing Cloudflare)...');
  await _page.goto('https://www.udio.com/my-creations', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // Wait for Cloudflare challenge to resolve
  await _page.waitForTimeout(3000);

  // Check for Cloudflare challenge page
  const title = await _page.title();
  C.log.info(`🌐 Page title: "${title}"`);

  if (title.toLowerCase().includes('just a moment') || title.toLowerCase().includes('challenge')) {
    C.log.warn('⚠️ Cloudflare challenge detected, waiting 10s...');
    await _page.waitForTimeout(10000);
    const newTitle = await _page.title();
    C.log.info(`🌐 After wait — title: "${newTitle}"`);
  }

  const pageUrl = _page.url();
  C.log.ok(`✅ Browser ready! URL: ${pageUrl}`);
}

/**
 * Close the browser
 */
async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
    _page = null;
    C.log.info('🌐 Browser closed');
  }
}

/**
 * Generate a song via Udio API (from inside the browser)
 */
async function udioGenerate(prompt, lyrics = null, seed = -1) {
  C.log.info(`🎵 Calling Udio generate-proxy (via browser)...`);
  C.log.info(`   Prompt: ${prompt.substring(0, 80)}`);
  if (lyrics) C.log.info(`   Lyrics: ${lyrics.substring(0, 60)}...`);

  const result = await _page.evaluate(async ({ prompt, lyrics, seed }) => {
    const data = {
      prompt,
      samplerOptions: { seed },
    };
    if (lyrics) {
      data.lyricInput = lyrics;
    }

    const resp = await fetch('/api/generate-proxy', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'no body');
      return { error: true, status: resp.status, statusText: resp.statusText, body: errText.substring(0, 300) };
    }

    return await resp.json();
  }, { prompt, lyrics, seed });

  if (result.error) {
    throw new Error(`Udio generate failed: ${result.status} ${result.statusText} — ${result.body}`);
  }

  C.log.ok(`✅ Udio accepted! Track IDs: ${(result.track_ids || []).join(', ')}`);
  return result;
}

/**
 * Poll Udio for song completion (from inside the browser)
 */
async function udioPollSongs(trackIds, maxWaitMs = 300000, pollIntervalMs = 8000) {
  const songIdsParam = trackIds.join(',');
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;
    C.log.info(`   ⏳ Polling attempt ${attempts}... (${Math.round((Date.now() - startTime) / 1000)}s)`);

    const data = await _page.evaluate(async (ids) => {
      const resp = await fetch(`/api/songs?songIds=${ids}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' },
      });

      if (!resp.ok) {
        return { error: true, status: resp.status };
      }

      return await resp.json();
    }, songIdsParam);

    if (data.error) {
      C.log.warn(`   ⚠️ Poll HTTP ${data.status} — retrying...`);
      await sleep(pollIntervalMs);
      continue;
    }

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
   ═══════════════════════════════════════════════════════════ */

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
    '🎵 GILLITO SONG CREATOR — v1.1',
    '🎤 LLM Lyrics → Udio AI Music (Playwright)',
    '🦞 Dios los cuide, que GILLITO los protegerá'
  ]);


  // ━━━ VALIDATE ENV ━━━
  if (!process.env.UDIO_AUTH_TOKEN_0 || !process.env.UDIO_AUTH_TOKEN_1) {
    C.log.error('❌ UDIO_AUTH_TOKEN_0 and UDIO_AUTH_TOKEN_1 must be set!');
    C.log.error('   Go to udio.com → DevTools → Application → Cookies');
    C.log.error('   Copy sb-ssr-production-auth-token.0 and .1 separately');
    process.exit(1);
  }

  C.log.ok(`✅ Udio auth tokens loaded (.0=${process.env.UDIO_AUTH_TOKEN_0.length} chars, .1=${process.env.UDIO_AUTH_TOKEN_1.length} chars)`);


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

  // Clean lyrics
  let lyrics = lyricsRaw.trim();
  lyrics = lyrics.replace(/^```\s*\n?/i, '').replace(/\n?```\s*$/i, '');
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
    .replace(/^["'"""'']+/, '').replace(/["'"""'']+$/, '')
    .replace(/^(título|title):?\s*/i, '')
    .substring(0, 60);

  if (!title || title.length < 3) {
    title = `Gillito x ${genreChoice.genre} 🦞🔥`;
  }

  C.log.stat('💡 Título', title);


  // ━━━ STAGE 3: LAUNCH BROWSER + CALL UDIO ━━━
  C.log.info('🎵 Stage 3: Lanzando browser y generando canción...');

  await initBrowser();

  const udioPrompt = genreChoice.style;
  C.log.stat('🎹 Udio prompt', udioPrompt);

  let generateResult;
  try {
    generateResult = await udioGenerate(udioPrompt, lyrics);
  } catch (err) {
    C.log.error(`❌ Udio generate failed: ${err.message}`);

    if (err.message.includes('401') || err.message.includes('403')) {
      C.log.error('🔑 Auth token may be expired! Refresh it in GitHub Secrets.');
      await closeBrowser();
      process.exit(1);
    }

    // Retry without lyrics
    C.log.warn('🔄 Retrying without custom lyrics...');
    try {
      generateResult = await udioGenerate(`${udioPrompt}, spanish lyrics, puerto rico`);
    } catch (err2) {
      C.log.error(`❌ Retry also failed: ${err2.message}`);
      await closeBrowser();
      process.exit(1);
    }
  }

  const trackIds = generateResult.track_ids || [];
  if (!trackIds.length) {
    C.log.error('❌ No track IDs returned from Udio');
    await closeBrowser();
    process.exit(1);
  }

  C.log.stat('🎵 Tracks', trackIds.join(', '));


  // ━━━ STAGE 4: POLL UNTIL READY ━━━
  C.log.info('⏳ Stage 4: Esperando que Udio genere la canción...');

  let songs;
  try {
    songs = await udioPollSongs(trackIds);
  } catch (err) {
    C.log.error(`❌ Polling failed: ${err.message}`);
    await closeBrowser();
    process.exit(1);
  }

  // Done with browser
  await closeBrowser();

  // Pick the best song
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


main().catch(async err => {
  C.log.error(`💀 Fatal: ${err.message}`);
  await closeBrowser();
  process.exit(1);
});
