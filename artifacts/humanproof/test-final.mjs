import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
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
    if (text.includes('[Audit') || text.includes('[Live') || text.includes('[Pipeline') ||
        text.includes('CORS') || text.includes('[Quorum') || text.includes('[Cache') ||
        text.includes('[Scrape') || text.includes('[EF') || text.includes('[Swarm') ||
        text.includes('[Ensemble') || text.includes('[Company') || text.includes('[Score') ||
        text.includes('42703') || text.includes('23514') || text.includes('supabase') ||
        text.includes('circuit') || text.includes('fallback') || text.includes('[Finnhub') ||
        text.includes('[Yahoo') || text.includes('[News') || text.includes('timeout') ||
        text.includes('x-request-id') || text.includes('blocked by CORS') ||
        text.includes('preflight')) {
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
  await page.screenshot({ path: 'final-01-terminal.png', fullPage: true });

  // === STEP 1: Company + Role ===
  console.log('Filling Step 1: Company + Role...');

  const companyInput = await page.$('input[placeholder="Search company..."]');
  await companyInput.click();
  await companyInput.fill('Infosys');
  await page.waitForTimeout(1000);

  // Try to pick from dropdown, or press Tab to dismiss
  const dropdownVisible = await page.$('[class*="search-dropdown"], [class*="search-result"], [role="listbox"]');
  if (dropdownVisible) {
    console.log('Dropdown found, pressing Escape');
    await page.keyboard.press('Escape');
  } else {
    await page.keyboard.press('Tab');
  }
  await page.waitForTimeout(400);

  const roleInput = await page.$('input[placeholder="Search role..."]');
  if (roleInput) {
    await roleInput.click();
    await roleInput.fill('Software Engineer');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: 'final-02-step1-filled.png' });

  // Click Continue Analysis → (with force to bypass overlays)
  console.log('Clicking Continue Analysis...');
  await page.locator('button:has-text("Continue Analysis")').click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'final-03-step2.png', fullPage: true });

  // === STEP 2: Individual factors ===
  console.log('Filling Step 2: Individual factors...');

  // Select experience: "5+ years"
  try {
    await page.locator('text=5+ years').first().click({ force: true });
    console.log('Selected 5+ years experience');
    await page.waitForTimeout(300);
  } catch(e) { console.log('Could not click 5+ years:', e.message?.slice(0, 80)); }

  // Select total experience: "5-10 years"
  try {
    const exp5to10 = await page.$('button:has-text("5–10 years"), button:has-text("5-10 years")');
    if (exp5to10) { await exp5to10.click({ force: true }); console.log('Selected 5-10 yrs total'); }
  } catch(e) {}

  // Select performance: "High"
  try {
    await page.locator('text=High').first().click({ force: true });
    console.log('Selected High performance');
    await page.waitForTimeout(300);
  } catch(e) { console.log('Could not click High performance:', e.message?.slice(0, 80)); }

  // Select role uniqueness: "Specialist"
  try {
    await page.locator('text=Specialist').first().click({ force: true });
    console.log('Selected Specialist uniqueness');
    await page.waitForTimeout(300);
  } catch(e) { console.log('Could not click Specialist:', e.message?.slice(0, 80)); }

  await page.screenshot({ path: 'final-04-step2-filled.png' });

  // Click "Execute Full Audit →"
  console.log('Clicking Execute Full Audit...');
  try {
    await page.locator('button:has-text("Execute Full Audit")').click({ force: true });
    console.log('Clicked Execute Full Audit');
  } catch(e) {
    console.log('Execute Full Audit not found, trying alternatives...');
    const btns = await page.$$('button');
    for (const btn of btns) {
      const txt = await btn.evaluate(el => el.textContent?.trim() ?? '');
      if (txt.match(/Audit|Execute|Run|Analyze|Calculate/i) && !txt.match(/Risk Oracle/i)) {
        console.log('Clicking:', txt.slice(0, 50));
        await btn.click({ force: true });
        break;
      }
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'final-05-audit-started.png', fullPage: true });

  // Wait for audit pipeline — up to 90s
  console.log('Waiting for audit pipeline (90s max)...');
  let auditDone = false;
  for (let i = 0; i < 18; i++) {
    await page.waitForTimeout(5000);
    const text = await page.evaluate(() => document.body.innerText);

    // Check for dashboard/result indicators
    if (text.match(/\d{1,2}\/100|MODERATE|CRITICAL|HEALTHY|Company Pulse|Financial Health|Workforce|Risk Score|Layoff Risk/i)) {
      auditDone = true;
      console.log(`Audit done at iteration ${i+1}`);
      await page.screenshot({ path: `final-progress-${i+1}.png`, fullPage: true });
      break;
    }

    // Show current loading state
    const loadingMatch = text.match(/Resolving|Initializing|Fetching|Scanning|Building|Computing|Analyzing|Quorum|stage \d|(\d+)%/i);
    const pct = text.match(/(\d{1,3})%/);
    console.log(`Iteration ${i+1}: ${loadingMatch?.[0] ?? 'unknown state'} ${pct ? pct[0] : ''}`);

    if (i === 1 || i === 4 || i === 8) {
      await page.screenshot({ path: `final-progress-${i+1}.png`, fullPage: true });
    }
  }

  await page.screenshot({ path: 'final-06-audit-final.png', fullPage: true });
  const pageText = await page.evaluate(() => document.body.innerText);

  // Data checks
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
    hasFinnhubData: /\$[\d.]+[BT]|[\d.]+[×x]/i.test(pageText),
    hasErrorMsg: /something went wrong|error occurred|failed to load/i.test(pageText),
    hasHeuristicLabel: /heuristic|HEURISTIC|estimated|ESTIMATED/i.test(pageText),
    hasLoadingState: /Resolving|Initializing|Fetching|Loading|Analyzing|Scanning|stage/i.test(pageText),
  };

  console.log('\n=== COMPONENT DATA CHECKS ===');
  for (const [key, val] of Object.entries(checks)) {
    console.log(`  ${val ? '✅' : '❌'} ${key}`);
  }

  // Scroll screenshots
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'final-07-scroll-top.png' });
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.screenshot({ path: 'final-08-scroll-mid.png' });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.screenshot({ path: 'final-09-scroll-lower.png' });
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.screenshot({ path: 'final-10-scroll-bottom.png' });

  // Tab navigation
  console.log('\n=== TAB NAVIGATION ===');
  const tabNames = ['Summary', 'Company', 'Risk', 'Protection', 'Action Plan', 'Intelligence', 'Transparency'];
  for (const tabName of tabNames) {
    try {
      const tab = await page.$(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
      if (tab && await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(1000);
        const tabPath = `final-tab-${tabName.toLowerCase().replace(/\s+/g, '-')}.png`;
        await page.screenshot({ path: tabPath, fullPage: true });
        const tabText = await page.evaluate(() => document.body.innerText.slice(0, 1000).replace(/\n+/g, ' | '));
        console.log(`[${tabName}]: ${tabText.slice(0, 400)}`);
      }
    } catch(e) { console.log(`Tab ${tabName} error:`, e.message?.slice(0, 80)); }
  }

  // Detailed Error Summary
  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.forEach((e, i) => console.log(`  [${i+1}] ${(typeof e.text === 'string' ? e.text : JSON.stringify(e)).slice(0, 300)}`));

  console.log('\n=== WARNINGS (' + warnings.length + ') ===');
  warnings.slice(0, 8).forEach(w => console.log('  WARN:', w.text?.slice(0, 200)));

  console.log('\n=== NETWORK FAILURES (' + networkFails.length + ') ===');
  networkFails.forEach(f => console.log(`  [${f.status}] ${f.url}`));

  console.log('\n=== SUPABASE CALLS (' + supabaseCalls.length + ') ===');
  supabaseCalls.forEach(c => console.log(`  [${c.status}] ${c.url.slice(0, 100)}\n    ${c.body.slice(0, 200)}`));

  console.log('\n=== NOTABLE LOGS (' + infos.length + ') ===');
  infos.slice(0, 30).forEach(i => console.log(`  [${i.type.toUpperCase()}] ${i.text}`));

  console.log('\n=== PAGE TEXT (first 6000 chars) ===');
  console.log(pageText.slice(0, 6000));

  const report = {
    auditDone,
    checks,
    errors: errors.slice(0, 25),
    warnings: warnings.slice(0, 15),
    networkFails,
    supabaseCalls,
    notableLogs: infos,
    pageTextPreview: pageText.slice(0, 8000),
    allLogsCount: allLogs.length
  };
  fs.writeFileSync('final-report.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to final-report.json');
  console.log('Total console logs:', allLogs.length);

  await browser.close();
})();
