import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const networkRequests = [];
  const networkResponses = [];

  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text(), location: msg.location() }));
  page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message, stack: err.stack }));

  page.on('request', req => networkRequests.push({ url: req.url(), method: req.method() }));
  page.on('response', async resp => {
    try {
      const status = resp.status();
      const url = resp.url();
      if (url.includes('supabase') || url.includes('5173') || url.includes('functions')) {
        let body = '';
        try { body = await resp.text(); } catch(e) {}
        networkResponses.push({ url, status, bodyPreview: body.slice(0, 800) });
      }
    } catch(e) {}
  });

  console.log('Navigating to /terminal ...');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshot-01-terminal.png', fullPage: true });
  console.log('Screenshot 1 saved - terminal page');

  // Find all inputs
  const inputs = await page.$$('input');
  console.log('Found inputs:', inputs.length);
  for (const input of inputs) {
    const placeholder = await input.getAttribute('placeholder');
    const type = await input.getAttribute('type');
    console.log('  Input:', { placeholder, type });
  }

  // Find and click the company search input
  const companyInput = await page.$('input[placeholder="Search company..."]');
  if (companyInput) {
    console.log('Found company search input');
    await companyInput.click();
    await companyInput.fill('Infosys');
    console.log('Typed Infosys');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshot-02-company-typed.png', fullPage: true });
  } else {
    console.log('ERROR: Company search input NOT found!');
    // List all placeholders
    const allInputs = await page.$$eval('input', els => els.map(el => ({ ph: el.placeholder, type: el.type, id: el.id, name: el.name })));
    console.log('All inputs:', JSON.stringify(allInputs, null, 2));
  }

  // Look for search results/dropdown
  await page.waitForTimeout(1000);
  const dropdownItems = await page.$$('[class*="dropdown"], [class*="suggestion"], [class*="result"]');
  console.log('Dropdown items found:', dropdownItems.length);

  // Also try to find list items that appeared after typing
  const listItems = await page.$$('li, [role="option"], [role="listitem"]');
  console.log('List items found:', listItems.length);
  for (const item of listItems.slice(0, 5)) {
    const text = await item.textContent();
    console.log('  List item:', text?.trim()?.slice(0, 80));
  }

  // Try clicking the first result or pressing Enter
  const firstResult = await page.$('[class*="search-result"], [class*="company-result"], [class*="suggestion-item"]');
  if (firstResult) {
    await firstResult.click();
    console.log('Clicked first search result');
  } else {
    // Just press Enter on the input
    if (companyInput) {
      await companyInput.press('Enter');
      console.log('Pressed Enter on company input');
    }
  }
  await page.waitForTimeout(1000);

  // Now look for role input
  const roleInput = await page.$('input[placeholder*="role"], input[placeholder*="Role"], input[placeholder*="job"], input[placeholder*="Job"]');
  if (roleInput) {
    console.log('Found role input');
    await roleInput.click();
    await roleInput.fill('Software Engineer');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshot-03-role-typed.png', fullPage: true });
  }

  // Look for Next/Analyze/Start button
  const buttons = await page.$$('button');
  const buttonTexts = [];
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text) buttonTexts.push(text.trim());
  }
  console.log('All buttons:', buttonTexts);

  // Click "Next" or "Run Audit" or "Analyze"
  for (const btn of buttons) {
    const text = (await btn.textContent())?.trim() || '';
    if (/next|continue|analyze|audit|run|start/i.test(text)) {
      console.log('Clicking button:', text);
      await btn.click();
      await page.waitForTimeout(1500);
      break;
    }
  }

  await page.screenshot({ path: 'screenshot-04-after-next.png', fullPage: true });
  console.log('Screenshot 4 - after next button');

  // Try to fill in step 2 if needed (role/department)
  const inputs2 = await page.$$('input');
  for (const inp of inputs2) {
    const placeholder = await inp.getAttribute('placeholder') || '';
    console.log('  Step2 Input:', placeholder);
    if (/role|job|title/i.test(placeholder)) {
      await inp.fill('Software Engineer');
      await inp.press('Enter');
      break;
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot-05-step2.png', fullPage: true });

  // Now look for the final Run/Start Audit button
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = (await btn.textContent())?.trim() || '';
    if (/run.*audit|start.*audit|analyze|calculate|submit/i.test(text)) {
      console.log('Clicking final audit button:', text);
      await btn.click();
      break;
    }
  }

  // Wait for audit result (up to 90s)
  console.log('Waiting for audit result...');
  try {
    await page.waitForSelector('[class*="CompanyPulse"], [class*="company-pulse"], [class*="score-ring"], [class*="AuditDashboard"], [class*="audit-dashboard"]', { timeout: 90000 });
    console.log('Audit result appeared!');
  } catch(e) {
    console.log('Audit result timeout. Checking what is on screen...');
  }

  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshot-06-audit-result.png', fullPage: true });
  console.log('Screenshot 6 - audit result');

  // Extract body text
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 5000));
  console.log('\n=== BODY TEXT (first 2000) ===');
  console.log(bodyText.slice(0, 2000));

  // Check CompanyPulseCard content specifically
  const pulseCardContent = await page.evaluate(() => {
    // Try multiple selectors that might match CompanyPulseCard
    const selectors = [
      '[class*="pulse"]',
      '[class*="company"]',
      '[class*="workforce"]',
      '[class*="financial"]',
      '[class*="tier"]',
      '[class*="verdict"]',
    ];
    const results = {};
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        results[sel] = Array.from(els).slice(0, 3).map(el => el.textContent?.trim()?.slice(0, 200));
      }
    }
    return results;
  });
  console.log('\n=== CompanyPulseCard content ===');
  console.log(JSON.stringify(pulseCardContent, null, 2));

  // Check for "—" dash values (missing data indicators)
  const dashValues = await page.evaluate(() => {
    const allText = document.body.innerText;
    // Find patterns like "Market Cap: —" or "$—" or just "—"
    const matches = [];
    const lines = allText.split('\n');
    for (const line of lines) {
      if (line.includes('—') || line.includes('N/A') || line.includes('undefined')) {
        matches.push(line.trim());
      }
    }
    return matches.slice(0, 20);
  });
  console.log('\n=== Missing/dash values ===');
  dashValues.forEach(v => console.log(' ', v));

  // Check Market Cap and P/E ratio specifically
  const financialChips = await page.evaluate(() => {
    const allText = document.body.innerText;
    const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.filter(l =>
      l.toLowerCase().includes('market cap') ||
      l.toLowerCase().includes('p/e') ||
      l.toLowerCase().includes('revenue') ||
      l.toLowerCase().includes('employees') ||
      l.toLowerCase().includes('workforce')
    );
  });
  console.log('\n=== Financial chip values ===');
  financialChips.forEach(v => console.log(' ', v));

  // Save full report
  const report = {
    consoleErrors: consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror'),
    consoleWarnings: consoleLogs.filter(l => l.type === 'warning'),
    importantLogs: consoleLogs.filter(l =>
      l.text.includes('Error') || l.text.includes('error') ||
      l.text.includes('[Audit') || l.text.includes('[Live') ||
      l.text.includes('[Comp') || l.text.includes('companyData') ||
      l.text.includes('Pulse') || l.text.includes('undefined') ||
      l.text.includes('null')
    ),
    allConsoleLogs: consoleLogs,
    networkFailures: networkResponses.filter(r => r.status >= 400),
    supabaseResponses: networkResponses.filter(r => r.url.includes('supabase') || r.url.includes('functions')),
    bodyTextPreview: bodyText,
    pulseCardContent,
    dashValues,
    financialChips,
  };

  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));

  console.log('\n=== CONSOLE ERRORS ===');
  report.consoleErrors.forEach(l => {
    console.log('TYPE:', l.type);
    console.log('TEXT:', l.text);
    if (l.stack) console.log('STACK:', l.stack.slice(0, 500));
    console.log('---');
  });

  console.log('\n=== NETWORK FAILURES ===');
  report.networkFailures.forEach(r => console.log(r.status, r.url.slice(0, 100)));

  console.log('\n=== SUPABASE/EF RESPONSES ===');
  report.supabaseResponses.slice(0, 20).forEach(r => {
    console.log(r.status, r.url.slice(0, 100));
    if (r.status >= 400) console.log('  BODY:', r.bodyPreview.slice(0, 300));
  });

  console.log('\n=== IMPORTANT LOGS ===');
  report.importantLogs.slice(0, 30).forEach(l => console.log(l.type, '|', l.text.slice(0, 200)));

  await browser.close();
  console.log('\nDone. Report saved to test-report.json');
})();
