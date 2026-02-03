#!/usr/bin/env node
/**
 * 🕵️ GILLITO RECON — Master Orchestrator
 * ═══════════════════════════════════════════
 * Runs all recon modules, scores & deduplicates findings,
 * writes .gillito-recon-intel.json for post workflows.
 *
 * PATH STRATEGY: All requires use path.join(process.cwd(), ...)
 * because GitHub Actions runs `node scripts/recon.js` from repo root.
 * Relative paths like '../lib/' break in that context.
 */

const fs   = require('fs');
const path = require('path');
const ROOT = process.cwd();

// ─── Load recon modules (from scripts/) ───
const reconPoliticians = require(path.join(ROOT, 'scripts', 'recon-politicians'));
const reconLuma        = require(path.join(ROOT, 'scripts', 'recon-luma'));
const reconFederal     = require(path.join(ROOT, 'scripts', 'recon-federal'));
const reconNews        = require(path.join(ROOT, 'scripts', 'recon-news'));

// ─── Load juiciness boosts from config ───
const { JUICINESS_BOOSTS } = require(path.join(ROOT, 'config', 'recon-targets'));

const INTEL_FILE = path.join(ROOT, '.gillito-recon-intel.json');
const MAX_INTEL  = 50;

/* ─── Scoring ─── */

function scoreJuiciness(finding) {
  let score = 5; // base

  // Signal boosts
  const signals = finding.signals || [];
  for (const s of signals) {
    score += (JUICINESS_BOOSTS[s] || 0);
  }

  // Entity boosts (more entities = juicier)
  score += Math.min((finding.entities?.length || 0) * 0.5, 2);

  // Recency boost
  if (finding.timestamp) {
    const ageHours = (Date.now() - new Date(finding.timestamp).getTime()) / 3600000;
    if (ageHours < 6)  score += 2;
    else if (ageHours < 12) score += 1;
  }

  // Category boosts
  if (finding.category === 'energy')    score += 1;  // LUMA always hot
  if (finding.category === 'federal')   score += 0.5;
  if (finding.subcategory === 'scandal') score += 2;

  return Math.min(Math.round(score * 10) / 10, 10);
}

/* ─── Deduplication ─── */

function deduplicateFindings(findings) {
  const seen = new Map();
  const unique = [];

  for (const f of findings) {
    const fp = f.fingerprint;
    if (!fp) { unique.push(f); continue; }

    if (seen.has(fp)) {
      // Keep the one with more data
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

  // Run all modules in parallel
  const results = await Promise.allSettled([
    reconPoliticians.scan(),
    reconLuma.scan(),
    reconFederal.scan(),
    reconNews.scan(),
  ]);

  // Collect findings
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

  // Deduplicate
  const unique = deduplicateFindings(allFindings);
  console.log(`   🔄 After dedup: ${unique.length}`);

  // Score juiciness
  for (const f of unique) {
    f.juiciness = scoreJuiciness(f);
  }

  // Sort by juiciness (highest first) and trim
  unique.sort((a, b) => b.juiciness - a.juiciness);
  const intel = unique.slice(0, MAX_INTEL);

  // Load existing intel to preserve "used" markers
  let existing = [];
  try {
    if (fs.existsSync(INTEL_FILE)) {
      const raw = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
      existing = raw.intel || [];
    }
  } catch { /* fresh start */ }

  // Merge: keep used markers from previous run
  const usedFingerprints = new Set(
    existing.filter(e => e.used).map(e => e.fingerprint)
  );
  for (const item of intel) {
    if (usedFingerprints.has(item.fingerprint)) {
      item.used = true;
    }
  }

  // Write intel file
  const output = {
    lastUpdate: new Date().toISOString(),
    totalFindings: allFindings.length,
    uniqueFindings: unique.length,
    intelCount: intel.length,
    scanDuration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    intel
  };

  fs.writeFileSync(INTEL_FILE, JSON.stringify(output, null, 2));

  // Summary
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
