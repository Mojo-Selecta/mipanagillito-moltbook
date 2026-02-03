// ═══════════════════════════════════════════════════════
// 🏛️ LEVEL 2: GOVERNMENT RECORDS
// ═══════════════════════════════════════════════════════
// PATH: scripts/recon/gov-records.js

const path = require('path');
const { safeRequest, fingerprint, sanitize, classifyText } = require(path.join(__dirname, '..', 'lib', 'recon-utils'));

async function scanFEMA() {
  console.log('      🌀 Querying OpenFEMA...');
  var findings = [];

  try {
    var oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
    var declUrl = "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=state eq 'PR' and declarationDate gt '" + oneYearAgo + "'&$orderby=declarationDate desc&$top=20";
    var declJson = await safeRequest(declUrl, { headers: { 'Accept': 'application/json' }, timeout: 20000 });

    if (declJson) {
      var data = JSON.parse(declJson);
      var records = data.DisasterDeclarationsSummaries || [];
      console.log('      🌀 FEMA Declarations: ' + records.length + ' recent');

      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var headline = 'FEMA ' + rec.declarationType + ': ' + (rec.declarationTitle || rec.incidentType);
        var programs = [rec.ihProgramDeclared ? 'Individual Assistance' : '', rec.iaProgramDeclared ? 'IA' : '', rec.paProgramDeclared ? 'Public Assistance' : '', rec.hmProgramDeclared ? 'Hazard Mitigation' : ''].filter(Boolean).join(', ') || 'N/A';
        var summary = 'Disaster #' + rec.disasterNumber + ' — ' + rec.incidentType + ' in PR. Declared: ' + (rec.declarationDate || '').split('T')[0] + '. Programs: ' + programs;

        findings.push({
          category: 'government_records', subcategory: 'fema_disaster',
          signals: ['funding', 'disaster'],
          headline: sanitize(headline), summary: sanitize(summary),
          source: 'OpenFEMA', sourceUrl: 'https://www.fema.gov/disaster/' + rec.disasterNumber,
          entities: ['FEMA', 'PR Government'],
          timestamp: rec.declarationDate || new Date().toISOString(),
          fingerprint: fingerprint('fema-' + rec.disasterNumber),
          depth: 'api_record',
          rawData: { disasterNumber: rec.disasterNumber, type: rec.incidentType,
            programs: { ih: rec.ihProgramDeclared, ia: rec.iaProgramDeclared, pa: rec.paProgramDeclared, hm: rec.hmProgramDeclared } },
        });
      }
    }

    var paUrl = "https://www.fema.gov/api/open/v2/PublicAssistanceGrantAwardActivities?$filter=state eq 'Puerto Rico'&$orderby=obligationDate desc&$top=15&$select=disasterNumber,applicantName,projectTitle,federalShareObligated,obligationDate,incidentType";
    var paJson = await safeRequest(paUrl, { headers: { 'Accept': 'application/json' }, timeout: 20000 });

    if (paJson) {
      var paData = JSON.parse(paJson);
      var paRecords = paData.PublicAssistanceGrantAwardActivities || [];
      console.log('      💰 FEMA PA Grants: ' + paRecords.length + ' recent awards');

      for (var j = 0; j < paRecords.length; j++) {
        var pr = paRecords[j];
        var amount = pr.federalShareObligated ? '$' + Number(pr.federalShareObligated).toLocaleString() : 'N/A';
        findings.push({
          category: 'government_records', subcategory: 'fema_grant',
          signals: ['funding'],
          headline: sanitize('FEMA Grant: ' + amount + ' to ' + pr.applicantName),
          summary: sanitize('Project: "' + pr.projectTitle + '" | Disaster #' + pr.disasterNumber + ' (' + pr.incidentType + ') | Obligated: ' + (pr.obligationDate || '').split('T')[0]),
          source: 'OpenFEMA', sourceUrl: 'https://www.fema.gov/disaster/' + pr.disasterNumber,
          entities: ['FEMA', pr.applicantName || 'Unknown'].filter(Boolean),
          moneyMentioned: [amount],
          timestamp: pr.obligationDate || new Date().toISOString(),
          fingerprint: fingerprint('fema-pa-' + pr.disasterNumber + '-' + pr.applicantName + '-' + pr.obligationDate),
          depth: 'api_record',
        });
      }
    }
  } catch (err) {
    console.error('      ❌ FEMA API: ' + err.message);
  }
  return findings;
}

