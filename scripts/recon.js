#!/usr/bin/env node
/**
 * 🕵️ GILLITO DEEP RECON — Master Orchestrator v2.0
 * ═══════════════════════════════════════════════════════
 * 8 modules across 4 intelligence levels:
 * 
 * BASE:  Politicians | LUMA | Federal | News (RSS feeds)
 * LVL 1: Deep News Mining (full article scraping, FOMB, CPI)
 * LVL 2: Government Records (FEMA API, USAspending, Contralor)
 * LVL 3: Social Listening (politician tweets, page changes)
 * LVL 4: Financial Trails (SEC EDGAR, donations, corporate registry)
 *
 * FIX v2.0.1: All paths use __dirname + 'recon/' subdirectory
 */

const fs   = require('fs');
const path = require('path');

// ─── BASE modules (scripts/recon/*.js) ───
const reconPoliticians = require(path.join(__dirname, 'recon', 'politicians'));
const reconLuma        = require(path.join(__dirname, 'recon', 'luma'));
const reconFederal     = require(path.join(__dirname, 'recon', 'federal'));
const reconNews        = require(path.join(__dirname, 'recon', 'news'));

// ─── DEEP modules (Levels 1-4) ───
const reconDeepNews    = require(path.join(__dirname, 'recon', 'deep-news'));
const reconGovRecords  = require(path.join(__dirname, 'recon', 'gov-records'));
const reconSocial      = require(path.join(__dirname, 'recon', 'social'));
const reconFinancial   = require(path.join(__dirname, 'recon', 'financial'));

// ─── Config ───
const { JUICINESS_BOOSTS } = require(path.join(__dirname, '..', 'config', 'recon-targets'));

const INTEL_FILE = path.join(process.cwd(), '.gillito-recon-intel.json');
const MAX_INTEL  = 75; // Increased from 50 — more sources now

/* ─── Scoring ─── */

function scoreJuiciness(finding) {
  let score = 5;

  // Signal boosts
  for (const s of (finding.signals || [])) {
    score += (JUICINESS_BOOSTS[s] || 0);
  }

  // Entity count boost
  score += Math.min((finding.entities?.length || 0) * 0.5, 2);

  // Recency boost
  if (finding.timestamp) {
    const ageHours = (Date.now() - new Date(finding.timestamp).getTime()) / 3600000;
    if (ageHours < 6)  score += 2;
    else if (ageHours < 12) score += 1;
  }

  // Category boosts
  if (finding.category === 'energy')     score += 1;
  if (finding.category === 'federal')    score += 0.5;
  if (finding.subcategory === 'scandal') score += 2;

  // DEEP RECON boosts — deeper intel is juicier
  if (finding.depth === 'full_article')  score += 1;   // L1: more context
  if (finding.depth === 'api_record')    score += 1.5; // L2: government data
  if (finding.depth === 'page_monitor')  score += 2;   // L3: changes = news
  if (finding.depth === 'social_feed')   score += 0.5; // L3: politician words

  // Money mentioned = always interesting
  if (finding.moneyMentioned?.length > 0) score += 1;

  // SEC insider trades = maximum juice
  if (finding.subcategory === 'sec_insider') score += 2;
  if (finding.subcategory === 'sec_material_event') score += 1.5;
  if (finding.subcategory === 'page_change') score += 2;

  return Math.min(Math.round(score * 10) / 10, 10);
}

/* ─── Dedup ─── */

function deduplicateFindings(findings) {
  const seen = new Map();
  const unique = [];

  for (const f of findings) {
    const fp = f.fingerprint;
    if (!fp) { unique.push(f); continue; }
    if (seen.has(fp)) {
      const existing = seen.get(fp);
      if ((f.summary?.length || 0) > (existing.summary?.length || 0)) {
        const idx = unique.indexOf(existing);
        if (idx >= 0) unique[idx] = f;
        seen.set(fp, f);
      }
    } else {
      seen.set(fp, f);
      unique.push(f);
    }
  }
  return unique;
}

/* ─── Main ─── */

