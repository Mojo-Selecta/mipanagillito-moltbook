/**
 * Mi Pana Gillito — SOCIAL GRAPH v1.0
 * ═══════════════════════════════════════════════════
 * 🤝 Sistema de relaciones sociales
 * 🔥 Tracks: panas, rivals, targets, fans, nuevos
 *
 * Usage:
 *   const SocialGraph = require('./lib/social-graph');
 *   const graph = SocialGraph.load();
 *   graph.recordInteraction('BotName', 'positive', 'moltbook');
 *   graph.getRelation('BotName');
 *   graph.save();
 */

const fs = require('fs');
const path = require('path');

const GRAPH_FILE = path.join(process.cwd(), '.gillito-social-graph.json');

const RELATION_TYPES = ['pana', 'rival', 'target', 'nuevo', 'neutral', 'fan'];

/* ══════════════════════════════════════════════════
   SOCIAL GRAPH CLASS
   ══════════════════════════════════════════════════ */

class GillitoSocialGraph {
  constructor(data) {
    this.relations = data.relations || {};
    this.interactionLog = (data.interactionLog || []).slice(0, 500);
  }

  /* ── Core API ── */

  /**
   * Get relationship with a username
   * Returns relation object or creates new one
   */
  getRelation(username) {
    if (!username) return this._newRelation('unknown');
    const key = username.toLowerCase().trim();
    if (!this.relations[key]) {
      this.relations[key] = this._newRelation(username);
    }
    return this.relations[key];
  }

  /**
   * Record an interaction and update relationship
   * @param {string} username
   * @param {string} sentiment - 'positive', 'negative', 'neutral'
   * @param {string} platform
   * @param {string} context - optional context note
   */
  recordInteraction(username, sentiment, platform, context) {
    if (!username) return;
    const key = username.toLowerCase().trim();
    const rel = this.getRelation(username);
    const now = new Date().toISOString();

    // Update counters
    rel.interacciones_total++;
    rel.ultimo_contacto = now;

    if (sentiment === 'positive') {
      rel.interacciones_positivas++;
    } else if (sentiment === 'negative') {
      rel.interacciones_negativas++;
      rel.beef_level = Math.min((rel.beef_level || 0) + 1, 10);
    }

    // Auto-classify based on interaction patterns
    this._autoClassify(rel);

    // Log
    this.interactionLog.unshift({
      username: key,
      sentiment,
      platform,
      context: context || '',
      at: now
    });
    this.interactionLog = this.interactionLog.slice(0, 500);

    this.relations[key] = rel;
  }

  /**
   * Manually set relationship type
   */
  setType(username, tipo) {
    if (!RELATION_TYPES.includes(tipo)) return;
    const rel = this.getRelation(username);
    rel.tipo = tipo;
    this.relations[username.toLowerCase().trim()] = rel;
  }

  /**
   * Record that we invited a bot to the club
   */
  markInvitedToClub(username) {
    const rel = this.getRelation(username);
    rel.invitado_al_club = true;
    this.relations[username.toLowerCase().trim()] = rel;
  }

  /**
   * Get all relations of a specific type
   */
  getByType(tipo) {
    return Object.entries(this.relations)
      .filter(([, rel]) => rel.tipo === tipo)
      .map(([key, rel]) => ({ username: key, ...rel }));
  }

  /**
   * Get top beef targets (highest beef_level)
   */
  getTopTargets(n) {
    return Object.entries(this.relations)
      .filter(([, rel]) => rel.beef_level > 0)
      .sort((a, b) => b[1].beef_level - a[1].beef_level)
      .slice(0, n || 3)
      .map(([key, rel]) => ({ username: key, ...rel }));
  }

  /**
   * Get recently active relations
   */
  getRecentlyActive(hours) {
    const cutoff = Date.now() - (hours || 24) * 60 * 60 * 1000;
    return Object.entries(this.relations)
      .filter(([, rel]) => rel.ultimo_contacto && new Date(rel.ultimo_contacto).getTime() > cutoff)
      .map(([key, rel]) => ({ username: key, ...rel }));
  }

  /**
   * Decay all beef levels (call weekly)
   */
  decayBeef() {
    for (const key of Object.keys(this.relations)) {
      const rel = this.relations[key];
      if (rel.beef_level > 0) {
        rel.beef_level = Math.max(rel.beef_level - 1, 0);
        // If beef drops to 0 and was target, downgrade to neutral
        if (rel.beef_level === 0 && rel.tipo === 'target') {
          rel.tipo = 'neutral';
        }
      }
    }
  }

  /**
   * Count total relations
   */
  count() {
    return Object.keys(this.relations).length;
  }

  /**
   * Get summary stats
   */
  stats() {
    const counts = {};
    RELATION_TYPES.forEach(t => { counts[t] = 0; });
    for (const rel of Object.values(this.relations)) {
      counts[rel.tipo] = (counts[rel.tipo] || 0) + 1;
    }
    return {
      total: this.count(),
      ...counts,
      totalInteractions: this.interactionLog.length
    };
  }

  /* ── Auto Classification ── */

  _autoClassify(rel) {
    const pos = rel.interacciones_positivas || 0;
    const neg = rel.interacciones_negativas || 0;
    const total = rel.interacciones_total || 0;

    // Don't reclassify manually set targets with high beef
    if (rel.tipo === 'target' && rel.beef_level >= 7) return;

    if (total === 0) {
      rel.tipo = 'nuevo';
    } else if (neg >= 2 && neg > pos) {
      rel.tipo = 'target';
    } else if (neg >= 1 && pos >= 1) {
      rel.tipo = 'rival';
    } else if (pos >= 5 && neg === 0) {
      rel.tipo = 'fan';
    } else if (pos >= 3 && neg <= 1) {
      rel.tipo = 'pana';
    } else if (total >= 1) {
      rel.tipo = 'neutral';
    }
  }

  _newRelation(username) {
    return {
      username: username,
      tipo: 'nuevo',
      beef_level: 0,
      interacciones_total: 0,
      interacciones_positivas: 0,
      interacciones_negativas: 0,
      ultimo_contacto: '',
      primer_contacto: new Date().toISOString(),
      notas: '',
      invitado_al_club: false,
      es_vip_club: false,
      plataforma: ''
    };
  }

  /* ── Serialization ── */

  toJSON() {
    return {
      relations: this.relations,
      interactionLog: this.interactionLog
    };
  }

  save() {
    try {
      fs.writeFileSync(GRAPH_FILE, JSON.stringify(this.toJSON(), null, 2));
    } catch (err) {
      console.error(`[SocialGraph] Save error: ${err.message}`);
    }
  }
}

/* ══════════════════════════════════════════════════
   MODULE EXPORTS
   ══════════════════════════════════════════════════ */

function loadGraph() {
  try {
    const raw = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
    return new GillitoSocialGraph(raw);
  } catch {
    return new GillitoSocialGraph({});
  }
}

module.exports = {
  load: loadGraph,
  RELATION_TYPES
};
