// v42.3 CORS fixes end-to-end verification test
// Tests: pipeline past 33%, dashboard renders, CompanyPulseCard financial data, zero CORS errors
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = 'C:\\supabase\\humanproofs1\\artifacts\\humanproof\\test_v43_screenshots';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const ss = (page, name) => page.screenshot({ path: path.join(OUT, name), fullPage: false });
const log = (msg) => { console.log(`[${new Date().toISOString().substring(11,23)}] ${msg}`); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // Capture ALL console errors + CORS-specific ones
  const errors = [];
  const xReqErrs = [];
  const realCors = [];
  const allConsole = [];

  page.on('console', msg => {
    const t = msg.text();
    allConsole.push({ type: msg.type(), text: t.substring(0, 300) });
    if (msg.type() === 'error') {
      errors.push(t);
      if (t.includes('x-request-id')) xReqErrs.push(t);
      if ((t.includes('CORS') || t.includes('preflight') || t.includes('has been blocked'))
          && !t.includes('Content Security Policy'))
        realCors.push(t);
    }
  });

  page.on('pageerror', err => {
    errors.push('PageError: ' + err.message);
  });

  // ── Step 1: Load the app ────────────────────────────────────────────────────────
  log('STEP 1: Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await ss(page, 'test_v43_001_landing.png');
  log('Landing page loaded');

  // Check if we're on /terminal or need to navigate there
  const url = page.url();
  log(`Current URL: ${url}`);

  let onWizard = false;

  // Look for company input on current page
  let compInput = await page.$('input[placeholder*="company" i], input[placeholder*="Company" i], input[placeholder*="Search company" i]');
  if (!compInput) {
    // Try navigating to /terminal
    log('No company input found, trying /terminal...');
    await page.goto('http://localhost:5173/terminal', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await ss(page, 'test_v43_002_terminal.png');
    compInput = await page.$('input[placeholder*="company" i], input[placeholder*="Company" i], input[placeholder*="Search company" i]');
  }

  if (!compInput) {
    // Try clicking a CTA button to open the wizard
    log('Looking for CTA to start wizard...');
    const ctaBtn = await page.$('button:has-text("Start"), button:has-text("Get Started"), button:has-text("Analyze"), button:has-text("Check"), a:has-text("Start")');
    if (ctaBtn) {
      await ctaBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'test_v43_003_after_cta.png');
      compInput = await page.$('input[placeholder*="company" i], input[placeholder*="Company" i], input[placeholder*="Search company" i]');
    }
  }

  if (!compInput) {
    // Dump page for diagnosis
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 800));
    log('ERROR: Could not find company input. Page text: ' + bodyText);
    await ss(page, 'test_v43_ERROR_no_input.png');
    await browser.close();
    process.exit(1);
  }

  // ── Step 2: Enter company "Infosys" ────────────────────────────────────────────
  log('STEP 2: Typing "Infosys" in company input...');
  await compInput.click();
  await page.keyboard.type('Infosys', { delay: 60 });
  await page.waitForTimeout(2500);
  await ss(page, 'test_v43_004_company_typed.png');

  // Try to select from dropdown
  const dropdownItems = await page.$$('.glass-panel-heavy .tab-btn, [role="option"], [data-value], .company-option, .dropdown-item, ul[role="listbox"] li');
  log(`Dropdown items found: ${dropdownItems.length}`);

  if (dropdownItems.length > 0) {
    const firstText = await dropdownItems[0].innerText().catch(() => '');
    log(`Clicking first dropdown item: "${firstText.substring(0, 60)}"`);
    await dropdownItems[0].click();
    await page.waitForTimeout(1000);
  } else {
    // Try pressing Enter or Tab to confirm
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
  await ss(page, 'test_v43_005_company_selected.png');

  // ── Step 3: Enter role ──────────────────────────────────────────────────────────
  log('STEP 3: Looking for role input...');
  const roleInput = await page.$('input[placeholder*="role" i], input[placeholder*="Role" i], input[placeholder*="Search role" i]');

  if (roleInput) {
    await roleInput.click();
    await page.keyboard.type('Software Engineer', { delay: 50 });
    await page.waitForTimeout(1500);
    await ss(page, 'test_v43_006_role_typed.png');

    // Pick from dropdown
    const roleBtns = await page.$$('.glass-panel-heavy .tab-btn, [role="option"], .role-option');
    log(`Role suggestions: ${roleBtns.length}`);

    let picked = false;
    for (const btn of roleBtns) {
      const t = await btn.innerText().catch(() => '');
      if (t.toLowerCase().includes('software engineer')) {
        log(`Selecting role: "${t.substring(0, 60)}"`);
        await btn.click();
        picked = true;
        break;
      }
    }
    if (!picked && roleBtns.length > 0) {
      const t = await roleBtns[0].innerText().catch(() => 'first');
      log(`Fallback role pick: "${t.substring(0, 60)}"`);
      await roleBtns[0].click();
    }
    await page.waitForTimeout(500);
    await ss(page, 'test_v43_007_role_selected.png');
  } else {
    log('No role input found - wizard may be single-step');
  }

  // ── Step 4: Click Continue / Execute ───────────────────────────────────────────
  log('STEP 4: Looking for Continue Analysis button...');
  let contBtn = await page.$('button:has-text("Continue Analysis"), button:has-text("Continue"), button:has-text("Next"), button:has-text("Analyze")');

  if (contBtn) {
    const disabled = await contBtn.isDisabled();
    log(`Continue button found, disabled=${disabled}`);
    if (!disabled) {
      await contBtn.click();
      log('Clicked Continue Analysis');
      await page.waitForTimeout(2000);
      await ss(page, 'test_v43_008_after_continue.png');
    }
  }

  // Wait for Step 2 / Execute Full Audit button
  log('Waiting up to 15s for Execute Full Audit button...');
  let step2Found = false;
  for (let w = 0; w < 15; w++) {
    await page.waitForTimeout(1000);
    const execBtn = await page.$('button:has-text("Execute Full Audit"), button:has-text("Execute Audit"), button:has-text("Run Audit"), button:has-text("Start Audit")');
    if (execBtn) { step2Found = true; log(`Execute Audit button appeared at t=${w+1}s`); break; }
    const txt = await page.evaluate(() => document.body.innerText);
    if (txt.includes('Individual Factors') || txt.includes('Execute') || txt.includes('Audit')) {
      step2Found = true;
      log('Audit-related content found in page');
      break;
    }
  }
  await ss(page, 'test_v43_009_step2.png');

  // ── Step 5: Execute Full Audit ─────────────────────────────────────────────────
  let execBtn = await page.$('button:has-text("Execute Full Audit"), button:has-text("Execute Audit")');
  if (!execBtn) {
    // Try finding any prominent action button
    const txt = await page.evaluate(() => document.body.innerText.substring(0, 500));
    log('Execute button not found. Page text: ' + txt);

    // Maybe wizard went directly to audit
    const auditStarted = txt.includes('NETWORK ID') || txt.includes('GATHERING') || txt.includes('DEPLOYING') || txt.includes('%');
    if (auditStarted) {
      log('Pipeline already started without button click!');
    } else {
      await browser.close();
      process.exit(1);
    }
  } else {
    log('STEP 5: Clicking Execute Full Audit...');
    await execBtn.click();
    await page.waitForTimeout(1000);
    await ss(page, 'test_v43_010_audit_submitted.png');
    log('Audit submitted!');
  }

  // ── Step 6: Monitor pipeline progress ──────────────────────────────────────────
  log('\n=== STEP 6: Monitoring pipeline (max 90s) ===');

  let was33 = false;
  let past33 = false;
  let dashboardDone = false;
  let maxPctSeen = 0;
  let stuckAt33Count = 0;
  const timeline = [];

  for (let t = 0; t < 90; t++) {
    await page.waitForTimeout(1000);
    const txt = await page.evaluate(() => document.body.innerText);

    // Detect progress indicators
    const at33 = txt.includes('33%');
    const isDeploying = /DEPLOYING|deploying/i.test(txt);
    const isGathering = /GATHERING|gathering/i.test(txt);
    const isPartial = txt.includes('PARTIAL INTELLIGENCE') || txt.includes('partial intelligence');

    // Extract percentage
    const pctMatch = txt.match(/(\d+)%/) || [];
    const pct = pctMatch[1] ? parseInt(pctMatch[1]) : null;
    if (pct !== null && pct > maxPctSeen) maxPctSeen = pct;

    // Count tabs (dashboard indicator)
    const tabCount = await page.$$eval('[role="tab"]', ts => ts.length).catch(() => 0);

    // Count agents/signals
    const agentsMatch = txt.match(/AGENTS:\s*(\d+)\/(\d+)/) || [];
    const signalsMatch = txt.match(/SIGNALS:\s*(\d+)/) || [];

    timeline.push({ t, at33, pct, tabCount, isDeploying, isGathering, isPartial });

    // Track 33% transitions
    if (at33) {
      was33 = true;
      stuckAt33Count++;
    } else if (was33 && !at33 && !isDeploying) {
      past33 = true;
      if (!timeline.find(e => e.t === t-1)?.past33) {
        log(`*** ADVANCED PAST 33% at t=${t}s ***`);
      }
    }

    // Log key events
    const shouldLog = t < 8 || t % 10 === 0 || isPartial || at33 || (pct !== null && pct > 33) || tabCount > 0;
    if (shouldLog) {
      log(`t=${t}s: pct=${pct !== null ? pct+'%' : '--'} | tabs=${tabCount} | 33%=${at33} | deploying=${isDeploying} | gathering=${isGathering} | agents=${agentsMatch[1] || '-'}/${agentsMatch[2] || '-'} | signals=${signalsMatch[1] || '-'}`);
    }

    // Take milestone screenshots
    if ([3, 10, 20, 35, 50, 65, 80].includes(t)) {
      await ss(page, `test_v43_pipeline_t${String(t).padStart(2,'0')}s.png`);
    }

    // Dashboard ready when tabs appear and not in loading state
    if (tabCount > 0 && !isDeploying && !isGathering && t >= 3) {
      dashboardDone = true;
      log(`DASHBOARD READY at t=${t}s (${tabCount} tabs)`);
      await ss(page, 'test_v43_011_dashboard_ready.png');
      break;
    }

    // Partial state timeout
    if (isPartial && t >= 60) {
      log('Partial intelligence state at 60s - proceeding to examine');
      await ss(page, 'test_v43_012_partial.png');
      break;
    }
  }

  await ss(page, 'test_v43_013_pipeline_final.png');

  // ── Step 7: Examine dashboard tabs ─────────────────────────────────────────────
  log('\n=== STEP 7: Examining dashboard ===');

  const tabs = await page.$$('[role="tab"]');
  const tabNames = [];
  for (const tab of tabs) {
    tabNames.push(await tab.innerText().catch(() => '?'));
  }
  log(`Found ${tabs.length} tabs: ${JSON.stringify(tabNames)}`);

  // Data collection across all tabs
  const collected = {
    stockChanges: [],
    marketCaps: [],
    peRatios: [],
    revenueLines: [],
    unavailableMsg: false,
    infosysDetected: false,
    newsDetected: false,
    scoreRing: null,
    riskScore: null,
  };

  // Get full page text first
  const fullPageText = await page.evaluate(() => document.body.innerText);

  // Check score
  const scoreMatch = fullPageText.match(/(\d{1,3})\s*\/\s*100/) || fullPageText.match(/Risk Score[:\s]+(\d+)/) || [];
  if (scoreMatch[1]) collected.riskScore = parseInt(scoreMatch[1]);

  // Check for key financial data patterns on landing tab
  const stockPct = fullPageText.match(/[+-]\d+\.?\d*%/g) || [];
  const mcaps = fullPageText.match(/\$[\d.]+\s*[BbMm]/g) || [];
  const peR = fullPageText.match(/P\/E[:\s]+[\d.]+/g) || fullPageText.match(/[\d.]+[×x]\s*P\/E/g) || [];
  const revLines = fullPageText.match(/Revenue[^\n]{0,100}/g) || [];

  collected.stockChanges.push(...stockPct);
  collected.marketCaps.push(...mcaps);
  collected.peRatios.push(...peR);
  collected.revenueLines.push(...revLines);
  collected.unavailableMsg = fullPageText.includes('financial signals unavailable') ||
                              fullPageText.includes('Live financial signals unavailable');
  collected.infosysDetected = fullPageText.includes('INFOSYS') || fullPageText.includes('Infosys');
  collected.newsDetected = fullPageText.includes('Reuters') || fullPageText.includes('Bloomberg') ||
                           fullPageText.includes('Economic Times') || fullPageText.includes('Business Standard') ||
                           fullPageText.includes('TechCrunch') || fullPageText.includes('Mint');

  log(`Initial scan: Infosys=${collected.infosysDetected} stocks=${collected.stockChanges.slice(0,5)} mcap=${collected.marketCaps.slice(0,3)} pe=${collected.peRatios.slice(0,3)} unavail=${collected.unavailableMsg}`);

  await ss(page, 'test_v43_014_summary_tab.png');

  // Now click through each tab
  for (let i = 0; i < tabs.length; i++) {
    const name = tabNames[i];
    await tabs[i].click();
    await page.waitForTimeout(1500);
    const safeName = name.replace(/[^a-z0-9]/gi, '_').substring(0, 15);
    await ss(page, `test_v43_tab${i}_${safeName}.png`);

    const content = await page.evaluate(() => document.body.innerText);

    const sPC = content.match(/[+-]\d+\.?\d*%/g) || [];
    const mPC = content.match(/\$[\d.]+\s*[BbMm]/g) || [];
    const peC = content.match(/P\/E[:\s]+[\d.]+/g) || content.match(/[\d.]+[×x]\s*P\/E/g) || [];
    const rC  = content.match(/Revenue[^\n]{0,100}/g) || [];

    collected.stockChanges.push(...sPC);
    collected.marketCaps.push(...mPC);
    collected.peRatios.push(...peC);
    collected.revenueLines.push(...rC);

    if (content.includes('financial signals unavailable') || content.includes('Live financial signals unavailable'))
      collected.unavailableMsg = true;
    if (content.includes('INFOSYS') || content.includes('Infosys'))
      collected.infosysDetected = true;

    const hasMarketCapLabel = content.includes('Market Cap') || content.includes('market cap');
    const hasPELabel = content.includes('P/E');
    const hasRevLabel = content.includes('Revenue') || content.includes('revenue');

    // Check score
    const sM = content.match(/(\d{1,3})\s*\/\s*100/) || [];
    if (sM[1] && !collected.riskScore) collected.riskScore = parseInt(sM[1]);

    log(`Tab[${i}] "${name}": infosys=${content.includes('Infosys')} mcap_label=${hasMarketCapLabel} pe_label=${hasPELabel} rev=${hasRevLabel} stocks=${JSON.stringify(sPC.slice(0,3))} mcaps=${JSON.stringify(mPC.slice(0,3))} unavail=${content.includes('unavailable')}`);
  }

  // Try clicking on Company/CompanyPulse tab specifically for financial data
  for (let i = 0; i < tabs.length; i++) {
    const name = tabNames[i];
    if (name.toLowerCase().includes('company') || name.toLowerCase().includes('pulse') || name.toLowerCase().includes('summary')) {
      await tabs[i].click();
      await page.waitForTimeout(2000);
      // Scroll down to see CompanyPulseCard
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(500);
      await ss(page, `test_v43_015_company_pulse_scroll.png`);

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      break;
    }
  }

  // Check Risk tab
  for (let i = 0; i < tabs.length; i++) {
    const name = tabNames[i];
    if (name.toLowerCase().includes('risk') || name.toLowerCase().includes('analysis')) {
      await tabs[i].click();
      await page.waitForTimeout(2000);
      await ss(page, `test_v43_016_risk_tab.png`);
      break;
    }
  }

  // ── FINAL REPORT ───────────────────────────────────────────────────────────────
  const uStocks = [...new Set(collected.stockChanges)];
  const uMcaps  = [...new Set(collected.marketCaps)];
  const uPE     = [...new Set(collected.peRatios)];

  const t33Count  = timeline.filter(e => e.at33).length;
  const maxPct    = Math.max(...timeline.filter(e => e.pct !== null).map(e => e.pct), 0);

  log('\n' + '='.repeat(60));
  log('   V42.3 END-TO-END VERIFICATION REPORT');
  log('='.repeat(60));

  log('\n[VERIFICATION 1] Pipeline advances past 33% (scraper-enqueue CORS fix)');
  log(`  Time seen at 33%:   ${t33Count}s`);
  log(`  Advanced past 33%:  ${past33}`);
  log(`  Dashboard rendered: ${dashboardDone}`);
  log(`  Max progress seen:  ${maxPct}%`);
  log(`  Tab count at end:   ${tabs.length}`);
  const v1 = dashboardDone || past33 || maxPct > 33;
  log(`  RESULT: ${v1 ? 'PASS' : t33Count > 10 ? 'FAIL – stuck at 33%' : 'INCONCLUSIVE'}`);

  log('\n[VERIFICATION 2] CompanyPulseCard financial data (not "unavailable")');
  log(`  Infosys detected:    ${collected.infosysDetected}`);
  log(`  Risk score:          ${collected.riskScore !== null ? collected.riskScore + '/100' : 'not found'}`);
  log(`  Stock % found:       ${JSON.stringify(uStocks.slice(0, 8))}`);
  log(`  Market caps found:   ${JSON.stringify(uMcaps.slice(0, 5))}`);
  log(`  P/E ratios found:    ${JSON.stringify(uPE.slice(0, 5))}`);
  log(`  Revenue lines:       ${JSON.stringify(collected.revenueLines.slice(0, 3))}`);
  log(`  "unavailable" shown: ${collected.unavailableMsg}`);
  const v2 = collected.infosysDetected && !collected.unavailableMsg;
  log(`  RESULT: ${collected.unavailableMsg ? 'FAIL – unavailable message shown' : collected.infosysDetected ? (uMcaps.length > 0 || uStocks.length > 0 ? 'PASS' : 'PARTIAL – Infosys found but no financial chips') : 'INCONCLUSIVE – Infosys not detected'}`);

  log('\n[VERIFICATION 3] CORS / preflight errors (x-request-id fix)');
  log(`  Total console errors: ${errors.length}`);
  log(`  x-request-id CORS:    ${xReqErrs.length}`);
  log(`  Other CORS errors:    ${realCors.length}`);
  if (errors.length > 0) {
    log('  All errors:');
    errors.slice(0, 10).forEach(e => log(`    - ${e.substring(0, 200)}`));
  }
  if (xReqErrs.length > 0) {
    xReqErrs.forEach(e => log(`  [x-request-id CORS] ${e.substring(0, 200)}`));
  }
  if (realCors.length > 0) {
    realCors.forEach(e => log(`  [CORS error] ${e.substring(0, 200)}`));
  }
  const v3 = xReqErrs.length === 0 && realCors.length === 0;
  log(`  RESULT: ${v3 ? 'PASS – zero CORS errors' : 'FAIL – CORS errors remain'}`);

  log('\n[SUMMARY]');
  log(`  Pipeline past 33%:   ${v1 ? 'PASS' : 'FAIL/INCONCLUSIVE'}`);
  log(`  Financial data:      ${collected.unavailableMsg ? 'FAIL' : collected.infosysDetected ? 'PASS/PARTIAL' : 'INCONCLUSIVE'}`);
  log(`  CORS errors:         ${v3 ? 'PASS (0 errors)' : 'FAIL (' + (xReqErrs.length + realCors.length) + ' errors)'}`);
  log(`  Screenshots:         ${OUT}`);

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    pipeline: { past33, dashboardDone, maxPct, tabCount: tabs.length, tabNames },
    financial: { infosys: collected.infosysDetected, unavailable: collected.unavailableMsg, stockChanges: uStocks, marketCaps: uMcaps, peRatios: uPE, riskScore: collected.riskScore },
    cors: { totalErrors: errors.length, xRequestIdErrors: xReqErrs.length, otherCorsErrors: realCors.length, allErrors: errors.slice(0, 20) },
    verdicts: { v1_pipeline: v1, v2_financial: !collected.unavailableMsg && collected.infosysDetected, v3_cors: v3 }
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  log('Report written to ' + path.join(OUT, 'report.json'));

  await browser.close();
  log('Done.');
})().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
