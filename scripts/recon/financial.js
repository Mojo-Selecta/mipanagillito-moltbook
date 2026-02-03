// ═══════════════════════════════════════════════════════
// 💰 LEVEL 4: FINANCIAL TRAILS
// ═══════════════════════════════════════════════════════
// Follows the money through public records:
// - SEC EDGAR: Filings from companies operating in PR
// - PR CEE: Political donations (when available)
// - Corporate registrations tracking

const path = require('path');
const { safeRequest, fingerprint, sanitize, classifyText, extractEntities } = require(path.join(__dirname, 'lib', 'recon-utils'));
const { ENERGY_ENTITIES, FEDERAL_ENTITIES } = require(path.join(__dirname, '..', 'config', 'recon-targets'));

// ─── Companies to track on SEC EDGAR ───
// These are companies with major PR operations
const SEC_TARGETS = [
  { name: 'LUMA Energy (Quanta Services)', cik: '0000098952', ticker: 'PWR', reason: 'LUMA parent company' },
  { name: 'AES Corporation', cik: '0000874761', ticker: 'AES', reason: 'AES PR power generation' },
  { name: 'Popular Inc', cik: '0000763901', ticker: 'BPOP', reason: 'Banco Popular — largest PR bank' },
  { name: 'First BanCorp', cik: '0000834237', ticker: 'FBP', reason: 'FirstBank PR' },
  { name: 'OFG Bancorp', cik: '0000074260', ticker: 'OFG', reason: 'Oriental Financial Group' },
  { name: 'Evertec', cik: '0001559865', ticker: 'EVTC', reason: 'PR payments/tech company' },
  { name: 'Triple-S Management', cik: '0001174940', ticker: 'GTS', reason: 'PR health insurance' },
];

// ─── SEC EDGAR: Recent filings ───

async function scanSEC() {
  console.log('      📊 Querying SEC EDGAR...');
  const findings = [];

  for (const target of SEC_TARGETS) {
    try {
      // Get recent submissions
      const url = `https://data.sec.gov/submissions/CIK${target.cik.padStart(10, '0')}.json`;
      const json = await safeRequest(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'GillitoRecon/1.0 research@example.com',
          'Accept': 'application/json',
        }
      });

      if (!json) { console.log(`      ⚠️ ${target.ticker}: no response`); continue; }

      const data = JSON.parse(json);
      const filings = data.filings?.recent || {};
      const forms = filings.form || [];
      const dates = filings.filingDate || [];
      const descriptions = filings.primaryDocDescription || [];
      const accessions = filings.accessionNumber || [];

      // Filter for interesting filing types (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      const interestingForms = ['10-K', '10-Q', '8-K', '8-K/A', 'DEF 14A', '4', 'SC 13D', 'SC 13G'];
      
      let count = 0;
      for (let i = 0; i < forms.length && count < 3; i++) {
        const filingDate = new Date(dates[i]);
        if (filingDate < thirtyDaysAgo) continue;
        if (!interestingForms.includes(forms[i])) continue;

        const accession = accessions[i]?.replace(/-/g, '');
        const edgarUrl = `https://www.sec.gov/Archives/edgar/data/${target.cik.replace(/^0+/, '')}/${accession}/`;
        
        let headline = `SEC ${forms[i]}: ${data.name || target.name}`;
        let signals = [];
        let subcategory = 'sec_filing';

        // Classify the filing type
        if (forms[i] === '8-K') {
          headline = `SEC 8-K (Material Event): ${data.name || target.name}`;
          signals = ['resignation']; // 8-Ks often contain leadership changes, lawsuits, etc
          subcategory = 'sec_material_event';
        } else if (forms[i] === '10-K' || forms[i] === '10-Q') {
          headline = `SEC ${forms[i]} (Financial Report): ${data.name || target.name}`;
          signals = ['funding'];
          subcategory = 'sec_financial';
        } else if (forms[i] === '4') {
          headline = `SEC Form 4 (Insider Trade): ${data.name || target.name}`;
          signals = ['scandal']; // insider trading always newsworthy
          subcategory = 'sec_insider';
        } else if (forms[i].includes('SC 13')) {
          headline = `SEC ${forms[i]} (Ownership Change): ${data.name || target.name}`;
          signals = ['resignation'];
          subcategory = 'sec_ownership';
        }

        findings.push({
          category: 'financial_trails',
          subcategory,
          signals,
          headline: sanitize(headline),
          summary: sanitize(`${descriptions[i] || forms[i]} filed ${dates[i]}. ${target.reason}. Company: ${data.name || target.name} (${target.ticker})`),
          source: 'SEC EDGAR',
          sourceUrl: edgarUrl,
          entities: [target.name, ...(target.reason.includes('LUMA') ? ['LUMA Energy'] : [])],
          moneyMentioned: [],
          timestamp: filingDate.toISOString(),
          fingerprint: fingerprint(`sec-${target.ticker}-${forms[i]}-${dates[i]}`),
          depth: 'api_record',
          rawData: {
            ticker: target.ticker,
            formType: forms[i],
            filingDate: dates[i],
            companyName: data.name,
          }
        });
        count++;
      }
      
      if (count > 0) console.log(`      📊 ${target.ticker}: ${count} recent filings`);
    } catch (err) {
      console.error(`      ❌ ${target.ticker}: ${err.message}`);
    }

    // Small delay between SEC requests (they rate limit)
    await new Promise(r => setTimeout(r, 500));
  }

  return findings;
}

