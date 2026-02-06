'use strict';
/**
 * 🔓 GILLITO HACK SYS v1.0
 * ═══════════════════════════════════════════════════════
 * Autonomous AI-Powered Penetration Testing
 * Inspired by KeygraphHQ/Shannon
 *
 * Follows the same pattern as all Gillito scripts:
 *   - Imports core.js from scripts/lib/
 *   - Uses Groq as primary AI (free tier)
 *   - Persists to Cloudflare KV
 *   - Reports via Moltbook
 *
 * LEGAL: Only scan systems you OWN and have authorization to test.
 *
 * Phases:
 *   L1 — Recon (attack surface mapping)
 *   L2 — Vuln Scan (injection, XSS, auth, SSRF, IDOR, authz)
 *   L3 — Exploit Verify (PoC generation, false positive elimination)
 *   L4 — Report (executive summary + detailed findings)
 *
 * Usage:
 *   node scripts/hack-sys.js
 *   TARGET_URL=https://myapp.com SCAN_TYPE=full node scripts/hack-sys.js
 *
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const core = require('./lib/core');

// ═══════════════════════════════════════════════════════
// CONFIG & CONSTANTS
// ═══════════════════════════════════════════════════════

const SESSION_ID = `hack-${Date.now()}`;
const SCAN_TYPE = process.env.SCAN_TYPE || 'full';
const MIN_SEVERITY = process.env.MIN_SEVERITY || 'medium';
const SEVERITY_ORDER = ['info', 'low', 'medium', 'high', 'critical'];
const SEVERITY_EMOJI = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪' };

// Rate limit protection — Groq free tier = 12k TPM
const DELAY_BETWEEN_CALLS_MS = parseInt(process.env.AI_DELAY_MS || '6000'); // 6s default
const MAX_RETRIES_ON_429 = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load hack targets from config
let HACK_TARGETS = [];
try {
  HACK_TARGETS = require('../config/hack-targets.js');
} catch {
  console.log('⚠️ No config/hack-targets.js found, using TARGET_URL env');
}

// ═══════════════════════════════════════════════════════
// AI PROVIDER (multi-provider with failover)
// ═══════════════════════════════════════════════════════

/**
 * Call AI with automatic failover: Groq → DeepSeek → OpenAI
 */
async function aiComplete(systemPrompt, userMessage, opts = {}) {
  const { temperature = 0.2, maxTokens = 8000 } = opts;

  // Sanitize input
  const sanitized = sanitizeInput(userMessage);
  if (detectInjection(sanitized)) {
    throw new Error('🚨 Prompt injection detected in AI input');
  }

  const providers = buildProviderList();

  for (const provider of providers) {
    try {
      const result = await callProvider(provider, systemPrompt, sanitized, { temperature, maxTokens });
      return result;
    } catch (err) {
      console.log(`  ❌ ${provider.name} failed: ${err.message}`);
      continue;
    }
  }

  throw new Error('❌ All AI providers failed');
}

function buildProviderList() {
  const providers = [];

  // 1. Groq (primary — free tier, fast)
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      maxTokens: 32768
    });
  }

  // 2. DeepSeek (cheap fallback)
  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      key: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      maxTokens: 32768
    });
  }

  // 3. OpenAI (expensive fallback)
  if (process.env.OPENAI_API_KEY) {
    providers.push({
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: 16384
    });
  }

  if (providers.length === 0) {
    throw new Error('❌ No AI provider configured. Set GROQ_API_KEY, DEEPSEEK_API_KEY, or OPENAI_API_KEY');
  }

  return providers;
}

async function callProvider(provider, system, user, opts) {
  const body = {
    model: provider.model,
    temperature: opts.temperature,
    max_tokens: Math.min(opts.maxTokens, provider.maxTokens),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };

  // Retry loop for rate limits (429)
  for (let attempt = 1; attempt <= MAX_RETRIES_ON_429; attempt++) {
    const resp = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`
      },
      body: JSON.stringify(body)
    });

    if (resp.status === 429) {
      // Parse retry-after header or use exponential backoff
      const retryAfter = resp.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : (attempt * 10000); // 10s, 20s, 30s
      console.log(`    ⏳ ${provider.name} rate limited (429), waiting ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt}/${MAX_RETRIES_ON_429})...`);
      await sleep(waitMs);
      continue;
    }

    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      throw new Error(`${resp.status}: ${err.slice(0, 200)}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) throw new Error('Empty response');
    return content;
  }

  throw new Error(`Rate limited after ${MAX_RETRIES_ON_429} retries`);
}

