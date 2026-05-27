// test_v43_pipeline.mjs — End-to-end audit pipeline test after v42.3 CORS fixes
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5174';
const COMPANY = 'Infosys';
const ROLE = 'Software Engineer';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const corsErrors = [];
  const networkErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    if (text.includes('CORS') || text.includes('Access-Control')) corsErrors.push(text);
  });
  page.on('requestfailed', req => {
    const failure = req.failure()?.errorText ?? '';
    if (failure.includes('CORS') || failure.includes('net::ERR_FAILED')) {
      networkErrors.push(`${req.method()} ${req.url().slice(0,80)} — ${failure}`);
    }
  });

  const report = { steps: [], corsErrors: [], networkErrors: [], screenshots: [] };

  function log(msg, data = {}) {
    console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`, data);
    report.steps.push({ time: Date.now(), msg, ...data });
  }

  async function shot(name) {
    const path = `test_v43_${name}.png`;
    await page.screenshot({ path, fullPage: false });
    report.screenshots.push(path);
    log(`Screenshot: ${path}`);
    return path;
  }

  try {
    // ── 1. Load landing page ───────────────────────────────────────────────────
    log('Navigating to app...');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2000);
    await shot('01-landing');
    log('Landing page loaded');

    // ── 2. Find and fill the company input ────────────────────────────────────
    // Try the terminal/calculator route first
    const terminalLink = page.locator('a[href*="terminal"], button:has-text("Audit"), a:has-text("Audit"), a:has-text("Start")').first();
    if (await terminalLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await terminalLink.click();
      await sleep(1000);
    }

    // Look for company input
    const companyInput = page.locator('input[placeholder*="company" i], input[placeholder*="Company" i], input[name="company"], input[id*="company" i]').first();
    await companyInput.waitFor({ timeout: 10000 });
    await companyInput.fill(COMPANY);
    await shot('02-company-typed');
    log('Typed company name');

    // Wait for autocomplete and pick first result
    await sleep(800);
    const dropdown = page.locator('[role="option"], [role="listbox"] li, .autocomplete-item, [data-company]').first();
    if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dropdown.click();
      log('Selected from dropdown');
    } else {
      // Press Enter to confirm
      await companyInput.press('Enter');
    }
    await sleep(500);

    // ── 3. Fill role and continue ──────────────────────────────────────────────
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button[type="submit"]:has-text("Next")').first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await sleep(800);
    }

    const roleInput = page.locator('input[placeholder*="role" i], input[placeholder*="Role" i], input[placeholder*="job" i], input[name="role"]').first();
    if (await roleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await roleInput.fill(ROLE);
      await sleep(500);
      const roleDropdown = page.locator('[role="option"], [role="listbox"] li').first();
      if (await roleDropdown.isVisible({ timeout: 1500 }).catch(() => false)) {
        await roleDropdown.click();
      } else {
        await roleInput.press('Enter');
      }
    }
    await shot('03-role-filled');

    // Continue/Submit
    const submitBtn = page.locator('button:has-text("Analyze"), button:has-text("Run Audit"), button:has-text("Start Audit"), button[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      log('Clicked submit/analyze');
    } else {
      const cont2 = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await cont2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cont2.click();
      }
    }

    // ── 4. Watch pipeline progress ─────────────────────────────────────────────
    log('Watching pipeline progress...');
    await shot('04-pipeline-started');

    let maxProgress = 0;
    let lastProgress = 0;
    let stuckCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < 36; i++) { // poll for up to 90s
      await sleep(2500);

      // Read progress bar percentage
      const progressText = await page.evaluate(() => {
        // Try aria-valuenow
        const bar = document.querySelector('[role="progressbar"]');
        if (bar) return parseFloat(bar.getAttribute('aria-valuenow') ?? '0');
        // Try width style
        const filled = document.querySelector('.progress-fill, [class*="progress"]:not([role])');
        if (filled) {
          const style = filled.style.width;
          if (style.endsWith('%')) return parseFloat(style);
        }
        // Try text like "45%"
        const texts = Array.from(document.querySelectorAll('*')).map(el => el.textContent ?? '');
        for (const t of texts) {
          const m = t.match(/\b(\d{1,3})%\b/);
          if (m && parseInt(m[1]) > 0 && parseInt(m[1]) <= 100) return parseInt(m[1]);
        }
        return 0;
      }).catch(() => 0);

      if (progressText > maxProgress) {
        maxProgress = progressText;
        log(`Progress: ${progressText}%`);
      }

      // Check if dashboard is showing
      const dashboardVisible = await page.locator('[data-tab], .tab-button, button:has-text("My Risk"), button:has-text("Take Action"), .score-ring').first().isVisible({ timeout: 500 }).catch(() => false);
      if (dashboardVisible) {
        log('Dashboard visible!');
        break;
      }

      // Check if stuck
      if (progressText === lastProgress) {
        stuckCount++;
        if (stuckCount >= 4 && i > 4) {
          log(`Progress stuck at ${progressText}% for ${stuckCount * 2.5}s`);
        }
      } else {
        stuckCount = 0;
      }
      lastProgress = progressText;

      // Take periodic screenshots
      if (i === 4 || i === 10 || i === 20) {
        await shot(`05-progress-${i * 2.5}s`);
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed > 85) break;
    }

    await shot('06-after-pipeline');
    log(`Max progress reached: ${maxProgress}%`);

    // ── 5. Inspect dashboard ───────────────────────────────────────────────────
    // Check for score
    const scoreText = await page.locator('.score-ring, [data-score], [class*="score"]').first().textContent({ timeout: 3000 }).catch(() => 'not found');
    log('Score text:', { score: scoreText?.slice(0, 30) });

    // Click "My Risk" tab if visible
    const myRiskTab = page.locator('button:has-text("My Risk"), [data-tab="my-risk"], button:has-text("Risk")').first();
    if (await myRiskTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await myRiskTab.click();
      await sleep(800);
      log('Clicked My Risk tab');
    }
    await shot('07-my-risk-tab');

    // Check CompanyPulseCard content
    const pulseCardContent = await page.evaluate(() => {
      const card = document.querySelector('[class*="pulse"], [class*="company-pulse"], [data-testid*="pulse"]');
      if (card) return card.textContent?.slice(0, 500);
      // Look for financial chips
      const chips = Array.from(document.querySelectorAll('[class*="chip"], [class*="badge"], [class*="tag"]'))
        .map(el => el.textContent?.trim())
        .filter(t => t && (t.includes('%') || t.includes('B') || t.includes('M') || t.includes('×')));
      return chips.join(' | ');
    }).catch(() => 'not found');
    log('CompanyPulseCard content:', { content: pulseCardContent?.slice(0, 200) });

    // Check for "unavailable" message
    const unavailableMsg = await page.locator('text=unavailable, text=Live financial signals unavailable').first().isVisible({ timeout: 1000 }).catch(() => false);
    log('Financial signals unavailable msg:', { shown: unavailableMsg });

    // Scroll to check all content
    await page.evaluate(() => window.scrollBy(0, 400));
    await sleep(500);
    await shot('08-scrolled');

    await page.evaluate(() => window.scrollBy(0, 400));
    await sleep(500);
    await shot('09-scrolled-more');

    // Full page screenshot
    const fullPath = 'test_v43_10-full.png';
    await page.screenshot({ path: fullPath, fullPage: true });
    report.screenshots.push(fullPath);

    // ── 6. Collect final stats ─────────────────────────────────────────────────
    report.corsErrors = corsErrors;
    report.networkErrors = networkErrors.slice(0, 10);
    report.maxProgress = maxProgress;
    report.consoleErrorCount = consoleErrors.length;
    report.consoleErrorSample = consoleErrors.slice(0, 5);

    // Final summary
    console.log('\n========= TEST SUMMARY =========');
    console.log(`Max pipeline progress: ${maxProgress}%`);
    console.log(`CORS errors: ${corsErrors.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`CompanyPulseCard: ${pulseCardContent?.slice(0, 150)}`);
    console.log(`Financial unavailable: ${unavailableMsg}`);
    console.log('Screenshots:', report.screenshots.join(', '));
    if (corsErrors.length > 0) console.log('CORS errors:', corsErrors);
    if (networkErrors.length > 0) console.log('Network errors:', networkErrors.slice(0, 3));

    writeFileSync('test_v43_report.json', JSON.stringify(report, null, 2));
    console.log('Report written to test_v43_report.json');

  } catch (err) {
    console.error('Test error:', err.message);
    await shot('error-state');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
