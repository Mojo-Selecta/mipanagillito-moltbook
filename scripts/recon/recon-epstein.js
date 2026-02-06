#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// 🕵️ RECON MODULE: Epstein Files Deep Investigation
// ═══════════════════════════════════════════════════════════════════════════════
// 🥷 STEALTH: Uses stealth-http for anti-bot detection evasion
//    Isolated session for .gov sites (separate cookie jar)

const path = require('path');
const fs   = require('fs');
const { parseRSS, extractEntities, classifyText, fingerprint, isRecent, sanitize } = require(path.join(__dirname, '..', 'lib', 'recon-utils'));
const { safeRequest, createSession } = require('./stealth-http');  // 🥷 Stealth drop-in

// 🥷 Isolated session for .gov sites (DOJ, FBI) — separate cookie jar
const govSession = createSession();

// ═══════════════════════════════════════════
// 🎯 EPSTEIN INTEL TARGETS
// ═══════════════════════════════════════════

const EPSTEIN_ENTITIES = [
  'Jeffrey Epstein', 'Epstein', 'Ghislaine Maxwell', 'Maxwell',
  'Jean-Luc Brunel', 'Brunel',
  'Trump', 'Clinton', 'Bill Clinton', 'Prince Andrew', 'Mountbatten-Windsor',
  'Pam Bondi', 'Pamela Bondi', 'Kash Patel', 'Todd Blanche',
  'Alexander Acosta', 'Acosta',
  'Thomas Massie', 'Ro Khanna', 'Anna Paulina Luna',
  'Steve Bannon', 'Bannon', 'Elon Musk', 'Musk',
  'Bill Gates', 'Gates', 'Woody Allen',
  'Larry Summers', 'Leon Black', 'Les Wexner', 'Lex Wexner',
  'Steve Tisch', 'Alan Dershowitz',
  'Virginia Giuffre', 'Virginia Roberts', 'Maria Farmer',
  'Brad Edwards',
  'SDNY', 'Southern District', 'FBI', 'DOJ',
  'House Oversight', 'Epstein Files Transparency Act', 'EFTA',
  'Little St. James', 'isla privada', 'private island',
  'Mar-a-Lago', '9 East 71st', 'Palm Beach',
];

const EPSTEIN_SIGNALS = {
  new_names:      /(?:nuevo[s]? nombre|new name|previously un(?:known|named)|first time|nunca antes)/i,
  redaction_drama: /(?:redact|tach|censurad|blacked out|removed|disappear|withheld|oculta)/i,
  cover_up:       /(?:cover.?up|encubri|withhold|hide|hid(?:den|ing)|missing doc|desapareci)/i,
  victim_exposure: /(?:victim.?name|nombre.?víctima|unredacted victim|exposed survivor)/i,
  new_release:    /(?:new (?:release|tranche|batch|drop|document)|nueva.?liberación|released today|just released)/i,
  political_link: /(?:Trump|Clinton|Prince Andrew|Musk|Gates|Bannon).{0,30}(?:Epstein|file|document|foto|photo|email)/i,
  pr_connection:  /(?:Puerto Rico|boricua|carib|island|isla).{0,40}(?:Epstein|traffic|abuse)/i,
  flight_logs:    /(?:flight log|lolita express|private (?:jet|plane)|avión privado|passenger)/i,
  fbi_failure:    /(?:FBI (?:fail|knew|ignored|delay|withheld)|1996.{0,20}complaint|decade.{0,10}before)/i,
  financial:      /(?:bank record|financial|money|payment|wire transfer|foundation|donation)/i,
};

// ═══════════════════════════════════════════
// 📡 NEWS & DOCUMENT SOURCES
// ═══════════════════════════════════════════

const EPSTEIN_RSS_FEEDS = [
  { name: 'Google News: Epstein Files', url: 'https://news.google.com/rss/search?q=Epstein+files+released+2026&hl=en-US&gl=US&ceid=US:en', type: 'rss', priority: 'high' },
  { name: 'Google News: Epstein DOJ', url: 'https://news.google.com/rss/search?q=Epstein+DOJ+documents+FBI&hl=en-US&gl=US&ceid=US:en', type: 'rss', priority: 'high' },
  { name: 'Google News: Epstein ES', url: 'https://news.google.com/rss/search?q=Epstein+archivos+documentos&hl=es-419&gl=US&ceid=US:es-419', type: 'rss', priority: 'medium' },
  { name: 'Google News: Epstein Names', url: 'https://news.google.com/rss/search?q=Epstein+files+Trump+Clinton+names+revealed&hl=en-US&gl=US&ceid=US:en', type: 'rss', priority: 'high' },
  { name: 'Google News: Epstein Redactions', url: 'https://news.google.com/rss/search?q=Epstein+redacted+withheld+cover+up&hl=en-US&gl=US&ceid=US:en', type: 'rss', priority: 'medium' },
  { name: 'Google News: Maxwell', url: 'https://news.google.com/rss/search?q=Ghislaine+Maxwell+Epstein+2026&hl=en-US&gl=US&ceid=US:en', type: 'rss', priority: 'low' },
];

