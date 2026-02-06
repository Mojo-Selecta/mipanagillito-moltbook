// ═══════════════════════════════════════════════════════
// 💰 LEVEL 4: FINANCIAL TRAILS
// ═══════════════════════════════════════════════════════
// PATH: scripts/recon/financial.js
// 🥷 STEALTH: Uses stealth-http for anti-bot detection evasion
//    NOTE: SEC EDGAR keeps custom User-Agent header (API requirement)

const path = require('path');
const { fingerprint, sanitize, classifyText, extractEntities } = require(path.join(__dirname, '..', 'lib', 'recon-utils'));
const { safeRequest } = require('./stealth-http');  // 🥷 Stealth drop-in
const { ENERGY_ENTITIES, FEDERAL_ENTITIES } = require(path.join(__dirname, '..', '..', 'config', 'recon-targets'));

const SEC_TARGETS = [
  { name: 'LUMA Energy (Quanta Services)', cik: '0000098952', ticker: 'PWR', reason: 'LUMA parent company' },
  { name: 'AES Corporation', cik: '0000874761', ticker: 'AES', reason: 'AES PR power generation' },
  { name: 'Popular Inc', cik: '0000763901', ticker: 'BPOP', reason: 'Banco Popular — largest PR bank' },
  { name: 'First BanCorp', cik: '0000834237', ticker: 'FBP', reason: 'FirstBank PR' },
  { name: 'OFG Bancorp', cik: '0000074260', ticker: 'OFG', reason: 'Oriental Financial Group' },
  { name: 'Evertec', cik: '0001559865', ticker: 'EVTC', reason: 'PR payments/tech company' },
  { name: 'Triple-S Management', cik: '0001174940', ticker: 'GTS', reason: 'PR health insurance' },
];

async function scanSEC() {
  console.log('      📊 Querying SEC EDGAR...');
  var findings = [];

  for (var ti = 0; ti < SEC_TARGETS.length; ti++) {
    var target = SEC_TARGETS[ti];
    try {
      var url = 'https://data.sec.gov/submissions/CIK' + target.cik.padStart(10, '0') + '.json';
      // SEC EDGAR requires identifying User-Agent — stealth-http detects custom UA
      // and uses minimal API profile instead of full browser fingerprint
      var json = await safeRequest(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'GillitoRecon/1.0 research@example.com', 'Accept': 'application/json' }
      });
      if (!json) { console.log('      ⚠️ ' + target.ticker + ': no response'); continue; }

      var data = JSON.parse(json);
      var filings = data.filings && data.filings.recent ? data.filings.recent : {};
      var forms = filings.form || [];
      var dates = filings.filingDate || [];
      var descriptions = filings.primaryDocDescription || [];
      var accessions = filings.accessionNumber || [];

      var thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      var interestingForms = ['10-K', '10-Q', '8-K', '8-K/A', 'DEF 14A', '4', 'SC 13D', 'SC 13G'];

      var count = 0;
      for (var i = 0; i < forms.length && count < 3; i++) {
        var filingDate = new Date(dates[i]);
        if (filingDate < thirtyDaysAgo) continue;
        if (interestingForms.indexOf(forms[i]) === -1) continue;

        var accession = accessions[i] ? accessions[i].replace(/-/g, '') : '';
        var edgarUrl = 'https://www.sec.gov/Archives/edgar/data/' + target.cik.replace(/^0+/, '') + '/' + accession + '/';

        var headline = 'SEC ' + forms[i] + ': ' + (data.name || target.name);
        var signals = [];
        var subcategory = 'sec_filing';

        if (forms[i] === '8-K') {
          headline = 'SEC 8-K (Material Event): ' + (data.name || target.name);
          signals = ['resignation']; subcategory = 'sec_material_event';
        } else if (forms[i] === '10-K' || forms[i] === '10-Q') {
          headline = 'SEC ' + forms[i] + ' (Financial Report): ' + (data.name || target.name);
          signals = ['funding']; subcategory = 'sec_financial';
        } else if (forms[i] === '4') {
          headline = 'SEC Form 4 (Insider Trade): ' + (data.name || target.name);
          signals = ['scandal']; subcategory = 'sec_insider';
        } else if (forms[i].indexOf('SC 13') !== -1) {
          headline = 'SEC ' + forms[i] + ' (Ownership Change): ' + (data.name || target.name);
          signals = ['resignation']; subcategory = 'sec_ownership';
        }

        findings.push({
          category: 'financial_trails', subcategory: subcategory, signals: signals,
          headline: sanitize(headline),
          summary: sanitize((descriptions[i] || forms[i]) + ' filed ' + dates[i] + '. ' + target.reason + '. Company: ' + (data.name || target.name) + ' (' + target.ticker + ')'),
          source: 'SEC EDGAR', sourceUrl: edgarUrl,
          entities: [target.name].concat(target.reason.indexOf('LUMA') !== -1 ? ['LUMA Energy'] : []),
          moneyMentioned: [],
          timestamp: filingDate.toISOString(),
          fingerprint: fingerprint('sec-' + target.ticker + '-' + forms[i] + '-' + dates[i]),
          depth: 'api_record',
          rawData: { ticker: target.ticker, formType: forms[i], filingDate: dates[i], companyName: data.name },
        });
        count++;
      }
      if (count > 0) console.log('      📊 ' + target.ticker + ': ' + count + ' recent filings');
    } catch (err) {
      console.error('      ❌ ' + target.ticker + ': ' + err.message);
    }
    await new Promise(function(r) { setTimeout(r, 500); });
  }
  return findings;
}

