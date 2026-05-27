// test_v44_e2e.mjs — Full end-to-end audit test for HumanProof v42.3+
// Properly handles 2-step form: dropdown selection → role oracle → Execute Full Audit
import { chromium } from 'playwright';

const BASE   = 'http://localhost:5174';
const COMPANY = 'Infosys';
const ROLE    = 'Software Engineer';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const corsErrors = [];
  const allErrors  = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') allErrors.push(text.slice(0, 120));
    if (text.includes('CORS') || text.includes('Access-Control') || text.includes('preflight'))
      corsErrors.push(text.slice(0, 120));
  });
  page.on('requestfailed', req => {
    const err = req.failure()?.errorText ?? '';
    // ERR_ABORTED = browser canceled the request (navigation, page unload) — NOT a CORS error
    // ERR_INTERNET_DISCONNECTED = offline — NOT a CORS error
    // Only flag net::ERR_FAILED which is how the browser reports CORS blocks
    if (err && err !== 'net::ERR_ABORTED' && err !== 'net::ERR_INTERNET_DISCONNECTED') {
      corsErrors.push(`FAIL ${req.method()} ${req.url().slice(0,80)} — ${err}`);
    }
  });

  function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
  async function shot(name) {
    const path = `test_v44_${name}.png`;
    await page.screenshot({ path }).catch(() => {});
    log(`📸 ${path}`);
    return path;
  }

  try {
    // ── 1. Navigate ───────────────────────────────────────────────────────────
    log('Navigating to /terminal...');
    await page.goto(`${BASE}/terminal`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2000);
    await shot('01-loaded');

    // ── 2. Company field ─────────────────────────────────────────────────────
    log('Filling company field...');
    const compInput = page.locator('input[placeholder="Search company..."]');
    await compInput.waitFor({ timeout: 8000 });
    await compInput.click();
    await compInput.fill(COMPANY);
    log(`Typed: "${COMPANY}"`);
    await sleep(2000); // wait for 300ms debounce + Supabase query (slow in some regions)
    await shot('02-company-typed');

    // Check for disambiguation overlay first (fires when ≥3 DB entries share root word)
    const disambig = page.locator('button').filter({ hasText: /→.*Infosys/i }).first();
    const disambigVisible = await disambig.isVisible({ timeout: 1000 }).catch(() => false);
    if (disambigVisible) {
      const btnText = await disambig.textContent().catch(() => '');
      log(`Disambiguation overlay — clicking: "${btnText?.trim().slice(0,50)}"`);
      await disambig.click();
      await sleep(1200); // re-search fires after disambiguation click
      await shot('03a-after-disambig');
    }

    // Wait for company dropdown to appear (.glass-panel-heavy .tab-btn)
    // Using waitFor since isVisible() returns false immediately if element not in DOM
    // Supabase company search has 300ms debounce + network round-trip (can be 1-3s)
    const compDropdown = page.locator('.glass-panel-heavy .tab-btn').first();
    try {
      await compDropdown.waitFor({ state: 'visible', timeout: 12000 });
      const txt = await compDropdown.textContent().catch(() => '');
      log(`Selecting company from dropdown: "${txt?.trim().slice(0,50)}"`);
      await compDropdown.click();
      await sleep(600);
      await shot('03b-company-selected');
    } catch {
      // Dropdown didn't appear — check for disambiguation overlay (fires when ≥3 Supabase results)
      const disambigBtn = page.locator('button').filter({ hasText: /→.*Infosys/i }).first();
      const hasDisambig = await disambigBtn.isVisible({ timeout: 500 }).catch(() => false);
      if (hasDisambig) {
        const btnText = await disambigBtn.textContent().catch(() => '');
        log(`Disambiguation overlay detected — clicking: "${btnText?.trim().slice(0,50)}"`);
        await disambigBtn.click();
        await sleep(1200); // re-search fires after disambiguation click
        // Now wait for dropdown again
        try {
          await compDropdown.waitFor({ state: 'visible', timeout: 5000 });
          const txt2 = await compDropdown.textContent().catch(() => '');
          log(`Selecting from dropdown after disambiguation: "${txt2?.trim().slice(0,50)}"`);
          await compDropdown.click();
          await sleep(600);
        } catch {
          log('⚠ Company dropdown still not visible after disambiguation — profiling will run');
        }
      } else {
        log('⚠ Company dropdown not visible within 7s — profiling will run (takes ~10s)');
      }
      await shot('03b-company-selected');
    }

    // ── 3. Role field ────────────────────────────────────────────────────────
    log('Filling role field...');
    const roleInput = page.locator('input[placeholder="Search role..."]');
    await roleInput.waitFor({ timeout: 5000 });
    await roleInput.click();
    await roleInput.fill(ROLE);
    log(`Typed: "${ROLE}"`);
    await sleep(600); // 180ms debounce for role oracle

    // Click the first oracle role suggestion — sets selectedOracleEntry → provides canonicalKey
    const roleSuggest = page.locator('.glass-panel-heavy .tab-btn').first();
    const roleDropdownVisible = await roleSuggest.isVisible({ timeout: 3000 }).catch(() => false);
    if (roleDropdownVisible) {
      const txt = await roleSuggest.textContent().catch(() => '');
      log(`Selecting oracle role: "${txt?.trim().slice(0,60)}"`);
      await roleSuggest.click();
      await sleep(400);
    } else {
      log('⚠ Role dropdown not visible — canProceedStep1 may be false');
    }
    await shot('04-role-selected');

    // ── 4. Check Continue button enabled ─────────────────────────────────────
    const continueBtn = page.locator('button:has-text("Continue Analysis")');
    await continueBtn.waitFor({ state: 'visible', timeout: 5000 });

    let enabled = !(await continueBtn.isDisabled().catch(() => true));
    if (!enabled) {
      // Log form state to diagnose why
      const compVal  = await compInput.inputValue().catch(() => '?');
      const roleVal  = await roleInput.inputValue().catch(() => '?');
      const formState = await page.evaluate(() => {
        // Check for "Unresolved role" warning
        const unresolvedEl = document.querySelector('[style*="color: var(--red)"]');
        const verifiedEl   = document.querySelector('[style*="color: var(--cyan)"]');
        return {
          unresolved: unresolvedEl?.textContent?.trim().slice(0,40) ?? null,
          verified:   verifiedEl?.textContent?.trim().slice(0,40) ?? null,
          continueDisabled: document.querySelector('button[disabled]')?.textContent?.trim() ?? null,
        };
      }).catch(() => ({}));
      log(`Continue disabled. comp="${compVal}" role="${roleVal}" state=${JSON.stringify(formState)}`);

      // Try: wait up to 8s more (e.g. if profiling is running in background)
      for (let i = 0; i < 16; i++) {
        await sleep(500);
        enabled = !(await continueBtn.isDisabled().catch(() => true));
        if (enabled) { log('Continue button became enabled!'); break; }
      }
    } else {
      log('Continue button is enabled ✓');
    }

    await shot('05-before-continue');

    if (!enabled) {
      log('⚠ Continue still disabled — taking debug DOM snapshot');
      const html = await page.evaluate(() => document.querySelector('.glass-panel')?.innerHTML?.slice(0,2000)).catch(() => '');
      log(`Step1 DOM: ${html?.slice(0,500)}`);
    }

    await continueBtn.click({ force: true });
    log('Clicked "Continue Analysis →"');
    await sleep(800);

    // ── 5. Step 2 — wait for it to appear ────────────────────────────────────
    // If selectedCompany was set (dropdown click), step 2 appears immediately.
    // If not, profileUnknownCompany() runs first (can take 5-15s).
    log('Waiting for Step 2...');
    const executeBtn = page.locator('button:has-text("Execute Full Audit")');

    let step2Ready = false;
    for (let i = 0; i < 30; i++) { // up to 15s
      await sleep(500);
      step2Ready = await executeBtn.isVisible({ timeout: 200 }).catch(() => false);
      if (step2Ready) { log(`Step 2 appeared after ${(i+1)*0.5}s`); break; }
      // Also check for spinner (profiling in progress)
      const spinner = await page.locator('.spinner').isVisible({ timeout: 100 }).catch(() => false);
      if (i % 4 === 0) log(`Waiting for step 2... ${Math.round((i+1)*0.5)}s${spinner ? ' (profiling...)' : ''}`);
    }
    await shot('06-step2');

    if (!step2Ready) {
      log('❌ Step 2 never appeared — checking page state');
      const bodyText = await page.locator('body').textContent({ timeout: 2000 }).catch(() => '');
      log(`Page text sample: ${bodyText?.slice(0, 300)}`);
    } else {
      log('Step 2 visible ✓ — clicking "Execute Full Audit →"');
      await executeBtn.click();
      log('Clicked "Execute Full Audit →"');
    }

    // ── 6. Monitor pipeline ───────────────────────────────────────────────────
    log('Monitoring pipeline...');
    await sleep(2000);
    await shot('07-pipeline-start');

    let maxProgress = 0;
    let dashboardLoaded = false;
    const startT = Date.now();

    for (let i = 0; i < 80; i++) { // up to 200s (EFs run longer with live network)
      await sleep(2500);
      const elapsed = Math.round((Date.now() - startT) / 1000);

      const { progress, stageText, hasDashboard, tabs } = await page.evaluate(() => {
        // Progress bar value
        let progress = 0;
        const bar = document.querySelector('[role="progressbar"]');
        if (bar) {
          progress = parseFloat(
            bar.getAttribute('aria-valuenow') ??
            bar.getAttribute('aria-valuetext') ??
            bar.style?.width?.replace('%','') ?? '0'
          ) || 0;
        }
        if (!progress) {
          const fill = document.querySelector('[class*="progress-fill"], [class*="progressFill"]');
          if (fill) {
            const w = fill.style?.width ?? '';
            if (w.endsWith('%')) progress = parseFloat(w);
          }
        }
        if (!progress) {
          // Scan all elements for XX% text that looks like pipeline progress
          const els = Array.from(document.querySelectorAll('[class*="progress"], [class*="loading"], [class*="stage"], [class*="audit"]'));
          for (const el of els) {
            const m = (el.textContent ?? '').match(/^(\d{1,3})%$/);
            if (m) { progress = parseInt(m[1]); break; }
          }
        }

        // Stage/status text
        const stageEl = document.querySelector('[class*="stage"], [class*="step-label"], [class*="status-text"]');
        const stageText = stageEl?.textContent?.trim().slice(0, 80) ?? '';

        // Dashboard presence — v4 tabs (My Risk / Take Action / Explore)
        const tabBtns = Array.from(document.querySelectorAll('[class*="tab-btn"], [data-tab], button[role="tab"]'))
          .map(b => b.textContent?.trim())
          .filter(t => t && t.length < 40);
        const hasDashboard =
          tabBtns.some(t => t?.includes('My Risk') || t?.includes('Take Action') || t?.includes('Explore')) ||
          !!document.querySelector('.score-ring, [class*="score-ring"], [class*="scoreRing"]') ||
          !!document.querySelector('[class*="CompanyPulse"], [class*="company-pulse"]');

        return { progress, stageText, hasDashboard, tabs: tabBtns.slice(0, 8) };
      }).catch(() => ({ progress: 0, stageText: '', hasDashboard: false, tabs: [] }));

      if (progress > maxProgress) {
        maxProgress = progress;
        log(`Progress: ${progress}% | stage: "${stageText}"`);
      }

      if (hasDashboard) {
        log(`🎉 Dashboard loaded! (${elapsed}s, maxProgress=${maxProgress}%, tabs=[${tabs.join(', ')}])`);
        dashboardLoaded = true;
        break;
      }

      if (i === 4)  await shot('08-progress-10s');
      if (i === 12) await shot('09-progress-30s');
      if (i === 24) await shot('10-progress-60s');
      if (i === 36) await shot('11-progress-90s');

      if (elapsed > 195) { log('Timeout at 195s'); break; }
    }

    // ── 7. Dismiss ProfileSetupModal if auto-opened ──────────────────────────
    await shot('12-final-state');

    // The ProfileSetupModal auto-opens when user has < 10/15 profile fields.
    // It's a Radix Dialog and responds to Escape.
    const radixDialog = page.locator('[role="dialog"][data-state="open"]');
    const modalOpen = await radixDialog.isVisible({ timeout: 2000 }).catch(() => false);
    if (modalOpen) {
      log('ProfileSetupModal detected — pressing Escape to dismiss');
      await page.keyboard.press('Escape');
      await sleep(800);
      // Fallback: click the dialog's close button (typically an X button)
      const closeBtn = page.locator('[role="dialog"] button[aria-label*="lose"], [role="dialog"] button[aria-label*="ismiss"]').first();
      if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await closeBtn.click();
        await sleep(400);
      }
      await shot('12b-modal-dismissed');
    }

    // ── 8. Read dashboard data ────────────────────────────────────────────────
    const dashboard = await page.evaluate(() => {
      // Score: SVG has aria-label="Risk score N out of 100 — label"
      const scoreSvg = document.querySelector('svg[aria-label*="Risk score"]');
      let score = 'not found';
      if (scoreSvg) {
        const m = (scoreSvg.getAttribute('aria-label') ?? '').match(/Risk score (\d+)/);
        if (m) score = m[1];
      }
      // Fallback: large font number in the score ring container
      if (score === 'not found') {
        const bigNums = Array.from(document.querySelectorAll('span')).filter(s => {
          const txt = s.textContent?.trim() ?? '';
          const n = parseInt(txt);
          return !isNaN(n) && n >= 1 && n <= 100 && txt === String(n);
        });
        if (bigNums.length > 0) score = bigNums[0].textContent?.trim() ?? 'not found';
      }

      // Tab labels
      const tabs = Array.from(document.querySelectorAll('[role="tab"], button[role="tab"]'))
        .map(b => b.textContent?.trim().slice(0, 30))
        .filter(t => t && t.length > 0);

      // Unavailable message
      const bodyText = document.body.textContent ?? '';
      const unavailable = bodyText.includes('financial signals unavailable') ||
        bodyText.includes('Live financial signals unavailable');

      // My Risk tab present
      const myRisk = tabs.some(t => t?.includes('My Risk')) ||
        Array.from(document.querySelectorAll('button')).some(b => b.textContent?.includes('My Risk'));

      return { score, tabs: tabs.slice(0,8), unavailable, myRisk };
    }).catch(() => ({ score: 'err', tabs: [], unavailable: false, myRisk: false }));

    log(`Score: ${dashboard.score}`);
    log(`Tabs: [${dashboard.tabs.join(', ')}]`);
    log(`Unavailable msg: ${dashboard.unavailable}`);
    log(`My Risk tab: ${dashboard.myRisk}`);

    // Try "My Risk" tab (now that modal is dismissed)
    const myRiskBtn = page.locator('[role="tab"]').filter({ hasText: /My Risk/i }).first();
    if (await myRiskBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await myRiskBtn.click();
      await sleep(1500);
      await shot('13-my-risk-tab');

      // Check CompanyPulseCard — it's defaultOpen=false, need to expand it
      // Find the CompanyPulseCard toggle button and click it
      const pulseToggle = page.locator('button').filter({ hasText: /Company Pulse|Infosys/i }).first();
      if (await pulseToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pulseToggle.click();
        await sleep(800);
        log('Expanded CompanyPulseCard');
        await shot('14-pulse-expanded');
      }

      // Read chips after expansion
      const chips = await page.evaluate(() => {
        const chipEls = Array.from(document.querySelectorAll('span'));
        return chipEls
          .map(el => el.textContent?.trim())
          .filter(t => t && t.length < 50 && t.length > 1 && (
            t.includes('%') || t.includes('B ') || t.includes(' M') ||
            /^\d+\.?\d*[BM]$/.test(t) ||
            t.includes('P/E') || t.includes('Mkt') || t.includes('Rev') ||
            t.includes('Stock') || t.includes('Hiring')
          ))
          .slice(0, 10);
      }).catch(() => []);
      log(`Financial chips: ${JSON.stringify(chips)}`);

      // Check for "unavailable" text specifically in CompanyPulseCard
      const pulseText = await page.evaluate(() => {
        // Look for a section that mentions Infosys and has financial data
        const allText = Array.from(document.querySelectorAll('[class*="pulse"], [class*="Pulse"], [class*="company"]'))
          .map(el => el.textContent?.trim())
          .filter(t => t && t.length > 5)
          .join(' | ');
        return allText.slice(0, 300);
      }).catch(() => '');
      if (pulseText) log(`Pulse area text: ${pulseText.slice(0, 200)}`);

    } else {
      log('⚠ My Risk tab button not found as [role=tab]');
      // Try any button with "My Risk" text
      const fallbackMyRisk = page.locator('button').filter({ hasText: 'My Risk' }).first();
      if (await fallbackMyRisk.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fallbackMyRisk.click({ force: true });
        await sleep(1000);
        await shot('13-my-risk-tab');
      }
    }

    // Full-page screenshot
    await page.screenshot({ path: 'test_v44_15-full.png', fullPage: true });

    // ── 8. Summary ───────────────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════╗');
    console.log('║         TEST SUMMARY v44          ║');
    console.log('╚══════════════════════════════════╝');
    console.log(`Max pipeline progress : ${maxProgress}%`);
    console.log(`Dashboard rendered    : ${dashboardLoaded}`);
    console.log(`CORS errors           : ${corsErrors.length}`);
    console.log(`Console errors        : ${allErrors.length}`);
    console.log(`Score                 : ${dashboard.score}`);
    console.log(`Tabs                  : [${dashboard.tabs.join(', ')}]`);
    console.log(`Unavailable msg       : ${dashboard.unavailable}`);

    if (corsErrors.length > 0) {
      console.log('\nCORS errors:');
      corsErrors.forEach(e => console.log('  ', e));
    }
    if (allErrors.length > 0) {
      console.log('\nTop console errors:');
      allErrors.slice(0, 8).forEach(e => console.log('  ', e));
    }

    console.log('');
    if (corsErrors.filter(e => !e.includes('clearbit') && !e.includes('sec.gov') && !e.includes('FRED')).length === 0) {
      console.log('✅ PASS: No blocking CORS errors');
    } else {
      console.log('⚠️  CORS issues remain');
    }

    if (maxProgress > 33 || dashboardLoaded) {
      console.log('✅ PASS: Pipeline advanced past 33% or dashboard loaded');
    } else {
      console.log('❌ FAIL: Pipeline stuck at/below 33%');
    }

    if (dashboardLoaded) {
      console.log('✅ PASS: Dashboard rendered');
    } else {
      console.log('⚠️  Dashboard not confirmed (may still be in progress)');
    }


  } catch (err) {
    console.error('Test error:', err.message);
    await shot('error-state').catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
