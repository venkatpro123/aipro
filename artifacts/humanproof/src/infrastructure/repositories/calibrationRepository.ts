// calibrationRepository.ts — DEBT-3
//
// All access to engine_calibration_versions + engine_drift_alerts +
// coverage_measurements.

import { BaseRepository, RepositoryError } from './baseRepository';

export type VersionStatus = 'pending' | 'active' | 'superseded' | 'rejected';

export interface CalibrationVersionRow {
  id: number;
  version: string;
  cohort_scope: string;
  status: VersionStatus;
  l1_multiplier: number;
  l2_multiplier: number;
  l3_multiplier: number;
  l4_multiplier: number;
  l5_multiplier: number;
  auc_distress: number | null;
  auc_efficiency: number | null;
  auc_wave: number | null;
  auc_combined: number | null;
  brier_combined: number | null;
  coverage_at_90: number | null;
  coverage_at_80: number | null;
  coverage_at_50: number | null;
  n_events_total: number;
  drift_reason: string | null;
  prior_version_id: number | null;
  created_at: string;
  activated_at: string | null;
}

export interface DriftAlertRow {
  id: number;
  version_id: number | null;
  cohort_scope: string;
  alert_kind: string;
  metric_name: string;
  prior_value: number | null;
  candidate_value: number | null;
  delta: number | null;
  status: string;
  detail: { reason?: string } | null;
  created_at: string;
}

export interface CoverageMeasurementRow {
  cohort_scope: string;
  nominal_coverage: number;
  empirical_coverage: number;
  coverage_ci_low: number | null;
  coverage_ci_high: number | null;
  sample_size: number;
  delta_from_nominal: number;
  is_misaligned: boolean;
  measured_at: string;
}

export class CalibrationRepository extends BaseRepository {
  constructor() {
    super({ serviceName: 'calibration-repository' });
  }

  /** Latest active version per scope — keyed by cohort_scope. */
  async getActiveVersions(): Promise<Map<string, CalibrationVersionRow>> {
    const rows =
      (await this.runQuery<CalibrationVersionRow[]>('getActiveVersions', async () => {
        const res = await this.client
          .from('engine_calibration_versions')
          .select('*')
          .eq('status', 'active');
        return res as { data: CalibrationVersionRow[] | null; error: { code?: string; message: string } | null };
      })) ?? [];
    const out = new Map<string, CalibrationVersionRow>();
    for (const r of rows) out.set(r.cohort_scope, r);
    return out;
  }

  /** List versions ordered by recency. Used by the admin panel. */
  async listRecentVersions(limit = 50): Promise<CalibrationVersionRow[]> {
    return (
      (await this.runQuery<CalibrationVersionRow[]>('listRecentVersions', async () => {
        const res = await this.client
          .from('engine_calibration_versions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        return res as { data: CalibrationVersionRow[] | null; error: { code?: string; message: string } | null };
      })) ?? []
    );
  }

  /**
   * Atomically promote a pending version to active by demoting the
   * currently-active row to 'superseded' first.
   *
   * NOTE: two UPDATE statements without a SQL transaction wrapper. The
   * uq_ecv_active_per_scope partial unique index ensures the demote
   * MUST land before the promote. If a race occurs the second UPDATE
   * fails with code='conflict' and the caller retries.
   */
  async promoteVersion(opts: { versionId: number; reason: string; actorUserId?: string }): Promise<void> {
    if (!opts.reason?.trim()) {
      throw new RepositoryError('promotion reason is required', 'validation');
    }
    const target = await this.runQuery<CalibrationVersionRow>('promoteVersion.read', async () => {
      const res = await this.client
        .from('engine_calibration_versions')
        .select('id,cohort_scope,status')
        .eq('id', opts.versionId)
        .maybeSingle();
      return res as { data: CalibrationVersionRow | null; error: { code?: string; message: string } | null };
    });
    if (!target) throw new RepositoryError(`version ${opts.versionId} not found`, 'not_found');
    if (target.status === 'active') {
      this.log.info('promoteVersion.noop', { versionId: opts.versionId, scope: target.cohort_scope });
      return;
    }

    // Demote current active.
    await this.runQuery('promoteVersion.demote', async () => {
      const res = await this.client
        .from('engine_calibration_versions')
        .update({ status: 'superseded' })
        .eq('cohort_scope', target.cohort_scope)
        .eq('status', 'active');
      return res as { data: null; error: { code?: string; message: string } | null };
    });

    // Promote target.
    await this.runQuery('promoteVersion.activate', async () => {
      const res = await this.client
        .from('engine_calibration_versions')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          activated_by: opts.actorUserId ?? null,
          activation_reason: opts.reason,
        })
        .eq('id', opts.versionId);
      return res as { data: null; error: { code?: string; message: string } | null };
    });
  }

  async rejectVersion(opts: { versionId: number; reason: string }): Promise<void> {
    if (!opts.reason?.trim()) {
      throw new RepositoryError('rejection reason is required', 'validation');
    }
    await this.runQuery('rejectVersion', async () => {
      const res = await this.client
        .from('engine_calibration_versions')
        .update({ status: 'rejected', activation_reason: opts.reason })
        .eq('id', opts.versionId);
      return res as { data: null; error: { code?: string; message: string } | null };
    });
  }

  async listOpenDriftAlerts(limit = 50): Promise<DriftAlertRow[]> {
    return (
      (await this.runQuery<DriftAlertRow[]>('listOpenDriftAlerts', async () => {
        const res = await this.client
          .from('engine_drift_alerts')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(limit);
        return res as { data: DriftAlertRow[] | null; error: { code?: string; message: string } | null };
      })) ?? []
    );
  }

  async getLatestCoverageMeasurements(): Promise<CoverageMeasurementRow[]> {
    return (
      (await this.runQuery<CoverageMeasurementRow[]>('getLatestCoverageMeasurements', async () => {
        const res = await this.client.from('coverage_measurements_latest').select('*').limit(100);
        return res as { data: CoverageMeasurementRow[] | null; error: { code?: string; message: string } | null };
      })) ?? []
    );
  }
}

let _instance: CalibrationRepository | null = null;
export function calibrationRepo(): CalibrationRepository {
  if (!_instance) _instance = new CalibrationRepository();
  return _instance;
}
export function __resetCalibrationRepoForTesting(): void {
  _instance = null;
}
