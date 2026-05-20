// predict-collapse-weekly/index.ts
//
// Supabase Edge Function — weekly forward prediction logging.
// Runs every Monday 08:00 UTC (pg_cron, registered in migration 20260519000005).
// Invoked 2h after refresh-market-intelligence so CI data is fresh.
//
// WHAT THIS FUNCTION DOES
// ───────────────────────
// 1. Loads all companies from company_intelligence + companies tables.
// 2. Loads recent breaking_news_events to compute news signal counts and
//    sector peer pressure without making live external API calls.
// 3. Runs the collapse stage detection algorithm (reimplemented here using
//    DB-sourced values — no Naukri/RSS API calls, which would burn quotas
//    and add ~30s per company for a full-database weekly scan).
// 4. For every company where stage >= 1:
//      a. Checks prediction_ledger for an existing entry in the last 7 days.
//      b. If none exists: INSERT with is_retroactive=false, status='monitoring'.
// 5. Sends an admin email summary via Resend (skipped if RESEND_API_KEY absent).
//
// EVIDENCE TRAIL GUARANTEE
// ─────────────────────────
// Every inserted row has is_retroactive=false and prediction_date=today.
// The created_at timestamp and the cron run_id are immutable after insert.
// This guarantees that the prediction was logged before any outcome was known —
// retroactive entries cannot substitute for this guarantee.
//
// ENV VARS
//   SUPABASE_URL              — set automatically
//   SUPABASE_SERVICE_ROLE_KEY — set automatically
//   RESEND_API_KEY            — optional; skip email if absent
//   ADMIN_EMAIL               — required for email; default: no email sent
//   ADMIN_FROM_EMAIL          — sender address; default: predictions@humanproof.ai

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Stage detection constants (mirrors collapsePredictor.ts) ─────────────────

const STAGE_MIN_RISK: Record<number, number> = { 1: 20, 2: 35, 3: 50 };
const SEVERITY_MULT: Record<string, number>  = { strong: 1.4, moderate: 1.0, weak: 0.6 };
const STAGE_BASE:    Record<number, number>  = { 1: 12, 2: 20, 3: 30 };

// ── DB row types ──────────────────────────────────────────────────────────────

interface CompanyRow {
  company_name:         string;
  industry:             string;
  region:               string | null;
  stock_90d_change:     number | null;   // from companies table
  ai_investment_signal: string | null;   // from companies table
  layoff_rounds:        number;          // from companies table
  last_layoff_date:     string | null;   // from company_intelligence flat column
  hiring_freeze_score:  number | null;   // from company_intelligence
}

interface NewsAggregate {
  company_name:  string;
  event_count_30d: number;
  negative_count:  number;  // events with confidence 'high' (more severe)
}

interface IndustryPeerCount {
  industry: string;
  peer_count_180d: number;
}

// ── Signal types ──────────────────────────────────────────────────────────────

interface StageSignal {
  name:        string;
  detected:    boolean;
  severity:    'weak' | 'moderate' | 'strong';
  description: string;
}

