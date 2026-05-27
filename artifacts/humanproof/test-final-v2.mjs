import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  const infos = [];
  const networkFails = [];
  const supabaseCalls = [];
  const allLogs = [];

  page.on('console', msg => {
    const text = msg.text();
    allLogs.push({ type: msg.type(), text: text.slice(0, 500) });
    if (msg.type() === 'error') errors.push({ text, loc: msg.location() });
    else if (msg.type() === 'warning') warnings.push({ text });
    // Capture interesting logs
    if (text.length > 5) {
      infos.push({ type: msg.type(), text: text.slice(0, 500) });
    }
  });
  page.on('pageerror', err => errors.push({ text: err.message, stack: err.stack?.slice(0, 500) }));
  page.on('response', async resp => {
    const url = resp.url();
    const status = resp.status();
    if (status >= 400) networkFails.push({ url: url.slice(0, 150), status });
    if (url.includes('supabase.co')) {
      try {
        const body = await resp.text();
        supabaseCalls.push({ url: url.slice(0, 140), status, body: body.slice(0, 500) });
      } catch(e) {}
    }
  });

  console.log('=== TEST START ===');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle', timeout: 30000 });

  // Step 1: Company + Role
  const companyInput = await page.$('input[placeholder="Search company..."]');
  await companyInput.click();
  await companyInput.fill('Infosys');
  await page.waitForTimeout(800);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);

  const roleInput = await page.$('input[placeholder="Search role..."]');
  if (roleInput) {
    await roleInput.click();
    await roleInput.fill('Software Engineer');
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  await page.locator('button:has-text("Continue Analysis")').click({ force: true });
  await page.waitForTimeout(2000);

  // Step 2: Individual factors — click available options
  try { await page.locator('text=High').first().click({ force: true }); } catch(e) {}
  await page.waitForTimeout(200);
  try { await page.locator('text=Specialist').first().click({ force: true }); } catch(e) {}
  await page.waitForTimeout(200);

  // Click Execute Full Audit
  await page.locator('button:has-text("Execute Full Audit")').click({ force: true });
  console.log('Clicked Execute Full Audit, waiting for pipeline...');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'v2-01-loading.png', fullPage: true });

  // Wait up to 120s for the audit to complete
  let auditDone = false;
  let finalPageText = '';
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(5000);
    const text = await page.evaluate(() => document.body.innerText);
    finalPageText = text;

    const isDashboard = text.match(/Company Pulse|Workforce|Financial Health|\/100|MODERATE|CRITICAL|HEALTHY|Layoff Risk/i);
    const isLoading = text.match(/LIVE INTELLIGENCE FETCH|ACQUIRING|stage \d|Resolving company|Auto-completes/i);
    const isError = text.match(/something went wrong|error occurred|failed to load|timed out/i);
    const pct = text.match(/(\d{1,3})%\s*(?:\n|Auto)/);

    if (isDashboard) {
      auditDone = true;
      console.log(`DONE at iteration ${i+1}`);
      break;
    } else if (isError) {
      console.log(`ERROR STATE at iteration ${i+1}: ${isError[0]}`);
      break;
    } else if (isLoading) {
      console.log(`Loading (${i+1}/24): ${isLoading[0]} ${pct ? pct[0] : ''}`);
      if (i === 5 || i === 10 || i === 15 || i === 20) {
        await page.screenshot({ path: `v2-loading-${i+1}.png`, fullPage: true });
      }
    } else {
      console.log(`Iteration ${i+1}: ${text.slice(0, 200).replace(/\n/g, ' ')}`);
    }
  }

  await page.screenshot({ path: 'v2-02-final.png', fullPage: true });

  // Extract page text
  const pageText = await page.evaluate(() => document.body.innerText);

  const checks = {
    hasScore: /\d{1,2}\/100/.test(pageText),
    hasWorkforceData: /Workforce.*(?:Stable|Distressed|Critical|Healthy|Softening)/i.test(pageText),
    hasFinancialData: /Financial.*(?:Stable|Distressed|Critical|Healthy|Softening)/i.test(pageText),
    hasMarketCap: /Mkt Cap|\$\d+\.?\d*[BT]/i.test(pageText),
    hasPeRatio: /P\/E.*[\d.]+[×x]|[\d.]+[×x]/i.test(pageText),
    hasStock90d: /Stock.*[-+]\d+%|[-+]\d+%.*90[Dd]/i.test(pageText),
    hasRevenue: /Revenue.*[-+]\d+%/i.test(pageText),
    hasHiringTrend: /growing|declining|frozen|stable.*hiring|hiring.*stable/i.test(pageText),
    hasEmployeeCount: /\d[\d,]+.*employees|employees.*\d[\d,]+/i.test(pageText),
    hasLiveSignals: /live.*signal|signal.*live|LIVE.*SIGNAL/i.test(pageText),
    hasCorsError: /CORS|blocked.*preflight|preflight.*blocked/i.test(pageText),
    hasCompanyPulse: /Company Pulse/i.test(pageText),
    hasRiskScore: /Risk Score|Overall Risk|Layoff Risk/i.test(pageText),
    hasConfidence: /confidence|Confidence/i.test(pageText),
    hasDashboard: /Summary|Company|Protection|Action Plan|Intelligence|Transparency/i.test(pageText),
    hasFinnhubData: /\$[\d.]+[BT]/i.test(pageText),
    hasStockData: /[\d.]+[×x]/.test(pageText),
    hasErrorMsg: /something went wrong|error occurred|failed to load/i.test(pageText),
    hasHeuristicLabel: /heuristic|HEURISTIC|estimated|ESTIMATED|MODELED/i.test(pageText),
    isStillLoading: /LIVE INTELLIGENCE FETCH|ACQUIRING|Auto-completes/i.test(pageText),
  };

  console.log('\n=== CHECKS ===');
  for (const [k, v] of Object.entries(checks)) console.log(`  ${v ? '✅' : '❌'} ${k}`);

  // Capture full page at final state
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'v2-03-top.png' });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.screenshot({ path: 'v2-04-mid.png' });
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.screenshot({ path: 'v2-05-lower.png' });
  await page.evaluate(() => window.scrollTo(0, 2500));
  await page.screenshot({ path: 'v2-06-bottom.png' });

  // Try tabs
  console.log('\n=== TABS ===');
  for (const tab of ['Summary', 'Company', 'Risk', 'Protection', 'Action Plan', 'Intelligence', 'Transparency']) {
    try {
      const el = await page.$(`[role="tab"]:has-text("${tab}"), button:has-text("${tab}")`);
      if (el && await el.isVisible()) {
        await el.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `v2-tab-${tab.toLowerCase().replace(/\s+/g, '-')}.png`, fullPage: true });
        const t = await page.evaluate(() => document.body.innerText.slice(0, 800));
        console.log(`[${tab}] ${t.replace(/\n/g, ' ').slice(0, 300)}`);
      }
    } catch(e) {}
  }

  // Comprehensive output
  console.log('\n=== ERRORS ===');
  errors.forEach((e, i) => console.log(`  [${i+1}/${errors.length}] ${(typeof e.text === 'string' ? e.text : '').slice(0, 250)}`));

  console.log('\n=== WARNINGS ===');
  warnings.slice(0, 10).forEach(w => console.log(`  ${w.text?.slice(0, 200)}`));

  console.log('\n=== NETWORK FAILURES ===');
  networkFails.forEach(f => console.log(`  [${f.status}] ${f.url}`));

  console.log('\n=== SUPABASE CALLS ===');
  supabaseCalls.forEach(c => console.log(`  [${c.status}] ${c.url.slice(0, 110)}`));

  console.log('\n=== ALL CONSOLE LOGS (filtered) ===');
  infos
    .filter(l => l.type === 'error' || l.text.includes('[') || l.text.includes('CORS') || l.text.includes('Error'))
    .slice(0, 40)
    .forEach(l => console.log(`  [${l.type.toUpperCase()}] ${l.text}`));

  console.log('\n=== PAGE TEXT ===');
  console.log(pageText.slice(0, 8000));

  const report = {
    auditDone, checks, errors: errors.slice(0, 30), warnings: warnings.slice(0, 15),
    networkFails, supabaseCalls, notableLogs: infos.slice(0, 60),
    pageTextPreview: pageText.slice(0, 10000), allLogsCount: allLogs.length
  };
  fs.writeFileSync('final-report.json', JSON.stringify(report, null, 2));
  console.log('\nSaved to final-report.json, total logs:', allLogs.length);

  await browser.close();
})();
