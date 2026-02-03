/**
 * 🎯 INTEL PICKER v2.0 — scripts/lib/intel-picker.js
 * ═══════════════════════════════════════════════════════
 * Selects juicy intel for post/reply workflows.
 * NOW supports Deep Recon Levels 1-4:
 *   - deep_news (L1): full article scrapes
 *   - government_records (L2): FEMA, USAspending, Contralor
 *   - social_listening (L3): politician tweets, page changes
 *   - financial_trails (L4): SEC EDGAR, donations, corporate
 *
 * Used by core.js via loadReconIntel() + buildReconContext()
 */

const fs   = require('fs');
const path = require('path');

// Intel file is at repo root — go up two levels from scripts/lib/
const INTEL_FILE = path.join(__dirname, '..', '..', '.gillito-recon-intel.json');

function loadIntel() {
  try {
    if (!fs.existsSync(INTEL_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
    return data.intel || [];
  } catch { return []; }
}

function loadIntelMeta() {
  try {
    if (!fs.existsSync(INTEL_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
    return {
      version:   data.version || '1.0',
      lastUpdate: data.lastUpdate,
      totalFindings: data.totalFindings || 0,
      intelCount: data.intelCount || 0,
      levels: data.levels || {},
    };
  } catch { return null; }
}

function hasIntel() {
  return loadIntel().some(i => !i.used);
}

/**
 * Pick top intel items filtered by various criteria.
 * @param {Object} opts
 * @param {number} opts.count - How many items (default: 3)
 * @param {number} opts.minJuiciness - Min juiciness score (default: 5)
 * @param {string} opts.category - Filter by category
 * @param {string} opts.depth - Filter by depth (rss, full_article, api_record, social_feed, page_monitor, scrape)
 * @param {string} opts.level - Filter by level: 'base', 'L1', 'L2', 'L3', 'L4'
 * @param {boolean} opts.includeUsed - Include already-used items (default: false)
 */
function pickIntel(opts = {}) {
  const { count = 3, minJuiciness = 5, category, depth, level, includeUsed = false } = opts;
  let intel = loadIntel();
  
  if (!includeUsed) intel = intel.filter(i => !i.used);
  if (minJuiciness) intel = intel.filter(i => (i.juiciness || 0) >= minJuiciness);
  if (category) intel = intel.filter(i => i.category === category);
  if (depth) intel = intel.filter(i => i.depth === depth);

  if (level) {
    const levelMap = {
      'base': ['politicians', 'energy', 'federal', 'general'],
      'L1':   ['deep_news'],
      'L2':   ['government_records'],
      'L3':   ['social_listening'],
      'L4':   ['financial_trails'],
    };
    const cats = levelMap[level];
    if (cats) intel = intel.filter(i => cats.includes(i.category));
  }

  intel.sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0));
  return intel.slice(0, count);
}

/**
 * Pick a diverse mix: 1 from base, 1 from deep levels, 1 highest juice.
 */
function pickDiverseIntel(count = 3) {
  const unused = loadIntel().filter(i => !i.used);
  if (unused.length === 0) return [];

  const result = [];
  const used = new Set();

  // 1. Highest juiciness overall
  const top = unused.sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0))[0];
  if (top) { result.push(top); used.add(top.fingerprint); }

  // 2. Best from deep levels (L1-L4)
  const deepCategories = ['deep_news', 'government_records', 'social_listening', 'financial_trails'];
  const deep = unused
    .filter(i => deepCategories.includes(i.category) && !used.has(i.fingerprint))
    .sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0))[0];
  if (deep) { result.push(deep); used.add(deep.fingerprint); }

  // 3. Fill remaining
  const remaining = unused
    .filter(i => !used.has(i.fingerprint))
    .sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0));
  for (const item of remaining) {
    if (result.length >= count) break;
    result.push(item);
  }

  return result;
}

function markUsed(items) {
  try {
    if (!fs.existsSync(INTEL_FILE)) return;
    const data = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
    const fps = new Set(items.map(i => i.fingerprint).filter(Boolean));
    for (const item of (data.intel || [])) {
      if (fps.has(item.fingerprint)) { item.used = true; item.usedAt = new Date().toISOString(); }
    }
    fs.writeFileSync(INTEL_FILE, JSON.stringify(data, null, 2));
  } catch (err) { console.warn(`⚠️ markUsed failed: ${err.message}`); }
}

/**
 * Build LLM prompt context from intel items.
 * Enhanced for deep recon — includes money, depth, and source details.
 */
function getReconPrompt(items) {
  if (!items || items.length === 0) return '';

  const LEVEL_LABELS = {
    'rss':          '📡 RSS',
    'full_article': '📰 ARTÍCULO COMPLETO',
    'api_record':   '🏛️ RECORD GUBERNAMENTAL',
    'social_feed':  '🐦 TWEET POLÍTICO',
    'page_monitor': '🚨 CAMBIO EN PÁGINA GOB',
    'scrape':       '🔍 SCRAPE PÚBLICO',
  };

  const parts = ['═══ 🕵️ INTEL CLASIFICADO (Deep Recon v2) ═══'];

  for (const item of items) {
    const depthLabel = LEVEL_LABELS[item.depth] || '📋 INTEL';
    parts.push(`\n${depthLabel} — Juiciness: ${item.juiciness}/10`);
    parts.push(`📰 ${item.headline}`);
    if (item.summary) parts.push(`   ${item.summary.slice(0, 300)}`);
    if (item.entities?.length) parts.push(`   🎯 Entidades: ${item.entities.join(', ')}`);
    if (item.signals?.length) parts.push(`   ⚡ Señales: ${item.signals.join(', ')}`);
    if (item.moneyMentioned?.length) parts.push(`   💰 Dinero: ${item.moneyMentioned.join(', ')}`);
    parts.push(`   📋 Fuente: ${item.source} | ${item.sourceUrl || ''}`);
  }

  parts.push('\n[Usa esta intel para crear contenido IMPACTANTE y ACTUAL]');
  parts.push('[Si hay datos de dinero (💰), menciónalo — eso PRENDE a la gente]');
  parts.push('[Si hay cambios de página (🚨), eso es EXCLUSIVA — nadie más lo sabe]');
  return parts.join('\n');
}

/**
 * Quick summary of intel status for logging.
 */
function intelSummary() {
  const all = loadIntel();
  const unused = all.filter(i => !i.used);
  const meta = loadIntelMeta();
  
  const byCategory = {};
  for (const item of unused) {
    const cat = item.category || 'unknown';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  return {
    total: all.length,
    unused: unused.length,
    topJuiciness: unused.length ? Math.max(...unused.map(i => i.juiciness || 0)) : 0,
    byCategory,
    levels: meta?.levels || {},
    lastUpdate: meta?.lastUpdate || 'never',
  };
}

module.exports = { 
  loadIntel, loadIntelMeta, hasIntel, 
  pickIntel, pickDiverseIntel, markUsed, 
  getReconPrompt, intelSummary 
};
