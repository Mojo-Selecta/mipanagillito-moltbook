// ═══════════════════════════════════════════════════════
// 🏛️ RECON MODULE: Politicians & Government
// ═══════════════════════════════════════════════════════

const path = require('path');
const ROOT = process.cwd();

const { safeRequest, parseRSS, extractEntities, classifyText, fingerprint, isRecent, sanitize } = require(path.join(ROOT, 'lib', 'recon-utils'));
const { POLITICIANS, RSS_FEEDS } = require(path.join(ROOT, 'config', 'recon-targets'));

async function scan() {
  console.log('   🏛️ Scanning political sources...');
  const findings = [];
  const seen = new Set();

  for (const feed of RSS_FEEDS.politicians) {
    try {
      const xml = await safeRequest(feed.url);
      if (!xml) { console.log(`      ⚠️ ${feed.name}: no response`); continue; }

      const items = parseRSS(xml);
      console.log(`      📡 ${feed.name}: ${items.length} items`);

      for (const item of items) {
        if (!item.title) continue;
        if (!isRecent(item.pubDate, 48)) continue;

        const fp = fingerprint(item.title);
        if (seen.has(fp)) continue;
        seen.add(fp);

        const text = sanitize(`${item.title} ${item.description}`);
        const entities = extractEntities(text, POLITICIANS);
        const classification = classifyText(text);

        if (entities.length === 0 && !classification.signals.includes('scandal') &&
            !/politic|gobierno|legisl|senado|cámara|gobernador|alcalde/i.test(text)) {
          continue;
        }

        findings.push({
          category: 'politicians',
          subcategory: classification.category,
          signals: classification.signals,
          headline: sanitize(item.title),
          summary: sanitize(item.description?.slice(0, 400) || ''),
          source: item.source || feed.name,
          sourceUrl: item.link || '',
          entities: entities.length > 0 ? entities : ['PR Government'],
          timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          fingerprint: fp,
        });
      }
    } catch (err) {
      console.error(`      ❌ ${feed.name}: ${err.message}`);
    }
  }

  console.log(`   🏛️ Politicians: ${findings.length} findings`);
  return findings;
}

module.exports = { scan };
