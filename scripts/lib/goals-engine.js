/**
 * Goals Engine — Sistema de metas autónomas para Gillito
 * Gillito ahora tiene OBJETIVOS, no solo reacciones
 */

const fs = require('fs');
const GOALS_FILE = '.gillito-goals-state.json';

const DEFAULT_GOALS = {
  daily: {
    posts_moltbook: { target: 3, current: 0, label: 'Posts en Moltbook' },
    posts_x: { target: 1, current: 0, label: 'Posts en X' },
    replies: { target: 5, current: 0, label: 'Replies/comentarios' },
    promo_nightclub: { target: 1, current: 0, label: 'Promo del Club' }
  },
  weekly: {
    trolleos: { target: 10, current: 0, label: 'Trolleos exitosos' },
    new_relations: { target: 5, current: 0, label: 'Nuevas relaciones' },
    x_engagement: { target: 3, current: 0, label: 'Engagement en X' }
  },
  outcomes: [], // historial de qué funcionó
  lastReset: new Date().toDateString(),
  lastWeekReset: getWeekKey()
};

function getWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(GOALS_FILE, 'utf8'));
    // Reset daily if new day
    if (raw.lastReset !== new Date().toDateString()) {
      raw.daily = JSON.parse(JSON.stringify(DEFAULT_GOALS.daily));
      raw.lastReset = new Date().toDateString();
    }
    // Reset weekly if new week
    if (raw.lastWeekReset !== getWeekKey()) {
      raw.weekly = JSON.parse(JSON.stringify(DEFAULT_GOALS.weekly));
      raw.lastWeekReset = getWeekKey();
    }
    return raw;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_GOALS));
  }
}

function save(goals) {
  fs.writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2));
}

function recordOutcome(goals, action, platform, success, content) {
  goals.outcomes.unshift({
    ts: new Date().toISOString(),
    action, platform, success,
    preview: (content || '').substring(0, 80)
  });
  goals.outcomes = goals.outcomes.slice(0, 50); // keep last 50
}

function updateProgress(goals, action, platform) {
  if (action.startsWith('post') || action === 'filosofar' || action === 'motivar') {
    if (platform === 'x') goals.daily.posts_x.current++;
    else goals.daily.posts_moltbook.current++;
  }
  if (action === 'promo_nightclub') goals.daily.promo_nightclub.current++;
  if (action.includes('reply') || action === 'comentar_feed') goals.daily.replies.current++;
  if (action === 'trolleo') { goals.weekly.trolleos.current++; }
}

function getMissingGoals(goals) {
  const missing = [];
  for (const [key, g] of Object.entries(goals.daily)) {
    if (g.current < g.target) {
      missing.push({ key, label: g.label, remaining: g.target - g.current, type: 'daily' });
    }
  }
  return missing.sort((a, b) => b.remaining - a.remaining);
}

function getSuccessRate(goals, action) {
  const relevant = goals.outcomes.filter(o => o.action === action).slice(0, 10);
  if (relevant.length === 0) return 0.5;
  return relevant.filter(o => o.success).length / relevant.length;
}

function getSummary(goals) {
  const daily = Object.entries(goals.daily)
    .map(([k, g]) => `${g.label}: ${g.current}/${g.target}`)
    .join(', ');
  return daily;
}

module.exports = { load, save, recordOutcome, updateProgress, getMissingGoals, getSuccessRate, getSummary };