async function main() {
  console.log('\n' + '═'.repeat(56));
  console.log('  🕵️ GILLITO DEEP RECON v2.0.1 — All Levels Active');
  console.log('═'.repeat(56) + '\n');

  const startTime = Date.now();

  // Run ALL modules — base + deep
  const results = await Promise.allSettled([
    // BASE (original)
    reconPoliticians.scan(),
    reconLuma.scan(),
    reconFederal.scan(),
    reconNews.scan(),
    // DEEP LEVELS
    reconDeepNews.scan(),    // L1
    reconGovRecords.scan(),  // L2
    reconSocial.scan(),      // L3
    reconFinancial.scan(),   // L4
  ]);

  const allFindings = [];
  const moduleNames = [
    'BASE: Politicians', 'BASE: LUMA/Energy', 'BASE: Federal', 'BASE: News',
    'L1: Deep News',     'L2: Gov Records',   'L3: Social',    'L4: Financial',
  ];

  console.log('\n   📊 MODULE RESULTS:');
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      const findings = results[i].value || [];
      console.log(`   ✅ ${moduleNames[i]}: ${findings.length} findings`);
      allFindings.push(...findings);
    } else {
      console.log(`   ❌ ${moduleNames[i]}: ${results[i].reason?.message || 'FAILED'}`);
    }
  }

  console.log(`\n   📊 Raw findings: ${allFindings.length}`);

  const unique = deduplicateFindings(allFindings);
  console.log(`   🔄 After dedup: ${unique.length}`);

  for (const f of unique) { f.juiciness = scoreJuiciness(f); }
  unique.sort((a, b) => b.juiciness - a.juiciness);
  const intel = unique.slice(0, MAX_INTEL);

  // Preserve used markers from previous runs
  let existing = [];
  try {
    if (fs.existsSync(INTEL_FILE)) {
      existing = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8')).intel || [];
    }
  } catch { /* fresh */ }

  const usedFPs = new Set(existing.filter(e => e.used).map(e => e.fingerprint));
  for (const item of intel) {
    if (usedFPs.has(item.fingerprint)) item.used = true;
  }

  const output = {
    version: '2.0.1',
    lastUpdate: new Date().toISOString(),
    totalFindings: allFindings.length,
    uniqueFindings: unique.length,
    intelCount: intel.length,
    scanDuration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    levels: {
      base: results.slice(0, 4).filter(r => r.status === 'fulfilled').reduce((sum, r) => sum + (r.value?.length || 0), 0),
      L1_deep_news: results[4]?.status === 'fulfilled' ? results[4].value?.length || 0 : 0,
      L2_gov_records: results[5]?.status === 'fulfilled' ? results[5].value?.length || 0 : 0,
      L3_social: results[6]?.status === 'fulfilled' ? results[6].value?.length || 0 : 0,
      L4_financial: results[7]?.status === 'fulfilled' ? results[7].value?.length || 0 : 0,
    },
    intel
  };

  fs.writeFileSync(INTEL_FILE, JSON.stringify(output, null, 2));

  // Summary
  console.log('\n' + '─'.repeat(56));
  console.log('   🕵️ DEEP RECON COMPLETE');
  console.log(`   📁 Intel: ${intel.length} items saved`);
  console.log(`   🔥 Top juiciness: ${intel[0]?.juiciness || 0}/10`);
  console.log(`   ⏱️  Duration: ${output.scanDuration}`);
  console.log('   📊 By level:');
  console.log(`      BASE: ${output.levels.base} | L1: ${output.levels.L1_deep_news} | L2: ${output.levels.L2_gov_records} | L3: ${output.levels.L3_social} | L4: ${output.levels.L4_financial}`);
  if (intel.length > 0) {
    console.log(`   📰 Top story: "${intel[0].headline?.slice(0, 60)}..."`);
    console.log(`      Depth: ${intel[0].depth || 'rss'} | Category: ${intel[0].category}`);
  }
  console.log('─'.repeat(56) + '\n');
}

main().catch(err => {
  console.error(`❌ Deep Recon failed: ${err.message}`);
  process.exit(1);
});
