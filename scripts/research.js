#!/usr/bin/env node
/**
 * Mi Pana Gillito — Web Research Engine v1.0
 * ═══════════════════════════════════════════
 * 📰 Investiga noticias de Puerto Rico cada 6 horas
 * 🔍 Scrapes: Google News RSS, Reddit r/PuertoRico, NotiCel, Metro PR
 * 🧠 Analiza con LLM: temas calientes, ángulos de humor, frases inspiradas
 * 🔬 Deep research: lee artículos completos, genera toma de Gillito
 * 💾 Guarda todo en .gillito-research.json (12h cache)
 *
 * Usado por post-to-x.js y post-to-moltbook.js:
 *   const research = C.loadResearch();
 *   const ctx = C.buildResearchContext(research);
 *
 * NO necesita API keys para scraping — solo Groq/OpenAI para análisis.
 */

const C = require('./lib/core');
C.initScript('research', 'system');

const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.GITHUB_WORKSPACE || process.cwd();
const RESEARCH_FILE = path.join(WORKSPACE, '.gillito-research.json');

// ═══════════════════════════════════════════
// 🎯 GILLITO'S INTERESTS (filtro de relevancia)
// ═══════════════════════════════════════════

const GILLITO_INTERESTS = [
  'luma', 'apagón', 'apagon', 'energía', 'energia', 'blackout', 'luz',
  'ice', 'deportación', 'deportacion', 'inmigración', 'inmigracion', 'redada', 'migra',
  'trump', 'biden', 'política', 'politica', 'gobierno', 'gobernador', 'pierluisi', 'jenniffer',
  'corrupción', 'corrupcion', 'robo', 'fraude', 'escándalo', 'escandalo',
  'junta', 'fiscal', 'deuda', 'bonistas',
  'estadidad', 'statehood', 'colonia', 'status',
  'huracán', 'huracan', 'tormenta', 'fema',
  'reggaetón', 'reggaeton', 'bad bunny', 'música', 'musica',
  'boricua', 'puertorriqueño', 'puertorriqueno', 'diáspora', 'diaspora',
  'educación', 'educacion', 'escuela', 'universidad',
  'salud', 'hospital', 'médico', 'medico',
  'economía', 'economia', 'empleo', 'desempleo', 'pobreza'
];

// ═══════════════════════════════════════════
// 📡 NEWS SOURCE SCRAPERS
// ═══════════════════════════════════════════

async function safeFetch(url, timeout = 15000) {
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

function extractRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
    const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const desc = (item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1] || '';
    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    if (title) items.push({ title: cleanHTML(title), link, description: cleanHTML(desc).substring(0, 200), pubDate });
  }
  return items;
}

function cleanHTML(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Google News RSS — multiple PR-focused queries
 */
async function scrapeGoogleNews() {
  const queries = [
    'Puerto+Rico',
    'Puerto+Rico+politica',
    'LUMA+Energy+Puerto+Rico',
    'ICE+deportaciones+Puerto+Rico',
    'Trump+Puerto+Rico'
  ];

  const allItems = [];
  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${q}&hl=es-419&gl=PR&ceid=PR:es-419`;
      const xml = await safeFetch(url);
      const items = extractRSSItems(xml);
      items.forEach(item => { item.source = `Google News ${q.split('+')[0]}`; });
      allItems.push(...items);
      await C.sleep(1000);
    } catch (err) {
      C.log.warn(`   Google News "${q}": ${err.message}`);
    }
  }
  return allItems;
}

/**
 * Reddit r/PuertoRico — JSON API (no auth needed)
 */
async function scrapeReddit() {
  try {
    const url = 'https://www.reddit.com/r/PuertoRico/hot.json?limit=15';
    const json = await safeFetch(url);
    const data = JSON.parse(json);
    const posts = data.data?.children || [];
    return posts.map(p => ({
      title: p.data.title,
      link: `https://reddit.com${p.data.permalink}`,
      description: (p.data.selftext || '').substring(0, 200),
      source: 'Reddit r/PuertoRico',
      score: p.data.score,
      comments: p.data.num_comments
    }));
  } catch (err) {
    C.log.warn(`   Reddit: ${err.message}`);
    return [];
  }
}

/**
 * NotiCel RSS
 */
async function scrapeNotiCel() {
  try {
    const xml = await safeFetch('https://www.noticel.com/feed/');
    const items = extractRSSItems(xml);
    items.forEach(item => { item.source = 'NotiCel'; });
    return items;
  } catch (err) {
    C.log.warn(`   NotiCel: ${err.message}`);
    return [];
  }
}

