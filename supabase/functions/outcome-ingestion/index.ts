// outcome-ingestion/index.ts — WS2
//
// Cron-driven implicit outcome detector. Activates the previously-scaffolded
// implicitOutcomeDetector logic by:
//
//   1. Querying user_prediction_outcomes for unconfirmed audits aged >= 14
//      days (the minimum gap so a confirmed layoff event can plausibly have
//      surfaced in public sources).
//   2. Querying the union of breaking_news_events + curated_layoff_events
//      filtered to event_date > audit_date (an event BEFORE the audit cannot
//      be the audit's outcome).
//   3. Running fuzzy company-name matching (mirrors the algorithm in
//      artifacts/humanproof/src/services/implicitOutcomeDetector.ts).
//   4. Inserting detected outcomes with outcome_source in
//      {implicit_warn, implicit_layoffsfyi, implicit_news} and
//      detection_confidence per source authority.
//
// Idempotency:
//   * uq_upo_implicit_dedup (audit_session_id, outcome_source) prevents
//     duplicate inserts across runs.
//   * Runs even if a user_reported row already exists — the
//     outcome_dual_coding_candidates view surfaces the agreement for
//     downstream promotion to dual_coded.
//
// Trigger:
//   * pg_cron schedule every 6h (registered in a follow-up migration).
//   * Manually invokable via POST without a body for ad-hoc backfill.
//
// Confidence thresholds (must match the published detector contract):
//   warn:        0.95  (legally-required filing — highest authority)
//   layoffs_fyi: 0.90  (aggregator with verified-event discipline)
//   news_cache:  0.75  (curated press coverage, medium authority)
// Below 0.75 the row is NOT inserted (it would not enter the calibration
// training set anyway under WS2's quality gate).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun, corsHeaders } from '../_shared/otel.ts';

// ── Config ──────────────────────────────────────────────────────────────────

const MIN_AGE_DAYS = 14;          // audits younger than this are skipped
const MAX_AGE_DAYS = 365;         // outcomes detected past 1y add little value
const MAX_AUDITS_PER_RUN = 500;   // pagination cap; tune as throughput grows
const EVENT_DATE_WINDOW_DAYS = 180; // only consider events within 180d of audit
const MIN_CONFIDENCE_TO_INSERT = 0.75;

type DetectorSource = 'warn' | 'layoffs_fyi' | 'news_cache';
type OutcomeSource = 'implicit_warn' | 'implicit_layoffsfyi' | 'implicit_news';

const CONFIDENCE_BY_SOURCE: Record<DetectorSource, number> = {
  warn: 0.95,
  layoffs_fyi: 0.90,
  news_cache: 0.75,
};

const OUTCOME_SOURCE_MAP: Record<DetectorSource, OutcomeSource> = {
  warn: 'implicit_warn',
  layoffs_fyi: 'implicit_layoffsfyi',
  news_cache: 'implicit_news',
};

// ── Types ───────────────────────────────────────────────────────────────────

interface AuditRow {
  id: string;
  user_id: string;
  audit_session_id: string | null;
  company_name: string;
  role_title: string | null;
  predicted_risk_tier: string;
  predicted_score: number;
  audit_date: string;
}

interface LayoffEventRow {
  company_name: string;
  event_date: string;
  source: string;
  confidence: string;
  percent_cut: number | null;
  affected_count: number | null;
  source_url: string | null;
}

interface DetectedOutcome {
  user_id: string;
  audit_session_id: string;
  company_name: string;
  role_title: string | null;
  // Preserved from the original unconfirmed audit row so the implicit
  // outcome ledger row carries the same predicted values the audit
  // produced — analytics queries don't need to join across audit_session_id
  // to recover them.
  predicted_risk_tier: string;
  predicted_score: number;
  /** ISO date string of the original audit, NOT today. */
  original_audit_date: string;
  outcome_source: OutcomeSource;
  outcome_reported: 'laid_off';
  outcome_date: string;
  detection_confidence: number;
  detected_at: string;
  detection_evidence: Record<string, unknown>;
}

// ── Fuzzy matcher (mirrors implicitOutcomeDetector.ts) ──────────────────────

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(inc|corp|ltd|llc|limited|pvt|co|plc|gmbh|ag|sa|bv|oy|ab|nv|srl|holdings?|group|international)\b\.?/g,
      '',
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatchCompanyName(searchName: string, eventCompany: string): boolean {
  const a = normalizeForMatch(searchName);
  const b = normalizeForMatch(eventCompany);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const lenDiff = Math.abs(a.length - b.length);
  const firstFiveMatch = a.slice(0, 5) === b.slice(0, 5) && a.length >= 5 && b.length >= 5;
  if (lenDiff < 3 && firstFiveMatch) return true;
  return false;
}