async function scanDonations() {
  console.log('      🗳️ Scanning political donations...');
  var findings = [];
  try {
    var html = await safeRequest('https://www.ceepur.org/', { timeout: 15000 });
    if (html) {
      var newsMatches = html.match(/<a[^>]*href=["']([^"']*)[^"']*["'][^>]*>([^<]*(?:donat|financ|campana|comite|partido)[^<]*)<\/a>/gi);
      if (newsMatches) {
        for (var i = 0; i < Math.min(newsMatches.length, 3); i++) {
          var linkMatch = newsMatches[i].match(/href=["']([^"']+)["']/i);
          var textMatch = newsMatches[i].match(/>([^<]+)</);
          if (textMatch) {
            findings.push({
              category: 'financial_trails', subcategory: 'political_donations',
              signals: ['corruption', 'funding'],
              headline: sanitize(textMatch[1]),
              summary: 'Informacion de donaciones/financiamiento politico de la CEE',
              source: 'CEE Puerto Rico', sourceUrl: linkMatch ? linkMatch[1] : 'https://www.ceepur.org/',
              entities: ['CEE'],
              timestamp: new Date().toISOString(),
              fingerprint: fingerprint(textMatch[1]), depth: 'scrape',
            });
          }
        }
      }
      console.log('      🗳️ CEE: ' + findings.length + ' items found');
    }
  } catch (err) {
    console.error('      ❌ CEE: ' + err.message);
  }
  return findings;
}

async function scanCorporateRegistry() {
  console.log('      🏢 Scanning corporate registrations...');
  var findings = [];
  try {
    var html = await safeRequest('https://www.estado.pr.gov/', { timeout: 15000 });
    if (html) {
      var text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      var classification = classifyText(text);
      if (classification.signals.length > 0 || /corporacion|registro|empresa|LLC|inc\b/i.test(text)) {
        findings.push({
          category: 'financial_trails', subcategory: 'corporate_registry',
          signals: classification.signals,
          headline: 'PR Dept of State: Registry activity detected',
          summary: sanitize(text.slice(0, 400)),
          source: 'Dept. Estado PR', sourceUrl: 'https://www.estado.pr.gov/',
          entities: ['PR Government'],
          timestamp: new Date().toISOString(),
          fingerprint: fingerprint('dos-pr-' + new Date().toISOString().split('T')[0]),
          depth: 'scrape',
        });
      }
    }
  } catch (err) {
    console.error('      ❌ Corporate Registry: ' + err.message);
  }
  return findings;
}

async function scan() {
  console.log('   💰 [L4] Financial Trails...');
  var results = await Promise.allSettled([scanSEC(), scanDonations(), scanCorporateRegistry()]);
  var findings = [];
  if (results[0].status === 'fulfilled') findings.push.apply(findings, results[0].value || []);
  if (results[1].status === 'fulfilled') findings.push.apply(findings, results[1].value || []);
  if (results[2].status === 'fulfilled') findings.push.apply(findings, results[2].value || []);
  console.log('   💰 [L4] Financial Trails: ' + findings.length + ' findings');
  return findings;
}

module.exports = { scan };
