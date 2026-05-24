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
    if (text.includes('[AuditPipeline]') || text.includes('[Live') || text.includes('quorum') ||
        text.includes('Hybrid') || text.includes('companyData') || text.includes('CompanyPulse') ||
        text.includes('fetch-company') || text.includes('OSINT') || text.includes('Step ')) {
      console.log('[BROWSER]', msg.type().toUpperCase(), text.slice(0, 300));
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
      const isEF = url.includes('functions/v1');
      const isSupabaseError = url.includes('supabase') && status >= 400 && !url.includes('scrape_jobs');
      if (isEF || isSupabaseError) {
        let body = '';
        try { body = await resp.text(); } catch(e) {}
        networkResponses.push({ url: url.slice(0, 150), status, body: body.slice(0, 600) });
        if (status >= 400) {
          console.log('[NET ERROR]', status, url.slice(40, 130));
          if (body && body.length > 2) console.log('  BODY:', body.slice(0, 250));
        } else if (isEF) {
          console.log('[EF OK]', status, url.slice(40, 130), body.slice(0, 80));
        }
      }
    } catch(e) {}
  });

  console.log('=== STEP 1: Navigate to /terminal ===');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // ── Step 1: Fill company name ──────────────────────────────────────────────
  console.log('=== STEP 2: Fill company name ===');
  const companyInput = await page.$('input[placeholder="Search company..."]');
  await companyInput.click();
  await companyInput.fill('Infosys');
  await page.waitForTimeout(1200);

  // Select first dropdown result with keyboard
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  console.log('Company selected');
  await page.waitForTimeout(500);

  // ── Step 2: Fill role ──────────────────────────────────────────────────────
  console.log('=== STEP 3: Fill role ===');
  const roleInput = await page.$('input[placeholder="Search role..."]');
  await roleInput.click();
  await roleInput.fill('Software Engineer');
  await page.waitForTimeout(1200);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  console.log('Role selected');
  await page.waitForTimeout(1000);

  // ── Step 3: Click "Continue Analysis" (Step 1 → Step 2) ───────────────────
  console.log('=== STEP 4: Click Continue Analysis ===');
  await page.screenshot({ path: 'v4-01-before-continue.png', fullPage: false });

  // Scroll down to find the Continue button
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);

  let continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn) {
    await continueBtn.click({ force: true });
    console.log('Clicked Continue Analysis (step 1→2)');
  } else {
    console.log('WARNING: Continue Analysis button not found at step 1');
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'v4-02-step2.png', fullPage: false });

  // ── Step 4: Click "Continue Analysis" again (Step 2 → Step 3) ─────────────
  console.log('=== STEP 5: Click Continue Analysis again ===');
  continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn) {
    await continueBtn.click({ force: true });
    console.log('Clicked Continue Analysis (step 2→3)');
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'v4-03-step3.png', fullPage: false });

  // ── Step 5: Click "Execute Full Audit" ────────────────────────────────────
  console.log('=== STEP 6: Click Execute Full Audit ===');
  const executeBtn = await page.$('button:has-text("Execute Full Audit")');
  if (executeBtn) {
    await executeBtn.click({ force: true });
    console.log('Clicked Execute Full Audit!');
  } else {
    // Try other patterns
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = (await btn.textContent())?.trim() || '';
      if (/execute|run audit|full audit/i.test(text)) {
        await btn.click({ force: true });
        console.log('Clicked audit button:', text);
        break;
      }
    }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'v4-04-audit-started.png', fullPage: false });

  console.log('=== WAITING FOR AUDIT TO COMPLETE (up to 90s) ===');

  let completedAt = null;
  for (let i = 0; i < 95; i++) {
    await page.waitForTimeout(1000);
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));

    if (i % 5 === 0) {
      console.log(`[${i}s] ${bodyText.slice(0, 200).replace(/\n/g, ' ')}`);
    }

    // Detect loading/spy state
    const isLoading = bodyText.includes('DEPLOYING AGENTS') || bodyText.includes('INTELLIGENCE GATHERED') ||
                      bodyText.includes('Sending 30+') || bodyText.includes('AGENTS:');

    // Detect completed state
    const isComplete =
      bodyText.includes('Company Pulse') || bodyText.includes('COMPANY PULSE') ||
      bodyText.includes('Summary') && !bodyText.includes('MY DASHBOARD') ||
      bodyText.includes('Layoff Risk') || bodyText.includes('LAYOFF RISK') ||
      bodyText.includes('Risk Score') || bodyText.includes('RISK SCORE') ||
      bodyText.includes('MY RISK') || bodyText.includes('PROTECTION') ||
      bodyText.includes('Action Plan') || bodyText.includes('ACTION PLAN');

    if (isComplete && !isLoading) {
      console.log(`\n AUDIT COMPLETED at ${i}s!`);
      completedAt = i;
      break;
    }
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'v4-05-final.png', fullPage: true });

  const finalBodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== FULL BODY TEXT ===');
  console.log(finalBodyText.slice(0, 5000));

  // ── Detailed analysis of CompanyPulseCard ─────────────────────────────────
  console.log('\n=== COMPANY PULSE CARD ANALYSIS ===');
  const pulseAnalysis = await page.evaluate(() => {
    const text = document.body.innerText;

    // Find Company Pulse section
    const pulseIdx = text.indexOf('Company Pulse');
    const pulseSection = pulseIdx >= 0 ? text.slice(pulseIdx, pulseIdx + 1000) : 'NOT FOUND';

    // Find all chip-like content
    const allLines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Look for financial data
    const financialLines = allLines.filter(l =>
      /market.*cap|mkt.*cap|p\/e|pe.*ratio|revenue|employees|workforce|headcount|\$\d/i.test(l)
    );

    // Look for dash values
    const dashLines = allLines.filter(l => l === '—' || l.endsWith(': —') || l.endsWith(' —') || /^\s*—\s*$/.test(l));

    // Look for the key metrics on the card
    const metricsLines = allLines.filter(l =>
      /^\d+[%K]|^\$\d|^—$|stable|healthy|critical|distressed|softening|unverified|no data/i.test(l)
    );

    return { pulseSection, financialLines, dashLines, metricsLines: metricsLines.slice(0, 20) };
  });

  console.log('Pulse section:', pulseAnalysis.pulseSection.slice(0, 500));
  console.log('\nFinancial lines:', pulseAnalysis.financialLines);
  console.log('\nDash lines:', pulseAnalysis.dashLines);
  console.log('\nMetrics lines:', pulseAnalysis.metricsLines);

  // ── Check individual chip/span values ─────────────────────────────────────
  console.log('\n=== CHIP VALUES ===');
  const chipValues = await page.evaluate(() => {
    // Find elements that look like data chips
    const results = [];
    const allEls = document.querySelectorAll('[class*="chip"], [class*="badge"], [class*="tag"], [class*="metric"]');
    for (const el of allEls) {
      results.push({ tag: el.tagName, class: el.className.slice(0, 50), text: el.textContent?.trim().slice(0, 60) });
    }
    return results.slice(0, 30);
  });
  chipValues.forEach(c => console.log(` [${c.tag}] ${c.class} => ${c.text}`));

  // ── Save report ────────────────────────────────────────────────────────────
  const report = {
    completedAt,
    bodyText: finalBodyText,
    pulseAnalysis,
    chipValues,
    uniqueNetworkErrors: Object.values(
      networkResponses
        .filter(r => r.status >= 400)
        .reduce((acc, r) => {
          const key = r.body.slice(0, 80);
          if (!acc[key]) acc[key] = r;
          return acc;
        }, {})
    ),
    efResponses: networkResponses.filter(r => r.url.includes('functions')),
    importantConsoleLogs: consoleLogs.filter(l =>
      l.type === 'pageerror' ||
      l.text.includes('[AuditPipeline]') ||
      l.text.includes('quorum') ||
      l.text.includes('Hybrid') ||
      l.text.includes('OSINT') ||
      l.text.includes('fetch-company') ||
      l.text.includes('companyData')
    ).slice(0, 60),
  };

  fs.writeFileSync('test-report-v4.json', JSON.stringify(report, null, 2));

  console.log('\n=== UNIQUE NETWORK ERRORS ===');
  report.uniqueNetworkErrors.forEach(r => {
    console.log(r.status, r.url.slice(40));
    console.log('  ', r.body.slice(0, 200));
  });

  console.log('\n=== EDGE FUNCTION RESPONSES ===');
  report.efResponses.forEach(r => {
    console.log(r.status, r.url.slice(40));
    if (r.status >= 400) console.log('  ERROR:', r.body.slice(0, 200));
    else console.log('  OK:', r.body.slice(0, 100));
  });

  console.log('\n=== CONSOLE LOGS ===');
  report.importantConsoleLogs.forEach(l => console.log(l.type, '|', l.text.slice(0, 250)));

  await browser.close();
  console.log('\nDone. Report saved to test-report-v4.json');
})();
