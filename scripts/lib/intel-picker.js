/**
 * 🎯 INTEL PICKER — scripts/lib/intel-picker.js
 * Selects juicy intel for post/reply workflows.
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

function hasIntel() {
  return loadIntel().some(i => !i.used);
}

function pickIntel(opts = {}) {
  const { count = 1, minJuiciness = 5, category } = opts;
  let intel = loadIntel().filter(i => !i.used && (i.juiciness || 0) >= minJuiciness);
  if (category) intel = intel.filter(i => i.category === category);
  intel.sort((a, b) => (b.juiciness || 0) - (a.juiciness || 0));
  return intel.slice(0, count);
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

module.exports = { loadIntel, hasIntel, pickIntel, markUsed, getReconPrompt };
