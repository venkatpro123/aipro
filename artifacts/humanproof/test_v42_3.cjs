const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  const consoleErrors = [];
  const consoleLogs = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    } else {
      consoleLogs.push(`[${msg.type()}] ${text}`);
    }
  });

  page.on('requestfailed', req => {
    networkErrors.push(`FAILED: ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      const url = resp.url();
      if (!url.includes('favicon') && !url.includes('.svg')) {
        consoleLogs.push(`[HTTP ${resp.status()}] ${resp.url()}`);
      }
    }
  });

  // ---- STEP 1: Load homepage ----
  console.log('\n=== STEP 1: Loading http://localhost:5173 ===');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_homepage.png'), fullPage: true });
  const title = await page.title();
  console.log(`Page title: "${title}"`);
  console.log(`URL: ${page.url()}`);

  // Check for main elements
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Body text (first 500 chars):', bodyText);

  // ---- STEP 2: Enter company + role and submit ----
  console.log('\n=== STEP 2: Entering Infosys + Software Engineer ===');

  // Look for input fields
  const inputs = await page.$$('input');
  console.log(`Found ${inputs.length} input elements`);

  // Try to find company input
  let companyInput = await page.$('input[placeholder*="company" i]') ||
                     await page.$('input[placeholder*="Company" i]') ||
                     await page.$('input[name*="company" i]') ||
                     await page.$('input[id*="company" i]');

  let roleInput = await page.$('input[placeholder*="role" i]') ||
                  await page.$('input[placeholder*="Role" i]') ||
                  await page.$('input[placeholder*="job" i]') ||
                  await page.$('input[name*="role" i]') ||
                  await page.$('input[id*="role" i]');

  if (!companyInput && inputs.length >= 1) {
    companyInput = inputs[0];
    console.log('Using first input as company field');
  }
  if (!roleInput && inputs.length >= 2) {
    roleInput = inputs[1];
    console.log('Using second input as role field');
  }

  // Log all input placeholders for debugging
  for (let i = 0; i < inputs.length; i++) {
    const placeholder = await inputs[i].getAttribute('placeholder');
    const name = await inputs[i].getAttribute('name');
    const id = await inputs[i].getAttribute('id');
    console.log(`Input[${i}]: placeholder="${placeholder}", name="${name}", id="${id}"`);
  }

  if (companyInput) {
    await companyInput.click();
    await companyInput.fill('Infosys');
    console.log('Filled company: Infosys');
  } else {
    console.log('ERROR: Could not find company input');
  }

  if (roleInput) {
    await roleInput.click();
    await roleInput.fill('Software Engineer');
    console.log('Filled role: Software Engineer');
  } else {
    console.log('ERROR: Could not find role input');
  }

  // Take screenshot after filling inputs
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_inputs_filled.png'), fullPage: true });

  // Find and click submit button
  let submitBtn = await page.$('button[type="submit"]') ||
                  await page.$('button:has-text("Analyze")') ||
                  await page.$('button:has-text("Run Audit")') ||
                  await page.$('button:has-text("Audit")') ||
                  await page.$('button:has-text("Check")') ||
                  await page.$('button:has-text("Go")') ||
                  await page.$('button:has-text("Submit")') ||
                  await page.$('button:has-text("Start")');

  if (!submitBtn) {
    // Try finding any button near the inputs
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons:`);
    for (let i = 0; i < buttons.length; i++) {
      const btnText = await buttons[i].innerText();
      console.log(`  Button[${i}]: "${btnText}"`);
    }
    if (buttons.length > 0) {
      submitBtn = buttons[buttons.length - 1]; // last button often is submit
    }
  }

  if (submitBtn) {
    const btnText = await submitBtn.innerText();
    console.log(`Clicking submit button: "${btnText}"`);
    await submitBtn.click();
  } else {
    console.log('ERROR: Could not find submit button');
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_after_submit.png'), fullPage: true });

  // ---- STEP 3: Watch pipeline progress ----
  console.log('\n=== STEP 3: Watching pipeline progress ===');

  let progressReadings = [];
  let stuckAt33 = false;
  let lastProgress = -1;
  let advancedPast33 = false;

  // Poll for progress over 10 seconds initially
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);

    const pageText = await page.evaluate(() => document.body.innerText);

    // Look for percentage indicators
    const percentMatches = pageText.match(/(\d+)%/g) || [];
    const progressBars = await page.$$('[role="progressbar"]');
    let progressValues = [];
    for (const bar of progressBars) {
      const val = await bar.getAttribute('aria-valuenow') || await bar.getAttribute('value');
      if (val) progressValues.push(val);
    }

    // Check for specific pipeline stage text
    const hasDeployingAgents = pageText.includes('DEPLOYING') || pageText.includes('Deploying');
    const hasAnalyzing = pageText.includes('Analyzing') || pageText.includes('analyzing');
    const hasComplete = pageText.includes('complete') || pageText.includes('Complete') || pageText.includes('Score');
    const has33 = pageText.includes('33%');
    const progressInfo = `t=${i*0.5}s: percents=[${percentMatches.join(',')}] bars=[${progressValues.join(',')}] deploying=${hasDeployingAgents} analyzing=${hasAnalyzing} complete=${hasComplete} at33=${has33}`;
    progressReadings.push(progressInfo);

    if (i % 4 === 0) {
      console.log(progressInfo);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `04_progress_t${i*500}ms.png`) });
    }

    if (has33) stuckAt33 = true;
    if (!has33 && stuckAt33) {
      advancedPast33 = true;
      console.log('Pipeline ADVANCED past 33%!');
    }
    if (hasComplete) {
      console.log('Pipeline appears complete!');
      break;
    }
  }

  // ---- STEP 4: Wait up to 60 seconds for completion ----
  console.log('\n=== STEP 4: Waiting up to 60s for audit completion ===');

  let auditComplete = false;
  let dashboardVisible = false;

  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);

    const pageText = await page.evaluate(() => document.body.innerText);

    // Check for dashboard indicators
    const hasScore = pageText.match(/\b(Risk Score|Your Score|Score:|score)\b/i);
    const hasRiskTab = pageText.match(/\b(My Risk|Risk Analysis|Company Risk)\b/i);
    const hasDashboard = pageText.match(/\b(Dashboard|Overview|Summary)\b/i);
    const hasPercent = pageText.match(/\b\d{1,3}%\b/);
    const hasPipeline = pageText.match(/DEPLOYING|Deploying|Scraping|Fetching|Loading/i);

    if (i % 10 === 0 || (!hasPipeline && hasScore)) {
      console.log(`t=${i}s: score=${!!hasScore} riskTab=${!!hasRiskTab} dashboard=${!!hasDashboard} pipeline=${!!hasPipeline}`);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `05_waiting_${i}s.png`) });
    }

    if (hasScore && !hasPipeline) {
      auditComplete = true;
      dashboardVisible = true;
      console.log(`Audit COMPLETE at t=${i}s`);
      break;
    }
  }

  // ---- STEP 5: Screenshot final dashboard ----
  console.log('\n=== STEP 5: Final dashboard screenshot ===');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_final_dashboard.png'), fullPage: true });
  const finalPageText = await page.evaluate(() => document.body.innerText);
  console.log('Final page text (first 1000 chars):', finalPageText.substring(0, 1000));

  // ---- STEP 6: Check CompanyPulseCard ----
  console.log('\n=== STEP 6: Checking CompanyPulseCard for financial data ===');

  // Try to find My Risk tab
  const tabs = await page.$$('[role="tab"]');
  console.log(`Found ${tabs.length} tabs`);
  for (let i = 0; i < tabs.length; i++) {
    const tabText = await tabs[i].innerText();
    console.log(`  Tab[${i}]: "${tabText}"`);
  }

  // Click My Risk tab if found
  let myRiskTab = null;
  for (const tab of tabs) {
    const tabText = await tab.innerText();
    if (tabText.match(/My Risk|Risk|Summary/i)) {
      myRiskTab = tab;
      break;
    }
  }

  if (myRiskTab) {
    const tabText = await myRiskTab.innerText();
    console.log(`Clicking tab: "${tabText}"`);
    await myRiskTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_myrisk_tab.png'), fullPage: true });
  }

  // Check for financial data in the page
  const pageTextAfterTab = await page.evaluate(() => document.body.innerText);

  // Look for specific financial metrics
  const hasStockChange = pageTextAfterTab.match(/[+-]\d+\.?\d*%/g) || [];
  const hasMarketCap = pageTextAfterTab.match(/\$\d+\.?\d*[BM]/g) || [];
  const hasPE = pageTextAfterTab.match(/\d+\.?\d*[×x]/g) || [];
  const hasRevenue = pageTextAfterTab.match(/Revenue|revenue/g) || [];
  const hasLiveUnavailable = pageTextAfterTab.includes('Live financial signals unavailable') ||
                              pageTextAfterTab.includes('financial signals unavailable');

  console.log('Stock price changes found:', hasStockChange.slice(0, 5));
  console.log('Market cap values found:', hasMarketCap.slice(0, 5));
  console.log('P/E ratios found:', hasPE.slice(0, 5));
  console.log('Revenue mentions:', hasRevenue.slice(0, 3));
  console.log('"Live financial signals unavailable" shown:', hasLiveUnavailable);

  // Look for CompanyPulseCard specifically
  const companyPulseCard = await page.$('[data-testid="company-pulse-card"]') ||
                            await page.$('.company-pulse-card') ||
                            await page.$('[class*="CompanyPulse"]');
  if (companyPulseCard) {
    const cardText = await companyPulseCard.innerText();
    console.log('CompanyPulseCard text:', cardText.substring(0, 500));
  } else {
    console.log('CompanyPulseCard not found by selector, searching text...');
    if (pageTextAfterTab.includes('Infosys') || pageTextAfterTab.includes('INFY')) {
      console.log('Infosys/INFY found in page text - company card present');
    }
  }

  // ---- STEP 7: Check news section ----
  console.log('\n=== STEP 7: Checking for Infosys news headlines ===');
  const newsMatches = pageTextAfterTab.match(/Infosys[^\n]{0,100}/g) || [];
  console.log('Infosys mentions in page:', newsMatches.slice(0, 5));

  // Look for news/signals section
  const hasNewsSection = pageTextAfterTab.match(/News|Headlines|Recent|Signal/i);
  console.log('News section present:', !!hasNewsSection);

  // ---- STEP 8: Screenshot Risk tab ----
  console.log('\n=== STEP 8: Risk tab screenshot ===');

  // Find and click risk analysis tab
  let riskTab = null;
  const allTabs = await page.$$('[role="tab"]');
  for (const tab of allTabs) {
    const tabText = await tab.innerText();
    if (tabText.match(/Risk|Analysis/i) && !tabText.match(/My Risk/i)) {
      riskTab = tab;
      break;
    }
  }

  // Also try finding by text content
  if (!riskTab) {
    riskTab = await page.$('text=Risk Analysis') ||
              await page.$('text=Take Action') ||
              await page.$('text=Explore');
  }

  if (riskTab) {
    const tabText = await riskTab.innerText();
    console.log(`Clicking Risk tab: "${tabText}"`);
    await riskTab.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_risk_tab.png'), fullPage: true });

  // ---- FINAL REPORT ----
  console.log('\n========== FINAL REPORT ==========');
  console.log(`Server responsive: YES`);
  console.log(`Page title: "${title}"`);
  console.log(`Audit complete: ${auditComplete}`);
  console.log(`Dashboard visible: ${dashboardVisible}`);
  console.log(`Advanced past 33%: ${advancedPast33 || !stuckAt33}`);
  console.log(`Stuck at 33%: ${stuckAt33 && !advancedPast33}`);
  console.log(`Financial data visible: ${hasMarketCap.length > 0 || hasStockChange.length > 0}`);
  console.log(`"unavailable" message shown: ${hasLiveUnavailable}`);

  console.log('\n--- CORS / Console Errors ---');
  const corsErrors = consoleErrors.filter(e => e.toLowerCase().includes('cors') || e.toLowerCase().includes('preflight') || e.toLowerCase().includes('cross-origin'));
  console.log(`Total console errors: ${consoleErrors.length}`);
  console.log(`CORS-related errors: ${corsErrors.length}`);
  if (corsErrors.length > 0) {
    corsErrors.forEach(e => console.log('  CORS:', e));
  }
  if (consoleErrors.length > 0) {
    console.log('All console errors:');
    consoleErrors.slice(0, 20).forEach(e => console.log('  ERR:', e));
  }

  console.log('\n--- Network Errors ---');
  console.log(`Total failed requests: ${networkErrors.length}`);
  networkErrors.slice(0, 10).forEach(e => console.log(' ', e));

  console.log('\n--- Progress Timeline ---');
  progressReadings.forEach(r => console.log(' ', r));

  console.log('\nScreenshots saved to:', SCREENSHOTS_DIR);

  await browser.close();
})();
