import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const networkFails = [];
  const supabaseCalls = [];
  const allLogs = [];

  page.on('console', msg => {
    const text = msg.text();
    allLogs.push({ type: msg.type(), text: text.slice(0, 600) });
    if (msg.type() === 'error') errors.push(text.slice(0, 300));
  });
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', async resp => {
    const url = resp.url();
    const status = resp.status();
    if (status >= 400) networkFails.push({ url: url.slice(0, 150), status });
    if (url.includes('supabase.co')) {
      try {
        const body = await resp.text();
        supabaseCalls.push({ url: url.slice(0, 140), status, body: body.slice(0, 300) });
      } catch(e) {}
    }
  });

  await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle', timeout: 30000 });

  // Quick form fill
  const ci = await page.$('input[placeholder="Search company..."]');
  await ci.click(); await ci.fill('Infosys');
  await page.waitForTimeout(800); await page.keyboard.press('Tab'); await page.waitForTimeout(300);

  const ri = await page.$('input[placeholder="Search role..."]');
  if (ri) { await ri.click(); await ri.fill('Software Engineer'); await page.waitForTimeout(800); await page.keyboard.press('Escape'); }

  await page.locator('button:has-text("Continue Analysis")').click({ force: true });
  await page.waitForTimeout(2000);

  try { await page.locator('text=High').first().click({ force: true }); } catch(e) {}
  await page.waitForTimeout(200);
  try { await page.locator('text=Specialist').first().click({ force: true }); } catch(e) {}
  await page.waitForTimeout(200);

  await page.locator('button:has-text("Execute Full Audit")').click({ force: true });
  console.log('Audit started. Waiting 65 seconds for pipeline to auto-complete...');

  // Wait 65 seconds (the loading screen says "Auto-completes in ~40s")
  await page.waitForTimeout(65000);
  await page.screenshot({ path: 'long-01-after-65s.png', fullPage: true });

  const text65 = await page.evaluate(() => document.body.innerText);
  console.log('Page after 65s:');
  console.log(text65.slice(0, 1500));

  // Check if we have dashboard
  const hasDashboard = /Company Pulse|Workforce|\/100|MODERATE|CRITICAL|HEALTHY/i.test(text65);
  const stillLoading = /LIVE INTELLIGENCE FETCH|ACQUIRING|Auto-completes/i.test(text65);
  console.log('\nhasDashboard:', hasDashboard, 'stillLoading:', stillLoading);

  if (stillLoading) {
    // Wait another 60s
    console.log('Still loading, waiting another 60s...');
    await page.waitForTimeout(60000);
    await page.screenshot({ path: 'long-02-after-125s.png', fullPage: true });
    const text125 = await page.evaluate(() => document.body.innerText);
    console.log('Page after 125s:');
    console.log(text125.slice(0, 1500));
  }

  // Final state
  const finalText = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: 'long-final.png', fullPage: true });

  // Scroll for more
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'long-scroll-top.png' });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.screenshot({ path: 'long-scroll-700.png' });
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.screenshot({ path: 'long-scroll-1400.png' });

  // Navigate to each tab
  console.log('\n=== TAB SCREENSHOTS ===');
  for (const tab of ['Summary', 'Company', 'Risk', 'Protection', 'Action Plan', 'Intelligence', 'Transparency']) {
    try {
      const el = await page.$(`[role="tab"]:has-text("${tab}"), button:has-text("${tab}")`);
      if (el && await el.isVisible()) {
        await el.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `long-tab-${tab.toLowerCase().replace(/\s+/g, '-')}.png`, fullPage: true });
        const t = await page.evaluate(() => document.body.innerText.slice(0, 1200));
        console.log(`[${tab}]:\n${t}\n---`);
      }
    } catch(e) {}
  }

  console.log('\n=== FULL FINAL PAGE TEXT ===');
  console.log(finalText.slice(0, 10000));

  console.log('\n=== ERRORS ===');
  errors.slice(0, 15).forEach((e, i) => console.log(`  [${i+1}] ${e}`));

  console.log('\n=== NETWORK FAILURES ===');
  networkFails.forEach(f => console.log(`  [${f.status}] ${f.url}`));

  console.log('\n=== SUPABASE CALLS ===');
  supabaseCalls.forEach(c => console.log(`  [${c.status}] ${c.url.slice(0, 100)}\n    ${c.body.slice(0, 200)}`));

  console.log('\n=== ALL CONSOLE LOGS ===');
  allLogs.slice(0, 60).forEach(l => console.log(`  [${l.type}] ${l.text}`));

  const report = {
    hasDashboard: /Company Pulse|Workforce|\/100|MODERATE|CRITICAL|HEALTHY/i.test(finalText),
    stillLoading: /LIVE INTELLIGENCE FETCH|ACQUIRING|Auto-completes/i.test(finalText),
    errors, networkFails, supabaseCalls, allLogs: allLogs.slice(0, 80),
    pageTextPreview: finalText.slice(0, 12000)
  };
  fs.writeFileSync('long-report.json', JSON.stringify(report, null, 2));
  console.log('Saved long-report.json');

  await browser.close();
})();
