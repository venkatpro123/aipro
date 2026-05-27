const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage();
  const scraperCorsErrors = [];
  const allErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      allErrors.push(t);
      if (t.includes('scraper-enqueue') || (t.includes('CORS') && !t.includes('Content Security Policy'))) {
        scraperCorsErrors.push(t);
      }
    }
  });
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const compInput = await page.waitForSelector('input[placeholder="Search company..."]');
  await compInput.fill('Infosys');
  await page.waitForTimeout(2000);
  const roleInput = await page.$('input[placeholder="Search role..."]');
  await roleInput.fill('Software Engineer');
  await page.waitForTimeout(1500);
  const roleBtns = await page.$$('.glass-panel-heavy .tab-btn');
  for (const btn of roleBtns) {
    const t = await btn.innerText();
    if (t.toLowerCase().startsWith('software engineer')) { await btn.click(); break; }
  }
  await page.waitForTimeout(500);
  const contBtn = await page.$('button:has-text("Continue Analysis")');
  if (contBtn && !(await contBtn.isDisabled())) {
    await contBtn.click();
    await page.waitForTimeout(5000);
  }
  const execBtn = await page.$('button:has-text("Execute Full Audit")');
  if (execBtn) {
    await execBtn.click();
    console.log('Audit submitted, waiting 30s for scraper-enqueue call...');
    await page.waitForTimeout(35000);
  }

  console.log('\nScraper-enqueue / CORS related errors:');
  scraperCorsErrors.forEach(e => console.log('  >', e.substring(0, 400)));

  console.log('\nAll error count:', allErrors.length);
  // Show errors with scraper or 403 or blocked
  const relevant = allErrors.filter(e =>
    e.includes('scraper') || e.includes('403') ||
    (e.includes('CORS') && !e.includes('Content Security Policy')) ||
    e.includes('blocked by CORS') ||
    e.includes('preflight')
  );
  console.log('Relevant errors:');
  relevant.forEach(e => console.log('  >', e.substring(0, 400)));

  await b.close();
})();
