#!/usr/bin/env node
'use strict';
/**
 * 🛡️ GILLITO OUTPUT GUARD v1.0
 * ═══════════════════════════════════════════════════════
 * Prevents token soup, gibberish, and malformed outputs
 * from ever being posted to Moltbook.
 *
 * Catches:
 *  - Token soup (random words, multi-script gibberish)
 *  - Output too long (hard char limit enforcement)
 *  - Excessive non-Spanish/English characters
 *  - Low coherence (word salad detection)
 *  - Temperature runaway protection
 *
 * Usage:
 *   const guard = require('./lib/output-guard');
 *   const result = guard.validate(text, { maxChars: 200 });
 *   if (!result.valid) { /* reject * / }
 *   const safeText = result.text; // trimmed if needed
 *
 *   const safeTemp = guard.capTemperature(rawTemp);
 */

// ═══════════════════════════════════════════
// GIBBERISH / TOKEN SOUP DETECTION
// ═══════════════════════════════════════════

/**
 * Detect non-Latin script characters (Korean, Georgian, Hindi, Arabic, Chinese, etc.)
 * A small amount is OK (emojis, occasional loanwords), but a high ratio = token soup
 */
function getNonLatinRatio(text) {
  if (!text || text.length === 0) return 0;

  // Remove emojis first (they're fine)
  var noEmoji = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  // Count non-Latin, non-basic-punctuation characters
  // Latin = basic ASCII + Latin Extended (accented chars for Spanish)
  var nonLatin = 0;
  var total = 0;
  for (var i = 0; i < noEmoji.length; i++) {
    var code = noEmoji.charCodeAt(i);
    if (code <= 32) continue; // whitespace
    total++;
    // Basic Latin (32-127), Latin Extended A/B (128-591), Latin Extended Additional (7680-7935)
    var isLatin = (code >= 33 && code <= 591) || (code >= 7680 && code <= 7935);
    if (!isLatin) nonLatin++;
  }

  return total > 0 ? nonLatin / total : 0;
}

/**
 * Count unique "scripts" present in the text.
 * Token soup often mixes 4+ scripts (Latin, Hangul, Cyrillic, Devanagari, etc.)
 */
function countScripts(text) {
  var scripts = new Set();

  // Check for various Unicode script ranges
  if (/[\u0400-\u04FF]/.test(text))     scripts.add('cyrillic');
  if (/[\uAC00-\uD7AF\u3130-\u318F]/.test(text)) scripts.add('hangul');  // Korean
  if (/[\u10A0-\u10FF\u2D00-\u2D2F]/.test(text)) scripts.add('georgian');
  if (/[\u0900-\u097F]/.test(text))     scripts.add('devanagari'); // Hindi
  if (/[\u0600-\u06FF]/.test(text))     scripts.add('arabic');
  if (/[\u4E00-\u9FFF]/.test(text))     scripts.add('cjk');       // Chinese
  if (/[\u3040-\u30FF]/.test(text))     scripts.add('japanese');
  if (/[\u0E00-\u0E7F]/.test(text))     scripts.add('thai');
  if (/[\u0980-\u09FF]/.test(text))     scripts.add('bengali');
  if (/[\u0A80-\u0AFF]/.test(text))     scripts.add('gujarati');

  return scripts.size;
}

/**
 * Check average word length — token soup tends to have very erratic word lengths
 * and many very short or very long "words"
 */
function getWordStats(text) {
  var words = (text || '').split(/\s+/).filter(function(w) { return w.length > 0; });
  if (words.length === 0) return { count: 0, avgLen: 0, maxLen: 0, veryShort: 0, veryLong: 0 };

  var totalLen = 0;
  var maxLen = 0;
  var veryShort = 0; // 1-2 chars
  var veryLong = 0;  // 20+ chars

  for (var i = 0; i < words.length; i++) {
    var len = words[i].length;
    totalLen += len;
    if (len > maxLen) maxLen = len;
    if (len <= 2) veryShort++;
    if (len >= 20) veryLong++;
  }

  return {
    count: words.length,
    avgLen: totalLen / words.length,
    maxLen: maxLen,
    veryShort: veryShort,
    veryLong: veryLong,
    veryShortRatio: veryShort / words.length,
    veryLongRatio: veryLong / words.length,
  };
}

/**
 * Check if text looks like a coherent sentence vs word salad.
 * Coherent text has: common Spanish/English connectors, punctuation patterns,
 * repeated language patterns. Word salad has: random capitalization, no connectors,
 * mixed languages mid-sentence.
 */
