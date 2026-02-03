// ═══════════════════════════════════════════════════════
// 🏛️ LEVEL 2: GOVERNMENT RECORDS
// ═══════════════════════════════════════════════════════
// Queries public government APIs:
// - OpenFEMA: Disaster grants to PR
// - USAspending: Federal contracts in PR
// - Contralor: Public contract registry scraping

const path = require('path');
const { safeRequest, fingerprint, sanitize, classifyText } = require(path.join(__dirname, 'lib', 'recon-utils'));

// ─── OpenFEMA: Recent disaster declarations & grants for PR ───

async function scanFEMA() {
  console.log('      🌀 Querying OpenFEMA...');
  const findings = [];

  try {
    // Recent disaster declarations for Puerto Rico (last 365 days)
    const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
    const declUrl = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=state eq 'PR' and declarationDate gt '${oneYearAgo}'&$orderby=declarationDate desc&$top=20`;
    
    const declJson = await safeRequest(declUrl, { 
      headers: { 'Accept': 'application/json' },
      timeout: 20000 
    });
    
    if (declJson) {
      const data = JSON.parse(declJson);
      const records = data.DisasterDeclarationsSummaries || [];
      console.log(`      🌀 FEMA Declarations: ${records.length} recent`);

      for (const rec of records) {
        const headline = `FEMA ${rec.declarationType}: ${rec.declarationTitle || rec.incidentType}`;
        const summary = `Disaster #${rec.disasterNumber} — ${rec.incidentType} in PR. Declared: ${rec.declarationDate?.split('T')[0]}. Programs: ${[rec.ihProgramDeclared ? 'Individual Assistance' : '', rec.iaProgramDeclared ? 'IA' : '', rec.paProgramDeclared ? 'Public Assistance' : '', rec.hmProgramDeclared ? 'Hazard Mitigation' : ''].filter(Boolean).join(', ') || 'N/A'}`;
        
        findings.push({
          category: 'government_records',
          subcategory: 'fema_disaster',
          signals: ['funding', 'disaster'],
          headline: sanitize(headline),
          summary: sanitize(summary),
          source: 'OpenFEMA',
          sourceUrl: `https://www.fema.gov/disaster/${rec.disasterNumber}`,
          entities: ['FEMA', 'PR Government'],
          timestamp: rec.declarationDate || new Date().toISOString(),
          fingerprint: fingerprint(`fema-${rec.disasterNumber}`),
          depth: 'api_record',
          rawData: {
            disasterNumber: rec.disasterNumber,
            type: rec.incidentType,
            programs: { ih: rec.ihProgramDeclared, ia: rec.iaProgramDeclared, pa: rec.paProgramDeclared, hm: rec.hmProgramDeclared },
          }
        });
      }
    }

    // Public Assistance grant awards for PR (recent)
    const paUrl = `https://www.fema.gov/api/open/v2/PublicAssistanceGrantAwardActivities?$filter=state eq 'Puerto Rico'&$orderby=obligationDate desc&$top=15&$select=disasterNumber,applicantName,projectTitle,federalShareObligated,obligationDate,incidentType`;
    
    const paJson = await safeRequest(paUrl, { 
      headers: { 'Accept': 'application/json' },
      timeout: 20000 
    });
    
    if (paJson) {
      const data = JSON.parse(paJson);
      const records = data.PublicAssistanceGrantAwardActivities || [];
      console.log(`      💰 FEMA PA Grants: ${records.length} recent awards`);

      for (const rec of records) {
        const amount = rec.federalShareObligated ? `$${Number(rec.federalShareObligated).toLocaleString()}` : 'N/A';
        const headline = `FEMA Grant: ${amount} to ${rec.applicantName}`;
        const summary = `Project: "${rec.projectTitle}" | Disaster #${rec.disasterNumber} (${rec.incidentType}) | Obligated: ${rec.obligationDate?.split('T')[0]}`;
        
        findings.push({
          category: 'government_records',
          subcategory: 'fema_grant',
          signals: ['funding'],
          headline: sanitize(headline),
          summary: sanitize(summary),
          source: 'OpenFEMA',
          sourceUrl: `https://www.fema.gov/disaster/${rec.disasterNumber}`,
          entities: ['FEMA', rec.applicantName || 'Unknown'].filter(Boolean),
          moneyMentioned: [amount],
          timestamp: rec.obligationDate || new Date().toISOString(),
          fingerprint: fingerprint(`fema-pa-${rec.disasterNumber}-${rec.applicantName}-${rec.obligationDate}`),
          depth: 'api_record',
        });
      }
    }
  } catch (err) {
    console.error(`      ❌ FEMA API: ${err.message}`);
  }

  return findings;
}

// ─── USAspending: Federal contracts & grants to PR ───

