// ═══════════════════════════════════════════════════════
// 💰 LEVEL 4: FINANCIAL TRAILS
// ═══════════════════════════════════════════════════════
// PATH: scripts/recon/financial.js

const path = require('path');
const { safeRequest, extractEntities, classifyText, fingerprint, sanitize } = require(path.join(__dirname, '..', 'lib', 'recon-utils'));
const { POLITICIANS, ENERGY_ENTITIES } = require(path.join(__dirname, '..', '..', 'config', 'recon-targets'));

const FINANCIAL_SOURCES = [
{ name: 'Bolsa PR', url: 'https://pr.bolsafinanciera.org/', selector: 'data' },
{ name: 'Banco Popular PR', url: 'https://www.popular.com/tasas-y-tarifas/', selector: 'rates' },
{ name: 'GDB Bonds', url: 'https://www.bgfpr.com/investors_resources/commonwealth-quarterly.html', selector: 'bonds' },
{ name: 'PREPA Status', url: 'https://www.aeepr.com/es-pr/financial-information/', selector: 'financial' },
{ name: 'COFINA Bonds', url: 'https://www.cofina.pr.gov/investor-resources', selector: 'reports' },
];

async function scanContractorsDB() {
console.log('      💰 Scanning contractor database…');
const findings = [];

try {
const baseUrl = 'https://consultacontratos.ocpr.gov.pr/';
const searchParams = new URLSearchParams({
'nameDepartment': '',
'contractNumber': '',
'dateFrom': '', 
'dateTo': '',
'totalFrom': '5000000',
'totalTo': '100000000',
'namePerson': '',
'type': '',
'status': 'VIGENTE',
'municipality': '',
'page': '1',
'limit': '25'
});
const searchUrl = `${baseUrl}search?${searchParams.toString()}`;
const html = await safeRequest(searchUrl, { timeout: 30000 });
if (!html) { console.log(`      ⚠️ Contractors DB: no response`); return findings; }

const contractMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
const contractCount = contractMatches ? contractMatches.length - 1 : 0; // First row is header
console.log(`      💰 Contractors DB: ${contractCount} large contracts found`);

if (contractCount > 0) {
const moneyMatches = html.match(/\$[\d,]+(?:\.\d{1,2})?/g) || [];
findings.push({
category: 'financial_trails', subcategory: 'government_contracts',
signals: ['funding', 'corruption'],
headline: `${contractCount} large contracts active (>$5M)`,
summary: `Active government contracts exceeding $5 million. Top amounts: ${moneyMatches.slice(0, 5).join(', ')}`,
source: 'Contraloría PR', sourceUrl: baseUrl,
entities: ['PR Government'],
moneyMentioned: moneyMatches.slice(0, 5),
timestamp: new Date().toISOString(),
fingerprint: fingerprint(`contractors-large-${new Date().toISOString().split('T')[0]}`),
depth: 'database_extract',
});

// Extract specific high-value contracts
const contractDataRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
for (let i = 1; i < Math.min(contractMatches.length, 6); i++) {
try {
  const row = contractMatches[i];
  const rowData = [];
  let cellMatch;
  while ((cellMatch = contractDataRegex.exec(row)) !== null) {
    const cellContent = cellMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    rowData.push(cellContent);
  }
  
  if (rowData.length >= 5) {
    const [dept, contractNum, date, entity, amount] = rowData;
    findings.push({
      category: 'financial_trails', subcategory: 'high_value_contract',
      signals: ['funding', 'corruption'],
      headline: sanitize(`Contract: ${amount} to ${entity}`),
      summary: sanitize(`Department: ${dept} | Number: ${contractNum} | Date: ${date}`),
      source: 'Contraloría PR', sourceUrl: `${baseUrl}contract/${contractNum}`,
      entities: [entity, dept],
      moneyMentioned: [amount],
      timestamp: new Date().toISOString(),
      fingerprint: fingerprint(`contract-${contractNum}`),
      depth: 'database_extract',
    });
  }
} catch (err) {
  console.error(`      ❌ Contract parsing: ${err.message}`);
}
}
}

} catch (err) {
console.error(`      ❌ Contractors DB: ${err.message}`);
}

return findings;
}

