// outcomeIngestionService.ts
//
// Pure-TypeScript business logic for the outcome-ingestion pipeline.
// No network calls, no Supabase client — callers supply the data.
// This makes it testable without a live DB.
//
// The Edge Function (supabase/functions/outcome-ingestion/index.ts) is the
// cron-entry-point: it fetches data from Supabase and calls runIngestion().
//
// CONFIDENCE THRESHOLDS (spec):
//   WARN Act filing       → 0.95  (legally mandated, highest reliability)
//   layoffs.fyi confirmed → 0.90  (curated database, manually reviewed)
//   news article          → 0.75  (unverified, corroborative signal only)
//
// Outcomes below MANUAL_REVIEW_THRESHOLD (0.70) are flagged for human review
// and never auto-attributed. An incorrectly auto-attributed outcome corrupts
// the conformal CI calibration set — conservative is always better here.

import { detectImplicitOutcome, fuzzyMatchCompanyName, type LayoffEventRef } from './implicitOutcomeDetector';
import type { ImplicitDetection } from '../infrastructure/repositories/outcomesRepository';

// ── Source confidence constants ───────────────────────────────────────────────
// Exported so callers can reference the same values without magic numbers.
export const SOURCE_CONFIDENCE = {
  warn:        0.95,
  layoffs_fyi: 0.90,
  news:        0.75,
} as const;

export const MANUAL_REVIEW_THRESHOLD = 0.70;

// ── Input types ───────────────────────────────────────────────────────────────

export interface WarnFiling {
  id: string;
  company_name: string;
  filed_date: string;       // ISO date
  layoff_date: string | null;
  affected_count: number | null;
}

export interface NewsEvent {
  id: string;
  company_name: string;
  event_date: string;       // ISO date
  /** 'layoffs_fyi' | 'RSS' | 'HN' | 'IndiaPress' | etc. */
  source: string;
  /** 'high' = curated (treat as layoffs.fyi); 'medium'|'low' = news */
  confidence: 'high' | 'medium' | 'low';
  percent_cut: number | null;
  affected_count: number | null;
}

export interface UnconfirmedSession {
  id: string;
  user_id: string;
  audit_session_id: string;
  company_name: string;
  audit_date: string;       // ISO date
  predicted_score: number;
  predicted_risk_tier: string;
  predicted_cohort: string | null;
  predicted_archetype: string | null;
}

// ── Output types ──────────────────────────────────────────────────────────────

export type IngestionAction =
  | 'auto_attributed'   // outcome written, confidence >= threshold
  | 'flagged'           // confidence < threshold, row marked for manual review
  | 'dual_coded'        // two equal-confidence sources agreed
  | 'skipped';          // no post-audit events matched

export interface IngestionCandidate {
  session:    UnconfirmedSession;
  /** Best source from all signals that matched (highest confidence wins). */
  source:     ImplicitDetection['outcome_source'];
  confidence: number;
  eventDate:  string;
  /** All sources that matched — needed for dual_coded detection. */
  allSources: Array<{ source: ImplicitDetection['outcome_source']; confidence: number; eventDate: string }>;
  action:     IngestionAction;
  /** JSON evidence object for detection_evidence column. */
  evidence:   Record<string, unknown>;
}

