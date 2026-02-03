// ═══════════════════════════════════════════════════════
// 📰 LEVEL 1: DEEP NEWS MINING
// ═══════════════════════════════════════════════════════
// PATH: scripts/recon/deep-news.js

const path = require('path');
const { safeRequest, extractEntities, classifyText, fingerprint, sanitize } = require(path.join(__dirname, '..', 'lib', 'recon-utils'));
const { POLITICIANS, ENERGY_ENTITIES, FEDERAL_ENTITIES } = require(path.join(__dirname, '..', '..', 'config', 'recon-targets'));

const ALL_ENTITIES = [...POLITICIANS, ...ENERGY_ENTITIES, ...FEDERAL_ENTITIES];

const DEEP_SOURCES = [
{ name: 'FOMB Fiscal Plans', url: 'https://oversightboard.pr.gov/feed/', type: 'rss' },
{ name: 'Contralor Informes', url: 'https://www.ocpr.gov.pr/feed/', type: 'rss' },
{ name: 'Senado PR', url: 'https://senado.pr.gov/feed/', type: 'rss' },
{ name: 'Cámara PR', url: 'https://www.camara.pr.gov/feed/', type: 'rss' },
{ name: 'CPI Noticias', url: 'https://periodismoinvestigativo.com/feed/', type: 'rss' },
{ name: 'Contratos En Ley', url: 'https://contratosenley.org/feed/', type: 'rss' },
];

async function scrapeArticle(url) {
if (!url) return '';
try {
const html = await safeRequest(url, { timeout: 20000 });
if (!html) return '';
let content = '';
const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
if (articleMatch) {
content = articleMatch[1];
} else {
const contentMatch = html.match(
/<div[^>]*class="[^"]*(?:entry-content|article-body|post-content|story-body|content-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
);
if (contentMatch) content = contentMatch[1];
}
if (!content) return '';
return content
.replace(/<script[\s\S]*?<\/script>/gi, '')
.replace(/<style[\s\S]*?<\/style>/gi, '')
.replace(/<[^>]+>/g, ' ')
.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
.replace(/&gt;/g, '>').replace(/&quot;/g, '"')
.replace(/\s+/g, ' ').trim().substring(0, 3000);
} catch { return ''; }
}

function extractMoney(text) {
const amounts = [];
const patterns = [
/\$[\d,]+(?:\.\d{1,2})?(?:\s*(?:million|billion|mil(?:lones)?|B|M))?/gi,
/(\d[\d,.]+)\s*(?:millones|billion|million)/gi,
];
for (const p of patterns) {
let m;
while ((m = p.exec(text)) !== null) { amounts.push(m[0]); }
}
return [...new Set(amounts)].slice(0, 5);
}

async function scan() {
console.log('   📰 [L1] Deep News Mining…');
const findings = [];
const seen = new Set();

for (const source of DEEP_SOURCES) {
try {
const xml = await safeRequest(source.url);
if (!xml) { console.log(`      ⚠️ ${source.name}: no response`); continue; }

  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] || match[2];
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i) || block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const descMatch = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                      block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
    const dateMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
    items.push({
      title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      link: linkMatch ? linkMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      pubDate: dateMatch ? dateMatch[1].trim() : '',
    });
  }

  console.log(`      📡 ${source.name}: ${items.length} items`);

  for (const item of items.slice(0, 5)) {
    if (!item.title) continue;
    const fp = fingerprint(item.title);
    if (seen.has(fp)) continue;
    seen.add(fp);

    const fullText = await scrapeArticle(item.link);
    const combinedText = sanitize(`${item.title} ${item.description} ${fullText}`);
    const entities = extractEntities(combinedText, ALL_ENTITIES);
    const classification = classifyText(combinedText);
    const money = extractMoney(combinedText);

    if (entities.length === 0 && classification.signals.length === 0 && money.length === 0) continue;

    findings.push({
      category: 'deep_news',
      subcategory: classification.category,
      signals: classification.signals,
      headline: sanitize(item.title),
      summary: sanitize(fullText ? fullText.slice(0, 500) : item.description?.slice(0, 400) || ''),
      source: source.name,
      sourceUrl: item.link || '',
      entities,
      moneyMentioned: money,
      timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      fingerprint: fp,
      depth: 'full_article',
    });
  }
} catch (err) {
  console.error(`      ❌ ${source.name}: ${err.message}`);
}

}

console.log(`   📰 [L1] Deep News: ${findings.length} findings`);
return findings;
}

module.exports = { scan };
