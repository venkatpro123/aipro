import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const networkResponses = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text, location: msg.location() });
    if (text.includes('[AuditPipeline]') || text.includes('[Live') || text.includes('quorum') || text.includes('Hybrid') || text.includes('companyData')) {
      console.log('[BROWSER]', msg.type(), text.slice(0, 250));
    }
  });
  page.on('pageerror', err => {
    consoleLogs.push({ type: 'pageerror', text: err.message, stack: err.stack });
    console.log('[PAGE ERROR]', err.message.slice(0, 200));
  });

  page.on('response', async resp => {
    try {
      const status = resp.status();
      const url = resp.url();
      if (url.includes('functions/v1') || (url.includes('supabase') && status >= 400 && !url.includes('scrape_jobs'))) {
        let body = '';
        try { body = await resp.text(); } catch(e) {}
        networkResponses.push({ url: url.slice(0, 120), status, body: body.slice(0, 500) });
        if (status >= 400) {
          console.log('[NETWORK ERROR]', status, url.slice(0, 100));
          if (body) console.log('  BODY:', body.slice(0, 200));
        }
      }
    } catch(e) {}
  });

  console.log('Navigating to /terminal ...');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });

  // Fill company input
  await page.waitForTimeout(500);
  const companyInput = await page.$('input[placeholder="Search company..."]');
  if (!companyInput) {
    console.log('ERROR: company input not found!');
    await browser.close();
    return;
  }

  await companyInput.click();
  await companyInput.fill('Infosys');
  console.log('Typed Infosys');
  await page.waitForTimeout(1200);

  // Get and print all list items that appeared
  const allLis = await page.$$('li');
  console.log(`Found ${allLis.length} li elements after typing`);
  for (const li of allLis.slice(0, 8)) {
    const text = await li.textContent();
    console.log('  LI:', text?.trim()?.slice(0, 80));
  }

  // Select the company by pressing keyboard
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  console.log('Selected company via keyboard');
  await page.waitForTimeout(800);

  // Fill role
  const roleInput = await page.$('input[placeholder="Search role..."]');
  if (roleInput) {
    await roleInput.click();
    await roleInput.fill('Software Engineer');
    console.log('Typed Software Engineer');
    await page.waitForTimeout(1200);

    // Select role via keyboard
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    console.log('Selected role via keyboard');
    await page.waitForTimeout(500);
  }

  // Take screenshot of state before clicking continue
  await page.screenshot({ path: 'screenshot-v3-01-inputs-filled.png', fullPage: false });

  // Click Continue Analysis button
  const continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn) {
    await continueBtn.click({ force: true });
    console.log('Clicked Continue Analysis');
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-v3-02-after-continue.png', fullPage: false });

  // Check if we need to fill a department/country step
  const step2Body = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('Step 2 state:', step2Body.slice(0, 200));

  // Look for another "Continue" button after potential step 2
  const step2Continue = await page.$('button:has-text("Continue Analysis"), button:has-text("Run Audit"), button:has-text("Start Audit")');
  if (step2Continue) {
    await step2Continue.click({ force: true });
    console.log('Clicked step 2 Continue');
    await page.waitForTimeout(1000);
  }

  // Also look for "Calculate" or submit buttons
  const calculateBtn = await page.$('button:has-text("Calculate"), button:has-text("Submit")');
  if (calculateBtn) {
    await calculateBtn.click({ force: true });
    console.log('Clicked Calculate/Submit');
  }

  await page.screenshot({ path: 'screenshot-v3-03-loading.png', fullPage: false });
  console.log('Audit started. Waiting up to 90s for completion...');

  // Wait for actual result content
  let completedAt = null;
  let lastBodyText = '';
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));

    if (i % 10 === 0 || bodyText !== lastBodyText) {
      if (i % 5 === 0) console.log(`[${i}s] Body: ${bodyText.slice(0, 150).replace(/\n/g, ' ')}`);
      lastBodyText = bodyText;
    }

    // Check if still in loading/spy state
    if (bodyText.includes('DEPLOYING AGENTS') || bodyText.includes('INTELLIGENCE GATHERED') || bodyText.includes('LOADING')) {
      continue;
    }

    // Look for completed audit markers
    if (
      bodyText.includes('Company Pulse') ||
      bodyText.includes('COMPANY PULSE') ||
      bodyText.includes('Summary') ||
      bodyText.includes('MY RISK') ||
      bodyText.includes('Risk Score') ||
      bodyText.includes('Layoff Risk') ||
      bodyText.includes('CONFIDENCE')
    ) {
      console.log(`Audit results visible at ${i}s!`);
      completedAt = i;
      break;
    }
  }

  if (!completedAt) {
    console.log('WARNING: Did not detect completed audit within 90s');
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot-v3-04-final.png', fullPage: true });

  const finalBodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== FINAL BODY TEXT (first 4000 chars) ===');
  console.log(finalBodyText.slice(0, 4000));

  // Look for Company Pulse area specifically
  const companyPulseHtml = await page.evaluate(() => {
    // Try to find CompanyPulseCard-related elements
    const allText = document.body.innerText;
    const idx = allText.indexOf('Company Pulse');
    if (idx >= 0) {
      return allText.slice(Math.max(0, idx - 50), idx + 800);
    }
    return 'NOT FOUND IN PAGE';
  });
  console.log('\n=== COMPANY PULSE TEXT ===');
  console.log(companyPulseHtml);

  // Check for missing data indicators
  const missingIndicators = await page.evaluate(() => {
    const text = document.body.innerText;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return {
      dashLines: lines.filter(l => /^—$|: —$| — |^—|—$/.test(l)).slice(0, 20),
      undefinedLines: lines.filter(l => l.toLowerCase().includes('undefined')).slice(0, 10),
      naLines: lines.filter(l => /^N\/A$|: N\/A$/.test(l)).slice(0, 10),
    };
  });
  console.log('\n=== MISSING DATA INDICATORS ===');
  console.log(JSON.stringify(missingIndicators, null, 2));

  // Get chip content
  const chips = await page.evaluate(() => {
    const spans = document.querySelectorAll('span, div');
    const chipTexts = [];
    for (const el of spans) {
      const text = el.textContent?.trim();
      if (text && text.length > 2 && text.length < 60) {
        const styles = window.getComputedStyle(el);
        if (styles.borderRadius && parseInt(styles.borderRadius) > 3) {
          chipTexts.push(text);
        }
      }
    }
    return [...new Set(chipTexts)].slice(0, 40);
  });
  console.log('\n=== CHIP CONTENT ===');
  chips.forEach(c => console.log(' ', c));

  // Save all data
  const report = {
    completedAt,
    bodyText: finalBodyText,
    companyPulseText: companyPulseHtml,
    missingIndicators,
    chips,
    networkErrors: networkResponses.filter(r => r.status >= 400),
    consoleLogs: consoleLogs.filter(l =>
      l.type === 'pageerror' ||
      l.text.includes('[AuditPipeline]') ||
      l.text.includes('[Live') ||
      l.text.includes('quorum') ||
      l.text.includes('Hybrid') ||
      l.text.includes('companyData')
    ).slice(0, 60),
  };

  fs.writeFileSync('test-report-v3.json', JSON.stringify(report, null, 2));

  console.log('\n=== KEY NETWORK ERRORS ===');
  const uniqueErrors = {};
  for (const r of report.networkErrors) {
    const key = r.body.slice(0, 100);
    if (!uniqueErrors[key]) {
      uniqueErrors[key] = r;
      console.log(r.status, r.url);
      console.log('  ', r.body.slice(0, 200));
    }
  }

  await browser.close();
  console.log('\nDone. Reports saved.');
})();
