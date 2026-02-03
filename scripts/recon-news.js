// ═══════════════════════════════════════════════════════════════════════════════
// 📰 RECON MODULE: PR News Deep Scanner
// ═══════════════════════════════════════════════════════════════════════════════
// Broader coverage — economy, crime, health, education, diaspora, culture.
// Goes beyond the specialized modules to catch everything Gillito might need.
// ═══════════════════════════════════════════════════════════════════════════════

const { safeRequest, parseRSS, extractEntities, classifyText, fingerprint, isRecent, sanitize } = require('../lib/recon-utils');
const { ALL_TARGETS, RSS_FEEDS } = require('../config/recon-targets');

async function scan() {
  console.log('   📰 Scanning PR news sources...');
  const findings = [];
  const seen = new Set();

  for (const feed of RSS_FEEDS.news) {
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
        const entities = extractEntities(text, ALL_TARGETS);
        const classification = classifyText(text);

        // PR relevance check — we want broad coverage but still PR-focused
        const prRelevant = /puerto rico|boricua|isla del encanto|pr\b|borink/i.test(text) ||
                          entities.length > 0 ||
                          classification.signals.length > 0;

        if (!prRelevant) continue;

        findings.push({
          category: 'news',
          subcategory: classification.category,
          signals: classification.signals,
          headline: sanitize(item.title),
          summary: sanitize(item.description?.slice(0, 400) || ''),
          source: item.source || feed.name,
          sourceUrl: item.link || '',
          entities: entities.length > 0 ? entities : ['Puerto Rico'],
          timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          fingerprint: fp,
        });
      }
    } catch (err) {
      console.error(`      ❌ ${feed.name}: ${err.message}`);
    }
  }

  console.log(`   📰 PR News: ${findings.length} findings`);
  return findings;
}

module.exports = { scan };
