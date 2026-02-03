// ═══════════════════════════════════════════════════════
// 🇺🇸 RECON MODULE: Federal / ICE / Trump
// ═══════════════════════════════════════════════════════

const path = require('path');
const { safeRequest, parseRSS, extractEntities, classifyText, fingerprint, isRecent, sanitize } = require(path.join(__dirname, 'lib', 'recon-utils'));
const { FEDERAL_ENTITIES, RSS_FEEDS } = require(path.join(__dirname, '..', 'config', 'recon-targets'));

async function scan() {
  console.log('   🇺🇸 Scanning federal sources...');
  const findings = [];
  const seen = new Set();

  for (const feed of RSS_FEEDS.federal) {
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
        const entities = extractEntities(text, FEDERAL_ENTITIES);
        const classification = classifyText(text);

        if (entities.length === 0 &&
            !/puerto rico|boricua|isla|territorial|jones act|fema|hud|fbi|ice|cbp|deport/i.test(text)) {
          continue;
        }

        findings.push({
          category: 'federal',
          subcategory: classification.category,
          signals: classification.signals,
          headline: sanitize(item.title),
          summary: sanitize(item.description?.slice(0, 400) || ''),
          source: item.source || feed.name,
          sourceUrl: item.link || '',
          entities: entities.length > 0 ? entities : ['Federal Gov'],
          timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          fingerprint: fp,
        });
      }
    } catch (err) {
      console.error(`      ❌ ${feed.name}: ${err.message}`);
    }
  }

  console.log(`   🇺🇸 Federal: ${findings.length} findings`);
  return findings;
}

module.exports = { scan };