// ═══════════════════════════════════════════════════════
// SECURITY MODULE
// ═══════════════════════════════════════════════════════

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now\s+/i,
  /\<\/?system\>/i,
  /jailbreak/i,
  /override\s+(your\s+)?instructions/i,
  /forget\s+(all\s+)?(your\s+)?rules/i,
];

function detectInjection(input) {
  if (!input || typeof input !== 'string') return false;
  return INJECTION_PATTERNS.some(p => p.test(input));
}

function sanitizeInput(input) {
  if (!input) return '';
  return String(input)
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, 500000)
    .trim();
}

// ═══════════════════════════════════════════════════════
// PHASE L1: RECONNAISSANCE
// ═══════════════════════════════════════════════════════

async function phaseRecon(target) {
  console.log('\n📡 ═══ PHASE L1: RECONNAISSANCE ═══');
  console.log(`  🎯 Target: ${target.url}`);

  const systemPrompt = `You are an expert security researcher performing reconnaissance on a web application.
You must identify the complete attack surface. Be thorough but concise.
Return ONLY a valid JSON object (no markdown, no code blocks).`;

  const userPrompt = `Target: ${target.url}
${target.name ? `App Name: ${target.name}` : ''}
${target.tech ? `Known Tech: ${target.tech}` : ''}
${target.repo ? `Source Available: Yes` : ''}

Perform reconnaissance and return JSON:
{
  "endpoints": [
    { "url": "/api/example", "method": "GET|POST", "params": ["id"], "auth_required": true, "risk": "high|medium|low" }
  ],
  "auth_mechanisms": [
    { "type": "jwt|session|api_key|oauth|basic", "endpoint": "/login", "notes": "" }
  ],
  "technology": {
    "server": "", "framework": "", "frontend": "", "database_hints": "",
    "security_headers_missing": ["CSP", "HSTS"]
  },
  "discovery_findings": [
    { "path": "/.env", "risk": "critical", "reason": "Environment file exposure" }
  ],
  "attack_surface_score": 7
}`;

  try {
    const raw = await aiComplete(systemPrompt, userPrompt);
    const findings = safeParseJSON(raw);
    const endpointCount = findings.endpoints?.length || 0;
    const discoveryCount = findings.discovery_findings?.length || 0;
    console.log(`  📡 Found: ${endpointCount} endpoints, ${discoveryCount} discovery items`);
    console.log(`  🏗️ Tech: ${findings.technology?.framework || 'Unknown'} / ${findings.technology?.server || 'Unknown'}`);
    return findings;
  } catch (err) {
    console.log(`  ❌ Recon failed: ${err.message}`);
    return { endpoints: [], auth_mechanisms: [], technology: {}, discovery_findings: [], attack_surface_score: 0 };
  }
}

// ═══════════════════════════════════════════════════════
// PHASE L2: VULNERABILITY SCANNING
// ═══════════════════════════════════════════════════════

const VULN_TYPES = {
  injection: {
    name: 'SQL/NoSQL/Command Injection',
    focus: 'SQL injection (classic, blind, UNION, time-based), NoSQL injection ($gt/$ne/$where), Command injection, Template injection (SSTI)'
  },
  xss: {
    name: 'Cross-Site Scripting',
    focus: 'Reflected XSS, Stored XSS, DOM-based XSS, CSP bypass, Mutation XSS'
  },
  auth: {
    name: 'Authentication Bypass',
    focus: 'JWT none algorithm, JWT key confusion, session fixation, password reset flaws, 2FA bypass, default credentials, token reuse'
  },
  authz: {
    name: 'Authorization / Access Control',
    focus: 'IDOR, horizontal/vertical privilege escalation, missing function-level access control, path traversal, force browsing, mass assignment'
  },
  ssrf: {
    name: 'Server-Side Request Forgery',
    focus: 'Direct SSRF, blind SSRF, SSRF via file upload (SVG/XML), DNS rebinding, cloud metadata (169.254.169.254), webhook abuse'
  },
  idor: {
    name: 'Insecure Direct Object Reference',
    focus: 'Sequential ID enumeration, UUID leakage, cross-user data access, batch endpoint gaps, GraphQL node ID manipulation'
  }
};

