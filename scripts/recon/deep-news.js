// ═══════════════════════════════════════════════════════
// 📰 LEVEL 1: DEEP NEWS MINING
// ═══════════════════════════════════════════════════════
// Goes beyond RSS headlines — scrapes full article text,
// FOMB fiscal oversight docs, Contralor audit reports

const path = require('path');
const { safeRequest, extractEntities, classifyText, fingerprint, sanitize } = require(path.join(__dirname, 'lib', 'recon-utils'));
const { POLITICIANS, ENERGY_ENTITIES, FEDERAL_ENTITIES } = require(path.join(__dirname, '..', 'config', 'recon-targets'));

const ALL_ENTITIES = [...POLITICIANS, ...ENERGY_ENTITIES, ...FEDERAL_ENTITIES];

// ─── Sources to deep-scrape ───

const DEEP_SOURCES = [
  // FOMB (Junta de Control Fiscal) — public meeting minutes & reports
  { name: 'FOMB Fiscal Plans', url: 'https://oversightboard.pr.gov/feed/', type: 'rss' },
  
  // Contralor audit reports (public)
  { name: 'Contralor Informes', url: 'https://www.ocpr.gov.pr/feed/', type: 'rss' },
  
  // Senado PR
  { name: 'Senado PR', url: 'https://senado.pr.gov/feed/', type: 'rss' },
  
  // Cámara de Representantes
  { name: 'Cámara PR', url: 'https://www.camara.pr.gov/feed/', type: 'rss' },
  
  // CPI Noticias (Centro de Periodismo Investigativo)
  { name: 'CPI Noticias', url: 'https://periodismoinvestigativo.com/feed/', type: 'rss' },
  
  // Contratos En Ley (public contract watchdog)
  { name: 'Contratos En Ley', url: 'https://contratosenley.org/feed/', type: 'rss' },
];

// ─── Full article scraper ───

async function scrapeArticle(url) {
  if (!url) return '';
  try {
    const html = await safeRequest(url, { timeout: 20000 });
    if (!html) return '';
    
    // Extract main content — look for article body patterns
    let content = '';
    
    // Try <article> tag first
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      content = articleMatch[1];
    } else {
      // Try common content div patterns
      const contentMatch = html.match(
        /<div[^>]*class="[^"]*(?:entry-content|article-body|post-content|story-body|content-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );
      if (contentMatch) content = contentMatch[1];
    }
    
    if (!content) return '';
    
    // Strip HTML tags and clean up
    return content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000); // Cap at 3000 chars
  } catch {
    return '';
  }
}

// ─── Extract dollar amounts from text ───

function extractMoney(text) {
  const amounts = [];
  // Match $X,XXX,XXX or X millones or X billion
  const patterns = [
    /\$[\d,]+(?:\.\d{1,2})?(?:\s*(?:million|billion|mil(?:lones)?|B|M))?/gi,
    /(\d[\d,.]+)\s*(?:millones|billion|million)/gi,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      amounts.push(m[0]);
    }
  }
  return [...new Set(amounts)].slice(0, 5);
}

// ─── Main scan ───

async function scan() {
  console.log('   📰 [L1] Deep News Mining...');
  const findings = [];
  const seen = new Set();

  for (const source of DEEP_SOURCES) {
    try {
      const xml = await safeRequest(source.url);
      if (!xml) { console.log(`      ⚠️ ${source.name}: no response`); continue; }

      // Simple RSS parse
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

      // Process top 5 items per source (limit scraping load)
      for (const item of items.slice(0, 5)) {
        if (!item.title) continue;

        const fp = fingerprint(item.title);
        if (seen.has(fp)) continue;
        seen.add(fp);

        // Deep scrape the full article
        const fullText = await scrapeArticle(item.link);
        const combinedText = sanitize(`${item.title} ${item.description} ${fullText}`);
        
        const entities = extractEntities(combinedText, ALL_ENTITIES);
        const classification = classifyText(combinedText);
        const money = extractMoney(combinedText);

        // Only keep if it has entities, signals, or mentions money
        if (entities.length === 0 && classification.signals.length === 0 && money.length === 0) {
          continue;
        }

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
