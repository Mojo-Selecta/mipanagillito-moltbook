/**
 * 🦞 GILLITO DB v1.0 — scripts/lib/db.js
 * ═══════════════════════════════════════════════════════
 * KV database client for Cloudflare Worker API.
 * Replaces local JSON file read/write with persistent cloud storage.
 *
 * Usage:
 *   var db = require('./lib/db');
 *   var state = await db.get('heartbeat-state');
 *   await db.set('heartbeat-state', state);
 *   var keys = await db.list();
 *
 * Env vars required:
 *   GILLITO_DB_URL  — Worker URL (https://gillito-db.vip-joeojeda.workers.dev)
 *   GILLITO_DB_KEY  — API key for auth
 *
 * Falls back to local JSON files if env vars missing or API fails.
 */

var fs   = require('fs');
var path = require('path');

var DB_URL = process.env.GILLITO_DB_URL || 'https://gillito-db.vip-joeojeda.workers.dev';
var DB_KEY = process.env.GILLITO_DB_KEY || '';

var _online = null; // cached health status

/**
 * Check if cloud DB is available
 */
async function isOnline() {
  if (_online !== null) return _online;
  if (!DB_KEY) { _online = false; return false; }

  try {
    var res = await fetch(DB_URL + '/health', {
      headers: { 'Authorization': 'Bearer ' + DB_KEY },
      signal: AbortSignal.timeout(5000)
    });
    var data = await res.json();
    _online = data.status === 'ok';
  } catch (e) {
    _online = false;
  }
  return _online;
}

/**
 * GET a value by key from cloud DB
 * @param {string} key
 * @param {*} fallback — returned if key not found
 * @returns {*} parsed JSON value or fallback
 */
async function get(key, fallback) {
  if (typeof fallback === 'undefined') fallback = null;

  // Try cloud first
  if (await isOnline()) {
    try {
      var res = await fetch(DB_URL + '/get/' + encodeURIComponent(key), {
        headers: { 'Authorization': 'Bearer ' + DB_KEY },
        signal: AbortSignal.timeout(10000)
      });
      var data = await res.json();
      if (data.found) return data.value;
      return fallback;
    } catch (e) {
      console.warn('[db] Cloud GET failed for ' + key + ': ' + e.message);
    }
  }

  // Fallback: local file
  return getLocal(key, fallback);
}

/**
 * SET a value by key to cloud DB
 * @param {string} key
 * @param {*} value — will be JSON.stringified
 * @returns {boolean} success
 */
async function set(key, value) {
  var saved = false;

  // Try cloud
  if (await isOnline()) {
    try {
      var res = await fetch(DB_URL + '/set/' + encodeURIComponent(key), {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + DB_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(value),
        signal: AbortSignal.timeout(10000)
      });
      var data = await res.json();
      saved = data.saved === true;
    } catch (e) {
      console.warn('[db] Cloud SET failed for ' + key + ': ' + e.message);
    }
  }

  // Always save local backup too
  setLocal(key, value);
  return saved;
}

/**
 * DELETE a key from cloud DB
 * @param {string} key
 * @returns {boolean} success
 */
async function del(key) {
  if (await isOnline()) {
    try {
      var res = await fetch(DB_URL + '/del/' + encodeURIComponent(key), {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + DB_KEY },
        signal: AbortSignal.timeout(10000)
      });
      var data = await res.json();
      return data.deleted === true;
    } catch (e) {
      console.warn('[db] Cloud DELETE failed for ' + key + ': ' + e.message);
    }
  }
  return false;
}

/**
 * LIST all keys from cloud DB
 * @returns {string[]} array of key names
 */
async function list() {
  if (await isOnline()) {
    try {
      var res = await fetch(DB_URL + '/keys', {
        headers: { 'Authorization': 'Bearer ' + DB_KEY },
        signal: AbortSignal.timeout(10000)
      });
      var data = await res.json();
      return data.keys || [];
    } catch (e) {
      console.warn('[db] Cloud LIST failed: ' + e.message);
    }
  }
  return [];
}

/**
 * SYNC a local JSON file to cloud DB
 * Reads local file, uploads to cloud under given key.
 * @param {string} key — cloud key name
 * @param {string} localFile — local filename (relative to cwd)
 * @returns {boolean} success
 */
async function syncToCloud(key, localFile) {
  var filePath = path.join(process.cwd(), localFile);
  try {
    if (!fs.existsSync(filePath)) return false;
    var data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return await set(key, data);
  } catch (e) {
    console.warn('[db] syncToCloud failed for ' + key + ': ' + e.message);
    return false;
  }
}

/**
 * SYNC from cloud DB to local JSON file
 * Downloads from cloud, writes to local file.
 * @param {string} key — cloud key name
 * @param {string} localFile — local filename (relative to cwd)
 * @returns {boolean} success
 */
async function syncFromCloud(key, localFile) {
  var filePath = path.join(process.cwd(), localFile);
  try {
    var data = await get(key);
    if (data === null) return false;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.warn('[db] syncFromCloud failed for ' + key + ': ' + e.message);
    return false;
  }
}

// ═══════════════════════════════════════════
// LOCAL FILE FALLBACK
// ═══════════════════════════════════════════

var KEY_TO_FILE = {
  'heartbeat-state':   '.gillito-heartbeat-state.json',
  'heartbeat-history': '.gillito-heartbeat-history.json',
  'tweet-history':     '.gillito-tweet-history.json',
  'recon-intel':       '.gillito-recon-intel.json',
  'research':          '.gillito-research.json',
  'youtube-learnings': '.gillito-youtube-learnings.json'
};

function getLocalPath(key) {
  var filename = KEY_TO_FILE[key] || ('.gillito-' + key + '.json');
  return path.join(process.cwd(), filename);
}

function getLocal(key, fallback) {
  try {
    var filePath = getLocalPath(key);
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function setLocal(key, value) {
  try {
    var filePath = getLocalPath(key);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// ═══════════════════════════════════════════
// STATUS / DEBUG
// ═══════════════════════════════════════════

async function status() {
  var online = await isOnline();
  var keys = online ? await list() : [];
  return {
    online: online,
    url: DB_URL,
    hasKey: DB_KEY.length > 0,
    keys: keys
  };
}

module.exports = {
  get: get,
  set: set,
  del: del,
  list: list,
  isOnline: isOnline,
  status: status,
  syncToCloud: syncToCloud,
  syncFromCloud: syncFromCloud,
  getLocal: getLocal,
  setLocal: setLocal
};