async function scanFinancialNews() {
console.log('      💹 Scanning financial news sources…');
const findings = [];

try {
const feedUrls = [
'https://rsshub.app/endi/economia',
'https://www.noticel.com/economia/feed/',
'https://caribbeanbusiness.com/category/economy/feed/',
];

for (const feedUrl of feedUrls) {
try {
const xml = await safeRequest(feedUrl, { timeout: 15000 });
if (!xml) continue;

  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const descMatch = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const dateMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    
    if (titleMatch) {
      const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      
      // Look for financial indicators
      if (/bonos|junta|fiscal|presupuesto|millones|fondos|deuda|inversión|dinero|finanzas|COSSEC|hacienda|contrato/i.test(title + ' ' + description)) {
        const source = feedUrl.includes('endi') ? 'El Nuevo Día' : 
                       feedUrl.includes('noticel') ? 'Noticel' : 
                       feedUrl.includes('caribbeanbusiness') ? 'Caribbean Business' : 'Financial News';
        
        const entities = extractEntities(title + ' ' + description, [...POLITICIANS, ...ENERGY_ENTITIES]);
        const classification = classifyText(title + ' ' + description);
        
        // Find any money amounts mentioned
        const moneyPattern = /\$[\d,]+(?:\.\d{1,2})?(?:\s*(?:million|billion|m|b|mil(?:lones)?|bi?ll(?:ones)?|mdd))?|(\d[\d,.]+)\s*(?:millones|million|billion|bil(?:lones)?)/gi;
        const moneyMatches = [];
        let moneyMatch;
        while ((moneyMatch = moneyPattern.exec(title + ' ' + description)) !== null) {
          moneyMatches.push(moneyMatch[0]);
        }
        
        findings.push({
          category: 'financial_trails', subcategory: 'financial_news',
          signals: [...classification.signals, 'financial'],
          headline: sanitize(title),
          summary: sanitize(description?.substring(0, 400) || 'Sin descripción disponible'),
          source, sourceUrl: linkMatch ? linkMatch[1].trim() : '',
          entities, moneyMentioned: moneyMatches.slice(0, 5),
          timestamp: dateMatch ? new Date(dateMatch[1].trim()).toISOString() : new Date().toISOString(),
          fingerprint: fingerprint(title), depth: 'financial_news',
        });
      }
    }
  }
} catch (err) {
  console.error(`      ❌ Financial feed (${feedUrl}): ${err.message}`);
}
}

} catch (err) {
console.error(`      ❌ Financial news: ${err.message}`);
}

return findings;
}

async function scanGovSpending() {
console.log('      💼 Checking government spending…');
const findings = [];

try {
const apiUrl = 'https://www.usaspending.gov/api/v2/search/spending_by_geography/';
const payload = {
  "scope": "place_of_performance",
  "geo_layer": "state",
  "geo_layer_filters": ["72"],
  "filters": {
    "time_period": [{"start_date": "2022-01-01", "end_date": "2025-01-01"}],
    "place_of_performance_locations": [{"country": "USA", "state": "PR"}],
    "award_type_codes": ["A", "B", "C", "D"]
  }
};
const headers = {
'Content-Type': 'application/json',
'Accept': 'application/json'
};

const response = await safeRequest(apiUrl, { 
method: 'POST',
body: JSON.stringify(payload),
headers,
timeout: 30000 
});

if (response) {
const data = JSON.parse(response);
const totalSpending = data.results?.[0]?.aggregated_amount || 0;
const amountFormatted = totalSpending ? `$${(totalSpending / 1e9).toFixed(1)}B` : 'N/A';

findings.push({
category: 'financial_trails', subcategory: 'federal_spending',
signals: ['funding'],
headline: `Federal spending in PR: ${amountFormatted}`,
summary: `Total federal government spending in Puerto Rico from 2022-2025. Data from USAspending.gov API.`,
source: 'USAspending.gov', sourceUrl: 'https://www.usaspending.gov/state/puerto-rico/72',
entities: ['Federal Government', 'PR Government'],
moneyMentioned: [amountFormatted],
timestamp: new Date().toISOString(),
fingerprint: fingerprint(`usaspending-2022-2025-${new Date().toISOString().split('T')[0]}`),
depth: 'api_query',
});
}

} catch (err) {
console.error(`      ❌ Gov spending API: ${err.message}`);
}

return findings;
}

async function scan() {
console.log('   💰 [L4] Financial Trails…');
const [contractorsResults, newsResults, spendingResults] = await Promise.allSettled([
scanContractorsDB(), scanFinancialNews(), scanGovSpending(),
]);
const findings = [];
if (contractorsResults.status === 'fulfilled') findings.push(...(contractorsResults.value || []));
if (newsResults.status === 'fulfilled') findings.push(...(newsResults.value || []));
if (spendingResults.status === 'fulfilled') findings.push(...(spendingResults.value || []));
console.log(`   💰 [L4] Financial Trails: ${findings.length} findings`);
return findings;
}

module.exports = { scan };
