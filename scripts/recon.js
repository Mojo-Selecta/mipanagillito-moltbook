#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// 🕵️  G I L L I T O   H A C K E R   S Y S T E M   v 1 . 0
//     ╔═══════════════════════════════════════════════╗
//     ║  OSINT RECON ENGINE — "EL OJO QUE TODO VE"   ║
//     ╚═══════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

// ═══ MODULES (resolved from repo root) ═══
const reconPoliticians = require(path.join(ROOT, 'scripts', 'recon-politicians'));
const reconLuma = require(path.join(ROOT, 'scripts', 'recon-luma'));
const reconFederal = require(path.join(ROOT, 'scripts', 'recon-federal'));
const reconNews = require(path.join(ROOT, 'scripts', 'recon-news'));

const { JUICINESS_BOOSTS, ANGLE_TEMPLATES } = require(path.join(ROOT, 'config', 'recon-targets'));
const { fingerprint, quickSentiment } = require(path.join(ROOT, 'lib', 'recon-utils'));

// ═══ CONFIG ═══
const INTEL_FILE = path.join(ROOT, '.gillito-recon-intel.json');
const MAX_INTEL_AGE_HOURS = 72;
const MAX_INTEL_ITEMS = 250;
const JUICINESS_FLOOR = 4;


// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

function loadDB() {
  try {
    if (fs.existsSync(INTEL_FILE)) {
      const db = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
      console.log(`📂 Intel DB loaded — ${db.intel?.length || 0} items, ${db.crossRefs?.length || 0} cross-refs`);
      return db;
    }
  } catch (e) {
    console.log(`⚠️ DB load failed (${e.message}), starting fresh`);
  }
  return { version: '1.0', lastRun: null, runCount: 0, intel: [], crossRefs: [], stats: { totalScans: 0, totalFindings: 0, totalCrossRefs: 0, byCategory: {}, byEntity: {}, topSignals: {} } };
}