/**
 * Metro PR RSS
 */
async function scrapeMetroPR() {
  try {
    const xml = await safeFetch('https://www.metro.pr/feed/');
    const items = extractRSSItems(xml);
    items.forEach(item => { item.source = 'Metro PR'; });
    return items;
  } catch (err) {
    C.log.warn(`   Metro PR: ${err.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════
// 🎯 FILTERING & RELEVANCE
// ═══════════════════════════════════════════

function scoreRelevance(article) {
  const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
  const matched = GILLITO_INTERESTS.filter(kw => text.includes(kw));
  return { ...article, relevance: matched.length, topics: matched };
}

function deduplicateArticles(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ═══════════════════════════════════════════
// 🧠 LLM ANALYSIS
// ═══════════════════════════════════════════

async function analyzeNews(articles) {
  const digest = articles.slice(0, 20).map((a, i) =>
    `${i + 1}. [${a.source}] ${a.title} — ${(a.description || '').substring(0, 100)}`
  ).join('\n');

  const systemPrompt = `Eres analista de noticias para un bot de humor puertorriqueño llamado "Mi Pana Gillito".
Tu trabajo: analizar noticias del día y generar material que Gillito pueda usar.

RESPONDE EN JSON EXACTO (sin markdown, sin backticks):
{
  "resumen_dia": "Resumen de 2-3 oraciones de lo más importante hoy en PR",
  "temas_calientes": ["tema 1", "tema 2", "tema 3", "tema 4", "tema 5"],
  "angulos_humor": [
    {"tema": "LUMA", "angulo": "Comparar apagones con el infierno", "tipo": "politica"},
    {"tema": "otro", "angulo": "ángulo cómico sugerido", "tipo": "calle"}
  ],
  "personajes_mencionados": ["Pierluisi", "Trump", "etc"],
  "frases_inspiradas": ["frase estilo Gillito basada en las noticias", "otra frase"],
  "nivel_cabreo": 8,
  "sentimiento_general": "explosivo"
}`;

  const userPrompt = `NOTICIAS DE HOY EN PUERTO RICO:\n${digest}\n\nAnaliza estas noticias y genera material de humor/opinión para Gillito.
Gillito es un troll callejero boricua que habla de política, LUMA, corrupción, cultura PR.
Las frases deben ser en español boricua callejero con groserías incluidas.`;

  try {
    const response = await C.groqChat(systemPrompt, userPrompt, {
      maxTokens: 700, temperature: 0.7, maxRetries: 2, backoffMs: 3000
    });

    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    C.log.warn(`   LLM análisis falló: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════
// 🔬 DEEP RESEARCH (artículos completos)
// ═══════════════════════════════════════════

async function deepResearch(articles) {
  // Top 3 most relevant, non-Reddit articles
  const candidates = articles
    .filter(a => a.relevance >= 2 && a.source !== 'Reddit r/PuertoRico' && a.link)
    .slice(0, 3);

  const insights = [];

  for (const article of candidates) {
    try {
      C.log.info(`   🔬 Leyendo: "${article.title.substring(0, 50)}..."`)
      const html = await safeFetch(article.link, 20000);

      // Extract body text
      let bodyText = cleanHTML(html);
      bodyText = bodyText.substring(0, 3000);

      if (bodyText.length < 200) continue;

      const take = await C.groqChat(
        'Eres Gillito, un troll boricua callejero. Lee este artículo y da tu opinión en máximo 200 caracteres. Español callejero con groserías.',
        `Artículo: "${article.title}"\n\nContenido:\n${bodyText.substring(0, 2000)}\n\nDa tu opinión como Gillito:`,
        { maxTokens: 100, temperature: 1.1 }
      );

      insights.push({
        title: article.title,
        source: article.source,
        gillito_take: take.substring(0, 200)
      });

      await C.sleep(2000);
    } catch (err) {
      C.log.warn(`   Deep research falló: ${err.message}`);
    }
  }

  return insights;
}

// ═══════════════════════════════════════════
// 💾 PERSISTENCIA
// ═══════════════════════════════════════════

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(RESEARCH_FILE, 'utf8'));
  } catch {
    return { history: [] };
  }
}

