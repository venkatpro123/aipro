// v2 test - proper company + role selection with correct dropdown ordering
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots_v2');
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
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      if (text.includes('x-request-id')) xRequestIdErrors.push(text);
    }
  });

  log('=== Loading /terminal ===');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ---- COMPANY SELECTION ----
  log('--- Company: Infosys ---');
  const companyInput = await page.waitForSelector('input[placeholder="Search company..."]', { timeout: 10000 });
  await companyInput.click();
  await page.keyboard.type('Infosys', { delay: 60 });
  await page.waitForTimeout(2500);

  // Get all .glass-panel-heavy .tab-btn (company suggestions)
  const companySuggestions = await page.evaluate(() => {
    const allDivs = document.querySelectorAll('.glass-panel-heavy .tab-btn');
    return Array.from(allDivs).map((d, i) => ({ i, text: d.innerText.substring(0, 80) }));
  });
  log(`Company suggestions (${companySuggestions.length}): ${JSON.stringify(companySuggestions.slice(0,5))}`);

  if (companySuggestions.length > 0) {
    // Click first company suggestion (should be Infosys)
    const compDivs = await page.$$('.glass-panel-heavy .tab-btn');
    await compDivs[0].click();
    log('Clicked first company suggestion (Infosys)');
    await page.waitForTimeout(1500);
  } else {
    log('No company dropdown — proceeding with typed value');
  }

  // Check if company selected
  const companyVal = await companyInput.inputValue();
  const verifiedBadge = await page.$('span:has-text("VERIFIED")');
  log(`Company input value: "${companyVal}", VERIFIED: ${!!verifiedBadge}`);
  await ss(page, '01_company_selected.png');

  // ---- ROLE SELECTION ----
  log('\n--- Role: Software Engineer ---');
  const roleInput = await page.$('input[placeholder="Search role..."]');
  await roleInput.click();
  await page.keyboard.type('Software Engineer', { delay: 50 });
  await page.waitForTimeout(1500);

  // Get role suggestions
  const roleSuggestions = await page.evaluate(() => {
    const allDivs = document.querySelectorAll('.glass-panel-heavy .tab-btn');
    return Array.from(allDivs).map((d, i) => ({ i, text: d.innerText.substring(0, 80) }));
  });
  log(`Role suggestions (${roleSuggestions.length}): ${JSON.stringify(roleSuggestions.slice(0,5))}`);

  if (roleSuggestions.length > 0) {
    // Find the "Software Engineer" entry specifically
    const roleDivs = await page.$$('.glass-panel-heavy .tab-btn');
    let clickedIdx = 0;
    for (let i = 0; i < roleDivs.length; i++) {
      const t = await roleDivs[i].innerText();
      if (t.toLowerCase().includes('software engineer') && !t.toLowerCase().includes('quantum') && !t.toLowerCase().includes('educational')) {
        clickedIdx = i;
        break;
      }
    }
    const clickedText = await roleDivs[clickedIdx].innerText();
    log(`Clicking role[${clickedIdx}]: "${clickedText.substring(0, 60)}"`);
    await roleDivs[clickedIdx].click();
    await page.waitForTimeout(500);
  } else {
    log('No role dropdown visible');
  }

  await ss(page, '02_role_selected.png');

  // Check if "Continue Analysis" is now enabled
  const continueBtn = await page.$('button:has-text("Continue Analysis")');
  const disabled1 = continueBtn ? await continueBtn.isDisabled() : true;
  log(`\nContinue Analysis button: found=${!!continueBtn}, disabled=${disabled1}`);

  // Check what resolved
  const pageText1 = await page.evaluate(() => document.body.innerText);
  const hasRoleIntel = pageText1.includes('Analyzing as:') || pageText1.includes('Coverage:') || pageText1.includes('Role Intelligence');
  const hasUnresolved = pageText1.includes('Unresolved role');
  log(`Role resolved: ${hasRoleIntel}, Unresolved warning: ${hasUnresolved}`);

  if (disabled1 && hasUnresolved) {
    log('Role unresolved - trying "Software Developer" instead');
    // Clear and try again
    await roleInput.click({ clickCount: 3 });
    await page.keyboard.type('Software Developer', { delay: 50 });
    await page.waitForTimeout(1500);

    const newDivs = await page.$$('.glass-panel-heavy .tab-btn');
    if (newDivs.length > 0) {
      const t = await newDivs[0].innerText();
      log(`New role[0]: "${t.substring(0, 60)}"`);
      await newDivs[0].click();
      await page.waitForTimeout(500);
    }
  }

  // Final check before proceeding
  const continueBtn2 = await page.$('button:has-text("Continue Analysis")');
  const disabled2 = continueBtn2 ? await continueBtn2.isDisabled() : true;
  log(`Continue Analysis (2nd check): disabled=${disabled2}`);

  if (disabled2) {
    log('Still disabled - examining page state:');
    const pt = await page.evaluate(() => document.body.innerText.substring(0, 800));
    log(pt);
    await ss(page, 'DEBUG_disabled.png');
    await browser.close();
    return;
  }

  // CLICK CONTINUE
  log('\nClicking "Continue Analysis →"');
  await continueBtn2.click();
  await page.waitForTimeout(2000);
  await ss(page, '03_step2.png');

  const pageText2 = await page.evaluate(() => document.body.innerText);
  const onStep2 = pageText2.includes('STEP 02') || pageText2.includes('Individual Factors');
  const hasExecute = pageText2.includes('Execute Full Audit');
  log(`On Step 2: ${onStep2}, Execute button text present: ${hasExecute}`);

  if (!hasExecute) {
    log('Page text after Continue:', pageText2.substring(0, 500));
    // Check if audit already started
    const hasPipeline = pageText2.match(/DEPLOYING|33%|GATHERING|INTELLIGENCE/i);
    log(`Pipeline started: ${!!hasPipeline}`);
    if (hasPipeline) {
      log('Audit already started from step 1!');
      // Skip step 2 and go to monitoring
      goto_monitoring = true;
    }
  }

  // CLICK EXECUTE
  const executeBtn = await page.$('button:has-text("Execute Full Audit")');
  if (executeBtn && !(await executeBtn.isDisabled())) {
    log('\nClicking "Execute Full Audit →"');
    await executeBtn.click();
    await page.waitForTimeout(1000);
    log('AUDIT SUBMITTED!');
  } else {
    log('No Execute button - checking if pipeline already started...');
    const currentText = await page.evaluate(() => document.body.innerText);
    const hasPipeline = currentText.match(/DEPLOYING|33%|GATHERING|INTELLIGENCE GATHERED/i);
    if (!hasPipeline) {
      log('Pipeline not running. Dumping page text:');
      log(currentText.substring(0, 1000));
      await browser.close();
      return;
    }
  }

  await ss(page, '04_audit_started.png');

  // ====== STEP 3: Monitor pipeline (90s) ======
  log('\n=== Monitoring pipeline (90s) ===');

  const timeline = [];
  let advancedPast33 = false;
  let was33 = false;
  let pipelineComplete = false;

  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const pageText = await page.evaluate(() => document.body.innerText);

    const has33 = pageText.includes('33%');
    const hasDeploying = !!(pageText.match(/DEPLOYING/i));
    const hasGathering = pageText.includes('GATHERING');
    const hasPartial = pageText.includes('PARTIAL INTELLIGENCE');
    const intelMatch = pageText.match(/INTELLIGENCE GATHERED\s+(\d+)%/) ||
                       pageText.match(/(\d+)%\s*NETWORK ID/);
    const intelPct = intelMatch ? parseInt(intelMatch[1]) : null;
    const agentMatch = pageText.match(/AGENTS:\s*(\d+)\/(\d+)/);
    const signalMatch = pageText.match(/SIGNALS:\s*(\d+)/);
    const hasDashTabs = await page.$$eval('[role="tab"]', tabs => tabs.length).catch(() => 0);

    timeline.push({ t: i, has33, hasDeploying, hasGathering, hasPartial, intelPct, hasDashTabs });

    if (has33) was33 = true;
    if (was33 && !has33 && !hasDeploying && !advancedPast33) {
      advancedPast33 = true;
      log(`*** ADVANCED PAST 33% at t=${i}s ***`);
    }

    if (i <= 10 || i % 10 === 0 || hasPartial || intelPct) {
      const agents = agentMatch ? `${agentMatch[1]}/${agentMatch[2]}` : '-';
      const signals = signalMatch ? signalMatch[1] : '-';
      log(`t=${i}s: ${intelPct !== null ? intelPct+'%' : '--'} | agents=${agents} sigs=${signals} | deploy=${hasDeploying} gather=${hasGathering} partial=${hasPartial} tabs=${hasDashTabs}`);
    }

    if ([5, 15, 30, 45, 60, 75, 90].includes(i)) {
      await ss(page, `05_t${i.toString().padStart(3,'0')}s.png`);
    }

    if (hasDashTabs > 0 && !hasDeploying && !hasGathering && i >= 5) {
      pipelineComplete = true;
      log(`Dashboard with ${hasDashTabs} tabs visible at t=${i}s`);
      await ss(page, '06_dashboard_ready.png');
      break;
    }

    if (hasPartial && i >= 45) {
      log(`Still partial at t=${i}s - proceeding with current state`);
      await ss(page, '06_partial_state.png');
      break;
    }
  }

  await ss(page, '07_final_state.png');

  // ====== STEP 4: Analyze dashboard ======
  log('\n=== Dashboard analysis ===');

  const tabs = await page.$$('[role="tab"]');
  const tabNames = [];
  for (const t of tabs) { tabNames.push(await t.innerText()); }
  log(`Tabs (${tabs.length}): ${JSON.stringify(tabNames)}`);

  const fullText = await page.evaluate(() => document.body.innerText);

  // Key indicators
  const stockChanges = fullText.match(/[+-]\d+\.?\d*%/g) || [];
  const marketCaps = fullText.match(/\$[\d.]+[BM]/g) || [];
  const peRatios = fullText.match(/\d+\.?\d*[×x]|\bP\/E\b.*\d+/g) || [];
  const revenueLines = fullText.match(/Revenue[^\n]{0,80}/g) || [];
  const hasInfosys = fullText.includes('INFOSYS') || fullText.includes('Infosys');
  const hasFinancialUnavail = fullText.includes('financial signals unavailable') ||
                               fullText.includes('Live financial signals unavailable');

  log(`Infosys company: ${hasInfosys}`);
  log(`Stock changes: ${JSON.stringify(stockChanges.slice(0, 8))}`);
  log(`Market caps: ${JSON.stringify(marketCaps.slice(0, 5))}`);
  log(`P/E: ${JSON.stringify(peRatios.slice(0, 5))}`);
  log(`Revenue lines: ${JSON.stringify(revenueLines.slice(0, 3))}`);
  log(`"financial signals unavailable": ${hasFinancialUnavail}`);

  // Scroll through tabs
  if (tabs.length > 0) {
    for (let i = 0; i < tabs.length; i++) {
      const tabText = await tabs[i].innerText();
      await tabs[i].click();
      await page.waitForTimeout(1500);
      await ss(page, `08_tab${i}_${tabText.replace(/[^a-zA-Z0-9]/g,'_').substring(0,15)}.png`);

      const tabContent = await page.evaluate(() => document.body.innerText);
      const tabStocks = tabContent.match(/[+-]\d+\.?\d*%/g) || [];
      const tabMCap = tabContent.match(/\$[\d.]+[BM]/g) || [];
      const tabPE = tabContent.match(/\d+\.?\d*[×x]/g) || [];
      const tabUnavail = tabContent.includes('financial signals unavailable');
      const tabInfosys = tabContent.includes('INFOSYS') || tabContent.includes('Infosys');
      const tabPulse = tabContent.includes('Company Pulse') || tabContent.includes('COMPANY PULSE');

      log(`Tab "${tabText}": infosys=${tabInfosys} pulse=${tabPulse} stocks=${tabStocks.slice(0,5)} mcap=${tabMCap.slice(0,5)} pe=${tabPE.slice(0,5)} unavail=${tabUnavail}`);
    }
  }

  // ====== FINAL REPORT ======
  log('\n========================================');
  log('           FINAL TEST REPORT');
  log('========================================');

  const t33List = timeline.filter(e => e.has33);
  const deployList = timeline.filter(e => e.hasDeploying);
  const intelList = timeline.filter(e => e.intelPct !== null);

  log(`\n[1] PIPELINE PROGRESS`);
  log(`  Seconds at 33%: ${t33List.length} (t=${t33List[0]?.t}-${t33List[t33List.length-1]?.t})`);
  log(`  Seconds DEPLOYING: ${deployList.length}`);
  log(`  Advanced past 33%: ${advancedPast33}`);
  log(`  Pipeline complete: ${pipelineComplete}`);
  if (intelList.length > 0) {
    log(`  Max intelligence %: ${Math.max(...intelList.map(e => e.intelPct))}%`);
  }
  log(`  VERDICT: ${advancedPast33 ? 'PASS - Pipeline moved past 33%' : pipelineComplete ? 'PASS - Dashboard loaded' : t33List.length > 5 ? 'FAIL - Stuck at 33%' : 'INCONCLUSIVE'}`);

  log(`\n[2] COMPANYPULSECARD FINANCIAL DATA`);
  log(`  Stock change data: ${stockChanges.length > 0 ? 'PRESENT' : 'MISSING'} (${stockChanges.filter(s => s !== '+18%').slice(0,5)})`);
  log(`  Market cap data: ${marketCaps.length > 0 ? 'PRESENT' : 'MISSING'} (${marketCaps.slice(0,5)})`);
  log(`  P/E data: ${peRatios.length > 0 ? 'PRESENT' : 'MISSING'}`);
  log(`  Revenue data: ${revenueLines.length > 0 ? 'PRESENT' : 'MISSING'}`);
  log(`  "unavailable" shown: ${hasFinancialUnavail}`);
  log(`  VERDICT: ${!hasFinancialUnavail && (stockChanges.length > 0 || marketCaps.length > 0) ? 'PASS' : hasFinancialUnavail ? 'FAIL - shows unavailable' : 'INCONCLUSIVE'}`);

  log(`\n[3] CORS / CSP ERRORS`);
  log(`  Total console errors: ${consoleErrors.length}`);
  log(`  x-request-id CORS: ${xRequestIdErrors.length}`);
  const trueCorsErrors = consoleErrors.filter(e =>
    (e.includes('CORS') || e.includes('preflight') || e.includes('blocked')) &&
    !e.includes('Content Security Policy') && !e.includes('clearbit') &&
    !e.includes('deepseek') && !e.includes('groq') && !e.includes('stlouisfed') &&
    !e.includes('sec.gov') && !e.includes('bls.gov')
  );
  log(`  True CORS preflight errors (not CSP): ${trueCorsErrors.length}`);
  if (trueCorsErrors.length > 0) {
    trueCorsErrors.forEach(e => log(`    ${e.substring(0, 200)}`));
  }
  log(`  VERDICT: ${xRequestIdErrors.length === 0 && trueCorsErrors.length === 0 ? 'PASS - No CORS errors' : 'FAIL - CORS errors present'}`);

  log('\nScreenshots:', SCREENSHOTS_DIR);
  await browser.close();
})();
