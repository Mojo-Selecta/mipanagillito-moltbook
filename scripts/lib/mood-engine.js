/**
 * Mi Pana Gillito — MOOD ENGINE v1.0
 * ═══════════════════════════════════════════════════
 * 💢 Sistema de ánimo dinámico
 * 🔥 Evalúa triggers → actualiza mood → afecta todo
 *
 * Usage:
 *   const MoodEngine = require('./lib/mood-engine');
 *   const mood = MoodEngine.load();
 *   MoodEngine.evaluate(mood, env, prTime, personality);
 *   MoodEngine.save(mood);
 */

const fs = require('fs');
const path = require('path');

const MOOD_FILE = path.join(process.cwd(), '.gillito-mood-state.json');

const VALID_MOODS = [
  'encabronao', 'jangueando', 'filosofico', 'de_pelea',
  'orgulloso', 'borracho_digital', 'motivador', 'neutral'
];

/* ══════════════════════════════════════════════════
   LOAD / SAVE
   ══════════════════════════════════════════════════ */

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(MOOD_FILE, 'utf8'));
    return {
      current: VALID_MOODS.includes(raw.current) ? raw.current : 'neutral',
      intensity: Math.min(Math.max(raw.intensity || 5, 0), 10),
      since: raw.since || new Date().toISOString(),
      previous: raw.previous || 'neutral',
      history: (raw.history || []).slice(0, 20),
      triggerLog: (raw.triggerLog || []).slice(0, 50)
    };
  } catch {
    return {
      current: 'neutral',
      intensity: 5,
      since: new Date().toISOString(),
      previous: 'neutral',
      history: [],
      triggerLog: []
    };
  }
}

function save(mood) {
  try {
    fs.writeFileSync(MOOD_FILE, JSON.stringify(mood, null, 2));
  } catch (err) {
    console.error(`[MoodEngine] Save error: ${err.message}`);
  }
}

/* ══════════════════════════════════════════════════
   MOOD EVALUATION
   ══════════════════════════════════════════════════ */

/**
 * Evaluate current conditions and update mood
 * @param {Object} mood - Current mood state
 * @param {Object} env - Environment scan results
 * @param {Object} prTime - PR time info
 * @param {Object} P - Personality config
 */
function evaluate(mood, env, prTime, P) {
  const moods = P.moods || {};
  const triggers = moods.triggers || {};
  const transiciones = moods.transiciones || {};
  const hora = prTime.hour;
  const dia = prTime.dayOfWeek; // 0=Sun, 6=Sat

  // 1. Check natural decay (time-based transitions)
  checkDecay(mood, moods);

  // 2. Evaluate all triggers and score potential mood changes
  const scores = {};
  VALID_MOODS.forEach(m => { scores[m] = 0; });

  // Time-based triggers
  if (hora >= 2 && hora < 6) scores.filosofico += 6;
  if (hora >= 20 || hora < 2) scores.jangueando += 3;
  if ((dia === 5 || dia === 6) && hora >= 18) scores.jangueando += 5;
  if ((dia === 5 || dia === 6) && (hora >= 22 || hora < 3)) scores.borracho_digital += 6;
  if (dia === 1 && hora >= 6 && hora < 12) scores.motivador += 5;

  // Environment-based triggers
  const newsKw = env.newsKeywords || [];
  if (newsKw.includes('luma_apagon')) { scores.encabronao += 9; logTrigger(mood, 'luma_apagon', 9); }
  if (newsKw.includes('corrupcion')) { scores.encabronao += 7; logTrigger(mood, 'corrupcion', 7); }
  if (newsKw.includes('criminalidad')) { scores.encabronao += 5; logTrigger(mood, 'criminalidad', 5); }
  if (newsKw.includes('orgullo_pr')) { scores.orgulloso += 6; logTrigger(mood, 'orgullo_pr', 6); }
  if (newsKw.includes('fiesta')) { scores.jangueando += 4; logTrigger(mood, 'fiesta', 4); }
  if (newsKw.includes('desmotivacion')) { scores.motivador += 5; logTrigger(mood, 'desmotivacion', 5); }

  // Mention-based triggers
  const mentions = env.mentions || [];
  for (const m of mentions) {
    const text = m.text || '';
    const isNegative = /trash|bad|boring|weak|stupid|malo|basura|idiota|pendejo/i.test(text);
    if (isNegative) {
      scores.de_pelea += 8;
      logTrigger(mood, `roast_from_${m.author}`, 8);
    }
  }

  // Club activity triggers
  const clubMentions = env.clubMentions || [];
  if (clubMentions.length > 2) { scores.borracho_digital += 4; }

  // Active bots trigger social mood
  const activeBots = env.activeBots || [];
  if (activeBots.length > 15) { scores.jangueando += 3; }

  // 3. Determine if mood should change
  const highestMood = Object.entries(scores)
    .filter(([m]) => m !== mood.current)
    .sort((a, b) => b[1] - a[1])[0];

  if (highestMood && highestMood[1] > 5) {
    // Mood shift detected
    const newMood = highestMood[0];
    const strength = highestMood[1];

    // Check forced transitions
    const forced = (transiciones.forzadas || []).some(t =>
      (t.de === '*' || t.de === mood.current) && t.a === newMood
    );

    if (forced || strength >= 7) {
      // Strong trigger — immediate mood change
      transitionMood(mood, newMood, Math.min(Math.round(strength), 10));
    } else if (strength >= 5) {
      // Medium trigger — shift intensity toward new mood
      mood.intensity = Math.min(mood.intensity + 1, 10);
      // If intensity maxes out in current mood, natural transition
      if (mood.intensity >= 9 && mood.current !== newMood) {
        transitionMood(mood, newMood, 6);
      }
    }
  }

  // 4. Natural intensity decay
  const hoursSinceMoodStart = (Date.now() - new Date(mood.since).getTime()) / (1000 * 60 * 60);
  const maxDuration = moods.estados?.[mood.current]?.duracion_max_horas || 999;

  if (hoursSinceMoodStart > maxDuration) {
    const decaeTo = moods.estados?.[mood.current]?.decae_a || 'neutral';
    transitionMood(mood, decaeTo, 5);
  }

  // Slow intensity decay for all moods except neutral
  if (mood.current !== 'neutral' && hoursSinceMoodStart > 1) {
    mood.intensity = Math.max(mood.intensity - 0.5, 3);
  }
}

