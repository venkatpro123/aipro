const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

function ss(page, name) {
  return page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // Capture console messages
  const consoleErrors = [];
  const consoleLogs = [];
  const networkErrors = [];
  const corsErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      if (text.toLowerCase().includes('cors') || text.toLowerCase().includes('preflight') || text.toLowerCase().includes('cross-origin') || text.toLowerCase().includes('blocked')) {
        corsErrors.push(text);
      }
    } else {
      consoleLogs.push(`[${msg.type()}] ${text}`);
    }
  });

  page.on('requestfailed', req => {
    networkErrors.push(`FAILED: ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });

  // ---- STEP 1: Load /terminal page ----
  console.log('\n=== STEP 1: Loading http://localhost:5173/terminal ===');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle', timeout: 30000 });
  await ss(page, '01_terminal_page.png');

  const title = await page.title();
  console.log(`Page title: "${title}"`);
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
  console.log('Body text preview:', bodyText);

  // ---- STEP 2: Fill in Step 1 of the form ----
  console.log('\n=== STEP 2: Filling company "Infosys" and role "Software Engineer" ===');

  // Wait for company input
  const companyInput = await page.waitForSelector('input[placeholder="Search company..."]', { timeout: 10000 });
  if (!companyInput) {
    console.log('ERROR: Company input not found');
    await ss(page, 'ERROR_no_company_input.png');
    await browser.close();
    return;
  }

  console.log('Found company input, typing "Infosys"...');
  await companyInput.click();
  await companyInput.fill('Infosys');
  await page.waitForTimeout(2000); // wait for search results

  await ss(page, '02_company_typed.png');

  // Look for dropdown results
  const dropdownItems = await page.$$('.glass-panel-heavy div.tab-btn');
  console.log(`Found ${dropdownItems.length} dropdown items`);

  if (dropdownItems.length > 0) {
    // Click the first Infosys result
    const firstItemText = await dropdownItems[0].innerText();
    console.log(`Clicking first result: "${firstItemText}"`);
    await dropdownItems[0].click();
    await page.waitForTimeout(1500);
    await ss(page, '03_company_selected.png');
  } else {
    // Try pressing Enter to accept the typed value
    console.log('No dropdown found, trying Enter key...');
    await companyInput.press('Enter');
    await page.waitForTimeout(1000);
    await ss(page, '03_company_enter.png');
  }

  // Now fill the role input
  const roleInput = await page.$('input[placeholder="Search role..."]');
  if (roleInput) {
    console.log('Found role input, typing "Software Engineer"...');
    await roleInput.click();
    await roleInput.fill('Software Engineer');
    await page.waitForTimeout(2000);
    await ss(page, '04_role_typed.png');

    // Look for role dropdown results
    const roleDropdown = await page.$$('.glass-panel-heavy div, [class*="result"], [class*="dropdown"] div');
    console.log(`Found ${roleDropdown.length} potential role dropdown items`);

    // Try clicking first visible role result
    // Role results might appear in a different container
    const pageTextAfterRole = await page.evaluate(() => document.body.innerText);
    if (pageTextAfterRole.includes('Software Engineer') && pageTextAfterRole.includes('Select')) {
      console.log('Role results visible in page');
    }

    // Press Enter to select
    await roleInput.press('ArrowDown');
    await page.waitForTimeout(300);
    await roleInput.press('Enter');
    await page.waitForTimeout(1000);
    await ss(page, '05_role_selected.png');
  } else {
    console.log('Role input not found on step 1 - may be on step 2');
  }

  // Click "Continue Analysis →" button
  const continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn) {
    const isDisabled = await continueBtn.isDisabled();
    console.log(`"Continue Analysis" button found, disabled=${isDisabled}`);
    if (!isDisabled) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, '06_step2_form.png');
    } else {
      console.log('Button is disabled — checking what is missing...');
      const step1Text = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('Step 1 page state:', step1Text);
    }
  } else {
    console.log('Continue Analysis button not found');
    const buttons = await page.$$('button');
    for (let i = 0; i < buttons.length; i++) {
      const t = await buttons[i].innerText();
      const disabled = await buttons[i].isDisabled();
      console.log(`  Button[${i}]: "${t}" disabled=${disabled}`);
    }
    await ss(page, '06_buttons_debug.png');
  }

  // ---- Step 2 of form ----
  console.log('\n=== Checking for Step 2 form ===');
  await page.waitForTimeout(1000);

  // Check if we're on step 2
  const step2Indicator = await page.$('text=STEP 02');
  if (step2Indicator) {
    console.log('On Step 2 of form');

    // Fill role on step 2 if present
    const step2RoleInput = await page.$('input[placeholder="Search role..."]');
    if (step2RoleInput) {
      await step2RoleInput.fill('Software Engineer');
      await page.waitForTimeout(1500);
      await step2RoleInput.press('ArrowDown');
      await page.waitForTimeout(300);
      await step2RoleInput.press('Enter');
      await page.waitForTimeout(500);
    }

    // Click Execute Full Audit
    const executeBtn = await page.$('button:has-text("Execute Full Audit")');
    if (executeBtn) {
      const isDisabled = await executeBtn.isDisabled();
      console.log(`"Execute Full Audit" button found, disabled=${isDisabled}`);
      if (!isDisabled) {
        await executeBtn.click();
        console.log('Clicked Execute Full Audit!');
      }
    } else {
      console.log('Execute Full Audit button not found');
    }
  } else {
    // We might already have the audit running or something else happened
    const currentText = await page.evaluate(() => document.body.innerText.substring(0, 300));
    console.log('Current page state:', currentText);
  }

  await ss(page, '07_after_submit.png');

  // ---- STEP 3: Watch pipeline progress ----
  console.log('\n=== STEP 3: Watching pipeline progress (0-20s) ===');

  let stuckAt33 = false;
  let advancedPast33 = false;
  let pipelineStarted = false;
  const progressReadings = [];

  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    const pageText = await page.evaluate(() => document.body.innerText);

    const has33 = pageText.includes('33%') || pageText.includes('33 %');
    const hasDeploying = pageText.match(/DEPLOYING|Deploying agents|DEPLOYING AGENTS/i);
    const hasProgress = pageText.match(/(\d+)%/g) || [];
    const progressPercents = hasProgress.filter(p => {
      const n = parseInt(p);
      return n > 0 && n <= 100;
    });

    const hasPipelineStage = pageText.match(/Resolving|Fetching|Scraping|Analyzing|Finalizing|Quorum|Identity|Confidence/i);
    const hasDashboard = pageText.match(/Risk Score|Your Score|score|Dashboard/i);

    if (hasPipelineStage || has33 || hasDeploying) pipelineStarted = true;

    const reading = `t=${(i*0.5).toFixed(1)}s: percents=[${progressPercents.slice(0,5).join(',')}] stage=${hasPipelineStage?'YES':'no'} at33=${has33} deploying=${!!hasDeploying} dashboard=${!!hasDashboard}`;
    progressReadings.push(reading);

    if (i % 6 === 0) {
      console.log(reading);
      await ss(page, `08_progress_${(i*500).toString().padStart(6,'0')}ms.png`);
    }

    if (has33) stuckAt33 = true;
    if (stuckAt33 && !has33 && !hasDeploying) {
      advancedPast33 = true;
      console.log(`Pipeline advanced PAST 33% at t=${(i*0.5).toFixed(1)}s!`);
    }

    if (hasDashboard && !hasPipelineStage) {
      console.log(`Dashboard visible at t=${(i*0.5).toFixed(1)}s`);
      break;
    }
  }

  // ---- STEP 4: Wait up to 60s for audit to complete ----
  console.log('\n=== STEP 4: Waiting up to 60s for audit completion ===');

  let auditComplete = false;

  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const pageText = await page.evaluate(() => document.body.innerText);

    const hasPipeline = pageText.match(/Resolving|Fetching|Scraping|Analyzing|Finalizing|Quorum|DEPLOYING|Loading live/i);
    const hasScore = pageText.match(/\b(Risk Score|Your Score|Score:|risk score)\b/i);
    const hasTab = pageText.match(/\b(My Risk|Company|Take Action|Explore|Summary)\b/i);

    if (i % 10 === 0) {
      console.log(`t=${i}s: pipeline=${!!hasPipeline} score=${!!hasScore} tabs=${!!hasTab}`);
      await ss(page, `09_waiting_${i.toString().padStart(3,'0')}s.png`);
    }

    if (hasScore && !hasPipeline) {
      auditComplete = true;
      console.log(`Audit COMPLETE at t=${i}s`);
      await ss(page, '10_audit_complete.png');
      break;
    }

    // Also check if it's completed without the exact "Risk Score" text
    if (hasTab && !hasPipeline && i > 5) {
      auditComplete = true;
      console.log(`Dashboard with tabs visible at t=${i}s`);
      await ss(page, '10_dashboard_tabs.png');
      break;
    }
  }

  // ---- STEP 5: Final dashboard screenshot ----
  console.log('\n=== STEP 5: Final dashboard screenshot ===');
  await ss(page, '11_final_dashboard.png');
  const finalText = await page.evaluate(() => document.body.innerText);
  console.log('Final page (first 1500 chars):');
  console.log(finalText.substring(0, 1500));

  // ---- STEP 6: Check CompanyPulseCard ----
  console.log('\n=== STEP 6: Checking CompanyPulseCard for financial data ===');

  // Try to navigate to My Risk tab
  const tabs = await page.$$('[role="tab"]');
  console.log(`Found ${tabs.length} tabs`);
  let tabNames = [];
  for (const tab of tabs) {
    const t = await tab.innerText();
    tabNames.push(t);
  }
  console.log('Tab names:', tabNames);

  // Click My Risk tab
  for (const tab of tabs) {
    const tabText = await tab.innerText();
    if (tabText.match(/My Risk|Summary|Overview/i)) {
      console.log(`Clicking tab: "${tabText}"`);
      await tab.click();
      await page.waitForTimeout(1000);
      break;
    }
  }

  await ss(page, '12_myrisk_tab.png');
  const pulseText = await page.evaluate(() => document.body.innerText);

  // Check financial data
  const hasStockChange = pulseText.match(/[+-]\d+\.?\d*%/g) || [];
  const hasMarketCap = pulseText.match(/\$\d+\.?\d*[BM]/g) || [];
  const hasPEMatch = pulseText.match(/\d+\.?\d*[×x]\s*P\/E|\bP\/E\s*\d+|\b\d+\.?\d*×/g) || [];
  const hasRevenue = pulseText.match(/Revenue[^\n]{0,50}/g) || [];
  const hasLiveUnavail = pulseText.includes('Live financial signals unavailable') || pulseText.includes('financial signals unavailable');
  const hasINFY = pulseText.includes('INFY') || pulseText.includes('Infosys');

  console.log('Stock price changes found:', hasStockChange.slice(0, 8));
  console.log('Market cap values found:', hasMarketCap.slice(0, 5));
  console.log('P/E ratios found:', hasPEMatch.slice(0, 5));
  console.log('Revenue lines found:', hasRevenue.slice(0, 3));
  console.log('"Live financial signals unavailable" shown:', hasLiveUnavail);
  console.log('INFY/Infosys present in page:', hasINFY);

  // Search specifically for financial chip patterns
  const financialChips = pulseText.match(/[-+]?\d+\.?\d*%|₹[\d,]+|\$[\d.]+[BM]|\d+\.?\d*×/g) || [];
  console.log('Financial chips (all):', financialChips.slice(0, 15));

  // ---- STEP 7: Check news section ----
  console.log('\n=== STEP 7: Checking news section ===');
  const infosysNews = pulseText.match(/Infosys[^\n]{0,150}/g) || [];
  const newsHeadlines = pulseText.match(/\d{4}.*Infosys|Infosys.*\d{4}|Q\d.*Infosys|Infosys.*Q\d/g) || [];
  console.log('Infosys mentions in page:', infosysNews.slice(0, 5));
  console.log('News-like headlines:', newsHeadlines.slice(0, 5));

  // ---- STEP 8: Risk tab screenshot ----
  console.log('\n=== STEP 8: Risk tab screenshot ===');

  const allTabs = await page.$$('[role="tab"]');
  for (const tab of allTabs) {
    const tabText = await tab.innerText();
    if (tabText.match(/Risk|Analysis|Company/i) && !tabText.match(/My Risk/i)) {
      console.log(`Clicking Risk/Analysis tab: "${tabText}"`);
      await tab.click();
      await page.waitForTimeout(1000);
      break;
    }
  }

  await ss(page, '13_risk_tab.png');

  // Try Company tab too
  for (const tab of await page.$$('[role="tab"]')) {
    const tabText = await tab.innerText();
    if (tabText.match(/Company/i)) {
      console.log(`Clicking Company tab: "${tabText}"`);
      await tab.click();
      await page.waitForTimeout(1000);
      await ss(page, '14_company_tab.png');
      break;
    }
  }

  // ---- FINAL REPORT ----
  console.log('\n========== FINAL REPORT ==========');
  console.log(`Server responsive: YES`);
  console.log(`Audit started: ${pipelineStarted}`);
  console.log(`Audit complete: ${auditComplete}`);
  console.log(`Pipeline advanced past 33%: ${advancedPast33 || (pipelineStarted && !stuckAt33)}`);
  console.log(`Was stuck at 33%: ${stuckAt33 && !advancedPast33}`);
  console.log(`INFY/Infosys data visible: ${hasINFY}`);
  console.log(`Market Cap data visible: ${hasMarketCap.length > 0}`);
  console.log(`Stock change data visible: ${hasStockChange.length > 0}`);
  console.log(`"financial signals unavailable": ${hasLiveUnavail}`);

  console.log('\n--- CORS / Console Errors ---');
  console.log(`Total console errors: ${consoleErrors.length}`);
  console.log(`CORS-related errors: ${corsErrors.length}`);
  if (corsErrors.length > 0) {
    corsErrors.forEach(e => console.log('  CORS ERROR:', e));
  }
  if (consoleErrors.length > 0) {
    console.log('All console errors (up to 20):');
    consoleErrors.slice(0, 20).forEach(e => console.log('  ERR:', e));
  }

  console.log('\n--- Network Errors ---');
  console.log(`Total failed requests: ${networkErrors.length}`);
  networkErrors.slice(0, 10).forEach(e => console.log(' ', e));

  console.log('\n--- Progress Timeline ---');
  progressReadings.slice(0, 30).forEach(r => console.log(' ', r));

  console.log('\nScreenshots saved to:', SCREENSHOTS_DIR);

  await browser.close();
})();