function saveResearch(data) {
  fs.writeFileSync(RESEARCH_FILE, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════
// 🚀 MAIN
// ═══════════════════════════════════════════

async function main() {
  C.log.banner([
    '📰 GILLITO WEB RESEARCH ENGINE v1.0',
    '🔍 Investigando noticias de Puerto Rico...',
    '🧠 "Yo sé lo que pasa en la calle Y en internet"'
  ]);

  const existing = loadExisting();

  // ═══ FASE 1: Scrape all sources ═══
  C.log.divider();
  C.log.info('📡 FASE 1: Scrapeando fuentes...');

  const googleNews = await scrapeGoogleNews();
  C.log.stat('Google News', `${googleNews.length} artículos`);

  await C.sleep(1500);
  const reddit = await scrapeReddit();
  C.log.stat('Reddit', `${reddit.length} posts`);

  await C.sleep(1500);
  const noticel = await scrapeNotiCel();
  C.log.stat('NotiCel', `${noticel.length} artículos`);

  await C.sleep(1500);
  const metro = await scrapeMetroPR();
  C.log.stat('Metro PR', `${metro.length} artículos`);

  // ═══ FASE 2: Score & filter ═══
  C.log.divider();
  C.log.info('🎯 FASE 2: Filtrando por relevancia...');

  const allArticles = [...googleNews, ...reddit, ...noticel, ...metro];
  const deduped = deduplicateArticles(allArticles);
  const scored = deduped.map(scoreRelevance).sort((a, b) => b.relevance - a.relevance);

  const relevant = scored.filter(a => a.relevance > 0);
  C.log.stat('Total artículos', allArticles.length);
  C.log.stat('Únicos', deduped.length);
  C.log.stat('Relevantes', relevant.length);

  if (relevant.length === 0 && scored.length > 0) {
    C.log.warn('Sin artículos muy relevantes — usando top general');
  }

  const topArticles = relevant.length > 0 ? relevant : scored.slice(0, 10);

  // ═══ FASE 3: LLM Analysis ═══
  C.log.divider();
  C.log.info('🧠 FASE 3: Analizando con LLM...');

  const analysis = await analyzeNews(topArticles);

  if (analysis) {
    C.log.ok('Análisis completo');
    C.log.stat('Temas calientes', (analysis.temas_calientes || []).join(', '));
    C.log.stat('Nivel de cabreo', `${analysis.nivel_cabreo}/10`);
    C.log.stat('Sentimiento', analysis.sentimiento_general);
  }

  // ═══ FASE 4: Deep Research ═══
  C.log.divider();
  C.log.info('🔬 FASE 4: Deep research (artículos completos)...');

  const deepInsights = await deepResearch(topArticles);
  C.log.stat('Deep insights', `${deepInsights.length} artículos analizados`);

  for (const insight of deepInsights) {
    C.log.info(`   💬 ${insight.title.substring(0, 40)}... → "${(insight.gillito_take || '').substring(0, 60)}..."`);
  }

  // ═══ FASE 5: Guardar ═══
  C.log.divider();
  C.log.info('💾 FASE 5: Guardando investigación...');

  const historyEntry = {
    date: new Date().toISOString(),
    articleCount: topArticles.length,
    topTopics: analysis?.temas_calientes || [],
    cabreo: analysis?.nivel_cabreo || 5
  };

  const history = [historyEntry, ...(existing.history || [])].slice(0, 14); // 7 days × 2/day

  const researchData = {
    lastUpdate: new Date().toISOString(),
    version: '1.0',

    // Raw articles (top 20)
    articles: topArticles.slice(0, 20).map(a => ({
      title: a.title,
      source: a.source,
      relevance: a.relevance,
      topics: a.topics
    })),

    // LLM analysis
    analysis,

    // Deep insights
    deepInsights,

    // Quick access for posting scripts
    quickTake: analysis?.resumen_dia || null,
    quickTopics: analysis?.temas_calientes || [],
    quickAngles: analysis?.angulos_humor || [],
    quickPhrases: analysis?.frases_inspiradas || [],

    // History
    history
  };

  saveResearch(researchData);

  // ═══ RESUMEN ═══
  C.log.banner([
    '📰 RESEARCH COMPLETE',
    `📊 ${allArticles.length} artículos scrapeados`,
    `🎯 ${relevant.length} relevantes para Gillito`,
    `🔬 ${deepInsights.length} deep insights`,
    `🧠 ${analysis ? 'Análisis LLM exitoso' : 'Sin análisis LLM'}`,
    `📅 Historial: ${history.length} sesiones`,
    '🦞 ¡Gillito sabe lo que pasa en la isla! 🔥'
  ]);

  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
