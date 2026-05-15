-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260615000003_v351_feature_flags.sql
-- Purpose:   v35.1 — register the WS9..WS14 feature flags AND relax the
--            workstream regex (was `^WS[0-9]$`, blocked WS10+).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Relax workstream constraint ────────────────────────────────────────────
ALTER TABLE public.engine_feature_flags
  DROP CONSTRAINT IF EXISTS engine_feature_flags_workstream_check;
ALTER TABLE public.engine_feature_flags
  ADD CONSTRAINT engine_feature_flags_workstream_check
    CHECK (workstream ~ '^WS[0-9]{1,2}$');

-- ── Seed v35.1 flags ───────────────────────────────────────────────────────
-- All flags start in 'off' mode. Score-affecting flags advance to 'shadow'
-- only once their WS9 acceptance gate is green; non-score-affecting plumbing
-- flags can flip straight to 'production' after passing tests.
INSERT INTO public.engine_feature_flags
  (flag_key, mode, description, workstream, acceptance_criteria)
VALUES
  ('ws9_db_calibration_constants', 'off',
   'Read scoring constants from engine_calibration_constants table instead of in-code defaults. Loader falls back to bootstrap when row is missing.',
   'WS9',
   ARRAY[
     'getConstant() unit tests green',
     'engine_constant_resolutions table is being written',
     'shadow comparison: score-delta p95 <= 0.04 vs legacy over 7d'
   ]),
  ('ws9_strict_calibration_mode', 'off',
   'When ON, layers reading an uncalibrated_placeholder constant attach fallback=true to their span and write to layer_fallback_log. When OFF, the legacy silent path runs.',
   'WS9',
   ARRAY[
     'v_uncalibrated_exposure < 5% after recalibrate-engine has filled the long tail',
     'no fast_burn_alert on slo_burn_summary for 7d in shadow'
   ]),
  ('ws10_typed_fallback', 'off',
   'Routes catch/swallow paths through withFallback() so they write layer_fallback_log + span tag.',
   'WS10',
   ARRAY[
     'CI grep finds zero unwrapped silent fallbacks',
     'count(fallback_log) >= count(span.tag.fallback=true) for 24h sample'
   ]),
  ('ws11_distinct_source_quorum', 'off',
   'Quorum requires Set(normalizeSourceName(raw)).size >= N instead of raw count.',
   'WS11',
   ARRAY[
     'yahoo_finance + yahoo-finance counted as 1 in test',
     'load test: 1000 concurrent same-company audits => 1 scrape_jobs row'
   ]),
  ('ws11_dag_write_versioning', 'off',
   'AuditContext.set requires expectedVersion. Two layers emitting same key in the same wave triggers WriteConflictError + single retry.',
   'WS11',
   ARRAY[
     'race-condition test: two layers same wave same key => one wins, one retries, one final value',
     'no WriteConflictError under steady-state production traffic for 7d'
   ]),
  ('ws12_age_aware_cache', 'off',
   'analysisCache: single TTL truth (cacheConfig.ts), no cachedAt bump on read, age badge surfaced.',
   'WS12',
   ARRAY[
     'lint: zero TTL literals outside cacheConfig.ts',
     'shadow: confidence drops monotonically with data_age'
   ]),
  ('ws13_breaker_mesh', 'off',
   'apiCircuitBreaker covers Glassdoor, LinkedIn, Wikipedia, Naukri, Indeed, Yahoo, GitHub, generic-RSS.',
   'WS13',
   ARRAY[
     'synthetic Glassdoor kill: breaker opens <=5 calls; downstream fallback emits',
     'cron sla_breach < 5% for 7d'
   ]),
  ('ws14_request_id_context', 'off',
   'Per-audit requestIdContext via Zustand session map. Replaces stack-based currentRequestId.',
   'WS14',
   ARRAY[
     'browser test: two concurrent audits in same tab => no request_id overlap',
     'OTLP IndexedDB dead-letter populated on simulated outage; drained on reconnect'
   ])
ON CONFLICT (flag_key) DO NOTHING;

COMMENT ON CONSTRAINT engine_feature_flags_workstream_check ON public.engine_feature_flags IS
  'v35.1 — relaxed from ^WS[0-9]$ to ^WS[0-9]{1,2}$ to permit WS10..WS14.';