function saveDB(db) {
  db.lastRun = new Date().toISOString();
  db.runCount = (db.runCount || 0) + 1;
  fs.writeFileSync(INTEL_FILE, JSON.stringify(db, null, 2));
  console.log(`💾 Intel DB saved — ${db.intel.length} items, ${db.crossRefs.length} cross-refs`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// JUICINESS SCORER
// ═══════════════════════════════════════════════════════════════════════════════

function scoreJuiciness(item) {
  let score = 5;
  const text = `${item.headline} ${item.summary}`;

  for (const boost of JUICINESS_BOOSTS) {
    if (boost.pattern.test(text)) {
      score += boost.boost;
      if (!item.tags) item.tags = [];
      item.tags.push(boost.tag);
    }
  }

  const sentiment = quickSentiment(text);
  if (sentiment === 'negative') score += 1;
  if (item.entities?.length > 1) score += 1;
  if (item.signals?.length > 2) score += 1;

  return Math.min(10, Math.max(1, score));
}


// ═══════════════════════════════════════════════════════════════════════════════
// ANGLE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function generateAngles(item) {
  const angles = [];
  const tags = item.tags || [];
  const entity = item.entities?.[0] || 'alguien';

  const tagPriority = ['corruption', 'scandal', 'broken-promise', 'blackout', 'luma',
    'immigration', 'trump-pr', 'status', 'emergency', 'protest'];

  let matched = false;
  for (const tag of tagPriority) {
    if (tags.includes(tag) && ANGLE_TEMPLATES[tag]) {
      const templates = ANGLE_TEMPLATES[tag];
      const template = templates[Math.floor(Math.random() * templates.length)];
      angles.push(template.replace(/\{entity\}/g, entity));
      matched = true;
      break;
    }
  }

  if (!matched) {
    const defaults = ANGLE_TEMPLATES.default;
    angles.push(defaults[Math.floor(Math.random() * defaults.length)]);
  }

  angles.push(`🕵️ Intel sobre ${entity} — Gillito reporta desde el underground digital`);
  return angles;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-REFERENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function crossReference(newIntel, existingIntel) {
  const refs = [];
  if (!existingIntel.length || !newIntel.length) return refs;

  for (const newItem of newIntel) {
    if (!newItem.entities?.length) continue;
    for (const old of existingIntel) {
      if (!old.entities?.length) continue;

      const shared = newItem.entities.filter(e =>
        old.entities.some(oe => oe.toLowerCase() === e.toLowerCase())
      );
      if (shared.length === 0) continue;
      if (newItem.fingerprint === old.fingerprint) continue;

      const contradictions = [
        { newSig: /promise/, oldSig: /failure/, type: 'broken_promise' },
        { newSig: /scandal/, oldSig: /promise/, type: 'exposed_hypocrisy' },
        { newSig: /money/, oldSig: /failure/, type: 'waste' },
      ];

      for (const c of contradictions) {
        const newSigs = (newItem.signals || []).join(' ');
        const oldSigs = (old.signals || []).join(' ');
        if (c.newSig.test(newSigs) && c.oldSig.test(oldSigs)) {
          refs.push({
            type: c.type,
            entities: shared,
            newItem: { headline: newItem.headline, date: newItem.timestamp, category: newItem.category },
            oldItem: { headline: old.headline, date: old.timestamp, category: old.category },
            juiciness: 9,
            angle: `CONTRADICCIÓN: ${shared[0]} — "${newItem.headline}" vs "${old.headline}"`,
          });
        }
      }

      const sameCategory = newItem.subcategory === old.subcategory;
      const daysBetween = Math.abs(new Date(newItem.timestamp) - new Date(old.timestamp)) / (1000 * 60 * 60 * 24);
      if (sameCategory && daysBetween >= 2 && daysBetween <= 30) {
        refs.push({
          type: 'recurring_issue',
          entities: shared,
          newItem: { headline: newItem.headline, date: newItem.timestamp },
          oldItem: { headline: old.headline, date: old.timestamp },
          juiciness: 7,
          angle: `PATRÓN DETECTADO: ${shared[0]} sigue con el mismo problema — ${newItem.subcategory}`,
        });
      }
    }
  }

  const seen = new Set();
  return refs.filter(r => {
    const key = `${r.type}:${r.entities.join(',')}:${r.newItem.headline?.slice(0, 30)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// DATA MAINTENANCE
// ═══════════════════════════════════════════════════════════════════════════════

function deduplicateIntel(intel) {
  const seen = new Set();
  return intel.filter(item => {
    const fp = item.fingerprint || fingerprint(item.headline);
    if (seen.has(fp)) return false;
    seen.add(fp);
    return true;
  });
}

function purgeOldIntel(intel) {
  const cutoff = Date.now() - (MAX_INTEL_AGE_HOURS * 60 * 60 * 1000);
  const before = intel.length;
  const fresh = intel.filter(i => new Date(i.timestamp).getTime() > cutoff);
  if (before > fresh.length) console.log(`   🗑️ Purged ${before - fresh.length} stale items`);
  return fresh;
}

function trimIntel(intel) {
  if (intel.length <= MAX_INTEL_ITEMS) return intel;
  intel.sort((a, b) => {
    if (b.juiciness !== a.juiciness) return b.juiciness - a.juiciness;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  console.log(`   ✂️ Trimmed from ${intel.length} to ${MAX_INTEL_ITEMS}`);
  return intel.slice(0, MAX_INTEL_ITEMS);
}

function updateStats(db, newFindings) {
  db.stats.totalScans++;
  db.stats.totalFindings += newFindings.length;
  db.stats.totalCrossRefs = db.crossRefs.length;
  db.stats.byCategory = {};
  for (const item of db.intel) {
    const cat = item.category || 'unknown';
    db.stats.byCategory[cat] = (db.stats.byCategory[cat] || 0) + 1;
  }
  db.stats.byEntity = {};
  for (const item of db.intel) {
    for (const entity of (item.entities || [])) {
      db.stats.byEntity[entity] = (db.stats.byEntity[entity] || 0) + 1;
    }
  }
  db.stats.topSignals = {};
  for (const item of db.intel) {
    for (const sig of (item.signals || [])) {
      db.stats.topSignals[sig] = (db.stats.topSignals[sig] || 0) + 1;
    }
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🕵️  GILLITO HACKER SYSTEM — OSINT RECON ENGINE v1.0       ║');
  console.log('║  ─────────────────────────────────────────────────────────  ║');
  console.log('║  "El Ojo Que Todo Ve" — Scanning Puerto Rico\'s digital     ║');
  console.log('║   landscape for intel worth dropping...                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`🕐 ${new Date().toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico' })} (PR Time)`);
  console.log('');

  const db = loadDB();
  const allNew = [];

  const modules = [
    { name: '🏛️ POLITICIANS', fn: reconPoliticians.scan },
    { name: '🔌 LUMA/ENERGY', fn: reconLuma.scan },
    { name: '🇺🇸 FEDERAL',    fn: reconFederal.scan },
    { name: '📰 PR NEWS',     fn: reconNews.scan },
  ];

  for (const mod of modules) {
    console.log(`\n═══ ${mod.name} ${'═'.repeat(Math.max(0, 50 - mod.name.length))}`);
    try {
      const findings = await mod.fn();
      if (findings?.length > 0) {
        console.log(`   ✅ ${findings.length} findings captured`);
        allNew.push(...findings);
      } else {
        console.log('   ℹ️  No new findings');
      }
    } catch (err) {
      console.error(`   💀 MODULE CRASH: ${err.message}`);
      console.error(`      ${err.stack?.split('\n')[1]?.trim() || ''}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 RAW FINDINGS: ${allNew.length} total`);

  if (allNew.length === 0) {
    console.log('ℹ️  No new intel this scan. Saving DB and exiting.');
    saveDB(db);
    return;
  }

  // Score juiciness
  console.log('\n── Scoring Juiciness ──');
  for (const item of allNew) {
    item.juiciness = scoreJuiciness(item);
    item.gillito_angles = generateAngles(item);
    item.sentiment = quickSentiment(`${item.headline} ${item.summary}`);
    item.used = false;
    item.usedCount = 0;
  }

  const worthy = allNew.filter(i => i.juiciness >= JUICINESS_FLOOR);
  console.log(`   🎯 ${worthy.length}/${allNew.length} meet juiciness floor (≥${JUICINESS_FLOOR})`);

  // Cross-reference
  console.log('\n── Cross-Referencing ──');
  const newCrossRefs = crossReference(worthy, db.intel);
  if (newCrossRefs.length > 0) {
    console.log(`   🔗 ${newCrossRefs.length} cross-references detected!`);
    for (const ref of newCrossRefs) {
      console.log(`      🎯 [${ref.type}] ${ref.angle?.slice(0, 80)}`);
    }
    for (const ref of newCrossRefs) {
      worthy.push({
        category: 'cross-reference',
        subcategory: ref.type,
        signals: [ref.type],
        headline: ref.angle,
        summary: `${ref.newItem.headline} ↔ ${ref.oldItem.headline}`,
        source: 'recon-crossref-engine',
        sourceUrl: '',
        entities: ref.entities,
        timestamp: new Date().toISOString(),
        fingerprint: fingerprint(ref.angle),
        juiciness: ref.juiciness,
        tags: ['cross-reference', ref.type],
        gillito_angles: [ref.angle],
        sentiment: 'negative',
        used: false,
        usedCount: 0,
      });
    }
    db.crossRefs = [...newCrossRefs, ...(db.crossRefs || [])].slice(0, 100);
  } else {
    console.log('   ℹ️  No cross-references this scan');
  }

  // Merge, dedupe, purge, trim
  console.log('\n── Database Maintenance ──');
  db.intel = [...worthy, ...db.intel];
  db.intel = deduplicateIntel(db.intel);
  db.intel = purgeOldIntel(db.intel);
  db.intel = trimIntel(db.intel);

  updateStats(db, worthy);
  saveDB(db);

  // Report
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    📋 RECON REPORT                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  ⏱️  Scan time:        ${elapsed}s`);
  console.log(`║  🆕 New findings:      ${worthy.length}`);
  console.log(`║  🔗 Cross-references:  ${newCrossRefs.length}`);
  console.log(`║  📦 Total in DB:       ${db.intel.length}`);
  console.log(`║  📊 Total scans ever:  ${db.stats.totalScans}`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  📊 BY CATEGORY:');
  for (const [cat, count] of Object.entries(db.stats.byCategory || {}).sort((a, b) => b[1] - a[1])) {
    console.log(`║     ${cat}: ${count}`);
  }

  const topEntities = Object.entries(db.stats.byEntity || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topEntities.length > 0) {
    console.log('║  🎯 TOP ENTITIES:');
    for (const [entity, count] of topEntities) {
      console.log(`║     ${entity}: ${count} mentions`);
    }
  }

  const topJuicy = db.intel.filter(i => !i.used).sort((a, b) => b.juiciness - a.juiciness).slice(0, 5);
  if (topJuicy.length > 0) {
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  🔥 TOP 5 JUICIEST UNUSED INTEL:');
    for (let i = 0; i < topJuicy.length; i++) {
      const item = topJuicy[i];
      console.log(`║  ${i + 1}. [${item.juiciness}/10] ${item.headline?.slice(0, 55)}...`);
      console.log(`║     └─ ${item.gillito_angles?.[0]?.slice(0, 55) || 'No angle'}...`);
    }
  }

  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n✅ Recon complete. Intel ready for Gillito\'s posting workflows.');
}

main().catch(err => {
  console.error('\n💀 RECON ENGINE FATAL ERROR:', err);
  process.exit(1);
});
