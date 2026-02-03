// ═══════════════════════════════════════════════════════════════════════════════
// 🇺🇸 RECON MODULE: Federal Actions Affecting Puerto Rico
// ═══════════════════════════════════════════════════════════════════════════════

const path = require('path');
const ROOT = process.cwd();

const { safeRequest, parseRSS, extractEntities, classifyText, fingerprint, isRecent, sanitize } = require(path.join(ROOT, 'lib', 'recon-utils'));
const { FEDERAL, RSS_FEEDS } = require(path.join(ROOT, 'config', 'recon-targets'));

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
        if (!isRecent(item.pubDate, 72)) continue;

        const fp = fingerprint(item.title);
        if (seen.has(fp)) continue;
        seen.add(fp);

        const text = sanitize(`${item.title} ${item.description}`);
        const entities = extractEntities(text, FEDERAL);
        const classification = classifyText(text);

        const prRelevant = /puerto rico|boricua|isla|territorial|colony|commonwealth/i.test(text) ||
                          entities.length > 0 ||
                          classification.signals.includes('federal');

        if (!prRelevant) continue;

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