function getCoherenceScore(text) {
  if (!text || text.length < 10) return 0;

  var score = 0;
  var lower = text.toLowerCase();

  // Spanish connectors/common words (Gillito speaks Spanish)
  var spanishMarkers = [
    'que', 'de', 'la', 'el', 'en', 'es', 'lo', 'un', 'una', 'no',
    'se', 'con', 'por', 'para', 'como', 'pero', 'más', 'ya', 'mi',
    'te', 'me', 'tu', 'su', 'del', 'al', 'les', 'los', 'las',
    'esto', 'eso', 'ese', 'esta', 'son', 'hay', 'ser', 'está',
    'coño', 'cabrón', 'puñeta', 'carajo', 'mierda', 'diablo',
    'pana', 'bro', 'mano', 'loco', 'jaja', 'joder',
  ];

  // English connectors
  var englishMarkers = [
    'the', 'is', 'at', 'and', 'to', 'in', 'it', 'of', 'for',
    'on', 'are', 'was', 'with', 'that', 'this', 'but', 'not',
    'you', 'from', 'have', 'has',
  ];

  var words = lower.split(/\s+/);
  var markerCount = 0;
  for (var i = 0; i < words.length; i++) {
    var w = words[i].replace(/[^a-záéíóúñü]/g, '');
    if (spanishMarkers.includes(w) || englishMarkers.includes(w)) {
      markerCount++;
    }
  }

  // Coherent text: at least 15-20% of words are common connectors
  var markerRatio = words.length > 0 ? markerCount / words.length : 0;
  score += markerRatio * 50; // up to ~10 points for good marker ratio

  // Has sentence-ending punctuation?
  if (/[.!?¡¿]/.test(text)) score += 10;

  // Reasonable capitalization (not RANDOM caps on every word)
  var capsWords = words.filter(function(w) { return w.length > 2 && w === w.toUpperCase(); });
  var capsRatio = words.length > 0 ? capsWords.length / words.length : 0;
  if (capsRatio < 0.3) score += 10; // Not too many ALL CAPS words
  if (capsRatio > 0.6) score -= 15; // Too many = suspicious

  // Reasonable length words (not all gibberish concatenations)
  var ws = getWordStats(text);
  if (ws.veryLongRatio < 0.1) score += 5;
  if (ws.veryLongRatio > 0.3) score -= 10;

  return score;
}

// ═══════════════════════════════════════════
// MAIN VALIDATION
// ═══════════════════════════════════════════

/**
 * Validate and sanitize LLM output before posting.
 *
 * @param {string} text - The generated text
 * @param {object} opts - Options
 * @param {number} opts.maxChars - Hard character limit (default 280)
 * @param {number} opts.minChars - Minimum characters (default 5)
 * @param {number} opts.maxNonLatinRatio - Max non-Latin character ratio (default 0.15)
 * @param {number} opts.maxScripts - Max different scripts allowed (default 2)
 * @param {number} opts.minCoherence - Minimum coherence score (default 10)
 * @returns {object} { valid: boolean, text: string, reason: string|null, scores: object }
 */