// ── Source classification ───────────────────────────────────────────────────

/**
 * Map an event's source string + confidence to a detector source class.
 * Misclassifying here changes the inserted detection_confidence so be
 * conservative — when in doubt, classify as news_cache (lowest tier).
 */
function classifyEventSource(source: string, confidence: string): DetectorSource {
  const s = (source ?? '').toLowerCase();
  if (s.includes('warn') || confidence === 'regulatory') return 'warn';
  if (s.includes('layoffs.fyi') || s.includes('layoffsfyi') || s.includes('layoffs_fyi')) return 'layoffs_fyi';
  // SEC filings count as regulatory-tier, treat as warn for confidence purposes.
  if (s.includes('sec ') || s.includes('8-k') || s.includes('10-q') || s.includes('10-k')) return 'warn';
  return 'news_cache';
}

// ── Best-match selection ────────────────────────────────────────────────────

/**
 * Given a list of layoff events that fuzzy-match an audit's company,
 * return the one that should drive the detection (highest authority,
 * earliest within the time window).
 *
 * Priority: warn > layoffs_fyi > news_cache, then oldest event_date first.
 * (Oldest because the FIRST credible layoff event after the audit is the
 * most likely outcome trigger; later events may be continuations.)
 */
function pickBestMatch(events: LayoffEventRow[]): { event: LayoffEventRow; source: DetectorSource } | null {
  const sourceRank: Record<DetectorSource, number> = { warn: 0, layoffs_fyi: 1, news_cache: 2 };
  let best: { event: LayoffEventRow; source: DetectorSource } | null = null;
  for (const e of events) {
    const cls = classifyEventSource(e.source, e.confidence);
    if (
      best == null ||
      sourceRank[cls] < sourceRank[best.source] ||
      (sourceRank[cls] === sourceRank[best.source] && e.event_date < best.event.event_date)
    ) {
      best = { event: e, source: cls };
    }
  }
  return best;
}

// ── Main run ────────────────────────────────────────────────────────────────