// ─── PR Political Donation Tracking (CEE - Comisión Estatal de Elecciones) ───

async function scanDonations() {
  console.log('      🗳️ Scanning political donations...');
  const findings = [];

  try {
    // CEE doesn't have a public API, but we can monitor their RSS/news
    const ceeUrl = 'https://www.ceepur.org/';
    const html = await safeRequest(ceeUrl, { timeout: 15000 });
    
    if (html) {
      // Extract any news/announcements from the page
      const newsMatches = html.match(/<a[^>]*href=["']([^"']*)[^"']*["'][^>]*>([^<]*(?:donat|financ|campaña|comité|partido)[^<]*)<\/a>/gi);
      
      if (newsMatches) {
        for (const match of newsMatches.slice(0, 3)) {
          const linkMatch = match.match(/href=["']([^"']+)["']/i);
          const textMatch = match.match(/>([^<]+)</);
          if (textMatch) {
            findings.push({
              category: 'financial_trails',
              subcategory: 'political_donations',
              signals: ['corruption', 'funding'],
              headline: sanitize(textMatch[1]),
              summary: `Información de donaciones/financiamiento político de la CEE`,
              source: 'CEE Puerto Rico',
              sourceUrl: linkMatch ? linkMatch[1] : 'https://www.ceepur.org/',
              entities: ['CEE'],
              timestamp: new Date().toISOString(),
              fingerprint: fingerprint(textMatch[1]),
              depth: 'scrape',
            });
          }
        }
      }
      console.log(`      🗳️ CEE: ${findings.length} items found`);
    }
  } catch (err) {
    console.error(`      ❌ CEE: ${err.message}`);
  }

  return findings;
}

// ─── Corporate Registry Monitoring ───

async function scanCorporateRegistry() {
  console.log('      🏢 Scanning corporate registrations...');
  const findings = [];

  try {
    // PR Department of State corporate registry
    // Monitor for new registrations of companies related to government contracts
    const dosUrl = 'https://www.estado.pr.gov/';
    const html = await safeRequest(dosUrl, { timeout: 15000 });
    
    if (html) {
      // Extract news/announcements that mention corporations, registrations, contracts
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const classification = classifyText(text);
      
      if (classification.signals.length > 0 || /corporación|registro|empresa|LLC|inc\b/i.test(text)) {
        findings.push({
          category: 'financial_trails',
          subcategory: 'corporate_registry',
          signals: classification.signals,
          headline: `PR Dept of State: Registry activity detected`,
          summary: sanitize(text.slice(0, 400)),
          source: 'Dept. Estado PR',
          sourceUrl: dosUrl,
          entities: ['PR Government'],
          timestamp: new Date().toISOString(),
          fingerprint: fingerprint(`dos-pr-${new Date().toISOString().split('T')[0]}`),
          depth: 'scrape',
        });
      }
    }
  } catch (err) {
    console.error(`      ❌ Corporate Registry: ${err.message}`);
  }

  return findings;
}

// ─── Main scan ───

async function scan() {
  console.log('   💰 [L4] Financial Trails...');

  const [secResults, donationResults, corpResults] = await Promise.allSettled([
    scanSEC(),
    scanDonations(),
    scanCorporateRegistry(),
  ]);

  const findings = [];
  if (secResults.status === 'fulfilled') findings.push(...(secResults.value || []));
  if (donationResults.status === 'fulfilled') findings.push(...(donationResults.value || []));
  if (corpResults.status === 'fulfilled') findings.push(...(corpResults.value || []));

  console.log(`   💰 [L4] Financial Trails: ${findings.length} findings`);
  return findings;
}

module.exports = { scan };
