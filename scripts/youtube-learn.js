#!/usr/bin/env node
/**
 * Mi Pana Gillito — YouTube Learning Engine v1.0
 * ═══════════════════════════════════════════
 * 🎬 Entra a YouTube y estudia por su cuenta
 * 📝 Lee transcripciones/subtítulos de videos
 * 🧠 Analiza contenido con LLM y extrae aprendizaje
 * 💾 Guarda lo que aprende para usarlo en posts
 *
 * QUÉ PUEDE ESTUDIAR:
 *   🦞 Videos originales de Gillito (speech patterns, frases)
 *   🇵🇷 Historia y cultura de Puerto Rico
 *   😂 Comedia/humor boricua
 *   📰 Noticias y análisis político de PR
 *   🎓 Clases gratis de cualquier tema
 *
 * NO necesita YouTube API key — usa transcripciones públicas
 *
 * Output:
 *   .gillito-youtube-learnings.json — cache de aprendizaje
 */

const C = require('./lib/core');
C.initScript('youtube-learn', 'system');

const fs = require('fs');
const path = require('path');

const P = C.loadPersonality();

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const LEARNINGS_FILE = path.join(WORKSPACE, '.gillito-youtube-learnings.json');

// ═══════════════════════════════════════════
// 🎬 CANALES Y BÚSQUEDAS DE INTERÉS
// ═══════════════════════════════════════════

/**
 * Canales de YouTube para monitorear via RSS (no necesita API key)
 * Formato: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
 */
const YOUTUBE_CHANNELS = [
  // Buscar el canal real de Gillito — estos son ejemplos, ajustar IDs
  // { name: 'Mi Pana Gillito Original', id: 'UC_CHANNEL_ID_HERE' },

  // Noticias PR
  { name: 'NotiCentro WAPA', id: 'UC1hOU3Y61Dp0qYojwMeyxIA' },
  { name: 'Telemundo PR', id: 'UCRwA1NZnOCgkMSqnJGnpVAg' },

  // Humor/Cultura PR
  { name: 'Molusco TV', id: 'UCmM3d3eoJbMSUdI8unVqamg' },
  { name: 'Chente Ydrach', id: 'UCeFKQCqGOl1Jm-KpWRVntCA' },
];

/**
 * Búsquedas que Gillito hace en YouTube para estudiar
 * Se rotan — cada ejecución usa 2-3 búsquedas diferentes
 */
const SEARCH_QUERIES = [
  // Sobre Gillito mismo — aprender su estilo
  'Mi Pana Gillito YouTube',
  'Gilberto de Jesus Casas comedia',
  'Gillito Puerto Rico humor',

  // Humor boricua
  'comedia puertorriqueña 2025',
  'humor boricua calle',
  'stand up comedy Puerto Rico',
  'memes Puerto Rico',

  // Política y sociedad
  'Puerto Rico noticias hoy',
  'LUMA Energy Puerto Rico',
  'gobierno Puerto Rico corrupción',
  'ICE deportaciones latinos',
  'junta fiscal Puerto Rico',
  'estadidad Puerto Rico debate',

  // Historia y cultura
  'historia Puerto Rico documental',
  'cultura boricua tradiciones',
  'música Puerto Rico reggaetón historia',
  'diáspora puertorriqueña',

  // Educación general que Gillito usaría
  'cómo hacer comedia stand up español',
  'retórica y debate técnicas',
  'crítica social humor',
  'trolling internet historia',
  'AI bots redes sociales'
];

// ═══════════════════════════════════════════
// 🔧 YOUTUBE UTILITIES
// ═══════════════════════════════════════════

/**
 * Fetch con timeout y User-Agent
 */
async function ytFetch(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MiPanaGillito/1.0; +https://github.com/Mojo-Selecta)',
        'Accept-Language': 'es-PR,es;q=0.9,en;q=0.8'
      }
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Busca videos en YouTube via scraping de la página de resultados
 * Retorna lista de { videoId, title, channel, description }
 */
