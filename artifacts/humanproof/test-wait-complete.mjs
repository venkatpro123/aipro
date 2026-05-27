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
  console.log('Audit started, waiting up to 180s for completion...');

  // Wait up to 180s
  let done = false;
  for (let i = 0; i < 36; i++) {
    await page.waitForTimeout(5000);
    const text = await page.evaluate(() => document.body.innerText);
    const pct = text.match(/(\d{1,3})%\s*\n/)?.[1];
    const stage = text.match(/(?:DONE|ACQUIRING|COMPLETE|QUEUED)[^\n]*/)?.[0];
    const hasResult = /Company Pulse|Workforce|\/100|MODERATE|CRITICAL|HEALTHY|Risk Score/i.test(text);
    const hasTimeout = /timed out|timeout|no data received/i.test(text);

    console.log(`[${i+1}/36] ${pct ? pct+'%' : '?%'} | ${stage ?? 'unknown'} | result=${hasResult} timeout=${hasTimeout}`);

    if (hasResult) {
      done = true;
      console.log('AUDIT COMPLETE!');
      break;
    }
    if (hasTimeout || i === 10 || i === 20 || i === 30) {
      await page.screenshot({ path: `wait-${i+1}.png`, fullPage: true });
    }
  }

  await page.screenshot({ path: 'wait-final.png', fullPage: true });
  const pageText = await page.evaluate(() => document.body.innerText);

  console.log('\n=== FINAL PAGE TEXT (8000 chars) ===');
  console.log(pageText.slice(0, 8000));

  console.log('\n=== ERRORS ===');
  errors.slice(0, 15).forEach((e, i) => console.log(`  [${i+1}] ${e}`));

  console.log('\n=== NETWORK FAILURES ===');
  networkFails.forEach(f => console.log(`  [${f.status}] ${f.url}`));

  console.log('\n=== SUPABASE CALLS ===');
  supabaseCalls.forEach(c => console.log(`  [${c.status}] ${c.url.slice(0, 120)}\n    ${c.body.slice(0, 150)}`));

  console.log('\n=== ALL LOGS ===');
  allLogs.slice(0, 50).forEach(l => console.log(`  [${l.type}] ${l.text}`));

  const report = {
    auditDone: done,
    errors, networkFails, supabaseCalls, allLogs: allLogs.slice(0, 80),
    pageTextPreview: pageText.slice(0, 10000)
  };
  fs.writeFileSync('wait-report.json', JSON.stringify(report, null, 2));
  console.log('Saved wait-report.json');

  await browser.close();
})();
