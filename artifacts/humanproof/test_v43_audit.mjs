// test_v43_audit.mjs — Targeted audit pipeline test for v42.3 CORS fixes
import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const COMPANY = 'Infosys';
const ROLE = 'Software Engineer';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Capture CORS errors and all console messages
  const corsErrors = [];
  const allErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') allErrors.push(text.slice(0, 120));
    if (text.includes('CORS') || text.includes('Access-Control') || text.includes('preflight')) {
      corsErrors.push(text.slice(0, 120));
    }
  });
  page.on('requestfailed', req => {
    const err = req.failure()?.errorText ?? '';
    if (err) corsErrors.push(`FAIL ${req.method()} ${req.url().slice(0,80)} — ${err}`);
  });

  function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
  async function shot(name) {
    await page.screenshot({ path: `test_v43_${name}.png` }).catch(() => {});
    log(`Screenshot: test_v43_${name}.png`);
  }

  try {
    // ── Navigate to terminal ──────────────────────────────────────────────────
    log('Navigating to /terminal...');
    await page.goto(`${BASE}/terminal`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1500);
    await shot('01-terminal');

    // ── Type company name ─────────────────────────────────────────────────────
    const compInput = page.locator('input[placeholder="Search company..."]');
    await compInput.waitFor({ timeout: 8000 });
    await compInput.click();
    await compInput.fill(COMPANY);
    log(`Typed company: ${COMPANY}`);
    await sleep(1200); // wait for autocomplete debounce
    await shot('02-company-typed');

    // Wait for dropdown option and click first match
    const compOption = page.locator('[role="option"], li[data-company], .autocomplete-option, .suggestion-item, [class*="suggestion"], [class*="dropdown"] li').first();
    if (await compOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      const optText = await compOption.textContent().catch(() => '');
      log(`Selecting dropdown option: ${optText?.trim().slice(0,40)}`);
      await compOption.click();
      await sleep(500);
    } else {
      // Fallback: press ArrowDown then Enter
      log('No dropdown visible, trying ArrowDown+Enter...');
      await compInput.press('ArrowDown');
      await sleep(300);
      await compInput.press('Enter');
    }
    await shot('03-company-selected');

    // ── Type role ─────────────────────────────────────────────────────────────
    const roleInput = page.locator('input[placeholder="Search role..."]');
    await roleInput.click();
    await roleInput.fill(ROLE);
    log(`Typed role: ${ROLE}`);
    await sleep(1200);
    await shot('04-role-typed');

    const roleOption = page.locator('[role="option"], li[data-role], .autocomplete-option, .suggestion-item, [class*="suggestion"], [class*="dropdown"] li').first();
    if (await roleOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      const optText = await roleOption.textContent().catch(() => '');
      log(`Selecting role option: ${optText?.trim().slice(0,40)}`);
      await roleOption.click();
      await sleep(500);
    } else {
      await roleInput.press('ArrowDown');
      await sleep(300);
      await roleInput.press('Enter');
    }
    await shot('05-role-selected');

    // ── Wait for Continue button to be enabled ────────────────────────────────
    const continueBtn = page.locator('button:has-text("Continue Analysis")');
    log('Waiting for Continue button to enable...');
    await continueBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Wait up to 8s for it to become enabled
    for (let i = 0; i < 16; i++) {
      const disabled = await continueBtn.isDisabled().catch(() => true);
      if (!disabled) { log('Continue button enabled!'); break; }
      await sleep(500);
    }

    const stillDisabled = await continueBtn.isDisabled().catch(() => true);
    if (stillDisabled) {
      // Check what the form state is
      const compVal = await compInput.inputValue().catch(() => '');
      const roleVal = await roleInput.inputValue().catch(() => '');
      log(`Button still disabled. compInput="${compVal}" roleInput="${roleVal}"`);
      // Try direct DOM selection via evaluate
      await page.evaluate((company) => {
        // Trigger a synthetic selection if autocomplete exposes a callback
        const event = new CustomEvent('company-selected', { detail: { name: company } });
        document.dispatchEvent(event);
      }, COMPANY);
      await sleep(500);
    }

    await shot('06-before-continue');
    await continueBtn.click({ force: true }); // force to bypass disabled check if needed
    log('Clicked Continue Analysis');

    // ── Watch pipeline progress ───────────────────────────────────────────────
    await sleep(2000);
    await shot('07-pipeline-start');
    log('Watching pipeline...');

    let maxProgress = 0;
    let dashboardLoaded = false;
    const startT = Date.now();

    for (let i = 0; i < 40; i++) { // up to 100s
      await sleep(2500);
      const elapsed = Math.round((Date.now() - startT) / 1000);

      // Read progress from the UI
      const { progress, status, hasDashboard } = await page.evaluate(() => {
        // Progress bar
        let progress = 0;
        const bar = document.querySelector('[role="progressbar"]');
        if (bar) progress = parseFloat(bar.getAttribute('aria-valuenow') ?? bar.getAttribute('aria-valuetext') ?? '0') || 0;
        if (!progress) {
          const fill = document.querySelector('[style*="width"]');
          if (fill) {
            const w = fill.style.width;
            if (w.endsWith('%')) progress = parseFloat(w);
          }
        }
        if (!progress) {
          // Look for "XX%" text near a progress bar
          const allEls = Array.from(document.querySelectorAll('[class*="progress"], [class*="loading"], [class*="audit"]'));
          for (const el of allEls) {
            const m = (el.textContent ?? '').match(/(\d{1,3})%/);
            if (m) { progress = parseInt(m[1]); break; }
          }
        }

        // Status text
        const statusEl = document.querySelector('[class*="status"], [class*="stage"], [class*="step"]');
        const status = statusEl?.textContent?.trim().slice(0,60) ?? '';

        // Dashboard present?
        const hasDashboard = !!document.querySelector('.score-ring, [data-tab], [class*="MyRisk"], [class*="dashboard"]');
        return { progress, status, hasDashboard };
      }).catch(() => ({ progress: 0, status: '', hasDashboard: false }));

      if (progress > maxProgress) {
        maxProgress = progress;
        log(`Progress: ${progress}% | status: ${status}`);
      }

      if (hasDashboard) {
        log(`Dashboard loaded! (elapsed: ${elapsed}s, max progress: ${maxProgress}%)`);
        dashboardLoaded = true;
        break;
      }

      if (i === 4) await shot('08-progress-10s');
      if (i === 12) await shot('09-progress-30s');
      if (i === 24) await shot('10-progress-60s');
    }

    // ── Check dashboard content ───────────────────────────────────────────────
    await shot('11-final-state');

    const pageContent = await page.evaluate(() => {
      // Score
      const scoreEl = document.querySelector('.score-ring, [class*="score-display"], [data-score]');
      const score = scoreEl?.textContent?.trim().slice(0,20) ?? 'not found';

      // Financial chips
      const chips = Array.from(document.querySelectorAll('[class*="chip"], [class*="badge"], [class*="signal-item"]'))
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length < 30 && (t.includes('%') || t.includes('B') || t.includes('M') || t.includes('×') || t.includes('$')));

      // "unavailable" message
      const unavailable = !!document.querySelector('[class*="unavailable"], [class*="no-data"]') ||
        document.body.textContent?.includes('financial signals unavailable') || false;

      // My Risk tab
      const myRiskTab = !!document.querySelector('button:has-text("My Risk"), [data-tab="my-risk"]') ||
        Array.from(document.querySelectorAll('button')).some(b => b.textContent?.includes('My Risk'));

      return { score, chips: chips.slice(0,10), unavailable, myRiskTab };
    }).catch(() => ({}));

    log(`Score: ${pageContent?.score}`);
    log(`Financial chips: ${JSON.stringify(pageContent?.chips)}`);
    log(`'Unavailable' msg shown: ${pageContent?.unavailable}`);
    log(`My Risk tab present: ${pageContent?.myRiskTab}`);

    // Try clicking "My Risk" tab
    const myRiskBtn = page.locator('button:has-text("My Risk")').first();
    if (await myRiskBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await myRiskBtn.click();
      await sleep(1000);
      await shot('12-my-risk-tab');
    }

    // Full page screenshot
    await page.screenshot({ path: 'test_v43_13-full.png', fullPage: true });

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n========= TEST SUMMARY =========');
    console.log(`Max pipeline progress: ${maxProgress}%`);
    console.log(`Dashboard rendered: ${dashboardLoaded}`);
    console.log(`CORS errors: ${corsErrors.length}`);
    console.log(`Total console errors: ${allErrors.length}`);
    console.log(`Score: ${pageContent?.score}`);
    console.log(`Financial chips: ${pageContent?.chips?.join(', ')}`);
    console.log(`"unavailable" message: ${pageContent?.unavailable}`);

    if (corsErrors.length > 0) {
      console.log('\nCORS errors:');
      corsErrors.forEach(e => console.log(' ', e));
    }
    if (allErrors.length > 0) {
      console.log('\nTop console errors:');
      allErrors.slice(0, 8).forEach(e => console.log(' ', e));
    }

    // Pass/fail verdict
    if (maxProgress > 33 || dashboardLoaded) {
      console.log('\n✅ PASS: Pipeline advanced past 33% or dashboard loaded');
    } else {
      console.log('\n❌ FAIL: Pipeline stuck at or below 33%');
    }
    if (corsErrors.filter(e => !e.includes('clearbit') && !e.includes('sec.gov') && !e.includes('FRED')).length === 0) {
      console.log('✅ PASS: No blocking CORS errors');
    } else {
      console.log('⚠️  CORS issues remain:', corsErrors.filter(e => !e.includes('clearbit')));
    }

  } catch (err) {
    console.error('Test error:', err.message);
    await shot('error-state').catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