async function searchYouTube(query, maxResults = 5) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.youtube.com/results?search_query=${encoded}&sp=CAISBAgCEAE%253D`;
  //  sp param = filter by "This month" + "Videos only"

  try {
    const html = await ytFetch(url, 20000);

    // YouTube embeds initial data as JSON in the page
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s);
    if (!dataMatch) {
      // Fallback: try extracting video IDs from the HTML
      return extractVideoIdsFromHTML(html, query);
    }

    const data = JSON.parse(dataMatch[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer
      ?.primaryContents?.sectionListRenderer?.contents?.[0]
      ?.itemSectionRenderer?.contents || [];

    return contents
      .filter(c => c.videoRenderer)
      .slice(0, maxResults)
      .map(c => {
        const v = c.videoRenderer;
        return {
          videoId: v.videoId,
          title: v.title?.runs?.[0]?.text || '',
          channel: v.ownerText?.runs?.[0]?.text || '',
          description: v.detailedMetadataSnippets?.[0]?.snippetText?.runs
            ?.map(r => r.text).join('') || '',
          views: v.viewCountText?.simpleText || '',
          published: v.publishedTimeText?.simpleText || ''
        };
      });
  } catch (err) {
    C.log.warn(`   YouTube search falló: ${err.message}`);
    return [];
  }
}

/**
 * Fallback: extrae video IDs del HTML si no encontramos ytInitialData
 */
function extractVideoIdsFromHTML(html, query) {
  const ids = new Set();
  const regex = /\/watch\?v=([\w-]{11})/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return [...ids].slice(0, 5).map(id => ({
    videoId: id,
    title: `Video: ${query}`,
    channel: '',
    description: '',
    views: '',
    published: ''
  }));
}

/**
 * Obtiene los videos más recientes de un canal via RSS (gratis, sin API key)
 */
async function getChannelVideos(channelId, channelName) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const xml = await ytFetch(url);
    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const videoId = (entry.match(/<yt:videoId>([^<]+)/) || [])[1];
      const title = (entry.match(/<title>([^<]+)/) || [])[1];
      const published = (entry.match(/<published>([^<]+)/) || [])[1];
      if (videoId && title) {
        entries.push({ videoId, title, channel: channelName, published });
      }
    }
    return entries.slice(0, 5);
  } catch (err) {
    C.log.warn(`   Canal ${channelName} RSS falló: ${err.message}`);
    return [];
  }
}

/**
 * Extrae la transcripción/subtítulos de un video
 * Usa la API interna de YouTube para captions (no necesita API key)
 */
async function getTranscript(videoId) {
  try {
    // Paso 1: Obtener la página del video para extraer caption tracks
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const html = await ytFetch(pageUrl, 20000);

    // Buscar captions en el playerResponse
    const captionMatch = html.match(/"captions":\s*({.*?"captionTracks".*?})\s*,\s*"videoDetails"/s);
    if (!captionMatch) {
      // Intentar formato alternativo
      const altMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
      if (!altMatch) return null;

      const tracks = JSON.parse(altMatch[1]);
      return await fetchCaptionTrack(tracks);
    }

    const captionData = JSON.parse(captionMatch[1]);
    const tracks = captionData?.playerCaptionsTracklistRenderer?.captionTracks || [];

    return await fetchCaptionTrack(tracks);

  } catch (err) {
    C.log.warn(`   Transcript falló para ${videoId}: ${err.message}`);
    return null;
  }
}

/**
 * Fetch una caption track y la parsea
 */
async function fetchCaptionTrack(tracks) {
  if (!tracks || tracks.length === 0) return null;

  // Preferir español, luego auto-generado en español, luego inglés
  const preferred = tracks.find(t => t.languageCode === 'es') ||
                    tracks.find(t => t.languageCode?.startsWith('es')) ||
                    tracks.find(t => t.languageCode === 'en') ||
                    tracks[0];

  if (!preferred?.baseUrl) return null;

  const xml = await ytFetch(preferred.baseUrl);

  // Parsear el XML de subtítulos
  const lines = [];
  const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  let match;
  while ((match = textRegex.exec(xml)) !== null) {
    const text = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim();
    if (text) lines.push(text);
  }

  return {
    language: preferred.languageCode,
    text: lines.join(' '),
    lineCount: lines.length
  };
}

// ═══════════════════════════════════════════
// 🧠 ANÁLISIS CON LLM
// ═══════════════════════════════════════════

/**
 * Analiza una transcripción y extrae aprendizaje para Gillito
 */
async function analyzeTranscript(video, transcript) {
  const maxText = transcript.text.substring(0, 4000); // Límite para el LLM

  const systemPrompt = `Eres el asistente de aprendizaje de "Mi Pana Gillito", un bot de humor puertorriqueño.
Tu trabajo es analizar transcripciones de videos de YouTube y extraer cosas útiles para Gillito.

RESPONDE EN JSON EXACTO (sin markdown, sin backticks):
{
  "resumen": "Resumen del video en 2-3 oraciones",
  "tema_principal": "El tema principal del video",
  "relevancia_gillito": 1-10,
  "frases_utiles": ["frase que Gillito puede adaptar", "otra frase"],
  "datos_interesantes": ["dato 1", "dato 2"],
  "vocabulario_nuevo": ["palabra o expresión nueva"],
  "opinion_gillito": "Qué diría Gillito sobre este video, en su estilo callejero (max 150 chars)",
  "puede_usar_para": "calle|politica|trolleo|absurdo|educativo"
}`;

  const userPrompt = `Video: "${video.title}" (Canal: ${video.channel || 'desconocido'})