async function scanUSASpending() {
  console.log('      💵 Querying USAspending...');
  var findings = [];
  try {
    var stateJson = await safeRequest('https://api.usaspending.gov/api/v2/recipient/state/PR/', {
      headers: { 'Accept': 'application/json' }, timeout: 20000
    });
    if (stateJson) {
      var data = JSON.parse(stateJson);
      var totalAwarded = data.total_prime_amount ? '$' + (data.total_prime_amount / 1e9).toFixed(2) + 'B' : 'N/A';
      var totalFace = data.total_face_value_loan_amount ? '$' + (data.total_face_value_loan_amount / 1e9).toFixed(2) + 'B' : 'N/A';
      findings.push({
        category: 'government_records', subcategory: 'federal_spending',
        signals: ['funding'],
        headline: 'Total Federal Spending in PR: ' + totalAwarded + ' awarded',
        summary: 'Total prime awards: ' + totalAwarded + '. Loan face value: ' + totalFace + '. Population: ' + (data.population ? data.population.toLocaleString() : 'N/A'),
        source: 'USAspending.gov', sourceUrl: 'https://www.usaspending.gov/state/puerto-rico/72',
        entities: ['Federal Gov', 'PR Government'],
        moneyMentioned: [totalAwarded, totalFace].filter(function(v) { return v !== 'N/A'; }),
        timestamp: new Date().toISOString(),
        fingerprint: fingerprint('usaspending-pr-total-' + new Date().toISOString().split('T')[0]),
        depth: 'api_record',
      });
    }
  } catch (err) {
    console.error('      ❌ USAspending: ' + err.message);
  }
  return findings;
}

async function scanContralor() {
  console.log('      📋 Scanning Contralor records...');
  var findings = [];
  try {
    var html = await safeRequest('https://consultacontratos.ocpr.gov.pr/', { timeout: 20000 });
    if (html) {
      console.log('      📋 Contralor: page fetched (' + html.length + ' bytes)');
      var contractMatches = html.match(/\$[\d,]+(?:\.\d{2})?/g);
      if (contractMatches && contractMatches.length > 0) {
        findings.push({
          category: 'government_records', subcategory: 'contralor_contracts',
          signals: ['corruption'],
          headline: 'Contralor Contract Registry: ' + contractMatches.length + ' amounts found on main page',
          summary: 'Public contract registry active. Top amounts: ' + contractMatches.slice(0, 5).join(', '),
          source: 'Contraloria PR', sourceUrl: 'https://consultacontratos.ocpr.gov.pr/',
          entities: ['PR Government'], moneyMentioned: contractMatches.slice(0, 5),
          timestamp: new Date().toISOString(),
          fingerprint: fingerprint('contralor-scan-' + new Date().toISOString().split('T')[0]),
          depth: 'scrape',
        });
      }
    }

    var auditXml = await safeRequest('https://www.ocpr.gov.pr/feed/');
    if (auditXml) {
      var itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
      var match;
      var count = 0;
      while ((match = itemRegex.exec(auditXml)) !== null && count < 5) {
        var block = match[1];
        var titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        var linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        if (titleMatch) {
          var title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          if (/informe|auditor|hallazgo|irregularidad/i.test(title)) {
            findings.push({
              category: 'government_records', subcategory: 'audit_report',
              signals: ['scandal', 'corruption'],
              headline: sanitize(title),
              summary: 'Informe de auditoria de la Contraloria de Puerto Rico',
              source: 'Contraloria PR',
              sourceUrl: linkMatch ? linkMatch[1].replace(/<[^>]+>/g, '').trim() : '',
              entities: ['PR Government'],
              timestamp: new Date().toISOString(),
              fingerprint: fingerprint(title), depth: 'rss',
            });
            count++;
          }
        }
      }
      console.log('      📋 Contralor Audits: ' + count + ' reports found');
    }
  } catch (err) {
    console.error('      ❌ Contralor: ' + err.message);
  }
  return findings;
}

async function scan() {
  console.log('   🏛️ [L2] Government Records...');
  var results = await Promise.allSettled([scanFEMA(), scanUSASpending(), scanContralor()]);
  var findings = [];
  if (results[0].status === 'fulfilled') findings.push.apply(findings, results[0].value || []);
  if (results[1].status === 'fulfilled') findings.push.apply(findings, results[1].value || []);
  if (results[2].status === 'fulfilled') findings.push.apply(findings, results[2].value || []);
  console.log('   🏛️ [L2] Government Records: ' + findings.length + ' findings');
  return findings;
}

module.exports = { scan };