const MONITOR_PAGES = [
  { name: 'DOJ Epstein Library', url: 'https://www.justice.gov/epstein', selector: 'Last Updated', type: 'page_change' },
  { name: 'DOJ Disclosures', url: 'https://www.justice.gov/epstein/doj-disclosures', type: 'page_change' },
  { name: 'FBI Vault - Epstein', url: 'https://vault.fbi.gov/jeffrey-epstein', type: 'page_change' },
  { name: 'House Oversight Epstein', url: 'https://oversight.house.gov/release/oversight-committee-releases-epstein-records-provided-by-the-department-of-justice/', type: 'page_change' },
];

// ═══════════════════════════════════════════
// 🔧 EPSTEIN-SPECIFIC UTILITIES
// ═══════════════════════════════════════════

function extractEpsteinEntities(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const entity of EPSTEIN_ENTITIES) {
    if (lower.includes(entity.toLowerCase())) {
      const normalized = entity
        .replace(/^(Jeffrey |J\. )/, '')
        .replace(/^(Ghislaine )/, '')
        .replace('Mountbatten-Windsor', 'Prince Andrew');
      if (!found.includes(normalized)) found.push(normalized);
    }
  }
  return found;
}

function detectEpsteinSignals(text) {
  const signals = [];
  for (const [signal, regex] of Object.entries(EPSTEIN_SIGNALS)) {
    if (regex.test(text)) signals.push(signal);
  }
  return signals;
}

function scoreEpsteinJuiciness(finding) {
  let score = 6;
  const signals = finding.signals || [];
  if (signals.includes('new_names'))       score += 3;
  if (signals.includes('cover_up'))        score += 2.5;
  if (signals.includes('redaction_drama')) score += 2;
  if (signals.includes('victim_exposure')) score += 1.5;
  if (signals.includes('new_release'))     score += 2;
  if (signals.includes('political_link'))  score += 2;
  if (signals.includes('pr_connection'))   score += 3;
  if (signals.includes('flight_logs'))     score += 1.5;
  if (signals.includes('fbi_failure'))     score += 2;
  if (signals.includes('financial'))       score += 1;
  score += Math.min((finding.entities?.length || 0) * 0.5, 3);
  if (finding.timestamp) {
    const ageHours = (Date.now() - new Date(finding.timestamp).getTime()) / 3600000;
    if (ageHours < 6)  score += 2;
    else if (ageHours < 24) score += 1;
  }
  return Math.min(score, 10);
}

// ═══════════════════════════════════════════
// 📰 RSS NEWS SCANNER
// ═══════════════════════════════════════════

async function scanEpsteinNews() {
  console.log('   📰 [EPSTEIN] Scanning news sources...');
  const findings = [];
  const seen = new Set();

  for (const feed of EPSTEIN_RSS_FEEDS) {
    try {
      const xml = await safeRequest(feed.url);
      if (!xml) { console.log(`      ⚠️ ${feed.name}: no response`); continue; }

      const items = parseRSS(xml);
      console.log(`      📡 ${feed.name}: ${items.length} items`);

      for (const item of items) {
        if (!item.title) continue;
        if (!isRecent(item.pubDate, 72)) continue;
        const fp = fingerprint(item.title);
        if (seen.has(fp)) continue;
        seen.add(fp);
        const text = sanitize(`${item.title} ${item.description || ''}`);
        if (!/epstein|maxwell|ghislaine/i.test(text)) continue;
        const entities = extractEpsteinEntities(text);
        const signals = detectEpsteinSignals(text);
        const classification = classifyText(text);
        const allSignals = [...new Set([...signals, ...classification.signals])];

        const finding = {
          category: 'epstein_files',
          subcategory: determineSubcategory(allSignals),
          signals: allSignals,
          headline: sanitize(item.title),
          summary: sanitize((item.description || '').slice(0, 500)),
          source: item.source || feed.name,
          sourceUrl: item.link || '',
          entities,
          timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          fingerprint: fp,
          level: 'L1',
          recon_type: 'epstein_news',
        };
        finding.juiciness = scoreEpsteinJuiciness(finding);
        findings.push(finding);
      }
    } catch (err) {
      console.error(`      ❌ ${feed.name}: ${err.message}`);
    }
  }
  return findings;
}