Idioma: ${transcript.language}

TRANSCRIPCIÓN:
${maxText}

Analiza esta transcripción y extrae aprendizaje útil para Gillito.
Gillito es un troll callejero boricua que habla de política, LUMA, corrupción, cultura PR.
Busca: frases que pueda adaptar, datos que pueda usar, vocabulario callejero, ángulos de humor.`;

  try {
    const response = await C.groqChat(systemPrompt, userPrompt, {
      maxTokens: 600, temperature: 0.7, maxRetries: 2, backoffMs: 3000
    });

    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    C.log.warn(`   LLM análisis falló: ${err.message}`);
    return null;
  }
}

/**
 * Genera un resumen de aprendizaje del día
 */
async function generateDailySummary(learnings) {
  const summaryInput = learnings
    .filter(l => l.analysis)
    .map(l => `- "${l.video.title}": ${l.analysis.resumen} (relevancia: ${l.analysis.relevancia_gillito}/10)`)
    .join('\n');

  if (!summaryInput) return null;

  const response = await C.groqChat(
    `Eres Gillito. Resume lo que aprendiste hoy en YouTube en máximo 3 oraciones estilo callejero boricua. Sé picante y gracioso.`,
    `Hoy estudié estos videos:\n${summaryInput}\n\n¿Qué aprendí hoy? (responde como Gillito)`,
    { maxTokens: 200, temperature: 1.1 }
  );

  return response;
}

// ═══════════════════════════════════════════
// 💾 PERSISTENCIA
// ═══════════════════════════════════════════

function loadLearnings() {
  try {
    return JSON.parse(fs.readFileSync(LEARNINGS_FILE, 'utf8'));
  } catch {
    return {
      lastUpdate: null,
      totalVideosStudied: 0,
      totalTranscriptsRead: 0,
      sessions: [],
      // Accumulated knowledge
      allPhrases: [],
      allData: [],
      allVocab: [],
      recentTopics: []
    };
  }
}

function saveLearnings(data) {
  fs.writeFileSync(LEARNINGS_FILE, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════
// 🚀 MAIN
// ═══════════════════════════════════════════

async function main() {
  C.log.banner([
    '🎬 GILLITO YOUTUBE LEARNING ENGINE v1.0',
    '📺 Estudiando YouTube pa\' ser más inteligente...',
    '🧠 "Yo aprendo en la calle Y en YouTube, cabrón"'
  ]);

  const existing = loadLearnings();
  const sessionLearnings = [];

  // ═══ FASE 1: Monitorear canales RSS ═══
  C.log.divider();
  C.log.info('📡 FASE 1: Revisando canales...');

  const channelVideos = [];
  for (const channel of YOUTUBE_CHANNELS) {
    const videos = await getChannelVideos(channel.id, channel.name);
    channelVideos.push(...videos);
    if (videos.length > 0) {
      C.log.stat(channel.name, `${videos.length} videos recientes`);
    }
    await C.sleep(1000);
  }

  // ═══ FASE 2: Buscar contenido relevante ═══
  C.log.divider();
  C.log.info('🔍 FASE 2: Buscando en YouTube...');

  // Elegir 2-3 búsquedas aleatorias
  const selectedQueries = C.shuffle([...SEARCH_QUERIES]).slice(0, 3);
  const searchResults = [];

  for (const query of selectedQueries) {
    C.log.info(`   🔎 "${query}"...`);
    const results = await searchYouTube(query, 3);
    searchResults.push(...results);
    C.log.stat(`   Resultados`, `${results.length} videos`);
    await C.sleep(2000);
  }

  // Combinar y deduplicar
  const allVideos = [...channelVideos, ...searchResults];
  const uniqueVideos = [];
  const seenIds = new Set(existing.sessions?.flatMap(s => s.videoIds || []) || []);

  for (const v of allVideos) {
    if (v.videoId && !seenIds.has(v.videoId)) {
      uniqueVideos.push(v);
      seenIds.add(v.videoId);
    }
  }

  C.log.stat('Videos únicos nuevos', uniqueVideos.length);

  if (uniqueVideos.length === 0) {
    C.log.info('No hay videos nuevos para estudiar');
    C.log.session();
    return;
  }

  // ═══ FASE 3: Leer transcripciones ═══
  C.log.divider();
  C.log.info('📝 FASE 3: Leyendo transcripciones...');

  // Procesar máximo 5 videos por sesión (para no abusar)
  const toProcess = C.shuffle(uniqueVideos).slice(0, 5);
  let transcriptsRead = 0;

  for (const video of toProcess) {
    C.log.info(`   📺 "${(video.title || '').substring(0, 60)}..."  [${video.videoId}]`);

    const transcript = await getTranscript(video.videoId);

    if (!transcript || transcript.text.length < 100) {
      C.log.warn(`   ⚠️ Sin transcripción disponible`);
      continue;
    }

    transcriptsRead++;
    C.log.stat('   Transcripción', `${transcript.lineCount} líneas, ${transcript.text.length} chars (${transcript.language})`);

    // ═══ FASE 4: Analizar con LLM ═══
    C.log.info('   🧠 Analizando...');
    const analysis = await analyzeTranscript(video, transcript);

    if (analysis) {
      C.log.ok(`   ✅ Relevancia: ${analysis.relevancia_gillito}/10 — ${analysis.tema_principal}`);
      if (analysis.opinion_gillito) {
        C.log.info(`   💬 Gillito dice: "${analysis.opinion_gillito.substring(0, 80)}..."`);
      }

      sessionLearnings.push({
        video: {
          id: video.videoId,
          title: video.title,
          channel: video.channel,
          published: video.published
        },
        analysis,
        transcriptLength: transcript.text.length,
        language: transcript.language,
        studiedAt: new Date().toISOString()
      });
    }

    await C.sleep(3000); // Pausa entre videos
  }

  // ═══ FASE 5: Resumen diario ═══
  C.log.divider();
  C.log.info('📊 FASE 5: Generando resumen...');

  const dailySummary = await generateDailySummary(sessionLearnings);
  if (dailySummary) {
    C.log.ok(`🦞 Gillito dice: "${dailySummary}"`);
  }

  // ═══ FASE 6: Guardar aprendizaje ═══
  C.log.divider();
  C.log.info('💾 FASE 6: Guardando aprendizaje...');

  // Extraer conocimiento acumulado
  const newPhrases = sessionLearnings
    .filter(l => l.analysis?.frases_utiles)
    .flatMap(l => l.analysis.frases_utiles);
  const newData = sessionLearnings
    .filter(l => l.analysis?.datos_interesantes)
    .flatMap(l => l.analysis.datos_interesantes);
  const newVocab = sessionLearnings
    .filter(l => l.analysis?.vocabulario_nuevo)
    .flatMap(l => l.analysis.vocabulario_nuevo);
  const newTopics = sessionLearnings
    .filter(l => l.analysis?.tema_principal)
    .map(l => l.analysis.tema_principal);

  // Mantener últimas 100 de cada tipo (rolling window)
  const allPhrases = [...newPhrases, ...(existing.allPhrases || [])].slice(0, 100);
  const allData = [...newData, ...(existing.allData || [])].slice(0, 100);
  const allVocab = [...newVocab, ...(existing.allVocab || [])].slice(0, 50);
  const recentTopics = [...newTopics, ...(existing.recentTopics || [])].slice(0, 50);

  // Guardar sesión (mantener últimas 30 sesiones)
  const sessions = [
    {
      date: new Date().toISOString(),
      videosFound: uniqueVideos.length,
      transcriptsRead,
      videosAnalyzed: sessionLearnings.length,
      videoIds: sessionLearnings.map(l => l.video.id),
      summary: dailySummary,
      topLearning: sessionLearnings
        .sort((a, b) => (b.analysis?.relevancia_gillito || 0) - (a.analysis?.relevancia_gillito || 0))[0]
        ?.analysis?.resumen || null
    },
    ...(existing.sessions || [])
  ].slice(0, 30);

  const learnings = {
    lastUpdate: new Date().toISOString(),
    version: '1.0',
    totalVideosStudied: (existing.totalVideosStudied || 0) + sessionLearnings.length,
    totalTranscriptsRead: (existing.totalTranscriptsRead || 0) + transcriptsRead,

    // Latest session details (for other scripts to use)
    latestLearnings: sessionLearnings.map(l => ({
      video: l.video,
      analysis: l.analysis
    })),

    // Accumulated knowledge
    allPhrases,
    allData,
    allVocab,
    recentTopics,

    // Quick access for posting scripts
    quickPhrases: allPhrases.slice(0, 10),
    quickData: allData.slice(0, 10),
    quickVocab: allVocab.slice(0, 10),

    // Session history
    sessions,
    dailySummary
  };

  saveLearnings(learnings);

  // ═══ RESUMEN FINAL ═══
  C.log.banner([
    '🎓 YOUTUBE LEARNING SESSION COMPLETE',
    `📺 ${uniqueVideos.length} videos encontrados`,
    `📝 ${transcriptsRead} transcripciones leídas`,
    `🧠 ${sessionLearnings.length} videos analizados`,
    `💬 ${newPhrases.length} frases nuevas aprendidas`,
    `📚 ${newData.length} datos nuevos`,
    `📖 ${newVocab.length} vocabulario nuevo`,
    `🎬 Total histórico: ${learnings.totalVideosStudied} videos estudiados`,
    '🦞 ¡Gillito es más inteligente que ayer! 🔥'
  ]);

  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
