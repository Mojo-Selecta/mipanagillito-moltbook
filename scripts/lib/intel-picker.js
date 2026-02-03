// ═══════════════════════════════════════════════════════════════════════════════
// 🎰 INTEL PICKER — Selects the best unused intel for posting
// ═══════════════════════════════════════════════════════════════════════════════
// Called by post-to-x.js and post-to-moltbook.js to inject recon intel
// into Gillito's LLM prompt so he can craft hacker-style posts.
//
// Usage:
//   const { pickIntel, markUsed, getReconPrompt } = require('../lib/intel-picker');
//   const intel = pickIntel({ mode: 'recon_drop', count: 1 });
//   const prompt = getReconPrompt(intel);  // ready to inject into LLM call
// ═══════════════════════════════════════════════════════════════════════════════

const fs = require('fs');

const INTEL_FILE = '.gillito-recon-intel.json';

/**
 * Load the intel database
 */
function loadIntelDB() {
  try {
    if (fs.existsSync(INTEL_FILE)) {
      return JSON.parse(fs.readFileSync(INTEL_FILE, 'utf8'));
    }
  } catch (e) {
    console.log(`⚠️ intel-picker: Could not load ${INTEL_FILE}`);
  }
  return null;
}

/**
 * Save the intel database (for marking items as used)
 */
function saveIntelDB(db) {
  fs.writeFileSync(INTEL_FILE, JSON.stringify(db, null, 2));
}

/**
 * Pick the best unused intel items
 * @param {object} opts
 * @param {string} opts.mode - 'recon_drop' | 'any'
 * @param {number} opts.count - how many items to pick (default 1)
 * @param {string} opts.preferCategory - prefer a specific category
 * @param {number} opts.minJuiciness - minimum juiciness score (default 5)
 * @returns {Array} selected intel items
 */
function pickIntel(opts = {}) {
  const db = loadIntelDB();
  if (!db || !db.intel?.length) return [];

  const count = opts.count || 1;
  const minJuiciness = opts.minJuiciness || 5;
  const preferCategory = opts.preferCategory || null;

  // Filter to unused or lightly used, meeting juiciness threshold
  let candidates = db.intel.filter(i =>
    (i.usedCount || 0) < 2 &&
    i.juiciness >= minJuiciness
  );

  if (candidates.length === 0) {
    // Fallback: allow items used once
    candidates = db.intel.filter(i =>
      (i.usedCount || 0) < 3 &&
      i.juiciness >= minJuiciness - 1
    );
  }

  if (candidates.length === 0) return [];

  // Sort by juiciness (desc) with some randomness to avoid always picking the same
  candidates.sort((a, b) => {
    const aScore = a.juiciness + (Math.random() * 2 - 1); // ±1 random jitter
    const bScore = b.juiciness + (Math.random() * 2 - 1);
    return bScore - aScore;
  });

  // Prefer requested category if specified
  if (preferCategory) {
    const catItems = candidates.filter(i => i.category === preferCategory);
    if (catItems.length >= count) {
      return catItems.slice(0, count);
    }
  }

  // Diversify: try to pick from different categories
  const selected = [];
  const usedCategories = new Set();

  for (const item of candidates) {
    if (selected.length >= count) break;

    // If we have enough candidates, prefer category diversity
    if (candidates.length > count * 2 && usedCategories.has(item.category)) {
      continue;
    }

    selected.push(item);
    usedCategories.add(item.category);
  }

  // Fill remaining if diversity skipped too many
  if (selected.length < count) {
    for (const item of candidates) {
      if (selected.length >= count) break;
      if (!selected.includes(item)) {
        selected.push(item);
      }
    }
  }

  return selected;
}

/**
 * Mark intel items as used after posting
 * @param {Array} items - the items that were used
 */
function markUsed(items) {
  const db = loadIntelDB();
  if (!db) return;

  for (const usedItem of items) {
    const match = db.intel.find(i => i.fingerprint === usedItem.fingerprint);
    if (match) {
      match.used = true;
      match.usedCount = (match.usedCount || 0) + 1;
      match.lastUsed = new Date().toISOString();
    }
  }

  saveIntelDB(db);
}

/**
 * Generate a prompt injection for Gillito's LLM call
 * Gives the AI the intel + instructions to present it in hacker style
 * @param {Array} intelItems
 * @returns {string} prompt text to inject
 */
function getReconPrompt(intelItems) {
  if (!intelItems?.length) return '';

  let prompt = `\n\n🕵️ MODO HACKER ACTIVADO — INTEL CLASIFICADO DISPONIBLE:\n`;
  prompt += `Tienes ${intelItems.length} pieza(s) de intel fresco de tu sistema de reconocimiento.\n`;
  prompt += `Preséntalo como si hackiaste los servidores y encontraste esta info.\n`;
  prompt += `Usa tu estilo callejero boricua pero con tema de hacker/infiltración.\n\n`;

  for (let i = 0; i < intelItems.length; i++) {
    const item = intelItems[i];
    prompt += `═══ INTEL #${i + 1} ═══\n`;
    prompt += `📋 Titular: ${item.headline}\n`;
    prompt += `📝 Resumen: ${item.summary}\n`;
    prompt += `🎯 Entidades: ${(item.entities || []).join(', ')}\n`;
    prompt += `📊 Categoría: ${item.category} / ${item.subcategory}\n`;
    prompt += `🔥 Juiciness: ${item.juiciness}/10\n`;
    prompt += `💡 Ángulo sugerido: ${item.gillito_angles?.[0] || 'freestyle'}\n`;
    prompt += `📰 Fuente: ${item.source}\n\n`;
  }

  prompt += `INSTRUCCIONES:\n`;
  prompt += `- Presenta esta info como si la hackeaste/interceptaste\n`;
  prompt += `- Usa lenguaje de hacker: "acceso no autorizado", "intercepté", "filtré", "los servers revelan"\n`;
  prompt += `- Mantén tu voz boricua callejera — esto es Gillito, no CNN\n`;
  prompt += `- Puedes combinar múltiples piezas de intel si aplica\n`;
  prompt += `- Hazlo corto, punchy, y que la gente quiera compartirlo\n`;
  prompt += `- Si hay contradicción o hipocresia, EXPLÓTALA\n`;
  prompt += `- Emojis de hacker: 🕵️ 🚨 📡 💻 🔓 ⚡ 📋 🎯\n`;

  return prompt;
}

/**
 * Check if recon intel is available
 * @returns {boolean}
 */
function hasIntel() {
  const db = loadIntelDB();
  if (!db || !db.intel?.length) return false;
  return db.intel.some(i => (i.usedCount || 0) < 2 && i.juiciness >= 5);
}

/**
 * Get intel stats for health checks / logging
 */
function getIntelStats() {
  const db = loadIntelDB();
  if (!db) return { available: false };

  const unused = db.intel.filter(i => !i.used).length;
  const total = db.intel.length;
  const avgJuiciness = total > 0
    ? (db.intel.reduce((sum, i) => sum + (i.juiciness || 0), 0) / total).toFixed(1)
    : 0;

  return {
    available: true,
    total,
    unused,
    avgJuiciness,
    lastRun: db.lastRun,
    runCount: db.runCount,
    categories: db.stats?.byCategory || {},
  };
}

module.exports = {
  pickIntel,
  markUsed,
  getReconPrompt,
  hasIntel,
  getIntelStats,
};