function determineSubcategory(signals) {
  if (signals.includes('new_release'))     return 'document_release';
  if (signals.includes('new_names'))       return 'names_revealed';
  if (signals.includes('cover_up'))        return 'cover_up';
  if (signals.includes('redaction_drama')) return 'redactions';
  if (signals.includes('victim_exposure')) return 'victim_rights';
  if (signals.includes('political_link'))  return 'political_connections';
  if (signals.includes('fbi_failure'))     return 'fbi_failure';
  if (signals.includes('flight_logs'))     return 'flight_logs';
  if (signals.includes('financial'))       return 'financial_trails';
  return 'general';
}

// ═══════════════════════════════════════════
// 🔍 DOJ PAGE MONITOR
// ═══════════════════════════════════════════

const SNAPSHOT_FILE = path.join(process.cwd(), '.gillito-epstein-snapshots.json');

function loadSnapshots() {
  try { return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')); } catch { return {}; }
}

function saveSnapshots(data) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
}

async function monitorPages() {
  console.log('   🔍 [EPSTEIN] Monitoring DOJ/FBI pages for changes...');
  const findings = [];
  const snapshots = loadSnapshots();
  let changed = false;

  for (const page of MONITOR_PAGES) {
    try {
      // 🥷 Use isolated gov session for .gov sites
      const html = await safeRequest(page.url, { session: govSession });
      if (!html) { console.log(`      ⚠️ ${page.name}: no response`); continue; }

      const contentHash = simpleHash(extractPageContent(html, page));
      const pageSize = html.length;
      const prev = snapshots[page.url];

      if (prev) {
        if (prev.hash !== contentHash || Math.abs(prev.size - pageSize) > 500) {
          console.log(`      🚨 ${page.name}: CHANGE DETECTED! (${prev.size} → ${pageSize} bytes)`);
          findings.push({
            category: 'epstein_files',
            subcategory: 'document_release',
            signals: ['new_release', 'page_change'],
            headline: `🚨 CAMBIO DETECTADO: ${page.name} — posible nuevo release de documentos`,
            summary: `La página ${page.url} cambió de tamaño (${prev.size} → ${pageSize} bytes). Posible nueva liberación de archivos de Epstein.`,
            source: page.name, sourceUrl: page.url,
            entities: ['DOJ', 'Epstein'],
            timestamp: new Date().toISOString(),
            fingerprint: fingerprint(`page_change_${page.url}_${Date.now()}`),
            level: 'L2', recon_type: 'epstein_page_monitor',
            juiciness: 9,
          });
          changed = true;
        } else {
          console.log(`      ✅ ${page.name}: no changes`);
        }
      } else {
        console.log(`      📸 ${page.name}: first snapshot (${pageSize} bytes)`);
      }
      snapshots[page.url] = { hash: contentHash, size: pageSize, lastCheck: new Date().toISOString() };
    } catch (err) {
      console.error(`      ❌ ${page.name}: ${err.message}`);
    }
  }
  saveSnapshots(snapshots);
  return findings;
}

