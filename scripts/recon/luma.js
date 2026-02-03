// ═══════════════════════════════════════════════════════
// ⚡ RECON MODULE: LUMA / Energy
// ═══════════════════════════════════════════════════════
// PATH: scripts/recon/luma.js

const path = require('path');
const { safeRequest, parseRSS, extractEntities, classifyText, fingerprint, isRecent, sanitize } = require(path.join(__dirname, '..', 'lib', 'recon-utils'));
const { ENERGY_ENTITIES, RSS_FEEDS } = require(path.join(__dirname, '..', '..', 'config', 'recon-targets'));

async function scan() {
console.log('   ⚡ Scanning energy/LUMA sources…');
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
    const entities = extractEntities(text, ENERGY_ENTITIES);
    const classification = classifyText(text);

    if (entities.length === 0 &&
        !/luma|energ|apag|blackout|luz|tarifa|factura|kilovatio|kwh|power|grid|aee|prepa/i.test(text)) {
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
      entities: entities.length > 0 ? entities : ['LUMA Energy'],
      timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      fingerprint: fp,
    });
  }
} catch (err) {
  console.error(`      ❌ ${feed.name}: ${err.message}`);
}

}

console.log(`   ⚡ Energy: ${findings.length} findings`);
return findings;
}

module.exports = { scan };
