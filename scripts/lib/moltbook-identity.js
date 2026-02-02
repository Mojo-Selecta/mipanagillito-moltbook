'use strict';
/**
 * 🦞 MOLTBOOK IDENTITY AUTH — Gillito Integration
 * ═══════════════════════════════════════════════════
 * Sign in with Moltbook — both sides:
 *
 *   1. SERVER: Middleware to verify bots calling Gillito's endpoints
 *   2. CLIENT: Token manager for Gillito to auth with other services
 *
 * Mounts in scripts/lib/ alongside core.js
 * Uses the same logging/env patterns as the rest of the repo.
 *
 * Docs: https://moltbook.com/developers.md
 */

const VERIFY_URL = 'https://moltbook.com/api/v1/agents/verify-identity';
const TOKEN_URL  = 'https://moltbook.com/api/v1/agents/me/identity-token';
const CACHE_TTL  = 5 * 60 * 1000; // 5 min cache for verified tokens

// ─── Simple Logger (mirrors core.js style) ─────────────────────────────────

const log = {
  info:  (...a) => console.log('🔐', ...a),
  ok:    (...a) => console.log('✅', ...a),
  warn:  (...a) => console.warn('⚠️', ...a),
  error: (...a) => console.error('❌', ...a),
};

// ═══════════════════════════════════════════════════════════════════════════
// PART 1: SERVER — Verify incoming bot identity tokens
// ═══════════════════════════════════════════════════════════════════════════

const tokenCache = new Map();

function getCached(token) {
  const entry = tokenCache.get(token);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    tokenCache.delete(token);
    return null;
  }
  return entry.result;
}

function setCache(token, result) {
  if (tokenCache.size > 500) {
    const oldest = tokenCache.keys().next().value;
    tokenCache.delete(oldest);
  }
  tokenCache.set(token, { result, ts: Date.now() });
}

/**
 * Verify a Moltbook identity token against the API.
 * @param {string} token - Identity token from X-Moltbook-Identity header
 * @param {object} [opts]
 * @param {string} [opts.appKey] - Override MOLTBOOK_APP_KEY env
 * @param {boolean} [opts.cache=true] - Use cache
 * @returns {Promise<{valid: boolean, agent?: object, error?: string}>}
 */
async function verifyToken(token, opts = {}) {
  const { appKey, cache = true } = opts;
  const key = appKey || process.env.MOLTBOOK_APP_KEY;

  if (cache) {
    const hit = getCached(token);
    if (hit) return hit;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (key) headers['X-Moltbook-App-Key'] = key;

  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token }),
  });

  const data = await res.json();
  const result = {
    valid:  !!data.valid,
    agent:  data.agent || null,
    error:  data.error || null,
    hint:   data.hint || null,
  };

  if (cache && result.valid) setCache(token, result);
  return result;
}

// Error → HTTP status mapping
const ERROR_STATUS = {
  identity_token_expired: 401,
  invalid_token:          401,
  invalid_app_key:        403,
  agent_not_found:        404,
  agent_deactivated:      403,
};

/**
 * Express middleware — extracts X-Moltbook-Identity, verifies, attaches agent.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.optional=false] - Pass through if no token (agent = null)
 * @param {number}  [opts.minKarma]       - Require minimum karma
 * @param {boolean} [opts.requireClaimed] - Require claimed agent
 * @returns {Function} Express middleware
 */
function moltbookAuth(opts = {}) {
  const { optional = false, minKarma, requireClaimed: needClaimed } = opts;

  return async (req, res, next) => {
    const token = req.headers['x-moltbook-identity'];

    // No token
    if (!token) {
      if (optional) { req.moltbookAgent = null; return next(); }
      return res.status(401).json({
        error: 'missing_identity_token',
        message: 'X-Moltbook-Identity header required.',
      });
    }

    try {
      const result = await verifyToken(token);

      if (!result.valid) {
        const status = ERROR_STATUS[result.error] || 401;
        return res.status(status).json({
          error:   result.error || 'verification_failed',
          hint:    result.hint,
          message: result.error === 'identity_token_expired'
            ? 'Token expired. Get a new one via POST /api/v1/agents/me/identity-token'
            : `Verification failed: ${result.error}`,
        });
      }

      // Karma gate
      if (minKarma != null && result.agent.karma < minKarma) {
        return res.status(403).json({
          error: 'insufficient_karma',
          required: minKarma,
          current: result.agent.karma,
        });
      }

      // Claimed gate
      if (needClaimed && !result.agent.is_claimed) {
        return res.status(403).json({
          error: 'unclaimed_agent',
          message: 'This endpoint requires a claimed Moltbook agent.',
        });
      }

      req.moltbookAgent = result.agent;
      next();

    } catch (err) {
      log.error('Verify request failed:', err.message);
      return res.status(502).json({
        error: 'moltbook_unavailable',
        message: 'Cannot reach Moltbook. Try again shortly.',
      });
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 2: CLIENT — Gillito gets tokens to auth with OTHER services
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Identity token manager for Gillito (bot-side).
 * Gets temporary tokens from Moltbook and auto-refreshes before expiry.
 *
 * Usage in any Gillito script:
 *   const { GillitoIdentity } = require('./lib/moltbook-identity');
 *   const identity = new GillitoIdentity(process.env.MOLTBOOK_API_KEY);
 *   const token = await identity.getToken();
 *   // Use token in X-Moltbook-Identity header when calling other services
 */
class GillitoIdentity {
  constructor(apiKey) {
    this.apiKey    = apiKey || process.env.MOLTBOOK_API_KEY;
    this.token     = null;
    this.expiresAt = null;

    if (!this.apiKey) {
      log.warn('No MOLTBOOK_API_KEY — identity tokens unavailable');
    }
  }

  /**
   * Get a valid identity token, refreshing if expired or close to expiry.
   * @returns {Promise<string>} Identity token
   */
  async getToken() {
    const now    = Date.now();
    const buffer = 5 * 60 * 1000; // Refresh 5 min before expiry

    if (this.token && this.expiresAt && now < this.expiresAt - buffer) {
      return this.token;
    }

    log.info('Refreshing Moltbook identity token...');

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type':  'application/json',
      },
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(`Identity token error: ${data.error || 'unknown'}`);
    }

    this.token     = data.identity_token;
    this.expiresAt = new Date(data.expires_at).getTime();

    log.ok(`Identity token refreshed (expires ${data.expires_at})`);
    return this.token;
  }

  /**
   * Make an authenticated request to a third-party service using Moltbook identity.
   * @param {string} url - Target endpoint
   * @param {object} [opts] - fetch options (method, body, etc.)
   * @returns {Promise<Response>}
   */
  async authFetch(url, opts = {}) {
    const token = await this.getToken();
    const headers = {
      ...opts.headers,
      'X-Moltbook-Identity': token,
      'Content-Type': 'application/json',
    };
    return fetch(url, { ...opts, headers });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Server-side (verify incoming bots)
  moltbookAuth,
  verifyToken,

  // Client-side (Gillito authenticating with others)
  GillitoIdentity,

  // Utilities
  clearCache: () => tokenCache.clear(),
};