function extractPageContent(html, page) {
  const lastUpdated = html.match(/Last Updated[:\s]*([^<\n]+)/i);
  const dataSetLinks = (html.match(/data-set-\d+/gi) || []).length;
  const pdfLinks = (html.match(/\.pdf/gi) || []).length;
  const mainContent = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
                      html.match(/id="main-content"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || html;
  return `${lastUpdated?.[1] || ''}|${dataSetLinks}|${pdfLinks}|${mainContent.length}`;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// ═══════════════════════════════════════════
// 🧠 LLM DEEP ANALYSIS
// ═══════════════════════════════════════════

async function analyzeWithLLM(findings) {
  if (findings.length === 0) return null;
  if (findings.length < 3 && !findings.some(f => f.juiciness >= 8)) return null;

  let C;
  try { C = require(path.join(__dirname, '..', 'lib', 'core')); }
  catch { console.log('      ℹ️ Core.js not available — skipping LLM analysis'); return null; }

  const topFindings = findings
    .sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0))
    .slice(0, 10);

  const newsDigest = topFindings.map((f, i) =>
    `${i+1}. [${f.subcategory}] ${f.headline}\n   Nombres: ${(f.entities || []).join(', ')}\n   Señales: ${(f.signals || []).join(', ')}`
  ).join('\n');

  const prompt = `Eres el analista de inteligencia de Gillito, un bot satírico boricua.

NOTICIAS SOBRE LOS ARCHIVOS DE EPSTEIN:
${newsDigest}

Analiza y responde SOLO en JSON:
{
  "resumen": "resumen de 2 oraciones de lo más importante",
  "nombres_clave": ["nombres revelados o mencionados"],
  "nivel_escandalo": 1-10,
  "angulo_pr": "conexión con Puerto Rico o paralelo con situación boricua (LUMA, corrupción, etc.)",
  "angulos_satira": [
    {"tema": "...", "angulo": "perspectiva sarcástica de Gillito"},
    {"tema": "...", "angulo": "..."}
  ],
  "frases_gillito": [
    "frase que Gillito diría sobre esto en su estilo callejero boricua",
    "otra frase"
  ],
  "cover_up_score": 1-10,
  "pregunta_que_nadie_hace": "la pregunta obvia que nadie está haciendo sobre esto"
}`;

  try {
    const result = await C.groqJSON(
      'Eres un analista de inteligencia especializado en escándalos políticos y tráfico. Responde SOLO en JSON válido.',
      prompt,
      { maxTokens: 600, temperature: 0.8 }
    );
    if (result) console.log(`      🧠 LLM Analysis: escándalo ${result.nivel_escandalo}/10, cover-up ${result.cover_up_score}/10`);
    return result;
  } catch (err) {
    console.error(`      ⚠️ LLM analysis failed: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════
// 🎯 MAIN SCAN FUNCTION
// ═══════════════════════════════════════════

async function scan() {
  console.log('   🕵️ [EPSTEIN] Deep investigation scan...');
  const allFindings = [];

  const newsFindings = await scanEpsteinNews();
  allFindings.push(...newsFindings);

  const pageFindings = await monitorPages();
  allFindings.push(...pageFindings);

  const analysis = await analyzeWithLLM(allFindings);

  if (analysis) {
    if (analysis.angulos_satira) {
      for (const angulo of analysis.angulos_satira.slice(0, 2)) {
        allFindings.push({
          category: 'epstein_files', subcategory: 'llm_analysis',
          signals: ['llm_insight'],
          headline: `🧠 Ángulo satírico: ${angulo.tema}`,
          summary: angulo.angulo,
          source: 'Gillito Intelligence', sourceUrl: '',
          entities: analysis.nombres_clave || [],
          timestamp: new Date().toISOString(),
          fingerprint: fingerprint(`llm_${angulo.tema}_${Date.now()}`),
          level: 'L3', recon_type: 'epstein_llm_analysis', juiciness: 7,
        });
      }
    }
    if (analysis.angulo_pr && analysis.angulo_pr.length > 10) {
      allFindings.push({
        category: 'epstein_files', subcategory: 'pr_connection',
        signals: ['pr_connection', 'llm_insight'],
        headline: `🇵🇷 Conexión PR: ${analysis.angulo_pr.slice(0, 100)}`,
        summary: analysis.angulo_pr,
        source: 'Gillito Intelligence', sourceUrl: '',
        entities: ['Puerto Rico', ...(analysis.nombres_clave || []).slice(0, 3)],
        timestamp: new Date().toISOString(),
        fingerprint: fingerprint(`pr_angle_${Date.now()}`),
        level: 'L3', recon_type: 'epstein_pr_angle', juiciness: 8.5,
      });
    }
    if (analysis.frases_gillito) {
      for (const frase of analysis.frases_gillito.slice(0, 2)) {
        allFindings.push({
          category: 'epstein_files', subcategory: 'ready_content',
          signals: ['llm_insight', 'ready_to_post'],
          headline: `💬 Frase lista: ${frase.slice(0, 80)}`,
          summary: frase,
          source: 'Gillito Intelligence', sourceUrl: '',
          entities: [],
          timestamp: new Date().toISOString(),
          fingerprint: fingerprint(`frase_${Date.now()}_${Math.random()}`),
          level: 'L3', recon_type: 'epstein_ready_content', juiciness: 7.5,
        });
      }
    }
  }

  const seen = new Set();
  const deduped = allFindings.filter(f => {
    const key = f.headline?.slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  deduped.sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0));

  console.log(`   🕵️ [EPSTEIN] Investigation complete: ${deduped.length} findings`);
  if (deduped.length > 0) console.log(`      🔥 Top finding (juiciness ${deduped[0].juiciness}): ${deduped[0].headline.slice(0, 80)}`);
  if (analysis) console.log(`      📊 Escándalo: ${analysis.nivel_escandalo}/10 | Cover-up: ${analysis.cover_up_score}/10`);

  return deduped;
}

module.exports = { scan, EPSTEIN_ENTITIES, EPSTEIN_SIGNALS, EPSTEIN_RSS_FEEDS, MONITOR_PAGES };
