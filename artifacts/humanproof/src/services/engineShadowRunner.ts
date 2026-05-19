// engineShadowRunner.ts — WS0
//
// Runs the legacy and candidate audit pipelines side-by-side, writes both
// outputs to audit_shadow_comparison, and returns whichever HybridResult
// the user-facing flags say should be surfaced.
//
// Design constraints (from the WS0 spec):
//   * MUST never break a user-facing audit. If the candidate pipeline throws,
//     the legacy result is returned and the failure is captured on the row.
//   * MUST NOT add user-perceptible latency. The candidate pipeline runs in
//     parallel with the legacy one via Promise.allSettled; the user sees the
//     legacy result as soon as it resolves. The shadow row write is
//     fire-and-forget (does not block return).
//   * MUST write a row even when every candidate flag is OFF. In that case
//     candidate_result is a duplicate of legacy_result, candidate_engine_version
//     matches legacy, and the score_delta is structurally zero. This is the
//     baseline "delta should be zero" sanity check.
//
// What the candidate pipeline is:
//   * For now (initial WS0 ship), the candidate pipeline is the SAME entry
//     point (`fetchAuditData`) as the legacy pipeline. Subsequent workstreams
//     (WS2..WS7) introduce divergence by reading feature flags inside specific
//     pipeline stages. The shadow runner does not need to know about
//     individual workstream changes — they all bake into the candidate
//     execution path via flag-gated branches.
//   * In the future, a fully forked candidate pipeline can be plugged in via
//     the `candidatePipeline` argument without changing this runner.

import type { AuditInputs } from './auditDataPipeline';
import { fetchAuditData, fetchAuditDataWithOfflineFallback } from './auditDataPipeline';
import type { HybridResult } from '../types/hybridResult';
import type { CompanyData } from '../data/companyDatabase';
import { supabase } from '../utils/supabase';
// WS9 + WS10 — replace silent 0.5 confidence fallback with a visible,
// versioned, telemetry-tagged value.
import { getConstant } from './calibration/calibrationConstants';
import { markFallback } from './observability/withFallback';
import {
  evaluateFlag,
  evaluateFlagSync,
  snapshotForLedger,
  primeFlags,
  type FlagMode,
} from '../config/featureFlags';
// WS6 — Tier-A two-stage pipeline runner. Used as the candidate path
// when ws6_tier_a_response is active; falls through internally to a
// single-pass when the flag is off, so unconditional use is safe.
import { runTierA, type TierAResult } from './tierAPipeline';

// ── Versioning ───────────────────────────────────────────────────────────────

/**
 * Static engine version stamped onto every shadow row. The "legacy" version
 * is the codebase version of the unmodified pipeline. The "candidate" version
 * is augmented with a `+ws#` suffix for every flag in shadow/canary/production
 * mode at run time, e.g. "v35.0+ws3+ws4".
 */
const LEGACY_ENGINE_VERSION = 'v34.0';
const CANDIDATE_ENGINE_BASE_VERSION = 'v35.0';

function buildCandidateVersion(activeFlags: Record<string, FlagMode>): string {
  const activeWS = new Set<string>();
  for (const [key, mode] of Object.entries(activeFlags)) {
    if (mode === 'off' || mode === 'deprecated') continue;
    const m = key.match(/^(ws\d+)_/);
    if (m) activeWS.add(m[1]);
  }
  if (activeWS.size === 0) return LEGACY_ENGINE_VERSION;
  const parts = Array.from(activeWS).sort();
  return `${CANDIDATE_ENGINE_BASE_VERSION}+${parts.join('+')}`;
}

// ── Fingerprinting ───────────────────────────────────────────────────────────

/**
 * Stable, deterministic fingerprint over the effective audit identity.
 * Two audits with the same (canonical company, role, department, country)
 * share a fingerprint so we can group shadow runs cross-user.
 *
 * Uses Web Crypto (SubtleCrypto) so this runs in both browser and edge.
 */
async function computeFingerprint(inputs: AuditInputs, canonical: string | undefined): Promise<string> {
  const norm = (s: string | undefined | null): string => (s ?? '').trim().toLowerCase();
  const payload = [
    norm(canonical) || norm(inputs.companyName),
    norm(inputs.roleTitle),
    norm(inputs.department),
    norm(inputs.country),
  ].join('|');

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(payload);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Last-resort polyfill: hex-encoded UTF-8. Not cryptographic but enough
  // for grouping in environments missing SubtleCrypto.
  return payload;
}