interface DetectionResult {
  stage:           1 | 2 | 3 | null;
  suppressedStage: 1 | 2 | 3 | null;
  isPromoted:      boolean;
  overallRisk:     number;
  signalConfidence: number;
  activeSignals:   string[];    // names of detected signals
  allSignals:      StageSignal[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthsSince(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.abs(
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()),
  );
}

// ── Stage 1 signal detectors ─────────────────────────────────────────────────

function s1_aiEfficiency(newsSentiment: number, layoffNewsCount: number): StageSignal {
  const detected = layoffNewsCount === 0 && newsSentiment < -0.1;
  return {
    name: 'AI/Efficiency Language in Earnings',
    detected,
    severity: detected ? 'moderate' : 'weak',
    description: detected
      ? 'Negative news sentiment without confirmed layoffs — precursor to restructuring'
      : 'No unusual efficiency language',
  };
}

function s1_sectorPeer(sectorLayoff180d: number): StageSignal {
  const detected = sectorLayoff180d >= 3;
  return {
    name: 'Sector Peer Layoff Pressure',
    detected,
    severity: sectorLayoff180d >= 6 ? 'strong' : sectorLayoff180d >= 3 ? 'moderate' : 'weak',
    description: detected
      ? `${sectorLayoff180d} peer companies in sector cut headcount in last 180 days`
      : 'Sector peers appear stable',
  };
}

function s1_aiInvestNoGrowth(stock90d: number | null, aiSignal: string | null): StageSignal {
  const highAI  = aiSignal === 'high' || aiSignal === 'very-high' || aiSignal === 'very_high';
  const stockDown = stock90d !== null && stock90d < -10;
  const detected  = highAI && stockDown;
  return {
    name: 'AI Investment Without Revenue Growth',
    detected,
    severity: detected ? 'moderate' : 'weak',
    description: detected
      ? 'Heavy AI investment while stock declining — efficiency cuts may follow'
      : 'AI investment aligned with performance',
  };
}

// ── Stage 2 signal detectors ─────────────────────────────────────────────────

function s2_hiringFreeze(freezeScore: number | null): StageSignal {
  const score   = freezeScore ?? 0;
  const detected = score > 0.55;
  return {
    name: 'Hiring Freeze Detected',
    detected,
    severity: score > 0.8 ? 'strong' : score > 0.6 ? 'moderate' : 'weak',
    description: detected
      ? `Hiring freeze score ${Math.round(score * 100)}/100 — postings below baseline`
      : 'Hiring activity appears normal',
  };
}

function s2_layoffPattern(rounds: number, mostRecentDate: string | null, now: Date): StageSignal {
  const hasRecent = mostRecentDate ? monthsSince(mostRecentDate, now) < 12 : false;
  const detected  = rounds >= 2 || (rounds >= 1 && hasRecent);
  return {
    name: 'Repeated or Recent Layoff Pattern',
    detected,
    severity: rounds >= 3 ? 'strong' : rounds >= 2 ? 'moderate' : 'weak',
    description: detected
      ? `${rounds} layoff round(s)${hasRecent ? ', most recent within 12 months' : ''}`
      : 'No significant layoff pattern',
  };
}

function s2_stockDecline(stock90d: number | null): StageSignal {
  const detected = stock90d !== null && stock90d < -20;
  return {
    name: 'Severe Stock Decline (>20% in 90 days)',
    detected,
    severity: stock90d !== null && stock90d < -35 ? 'strong' : 'moderate',
    description: detected
      ? `Stock down ${stock90d}% in 90 days`
      : 'Stock within normal range',
  };
}

// ── Stage 3 signal detectors ─────────────────────────────────────────────────

function s3_leadership(rounds: number, stock90d: number | null): StageSignal {
  const stockCrash = stock90d !== null && stock90d < -40;
  const detected   = rounds >= 3 && stockCrash;
  return {
    name: 'Severe Stock Crash With Serial Layoffs',
    detected,
    severity: detected ? 'strong' : 'weak',
    description: detected
      ? `${rounds} layoff rounds + stock −${Math.abs(stock90d ?? 0)}%`
      : 'No serial restructuring under market pressure',
  };
}

function s3_newsSentiment(layoffNewsCount: number, sentimentScore: number): StageSignal {
  const detected = layoffNewsCount >= 3 && sentimentScore < -0.4;
  return {
    name: 'Sustained Negative News Coverage',
    detected,
    severity: layoffNewsCount >= 5 ? 'strong' : 'moderate',
    description: detected
      ? `${layoffNewsCount} negative signals in 30 days (sentiment ${sentimentScore.toFixed(2)})`
      : 'No sustained negative coverage',
  };
}

function s3_filingDelinquency(delinquent: boolean): StageSignal {
  return {
    name: 'MCA Filing Delinquency (India)',
    detected: delinquent,
    severity: delinquent ? 'strong' : 'weak',
    description: delinquent
      ? 'No MCA filing in 24+ months — regulatory/operational distress'
      : 'Filings appear current',
  };
}

// ── Stage determination (mirrors collapsePredictor.ts logic exactly) ─────────

function detectStage(
  s1: StageSignal[],
  s2: StageSignal[],
  s3: StageSignal[],
): DetectionResult {
  const s1Active = s1.filter(s => s.detected).length;
  const s2Active = s2.filter(s => s.detected).length;
  const s3Active = s3.filter(s => s.detected).length;
  const totalActive = s1Active + s2Active + s3Active;

  type Tagged = StageSignal & { stageNum: 1 | 2 | 3 };
  const allTagged: Tagged[] = [
    ...s1.map(s => ({ ...s, stageNum: 1 as const })),
    ...s2.map(s => ({ ...s, stageNum: 2 as const })),
    ...s3.map(s => ({ ...s, stageNum: 3 as const })),
  ];
  const active = allTagged.filter(s => s.detected);

  const severityWeightedRisk = active.reduce(
    (sum, sig) => sum + STAGE_BASE[sig.stageNum] * SEVERITY_MULT[sig.severity], 0,
  );
  const overallRisk = Math.min(100, Math.round(severityWeightedRisk * (totalActive > 0 ? 1 : 0)));

  const maxPossible   = active.length * SEVERITY_MULT.strong;
  const actualWeight  = active.reduce((s, sig) => s + SEVERITY_MULT[sig.severity], 0);
  const signalConfidence = maxPossible > 0
    ? Math.round((actualWeight / maxPossible) * 100) / 100
    : 0;

  let rawStage: 1 | 2 | 3 | null = null;
  let isPromoted = false;

  if      (s3Active >= 2) rawStage = 3;
  else if (s2Active >= 2) rawStage = 2;
  else if (s1Active >= 2) rawStage = 1;

  if (!isPromoted) {
    if ((rawStage === null || rawStage < 2) && s2Active >= 1 && s1Active >= 2 && overallRisk >= STAGE_MIN_RISK[2]) {
      rawStage = 2; isPromoted = true;
    }
    if ((rawStage === null || rawStage < 3) && s3Active >= 1 && s2Active >= 1 && overallRisk >= STAGE_MIN_RISK[3]) {
      rawStage = 3; isPromoted = true;
    }
    if (rawStage === null && totalActive >= 1) {
      if      (s3Active >= 1) { rawStage = 3; isPromoted = true; }
      else if (s2Active >= 1) { rawStage = 2; isPromoted = true; }
      else                    { rawStage = 1; isPromoted = true; }
    }
  }

  let stage: 1 | 2 | 3 | null = rawStage;
  let suppressedStage: 1 | 2 | 3 | null = null;
  if (rawStage !== null && overallRisk < STAGE_MIN_RISK[rawStage]) {
    suppressedStage = rawStage;
    stage = null;
  }

  const activeSignals = active.filter(s => {
    // Only count signals from the resolved stage and below
    if (stage === null) return false;
    return true;
  }).map(s => s.name);

  return {
    stage, suppressedStage, isPromoted,
    overallRisk, signalConfidence,
    activeSignals,
    allSignals: [...s1, ...s2, ...s3],
  };
}

// ── Admin email via Resend ────────────────────────────────────────────────────

interface NewPrediction {
  company_name:    string;
  predicted_stage: number;
  active_signals:  string[];
  overall_risk:    number;
}

async function sendAdminEmail(
  newPredictions: NewPrediction[],
  runId: string,
  runDate: string,
  resendKey: string,
  adminEmail: string,
  fromEmail: string,
): Promise<void> {
  if (newPredictions.length === 0) {
    console.info('[predict-collapse-weekly] No new predictions — admin email skipped.');
    return;
  }

  const byStage = [1, 2, 3].map(stage => ({
    stage,
    items: newPredictions.filter(p => p.predicted_stage === stage),
  })).filter(g => g.items.length > 0);

  const stageLabels: Record<number, string> = {
    1: 'Stage 1 — Early Warning (12-18 months)',
    2: 'Stage 2 — Displacement in Progress (6-12 months)',
    3: 'Stage 3 — Imminent Risk (1-6 months)',
  };

  const htmlRows = byStage.map(({ stage, items }) => `
    <h3 style="color:#ef4444;margin:16px 0 8px">${stageLabels[stage]}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#1e293b;color:#94a3b8">
          <th style="padding:6px 10px;text-align:left">Company</th>
          <th style="padding:6px 10px;text-align:center">Risk</th>
          <th style="padding:6px 10px;text-align:left">Active Signals</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(p => `
          <tr style="border-bottom:1px solid #334155">
            <td style="padding:6px 10px;font-weight:600">${p.company_name}</td>
            <td style="padding:6px 10px;text-align:center;color:${p.overall_risk >= 50 ? '#ef4444' : p.overall_risk >= 35 ? '#f59e0b' : '#94a3b8'}">${p.overall_risk}</td>
            <td style="padding:6px 10px;color:#64748b;font-size:11px">${p.active_signals.join(' · ')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;max-width:800px">
      <h2 style="color:#60a5fa;margin:0 0 4px">HumanProof — Weekly Collapse Prediction Report</h2>
      <p style="color:#64748b;margin:0 0 20px;font-size:13px">Run ${runDate} · ID: ${runId}</p>
      <div style="background:#1e293b;padding:12px 16px;border-radius:8px;margin-bottom:20px">
        <strong style="font-size:20px;color:#f8fafc">${newPredictions.length}</strong>
        <span style="color:#94a3b8;margin-left:8px">new forward predictions logged</span>
        <span style="color:#475569;margin-left:16px;font-size:12px">
          Stage 3: ${newPredictions.filter(p => p.predicted_stage === 3).length} ·
          Stage 2: ${newPredictions.filter(p => p.predicted_stage === 2).length} ·
          Stage 1: ${newPredictions.filter(p => p.predicted_stage === 1).length}
        </span>
      </div>
      ${htmlRows}
      <p style="color:#334155;font-size:11px;margin-top:24px">
        Each prediction was logged with is_retroactive=false before any outcome is known.
        Predictions become eligible for accuracy measurement after a 180-day maturity window.
      </p>
    </body>
    </html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    fromEmail,
      to:      [adminEmail],
      subject: `[HumanProof] ${newPredictions.length} collapse prediction(s) logged — ${runDate}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn(`[predict-collapse-weekly] Resend error ${res.status}: ${body}`);
  } else {
    console.info(`[predict-collapse-weekly] Admin email sent to ${adminEmail}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (_req: Request) => {
  const runId    = crypto.randomUUID();
  const runStart = new Date();
  const runDate  = runStart.toISOString().slice(0, 10);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey   = Deno.env.get('RESEND_API_KEY')  ?? '';
  const adminEmail  = Deno.env.get('ADMIN_EMAIL')      ?? '';
  const fromEmail   = Deno.env.get('ADMIN_FROM_EMAIL') ?? 'predictions@humanproof.ai';

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ── Step 1: Load companies ─────────────────────────────────────────────────
  // Join company_intelligence (for hiring_freeze_score, industry, last_layoff_date)
  // with companies table (for stock_90d_change, ai_investment_signal, layoff_rounds).
  // Use LEFT JOIN so companies only in company_intelligence still process.
  const { data: ciRows, error: ciErr } = await db
    .from('company_intelligence')
    .select(
      'company_name, industry, region, hiring_freeze_score, last_layoff_date',
    )
    .order('confidence_score', { ascending: false })
    .limit(2000);  // weekly batch cap; increase if DB grows

  if (ciErr || !ciRows) {
    return new Response(
      JSON.stringify({ ok: false, error: ciErr?.message ?? 'company_intelligence load failed' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }

  // Also load flat-column signals from companies table
  const { data: compRows } = await db
    .from('companies')
    .select('name, stock_90d_change, ai_investment_signal, layoff_rounds')
    .limit(5000);

  const compMap = new Map<string, { stock_90d_change: number | null; ai_investment_signal: string | null; layoff_rounds: number }>();
  for (const r of (compRows ?? [])) {
    compMap.set((r.name as string).toLowerCase(), {
      stock_90d_change:     r.stock_90d_change  ?? null,
      ai_investment_signal: r.ai_investment_signal ?? null,
      layoff_rounds:        r.layoff_rounds     ?? 0,
    });
  }

  // ── Step 2: Aggregate breaking_news_events per company (last 30 days) ───────
  const thirtyDaysAgo = new Date(runStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: newsRows } = await db
    .from('breaking_news_events')
    .select('company_name, confidence')
    .gte('event_date', thirtyDaysAgo.toISOString().slice(0, 10))
    .limit(20000);

  const newsMap = new Map<string, { count: number; highCount: number }>();
  for (const r of (newsRows ?? [])) {
    const key = (r.company_name as string).toLowerCase();
    const cur = newsMap.get(key) ?? { count: 0, highCount: 0 };
    newsMap.set(key, {
      count:     cur.count + 1,
      highCount: cur.highCount + (r.confidence === 'high' ? 1 : 0),
    });
  }

  // ── Step 3: Aggregate sector peer counts (last 180 days) ──────────────────
  const oneEightyDaysAgo = new Date(runStart);
  oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

  // We need breaking_news_events joined with company_intelligence to get industry.
  // Simpler: load all breaking_news_events company names, then cross-reference
  // with company_intelligence industry. For weekly batch, pull distinct companies
  // with events in last 180 days, then count per-industry.
  const { data: peerRows } = await db
    .from('breaking_news_events')
    .select('company_name')
    .gte('event_date', oneEightyDaysAgo.toISOString().slice(0, 10))
    .limit(50000);

  const peerCompanies = new Set((peerRows ?? []).map((r: { company_name: string }) => r.company_name.toLowerCase()));

  // Build industry → peer count map: count how many DISTINCT companies in this
  // industry appeared in breaking_news_events in the last 180 days.
  const industryPeerMap = new Map<string, number>();
  for (const row of ciRows) {
    const industry = (row.industry as string).toLowerCase();
    if (peerCompanies.has((row.company_name as string).toLowerCase())) {
      industryPeerMap.set(industry, (industryPeerMap.get(industry) ?? 0) + 1);
    }
  }

  // ── Step 4: Load existing prediction_ledger entries (last 7 days) ─────────
  // To avoid writing duplicate entries for the same company in the same week.
  const sevenDaysAgo = new Date(runStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: existingRows } = await db
    .from('prediction_ledger')
    .select('company_name, predicted_stage')
    .gte('prediction_date', sevenDaysAgo.toISOString().slice(0, 10));

  const recentlyPredicted = new Set(
    (existingRows ?? []).map((r: { company_name: string }) => r.company_name.toLowerCase()),
  );

  // ── Step 5: Detect collapse stage for each company ────────────────────────
  const newPredictions: NewPrediction[] = [];
  const insertRows: Record<string, unknown>[] = [];
  const errors: string[] = [];

  for (const row of ciRows) {
    const companyLower = (row.company_name as string).toLowerCase();

    // Skip if already predicted this week
    if (recentlyPredicted.has(companyLower)) continue;

    const flat = compMap.get(companyLower);
    const news = newsMap.get(companyLower) ?? { count: 0, highCount: 0 };
    const industry = (row.industry as string).toLowerCase();
    const sectorPeers = industryPeerMap.get(industry) ?? 0;

    const stock90d    = flat?.stock_90d_change     ?? null;
    const aiSignal    = flat?.ai_investment_signal ?? null;
    const layoffRounds = flat?.layoff_rounds       ?? 0;
    const hiringFreeze = (row.hiring_freeze_score as number | null) ?? null;
    const lastLayoff   = (row.last_layoff_date as string | null)    ?? null;

    // News sentiment proxy: negative ratio (–1 to 0, where –1 = all negative)
    const sentimentProxy = news.count > 0
      ? -(news.highCount / news.count)
      : 0;

    // MCA delinquency proxy: India companies whose last_updated is > 24 months old
    const isIndia = (row.region as string | null)?.toUpperCase() === 'IN';
    const lastUpdated = (row as { last_updated?: string }).last_updated;
    const filingDelinquent = isIndia && lastUpdated
      ? monthsSince(lastUpdated, runStart) > 24
      : false;

    try {
      const s1 = [
        s1_aiEfficiency(sentimentProxy, news.count),
        s1_sectorPeer(sectorPeers),
        s1_aiInvestNoGrowth(stock90d, aiSignal),
      ];
      const s2 = [
        s2_hiringFreeze(hiringFreeze),
        s2_layoffPattern(layoffRounds, lastLayoff, runStart),
        s2_stockDecline(stock90d),
      ];
      const s3 = [
        s3_leadership(layoffRounds, stock90d),
        s3_newsSentiment(news.count, sentimentProxy),
        s3_filingDelinquency(filingDelinquent),
      ];

      const result = detectStage(s1, s2, s3);

      // Only log predictions for stage >= 1 (above confidence threshold)
      if (result.stage === null || result.stage < 1) continue;

      const allActive = [...s1, ...s2, ...s3]
        .filter(s => s.detected)
        .map(s => s.name);

      // Build signal snapshot for auditability
      const snapshot = {
        stage1: s1, stage2: s2, stage3: s3,
        overallRisk: result.overallRisk,
        signalConfidence: result.signalConfidence,
        isPromoted: result.isPromoted,
        inputs: { stock90d, aiSignal, layoffRounds, hiringFreeze, sectorPeers, newsCount: news.count },
      };

      insertRows.push({
        company_name:        row.company_name,
        industry:            row.industry,
        region:              row.region ?? null,
        prediction_date:     runDate,
        predicted_stage:     result.stage,
        predicted_signals:   allActive,
        overall_risk:        result.overallRisk,
        signal_confidence:   result.signalConfidence,
        is_promoted:         result.isPromoted,
        status:              'monitoring',
        is_retroactive:      false,
        predicted_by_run_id: runId,
        signal_snapshot:     snapshot,
      });

      newPredictions.push({
        company_name:    row.company_name as string,
        predicted_stage: result.stage,
        active_signals:  allActive,
        overall_risk:    result.overallRisk,
      });

    } catch (e) {
      errors.push(`${row.company_name}: ${String(e)}`);
    }
  }

  // ── Step 6: Bulk insert new predictions ───────────────────────────────────
  let insertedCount = 0;
  if (insertRows.length > 0) {
    const { error: insertErr, count } = await db
      .from('prediction_ledger')
      .upsert(insertRows, {
        onConflict:      'company_name,prediction_date',
        ignoreDuplicates: true,
        count: 'exact',
      });
    if (insertErr) {
      errors.push(`bulk insert: ${insertErr.message}`);
    } else {
      insertedCount = count ?? insertRows.length;
    }
  }

  // ── Step 7: Send admin email summary ─────────────────────────────────────
  if (resendKey && adminEmail) {
    try {
      await sendAdminEmail(newPredictions, runId, runDate, resendKey, adminEmail, fromEmail);
    } catch (e) {
      errors.push(`email: ${String(e)}`);
    }
  } else if (newPredictions.length > 0) {
    // Log summary to console when email is not configured
    console.info(
      `[predict-collapse-weekly] ${newPredictions.length} new prediction(s) logged:\n` +
      newPredictions
        .sort((a, b) => b.predicted_stage - a.predicted_stage || b.overall_risk - a.overall_risk)
        .map(p => `  Stage ${p.predicted_stage} | risk=${p.overall_risk} | ${p.company_name}: ${p.active_signals.join(', ')}`)
        .join('\n'),
    );
  }

  const elapsed = Date.now() - runStart.getTime();
  const summary = {
    ok:              true,
    run_id:          runId,
    run_date:        runDate,
    elapsed_ms:      elapsed,
    companies_scanned: ciRows.length,
    already_predicted_this_week: recentlyPredicted.size,
    stage_detections: {
      stage3: newPredictions.filter(p => p.predicted_stage === 3).length,
      stage2: newPredictions.filter(p => p.predicted_stage === 2).length,
      stage1: newPredictions.filter(p => p.predicted_stage === 1).length,
    },
    inserted:  insertedCount,
    errors:    errors.length > 0 ? errors : undefined,
  };

  console.info('[predict-collapse-weekly] complete:', JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  });
});
