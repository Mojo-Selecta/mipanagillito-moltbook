// ═══════════════════════════════════════════════════════
// 📰 RECON MODULE: General PR News
// ═══════════════════════════════════════════════════════

const path = require('path');
const ROOT = process.cwd();

const { safeRequest, parseRSS, classifyText, fingerprint, isRecent, sanitize } = require(path.join(ROOT, 'lib', 'recon-utils'));
const { RSS_FEEDS } = require(path.join(ROOT, 'config', 'recon-targets'));

async function scan() {
  console.log('   📰 Scanning general news sources...');
  const findings = [];
  const seen = new Set();

  for (const feed of RSS_FEEDS.general) {
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
        const classification = classifyText(text);

        // Skip boring/filler news
        if (classification.signals.length === 0 &&
            !/escándalo|investig|arres|corrup|protest|crisis|emergencia|huracán|terremoto/i.test(text)) {
          // Still include if it's about PR specifically
          if (!/puerto rico|boricua|isla|san juan|bayamón|ponce|mayagüez|carolina/i.test(text)) {
            continue;
          }
        }

        findings.push({
          category: 'general_news',
          subcategory: classification.category,
          signals: classification.signals,
          headline: sanitize(item.title),
          summary: sanitize(item.description?.slice(0, 400) || ''),
          source: item.source || feed.name,
          sourceUrl: item.link || '',
          entities: [],
          timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          fingerprint: fp,
        });
      }
    } catch (err) {
      console.error(`      ❌ ${feed.name}: ${err.message}`);
    }
  }

  console.log(`   📰 General news: ${findings.length} findings`);
  return findings;
}

module.exports = { scan };