// ── Tier extraction ──────────────────────────────────────────────────────────

const TIER_LABEL_TO_BUCKET: Record<string, string> = {
  // Map heterogeneous tier labels in the engine to the 4-bucket
  // CRITICAL/HIGH/MODERATE/LOW used on audit_shadow_comparison.
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
  'Very low risk': 'LOW',
  'Low risk': 'LOW',
  'Moderate risk': 'MODERATE',
  'Elevated risk': 'HIGH',
  'High risk': 'CRITICAL',
};

function deriveTierBucket(result: HybridResult): string {
  const fromLabel = TIER_LABEL_TO_BUCKET[result.tier?.label ?? ''];
  if (fromLabel) return fromLabel;
  const s = result.total ?? 0;
  if (s >= 75) return 'CRITICAL';
  if (s >= 55) return 'HIGH';
  if (s >= 35) return 'MODERATE';
  return 'LOW';
}

function deriveConfidencePct(result: HybridResult): number {
  if (typeof result.confidencePercent === 'number') return result.confidencePercent;
  if (typeof result.confidence === 'number') return Math.round(result.confidence * 100);
  // WS10 — the legacy fallback was a silent `0.5` which is indistinguishable
  // from a genuine medium-confidence result. Record the fact (so a sudden spike
  // in this code path is visible on the SLO dashboard) and use the WS9-resolved
  // "unknownConfidence" floor — currently 0.30, intentionally LOWER than 0.5
  // so a missing-confidence audit is visibly degraded rather than masquerading
  // as a competent answer.
  const unknown = getConstant<number>('engine.fallback.unknownConfidence', 0.30);
  const fallbackValue = typeof unknown.value === 'number' ? unknown.value : 0.30;
  markFallback({
    layerId: 'engineShadowRunner.deriveConfidencePct',
    reason: 'null_input',
    fallbackValue,
    layerKind: 'intelligence_layer',
    rationale: `HybridResult missing both confidencePercent and confidence (provenance=${unknown.provenance})`,
  });
  return Math.round(fallbackValue * 100);
}

// ── Cohort / archetype extraction ────────────────────────────────────────────

function deriveCohort(result: HybridResult): string | null {
  const r = result as unknown as { cohortClassification?: { primaryCohort?: string } };
  return r.cohortClassification?.primaryCohort ?? null;
}

function deriveArchetype(result: HybridResult): string | null {
  const r = result as unknown as { _engineResult?: { archetype?: string }; archetype?: string };
  return r.archetype ?? r._engineResult?.archetype ?? null;
}

// ── Shadow row writer ────────────────────────────────────────────────────────

interface ShadowRowPayload {
  user_id: string | null;
  audit_fingerprint: string;
  audit_session_id: string | null;
  company_name: string;
  company_canonical: string | null;
  role_title: string;
  department: string;
  country: string | null;
  inputs: AuditInputs;
  legacy_result: HybridResult;
  candidate_result: HybridResult;
  legacy_score: number;
  candidate_score: number;
  score_delta: number;
  legacy_confidence_pct: number;
  candidate_confidence_pct: number;
  confidence_delta_pct: number;
  legacy_tier: string;
  candidate_tier: string;
  active_flags: Record<string, FlagMode>;
  legacy_engine_version: string;
  candidate_engine_version: string;
  cohort: string | null;
  archetype: string | null;
  legacy_duration_ms: number;
  candidate_duration_ms: number;
}

