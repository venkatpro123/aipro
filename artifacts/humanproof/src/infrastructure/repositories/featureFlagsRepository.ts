// featureFlagsRepository.ts — DEBT-3
//
// Centralises engine_feature_flags + engine_feature_flag_history access.
// Powers the CalibrationPanel admin UI's promotion / rejection actions.

import { BaseRepository, RepositoryError } from './baseRepository';

export type FlagMode = 'off' | 'shadow' | 'canary' | 'production' | 'deprecated';

export interface FeatureFlagRow {
  flag_key: string;
  mode: FlagMode;
  canary_user_ids: string[];
  canary_pct: number;
  description: string;
  workstream: string;
  config: Record<string, unknown>;
  last_changed_at: string;
}

export class FeatureFlagsRepository extends BaseRepository {
  constructor() {
    super({ serviceName: 'feature-flags-repository' });
  }

  /** Load every flag. Used by the in-memory snapshot built at boot. */
  async loadAll(): Promise<FeatureFlagRow[]> {
    return (
      (await this.runQuery<FeatureFlagRow[]>('loadAll', async () => {
        const res = await this.client
          .from('engine_feature_flags')
          .select('flag_key,mode,canary_user_ids,canary_pct,description,workstream,config,last_changed_at');
        return res as { data: FeatureFlagRow[] | null; error: { code?: string; message: string } | null };
      })) ?? []
    );
  }

  /**
   * Promote a flag, optionally with canary scope.
   * Always writes the audit-trail reason; the trigger auto-creates a
   * history row.
   */
  async promote(opts: {
    flagKey: string;
    targetMode: FlagMode;
    reason: string;
    canaryPct?: number;
    canaryUserIds?: string[];
    actorUserId?: string;
    backtestEvidence?: Record<string, unknown>;
  }): Promise<void> {
    if (!opts.reason?.trim()) {
      throw new RepositoryError('promotion reason is required', 'validation');
    }
    await this.runQuery<FeatureFlagRow>('promote', async () => {
      const res = await this.client
        .from('engine_feature_flags')
        .update({
          mode: opts.targetMode,
          canary_pct: opts.canaryPct ?? 0,
          canary_user_ids: opts.canaryUserIds ?? [],
          last_changed_by: opts.actorUserId ?? null,
          last_changed_reason: opts.reason,
        })
        .eq('flag_key', opts.flagKey)
        .select('*')
        .maybeSingle();
      return res as { data: FeatureFlagRow | null; error: { code?: string; message: string } | null };
    });
  }

  /** Reject a flag. Marks mode='deprecated' so historical rows still resolve. */
  async reject(opts: { flagKey: string; reason: string; actorUserId?: string }): Promise<void> {
    return this.promote({
      flagKey: opts.flagKey,
      targetMode: 'deprecated',
      reason: opts.reason,
      actorUserId: opts.actorUserId,
    });
  }
}

let _instance: FeatureFlagsRepository | null = null;
export function featureFlagsRepo(): FeatureFlagsRepository {
  if (!_instance) _instance = new FeatureFlagsRepository();
  return _instance;
}
export function __resetFeatureFlagsRepoForTesting(): void {
  _instance = null;
}