async function phaseVulnScan(target, reconData) {
  console.log('\n🔍 ═══ PHASE L2: VULNERABILITY SCANNING ═══');

  const allFindings = [];
  const types = Object.keys(VULN_TYPES);

  for (const type of types) {
    const vuln = VULN_TYPES[type];
    console.log(`  🔍 Scanning: ${vuln.name}...`);

    const systemPrompt = `You are an expert penetration tester specializing in ${vuln.name}.
Analyze the target for vulnerabilities. Focus on: ${vuln.focus}
Only report findings you have MEDIUM or HIGH confidence in.
Return ONLY a valid JSON array (no markdown, no code blocks).`;

    const userPrompt = `Target: ${target.url}
Recon Data: ${JSON.stringify(reconData, null, 2).slice(0, 6000)}

Return JSON array of findings:
[{
  "id": "${type.toUpperCase()}-001",
  "type": "${type}",
  "title": "Brief title",
  "endpoint": "/api/affected",
  "method": "POST",
  "parameter": "param_name",
  "severity": "critical|high|medium|low|info",
  "description": "What the vulnerability is",
  "payload": "Proof-of-concept payload",
  "impact": "What an attacker can do",
  "remediation": "How to fix it",
  "confidence": "high|medium|low",
  "references": ["CWE-XXX"]
}]

If no vulnerabilities found, return [].`;

    try {
      const raw = await aiComplete(systemPrompt, userPrompt);
      const findings = safeParseJSON(raw);
      const arr = Array.isArray(findings) ? findings : (findings.findings || []);

      // Tag and filter
      const tagged = arr
        .map(f => ({ ...f, scan_type: type }))
        .filter(f => meetsThreshold(f.severity));

      allFindings.push(...tagged);
      console.log(`    → ${tagged.length} finding(s)`);
    } catch (err) {
      console.log(`    ❌ ${vuln.name} scan failed: ${err.message}`);
    }

    // Rate limit protection between scans
    if (types.indexOf(type) < types.length - 1) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  // Deduplicate
  const unique = deduplicateFindings(allFindings);
  console.log(`  📊 Total unique findings: ${unique.length}`);
  return unique;
}

// ═══════════════════════════════════════════════════════
// PHASE L3: EXPLOIT VERIFICATION
// ═══════════════════════════════════════════════════════

async function phaseExploitVerify(target, vulnFindings) {
  console.log('\n💥 ═══ PHASE L3: EXPLOIT VERIFICATION ═══');

  if (vulnFindings.length === 0) {
    console.log('  ✅ No findings to verify');
    return [];
  }

  // Sort by severity (critical first)
  const sorted = [...vulnFindings].sort((a, b) => {
    return SEVERITY_ORDER.indexOf(b.severity || 'info') - SEVERITY_ORDER.indexOf(a.severity || 'info');
  });

  const results = [];

  for (const vuln of sorted) {
    console.log(`  💥 Verifying: ${vuln.id} — ${vuln.title}`);

    const systemPrompt = `You are a senior penetration tester verifying vulnerabilities on a Node.js/Express application.
Generate a PRECISE, REPRODUCIBLE proof-of-concept. Only confirm as verified if you have HIGH confidence.
IMPORTANT: All remediation code_example MUST be Node.js/Express code as a SINGLE STRING (not an object).
Return ONLY valid JSON (no markdown, no code blocks).`;

    const userPrompt = `Target: ${target.url}

Vulnerability:
${JSON.stringify(vuln, null, 2)}

Return JSON:
{
  "vuln_id": "${vuln.id}",
  "verified": true|false,
  "confidence": "high|medium|low",
  "severity": "critical|high|medium|low",
  "cvss_score": 8.5,
  "poc": {
    "description": "Step-by-step exploit description",
    "curl_command": "curl -X POST ...",
    "expected_response": "What confirms exploitation",
    "impact": "What attacker achieves"
  },
  "remediation": {
    "immediate": "Quick fix action (1 sentence)",
    "proper": "Long-term fix (1 sentence)",
    "code_example": "// Node.js fix example\\nconst sanitized = input.replace(/[{}$]/g, '');"
  },
  "false_positive_reason": "If not verified, why"
}

RULES:
- code_example MUST be a plain string of Node.js code, NEVER an object or JSON
- All fixes must use Node.js/Express syntax
- curl_command must be a single runnable curl command`;

    try {
      const raw = await aiComplete(systemPrompt, userPrompt, { temperature: 0.1 });
      const result = safeParseJSON(raw);

      if (result.verified) {
        console.log(`    ✅ CONFIRMED (${result.severity})`);
      } else {
        console.log(`    ❌ Not confirmed: ${result.false_positive_reason || 'insufficient evidence'}`);
      }

      results.push(result);
    } catch (err) {
      console.log(`    ❌ Verification failed: ${err.message}`);
      results.push({ vuln_id: vuln.id, verified: false, false_positive_reason: err.message });
    }

    // Rate limit protection between verifications
    if (sorted.indexOf(vuln) < sorted.length - 1) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  const confirmed = results.filter(r => r.verified);
  console.log(`  📊 Verified: ${confirmed.length}/${results.length}`);
  return results;
}

// ═══════════════════════════════════════════════════════
// PHASE L4: REPORT GENERATION
// ═══════════════════════════════════════════════════════

async function phaseReport(target, reconData, vulnFindings, exploitResults) {
  console.log('\n📊 ═══ PHASE L4: REPORT ═══');

  const confirmed = exploitResults.filter(r => r.verified);
  const severity = severityBreakdown(confirmed);
  const riskScore = calculateRisk(confirmed);

  // Generate executive summary via AI
  let execSummary = '';
  try {
    execSummary = await aiComplete(
      `You are a senior security consultant writing a 2-paragraph executive summary for non-technical leadership. Be professional and concise.`,
      `Target: ${target.url}
Confirmed vulns: ${confirmed.length}
Severity: ${JSON.stringify(severity)}
Top findings: ${confirmed.slice(0, 3).map(e => `[${e.severity}] ${e.vuln_id}`).join(', ')}`,
      { maxTokens: 1000 }
    );
  } catch {
    execSummary = `Security assessment of ${target.url} identified ${confirmed.length} confirmed vulnerabilities.`;
  }

  // Build markdown report
  const report = buildMarkdownReport(target, {
    exec_summary: execSummary,
    recon: reconData,
    confirmed,
    all_results: exploitResults,
    severity,
    risk: riskScore
  });

  // Save report
  const reportPath = `hack-sys-report-${SESSION_ID}.md`;
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`  📄 Report saved: ${reportPath}`);

  return { path: reportPath, content: report, confirmed_count: confirmed.length, risk: riskScore };
}

function buildMarkdownReport(target, data) {
  const { exec_summary, recon, confirmed, all_results, severity, risk } = data;

  let md = `# 🔓 Gillito Hack Sys — Pentest Report

**Target:** ${target.url}${target.name ? ` (${target.name})` : ''}
**Date:** ${new Date().toISOString().split('T')[0]}
**Session:** ${SESSION_ID}
**Risk:** ${risk.rating} (${risk.score}/100)

---

## Executive Summary

${exec_summary}

---

## Severity Dashboard

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${severity.critical} |
| 🟠 High | ${severity.high} |
| 🟡 Medium | ${severity.medium} |
| 🔵 Low | ${severity.low} |
| ⚪ Info | ${severity.info} |
| **Total** | **${confirmed.length}** |

**False positive rate:** ${all_results.length > 0 ? (((all_results.length - confirmed.length) / all_results.length) * 100).toFixed(0) : 0}%

---

## Confirmed Vulnerabilities

`;

  if (confirmed.length === 0) {
    md += `> ✅ No confirmed vulnerabilities.\n\n`;
  } else {
    confirmed.forEach((exploit, i) => {
      const emoji = SEVERITY_EMOJI[exploit.severity] || '⚪';
      md += `### ${i + 1}. ${emoji} ${exploit.vuln_id} — ${exploit.severity?.toUpperCase() || '?'}

**CVSS:** ${exploit.cvss_score || 'N/A'} | **Confidence:** ${exploit.confidence || 'N/A'}

${exploit.poc?.description || ''}

`;
      if (exploit.poc?.curl_command) {
        md += `\`\`\`bash\n${exploit.poc.curl_command}\n\`\`\`\n\n`;
      }
      if (exploit.poc?.impact) {
        md += `**Impact:** ${exploit.poc.impact}\n\n`;
      }
      if (exploit.remediation) {
        md += `**Fix:**\n- Immediate: ${exploit.remediation.immediate || 'N/A'}\n- Proper: ${exploit.remediation.proper || 'N/A'}\n`;
        if (exploit.remediation.code_example) {
          // Safe serialize — handle objects that slipped through
          let codeStr = exploit.remediation.code_example;
          if (typeof codeStr === 'object') {
            codeStr = JSON.stringify(codeStr, null, 2);
          }
          codeStr = String(codeStr).trim();
          if (codeStr && codeStr !== '[object Object]') {
            md += `\n\`\`\`javascript\n${codeStr}\n\`\`\`\n`;
          }
        }
      }
      md += `\n---\n\n`;
    });
  }

  md += `## Remediation Roadmap

### 🔴 Immediate (24-48h)
${confirmed.filter(e => ['critical', 'high'].includes(e.severity)).map(e => `- **${e.vuln_id}** [${(e.severity || '').toUpperCase()}]: ${e.remediation?.immediate || 'Fix ASAP'}`).join('\n') || '- None'}

### 🟡 Short-term (1-2 weeks)
${confirmed.filter(e => e.severity === 'medium').map(e => `- **${e.vuln_id}** [MEDIUM]: ${e.remediation?.proper || 'Implement fix'}`).join('\n') || '- None'}

### 🔵 Long-term (1 month)
${confirmed.filter(e => ['low', 'info'].includes(e.severity)).map(e => `- **${e.vuln_id}**: ${e.remediation?.proper || 'Address'}`).join('\n') || '- None'}

---

*Generated by Gillito Hack Sys v1.0 | ${new Date().toISOString()}*
*⚠️ AI-assisted analysis — human review recommended*
`;

  return md;
}

// ═══════════════════════════════════════════════════════
// KV PERSISTENCE (via core.js if available)
// ═══════════════════════════════════════════════════════

async function persistResults(sessionId, data) {
  // Try core.js KV methods first
  if (typeof core.kvPut === 'function') {
    try {
      await core.kvPut(`hack-sys:${sessionId}`, JSON.stringify(data));
      console.log('  💾 Results persisted to KV');
      return;
    } catch (err) {
      console.log(`  ⚠️ KV write failed: ${err.message}`);
    }
  }

  // Direct Cloudflare KV fallback
  if (process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID && process.env.KV_NAMESPACE_ID) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}/values/hack-sys:${sessionId}`;
      const resp = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${process.env.CF_API_TOKEN}`, 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
      });
      if (resp.ok) console.log('  💾 Results persisted to KV (direct)');
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════
// MOLTBOOK ANNOUNCEMENT
// ═══════════════════════════════════════════════════════