async function writeShadowRow(payload: ShadowRowPayload): Promise<void> {
  try {
    const { error } = await supabase.from('audit_shadow_comparison').insert({
      user_id: payload.user_id,
      audit_fingerprint: payload.audit_fingerprint,
      audit_session_id: payload.audit_session_id,
      company_name: payload.company_name,
      company_canonical: payload.company_canonical,
      role_title: payload.role_title,
      department: payload.department,
      country: payload.country,
      inputs: payload.inputs,
      legacy_result: payload.legacy_result,
      candidate_result: payload.candidate_result,
      legacy_score: payload.legacy_score,
      candidate_score: payload.candidate_score,
      score_delta: payload.score_delta,
      legacy_confidence_pct: payload.legacy_confidence_pct,
      candidate_confidence_pct: payload.candidate_confidence_pct,
      confidence_delta_pct: payload.confidence_delta_pct,
      legacy_tier: payload.legacy_tier,
      candidate_tier: payload.candidate_tier,
      active_flags: payload.active_flags,
      legacy_engine_version: payload.legacy_engine_version,
      candidate_engine_version: payload.candidate_engine_version,
      cohort: payload.cohort,
      archetype: payload.archetype,
      legacy_duration_ms: payload.legacy_duration_ms,
      candidate_duration_ms: payload.candidate_duration_ms,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[engineShadowRunner] shadow row insert failed:', error.message);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[engineShadowRunner] shadow row insert threw:', err);
  }
}

// ── Pipeline type ────────────────────────────────────────────────────────────

export type AuditPipeline = (inputs: AuditInputs) => Promise<{
  result: HybridResult;
  companyData: CompanyData;
  source: 'live' | 'db' | 'stale_db' | 'fallback';
}>;

// ── Public API ───────────────────────────────────────────────────────────────

export interface RunShadowOptions {
  /** Authenticated user id, if any. NULL for anonymous landing-page audits. */
  userId?: string | null;
  /** Optional audit session id to correlate with downstream telemetry. */
  auditSessionId?: string | null;
  /**
   * Override the candidate pipeline. Default is the Tier-A two-stage
   * runner when ws6_tier_a_response is on, otherwise `fetchAuditData`.
   * Pass a forked pipeline to compare against the legacy one.
   */
  candidatePipeline?: AuditPipeline;
  /**
   * If true, write the shadow row synchronously (await the insert).
   * Default false — fire-and-forget so we don't add latency.
   * Tests set this to true so assertions can read the row.
   */
  awaitShadowWrite?: boolean;
  /**
   * WS6 — callback invoked when the tier_a_upgraded payload is ready.
   * Only fires when the candidate pipeline is the Tier-A runner AND
   * `ws6_tier_a_response` is on. UI consumers (LayoffCalculator) pass
   * a handler that updates the visible score with the upgraded result.
   */
  onTierAUpgrade?: (upgraded: TierAResult) => void;
}

export interface ShadowRunResult {
  /** The result that should be shown to the user (legacy by default). */
  userFacingResult: HybridResult;
  /** The company data resolved for the user-facing result. */
  companyData: CompanyData;
  /** The data source tier (live/db/stale_db/fallback). */
  source: 'live' | 'db' | 'stale_db' | 'fallback';
  /** True when the user is being shown the CANDIDATE engine output. */
  userFacingIsCandidate: boolean;
  /** The id of the shadow row inserted (null if write failed or skipped). */
  shadowRowId: string | null;
}

/**
 * Run both engines and surface the appropriate result to the user.
 *
 * If `ws0_shadow_runner` is in mode='off', this falls through to a plain
 * `fetchAuditData` call with no shadow write — preserves the ability to
 * disable shadow mode entirely under load if needed.
 */
export async function runWithShadow(
  inputs: AuditInputs,
  options: RunShadowOptions = {},
): Promise<ShadowRunResult> {
  // Make sure flags are primed. The first call pays the snapshot fetch;
  // subsequent calls within the 60s window are no-ops.
  await primeFlags();

  const shadowFlag = await evaluateFlag('ws0_shadow_runner', options.userId ?? null);
  if (shadowFlag.mode === 'off' || shadowFlag.mode === 'deprecated') {
    // v40.0: use offline-aware wrapper so network failures return the cached result
    const out = await fetchAuditDataWithOfflineFallback(inputs);
    return {
      userFacingResult: out.result,
      companyData: out.companyData,
      source: out.source,
      userFacingIsCandidate: false,
      shadowRowId: null,
    };
  }

  const legacyPipeline: AuditPipeline = fetchAuditDataWithOfflineFallback;

  // WS6 — Candidate pipeline selection. When `ws6_tier_a_response` is on,
  // use the Tier-A two-stage runner so the user sees a fast first response
  // and the live-upgraded payload arrives via the onTierAUpgrade callback.
  const tierAFlag = evaluateFlagSync('ws6_tier_a_response', options.userId ?? null);
  const useTierA = (tierAFlag.isActive || tierAFlag.isShadow) && !options.candidatePipeline;
  const candidatePipeline: AuditPipeline = options.candidatePipeline
    ?? (useTierA
      ? async (auditInputs: AuditInputs) => {
          const out = await runTierA(auditInputs, { onUpgrade: options.onTierAUpgrade });
          return { result: out.result, companyData: out.companyData, source: out.source };
        }
      : fetchAuditData);

  const legacyStart = Date.now();
  const candidateStart = Date.now();

  // Run BOTH pipelines in parallel. The candidate path internally branches on
  // feature flags via evaluateFlagSync; the legacy path ignores flags.
  // Promise.allSettled so a candidate crash does not abort the legacy path.
  const [legacyRes, candidateRes] = await Promise.allSettled([
    legacyPipeline(inputs),
    candidatePipeline(inputs),
  ]);

  const legacyDuration = Date.now() - legacyStart;
  const candidateDuration = Date.now() - candidateStart;

  if (legacyRes.status === 'rejected') {
    // Legacy itself failed — propagate. Nothing to shadow against.
    throw legacyRes.reason;
  }

  const legacy = legacyRes.value;
  const candidate = candidateRes.status === 'fulfilled' ? candidateRes.value : legacy;
  const candidateFailed = candidateRes.status === 'rejected';

  if (candidateFailed) {
    // eslint-disable-next-line no-console
    console.warn('[engineShadowRunner] candidate pipeline failed; falling back to legacy:', candidateRes.reason);
  }

  // Capture the flag snapshot now (after primeFlags has run) so the ledger
  // reflects exactly which workstreams were active for this audit.
  const activeFlags = snapshotForLedger();
  const candidateVersion = candidateFailed ? LEGACY_ENGINE_VERSION : buildCandidateVersion(activeFlags);

  const legacyScore = legacy.result.total ?? 0;
  const candidateScore = candidate.result.total ?? 0;
  const legacyConf = deriveConfidencePct(legacy.result);
  const candidateConf = deriveConfidencePct(candidate.result);

  const canonical =
    (legacy.companyData as unknown as { canonicalName?: string }).canonicalName ??
    legacy.companyData?.name ??
    null;

  const fingerprint = await computeFingerprint(inputs, canonical ?? undefined);

  const payload: ShadowRowPayload = {
    user_id: options.userId ?? null,
    audit_fingerprint: fingerprint,
    audit_session_id: options.auditSessionId ?? null,
    company_name: inputs.companyName,
    company_canonical: canonical,
    role_title: inputs.roleTitle,
    department: inputs.department,
    country: inputs.country ?? null,
    inputs,
    legacy_result: legacy.result,
    candidate_result: candidate.result,
    legacy_score: legacyScore,
    candidate_score: candidateScore,
    score_delta: candidateScore - legacyScore,
    legacy_confidence_pct: legacyConf,
    candidate_confidence_pct: candidateConf,
    confidence_delta_pct: candidateConf - legacyConf,
    legacy_tier: deriveTierBucket(legacy.result),
    candidate_tier: deriveTierBucket(candidate.result),
    active_flags: activeFlags,
    legacy_engine_version: LEGACY_ENGINE_VERSION,
    candidate_engine_version: candidateVersion,
    cohort: deriveCohort(legacy.result),
    archetype: deriveArchetype(legacy.result),
    legacy_duration_ms: legacyDuration,
    candidate_duration_ms: candidateDuration,
  };

  // Decide what to surface to the user. The candidate path is only
  // user-facing when at least one workstream flag is in mode=production
  // OR the user is in a canary cohort. The shadow runner itself does NOT
  // gate this — it asks each major user-facing flag explicitly.
  // For the initial WS0 ship, no candidate workstream is user-facing
  // (every flag starts in shadow/off), so we always serve legacy. The
  // hook below makes it easy to flip when WS3/WS4 ship to production.
  const userFacingIsCandidate =
    !candidateFailed &&
    Object.values(activeFlags).some((m) => m === 'production' || m === 'canary');

  // Write the shadow row. Fire-and-forget unless tests opt in.
  let shadowRowId: string | null = null;
  if (options.awaitShadowWrite) {
    await writeShadowRow(payload);
    // Read back the most recent row id for this fingerprint+user for tests.
    const { data } = await supabase
      .from('audit_shadow_comparison')
      .select('id')
      .eq('audit_fingerprint', fingerprint)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    shadowRowId = (data as { id?: string } | null)?.id ?? null;
  } else {
    void writeShadowRow(payload);
  }

  const surfaced = userFacingIsCandidate ? candidate : legacy;
  return {
    userFacingResult: surfaced.result,
    companyData: surfaced.companyData,
    source: surfaced.source,
    userFacingIsCandidate,
    shadowRowId,
  };
}
