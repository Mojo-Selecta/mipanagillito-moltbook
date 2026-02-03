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
  { name: 'Jenniffer Gonzalez', handle: 'jaborgen', feeds: [
    'https://rsshub.app/twitter/user/jaborgen',
    'https://nitter.privacydev.net/jaborgen/rss',
  ]},
  { name: 'Juan Dalmau', handle: 'JuanDalm662', feeds: [
    'https://rsshub.app/twitter/user/JuanDalmau662',
  ]},
  { name: 'Thomas Rivera Schatz', handle: 'TRiveraSchatz', feeds: [
    'https://rsshub.app/twitter/user/TRiveraSchatz',
  ]},
  { name: 'Alexandra Lugaro', handle: 'alexandralugaro', feeds: [
    'https://rsshub.app/twitter/user/alexandralugaro',
  ]},
  { name: 'LUMA Energy', handle: 'LUMAEnergiaPR', feeds: [
    'https://rsshub.app/twitter/user/LUMAEnergiaPR',
  ]},
  { name: 'Senado PR', handle: 'SenadoPR', feeds: [
    'https://rsshub.app/twitter/user/SenadoPR',
  ]},
  { name: 'Camara PR', handle: 'CamaraPR', feeds: [
    'https://rsshub.app/twitter/user/CamaraPR',
  ]},
];

const WATCH_PAGES = [
  { name: 'LUMA Outage Map', url: 'https://miluma.lumapr.com/outages/outageMap' },
  { name: 'FOMB Meetings', url: 'https://oversightboard.pr.gov/meetings/' },
  { name: 'Fortaleza (Gov Office)', url: 'https://www.fortaleza.pr.gov/' },
  { name: 'Senado Calendar', url: 'https://senado.pr.gov/' },
  { name: 'NEPR Energy', url: 'https://energia.pr.gov/' },
];

async function scanPoliticianFeeds() {
  console.log('      🐦 Scanning politician feeds...');
  var findings = [];

  for (var pi = 0; pi < POLITICIAN_FEEDS.length; pi++) {
    var pol = POLITICIAN_FEEDS[pi];
    var foundFeed = false;
    for (var fi = 0; fi < pol.feeds.length; fi++) {
      if (foundFeed) break;
      try {
        var xml = await safeRequest(pol.feeds[fi], { timeout: 15000 });
        if (!xml) continue;
        foundFeed = true;
        var items = [];
        var itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
        var match;
        while ((match = itemRegex.exec(xml)) !== null) {
          var block = match[1] || match[2];
          var titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
          var descMatch = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
          var dateMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                          block.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
          var linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i) ||
                          block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
          items.push({
            text: sanitize((titleMatch ? titleMatch[1] : '') + ' ' + (descMatch ? descMatch[1] : '')),
            date: dateMatch ? dateMatch[1].trim() : '',
            link: linkMatch ? linkMatch[1].replace(/<[^>]+>/g, '').trim() : '',
          });
        }

        console.log('      🐦 @' + pol.handle + ': ' + items.length + ' tweets');

        for (var ti = 0; ti < Math.min(items.length, 10); ti++) {
          var item = items[ti];
          if (!item.text || item.text.length < 20) continue;
          var classification = classifyText(item.text);
          if (classification.signals.length === 0 &&
              !/politic|gobierno|pueblo|crisis|corrup|luma|apagon|deport|trump|presupuesto|contrato/i.test(item.text)) {
            continue;
          }
          findings.push({
            category: 'social_listening', subcategory: 'politician_tweet',
            signals: classification.signals,
            headline: '@' + pol.handle + ': "' + item.text.slice(0, 120) + '..."',
            summary: sanitize(item.text),
            source: 'Twitter/@' + pol.handle, sourceUrl: item.link || ('https://x.com/' + pol.handle),
            entities: [pol.name],
            timestamp: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
            fingerprint: fingerprint(item.text), depth: 'social_feed',
          });
        }
      } catch (e) { continue; }
    }
    if (!foundFeed) console.log('      ⚠️ @' + pol.handle + ': no feed available');
  }
  return findings;
}

function loadSnapshots() {
  try { if (fs.existsSync(SNAPSHOT_FILE)) return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')); } catch (e) {}
  return {};
}

function saveSnapshots(snapshots) {
  try { fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshots, null, 2)); }
  catch (err) { console.warn('      ⚠️ Could not save snapshots: ' + err.message); }
}

async function scanPageChanges() {
  console.log('      🔍 Checking government pages for changes...');
  var findings = [];
  var snapshots = loadSnapshots();

  for (var wi = 0; wi < WATCH_PAGES.length; wi++) {
    var page = WATCH_PAGES[wi];
    try {
      var html = await safeRequest(page.url, { timeout: 20000 });
      if (!html) { console.log('      ⚠️ ' + page.name + ': no response'); continue; }

      var cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/gi, '')
        .replace(/\s+/g, ' ').trim();

      var hash = crypto.createHash('md5').update(cleaned).digest('hex');
      var prev = snapshots[page.url] || {};

      if (prev.hash && prev.hash !== hash) {
        console.log('      🚨 ' + page.name + ': CONTENT CHANGED!');
        var textContent = cleaned.replace(/<[^>]+>/g, ' ').substring(0, 2000);
        var classification = classifyText(textContent);
        findings.push({
          category: 'social_listening', subcategory: 'page_change',
          signals: classification.signals.concat(['page_changed']),
          headline: '🚨 ' + page.name + ' — Content changed since ' + (prev.checkedAt || 'last check'),
          summary: 'Government page "' + page.name + '" was modified. Check: ' + page.url,
          source: page.name, sourceUrl: page.url,
          entities: ['PR Government'],
          timestamp: new Date().toISOString(),
          fingerprint: fingerprint('page-change-' + page.url + '-' + hash),
          depth: 'page_monitor',
        });
      } else {
        console.log('      ✅ ' + page.name + ': no changes');
      }
      snapshots[page.url] = { hash: hash, checkedAt: new Date().toISOString(), name: page.name };
    } catch (err) {
      console.error('      ❌ ' + page.name + ': ' + err.message);
    }
  }
  saveSnapshots(snapshots);
  return findings;
}

async function scan() {
  console.log('   👁️ [L3] Social Listening...');
  var results = await Promise.allSettled([scanPoliticianFeeds(), scanPageChanges()]);
  var findings = [];
  if (results[0].status === 'fulfilled') findings.push.apply(findings, results[0].value || []);
  if (results[1].status === 'fulfilled') findings.push.apply(findings, results[1].value || []);
  console.log('   👁️ [L3] Social Listening: ' + findings.length + ' findings');
  return findings;
}

module.exports = { scan };
