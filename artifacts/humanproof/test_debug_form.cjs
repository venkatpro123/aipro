// Debug form submission
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots_debug');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

function ss(page, name) {
  return page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('http://localhost:5173/terminal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await ss(page, '01_loaded.png');

  // Company input
  const companyInput = await page.waitForSelector('input[placeholder="Search company..."]', { timeout: 10000 });
  await companyInput.click();
  await page.keyboard.type('Infosys', { delay: 50 });
  await page.waitForTimeout(2500);

  // Check dropdown
  const dropdown = await page.$('.glass-panel-heavy');
  console.log('Dropdown found:', !!dropdown);
  if (dropdown) {
    const dropdownText = await dropdown.innerText();
    console.log('Dropdown text:', dropdownText.substring(0, 200));
  }

  // Check all elements with tab-btn class
  const tabBtns = await page.$$('.tab-btn');
  console.log(`tab-btn elements: ${tabBtns.length}`);

  // Check the specific z-index elements
  const allInputs = await page.$$('input');
  console.log(`Inputs on page: ${allInputs.length}`);
  for (let i = 0; i < allInputs.length; i++) {
    const ph = await allInputs[i].getAttribute('placeholder');
    const val = await allInputs[i].inputValue();
    console.log(`  Input[${i}]: placeholder="${ph}", value="${val}"`);
  }

  // Try clicking anywhere in the search results area (the div following the input)
  await ss(page, '02_after_typing.png');

  // Check if there are results by looking at the HTML
  const html = await page.evaluate(() => {
    const el = document.querySelector('.glass-panel-heavy');
    return el ? el.innerHTML.substring(0, 500) : 'not found';
  });
  console.log('glass-panel-heavy HTML:', html);

  // The company input dropdown might be in a different container - let's just proceed without selecting
  // The form should work with just the typed text
  const companyInputVal = await companyInput.inputValue();
  console.log(`Company input value: "${companyInputVal}"`);

  // Role input
  const roleInput = await page.$('input[placeholder="Search role..."]');
  await roleInput.click();
  await page.keyboard.type('Software', { delay: 50 });
  await page.waitForTimeout(1500);
  await ss(page, '03_role_typed.png');

  // Wait for suggestions to appear
  const suggestions = await page.$$('.tab-btn');
  console.log(`tab-btn elements after role type: ${suggestions.length}`);

  // Find role suggestions specifically (those in the dropdown)
  const roleSuggestionEls = await page.evaluate(() => {
    const allDivs = document.querySelectorAll('.glass-panel-heavy .tab-btn');
    return Array.from(allDivs).map(d => d.innerText.substring(0, 60));
  });
  console.log('Role suggestions from DOM:', roleSuggestionEls);

  if (roleSuggestionEls.length > 0) {
    // Click via page.$$ and then [0].click()
    const roleSuggDivs = await page.$$('.glass-panel-heavy .tab-btn');
    await roleSuggDivs[0].click();
    console.log('Clicked first role suggestion');
  }
  await page.waitForTimeout(500);
  await ss(page, '04_role_selected.png');

  // Check canProceedStep1 by checking button disabled state
  const continueBtn = await page.$('button:has-text("Continue Analysis")');
  if (continueBtn) {
    const disabled = await continueBtn.isDisabled();
    console.log(`Continue Analysis disabled: ${disabled}`);
    const className = await continueBtn.getAttribute('class');
    console.log(`Continue Analysis class: ${className}`);
  }

  // Check what's on page now
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasResolved = pageText.match(/Analyzing as:|Role Intelligence|Coverage:/);
  console.log('Role resolved (has Analyzing/Coverage text):', !!hasResolved);
  if (hasResolved) console.log('Match:', hasResolved[0]);

  // Try clicking the button anyway
  if (continueBtn) {
    await continueBtn.click({ force: true });
    console.log('Force-clicked Continue Analysis');
    await page.waitForTimeout(2000);
    await ss(page, '05_after_continue.png');
  }

  const pageText2 = await page.evaluate(() => document.body.innerText);
  console.log('After continue - page text:', pageText2.substring(0, 300));

  // Check if we're on step 2
  const step2 = await page.$('text=STEP 02');
  const executeBtn = await page.$('button:has-text("Execute Full Audit")');
  console.log(`Step 2 indicator: ${!!step2}`);
  console.log(`Execute button: ${!!executeBtn}`);

  if (executeBtn) {
    await executeBtn.click({ force: true });
    console.log('Force-clicked Execute Full Audit!');
    await page.waitForTimeout(3000);
    await ss(page, '06_after_execute.png');

    const pageText3 = await page.evaluate(() => document.body.innerText);
    console.log('After execute - page text (first 500):', pageText3.substring(0, 500));
  } else {
    // Maybe the navigate to "/" or a different page happened?
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    // Try to see what the dashboard shows - it might have already started
    const hasPipeline = pageText2.match(/DEPLOYING|GATHERING|33%|INTELLIGENCE/i);
    console.log('Has pipeline text:', !!hasPipeline);
  }

  await browser.close();
})();
