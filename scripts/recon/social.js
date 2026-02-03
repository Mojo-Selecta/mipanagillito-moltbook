// ═══════════════════════════════════════════════════════
// 👁️ LEVEL 3: SOCIAL LISTENING
// ═══════════════════════════════════════════════════════
// PATH: scripts/recon/social.js

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { safeRequest, extractEntities, classifyText, fingerprint, sanitize } = require(path.join(__dirname, '..', 'lib', 'recon-utils'));
const { POLITICIANS } = require(path.join(__dirname, '..', '..', 'config', 'recon-targets'));

const SNAPSHOT_FILE = path.join(process.cwd(), '.gillito-page-snapshots.json');

const POLITICIAN_FEEDS = [
{ name: 'Jenniffer González', handle: 'jaborgen', feeds: [
'https://rsshub.app/twitter/user/jaborgen',
'https://nitter.privacydev.net/jaborgen/rss',
]},
{ name: 'Juan Dalmau', handle: 'JuanDalm662', feeds: [
'https://rsshub.app/twitter/user/JuanDalmau662',
]},
{ name: 'Thomas Rivera Schatz', handle: 'TRiveraSchatz', feeds: [
'https://rsshub.app/twitter/user/TRiveraSchatz',
]},
{ name: 'Alexandra Lúgaro', handle: 'alexandralugaro', feeds: [
'https://rsshub.app/twitter/user/alexandralugaro',
]},
{ name: 'LUMA Energy', handle: 'LUMAEnergiaPR', feeds: [
'https://rsshub.app/twitter/user/LUMAEnergiaPR',
]},
{ name: 'Senado PR', handle: 'SenadoPR', feeds: [
'https://rsshub.app/twitter/user/SenadoPR',
]},
{ name: 'Cámara PR', handle: 'CamaraPR', feeds: [
'https://rsshub.app/twitter/user/CamaraPR',
]},
];

const WATCH_PAGES = [
{ name: 'LUMA Outage Map', url: 'https://miluma.lumapr.com/outages/outageMap', selector: 'status' },
{ name: 'FOMB Meetings', url: 'https://oversightboard.pr.gov/meetings/', selector: 'meetings' },
{ name: 'Fortaleza (Gov Office)', url: 'https://www.fortaleza.pr.gov/', selector: 'news' },
{ name: 'Senado Calendar', url: 'https://senado.pr.gov/', selector: 'calendar' },
{ name: 'NEPR Energy', url: 'https://energia.pr.gov/', selector: 'updates' },
];

async function scanPoliticianFeeds() {
console.log('      🐦 Scanning politician feeds…');
const findings = [];

for (const pol of POLITICIAN_FEEDS) {
let foundFeed = false;
for (const feedUrl of pol.feeds) {
if (foundFeed) break;
try {
const xml = await safeRequest(feedUrl, { timeout: 15000 });
if (!xml) continue;
foundFeed = true;
const items = [];
const itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
let match;
while ((match = itemRegex.exec(xml)) !== null) {
const block = match[1] || match[2];
const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
const descMatch = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
const dateMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
block.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i) ||
block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
items.push({
text: sanitize((titleMatch ? titleMatch[1] : '') + ' ' + (descMatch ? descMatch[1] : '')),
date: dateMatch ? dateMatch[1].trim() : '',
link: linkMatch ? linkMatch[1].replace(/<[^>]+>/g, '').trim() : '',
});
}

    console.log(`      🐦 @${pol.handle}: ${items.length} tweets`);

    for (const item of items.slice(0, 10)) {
      if (!item.text || item.text.length < 20) continue;
      const classification = classifyText(item.text);
      if (classification.signals.length === 0 &&
          !/politic|gobierno|pueblo|crisis|corrup|luma|apagón|deport|trump|presupuesto|contrato/i.test(item.text)) {
        continue;
      }
      findings.push({
        category: 'social_listening', subcategory: 'politician_tweet',
        signals: classification.signals,
        headline: `@${pol.handle}: "${item.text.slice(0, 120)}..."`,
        summary: sanitize(item.text),
        source: `Twitter/@${pol.handle}`, sourceUrl: item.link || `https://x.com/${pol.handle}`,
        entities: [pol.name],
        timestamp: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
        fingerprint: fingerprint(item.text), depth: 'social_feed',
      });
    }
  } catch { continue; }
}
if (!foundFeed) console.log(`      ⚠️ @${pol.handle}: no feed available`);

}
return findings;
}

function loadSnapshots() {
try { if (fs.existsSync(SNAPSHOT_FILE)) return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')); } catch {}
return {};
}

function saveSnapshots(snapshots) {
try { fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshots, null, 2)); }
catch (err) { console.warn(`      ⚠️ Could not save snapshots: ${err.message}`); }
}

async function scanPageChanges() {
console.log('      🔍 Checking government pages for changes…');
const findings = [];
const snapshots = loadSnapshots();

for (const page of WATCH_PAGES) {
try {
const html = await safeRequest(page.url, { timeout: 20000 });
if (!html) { console.log(`      ⚠️ ${page.name}: no response`); continue; }

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/gi, '')
    .replace(/\s+/g, ' ').trim();

  const hash = crypto.createHash('md5').update(cleaned).digest('hex');
  const prevHash = snapshots[page.url]?.hash;
  const prevChecked = snapshots[page.url]?.checkedAt;

  if (prevHash && prevHash !== hash) {
    console.log(`      🚨 ${page.name}: CONTENT CHANGED!`);
    const textContent = cleaned.replace(/<[^>]+>/g, ' ').substring(0, 2000);
    const classification = classifyText(textContent);
    findings.push({
      category: 'social_listening', subcategory: 'page_change',
      signals: [...classification.signals, 'page_changed'],
      headline: `🚨 ${page.name} — Content changed since ${prevChecked || 'last check'}`,
      summary: `Government page "${page.name}" was modified. Check: ${page.url}`,
      source: page.name, sourceUrl: page.url,
      entities: ['PR Government'],
      timestamp: new Date().toISOString(),
      fingerprint: fingerprint(`page-change-${page.url}-${hash}`),
      depth: 'page_monitor',
    });
  } else {
    console.log(`      ✅ ${page.name}: no changes`);
  }
  snapshots[page.url] = { hash, checkedAt: new Date().toISOString(), name: page.name };
} catch (err) {
  console.error(`      ❌ ${page.name}: ${err.message}`);
}

}
saveSnapshots(snapshots);
return findings;
}

async function scan() {
console.log('   👁️ [L3] Social Listening…');
const [socialResults, pageResults] = await Promise.allSettled([
scanPoliticianFeeds(), scanPageChanges(),
]);
const findings = [];
if (socialResults.status === 'fulfilled') findings.push(...(socialResults.value || []));
if (pageResults.status === 'fulfilled') findings.push(...(pageResults.value || []));
console.log(`   👁️ [L3] Social Listening: ${findings.length} findings`);
return findings;
}

module.exports = { scan };