async function scanUSASpending() {
  console.log('      💵 Querying USAspending...');
  const findings = [];

  try {
    // State spending summary for PR
    const stateUrl = 'https://api.usaspending.gov/api/v2/recipient/state/PR/';
    const stateJson = await safeRequest(stateUrl, {
      headers: { 'Accept': 'application/json' },
      timeout: 20000
    });

    if (stateJson) {
      const data = JSON.parse(stateJson);
      const totalAwarded = data.total_prime_amount ? `$${(data.total_prime_amount / 1e9).toFixed(2)}B` : 'N/A';
      const totalFace = data.total_face_value_loan_amount ? `$${(data.total_face_value_loan_amount / 1e9).toFixed(2)}B` : 'N/A';
      
      findings.push({
        category: 'government_records',
        subcategory: 'federal_spending',
        signals: ['funding'],
        headline: `Total Federal Spending in PR: ${totalAwarded} awarded`,
        summary: `Total prime awards: ${totalAwarded}. Loan face value: ${totalFace}. Breakdown by type available. Population: ${data.population?.toLocaleString() || 'N/A'}`,
        source: 'USAspending.gov',
        sourceUrl: 'https://www.usaspending.gov/state/puerto-rico/72',
        entities: ['Federal Gov', 'PR Government'],
        moneyMentioned: [totalAwarded, totalFace].filter(v => v !== 'N/A'),
        timestamp: new Date().toISOString(),
        fingerprint: fingerprint(`usaspending-pr-total-${new Date().toISOString().split('T')[0]}`),
        depth: 'api_record',
      });
    }

    // Recent new awards — search for PR contracts
    const searchPayload = {
      filters: {
        recipient_locations: [{ country: 'USA', state: 'PR' }],
        time_period: [{ 
          start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0] 
        }],
        award_type_codes: ['A', 'B', 'C', 'D'], // Contracts
      },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Description', 'Start Date'],
      sort: 'Award Amount',
      order: 'desc',
      limit: 10,
      page: 1,
    };

    const searchRes = await safeRequest('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      timeout: 25000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(searchPayload),
    });

    // Note: safeRequest is GET-only in current impl — this will need fetch override
    // For now, we'll use the state-level data which works with GET

  } catch (err) {
    console.error(`      ❌ USAspending: ${err.message}`);
  }

  return findings;
}

// ─── Contralor: Scrape public contract search for recent entries ───

async function scanContralor() {
  console.log('      📋 Scanning Contralor records...');
  const findings = [];

  try {
    // The Contralor's contract registry is at consultacontratos.ocpr.gov.pr
    // It's a web app — we can scrape the public search page
    const html = await safeRequest('https://consultacontratos.ocpr.gov.pr/', { timeout: 20000 });
    
    if (html) {
      // Extract any visible contract data from the page
      // The page loads dynamically so we capture what's available
      console.log(`      📋 Contralor: page fetched (${html.length} bytes)`);
      
      // Look for contract amounts in the page
      const contractMatches = html.match(/\$[\d,]+(?:\.\d{2})?/g);
      if (contractMatches && contractMatches.length > 0) {
        findings.push({
          category: 'government_records',
          subcategory: 'contralor_contracts',
          signals: ['corruption'],
          headline: `Contralor Contract Registry: ${contractMatches.length} amounts found on main page`,
          summary: `Public contract registry active. Top amounts: ${contractMatches.slice(0, 5).join(', ')}. Full search at consultacontratos.ocpr.gov.pr`,
          source: 'Contraloría PR',
          sourceUrl: 'https://consultacontratos.ocpr.gov.pr/',
          entities: ['PR Government'],
          moneyMentioned: contractMatches.slice(0, 5),
          timestamp: new Date().toISOString(),
          fingerprint: fingerprint(`contralor-scan-${new Date().toISOString().split('T')[0]}`),
          depth: 'scrape',
        });
      }
    }

    // Also check Contralor audit reports RSS
    const auditXml = await safeRequest('https://www.ocpr.gov.pr/feed/');
    if (auditXml) {
      const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
      let match;
      let count = 0;
      while ((match = itemRegex.exec(auditXml)) !== null && count < 5) {
        const block = match[1];
        const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        
        if (titleMatch) {
          const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          if (/informe|auditor|hallazgo|irregularidad/i.test(title)) {
            findings.push({
              category: 'government_records',
              subcategory: 'audit_report',
              signals: ['scandal', 'corruption'],
              headline: sanitize(title),
              summary: `Informe de auditoría de la Contraloría de Puerto Rico`,
              source: 'Contraloría PR',
              sourceUrl: linkMatch ? linkMatch[1].replace(/<[^>]+>/g, '').trim() : '',
              entities: ['PR Government'],
              timestamp: new Date().toISOString(),
              fingerprint: fingerprint(title),
              depth: 'rss',
            });
            count++;
          }
        }
      }
      console.log(`      📋 Contralor Audits: ${count} reports found`);
    }
  } catch (err) {
    console.error(`      ❌ Contralor: ${err.message}`);
  }

  return findings;
}

// ─── Main scan ───

async function scan() {
  console.log('   🏛️ [L2] Government Records...');
  
  const [femaResults, usaResults, contralorResults] = await Promise.allSettled([
    scanFEMA(),
    scanUSASpending(),
    scanContralor(),
  ]);

  const findings = [];
  if (femaResults.status === 'fulfilled') findings.push(...(femaResults.value || []));
  if (usaResults.status === 'fulfilled') findings.push(...(usaResults.value || []));
  if (contralorResults.status === 'fulfilled') findings.push(...(contralorResults.value || []));

  console.log(`   🏛️ [L2] Government Records: ${findings.length} findings`);
  return findings;
}

module.exports = { scan };
