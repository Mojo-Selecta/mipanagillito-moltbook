#!/usr/bin/env node
'use strict';
/**
 * 🦞 GILLITO DB SYNC v1.0 — scripts/db-sync.js
 * ═══════════════════════════════════════════════════════
 * Syncs local JSON files to/from Cloudflare KV.
 *
 * Usage:
 *   node scripts/db-sync.js upload    — push local files to cloud
 *   node scripts/db-sync.js download  — pull cloud data to local files
 *   node scripts/db-sync.js status    — show cloud DB status
 *
 * Runs at start/end of workflows to persist state.
 */

var db = require('./lib/db');

var FILES = {
  'heartbeat-state':   '.gillito-heartbeat-state.json',
  'heartbeat-history': '.gillito-heartbeat-history.json',
  'tweet-history':     '.gillito-tweet-history.json',
  'recon-intel':       '.gillito-recon-intel.json',
  'research':          '.gillito-research.json',
  'youtube-learnings': '.gillito-youtube-learnings.json'
};

var command = process.argv[2] || 'status';

async function upload() {
  console.log('📤 Uploading local data to cloud...');
  var count = 0;
  var keys = Object.keys(FILES);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var file = FILES[key];
    var ok = await db.syncToCloud(key, file);
    if (ok) {
      count++;
      console.log('  ✅ ' + key + ' ← ' + file);
    } else {
      console.log('  ⏭️  ' + key + ' (no local file or failed)');
    }
  }
  console.log('📤 Uploaded ' + count + '/' + keys.length + ' files');
}

async function download() {
  console.log('📥 Downloading cloud data to local...');
  var count = 0;
  var keys = Object.keys(FILES);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var file = FILES[key];
    var ok = await db.syncFromCloud(key, file);
    if (ok) {
      count++;
      console.log('  ✅ ' + key + ' → ' + file);
    } else {
      console.log('  ⏭️  ' + key + ' (not in cloud)');
    }
  }
  console.log('📥 Downloaded ' + count + '/' + keys.length + ' files');
}

async function status() {
  console.log('🔍 Checking cloud DB status...');
  var s = await db.status();
  console.log('  Online: ' + (s.online ? '✅' : '❌'));
  console.log('  URL: ' + s.url);
  console.log('  Auth: ' + (s.hasKey ? '✅' : '❌ missing GILLITO_DB_KEY'));
  if (s.keys.length > 0) {
    console.log('  Keys (' + s.keys.length + '):');
    for (var i = 0; i < s.keys.length; i++) {
      console.log('    • ' + s.keys[i]);
    }
  } else {
    console.log('  Keys: (empty)');
  }
}

async function main() {
  if (command === 'upload') {
    await upload();
  } else if (command === 'download') {
    await download();
  } else if (command === 'status') {
    await status();
  } else {
    console.log('Usage: node scripts/db-sync.js [upload|download|status]');
  }
}

main().catch(function(err) {
  console.error('❌ DB Sync error: ' + err.message);
  process.exit(1);
});
