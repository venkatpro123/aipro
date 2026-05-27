// Deep verification test - focuses on pipeline completion and CompanyPulseCard
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

function ss(page, name) {
  return page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  const consoleErrors = [];
  const corsErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      if (text.toLowerCase().includes('cors') || text.toLowerCase().includes('preflight') ||
          text.toLowerCase().includes('cross-origin') || text.toLowerCase().includes('blocked')) {
        if (!text.includes('Content Security Policy') && !text.includes('clearbit') &&
            !text.includes('deepseek') && !text.includes('groq')) {
          // Only flag TRUE CORS errors (not CSP blocks on LLM APIs which are expected)
          corsErrors.push(text);
        }
      }
    }
  });

  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('user_prediction_outcomes')) {
      networkErrors.push(`FAILED: ${req.method()} ${url.substring(0, 100)} — ${req.failure()?.errorText}`);
    }
  });

  console.log('=== Loading /terminal ===');
  await page.goto('http://localhost:5173/terminal', { waitUntil: 'networkidle', timeout: 30000 });

  // Fill company
  const companyInput = await page.waitForSelector('input[placeholder="Search company..."]', { timeout: 10000 });
  await companyInput.fill('Infosys');
  await page.waitForTimeout(2000);

  // Select from dropdown
  const dropdownItems = await page.$$('.glass-panel-heavy div.tab-btn');
  if (dropdownItems.length > 0) {
    await dropdownItems[0].click();
  } else {
    await companyInput.press('Enter');
  }
  await page.waitForTimeout(1500);

  // Fill role
  const roleInput = await page.$('input[placeholder="Search role..."]');
  if (roleInput) {
    await roleInput.fill('Software Engineer');
    await page.waitForTimeout(1500);
    await roleInput.press('ArrowDown');
    await page.waitForTimeout(300);
    await roleInput.press('Enter');
    await page.waitForTimeout(500);
  }

  // Continue to step 2
  const continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn && !(await continueBtn.isDisabled())) {
    await continueBtn.click();
    await page.waitForTimeout(1000);
  }

  // Execute audit
  const executeBtn = await page.$('button:has-text("Execute Full Audit")');
  if (executeBtn && !(await executeBtn.isDisabled())) {
    await executeBtn.click();
    console.log('Audit submitted!');
  }

  await ss(page, 'deep_01_audit_submitted.png');

  // === Monitor pipeline progress closely ===
  console.log('\n=== Monitoring pipeline for 120 seconds ===');

  const snapshots = [];
  let firstProgressTs = null;
  let last33Ts = null;
  let firstAdvanceTs = null;
  let completedTs = null;
  let was33 = false;

  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(1000);

    const pageText = await page.evaluate(() => document.body.innerText);

    // Extract progress percentage from pipeline UI
    const progressMatch = pageText.match(/INTELLIGENCE GATHERED\s+(\d+)%/);
    const pipelinePercent = progressMatch ? parseInt(progressMatch[1]) : null;

    // Other indicators
    const has33 = pageText.includes('33%');
    const hasDeploying = pageText.match(/DEPLOYING AGENTS|DEPLOYING/i);
    const hasGathering = pageText.includes('GATHERING INTELLIGENCE');
    const hasPartial = pageText.includes('PARTIAL INTELLIGENCE');
    const hasComplete = pageText.includes('AUDIT COMPLETE') || pageText.includes('ANALYSIS COMPLETE');
    const hasDashTabs = await page.$$('[role="tab"]').then(tabs => tabs.length > 0);
    const agentMatch = pageText.match(/AGENTS:\s*(\d+)\/(\d+)/);
    const signalMatch = pageText.match(/SIGNALS:\s*(\d+)/);

    const agents = agentMatch ? `${agentMatch[1]}/${agentMatch[2]}` : 'n/a';
    const signals = signalMatch ? signalMatch[1] : 'n/a';

    const snapshot = {
      t: i,
      pipelinePercent,
      has33, hasDeploying: !!hasDeploying, hasGathering, hasPartial, hasComplete,
      hasDashTabs, agents, signals
    };
    snapshots.push(snapshot);

    if (pipelinePercent !== null || has33 || hasDeploying || hasGathering) {
      if (!firstProgressTs) firstProgressTs = i;
    }

    if (has33) { was33 = true; last33Ts = i; }
    if (was33 && !has33 && !firstAdvanceTs && !hasDeploying) {
      firstAdvanceTs = i;
    }

    if (i % 5 === 0 || hasPartial || hasComplete || hasDashTabs) {
      const label = `t=${i}s: ${pipelinePercent !== null ? pipelinePercent+'%' : 'n/a'} | agents=${agents} signals=${signals} | deploying=${!!hasDeploying} gathering=${hasGathering} partial=${hasPartial} complete=${hasComplete} tabs=${hasDashTabs}`;
      console.log(label);
    }

    if (i % 15 === 0) {
      await ss(page, `deep_progress_${i.toString().padStart(3,'0')}s.png`);
    }

    // If we have the dashboard with tabs and pipeline seems done
    if (hasDashTabs && !hasDeploying && !hasGathering && i > 10) {
      completedTs = i;
      console.log(`Dashboard ready at t=${i}s`);
      await ss(page, 'deep_02_dashboard_ready.png');
      break;
    }

    // Also break if partial intelligence is showing and we've been waiting > 60s
    if (hasPartial && i > 60) {
      completedTs = i;
      console.log(`Partial intelligence at t=${i}s — proceeding`);
      await ss(page, 'deep_03_partial_intel.png');
      break;
    }
  }

  // === Final dashboard state ===
  console.log('\n=== Final state analysis ===');
  await ss(page, 'deep_04_final_state.png');

  const finalText = await page.evaluate(() => document.body.innerText);

  // Extract key data points
  console.log('\n--- Raw page text (pipeline/dashboard section) ---');
  // Find the relevant section
  const infosysIdx = finalText.indexOf('INFOSYS');
  if (infosysIdx >= 0) {
    console.log('INFOSYS section:', finalText.substring(infosysIdx, infosysIdx + 2000));
  } else {
    console.log('Full page (first 3000 chars):', finalText.substring(0, 3000));
  }

  // Check for tabs
  const tabs = await page.$$('[role="tab"]');
  console.log(`\nTabs found: ${tabs.length}`);
  for (const tab of tabs) {
    const t = await tab.innerText();
    console.log(`  Tab: "${t}"`);
  }

  // If we have tabs, click through them
  if (tabs.length > 0) {
    for (let i = 0; i < tabs.length; i++) {
      const tabText = await tabs[i].innerText();
      console.log(`\n--- Clicking tab: "${tabText}" ---`);
      await tabs[i].click();
      await page.waitForTimeout(1500);
      await ss(page, `deep_tab_${i}_${tabText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}.png`);

      const tabContent = await page.evaluate(() => document.body.innerText);
      // Look for financial data in this tab
      const stockChange = tabContent.match(/[+-]\d+\.?\d*%/g) || [];
      const marketCap = tabContent.match(/\$\d+\.?\d*[BM]/g) || [];
      const pe = tabContent.match(/\d+\.?\d*[×x]|\bP\/E\b/g) || [];
      const financialUnavail = tabContent.includes('Live financial signals unavailable') ||
                               tabContent.includes('financial signals unavailable');
      const companyPulse = tabContent.includes('Company Pulse') || tabContent.includes('COMPANY PULSE');
      const hasNews = tabContent.includes('Reuters') || tabContent.includes('Bloomberg') ||
                      tabContent.includes('headline') || tabContent.includes('Infosys');

      console.log(`  Stock changes: ${stockChange.slice(0,5)}`);
      console.log(`  Market caps: ${marketCap.slice(0,5)}`);
      console.log(`  P/E data: ${pe.slice(0,5)}`);
      console.log(`  "unavailable": ${financialUnavail}`);
      console.log(`  CompanyPulse: ${companyPulse}`);
      console.log(`  News content: ${hasNews}`);
    }
  }

  // === CORS Analysis ===
  console.log('\n=== CORS Analysis ===');
  // True CORS errors (not CSP blocks) - look for x-request-id related
  const allErrors = consoleErrors.filter(e =>
    e.includes('CORS') || e.includes('preflight') || e.includes('cross-origin') ||
    (e.includes('has been blocked') && !e.includes('Content Security Policy'))
  );

  console.log(`Total console errors: ${consoleErrors.length}`);
  console.log(`True CORS preflight errors (not CSP): ${allErrors.length}`);
  if (allErrors.length > 0) {
    allErrors.forEach(e => console.log('  CORS:', e.substring(0, 200)));
  }

  // Check for x-request-id header error specifically (the v42.3 fix target)
  const xRequestIdErrors = consoleErrors.filter(e => e.includes('x-request-id'));
  console.log(`x-request-id CORS errors: ${xRequestIdErrors.length}`);
  if (xRequestIdErrors.length > 0) {
    xRequestIdErrors.forEach(e => console.log('  x-request-id:', e));
  }

  // Check for Supabase edge function errors
  const efErrors = consoleErrors.filter(e =>
    (e.includes('supabase') || e.includes('functions')) &&
    (e.includes('500') || e.includes('401') || e.includes('CORS') || e.includes('blocked'))
  );
  console.log(`Supabase EF errors: ${efErrors.length}`);
  efErrors.slice(0, 5).forEach(e => console.log('  EF:', e.substring(0, 200)));

  console.log('\nNetwork errors:');
  networkErrors.forEach(e => console.log(' ', e));

  // === Progress summary ===
  console.log('\n=== Progress Summary ===');
  console.log(`First pipeline activity: t=${firstProgressTs}s`);
  console.log(`Last time at 33%: t=${last33Ts}s`);
  console.log(`First advance past 33%: t=${firstAdvanceTs}s`);
  console.log(`Dashboard complete: t=${completedTs}s`);

  const snapSummary = snapshots.filter(s => s.t % 5 === 0 || s.hasPartial || s.hasComplete);
  console.log('\nProgress snapshots:');
  snapSummary.forEach(s => {
    console.log(`  t=${s.t}s: ${s.pipelinePercent !== null ? s.pipelinePercent+'%' : '--'} | agents=${s.agents} sigs=${s.signals} | deploying=${s.hasDeploying} partial=${s.hasPartial} complete=${s.hasComplete}`);
  });

  console.log('\nScreenshots saved to:', SCREENSHOTS_DIR);
  await browser.close();
})();