export interface IngestionResult {
  candidates:        IngestionCandidate[];
  autoAttributed:    number;
  dualCoded:         number;
  flaggedForReview:  number;
  skipped:           number;
  sessionCount:      number;
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

/**
 * Determine whether a news event is classified as layoffs.fyi tier
 * (confidence 0.90) versus generic news tier (confidence 0.75).
 */
function classifyNewsSource(event: NewsEvent): {
  source: 'implicit_layoffsfyi' | 'implicit_news';
  confidence: number;
} {
  const srcLower = event.source.toLowerCase();
  const isLayoffsFyi =
    srcLower.includes('layoffs_fyi') ||
    srcLower.includes('layoffsfyi') ||
    event.confidence === 'high';        // 'high' = legally filed / curated

  return isLayoffsFyi
    ? { source: 'implicit_layoffsfyi', confidence: SOURCE_CONFIDENCE.layoffs_fyi }
    : { source: 'implicit_news',       confidence: SOURCE_CONFIDENCE.news };
}

/**
 * Build a LayoffEventRef[] from all raw source data.
 * Used as input to detectImplicitOutcome when reusing the detector logic.
 */
export function buildLayoffEventRefs(
  warnFilings: WarnFiling[],
  newsEvents:  NewsEvent[],
): LayoffEventRef[] {
  const refs: LayoffEventRef[] = [];

  for (const f of warnFilings) {
    refs.push({
      companyName:     f.company_name,
      eventDate:       f.filed_date,
      confirmedSource: 'warn',
      affectedCount:   f.affected_count,
      percentCut:      null,
    });
  }

  for (const e of newsEvents) {
    const { source: srcType } = classifyNewsSource(e);
    refs.push({
      companyName:     e.company_name,
      eventDate:       e.event_date,
      confirmedSource: srcType === 'implicit_layoffsfyi' ? 'layoffs_fyi' : 'news_cache',
      affectedCount:   e.affected_count,
      percentCut:      e.percent_cut,
    });
  }

  return refs;
}

// ── Core ingestion logic ──────────────────────────────────────────────────────

/**
 * Determine the ingestion action and best-source for a single session.
 *
 * Multi-source deduplication rules:
 *   1. Higher confidence wins (WARN=0.95 > lfyi=0.90 > news=0.75).
 *   2. Two equal-confidence sources agree → dual_coded.
 *   3. confidence >= 0.70 → auto_attributed.
 *   4. confidence <  0.70 → flagged (manual review).
 *   5. No matching event  → skipped.
 */
export function computeIngestionCandidate(
  session:     UnconfirmedSession,
  warnFilings: WarnFiling[],
  newsEvents:  NewsEvent[],
  now:         Date = new Date(),
): IngestionCandidate | null {
  const auditDate = session.audit_date.slice(0, 10);

  // Collect all signals that match this session's company with post-audit events
  const signals: Array<{
    source:     ImplicitDetection['outcome_source'];
    confidence: number;
    eventDate:  string;
    rawEvidence: Record<string, unknown>;
  }> = [];

  for (const filing of warnFilings) {
    if (filing.filed_date <= auditDate) continue;
    if (!fuzzyMatchCompanyName(session.company_name, filing.company_name)) continue;
    signals.push({
      source:     'implicit_warn',
      confidence: SOURCE_CONFIDENCE.warn,
      eventDate:  filing.filed_date,
      rawEvidence: {
        source:        'implicit_warn',
        confidence:    SOURCE_CONFIDENCE.warn,
        event_date:    filing.filed_date,
        event_company: filing.company_name,
        affected_count: filing.affected_count,
        layoff_date:   filing.layoff_date,
        warn_id:       filing.id,
      },
    });
  }

  for (const event of newsEvents) {
    if (event.event_date <= auditDate) continue;
    if (!fuzzyMatchCompanyName(session.company_name, event.company_name)) continue;
    const { source, confidence } = classifyNewsSource(event);
    signals.push({
      source,
      confidence,
      eventDate:  event.event_date,
      rawEvidence: {
        source,
        confidence,
        event_date:    event.event_date,
        event_company: event.company_name,
        percent_cut:   event.percent_cut,
        affected_count: event.affected_count,
        news_source:   event.source,
      },
    });
  }

  if (signals.length === 0) return null; // no match → skip

  // Sort: highest confidence first; within same confidence, chronologically latest
  signals.sort((a, b) =>
    b.confidence - a.confidence || b.eventDate.localeCompare(a.eventDate),
  );

  const best = signals[0];

  // Check for dual-coding: any OTHER source with the same confidence?
  const dualSources = signals.filter(
    s => s.source !== best.source && s.confidence === best.confidence,
  );
  const isDualCoded = dualSources.length > 0;

  const effectiveSource = isDualCoded ? 'dual_coded' : best.source;

  const action: IngestionAction =
    isDualCoded                              ? 'dual_coded'
    : best.confidence >= MANUAL_REVIEW_THRESHOLD ? 'auto_attributed'
    : 'flagged';

  // Build consolidated evidence: best source + all contributing signals
  const evidence: Record<string, unknown> = {
    best_source:       best.source,
    best_confidence:   best.confidence,
    best_event_date:   best.eventDate,
    detection_date:    now.toISOString(),
    all_signals:       signals.map(s => ({
      source:     s.source,
      confidence: s.confidence,
      event_date: s.eventDate,
    })),
    ...best.rawEvidence,
  };

  return {
    session,
    source:     effectiveSource as ImplicitDetection['outcome_source'],
    confidence: best.confidence,
    eventDate:  best.eventDate,
    allSources: signals.map(s => ({ source: s.source, confidence: s.confidence, eventDate: s.eventDate })),
    action,
    evidence,
  };
}

/**
 * Process all unconfirmed sessions against known layoff events.
 *
 * This is pure computation — it returns IngestionCandidate[] for the caller
 * to persist. No DB calls are made here.
 *
 * @param sessions    Unconfirmed audit sessions from user_prediction_outcomes
 * @param warnFilings WARN Act filings from warn_filings table
 * @param newsEvents  Breaking news / layoffs.fyi from breaking_news_events
 * @param now         Reference timestamp (injectable for reproducibility)
 */
export function runIngestion(
  sessions:    UnconfirmedSession[],
  warnFilings: WarnFiling[],
  newsEvents:  NewsEvent[],
  now:         Date = new Date(),
): IngestionResult {
  const candidates: IngestionCandidate[] = [];
  let autoAttributed   = 0;
  let dualCoded        = 0;
  let flaggedForReview = 0;
  let skipped          = 0;

  for (const session of sessions) {
    const candidate = computeIngestionCandidate(session, warnFilings, newsEvents, now);
    if (!candidate) {
      skipped++;
      continue;
    }
    candidates.push(candidate);
    switch (candidate.action) {
      case 'auto_attributed': autoAttributed++;   break;
      case 'dual_coded':      dualCoded++;        break;
      case 'flagged':         flaggedForReview++;  break;
    }
  }

  return {
    candidates,
    autoAttributed,
    dualCoded,
    flaggedForReview,
    skipped,
    sessionCount: sessions.length,
  };
}

/**
 * Convert an IngestionCandidate to the ImplicitDetection shape expected
 * by outcomesRepository.insertImplicitDetections.
 *
 * Only candidates with action = 'auto_attributed' should be passed here.
 * Dual-coded and flagged candidates use upsert_outcome_with_source_priority RPC.
 */
export function candidateToImplicitDetection(
  candidate: IngestionCandidate,
): ImplicitDetection {
  return {
    user_id:            candidate.session.user_id,
    audit_session_id:   candidate.session.audit_session_id,
    company_name:       candidate.session.company_name,
    role_title:         null,
    predicted_risk_tier: candidate.session.predicted_risk_tier,
    predicted_score:    candidate.session.predicted_score,
    audit_date:         candidate.session.audit_date,
    outcome_source:     candidate.source as ImplicitDetection['outcome_source'],
    outcome_date:       candidate.eventDate,
    detection_confidence: candidate.confidence,
    detection_evidence: candidate.evidence,
  };
}
