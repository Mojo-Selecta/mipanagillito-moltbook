#!/usr/bin/env node
/**
 * 🔬 GILLITO API DIAGNOSTIC v1.0
 * Tests every Moltbook API endpoint to find the 401 issue
 */

const MOLT_API = 'https://www.moltbook.com/api/v1';
const KEY = process.env.MOLTBOOK_API_KEY || 'MISSING';

function headers() {
  return { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };
}

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

async function test(name, url, opts = {}) {
  log('🔬', `TEST: ${name}`);
  log('  ', `URL: ${url}`);
  log('  ', `Method: ${opts.method || 'GET'}`);
  
  try {
    // First try with redirect: manual to detect redirects
    const manualRes = await fetch(url, { ...opts, redirect: 'manual' });
    
    if (manualRes.status >= 300 && manualRes.status < 400) {
      const location = manualRes.headers.get('location');
      log('⚠️', `REDIRECT DETECTED [${manualRes.status}] → ${location}`);
      log('  ', `This strips Authorization header! That's the bug.`);
    }
    
    // Now do normal request (follows redirects)
    const res = await fetch(url, opts);
    const text = await res.text();
    const truncated = text.substring(0, 400);
    
    log(res.ok ? '✅' : '❌', `[${res.status} ${res.statusText}]: ${truncated}`);
    return { status: res.status, body: truncated };
  } catch (err) {
    log('💥', `ERROR: ${err.message}`);
    return { status: 0, error: err.message };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🔬 GILLITO API DIAGNOSTIC');
  console.log('═══════════════════════════════════════════');
  
  // Key info
  log('🔑', `API Key: ${KEY.substring(0, 12)}...${KEY.substring(KEY.length - 4)} (${KEY.length} chars)`);
  log('🔑', `Prefix: ${KEY.substring(0, 9)}`);
  console.log('');
  
  // Test 1: Agents/me - verifies if key is valid at all
  log('━━', 'TEST 1: Is the API key valid?');
  await test('GET /agents/me', `${MOLT_API}/agents/me`, { headers: headers() });
  console.log('');
  
  // Test 2: Agent status
  log('━━', 'TEST 2: Agent status');
  await test('GET /agents/status', `${MOLT_API}/agents/status`, { headers: headers() });
  console.log('');
  
  // Test 3: Feed (should work - GET)
  log('━━', 'TEST 3: Feed (GET - should work)');
  const feedResult = await test('GET /posts (feed)', `${MOLT_API}/posts?sort=hot&limit=2`, { headers: headers() });
  console.log('');
  
  // Extract a post ID from feed for testing
  let testPostId = null;
  try {
    const feedData = JSON.parse(feedResult.body.length > 400 ? feedResult.body : feedResult.body);
    const posts = feedData.posts || [];
    if (posts.length > 0) testPostId = posts[0].id || posts[0]._id;
  } catch {
    // Try to extract UUID from response
    const uuidMatch = feedResult.body.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
    if (uuidMatch) testPostId = uuidMatch[0];
  }
  
  if (!testPostId) {
    log('⚠️', 'No post ID found in feed - using hardcoded test ID');
    testPostId = '82e35782-a012-4359-bd71-6836009c040e';
  }
  log('📌', `Using post ID: ${testPostId}`);
  console.log('');
  
  // Test 4: Upvote
  log('━━', 'TEST 4: Upvote (POST - returns 401?)');
  await test('POST /posts/{id}/upvote', `${MOLT_API}/posts/${testPostId}/upvote`, {
    method: 'POST', headers: headers()
  });
  console.log('');
  
  // Test 5: Comment
  log('━━', 'TEST 5: Comment (POST - returns 401?)');
  await test('POST /posts/{id}/comments', `${MOLT_API}/posts/${testPostId}/comments`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ content: '🦞 test diagnóstico' })
  });
  console.log('');
  
  // Test 6: Create post (this reportedly works)
  log('━━', 'TEST 6: Create post (POST - reportedly works?)');
  await test('POST /posts (create)', `${MOLT_API}/posts`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ submolt: 'general', title: '🔬 Diagnostic Test', content: 'Testing API — ignore this post' })
  });
  console.log('');
  
  // Test 7: Follow
  log('━━', 'TEST 7: Follow');
  await test('POST /agents/Shellraiser/follow', `${MOLT_API}/agents/Shellraiser/follow`, {
    method: 'POST', headers: headers()
  });
  console.log('');
  
  // Test 8: Try without www (redirect test)
  log('━━', 'TEST 8: Non-www redirect test');
  await test('GET moltbook.com (no www)', 'https://moltbook.com/api/v1/posts?limit=1', {
    headers: headers()
  });
  console.log('');
  
  console.log('═══════════════════════════════════════════');
  console.log('  📋 DIAGNÓSTICO COMPLETO');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('Si TEST 1 (agents/me) da 401 → Tu API key fue invalidada');
  console.log('  → Necesitas re-registrar el bot o conseguir nueva key');
  console.log('  → Moltbook reseteó TODAS las keys el 31 enero 2026');
  console.log('');
  console.log('Si TEST 1 da 200 pero TEST 4-5 dan 401 → Bug de redirect');
  console.log('  → Hay que agregar redirect: "manual" y seguir manualmente');
  console.log('');
  console.log('Si TEST 8 muestra REDIRECT → El www es obligatorio');
}

main().catch(err => console.error('Fatal:', err.message));
