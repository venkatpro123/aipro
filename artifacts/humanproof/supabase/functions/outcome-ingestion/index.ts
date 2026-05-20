// outcome-ingestion/index.ts
//
// Supabase Edge Function — daily outcome ingestion cron.
// Invoked at 04:00 UTC by pg_cron (registered in migration 20260519000004).
//
// WHAT THIS FUNCTION DOES
// ───────────────────────
// 1. Fetches all WARN Act filings from the last `lookbackDays` days.
// 2. Fetches all breaking_news_events classified as layoffs.fyi or news.
// 3. Loads all unconfirmed audit sessions from user_prediction_outcomes
//    (rows where outcome_reported IS NULL AND requires_manual_review = false).
// 4. For each session, cross-references the company against step 1+2 events
//    using fuzzy company name matching. Filters to post-audit events only.
// 5. Builds an ingestion candidate for each match using source-specific
//    confidence thresholds:
//      WARN Act filing       → confidence 0.95 (legally mandated, highest reliability)
//      layoffs.fyi confirmed → confidence 0.90
//      news article          → confidence 0.75
// 6. When multiple sources match the same session:
//      - Uses the HIGHEST-confidence source for the outcome record.
//      - Marks outcome_source = 'dual_coded' when two sources have equal confidence.
//    This deduplication runs in the DB via upsert_outcome_with_source_priority.
// 7. Confidence >= 0.70: outcome automatically attributed (laid_off).
//    Confidence <  0.70: row flagged with requires_manual_review = true,
//    outcome_reported left NULL for human review.
// 8. Returns JSON stats: sessions_processed, auto_attributed, dual_coded,
//    flagged_for_review, skipped, errors.
//
// GROUND-TRUTH QUALITY CONTRACT
// ──────────────────────────────
// The calibration pipeline is only as good as these outcomes. Every rule
// in this function must be conservative: it is better to flag for manual
// review than to incorrectly auto-attribute an outcome. Incorrect
// auto-attributions corrupt the conformal CI calibration set directly.

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Source confidence thresholds ──────────────────────────────────────────────
// Defined here (not in the detector) because this is the ingestion boundary.
// The detector's values in implicitOutcomeDetector.ts must match these.
const SOURCE_CONFIDENCE = {
  warn:        0.95,  // legally mandated WARN Act filing — highest reliability
  layoffs_fyi: 0.90,  // layoffs.fyi confirmed event
  news:        0.75,  // news article — unverified, corroborative signal only
} as const;

const MANUAL_REVIEW_THRESHOLD = 0.70;
const DEFAULT_LOOKBACK_DAYS   = 365;

// ── Types ─────────────────────────────────────────────────────────────────────

interface IngestionRequest {
  lookbackDays?:           number;
  manualReviewThreshold?:  number;
  dryRun?:                 boolean; // true = compute candidates but don't write
}

interface WarnRow {
  id: string;
  company_name: string;
  filed_date: string;
  layoff_date: string | null;
  affected_count: number | null;
}

interface NewsEventRow {
  id: string;
  company_name: string;
  event_date: string;
  source: string;           // 'layoffs_fyi' | 'RSS' | 'HN' | etc.
  confidence: string;       // 'high' | 'medium' | 'low'
  percent_cut: number | null;
  affected_count: number | null;
}

interface UnconfirmedSession {
  id: string;
  user_id: string;
  audit_session_id: string;
  company_name: string;
  audit_date: string;
  predicted_score: number;
  predicted_risk_tier: string;
  predicted_cohort: string | null;
  predicted_archetype: string | null;
}

interface IngestionCandidate {
  session:     UnconfirmedSession;
  source:      'implicit_warn' | 'implicit_layoffsfyi' | 'implicit_news';
  confidence:  number;
  eventDate:   string;
  evidence:    Record<string, unknown>;
}

interface IngestionStats {
  run_id:              string;
  sessions_loaded:     number;
  sessions_processed:  number;
  auto_attributed:     number;
  dual_coded:          number;
  flagged_for_review:  number;
  skipped:             number;
  no_session:          number;
  errors:              string[];
}

// ── Fuzzy company name matching ────────────────────────────────────────────────
// Mirrors the logic in implicitOutcomeDetector.ts. Edge Functions cannot import
// from the src/ directory, so this is a local copy.

