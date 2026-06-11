// Phase 4 verification — real throwaway auth user, seeded twin history + outcome
// events, drive the LayoffDefense Outcomes tab, verify the OutcomeDashboard renders
// (Am I safer / what worked / your wins) and that "Log a win" capture round-trips.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()];}));
const URL = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY, SR = env.SUPABASE_SERVICE_ROLE_KEY;
const ref = URL.match(/https:\/\/([^.]+)\./)[1];
const admin = createClient(URL, SR, { auth: { persistSession: false } });
const BASE = 'http://localhost:5173';

const email = `p4_${Date.now()}@example.com`;
const password = 'Test!2345_p4';
let userId = null;

async function cleanup() {
  if (!userId) return;
  for (const t of ['career_outcome_events','career_twin_state','action_completions','layoff_scores'])
    try { await admin.from(t).delete().eq('user_id', userId); } catch {}
  try { await admin.auth.admin.deleteUser(userId); } catch {}
  console.log('[CLEANUP] done');
}

try {
  // 1) create + confirm user
  const { data: cu, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (ce) throw ce; userId = cu.user.id;
  console.log('[USER]', userId);

  // 2) seed twin history (40 days apart, risk fell 71 -> 58) + outcome events
  const today = new Date(); const old = new Date(Date.now() - 41*86400000);
  await admin.from('career_twin_state').upsert({
    user_id: userId,
    audit_score_history: [
      { date: old.toISOString(), score: 71, company: 'Acme', role: 'Data Scientist' },
      { date: today.toISOString(), score: 58, company: 'Acme', role: 'Data Scientist' },
    ],
    outcome_success_rates: {},
  }, { onConflict: 'user_id' });
  await admin.from('career_outcome_events').insert([
    { user_id: userId, event_type: 'skill_certified', event_date: old.toISOString().slice(0,10), source: 'user_reported' },
    { user_id: userId, event_type: 'negotiation_win', event_date: today.toISOString().slice(0,10), source: 'user_reported' },
  ]);
  console.log('[SEED] twin history + 2 events');

  // 3) real session token via anon sign-in
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: si, error: se } = await anon.auth.signInWithPassword({ email, password });
  if (se) throw se;
  const session = si.session;
  console.log('[SESSION] got real token');

  // 4) drive browser
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0,120)));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((a) => {
    localStorage.setItem('sb-' + a.ref + '-auth-token', JSON.stringify(a.session));
    localStorage.setItem('hp_onboarding_done', '1');
  }, { ref, session });

  await page.goto(BASE + '/tools/layoff-defense', { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(2000);
  // dismiss profile modal if present
  const skip = page.locator('button:has-text("Skip for now"), button:has-text("Skip")').first();
  if (await skip.isVisible().catch(()=>false)) { await skip.click(); await page.waitForTimeout(500); }

  // Inject a score into LayoffContext so the tool renders its tabs (the tabs are
  // gated on having an audit — the Outcome dashboard itself reads from the DB).
  const MOCK_HR = { total: 58, breakdown: { L1:0.5,L2:0.4,L3:0.6,L4:0.4,L5:0.3 }, tier: { label:'Elevated risk', color:'amber', advice:'Act now.' }, confidence:'Medium', confidencePercent:68, calculatedAt:new Date().toISOString(), signalQuality:{liveSignals:3,heuristicSignals:2,dbSignals:2} };
  await page.evaluate((mockHr) => {
    function walk(f, d) { if (!f || d>1200) return; let s=f.memoizedState; while(s){ if(s.queue&&typeof s.queue.dispatch==='function'){ const c=s.memoizedState; if(c&&typeof c==='object'&&'scoreResult' in c){ try{ s.queue.dispatch({type:'SET_SCORE_RESULT', payload:mockHr}); }catch{} } } s=s.next; } walk(f.child,d+1); walk(f.sibling,d+1); }
    let rf=null; for(const el of document.querySelectorAll('*')){ const k=Object.keys(el).find(k=>k.startsWith('__reactFiber')); if(k){rf=el[k];break;} }
    if(!rf) return; let c=rf; while(c.return)c=c.return; walk(c,0);
  }, MOCK_HR);
  await page.waitForTimeout(1500);

  // Click Outcomes tab
  const tabs = await page.locator('[role=tab], [role=tablist] button').allInnerTexts().catch(()=>[]);
  console.log('[TABS]', JSON.stringify(tabs.slice(0,10)));
  const oi = tabs.findIndex(t => /outcome/i.test(t));
  if (oi < 0) throw new Error('No Outcomes tab found');
  const tabEl = page.locator('[role=tab], [role=tablist] button').nth(oi);
  await tabEl.focus(); await tabEl.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'c:/supabase/verify_p4_outcomes.png', fullPage: true });
  console.log('[SS] verify_p4_outcomes.png');

  const safer   = await page.locator('text=AM I SAFER THAN LAST MONTH').isVisible().catch(()=>false);
  const saferPts= await page.locator('text=/13 pts/').first().isVisible().catch(()=>false);
  const logWin  = await page.locator('text=LOG A WIN').isVisible().catch(()=>false);
  const worked  = await page.locator('text=WHAT ACTUALLY WORKED').isVisible().catch(()=>false);
  const wins    = await page.locator('text=YOUR WINS').isVisible().catch(()=>false);
  const negWin  = await page.locator('text=Negotiation win').first().isVisible().catch(()=>false);
  console.log('[DASH] safer:', safer, '| 13pts:', saferPts, '| logWin:', logWin, '| worked:', worked, '| yourWins:', wins, '| negWin:', negWin);

  // 5) capture round-trip: click "Promotion" → DB row appears
  const before = (await admin.from('career_outcome_events').select('id').eq('user_id', userId).eq('event_type','promotion')).data?.length ?? 0;
  const promoBtn = page.locator('button:has-text("Promotion")').first();
  if (await promoBtn.isVisible().catch(()=>false)) {
    await promoBtn.click();
    await page.waitForTimeout(2500);
    const after = (await admin.from('career_outcome_events').select('id').eq('user_id', userId).eq('event_type','promotion')).data?.length ?? 0;
    const promoVisible = await page.locator('text=Promotion').first().isVisible().catch(()=>false);
    console.log('[CAPTURE] promotion rows', before, '->', after, '| visible in timeline:', promoVisible);
    await page.screenshot({ path: 'c:/supabase/verify_p4_logged.png', fullPage: true });
  } else {
    console.log('[CAPTURE] Promotion button not found');
  }

  console.log('[JS_ERRORS]', JSON.stringify(errs.filter(e=>!/401|JWT|PGRST|Failed to load|ERR_ABORTED/.test(e)).slice(0,5)));
  await browser.close();
} catch (e) {
  console.error('[ERROR]', e.message);
} finally {
  await cleanup();
  console.log('DONE');
}