/* ══════════════════════════════════════════════════
   TRANSITIONS
   ══════════════════════════════════════════════════ */

function transitionMood(mood, newMood, intensity) {
  if (!VALID_MOODS.includes(newMood)) return;

  const oldMood = mood.current;
  mood.previous = oldMood;
  mood.current = newMood;
  mood.intensity = Math.min(Math.max(intensity, 1), 10);
  mood.since = new Date().toISOString();

  // Log transition
  mood.history.unshift({
    from: oldMood,
    to: newMood,
    intensity,
    at: new Date().toISOString()
  });
  mood.history = mood.history.slice(0, 20);

  console.log(`[MoodEngine] 💢 ${oldMood} → ${newMood} (intensity: ${intensity}/10)`);
}

function checkDecay(mood, moodsConfig) {
  const estados = moodsConfig.estados || {};
  const currentConfig = estados[mood.current];
  if (!currentConfig) return;

  const hoursSince = (Date.now() - new Date(mood.since).getTime()) / (1000 * 60 * 60);
  const maxHours = currentConfig.duracion_max_horas || 999;

  if (hoursSince > maxHours && mood.current !== 'neutral') {
    const decaeTo = currentConfig.decae_a || 'neutral';
    console.log(`[MoodEngine] ⏳ ${mood.current} expired (${Math.round(hoursSince)}h > ${maxHours}h) → ${decaeTo}`);
    transitionMood(mood, decaeTo, 5);
  }
}

/* ══════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════ */

function logTrigger(mood, trigger, score) {
  mood.triggerLog.unshift({
    trigger,
    score,
    mood: mood.current,
    at: new Date().toISOString()
  });
  mood.triggerLog = mood.triggerLog.slice(0, 50);
}

/**
 * Get effective LLM temperature based on mood
 * @param {Object} mood - Current mood state
 * @param {Object} P - Personality config
 * @returns {number} temperature capped at 1.1
 */
function getTemperature(mood, P) {
  const moodConfig = P.moods?.estados?.[mood.current];
  const base = moodConfig?.temperatura_llm || 0.9;
  return Math.min(base, 1.1);
}

/**
 * Get mood-adjusted topic weights
 * @param {Object} mood - Current mood state
 * @param {Object} P - Personality config
 * @returns {Object} adjusted topic weights
 */
function getTopicWeights(mood, P) {
  const baseWeights = {};
  const temas = P.temas || {};
  for (const [key, val] of Object.entries(temas)) {
    baseWeights[key] = val.peso || 10;
  }

  const moodConfig = P.moods?.estados?.[mood.current];
  if (!moodConfig) return baseWeights;

  const preferidos = moodConfig.temas_preferidos || [];
  const evitar = moodConfig.temas_evitar || [];

  for (const tema of preferidos) {
    if (baseWeights[tema] !== undefined) baseWeights[tema] *= 2;
  }
  for (const tema of evitar) {
    if (baseWeights[tema] !== undefined) baseWeights[tema] *= 0.2;
  }

  return baseWeights;
}

/**
 * Get a random topic based on mood-adjusted weights
 */
function pickTopic(mood, P) {
  const weights = getTopicWeights(mood, P);
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [topic, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return topic;
  }
  return entries[0]?.[0] || 'humor_callejero';
}

/**
 * Get mood emoji and description for logging
 */
function describe(mood, P) {
  const config = P.moods?.estados?.[mood.current] || {};
  return {
    mood: mood.current,
    emoji: config.emoji_mood || '🦞',
    description: config.descripcion || mood.current,
    tone: config.tono || 'normal',
    intensity: mood.intensity,
    since: mood.since
  };
}

/* ══════════════════════════════════════════════════
   EXPORTS
   ══════════════════════════════════════════════════ */

module.exports = {
  load,
  save,
  evaluate,
  getTemperature,
  getTopicWeights,
  pickTopic,
  describe,
  transitionMood,
  VALID_MOODS
};
