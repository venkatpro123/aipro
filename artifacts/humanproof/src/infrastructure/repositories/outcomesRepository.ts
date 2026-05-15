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
              'detection_confidence,detected_at,predicted_cohort,predicted_archetype',
          )
          .not('outcome_reported', 'is', null)
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
