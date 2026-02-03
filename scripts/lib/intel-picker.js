/**
 * 🎯 INTEL PICKER
 * ═══════════════════════════════════════════
 * Selects juicy intel from .gillito-recon-intel.json
 * for use in post/reply workflows.
 *
 * Used by: post-to-x.js, reply-x.js, post-to-moltbook.js
 */

const fs   = require('fs');
const path = require('path');

const INTEL_FILE = path.join(process.cwd(), '.gillito-recon-intel.json');

function loadIntel() {
  try {
    if (!fs.existsSync(INTEL_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
    return data.intel || [];
  } catch {
    return [];
  }
}

function hasIntel() {
  const intel = loadIntel();
  return intel.some(i => !i.used);
}

/**
 * Pick intel items for use in a post.
 * @param {Object} opts
 * @param {number} opts.count - How many items to pick (default 1)
 * @param {number} opts.minJuiciness - Minimum juiciness score (default 5)
 * @param {string} opts.category - Filter by category (optional)
 * @returns {Array} Selected intel items
 */
function pickIntel(opts = {}) {
  const { count = 1, minJuiciness = 5, category } = opts;
  let intel = loadIntel();

  // Filter: unused, above juiciness threshold
  intel = intel.filter(i => !i.used && (i.juiciness || 0) >= minJuiciness);

  // Optional category filter
  if (category) {
    intel = intel.filter(i => i.category === category);
  }

  // Sort by juiciness desc, pick top N
  intel.sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0));
  return intel.slice(0, count);
}

/**
 * Mark intel items as used so they don't get picked again.
 * @param {Array} items - Items to mark (must have fingerprint)
 */
function markUsed(items) {
  try {
    if (!fs.existsSync(INTEL_FILE)) return;
    const data = JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
    const fingerprints = new Set(items.map(i => i.fingerprint).filter(Boolean));

    for (const item of (data.intel || [])) {
      if (fingerprints.has(item.fingerprint)) {
        item.used = true;
        item.usedAt = new Date().toISOString();
      }
    }

    fs.writeFileSync(INTEL_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn(`⚠️ Failed to mark intel as used: ${err.message}`);
  }
}

/**
 * Build a prompt context string from intel items.
 * @param {Array} items - Intel items from pickIntel()
 * @returns {string} Formatted prompt context
 */
function getReconPrompt(items) {
  if (!items || items.length === 0) return '';

  const parts = ['═══ 🕵️ INTEL CLASIFICADO ═══'];
  for (const item of items) {
    parts.push(`📰 ${item.headline}`);
    if (item.summary) parts.push(`   ${item.summary.slice(0, 200)}`);
    if (item.entities?.length) parts.push(`   🎯 Entidades: ${item.entities.join(', ')}`);
    if (item.signals?.length) parts.push(`   ⚡ Señales: ${item.signals.join(', ')}`);
    parts.push(`   📊 Juiciness: ${item.juiciness}/10 | Fuente: ${item.source}`);
  }
  parts.push('[Usa esta intel para crear contenido IMPACTANTE]');
  return parts.join('\n');
}

module.exports = {
  loadIntel,
  hasIntel,
  pickIntel,
  markUsed,
  getReconPrompt,
};