function validate(text, opts) {
  opts = opts || {};
  var maxChars       = opts.maxChars || 280;
  var minChars       = opts.minChars || 5;
  var maxNonLatin    = opts.maxNonLatinRatio || 0.15;
  var maxScripts     = opts.maxScripts || 2;
  var minCoherence   = opts.minCoherence || 10;

  var fullText = (text || '').trim();

  var result = {
    valid: true,
    text: fullText,
    reason: null,
    scores: {},
  };

  // ── BASIC CHECKS ──
  if (!fullText || fullText.length < minChars) {
    result.valid = false;
    result.reason = 'too_short';
    return result;
  }

  // Track overflow for logging (but don't reject on overflow alone)
  var overflowRatio = fullText.length / maxChars;
  result.scores.overflowRatio = overflowRatio;

  // ═══════════════════════════════════════════
  // PHASE 1: GIBBERISH CHECKS ON FULL TEXT
  // These detect broken LLM output regardless of length.
  // Good content that's just too long will pass these.
  // ═══════════════════════════════════════════

  // ── NON-LATIN RATIO CHECK (full text) ──
  // Token soup mixes Korean/Chinese/Cyrillic into Latin text
  var nonLatinRatio = getNonLatinRatio(fullText);
  result.scores.nonLatinRatio = nonLatinRatio;
  if (nonLatinRatio > maxNonLatin) {
    result.valid = false;
    result.reason = 'non_latin_overflow (' + Math.round(nonLatinRatio * 100) + '% non-Latin)';
    return result;
  }

  // ── MULTI-SCRIPT CHECK (full text) ──
  // Coherent text uses 1-2 scripts max (Latin + maybe one other)
  var scriptCount = countScripts(fullText);
  result.scores.scriptCount = scriptCount;
  if (scriptCount > maxScripts) {
    result.valid = false;
    result.reason = 'multi_script_gibberish (' + scriptCount + ' scripts detected)';
    return result;
  }

  // ── CONCATENATED GIBBERISH (full text) ──
  // Token soup creates monster "words" by mashing tokens together
  var fullWs = getWordStats(fullText);
  if (fullWs.veryLong > 5) {
    result.valid = false;
    result.reason = 'concatenated_gibberish (' + fullWs.veryLong + ' very long words)';
    return result;
  }

  // ── NO-SPANISH DETECTOR (full text) ──
  // Gillito speaks Spanish. If the LLM hallucinated in pure English/gibberish,
  // there will be almost no Spanish words. Check the full output.
  var allWords = fullText.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 1; });
  if (allWords.length > 15) {
    var spanishHits = 0;
    var spanishWords = [
      'que', 'de', 'la', 'el', 'en', 'es', 'lo', 'un', 'una', 'no',
      'se', 'con', 'por', 'para', 'como', 'pero', 'más', 'ya', 'mi',
      'te', 'me', 'tu', 'su', 'del', 'al', 'los', 'las', 'esto', 'eso',
      'coño', 'cabrón', 'puñeta', 'carajo', 'mierda', 'diablo', 'joder',
      'pana', 'bro', 'mano', 'loco', 'jaja', 'está', 'son', 'hay',
      'todo', 'nada', 'aquí', 'ahí', 'ese', 'esta', 'cuando', 'donde',
      'porque', 'también', 'siempre', 'nunca', 'bien', 'mal', 'muy',
      'yo', 'tú', 'él', 'ella', 'nos', 'les', 'esos', 'esas',
      'así', 'si', 'ven', 'mira', 'oye', 'vamos', 'dale',
    ];
    for (var si = 0; si < allWords.length; si++) {
      var cleaned = allWords[si].replace(/[^a-záéíóúñü]/g, '');
      if (spanishWords.indexOf(cleaned) !== -1) spanishHits++;
    }
    var spanishRatio = spanishHits / allWords.length;
    result.scores.spanishRatio = spanishRatio;

    if (spanishRatio < 0.05) {
      result.valid = false;
      result.reason = 'no_spanish_detected (' + Math.round(spanishRatio * 100) + '% Spanish in ' + allWords.length + ' words)';
      return result;
    }
  }

  // ── REPETITION CHECK (full text) ──
  if (allWords && allWords.length >= 8) {
    var freq = {};
    for (var ri = 0; ri < allWords.length; ri++) {
      freq[allWords[ri]] = (freq[allWords[ri]] || 0) + 1;
    }
    var maxFreq = Math.max.apply(null, Object.values(freq));
    var maxFreqRatio = maxFreq / allWords.length;
    result.scores.maxRepeatRatio = maxFreqRatio;
    if (maxFreqRatio > 0.3 && maxFreq > 4) {
      result.valid = false;
      result.reason = 'excessive_repetition (' + Math.round(maxFreqRatio * 100) + '% same word)';
      return result;
    }
  }

  // ═══════════════════════════════════════════
  // PHASE 2: SMART TRUNCATION
  // Content passed gibberish checks — it's real Spanish text.
  // Now truncate to maxChars at a clean boundary.
  // ═══════════════════════════════════════════

  if (result.text.length > maxChars) {
    var cut = result.text.substring(0, maxChars);

    // Try to cut at sentence boundary (. ! ? ¿ ¡)
    var lastSentence = Math.max(
      cut.lastIndexOf('. '),
      cut.lastIndexOf('! '),
      cut.lastIndexOf('? '),
      cut.lastIndexOf('.'),
      cut.lastIndexOf('!'),
      cut.lastIndexOf('?')
    );
    if (lastSentence > maxChars * 0.4) {
      result.text = cut.substring(0, lastSentence + 1).trim();
    } else {
      // Cut at last space
      var lastSpace = cut.lastIndexOf(' ');
      if (lastSpace > maxChars * 0.4) {
        result.text = cut.substring(0, lastSpace).trim();
      } else {
        result.text = cut.trim();
      }
    }

    result.scores.truncated = true;
    result.scores.originalLength = fullText.length;
  }

  // ═══════════════════════════════════════════
  // PHASE 3: QUALITY CHECKS ON TRUNCATED TEXT
  // Verify the truncated portion is still coherent
  // ═══════════════════════════════════════════

  var finalText = result.text;
  var finalWs = getWordStats(finalText);
  result.scores.wordStats = finalWs;

  // Coherence check on what we'll actually post
  var coherence = getCoherenceScore(finalText);
  result.scores.coherence = coherence;
  if (coherence < minCoherence && finalWs.count > 10) {
    result.valid = false;
    result.reason = 'low_coherence (score: ' + Math.round(coherence) + ')';
    return result;
  }

  // Final length check
  if (finalText.length < minChars) {
    result.valid = false;
    result.reason = 'too_short_after_truncation';
    return result;
  }

  return result;
}

// ═══════════════════════════════════════════
// TEMPERATURE SAFETY
// ═══════════════════════════════════════════

/**
 * Cap temperature to prevent token soup.
 * Groq models get unstable above ~1.4-1.5.
 *
 * @param {number} temp - Requested temperature
 * @param {number} ceiling - Max allowed (default 1.4)
 * @returns {number} Capped temperature
 */
function capTemperature(temp, ceiling) {
  ceiling = ceiling || 1.4;
  if (typeof temp !== 'number' || isNaN(temp)) return 1.0;
  return Math.min(Math.max(temp, 0.1), ceiling);
}

// ═══════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════

module.exports = {
  validate: validate,
  capTemperature: capTemperature,
  // Expose internals for testing
  _getNonLatinRatio: getNonLatinRatio,
  _countScripts: countScripts,
  _getWordStats: getWordStats,
  _getCoherenceScore: getCoherenceScore,
};
