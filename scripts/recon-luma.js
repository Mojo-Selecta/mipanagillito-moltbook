// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 RECON MODULE: LUMA Energy & Infrastructure
// ═══════════════════════════════════════════════════════════════════════════════

const { safeRequest, parseRSS, extractEntities, classifyText, fingerprint, isRecent, sanitize } = require('../lib/recon-utils');
const { ENERGY, RSS_FEEDS } = require('../config/recon-targets');

async function scan() {
  console.log('   🔌 Scanning energy & infrastructure sources...');
  const findings = [];
  const seen = new Set();

  for (const feed of RSS_FEEDS.energy) {
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
        const entities = extractEntities(text, ENERGY);
        const classification = classifyText(text);

        // Keep if matches energy target or has energy signals
        if (entities.length === 0 && !classification.signals.includes('energy') &&
            !/luma|apag|energ|electri|tarifa|luz|infraestructura|agua|carretera/i.test(text)) {
          continue;
        }

        findings.push({
          category: 'energy',
          subcategory: classification.category,
          signals: classification.signals,
          headline: sanitize(item.title),
          summary: sanitize(item.description?.slice(0, 400) || ''),
          source: item.source || feed.name,
          sourceUrl: item.link || '',
          entities: entities.length > 0 ? entities : ['Energía PR'],
          timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          fingerprint: fp,
        });
      }
    } catch (err) {
      console.error(`      ❌ ${feed.name}: ${err.message}`);
    }
  }

  console.log(`   🔌 Energy: ${findings.length} findings`);
  return findings;
}

module.exports = { scan };
