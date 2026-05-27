// Clean end-to-end test for v42.3 verification
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'test_screenshots_clean');
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

  // ─── Load form ───────────────────────────────────────────────────────────────
  log('Loading /terminal ...');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ─── Step 1 – company input ──────────────────────────────────────────────────
  // Focus the COMPANY field, type, wait for the dropdown that appears BELOW the input
  const compInput = await page.waitForSelector('input[placeholder="Search company..."]', { timeout: 10000 });
  await compInput.click();
  await compInput.fill('');
  await page.keyboard.type('Infosys', { delay: 60 });
  // Wait for debounce + Supabase query (~2.5s)
  await page.waitForTimeout(3000);
  await ss(page, '01_company_typed.png');

  // The company dropdown is a .glass-panel-heavy rendered with position:absolute
  // ABOVE the role input.  Playwright can click absolutely-positioned elements fine.
  const companyDropdown = await page.evaluate(() => {
    const gph = [...document.querySelectorAll('.glass-panel-heavy')];
    // The company dropdown should be visible; get its item texts
    for (const g of gph) {
      const btns = g.querySelectorAll('.tab-btn');
      if (btns.length > 0) {
        return Array.from(btns).map(b => b.innerText.trim().substring(0, 80));
      }
    }
    return [];
  });
  log(`Company dropdown items: ${JSON.stringify(companyDropdown.slice(0, 5))}`);

  // Click first item in the company dropdown (should be "Infosys" or "Infosys Ltd")
  const firstCompBtn = await page.$('.glass-panel-heavy .tab-btn');
  if (firstCompBtn) {
    const btnTxt = await firstCompBtn.innerText();
    log(`Selecting company: "${btnTxt.substring(0, 60)}"`);
    await firstCompBtn.click();
    await page.waitForTimeout(1500);
  } else {
    log('No company dropdown - proceeding with typed value (unknown company path)');
  }

  await ss(page, '02_company_selected.png');
  const compVal = await compInput.inputValue();
  const verified = await page.$('span:has-text("VERIFIED")');
  log(`Company field: "${compVal}"  VERIFIED: ${!!verified}`);

  // ─── Step 1 – role input ─────────────────────────────────────────────────────
  const roleInput = await page.$('input[placeholder="Search role..."]');
  if (!roleInput) { log('ERROR: no role input'); await browser.close(); return; }

  await roleInput.click();
  await page.keyboard.type('Software Engineer', { delay: 50 });
  await page.waitForTimeout(1500);
  await ss(page, '03_role_typed.png');

  // Role dropdown items
  const roleDropdownItems = await page.evaluate(() => {
    const gph = [...document.querySelectorAll('.glass-panel-heavy')];
    for (const g of gph) {
      const btns = g.querySelectorAll('.tab-btn');
      if (btns.length > 0) return Array.from(btns).map(b => b.innerText.trim().substring(0, 80));
    }
    return [];
  });
  log(`Role dropdown items: ${JSON.stringify(roleDropdownItems.slice(0, 5))}`);

  // Click the "Software Engineer" option (not quantum, educational, etc.)
  const roleBtns = await page.$$('.glass-panel-heavy .tab-btn');
  let roleClicked = false;
  for (const btn of roleBtns) {
    const t = await btn.innerText();
    if (t.toLowerCase().startsWith('software engineer')) {
      log(`Selecting role: "${t.substring(0, 50)}"`);
      await btn.click();
      roleClicked = true;
      break;
    }
  }
  if (!roleClicked && roleBtns.length > 0) {
    const t = await roleBtns[0].innerText();
    log(`Fallback: selecting first role: "${t.substring(0, 50)}"`);
    await roleBtns[0].click();
  }
  await page.waitForTimeout(500);
  await ss(page, '04_role_selected.png');

  // ─── Check button state ──────────────────────────────────────────────────────
  const contBtn = await page.$('button:has-text("Continue Analysis")');
  const contDisabled = contBtn ? await contBtn.isDisabled() : true;
  log(`Continue Analysis: found=${!!contBtn}  disabled=${contDisabled}`);

  if (contDisabled) {
    const pt = await page.evaluate(() => document.body.innerText.substring(0, 600));
    log('Page state before Continue (first 600 chars):\n' + pt);
    await browser.close();
    return;
  }

  // ─── Proceed to Step 2 ───────────────────────────────────────────────────────
  log('Clicking Continue Analysis...');
  await contBtn.click();
  await page.waitForTimeout(2000);
  await ss(page, '05_step2_or_pipeline.png');

  const afterCont = await page.evaluate(() => document.body.innerText.substring(0, 300));
  const onStep2 = afterCont.includes('STEP 02') || afterCont.includes('Individual Factors');
  const pipelineStarted = !!(afterCont.match(/DEPLOYING|33%|GATHERING|INTELLIGENCE/i));
  log(`After Continue: Step2=${onStep2}  PipelineStarted=${pipelineStarted}`);

  if (onStep2) {
    const execBtn = await page.$('button:has-text("Execute Full Audit")');
    if (execBtn && !(await execBtn.isDisabled())) {
      log('Clicking Execute Full Audit...');
      await execBtn.click();
      await page.waitForTimeout(1000);
      log('AUDIT SUBMITTED');
    } else {
      log('Execute button not found/disabled');
      await browser.close();
      return;
    }
  } else if (!pipelineStarted) {
    log('Neither Step 2 nor pipeline found - checking URL and page');
    log('URL:', page.url());
    log('Page text:', afterCont);
    await browser.close();
    return;
  }

  await ss(page, '06_audit_running.png');

  // ─── Monitor pipeline ────────────────────────────────────────────────────────
  log('\n=== Pipeline monitoring (max 90s) ===');
  const tl = [];
  let was33 = false, past33 = false, done = false;

  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const txt = await page.evaluate(() => document.body.innerText);
    const at33     = txt.includes('33%');
    const deploying = !!(txt.match(/DEPLOYING/i));
    const gathering = txt.includes('GATHERING');
    const partial   = txt.includes('PARTIAL INTELLIGENCE');
    const m = txt.match(/(\d+)%\s*\n\s*NETWORK ID/) || txt.match(/INTELLIGENCE GATHERED\s+(\d+)%/);
    const pct = m ? parseInt(m[1]) : null;
    const tabCount  = await page.$$eval('[role="tab"]', ts => ts.length).catch(() => 0);
    tl.push({ i, at33, deploying, gathering, partial, pct, tabCount });

    if (at33) was33 = true;
    if (was33 && !at33 && !deploying && !past33) { past33 = true; log(`*** Past 33% at t=${i}s ***`); }

    if (i < 5 || i % 15 === 0 || partial || pct !== null) {
      const ag = (txt.match(/AGENTS:\s*(\d+)\/(\d+)/) || [null,'-','-']).slice(1,3).join('/');
      const sg = (txt.match(/SIGNALS:\s*(\d+)/) || [null, '-'])[1];
      log(`t=${i}s: ${pct !== null ? pct+'%' : '--'} | ag=${ag} sg=${sg} | dep=${deploying} gath=${gathering} part=${partial} tabs=${tabCount}`);
    }

    if ([5, 20, 40, 60, 80].includes(i)) await ss(page, `07_t${i}s.png`);

    if (tabCount > 0 && !deploying && !gathering && i >= 3) {
      done = true;
      log(`Dashboard ready at t=${i}s`);
      await ss(page, '08_dashboard_ready.png');
      break;
    }
    if (partial && i >= 55) { log('Partial state at 55s - proceeding'); break; }
  }

  await ss(page, '09_after_pipeline.png');

  // ─── Inspect dashboard ───────────────────────────────────────────────────────
  log('\n=== Dashboard inspection ===');
  const tabs = await page.$$('[role="tab"]');
  const tabNames = [];
  for (const t of tabs) tabNames.push(await t.innerText());
  log(`Tabs (${tabs.length}): ${JSON.stringify(tabNames)}`);

  const collected = { stocks:[], mcaps:[], pe:[], rev:[], unavail:false, infosys:false, news:false };

  for (let i = 0; i < tabs.length; i++) {
    const name = await tabs[i].innerText();
    await tabs[i].click();
    await page.waitForTimeout(1500);
    await ss(page, `10_tab${i}_${name.replace(/[^a-z0-9]/gi,'_').substring(0,15)}.png`);

    const c = await page.evaluate(() => document.body.innerText);
    const s = c.match(/[+-]\d+\.?\d*%/g) || [];
    const m = c.match(/\$[\d.]+[BM]/g) || [];
    const p = c.match(/\d+\.?\d*[×x]/g) || [];
    const r = c.match(/Revenue[^\n]{0,80}/g) || [];
    const u = c.includes('financial signals unavailable');
    const inf = c.includes('INFOSYS') || c.includes('Infosys');
    const nw = c.includes('Reuters') || c.includes('Bloomberg') ||
               c.includes('Economic Times') || c.includes('Mint') || c.includes('Business Standard');

    collected.stocks.push(...s);
    collected.mcaps.push(...m);
    collected.pe.push(...p);
    collected.rev.push(...r);
    if (u)   collected.unavail = true;
    if (inf) collected.infosys = true;
    if (nw)  collected.news    = true;

    log(`Tab "${name}": infosys=${inf} stocks=${JSON.stringify(s.slice(0,5))} mcap=${JSON.stringify(m.slice(0,3))} pe=${JSON.stringify(p.slice(0,5))} unavail=${u} news=${nw}`);
  }

  const uStocks = [...new Set(collected.stocks)];
  const uMcap   = [...new Set(collected.mcaps)];
  const uPE     = [...new Set(collected.pe)];

  // ─── REPORT ──────────────────────────────────────────────────────────────────
  log('\n' + '='.repeat(50));
  log('   V42.3 FINAL REPORT – Infosys / Soft.Eng');
  log('='.repeat(50));

  const t33s    = tl.filter(e => e.at33).length;
  const maxDep  = tl.filter(e => e.deploying).length;
  const maxIntel = Math.max(...tl.filter(e => e.pct !== null).map(e => e.pct), 0);

  log(`\n[1] PIPELINE PROGRESS`);
  log(`    Seconds at 33%: ${t33s}`);
  log(`    Seconds DEPLOYING: ${maxDep}`);
  log(`    Advanced past 33%: ${past33}`);
  log(`    Dashboard ready: ${done}`);
  log(`    Max intelligence %: ${maxIntel}%`);
  log(`    VERDICT: ${done || past33 ? 'PASS ✓' : t33s > 10 ? 'FAIL – stuck at 33%' : 'PARTIAL'}`);

  log(`\n[2] FINANCIAL DATA (CompanyPulseCard)`);
  log(`    Infosys data: ${collected.infosys}`);
  log(`    Stock changes: ${JSON.stringify(uStocks.slice(0,8))}`);
  log(`    Market caps:  ${JSON.stringify(uMcap.slice(0,5))}`);
  log(`    P/E values:   ${JSON.stringify(uPE.slice(0,5))}`);
  log(`    Revenue lines: ${JSON.stringify(collected.rev.slice(0,3))}`);
  log(`    "unavailable" msg: ${collected.unavail}`);
  log(`    VERDICT: ${!collected.unavail && collected.infosys ? 'PASS ✓' : collected.unavail ? 'FAIL – shows unavailable' : 'INCONCLUSIVE'}`);

  log(`\n[3] CORS ERRORS`);
  log(`    Total console errors: ${errors.length}`);
  log(`    x-request-id errors:  ${xReqErrs.length}`);
  log(`    Other CORS errors:    ${realCors.length}`);
  if (xReqErrs.length > 0) xReqErrs.forEach(e => log(`    >> ${e.substring(0,180)}`));
  if (realCors.length > 0) realCors.forEach(e => log(`    >> ${e.substring(0,180)}`));
  log(`    VERDICT: ${xReqErrs.length === 0 && realCors.length === 0 ? 'PASS ✓' : 'FAIL – CORS errors'}`);

  log(`\n[4] NEWS SECTION`);
  log(`    News content visible: ${collected.news ? 'YES' : 'NO'}`);

  log('\nAll screenshots: ' + OUT);
  await browser.close();
})();
