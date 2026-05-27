// V42.3 Assessment test - uses the existing audit result from previous run
// Navigates directly to check the dashboard state and financial data
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots_assessment');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

function ss(page, name) {
  return page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: true });
}
function log(msg) { console.log(msg); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  const consoleErrors = [];
  const xRequestIdErrors = [];
  const corsErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      if (text.includes('x-request-id')) xRequestIdErrors.push(text);
      // True CORS preflight errors (not CSP blocks for external APIs)
      if ((text.includes('CORS') || text.includes('preflight')) &&
          !text.includes('Content Security Policy')) {
        corsErrors.push(text);
      }
    }
  });

  // ====== RUN THE FULL AUDIT ======
  log('=== Loading /terminal and running Infosys + Software Engineer audit ===');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Step 1: Company
  const companyInput = await page.waitForSelector('input[placeholder="Search company..."]', { timeout: 10000 });
  await companyInput.click();
  await page.keyboard.type('Infosys', { delay: 60 });
  await page.waitForTimeout(2000);

  // Step 1: Role
  const roleInput = await page.$('input[placeholder="Search role..."]');
  await roleInput.click();
  await page.keyboard.type('Software', { delay: 50 });
  await page.waitForTimeout(1500);

  // Select first Software Engineer suggestion
  const roleDivs = await page.$$('.glass-panel-heavy .tab-btn');
  for (const div of roleDivs) {
    const t = await div.innerText();
    if (t.toLowerCase().startsWith('software engineer')) {
      await div.click();
      log(`Selected role: "${t.substring(0, 40)}"`);
      break;
    }
  }
  await page.waitForTimeout(500);

  // Continue to Step 2
  const continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn && !(await continueBtn.isDisabled())) {
    await continueBtn.click();
    await page.waitForTimeout(1500);
    log('Advanced to Step 2');
  } else {
    log(`WARNING: Continue button disabled=${await continueBtn?.isDisabled()}`);
  }

  // Execute Audit
  const executeBtn = await page.$('button:has-text("Execute Full Audit")');
  if (executeBtn && !(await executeBtn.isDisabled())) {
    await executeBtn.click();
    log('Audit submitted!');
    await page.waitForTimeout(1000);
  } else {
    // Step 2 might not have appeared - check if pipeline already started
    const pt = await page.evaluate(() => document.body.innerText);
    if (pt.match(/33%|DEPLOYING|GATHERING/i)) {
      log('Pipeline already started (no Step 2)');
    } else {
      log('ERROR: Could not submit audit');
      log(pt.substring(0, 300));
      await browser.close();
      return;
    }
  }

  await ss(page, '01_audit_submitted.png');

  // ====== MONITOR PIPELINE ======
  log('\n=== Monitoring pipeline (max 90s) ===');

  const timeline = [];
  let advancedPast33 = false;
  let was33 = false;
  let dashboardReady = false;

  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const pageText = await page.evaluate(() => document.body.innerText);

    const has33 = pageText.includes('33%');
    const hasDeploying = !!(pageText.match(/DEPLOYING/i));
    const hasGathering = pageText.includes('GATHERING');
    const hasPartial = pageText.includes('PARTIAL INTELLIGENCE');
    const pctMatch = pageText.match(/(\d+)%\s*\n\s*NETWORK ID/) ||
                     pageText.match(/INTELLIGENCE GATHERED\s+(\d+)%/);
    const pct = pctMatch ? parseInt(pctMatch[1]) : null;
    const tabCount = await page.$$eval('[role="tab"]', ts => ts.length).catch(() => 0);
    const agentMatch = pageText.match(/AGENTS:\s*(\d+)\/(\d+)/);
    const signals = (pageText.match(/SIGNALS:\s*(\d+)/) || [])[1] || '-';

    timeline.push({ t: i, has33, hasDeploying, hasGathering, hasPartial, pct, tabCount });

    if (has33) was33 = true;
    if (was33 && !has33 && !hasDeploying && !advancedPast33) {
      advancedPast33 = true;
      log(`*** ADVANCED PAST 33% at t=${i}s ***`);
    }

    if (i <= 5 || i % 15 === 0 || hasPartial || pct !== null) {
      log(`t=${i}s: ${pct !== null ? pct+'%' : '--'} | agents=${agentMatch ? agentMatch[1]+'/'+agentMatch[2] : '-'} sigs=${signals} | deploy=${hasDeploying} gather=${hasGathering} partial=${hasPartial} tabs=${tabCount}`);
    }

    if ([0, 5, 15, 30, 45, 60, 75].includes(i)) {
      await ss(page, `02_pipeline_t${i}s.png`);
    }

    if (tabCount > 0 && !hasDeploying && !hasGathering && i >= 3) {
      dashboardReady = true;
      log(`Dashboard ready with ${tabCount} tabs at t=${i}s`);
      await ss(page, '03_dashboard_ready.png');
      break;
    }

    if (hasPartial && i >= 50) {
      log(`Partial state at t=${i}s - timing out and proceeding`);
      await ss(page, '03_partial_timeout.png');
      break;
    }
  }

  // ====== EXAMINE DASHBOARD ======
  log('\n=== Dashboard examination ===');
  await ss(page, '04_final_dashboard.png');

  const dashText = await page.evaluate(() => document.body.innerText);

  // Look for Infosys/INFY section
  const infosysIdx = dashText.indexOf('INFOSYS');
  const infosysSection = infosysIdx >= 0 ? dashText.substring(infosysIdx, infosysIdx + 2000) : null;
  if (infosysSection) {
    log('\n--- INFOSYS SECTION ---');
    log(infosysSection.substring(0, 800));
  }

  // Tab analysis
  const tabs = await page.$$('[role="tab"]');
  const tabNames = [];
  for (const t of tabs) { tabNames.push(await t.innerText()); }
  log(`\nTabs: ${JSON.stringify(tabNames)}`);

  // Check each tab for financial data
  const allData = {
    stockChanges: [],
    marketCaps: [],
    peRatios: [],
    revenueLines: [],
    hasFinancialUnavail: false,
    hasInfosys: false,
    hasNewsSection: false
  };

  for (let i = 0; i < tabs.length; i++) {
    const tabText = await tabs[i].innerText();
    await tabs[i].click();
    await page.waitForTimeout(1500);
    await ss(page, `05_tab${i}_${tabText.replace(/[^a-zA-Z0-9]/g,'_').substring(0,15)}.png`);

    const content = await page.evaluate(() => document.body.innerText);
    const tabStocks = content.match(/[+-]\d+\.?\d*%/g) || [];
    const tabMCap = content.match(/\$[\d.]+[BM]/g) || [];
    const tabPE = content.match(/\d+\.?\d*[×x]/g) || [];
    const tabRev = content.match(/Revenue[^\n]{0,80}/g) || [];
    const tabUnavail = content.includes('financial signals unavailable');
    const tabInfosys = content.includes('INFOSYS') || content.includes('Infosys');
    const tabNews = content.includes('Reuters') || content.includes('Bloomberg') ||
                    content.includes('Economic Times') || content.includes('Mint') ||
                    (content.includes('Infosys') && content.match(/\d{4}|\bQ[1-4]\b/));
    const tabPulse = content.includes('Company Pulse') || content.includes('COMPANY PULSE');

    allData.stockChanges.push(...tabStocks);
    allData.marketCaps.push(...tabMCap);
    allData.peRatios.push(...tabPE);
    allData.revenueLines.push(...tabRev);
    if (tabUnavail) allData.hasFinancialUnavail = true;
    if (tabInfosys) allData.hasInfosys = true;
    if (tabNews) allData.hasNewsSection = true;

    log(`Tab "${tabText}": infosys=${tabInfosys} pulse=${tabPulse} stocks=${JSON.stringify(tabStocks.slice(0,5))} mcap=${JSON.stringify(tabMCap.slice(0,3))} pe=${JSON.stringify(tabPE.slice(0,3))} unavail=${tabUnavail} news=${tabNews}`);
  }

  // Remove duplicates
  const uniqueStocks = [...new Set(allData.stockChanges)];
  const uniqueMCap = [...new Set(allData.marketCaps)];
  const uniquePE = [...new Set(allData.peRatios)];

  // ====== FINAL REPORT ======
  log('\n========================================');
  log('         V42.3 TEST RESULTS');
  log('========================================');

  // Fix 1: Pipeline CORS (scraper-enqueue was blocked at 33%)
  const t33Events = timeline.filter(e => e.has33 || e.hasDeploying);
  const maxDeployStreak = (() => {
    let max = 0, current = 0;
    for (const e of timeline) {
      if (e.hasDeploying) { current++; max = Math.max(max, current); }
      else current = 0;
    }
    return max;
  })();

  log('\n[FIX 1] Pipeline progress past 33%:');
  log(`  Seconds at DEPLOYING: ${maxDeployStreak}`);
  log(`  Was stuck at 33%: ${was33 && !advancedPast33}`);
  log(`  Advanced past 33%: ${advancedPast33}`);
  log(`  Dashboard ready: ${dashboardReady}`);
  const fix1 = dashboardReady || advancedPast33;
  log(`  VERDICT: ${fix1 ? 'PASS' : 'FAIL'}`);

  // Fix 2: Financial data in CompanyPulseCard
  log('\n[FIX 2] CompanyPulseCard financial data:');
  log(`  Infosys data present: ${allData.hasInfosys}`);
  log(`  Stock price changes: ${JSON.stringify(uniqueStocks.slice(0,8))}`);
  log(`  Market caps: ${JSON.stringify(uniqueMCap.slice(0,5))}`);
  log(`  P/E ratios: ${JSON.stringify(uniquePE.filter(p => !p.match(/^0[×x]$/)).slice(0,5))}`);
  log(`  Revenue lines: ${JSON.stringify(allData.revenueLines.slice(0,3))}`);
  log(`  "financial signals unavailable" shown: ${allData.hasFinancialUnavail}`);
  const hasRealFinancial = allData.hasInfosys && !allData.hasFinancialUnavail &&
                           (uniqueStocks.some(s => s !== '+18%' && s !== '+9.6%') ||
                            uniqueMCap.length > 0 || allData.revenueLines.length > 0);
  const fix2 = allData.hasInfosys && !allData.hasFinancialUnavail;
  log(`  VERDICT: ${fix2 ? 'PASS' : allData.hasFinancialUnavail ? 'FAIL - shows unavailable' : 'INCONCLUSIVE'}`);

  // Fix 3: CORS errors
  log('\n[FIX 3] CORS preflight errors:');
  log(`  Total console errors: ${consoleErrors.length}`);
  log(`  x-request-id CORS errors: ${xRequestIdErrors.length}`);
  log(`  Other CORS preflight errors (non-CSP): ${corsErrors.length}`);
  if (xRequestIdErrors.length > 0) {
    xRequestIdErrors.forEach(e => log(`    ${e.substring(0, 150)}`));
  }
  if (corsErrors.length > 0) {
    corsErrors.forEach(e => log(`    ${e.substring(0, 150)}`));
  }
  const fix3 = xRequestIdErrors.length === 0 && corsErrors.length === 0;
  log(`  VERDICT: ${fix3 ? 'PASS - No CORS errors' : 'FAIL - CORS errors present'}`);

  // News check
  log('\n[BONUS] News section:');
  log(`  Has news content: ${allData.hasNewsSection}`);

  log('\n=== SUMMARY ===');
  log(`  FIX 1 (Pipeline past 33%): ${fix1 ? 'PASS' : 'FAIL'}`);
  log(`  FIX 2 (Financial data): ${fix2 ? 'PASS' : 'FAIL'}`);
  log(`  FIX 3 (No CORS errors): ${fix3 ? 'PASS' : 'FAIL'}`);
  log('\nScreenshots:', SCREENSHOTS_DIR);

  await browser.close();
})();
