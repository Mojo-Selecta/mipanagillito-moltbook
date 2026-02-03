#!/usr/bin/env node
/**
 * 🕵️ GILLITO RECON — Master Orchestrator
 * ═══════════════════════════════════════════
 * PATH: scripts/recon.js
 * 
 * ALL requires use __dirname (not process.cwd())
 * so it works no matter where Node runs from.
 */

const fs   = require('fs');
const path = require('path');

// __dirname = scripts/ — so sibling requires just work
const reconPoliticians = require(path.join(__dirname, 'recon-politicians'));
const reconLuma        = require(path.join(__dirname, 'recon-luma'));
const reconFederal     = require(path.join(__dirname, 'recon-federal'));
const reconNews        = require(path.join(__dirname, 'recon-news'));

// config is at repo root: ../config/
const { JUICINESS_BOOSTS } = require(path.join(__dirname, '..', 'config', 'recon-targets'));

// Intel file at repo root
const INTEL_FILE = path.join(__dirname, '..', '.gillito-recon-intel.json');
const MAX_INTEL  = 50;

/* ─── Scoring ─── */

function scoreJuiciness(finding) {
  let score = 5;
  for (const s of (finding.signals || [])) {
    score += (JUICINESS_BOOSTS[s] || 0);
  }
  score += Math.min((finding.entities?.length || 0) * 0.5, 2);
  if (finding.timestamp) {
    const ageHours = (Date.now() - new Date(finding.timestamp).getTime()) / 3600000;
    if (ageHours < 6) score += 2;
    else if (ageHours < 12) score += 1;
  }
  if (finding.category === 'energy')     score += 1;
  if (finding.category === 'federal')    score += 0.5;
  if (finding.subcategory === 'scandal') score += 2;
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
  console.log('  🕵️ GILLITO RECON SYSTEM — Scanning...');
  console.log('═'.repeat(56) + '\n');

  const startTime = Date.now();

  const results = await Promise.allSettled([
    reconPoliticians.scan(),
    reconLuma.scan(),
    reconFederal.scan(),
    reconNews.scan(),
  ]);

  const allFindings = [];
  const moduleNames = ['Politicians', 'LUMA/Energy', 'Federal', 'News'];

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

  // Preserve used markers
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
    lastUpdate: new Date().toISOString(),
    totalFindings: allFindings.length,
    uniqueFindings: unique.length,
    intelCount: intel.length,
    scanDuration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    intel
  };

  fs.writeFileSync(INTEL_FILE, JSON.stringify(output, null, 2));

  console.log('\n' + '─'.repeat(50));
  console.log(`   🕵️ RECON COMPLETE`);
  console.log(`   📁 Intel: ${intel.length} items saved`);
  console.log(`   🔥 Top juiciness: ${intel[0]?.juiciness || 0}/10`);
  console.log(`   ⏱️  Duration: ${output.scanDuration}`);
  if (intel.length > 0) {
    console.log(`   📰 Top story: "${intel[0].headline?.slice(0, 60)}..."`);
  }
  console.log('─'.repeat(50) + '\n');
}

main().catch(err => {
  console.error(`❌ Recon failed: ${err.message}`);
  process.exit(1);
});
