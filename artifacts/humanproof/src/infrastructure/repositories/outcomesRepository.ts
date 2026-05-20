// outcomesRepository.ts — DEBT-3 (the most-touched table)
//
// All access to user_prediction_outcomes goes through this class. The
// table is consumed by:
//   * outcomeBacktestRunner.runBacktest()      (calibration metrics)
//   * conformalCI.computeConformalCI()         (quantile calibration set)
//   * indiaCalibration.runIndiaBacktest()
//   * outcomeService.recordUserOutcome()       (UI prompt response)
//   * recalibrate-engine cron                  (weekly retraining)
//
// Centralising these queries here makes schema migrations safe:
//   * Adding a column → update the OutcomeRow type, expose new method.
//   * Renaming a column → ONE call site to change.
//   * Switching DBs → swap the class implementation; callers unchanged.

import { BaseRepository, RepositoryError } from './baseRepository';

// ── Types ───────────────────────────────────────────────────────────────────

export type OutcomeLabel =
  | 'still_employed'
  | 'role_changed'
  | 'left_voluntarily'
  | 'laid_off'
  | 'company_closed'
  | 'false_alarm';

export type OutcomeSource =
  | 'user_reported'
  | 'implicit_warn'
  | 'implicit_layoffsfyi'
  | 'implicit_news'
  | 'dual_coded';

export interface OutcomeRow {
  id: string;
  user_id: string;
  audit_session_id: string | null;
  company_name: string;
  role_title: string | null;
  predicted_risk_tier: string;
  predicted_score: number;
  audit_date: string;
  outcome_reported: OutcomeLabel | null;
  outcome_date: string | null;
  outcome_source: OutcomeSource | null;
  detection_confidence: number | null;
  detected_at: string | null;
  predicted_cohort: string | null;
  predicted_archetype: string | null;
  /** JSON array of all source signals that triggered this detection (audit trail). */
  detection_evidence: Record<string, unknown> | null;
  /**
   * true when confidence < 0.70 — outcome was NOT auto-attributed.
   * Human reviewer must confirm or reject before the row is used in calibration.
   */
  requires_manual_review: boolean;
  /** Why this row was flagged (e.g. "news confidence 0.65 < threshold 0.70"). */
  review_reason: string | null;
  /** UUID of the ingestion cron run that wrote or last updated this row. */
  ingestion_run_id: string | null;
}

export interface BacktestQuery {
  /** Lookback window (days). Default 365. */
  windowDays?: number;
  /** Floor on detection_confidence. Default 0.75. */
  minConfidence?: number;
  /** Restrict by cohort. 'ALL' returns everything. */
  cohort?: 'ALL' | 'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'UNKNOWN';
  /** Cap on rows returned. Default 5000. */
  maxRows?: number;
  /** Optional company name filter (case-insensitive ilike). */
  companyName?: string;
}

export interface ImplicitDetection {
  user_id: string;
  audit_session_id: string;
  company_name: string;
  role_title: string | null;
  predicted_risk_tier: string;
  predicted_score: number;
  audit_date: string;
  outcome_source: Exclude<OutcomeSource, 'user_reported' | 'dual_coded'>;
  outcome_date: string;
  detection_confidence: number;
  detection_evidence: Record<string, unknown>;
}

export interface SourcePriorityUpsertArgs {
  user_id: string;
  audit_session_id: string;
  outcome_source: Exclude<OutcomeSource, 'user_reported'>;
  outcome_reported: string | null;   // null when flagging for manual review
  outcome_date: string;
  detection_confidence: number;
  detection_evidence: Record<string, unknown>;
  ingestion_run_id: string;
  manual_review_threshold?: number;  // defaults to 0.70
}

export interface SourcePriorityUpsertResult {
  action: 'inserted' | 'updated' | 'dual_coded' | 'skipped' | 'flagged' | 'no_session';
  id: string;
  reason?: string;
  requires_manual_review?: boolean;
}

// ── Repository ──────────────────────────────────────────────────────────────

export class OutcomesRepository extends BaseRepository {
  constructor() {
    super({ serviceName: 'outcomes-repository' });
  }

  /**
   * Load confirmed outcomes for backtest / calibration.
   *
   * Confidence gate is applied SERVER-SIDE where possible and CLIENT-SIDE
   * for legacy rows where detection_confidence is null (those are
   * user_reported events with implicit confidence 1.0 but the column
   * may not be populated for pre-WS2 rows).
   */
  async loadConfirmedOutcomes(opts: BacktestQuery = {}): Promise<OutcomeRow[]> {
    const windowDays = opts.windowDays ?? 365;
    const minConfidence = opts.minConfidence ?? 0.75;
    const cohort = opts.cohort ?? 'ALL';
    const maxRows = opts.maxRows ?? 5000;

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - windowDays);