Deno.serve((req) =>
  withRun('outcome-ingestion', req, async (run) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // ── Step 1: fetch eligible audits ───────────────────────────────────────
    const minAge = new Date();
    minAge.setUTCDate(minAge.getUTCDate() - MIN_AGE_DAYS);
    const maxAge = new Date();
    maxAge.setUTCDate(maxAge.getUTCDate() - MAX_AGE_DAYS);

    const { data: audits, error: auditsErr } = await supabase
      .from('user_prediction_outcomes')
      .select('id,user_id,audit_session_id,company_name,role_title,predicted_risk_tier,predicted_score,audit_date')
      .is('outcome_reported', null)
      .lte('audit_date', minAge.toISOString().slice(0, 10))
      .gte('audit_date', maxAge.toISOString().slice(0, 10))
      .order('audit_date', { ascending: false })
      .limit(MAX_AUDITS_PER_RUN);

    if (auditsErr) {
      run.recordFallback({
        layerId: 'outcome_ingestion_audits_fetch',
        reason: 'exception',
        errorKind: 'select_failed',
        errorMessage: auditsErr.message,
      });
      throw new Error(`audits fetch failed: ${auditsErr.message}`);
    }

    const auditRows = (audits ?? []) as AuditRow[];
    run.setItemsIn(auditRows.length);

    if (auditRows.length === 0) {
      return new Response(JSON.stringify({ ok: true, scanned: 0, inserted: 0, message: 'no eligible audits' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 2: fetch candidate events ──────────────────────────────────────
    // Lower bound: oldest audit minus 1 day (defensive). Upper bound: now.
    const oldestAuditDate = auditRows[auditRows.length - 1].audit_date;
    const lowerEventDate = oldestAuditDate; // events must be >= audit_date per audit

    const [breakingRes, curatedRes] = await Promise.allSettled([
      supabase
        .from('breaking_news_events')
        .select('company_name,event_date,source,confidence,percent_cut,affected_count,source_url')
        .gte('event_date', lowerEventDate)
        .limit(5000),
      supabase
        .from('curated_layoff_events')
        .select('company_name,event_date,source,confidence,percent_cut,affected_count,source_url')
        .gte('event_date', lowerEventDate)
        .limit(5000),
    ]);

    const breakingRows: LayoffEventRow[] =
      breakingRes.status === 'fulfilled' && breakingRes.value.data
        ? (breakingRes.value.data as LayoffEventRow[])
        : [];
    const curatedRows: LayoffEventRow[] =
      curatedRes.status === 'fulfilled' && curatedRes.value.data
        ? (curatedRes.value.data as LayoffEventRow[])
        : [];

    if (breakingRes.status === 'rejected') {
      run.recordFallback({
        layerId: 'outcome_ingestion_breaking_fetch',
        reason: 'exception',
        errorMessage: String(breakingRes.reason),
      });
    }
    if (curatedRes.status === 'rejected') {
      run.recordFallback({
        layerId: 'outcome_ingestion_curated_fetch',
        reason: 'exception',
        errorMessage: String(curatedRes.reason),
      });
    }

    const allEvents = [...breakingRows, ...curatedRows];
    run.addMeta('events_loaded', allEvents.length);

    // ── Step 3: per-audit matching ──────────────────────────────────────────
    const detections: DetectedOutcome[] = [];
    const windowMs = EVENT_DATE_WINDOW_DAYS * 24 * 3600 * 1000;
    const nowIso = new Date().toISOString();

    for (const audit of auditRows) {
      if (!audit.audit_session_id) continue;  // can't dedupe without session id
      const auditMs = new Date(audit.audit_date).getTime();
      const auditUpperMs = auditMs + windowMs;

      const candidates = allEvents.filter((e) => {
        if (!fuzzyMatchCompanyName(audit.company_name, e.company_name)) return false;
        const evMs = new Date(e.event_date).getTime();
        return evMs >= auditMs && evMs <= auditUpperMs;
      });
      if (candidates.length === 0) continue;

      const best = pickBestMatch(candidates);
      if (!best) continue;

      const confidence = CONFIDENCE_BY_SOURCE[best.source];
      if (confidence < MIN_CONFIDENCE_TO_INSERT) continue;

      detections.push({
        user_id: audit.user_id,
        audit_session_id: audit.audit_session_id,
        company_name: audit.company_name,
        role_title: audit.role_title,
        predicted_risk_tier: audit.predicted_risk_tier,
        predicted_score: audit.predicted_score,
        original_audit_date: audit.audit_date,
        outcome_source: OUTCOME_SOURCE_MAP[best.source],
        outcome_reported: 'laid_off',
        outcome_date: best.event.event_date,
        detection_confidence: confidence,
        detected_at: nowIso,
        detection_evidence: {
          source: best.source,
          event_company: best.event.company_name,
          event_date: best.event.event_date,
          event_source_label: best.event.source,
          event_confidence_label: best.event.confidence,
          percent_cut: best.event.percent_cut,
          affected_count: best.event.affected_count,
          source_url: best.event.source_url,
          match_method: 'fuzzy',
        },
      });
    }

    run.addMeta('detections', detections.length);

    if (detections.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, scanned: auditRows.length, events_loaded: allEvents.length, inserted: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 4: insert (idempotent via uq_upo_implicit_dedup) ───────────────
    // Build full INSERT payload. Note: we ALWAYS create a NEW row (rather
    // than updating the matching unconfirmed row) because:
    //   * a single audit can have BOTH a user-reported and an implicit row
    //   * dual_coded promotion is handled by the dual_coding_candidates view
    //   * dedup is per (audit_session_id, outcome_source) so re-runs are safe
    const rowsToInsert = detections.map((d) => ({
      user_id: d.user_id,
      audit_session_id: d.audit_session_id,
      company_name: d.company_name,
      role_title: d.role_title,
      // Carry the ORIGINAL audit's predicted values into the implicit
      // outcome row so backtest / calibration queries see the prediction
      // that this outcome is judging. Previously hardcoded to "Moderate
      // risk" / 50 — a silent bug that injected noise into every
      // implicit-outcome calibration metric.
      predicted_risk_tier: d.predicted_risk_tier,
      predicted_score: d.predicted_score,
      // audit_date = the date of the ORIGINAL audit, not today. The
      // outcome row is logically attached to that audit's prediction.
      audit_date: d.original_audit_date,
      outcome_reported: d.outcome_reported,
      outcome_date: d.outcome_date,
      outcome_notes: 'inserted by outcome-ingestion edge function',
      outcome_source: d.outcome_source,
      detection_confidence: d.detection_confidence,
      detected_at: d.detected_at,
      detection_evidence: d.detection_evidence,
    }));

    // Use upsert with onConflict on the dedup constraint. If a previous run
    // already detected the same outcome, the existing row is preserved.
    const { error: insertErr, count } = await supabase
      .from('user_prediction_outcomes')
      .upsert(rowsToInsert, {
        onConflict: 'user_id,audit_session_id,outcome_source',
        ignoreDuplicates: true,
        count: 'exact',
      });

    if (insertErr) {
      run.recordFallback({
        layerId: 'outcome_ingestion_insert',
        reason: 'exception',
        errorKind: 'insert_failed',
        errorMessage: insertErr.message,
      });
      throw new Error(`outcome insert failed: ${insertErr.message}`);
    }

    run.setItemsOut(count ?? detections.length);

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: auditRows.length,
        events_loaded: allEvents.length,
        detected: detections.length,
        inserted: count ?? detections.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }),
);
