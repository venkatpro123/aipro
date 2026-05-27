// Final comprehensive test for v42.3
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots_final');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

function ss(page, name) {
  return page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: true });
}

function log(msg) {
  console.log(msg);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  const consoleErrors = [];
  const xRequestIdErrors = [];
  const efCorsErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      if (text.includes('x-request-id')) xRequestIdErrors.push(text);
      if ((text.includes('supabase') || text.includes('functions')) &&
          (text.includes('CORS') || text.includes('preflight') || text.includes('blocked')) &&
          !text.includes('Content Security Policy')) {
        efCorsErrors.push(text);
      }
    }
  });

  // ====== STEP 1: Load the terminal page ======
  log('\n=== STEP 1: Loading /terminal ===');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await ss(page, '01_loaded.png');

  // ====== STEP 2: Fill the form ======
  log('\n=== STEP 2: Filling audit form ===');

  // Company input
  const companyInput = await page.waitForSelector('input[placeholder="Search company..."]', { timeout: 10000 });
  await companyInput.click();
  await page.keyboard.type('Infosys', { delay: 50 });
  log('Typed "Infosys" into company field');
  await page.waitForTimeout(2500); // Wait for search results

  await ss(page, '02_company_typed.png');

  // Check dropdown
  const dropdownVisible = await page.evaluate(() => {
    const glass = document.querySelectorAll('.glass-panel-heavy');
    for (const g of glass) {
      if (g.style.position === 'absolute' || getComputedStyle(g).position === 'absolute') {
        return g.innerText.substring(0, 100);
      }
    }
    return null;
  });
  log(`Dropdown content: ${dropdownVisible}`);

  // Try clicking first dropdown result
  const firstResult = await page.$('.glass-panel-heavy .tab-btn');
  if (firstResult) {
    const resultText = await firstResult.innerText();
    log(`Clicking first result: "${resultText.substring(0, 50)}"`);
    await firstResult.click();
    await page.waitForTimeout(2000);
  } else {
    log('No dropdown result visible - checking for "VERIFIED" badge approach');
    // Press Enter to trigger unknown company profiling
    await companyInput.press('Enter');
    await page.waitForTimeout(3000);
  }

  await ss(page, '03_company_selected.png');

  // Check if company was selected
  const verifiedBadge = await page.$('span:has-text("VERIFIED")');
  log(`Company VERIFIED badge visible: ${!!verifiedBadge}`);

  // Role input
  const roleInput = await page.$('input[placeholder="Search role..."]');
  if (!roleInput) {
    log('ERROR: Role input not found');
    await ss(page, 'ERROR_no_role.png');
    await browser.close();
    return;
  }

  await roleInput.click();
  await page.keyboard.type('Software', { delay: 50 });
  log('Typed "Software" into role field');
  await page.waitForTimeout(1500);
  await ss(page, '04_role_dropdown.png');

  // Check role suggestions dropdown
  const roleSuggestions = await page.$$('.glass-panel-heavy .tab-btn');
  log(`Role suggestions found: ${roleSuggestions.length}`);

  for (let i = 0; i < Math.min(roleSuggestions.length, 5); i++) {
    const t = await roleSuggestions[i].innerText();
    log(`  Suggestion[${i}]: "${t.substring(0, 60)}"`);
  }

  // Click the first suggestion (should be a Software-related role)
  if (roleSuggestions.length > 0) {
    const t = await roleSuggestions[0].innerText();
    log(`Selecting role: "${t.substring(0, 60)}"`);
    await roleSuggestions[0].click();
    await page.waitForTimeout(500);
  } else {
    // No dropdown, try pressing ArrowDown to navigate
    await roleInput.press('ArrowDown');
    await page.waitForTimeout(200);
    await roleInput.press('Enter');
  }

  await ss(page, '05_role_selected.png');

  // Check if Continue Analysis is now enabled
  const continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn) {
    const isDisabled = await continueBtn.isDisabled();
    log(`"Continue Analysis" button: disabled=${isDisabled}`);

    if (isDisabled) {
      // Diagnose why it's disabled
      const pageText = await page.evaluate(() => document.body.innerText);
      const hasUnresolved = pageText.includes('Unresolved role');
      log(`Unresolved role warning: ${hasUnresolved}`);

      // Try clearing role and using a different known-good title
      await roleInput.triple_click && await roleInput.click({ clickCount: 3 });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('Backend Developer', { delay: 50 });
      await page.waitForTimeout(1500);

      const newSuggestions = await page.$$('.glass-panel-heavy .tab-btn');
      if (newSuggestions.length > 0) {
        const t = await newSuggestions[0].innerText();
        log(`Fallback role selection: "${t.substring(0, 60)}"`);
        await newSuggestions[0].click();
        await page.waitForTimeout(500);
      }
    }
  }

  // Click Continue Analysis
  const continueBtn2 = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn2 && !(await continueBtn2.isDisabled())) {
    log('Clicking "Continue Analysis →"');
    await continueBtn2.click();
    await page.waitForTimeout(1500);
    await ss(page, '06_step2.png');
  } else {
    const disabled = continueBtn2 ? await continueBtn2.isDisabled() : true;
    log(`Cannot proceed - continueBtn2 found=${!!continueBtn2} disabled=${disabled}`);
    const pageText = await page.evaluate(() => document.body.innerText);
    log('Page state:', pageText.substring(0, 500));
    await ss(page, 'DEBUG_step1_stuck.png');
    await browser.close();
    return;
  }

  // ====== Step 2 ======
  log('\n=== Step 2: Individual Factors ===');
  await page.waitForTimeout(500);

  const step2Header = await page.$('text=STEP 02');
  log(`On Step 2: ${!!step2Header}`);

  // Click Execute Full Audit (use defaults for all step 2 factors)
  const executeBtn = await page.$('button:has-text("Execute Full Audit")');
  if (executeBtn && !(await executeBtn.isDisabled())) {
    log('Clicking "Execute Full Audit →"');
    await executeBtn.click();
    log('AUDIT SUBMITTED!');
  } else {
    log('Execute Full Audit button not found or disabled');
    await ss(page, 'DEBUG_step2_stuck.png');
    await browser.close();
    return;
  }

  await ss(page, '07_audit_submitted.png');

  // ====== STEP 3: Monitor pipeline ======
  log('\n=== STEP 3: Monitoring pipeline ===');

  const timeline = [];
  let stuckAt33 = false;
  let advancedPast33 = false;
  let pipelineComplete = false;

  // Take initial reading right away
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const pageText = await page.evaluate(() => document.body.innerText);

    // Extract all key indicators
    const has33 = pageText.includes('33%');
    const hasDeploying = !!(pageText.match(/DEPLOYING AGENTS|DEPLOYING/i));
    const hasGathering = pageText.includes('GATHERING INTELLIGENCE');
    const hasPartialIntel = pageText.includes('PARTIAL INTELLIGENCE');
    const hasDashboard = await page.$$eval('[role="tab"]', tabs => tabs.length > 0);

    // Look for intelligence percentage
    const intelPctMatch = pageText.match(/INTELLIGENCE GATHERED\s+(\d+)%/) ||
                          pageText.match(/(\d+)%\s*\n\s*NETWORK ID/);
    const intelPct = intelPctMatch ? intelPctMatch[1] : null;

    const agentMatch = pageText.match(/AGENTS:\s*(\d+)\/(\d+)/);
    const signalMatch = pageText.match(/SIGNALS:\s*(\d+)/);

    const entry = { t: i, has33, hasDeploying, hasGathering, hasPartialIntel, hasDashboard, intelPct, agents: agentMatch ? `${agentMatch[1]}/${agentMatch[2]}` : '-', signals: signalMatch ? signalMatch[1] : '-' };
    timeline.push(entry);

    if (has33) stuckAt33 = true;
    if (stuckAt33 && !has33 && !hasDeploying && !advancedPast33) {
      advancedPast33 = true;
      log(`*** Pipeline ADVANCED past 33% at t=${i}s ***`);
    }

    // Log at key moments
    if (i <= 5 || i % 10 === 0 || hasPartialIntel || intelPct) {
      log(`t=${i}s: ${intelPct ? intelPct+'%' : '--'} | agents=${entry.agents} | deploying=${hasDeploying} gathering=${hasGathering} partial=${hasPartialIntel} dash=${hasDashboard}`);
    }

    // Take screenshots at key intervals
    if (i === 2 || i === 10 || i === 20 || i === 30 || i === 45 || i === 60) {
      await ss(page, `08_t${i.toString().padStart(3,'0')}s.png`);
    }

    if (hasDashboard && !hasDeploying && !hasGathering && i >= 3) {
      pipelineComplete = true;
      log(`Pipeline/Dashboard complete at t=${i}s`);
      await ss(page, '09_dashboard_ready.png');
      break;
    }
  }

  await ss(page, '10_after_pipeline.png');

  // ====== STEP 4: Examine the dashboard ======
  log('\n=== STEP 4: Dashboard examination ===');

  const tabs = await page.$$('[role="tab"]');
  log(`Tabs found: ${tabs.length}`);
  const tabNames = [];
  for (const tab of tabs) {
    const t = await tab.innerText();
    tabNames.push(t);
  }
  log(`Tab names: ${JSON.stringify(tabNames)}`);

  // Full page text for analysis
  const dashText = await page.evaluate(() => document.body.innerText);

  // Check for key data points
  const stockChange = dashText.match(/[+-]\d+\.?\d*%/g) || [];
  const marketCap = dashText.match(/\$\s*\d+\.?\d*\s*[BM]|\$[\d.]+[BM]/g) || [];
  const peRatios = dashText.match(/\d+\.?\d*[×x]|P\/E[:\s]*\d+/g) || [];
  const revenueData = dashText.match(/Revenue[^\n]{0,80}/g) || [];
  const financialUnavail = dashText.includes('Live financial signals unavailable') ||
                           dashText.includes('financial signals unavailable');
  const hasInfosys = dashText.includes('INFOSYS') || dashText.includes('Infosys');
  const hasNewsHeadlines = dashText.match(/\d{4}.*(?:Reuters|Bloomberg|Economic Times|Hindu|Mint|Forbes)|(?:Reuters|Bloomberg|ET|Mint).*\d{4}/g) || [];

  log(`\n--- Financial Data Check ---`);
  log(`Infosys company detected: ${hasInfosys}`);
  log(`Stock changes: ${JSON.stringify(stockChange.slice(0, 8))}`);
  log(`Market caps: ${JSON.stringify(marketCap.slice(0, 5))}`);
  log(`P/E data: ${JSON.stringify(peRatios.slice(0, 5))}`);
  log(`Revenue lines: ${JSON.stringify(revenueData.slice(0, 3))}`);
  log(`"financial signals unavailable": ${financialUnavail}`);
  log(`News headlines: ${JSON.stringify(hasNewsHeadlines.slice(0, 3))}`);

  // Navigate through tabs
  if (tabs.length > 0) {
    log('\n--- Tab content analysis ---');
    for (let i = 0; i < tabs.length; i++) {
      const tabText = await tabs[i].innerText();
      log(`\nTab "${tabText}":`);
      await tabs[i].click();
      await page.waitForTimeout(1500);
      await ss(page, `11_tab_${i}_${tabText.replace(/[^a-zA-Z0-9]/g,'_').substring(0,15)}.png`);

      const content = await page.evaluate(() => document.body.innerText);

      // CompanyPulseCard specific check
      const hasCompanyPulse = content.includes('Company Pulse') || content.includes('COMPANY PULSE');
      const tabStock = content.match(/[+-]\d+\.?\d*%/g) || [];
      const tabMarketCap = content.match(/\$\s*\d+\.?\d*\s*[BM]/g) || [];
      const tabPE = content.match(/\d+\.?\d*[×x]/g) || [];
      const tabUnavail = content.includes('financial signals unavailable');
      const tabInfosys = content.includes('INFOSYS') || content.includes('Infosys');

      log(`  CompanyPulse: ${hasCompanyPulse}`);
      log(`  Infosys: ${tabInfosys}`);
      log(`  Stock changes: ${tabStock.slice(0, 5)}`);
      log(`  Market caps: ${tabMarketCap.slice(0, 5)}`);
      log(`  P/E values: ${tabPE.slice(0, 5)}`);
      log(`  "unavailable": ${tabUnavail}`);
    }
  }

  // ====== FINAL REPORT ======
  log('\n========== FINAL REPORT ==========');

  // Check specifically for the 3 v42.3 fixes:
  log('\n1. PIPELINE PROGRESS (Was it stuck at 33%?):');
  const t33Events = timeline.filter(e => e.has33 || e.hasDeploying);
  log(`   Events at/before 33%: ${t33Events.length}`);
  if (t33Events.length > 0) {
    log(`   First at 33%: t=${t33Events[0].t}s, last: t=${t33Events[t33Events.length-1].t}s`);
  }
  log(`   Advanced past 33%: ${advancedPast33}`);
  log(`   Pipeline complete: ${pipelineComplete}`);

  log('\n2. COMPANYSPULSECARD FINANCIAL DATA:');
  log(`   Stock change visible: ${stockChange.length > 0} (${stockChange.slice(0, 3)})`);
  log(`   Market cap visible: ${marketCap.length > 0} (${marketCap.slice(0, 3)})`);
  log(`   "unavailable" shown: ${financialUnavail}`);

  log('\n3. CORS ERRORS:');
  log(`   Total console errors: ${consoleErrors.length}`);
  log(`   x-request-id CORS errors: ${xRequestIdErrors.length}`);
  log(`   EF CORS errors (non-CSP): ${efCorsErrors.length}`);
  if (xRequestIdErrors.length > 0) {
    xRequestIdErrors.forEach(e => log(`   x-request-id: ${e.substring(0, 200)}`));
  }
  if (efCorsErrors.length > 0) {
    efCorsErrors.forEach(e => log(`   EF CORS: ${e.substring(0, 200)}`));
  }

  log('\n4. FINANCIAL SUMMARY FROM PAGE:');
  if (hasInfosys) {
    log(`   Infosys data present in page`);
    log(`   Revenue data: ${revenueData.slice(0, 2)}`);
  } else {
    log('   WARNING: Infosys data not found in final page');
  }

  log('\nScreenshots saved to:', SCREENSHOTS_DIR);
  await browser.close();
})();