function normalizeCompanyName(name: string): string {
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

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const lenDiff = Math.abs(na.length - nb.length);
  const firstFiveMatch = na.slice(0, 5) === nb.slice(0, 5) && na.length >= 5 && nb.length >= 5;
  return lenDiff < 3 && firstFiveMatch;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const runId    = crypto.randomUUID();
  const runStart = new Date();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db          = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const body: IngestionRequest = req.method === 'POST'
    ? await req.json().catch(() => ({}))
    : {};

  const lookbackDays          = body.lookbackDays          ?? DEFAULT_LOOKBACK_DAYS;
  const manualReviewThreshold = body.manualReviewThreshold ?? MANUAL_REVIEW_THRESHOLD;
  const dryRun                = body.dryRun                ?? false;

  const stats: IngestionStats = {
    run_id:             runId,
    sessions_loaded:    0,
    sessions_processed: 0,
    auto_attributed:    0,
    dual_coded:         0,
    flagged_for_review: 0,
    skipped:            0,
    no_session:         0,
    errors:             [],
  };

  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  const sinceStr = since.toISOString().slice(0, 10);

  // ── Step 1: Load WARN Act filings ─────────────────────────────────────────
  const { data: warnRows, error: warnErr } = await db
    .from('warn_filings')
    .select('id, company_name, filed_date, layoff_date, affected_count')
    .gte('filed_date', sinceStr)
    .limit(10000);

  if (warnErr) {
    stats.errors.push(`warn_filings fetch: ${warnErr.message}`);
  }
  const warnFilings: WarnRow[] = (warnRows ?? []) as WarnRow[];

  // ── Step 2: Load breaking_news_events ────────────────────────────────────
  // We classify events by their source field:
  //   source contains 'layoffs_fyi' or confidence = 'high' → layoffs.fyi tier
  //   source contains 'news' or RSS/HN                     → news tier
  const { data: newsRows, error: newsErr } = await db
    .from('breaking_news_events')
    .select('id, company_name, event_date, source, confidence, percent_cut, affected_count')
    .gte('event_date', sinceStr)
    .limit(10000);

  if (newsErr) {
    stats.errors.push(`breaking_news_events fetch: ${newsErr.message}`);
  }
  const newsEvents: NewsEventRow[] = (newsRows ?? []) as NewsEventRow[];

  // ── Step 3: Load unconfirmed audit sessions ───────────────────────────────
  // Only process opted-in sessions with no outcome yet and not already flagged.
  const { data: sessionRows, error: sessErr } = await db
    .from('user_prediction_outcomes')
    .select(
      'id, user_id, audit_session_id, company_name, audit_date, ' +
      'predicted_score, predicted_risk_tier, predicted_cohort, predicted_archetype',
    )
    .is('outcome_reported', null)
    .eq('opted_into_community', true)
    .eq('requires_manual_review', false)
    .gte('audit_date', sinceStr)
    .limit(50000);

  if (sessErr) {
    stats.errors.push(`sessions fetch: ${sessErr.message}`);
  }
  const sessions: UnconfirmedSession[] = (sessionRows ?? []) as UnconfirmedSession[];
  stats.sessions_loaded = sessions.length;

  // ── Step 4: Build ingestion candidates ───────────────────────────────────
  // For each unconfirmed session, find all matching post-audit events.
  // Multiple candidates per session → deduplication happens in the DB function.

  const candidates: IngestionCandidate[] = [];

  for (const session of sessions) {
    const auditDate = session.audit_date.slice(0, 10);

    // WARN matches
    for (const filing of warnFilings) {
      const eventDate = filing.filed_date;
      if (eventDate <= auditDate) continue;              // must be post-audit
      if (!fuzzyMatch(session.company_name, filing.company_name)) continue;
      candidates.push({
        session,
        source:    'implicit_warn',
        confidence: SOURCE_CONFIDENCE.warn,
        eventDate,
        evidence: {
          source:        'implicit_warn',
          confidence:    SOURCE_CONFIDENCE.warn,
          event_date:    eventDate,
          event_company: filing.company_name,
          affected_count: filing.affected_count,
          warn_id:       filing.id,
          notes:         `WARN Act filing ${filing.filed_date}` +
                         (filing.layoff_date ? `, layoff date ${filing.layoff_date}` : ''),
        },
      });
    }

    // News / layoffs.fyi matches
    for (const event of newsEvents) {
      const eventDate = event.event_date;
      if (eventDate <= auditDate) continue;              // must be post-audit
      if (!fuzzyMatch(session.company_name, event.company_name)) continue;

      // Classify the source tier
      const isLayoffsFyi =
        event.source.toLowerCase().includes('layoffs_fyi') ||
        event.source.toLowerCase().includes('layoffsfyi') ||
        event.confidence === 'high';

      const source: IngestionCandidate['source'] = isLayoffsFyi
        ? 'implicit_layoffsfyi'
        : 'implicit_news';
      const confidence = isLayoffsFyi
        ? SOURCE_CONFIDENCE.layoffs_fyi
        : SOURCE_CONFIDENCE.news;

      candidates.push({
        session,
        source,
        confidence,
        eventDate,
        evidence: {
          source,
          confidence,
          event_date:    eventDate,
          event_company: event.company_name,
          percent_cut:   event.percent_cut,
          affected_count: event.affected_count,
          news_source:   event.source,
          notes:         `${event.source} event ${event.event_date}`,
        },
      });
    }
  }

  // ── Step 5: Group candidates by session and select best per session ───────
  // When multiple sources match the same session, we call the DB function for
  // EACH candidate — the DB function atomically applies source-priority rules
  // (higher confidence wins; equal confidence → dual_coded).
  // We sort candidates: WARN first, then layoffs.fyi, then news, so the first
  // write establishes the base and subsequent writes may upgrade to dual_coded.

  const SOURCE_ORDER = ['implicit_warn', 'implicit_layoffsfyi', 'implicit_news'];
  candidates.sort((a, b) =>
    SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source)
  );

  const processedSessions = new Set<string>();

  for (const c of candidates) {
    const sessionKey = `${c.session.user_id}:${c.session.audit_session_id}`;
    stats.sessions_processed++;
    processedSessions.add(sessionKey);

    if (dryRun) {
      // Dry-run: count only — no DB writes
      if (c.confidence >= manualReviewThreshold) stats.auto_attributed++;
      else stats.flagged_for_review++;
      continue;
    }

    try {
      const { data: rpcResult, error: rpcErr } = await db.rpc(
        'upsert_outcome_with_source_priority',
        {
          p_user_id:              c.session.user_id,
          p_audit_session_id:     c.session.audit_session_id,
          p_outcome_source:       c.source,
          p_outcome_reported:     c.confidence >= manualReviewThreshold ? 'laid_off' : null,
          p_outcome_date:         new Date(c.eventDate).toISOString(),
          p_detection_confidence: c.confidence,
          p_detection_evidence:   c.evidence,
          p_ingestion_run_id:     runId,
          p_manual_review_threshold: manualReviewThreshold,
        },
      );

      if (rpcErr) {
        stats.errors.push(`session ${c.session.audit_session_id}: ${rpcErr.message}`);
        continue;
      }

      const result = rpcResult as { action: string } | null;
      switch (result?.action) {
        case 'inserted':
        case 'updated':
          stats.auto_attributed++;
          break;
        case 'flagged':
          stats.flagged_for_review++;
          break;
        case 'dual_coded':
          stats.dual_coded++;
          break;
        case 'skipped':
          stats.skipped++;
          break;
        case 'no_session':
          stats.no_session++;
          break;
        default:
          stats.skipped++;
      }
    } catch (e) {
      stats.errors.push(`session ${c.session.audit_session_id}: ${String(e)}`);
    }
  }

  const elapsed = Date.now() - runStart.getTime();

  return new Response(
    JSON.stringify({
      ok:     true,
      run_id: runId,
      elapsed_ms: elapsed,
      dry_run:    dryRun,
      stats,
      thresholds: {
        warn_confidence:        SOURCE_CONFIDENCE.warn,
        layoffs_fyi_confidence: SOURCE_CONFIDENCE.layoffs_fyi,
        news_confidence:        SOURCE_CONFIDENCE.news,
        manual_review_below:    manualReviewThreshold,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