async function announceResults(target, reportData) {
  if (!reportData || reportData.confirmed_count === 0) return;

  // Use core.js Moltbook posting if available
  if (typeof core.postToMoltbook === 'function') {
    try {
      const message = `🔓 HACK SYS REPORT\n\n` +
        `Target: ${target.url}\n` +
        `Risk: ${reportData.risk.rating}\n` +
        `Confirmed vulns: ${reportData.confirmed_count}\n\n` +
        `Full report in GitHub Actions artifacts.`;
      await core.postToMoltbook(message);
      console.log('  📢 Announced on Moltbook');
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════

function safeParseJSON(text) {
  try {
    // Strip markdown code blocks
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON within the text
    const match = text.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    console.log('  ⚠️ Failed to parse AI response as JSON');
    return {};
  }
}

function meetsThreshold(severity) {
  const idx = SEVERITY_ORDER.indexOf(severity || 'info');
  const minIdx = SEVERITY_ORDER.indexOf(MIN_SEVERITY);
  return idx >= minIdx;
}

function deduplicateFindings(findings) {
  const seen = new Set();
  return findings.filter(f => {
    const key = `${f.endpoint}:${f.parameter}:${f.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function severityBreakdown(exploits) {
  const bd = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const e of exploits) {
    if (bd[e.severity] !== undefined) bd[e.severity]++;
  }
  return bd;
}

function calculateRisk(exploits) {
  const weights = { critical: 40, high: 25, medium: 10, low: 3, info: 1 };
  let score = 0;
  for (const e of exploits) score += weights[e.severity] || 0;
  score = Math.min(score, 100);

  let rating;
  if (score >= 80) rating = '🔴 CRITICAL';
  else if (score >= 60) rating = '🟠 HIGH';
  else if (score >= 30) rating = '🟡 MEDIUM';
  else if (score > 0) rating = '🔵 LOW';
  else rating = '✅ CLEAN';

  return { score, rating };
}

// ═══════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════╗
║     🔓 GILLITO HACK SYS v1.0            ║
║     Autonomous Penetration Testing        ║
╚═══════════════════════════════════════════╝`);

  // Determine targets
  let targets = [];

  if (process.env.TARGET_URL) {
    targets.push({ url: process.env.TARGET_URL, name: 'Manual Target' });
  } else if (HACK_TARGETS.length > 0) {
    targets = HACK_TARGETS;
  } else {
    console.log('❌ No target specified.');
    console.log('   Set TARGET_URL env var or create config/hack-targets.js');
    process.exit(1);
  }

  console.log(`\n🎯 Targets: ${targets.length}`);
  console.log(`📋 Scan type: ${SCAN_TYPE}`);
  console.log(`📋 Min severity: ${MIN_SEVERITY}`);
  console.log(`🆔 Session: ${SESSION_ID}\n`);

  for (const target of targets) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🎯 SCANNING: ${target.url}`);
    console.log(`${'═'.repeat(50)}`);

    try {
      // L1: Recon
      const reconData = await phaseRecon(target);

      if (SCAN_TYPE === 'recon-only') {
        console.log('\n✅ Recon-only scan complete');
        console.log(JSON.stringify(reconData, null, 2));
        continue;
      }

      // L2: Vuln Scan
      const vulnFindings = await phaseVulnScan(target, reconData);

      if (SCAN_TYPE === 'vuln-only' || SCAN_TYPE === 'quick') {
        console.log(`\n✅ Vuln scan complete: ${vulnFindings.length} findings`);
        continue;
      }

      // L3: Exploit Verification
      const exploitResults = await phaseExploitVerify(target, vulnFindings);

      // L4: Report
      const reportData = await phaseReport(target, reconData, vulnFindings, exploitResults);

      // Persist & announce
      await persistResults(SESSION_ID, {
        target: target.url,
        timestamp: new Date().toISOString(),
        confirmed: exploitResults.filter(r => r.verified).length,
        risk: reportData.risk,
        report_path: reportData.path
      });

      await announceResults(target, reportData);

    } catch (err) {
      console.error(`\n❌ Scan failed for ${target.url}: ${err.message}`);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ GILLITO HACK SYS — ALL SCANS COMPLETE`);
  console.log(`${'═'.repeat(50)}\n`);
}

main().catch(err => {
  console.error('💀 Fatal error:', err.message);
  process.exit(1);
});
