// ═══════════════════════════════════════════════════════════════════════════════
// 🎰 INTEL PICKER — Selects best unused intel for posting workflows
// ═══════════════════════════════════════════════════════════════════════════════
// Usage in post-to-x.js / post-to-moltbook.js:
//
//   const path = require('path');
//   const { pickIntel, markUsed, getReconPrompt, hasIntel } = require(path.join(process.cwd(), 'lib', 'intel-picker'));
//
//   // In mode selection (~15% chance):
//   if (hasIntel() && Math.random() < 0.15) mode = 'recon_drop';
//
//   // In prompt builder:
//   const intel = pickIntel({ count: 1, minJuiciness: 6 });
//   const reconSection = getReconPrompt(intel);
//   // append reconSection to your LLM prompt
//
//   // After successful post:
//   markUsed(intel);
// ═══════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const INTEL_FILE = path.join(process.cwd(), '.gillito-recon-intel.json');

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

function saveIntelDB(db) {
  fs.writeFileSync(INTEL_FILE, JSON.stringify(db, null, 2));
}

function pickIntel(opts = {}) {
  const db = loadIntelDB();
  if (!db || !db.intel?.length) return [];

  const count = opts.count || 1;
  const minJuiciness = opts.minJuiciness || 5;

  let candidates = db.intel.filter(i =>
    (i.usedCount || 0) < 2 && i.juiciness >= minJuiciness
  );

  if (candidates.length === 0) {
    candidates = db.intel.filter(i =>
      (i.usedCount || 0) < 3 && i.juiciness >= minJuiciness - 1
    );
  }

  if (candidates.length === 0) return [];

  candidates.sort((a, b) => {
    const aScore = a.juiciness + (Math.random() * 2 - 1);
    const bScore = b.juiciness + (Math.random() * 2 - 1);
    return bScore - aScore;
  });

  const selected = [];
  const usedCategories = new Set();

  for (const item of candidates) {
    if (selected.length >= count) break;
    if (candidates.length > count * 2 && usedCategories.has(item.category)) continue;
    selected.push(item);
    usedCategories.add(item.category);
  }

  if (selected.length < count) {
    for (const item of candidates) {
      if (selected.length >= count) break;
      if (!selected.includes(item)) selected.push(item);
    }
  }

  return selected;
}

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
  prompt += `- Si hay contradicción o hipocresía, EXPLÓTALA\n`;
  prompt += `- Emojis de hacker: 🕵️ 🚨 📡 💻 🔓 ⚡ 📋 🎯\n`;

  return prompt;
}

function hasIntel() {
  const db = loadIntelDB();
  if (!db || !db.intel?.length) return false;
  return db.intel.some(i => (i.usedCount || 0) < 2 && i.juiciness >= 5);
}

function getIntelStats() {
  const db = loadIntelDB();
  if (!db) return { available: false };
  const unused = db.intel.filter(i => !i.used).length;
  const total = db.intel.length;
  const avgJuiciness = total > 0
    ? (db.intel.reduce((sum, i) => sum + (i.juiciness || 0), 0) / total).toFixed(1) : 0;
  return { available: true, total, unused, avgJuiciness, lastRun: db.lastRun, runCount: db.runCount, categories: db.stats?.byCategory || {} };
}

module.exports = { pickIntel, markUsed, getReconPrompt, hasIntel, getIntelStats };
