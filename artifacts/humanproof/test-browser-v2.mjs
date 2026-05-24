import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const networkResponses = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text, location: msg.location() });
    // Print important ones live
    if (msg.type() === 'warning' && (text.includes('[AuditPipeline]') || text.includes('[Live') || text.includes('companyData') || text.includes('Hybrid') || text.includes('quorum'))) {
      console.log('[BROWSER WARN]', text.slice(0, 200));
    }
  });
  page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message, stack: err.stack }));

  page.on('response', async resp => {
    try {
      const status = resp.status();
      const url = resp.url();
      if (url.includes('supabase') && !url.includes('scrape_jobs') && !url.includes('scrape-job')) {
        let body = '';
        try { body = await resp.text(); } catch(e) {}
        if (status >= 400 || url.includes('functions')) {
          networkResponses.push({ url: url.slice(0, 120), status, body: body.slice(0, 400) });
        }
      }
    } catch(e) {}
  });

  console.log('Navigating to /terminal ...');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });

  // Fill company input
  const companyInput = await page.$('input[placeholder="Search company..."]');
  if (companyInput) {
    await companyInput.click();
    await companyInput.fill('Infosys');
    await page.waitForTimeout(1000);
  }

  // Check for dropdown results and click first one
  await page.waitForTimeout(1500);

  // Look for search result items
  const resultItems = await page.$$('li, [role="option"]');
  let clicked = false;
  for (const item of resultItems) {
    const text = await item.textContent();
    if (text && text.toLowerCase().includes('infosys')) {
      await item.click();
      clicked = true;
      console.log('Clicked Infosys in dropdown:', text.trim().slice(0, 60));
      break;
    }
  }
  if (!clicked) {
    console.log('No dropdown result found, pressing Enter');
    await companyInput?.press('Enter');
  }

  await page.waitForTimeout(500);

  // Fill role input
  const roleInput = await page.$('input[placeholder="Search role..."]');
  if (roleInput) {
    await roleInput.fill('Software Engineer');
    await page.waitForTimeout(800);
    // Pick first role result
    const roleResults = await page.$$('li, [role="option"]');
    for (const item of roleResults) {
      const text = await item.textContent();
      if (text && text.toLowerCase().includes('software engineer')) {
        await item.click();
        console.log('Clicked role:', text.trim().slice(0, 60));
        break;
      }
    }
  }
  await page.waitForTimeout(500);

  // Click "Continue Analysis" button
  const continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn) {
    await continueBtn.click();
    console.log('Clicked Continue Analysis');
  } else {
    // Try any next/analyze button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = (await btn.textContent())?.trim() || '';
      if (/continue|next|analyze|audit/i.test(text) && !/(📉|🎯)/.test(text)) {
        await btn.click();
        console.log('Clicked button:', text.slice(0, 40));
        break;
      }
    }
  }

  await page.screenshot({ path: 'screenshot-v2-01-loading.png', fullPage: false });
  console.log('Audit started. Waiting up to 90s for completion...');

  // Wait for audit to complete - look for the dashboard with actual results
  let completedAt = null;
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));

    // Check if still in loading state
    if (bodyText.includes('DEPLOYING AGENTS') || bodyText.includes('LOADING')) {
      if (i % 10 === 0) console.log(`Still loading... ${i}s elapsed`);
    }

    // Check if we have a result - look for score or dashboard elements
    if (bodyText.includes('Company Pulse') || bodyText.includes('WORKFORCE') ||
        bodyText.includes('FINANCIAL') || bodyText.includes('AUDIT COMPLETE') ||
        bodyText.includes('confidence:') || bodyText.includes('Confidence:')) {
      console.log(`Audit completed at ${i}s!`);
      completedAt = i;
      break;
    }

    // Also check for the tab navigation which appears after completion
    const tabsExist = await page.$('[class*="SummaryTab"], [data-tab], button[class*="tab-"]');
    if (tabsExist) {
      console.log(`Dashboard tabs appeared at ${i}s`);
      completedAt = i;
      break;
    }
  }

  if (!completedAt) {
    console.log('WARNING: Audit did not complete within 90s');
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshot-v2-02-result.png', fullPage: true });

  // Get body text
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 6000));
  console.log('\n=== BODY TEXT ===');
  console.log(bodyText.slice(0, 3000));

  // Look specifically for Company Pulse data
  const companyPulseContent = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
    const relevant = [];
    let inPulseSection = false;
    for (const line of lines) {
      if (line.includes('Company Pulse') || line.includes('COMPANY PULSE')) {
        inPulseSection = true;
      }
      if (inPulseSection) {
        relevant.push(line);
        if (relevant.length > 30) break;
      }
    }
    return relevant;
  });
  console.log('\n=== COMPANY PULSE SECTION ===');
  companyPulseContent.forEach(l => console.log(l));

  // Check for Market Cap, P/E ratio, employees etc.
  const financialData = await page.evaluate(() => {
    const text = document.body.innerText;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.filter(l =>
      /market cap|mkt cap|p\/e|pe ratio|revenue|employee|headcount|workforce/i.test(l)
    );
  });
  console.log('\n=== FINANCIAL DATA FOUND ===');
  financialData.forEach(l => console.log(l));

  // Check for dash/missing indicators
  const missingData = await page.evaluate(() => {
    const text = document.body.innerText;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.filter(l => l.includes('—') || l.includes('N/A') || l === '—' || l === 'N/A');
  });
  console.log('\n=== MISSING DATA (— or N/A) ===');
  missingData.forEach(l => console.log(l));

  // Get all tab names visible
  const tabNames = await page.evaluate(() => {
    const tabs = document.querySelectorAll('[role="tab"], button[class*="tab"]');
    return Array.from(tabs).map(t => t.textContent?.trim()).filter(Boolean);
  });
  console.log('\n=== TABS VISIBLE ===');
  tabNames.forEach(t => console.log(t));

  // Save report
  const report = {
    completedAt,
    bodyTextPreview: bodyText,
    companyPulseContent,
    financialData,
    missingData,
    tabNames,
    importantNetworkErrors: networkResponses.filter(r => r.status >= 400),
    importantConsoleLogs: consoleLogs.filter(l =>
      l.type === 'pageerror' ||
      (l.type === 'warning' && (l.text.includes('[AuditPipeline]') || l.text.includes('quorum') || l.text.includes('Hybrid'))) ||
      (l.type === 'error' && !l.text.includes('scrape_jobs') && !l.text.includes('400'))
    ).slice(0, 50),
  };

  fs.writeFileSync('test-report-v2.json', JSON.stringify(report, null, 2));
  console.log('\n=== IMPORTANT CONSOLE LOGS ===');
  report.importantConsoleLogs.forEach(l => console.log(l.type, '|', l.text.slice(0, 200)));

  console.log('\nDone. Report saved to test-report-v2.json');
  await browser.close();
})();