    return (
      (await this.runQuery<OutcomeRow[]>('loadConfirmedOutcomes', async () => {
        let q = this.client
          .from('user_prediction_outcomes')
          .select(
            'id,user_id,audit_session_id,company_name,role_title,predicted_risk_tier,' +
              'predicted_score,audit_date,outcome_reported,outcome_date,outcome_source,' +
              'detection_confidence,detected_at,predicted_cohort,predicted_archetype,' +
              'detection_evidence,requires_manual_review,review_reason,ingestion_run_id',
          )
          .not('outcome_reported', 'is', null)
          // Never include rows still pending manual review — they haven't been
          // confirmed yet and would inject unvalidated outcomes into calibration.
          .eq('requires_manual_review', false)
          .gte('audit_date', since.toISOString().slice(0, 10))
          .order('audit_date', { ascending: false })
          .limit(maxRows);

        if (cohort !== 'ALL') q = q.eq('predicted_cohort', cohort);
        if (opts.companyName) q = q.ilike('company_name', `%${opts.companyName}%`);

        const res = await q;
        // Filter confidence client-side because legacy user_reported rows
        // may have null confidence.
        const rows = ((res.data ?? []) as unknown as OutcomeRow[]).filter((r) => {
          const c = r.detection_confidence ?? (r.outcome_source === 'user_reported' ? 1.0 : 0);
          return c >= minConfidence;
        });
        return { data: rows, error: res.error };
      })) ?? []
    );
  }

  /**
   * Find the user's unconfirmed audit row for outcome promotion.
   * Returns null when no matching unconfirmed row exists.
   */
  async findUnconfirmedAuditSession(opts: { userId: string; auditSessionId: string }): Promise<OutcomeRow | null> {
    return this.runQuery<OutcomeRow>('findUnconfirmedAuditSession', async () => {
      const res = await this.client
        .from('user_prediction_outcomes')
        .select('*')
        .eq('user_id', opts.userId)
        .eq('audit_session_id', opts.auditSessionId)
        .is('outcome_reported', null)
        .maybeSingle();
      return res as { data: OutcomeRow | null; error: { code?: string; message: string } | null };
    });
  }

  /**
   * Promote a user-reported outcome on an existing unconfirmed row.
   * Idempotent — if the row already has outcome_reported set, this
   * raises a RepositoryError(code='conflict').
   */
  async recordUserOutcome(opts: {
    userId: string;
    auditSessionId: string;
    outcome: OutcomeLabel;
    outcomeDate: string;
    promptMilestone?: 30 | 90 | 180;
    notes?: string;
  }): Promise<void> {
    const existing = await this.findUnconfirmedAuditSession({
      userId: opts.userId,
      auditSessionId: opts.auditSessionId,
    });
    if (!existing) {
      throw new RepositoryError(
        `no unconfirmed audit found for session ${opts.auditSessionId}`,
        'not_found',
      );
    }
    await this.runQuery<OutcomeRow>('recordUserOutcome', async () => {
      const res = await this.client
        .from('user_prediction_outcomes')
        .update({
          outcome_reported: opts.outcome,
          outcome_date: opts.outcomeDate,
          outcome_source: 'user_reported',
          detection_confidence: 1.0,
          detected_at: new Date().toISOString(),
          prompt_milestone: opts.promptMilestone ?? null,
          outcome_notes: opts.notes ?? null,
        })
        .eq('id', existing.id)
        .eq('user_id', opts.userId)
        .is('outcome_reported', null) // optimistic lock
        .select('*')
        .maybeSingle();
      return res as { data: OutcomeRow | null; error: { code?: string; message: string } | null };
    });
  }

  /**
   * Bulk insert implicit detections. Uses the
   * (user_id, audit_session_id, outcome_source) UNIQUE constraint for
   * idempotent re-runs.
   */
  async insertImplicitDetections(rows: ImplicitDetection[]): Promise<number> {
    if (rows.length === 0) return 0;
    const payload = rows.map((d) => ({
      ...d,
      outcome_reported: 'laid_off' as const,
      outcome_notes: 'inserted by outcome-ingestion edge function',
      detected_at: new Date().toISOString(),
    }));
    const result = await this.runQueryWithCount<{ id: string }>('insertImplicitDetections', async () => {
      const res = await this.client
        .from('user_prediction_outcomes')
        .upsert(payload, {
          onConflict: 'user_id,audit_session_id,outcome_source',
          ignoreDuplicates: true,
          count: 'exact',
        })
        .select('id');
      return res as { data: { id: string }[] | null; count: number | null; error: { code?: string; message: string } | null };
    });
    return result.count;
  }

  /**
   * Upsert a single outcome candidate using source-priority rules.
   *
   * Calls the upsert_outcome_with_source_priority Postgres function which:
   *   - Never overwrites user_reported outcomes.
   *   - Higher confidence wins over lower confidence.
   *   - Equal confidence from a different source → dual_coded.
   *   - confidence < manualReviewThreshold → requires_manual_review = true,
   *     outcome_reported left NULL (not auto-attributed).
   *
   * Returns the action taken and the affected row id.
   */
  async upsertWithSourcePriority(
    args: SourcePriorityUpsertArgs,
  ): Promise<SourcePriorityUpsertResult> {
    const result = await this.runQuery<SourcePriorityUpsertResult>(
      'upsertWithSourcePriority',
      async () => {
        const res = await this.client.rpc('upsert_outcome_with_source_priority', {
          p_user_id:               args.user_id,
          p_audit_session_id:      args.audit_session_id,
          p_outcome_source:        args.outcome_source,
          p_outcome_reported:      args.outcome_reported,
          p_outcome_date:          args.outcome_date,
          p_detection_confidence:  args.detection_confidence,
          p_detection_evidence:    args.detection_evidence,
          p_ingestion_run_id:      args.ingestion_run_id,
          p_manual_review_threshold: args.manual_review_threshold ?? 0.70,
        });
        return res as { data: SourcePriorityUpsertResult | null; error: { code?: string; message: string } | null };
      },
    );
    return result ?? { action: 'skipped', id: '' };
  }

  /**
   * Load rows pending manual review (confidence < 0.70).
   * These are sessions where a weak signal was detected but not auto-attributed.
   * A human reviewer must either confirm (set outcome_reported) or reject
   * (clear requires_manual_review + set outcome_reported = null to re-open).
   */
  async loadPendingManualReview(
    opts: { windowDays?: number; maxRows?: number } = {},
  ): Promise<OutcomeRow[]> {
    const windowDays = opts.windowDays ?? 90;
    const maxRows    = opts.maxRows    ?? 500;
    const since      = new Date();
    since.setUTCDate(since.getUTCDate() - windowDays);

    return (
      (await this.runQuery<OutcomeRow[]>('loadPendingManualReview', async () => {
        const res = await this.client
          .from('user_prediction_outcomes')
          .select(
            'id,user_id,audit_session_id,company_name,role_title,predicted_risk_tier,' +
              'predicted_score,audit_date,outcome_source,detection_confidence,' +
              'review_reason,detection_evidence,detected_at,ingestion_run_id',
          )
          .eq('requires_manual_review', true)
          .is('outcome_reported', null)
          .gte('audit_date', since.toISOString().slice(0, 10))
          .order('detected_at', { ascending: false })
          .limit(maxRows);
        return res as { data: OutcomeRow[] | null; error: { code?: string; message: string } | null };
      })) ?? []
    );
  }

  /** Source-mix breakdown for the selection-bias report. */
  async outcomeSourceBreakdown(opts: { windowDays?: number } = {}): Promise<Record<string, number>> {
    const windowDays = opts.windowDays ?? 90;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - windowDays);
    const rows = (await this.runQuery<Array<{ outcome_source: string | null }>>('outcomeSourceBreakdown', async () => {
      const res = await this.client
        .from('user_prediction_outcomes')
        .select('outcome_source')
        .not('outcome_reported', 'is', null)
        .gte('audit_date', since.toISOString().slice(0, 10))
        .limit(5000);
      return res as { data: Array<{ outcome_source: string | null }> | null; error: { code?: string; message: string } | null };
    })) ?? [];
    const breakdown: Record<string, number> = {};
    for (const r of rows) {
      const k = r.outcome_source ?? 'unknown';
      breakdown[k] = (breakdown[k] ?? 0) + 1;
    }
    return breakdown;
  }
}

// ── Singleton accessor ──────────────────────────────────────────────────────

let _instance: OutcomesRepository | null = null;
export function outcomesRepo(): OutcomesRepository {
  if (!_instance) _instance = new OutcomesRepository();
  return _instance;
}

/** Test-only reset. */
export function __resetOutcomesRepoForTesting(): void {
  _instance = null;
}
