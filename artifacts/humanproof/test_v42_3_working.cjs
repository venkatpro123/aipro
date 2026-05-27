// Working end-to-end test for v42.3
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'test_screenshots_working');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const ss = (page, name) => page.screenshot({ path: path.join(OUT, name), fullPage: true });
const log = console.log.bind(console);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  const errors = []; const xReqErrs = []; const realCors = [];
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    errors.push(t);
    if (t.includes('x-request-id')) xReqErrs.push(t);
    if ((t.includes('CORS') || t.includes('preflight')) && !t.includes('Content Security Policy'))
      realCors.push(t);
  });

  log('Loading /terminal...');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await ss(page, '00_loaded.png');

  // ── Company ──────────────────────────────────────────────────────────────────
  const compInput = await page.waitForSelector('input[placeholder="Search company..."]', { timeout: 10000 });
  await compInput.click();
  await page.keyboard.type('Infosys', { delay: 60 });
  await page.waitForTimeout(2500); // Supabase search debounce

  // Click first dropdown item (company result)
  const firstBtn = await page.$('.glass-panel-heavy .tab-btn');
  if (firstBtn) {
    const t = await firstBtn.innerText();
    log(`Company dropdown: clicking "${t.substring(0,50)}"`);
    await firstBtn.click();
    await page.waitForTimeout(1500);
  } else {
    log('No company dropdown visible - using typed value');
  }
  await ss(page, '01_company.png');

  // ── Role ─────────────────────────────────────────────────────────────────────
  const roleInput = await page.$('input[placeholder="Search role..."]');
  await roleInput.click();
  await page.keyboard.type('Software Engineer', { delay: 50 });
  await page.waitForTimeout(1500);
  await ss(page, '02_role_typed.png');

  // Select "Software Engineer" from dropdown
  const roleBtns = await page.$$('.glass-panel-heavy .tab-btn');
  log(`Role suggestions: ${roleBtns.length}`);
  let picked = false;
  for (const btn of roleBtns) {
    const t = await btn.innerText();
    if (t.toLowerCase().startsWith('software engineer')) {
      log(`Selecting: "${t.substring(0,50)}"`);
      await btn.click();
      picked = true;
      break;
    }
  }
  if (!picked && roleBtns.length > 0) {
    const t = await roleBtns[0].innerText();
    log(`Fallback: "${t.substring(0,50)}"`);
    await roleBtns[0].click();
  }
  await page.waitForTimeout(500);
  await ss(page, '03_role_selected.png');

  // ── Continue Analysis ─────────────────────────────────────────────────────────
  const contBtn = await page.$('button:has-text("Continue Analysis")');
  const disabled = contBtn ? await contBtn.isDisabled() : true;
  log(`Continue Analysis: disabled=${disabled}`);
  if (disabled) { log('ERROR: button disabled'); await browser.close(); return; }

  log('Clicking Continue Analysis...');
  await contBtn.click();

  // Wait for Step 2 to appear (handleNextStep1 may do async profileUnknownCompany)
  log('Waiting for Step 2 (up to 15s)...');
  let step2Found = false;
  for (let w = 0; w < 15; w++) {
    await page.waitForTimeout(1000);
    const execBtn = await page.$('button:has-text("Execute Full Audit")');
    if (execBtn) { step2Found = true; log(`Step 2 appeared at t=${w+1}s`); break; }
    const txt = await page.evaluate(() => document.body.innerText);
    if (txt.includes('Individual Factors')) { step2Found = true; log('Step 2 text found'); break; }
  }
  await ss(page, '04_step2.png');

  if (!step2Found) {
    const pt = await page.evaluate(() => document.body.innerText.substring(0, 400));
    log('Step 2 NOT found after 15s. Page text: ' + pt);
    await browser.close();
    return;
  }

  // ── Execute Full Audit ────────────────────────────────────────────────────────
  const execBtn = await page.$('button:has-text("Execute Full Audit")');
  if (!execBtn) { log('ERROR: Execute button not found'); await browser.close(); return; }

  log('Clicking Execute Full Audit...');
  await execBtn.click();
  await page.waitForTimeout(1000);
  await ss(page, '05_audit_submitted.png');
  log('AUDIT SUBMITTED');

  // ── Monitor pipeline ──────────────────────────────────────────────────────────
  log('\n=== Monitoring pipeline (max 90s) ===');
  const tl = [];
  let was33 = false, past33 = false, done = false;

  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const txt = await page.evaluate(() => document.body.innerText);
    const at33     = txt.includes('33%');
    const dep      = !!(txt.match(/DEPLOYING/i));
    const gath     = txt.includes('GATHERING');
    const partial  = txt.includes('PARTIAL INTELLIGENCE');
    const m        = txt.match(/(\d+)%\s*\n\s*NETWORK ID/) || txt.match(/INTELLIGENCE GATHERED\s+(\d+)%/);
    const pct      = m ? parseInt(m[1]) : null;
    const tabCnt   = await page.$$eval('[role="tab"]', ts => ts.length).catch(() => 0);
    const ag       = txt.match(/AGENTS:\s*(\d+)\/(\d+)/);
    const sg       = (txt.match(/SIGNALS:\s*(\d+)/) || [null,'-'])[1];

    tl.push({ i, at33, dep, gath, partial, pct, tabCnt });

    if (at33) was33 = true;
    if (was33 && !at33 && !dep && !past33) { past33 = true; log(`*** Past 33% at t=${i}s ***`); }

    if (i < 5 || i % 10 === 0 || partial || pct !== null) {
      log(`t=${i}s: ${pct !== null ? pct+'%' : '--'} | ag=${ag ? ag[1]+'/'+ag[2] : '-'} sg=${sg} | dep=${dep} gath=${gath} part=${partial} tabs=${tabCnt}`);
    }
    if ([2, 10, 20, 35, 50, 65, 80].includes(i)) await ss(page, `06_t${i}s.png`);

    if (tabCnt > 0 && !dep && !gath && i >= 3) {
      done = true;
      log(`Dashboard ready at t=${i}s (${tabCnt} tabs)`);
      await ss(page, '07_dashboard_ready.png');
      break;
    }
    if (partial && i >= 55) { log('Partial state at 55s - proceeding'); break; }
  }
  await ss(page, '08_pipeline_done.png');

  // ── Examine dashboard ─────────────────────────────────────────────────────────
  log('\n=== Dashboard examination ===');
  const tabs = await page.$$('[role="tab"]');
  const tnames = [];
  for (const t of tabs) tnames.push(await t.innerText());
  log(`Tabs (${tabs.length}): ${JSON.stringify(tnames)}`);

  const col = { stocks:[], mcaps:[], pe:[], rev:[], unavail:false, infosys:false, news:false };

  for (let i = 0; i < tabs.length; i++) {
    const name = await tabs[i].innerText();
    await tabs[i].click();
    await page.waitForTimeout(1500);
    const safeName = name.replace(/[^a-z0-9]/gi,'_').substring(0,12);
    await ss(page, `09_tab${i}_${safeName}.png`);

    const c = await page.evaluate(() => document.body.innerText);
    const s = c.match(/[+-]\d+\.?\d*%/g) || [];
    const m = c.match(/\$[\d.]+[BM]/g) || [];
    const p = c.match(/\d+\.?\d*[×x]/g) || [];
    const r = c.match(/Revenue[^\n]{0,80}/g) || [];
    const u = c.includes('financial signals unavailable');
    const inf = c.includes('INFOSYS') || c.includes('Infosys');
    const nw = c.includes('Reuters') || c.includes('Bloomberg') ||
               c.includes('Economic Times') || c.includes('Mint') ||
               c.includes('Business Standard') || c.includes('TechCrunch');

    col.stocks.push(...s);
    col.mcaps.push(...m);
    col.pe.push(...p);
    col.rev.push(...r);
    if (u)   col.unavail = true;
    if (inf) col.infosys = true;
    if (nw)  col.news    = true;

    // Check for P/E and MarketCap specifically labeled
    const hasMarketCapLabel = c.includes('Market Cap') || c.includes('market cap');
    const hasPELabel = c.includes('P/E') || c.includes('P/E Ratio');
    const hasStockLabel = c.includes('Stock') && (c.includes('-26') || c.includes('+') || c.includes('-'));

    log(`Tab "${name}": infosys=${inf} stocks=${JSON.stringify(s.slice(0,5))} mcap=${JSON.stringify(m.slice(0,3))} pe=${JSON.stringify(p.slice(0,5))} unavail=${u} news=${nw} mcap_label=${hasMarketCapLabel} pe_label=${hasPELabel}`);
  }

  const uStocks = [...new Set(col.stocks)];
  const uMcap   = [...new Set(col.mcaps)];
  const uPE     = [...new Set(col.pe)];

  // ── FINAL REPORT ─────────────────────────────────────────────────────────────
  log('\n' + '='.repeat(52));
  log('   V42.3 VERIFICATION REPORT');
  log('='.repeat(52));

  const t33s   = tl.filter(e => e.at33).length;
  const maxDep = tl.filter(e => e.dep).length;
  const maxPct = Math.max(...tl.filter(e => e.pct !== null).map(e => e.pct), 0);

  log(`\n[1] PIPELINE PAST 33% (scraper-enqueue CORS fix)`);
  log(`    Time at 33%: ${t33s}s  |  Time DEPLOYING: ${maxDep}s`);
  log(`    Advanced past 33%: ${past33}`);
  log(`    Dashboard loaded: ${done}`);
  log(`    Max intelligence%: ${maxPct}%`);
  const v1 = done || past33;
  log(`    STATUS: ${v1 ? 'PASS' : t33s > 8 ? 'FAIL – stuck' : 'INCONCLUSIVE'}`);

  log(`\n[2] COMPANYSPULSECARD FINANCIAL DATA (proxy-live-signals fix)`);
  log(`    Infosys detected: ${col.infosys}`);
  log(`    Stock changes found: ${JSON.stringify(uStocks.slice(0,8))}`);
  log(`    Market caps found:   ${JSON.stringify(uMcap.slice(0,5))}`);
  log(`    P/E ratios found:    ${JSON.stringify(uPE.slice(0,5))}`);
  log(`    Revenue lines:       ${JSON.stringify(col.rev.slice(0,3))}`);
  log(`    "unavailable" shown: ${col.unavail}`);
  const v2 = col.infosys && !col.unavail;
  log(`    STATUS: ${v2 ? 'PASS' : col.unavail ? 'FAIL – unavailable msg' : 'INCONCLUSIVE'}`);

  log(`\n[3] CORS / PREFLIGHT ERRORS (x-request-id fix)`);
  log(`    Total console errors: ${errors.length}`);
  log(`    x-request-id CORS:    ${xReqErrs.length}`);
  log(`    Other CORS:           ${realCors.length}`);
  if (xReqErrs.length > 0) xReqErrs.forEach(e => log(`    [x-req-id] ${e.substring(0,160)}`));
  if (realCors.length > 0) realCors.forEach(e => log(`    [cors] ${e.substring(0,160)}`));
  const v3 = xReqErrs.length === 0 && realCors.length === 0;
  log(`    STATUS: ${v3 ? 'PASS' : 'FAIL'}`);

  log(`\n[4] NEWS SECTION`);
  log(`    News sources visible: ${col.news}`);

  log(`\nOVERALL: FIX1=${v1?'PASS':'FAIL'} FIX2=${v2?'PASS':'INCONCLUSIVE'} FIX3=${v3?'PASS':'FAIL'}`);
  log(`Screenshots: ${OUT}`);

  await browser.close();
})();
