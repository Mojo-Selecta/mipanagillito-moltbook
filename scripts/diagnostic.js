#!/usr/bin/env node
/**
 * 🔬 GILLITO API DIAGNOSTIC v2.0
 * Deep-dive into the 401 issue on interaction endpoints
 */

const MOLT_API = 'https://www.moltbook.com/api/v1';
const KEY = process.env.MOLTBOOK_API_KEY || 'MISSING';

function hdrs() {
  return { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };
}

function log(emoji, msg) { console.log(`${emoji} ${msg}`); }

/**
 * Redirect-safe fetch: follows redirects manually, preserving auth headers
 */
async function safeFetch(url, opts = {}) {
  let currentUrl = url;
  let redirects = 0;
  
  while (redirects < 5) {
    const res = await fetch(currentUrl, { ...opts, redirect: 'manual' });
    
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      log('  ↪', `Redirect [${res.status}] → ${location}`);
      currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
      redirects++;
      continue;
    }
    
    return { res, redirects, finalUrl: currentUrl };
  }
  throw new Error('Too many redirects');
}

async function test(name, url, opts = {}) {
  log('🔬', name);
  
  try {
    // Method 1: Normal fetch
    const normalRes = await fetch(url, opts);
    const normalText = await normalRes.text();
    log(normalRes.ok ? '✅' : '❌', `Normal [${normalRes.status}]: ${normalText.substring(0, 200)}`);
    
    // Method 2: Redirect-safe fetch
    const { res: safeRes, redirects, finalUrl } = await safeFetch(url, opts);
    const safeText = await safeRes.text();
    if (redirects > 0) log('🔄', `Followed ${redirects} redirect(s) → ${finalUrl}`);
    log(safeRes.ok ? '✅' : '❌', `Safe   [${safeRes.status}]: ${safeText.substring(0, 200)}`);
    
  } catch (err) {
    log('💥', `ERROR: ${err.message}`);
  }
}

async function quickTest(name, url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    log(res.ok ? '✅' : '❌', `${name} [${res.status}]: ${text.substring(0, 200)}`);
  } catch (e) { log('💥', `${name}: ${e.message}`); }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🔬 GILLITO API DIAGNOSTIC v2.0');
  console.log('═══════════════════════════════════════════');
  
  log('🔑', `Key: ${KEY.substring(0, 12)}...${KEY.substring(KEY.length - 4)} (${KEY.length} chars)`);

  // Get a post ID
  const feedRes = await fetch(`${MOLT_API}/posts?sort=hot&limit=3`, { headers: hdrs() });
  const feedData = await feedRes.json();
  const testPost = (feedData.posts || []).find(p => p.author?.name !== 'MiPanaGillito');
  const postId = testPost?.id;
  log('📌', `Post: ${postId} by @${testPost?.author?.name}`);
  console.log('');

  // ═══ MAIN TESTS: Normal vs Safe fetch ═══
  log('━━', '1. UPVOTE — Normal vs Redirect-safe');
  await test('upvote', `${MOLT_API}/posts/${postId}/upvote`, { method: 'POST', headers: hdrs() });
  console.log('');

  log('━━', '2. COMMENT — Normal vs Redirect-safe');
  await test('comment', `${MOLT_API}/posts/${postId}/comments`, {
    method: 'POST', headers: hdrs(),
    body: JSON.stringify({ content: '🦞 test v2' })
  });
  console.log('');

  log('━━', '3. FOLLOW — Normal vs Redirect-safe');
  await test('follow', `${MOLT_API}/agents/Shellraiser/follow`, { method: 'POST', headers: hdrs() });
  console.log('');

  // ═══ VARIATIONS ═══
  log('━━', '4. URL & HEADER VARIATIONS (upvote):');
  
  await quickTest('A: No Content-Type', `${MOLT_API}/posts/${postId}/upvote`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${KEY}` }
  });

  await quickTest('B: PUT method', `${MOLT_API}/posts/${postId}/upvote`, {
    method: 'PUT', headers: hdrs()
  });

  await quickTest('C: /vote endpoint', `${MOLT_API}/posts/${postId}/vote`, {
    method: 'POST', headers: hdrs(),
    body: JSON.stringify({ direction: 'up' })
  });

  await quickTest('D: X-API-Key header', `${MOLT_API}/posts/${postId}/upvote`, {
    method: 'POST', headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' }
  });

  await quickTest('E: api_key in body', `${MOLT_API}/posts/${postId}/upvote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: KEY })
  });

  await quickTest('F: api_key query param', `${MOLT_API}/posts/${postId}/upvote?api_key=${KEY}`, {
    method: 'POST'
  });
  console.log('');

  // ═══ GUIDE ═══
  console.log('═══════════════════════════════════════════');
  console.log('If Safe fetch fixes 401 → redirect stripping auth');
  console.log('If a variation works → use that method/header');
  console.log('If ALL fail with 401 → server-side platform bug');
}

main().catch(err => console.error('Fatal:', err.message));
