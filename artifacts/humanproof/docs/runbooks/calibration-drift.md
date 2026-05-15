# Runbook: Calibration drift

## Symptom

- `is_misaligned = TRUE` on the 90% CI for any cohort in
  `coverage_measurements_latest`, OR
- AUC drop > 0.05 on any cohort vs prior version, OR
- An open row in `engine_drift_alerts` more than 24h old.

## Diagnosis (5–10 minutes)

1. **Which cohort, which metric?**
   ```sql
   SELECT cohort_scope, alert_kind, metric_name, prior_value,
          candidate_value, delta, created_at
   FROM engine_drift_alerts
   WHERE status = 'open'
   ORDER BY created_at ASC;
   ```

2. **Sample size sanity check:**
   ```sql
   SELECT cohort_scope, n_events_total, created_at
   FROM engine_calibration_versions
   WHERE status IN ('pending', 'active')
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - If `n_events_total < 80` for the affected cohort, the drift might
     be statistical noise rather than real model degradation.

3. **Outcome distribution shift?**
   ```sql
   SELECT outcome_source, COUNT(*) AS n
   FROM user_prediction_outcomes
   WHERE audit_date >= NOW() - INTERVAL '30 days'
     AND outcome_reported IS NOT NULL
   GROUP BY outcome_source;
   ```
   - A sudden flood of `implicit_news` detections without proportional
     `implicit_warn` / `implicit_layoffsfyi` may indicate the fuzzy
     matcher is over-firing on noisy press.

## Mitigation (immediate)

- The pending version is NOT yet active — production uses the prior
  active version. No user-facing impact. Calm down.
- If the prior version is also showing coverage drift (look at
  `coverage_measurements_latest` for the **active** version_id), then:
  - **Roll the active version back** to a previously-superseded version:
    ```sql
    -- 1. Demote current active.
    UPDATE engine_calibration_versions
       SET status = 'superseded'
     WHERE cohort_scope = '<scope>' AND status = 'active';
    -- 2. Promote a known-good prior.
    UPDATE engine_calibration_versions
       SET status = 'active', activated_at = NOW(),
           activation_reason = 'rollback from drift alert <alert_id>'
     WHERE id = <prior_good_id>;
    ```
  - The 30-min calibration cache means the engine picks up the new
    active row within that window.

## Resolution

### Real drift (not noise):

1. Inspect the outcome dataset for a regime change:
   - Did a major company cohort change (mass tech layoffs, sector
     rotation)?
   - Did the implicit detector start matching a new source class?

2. If real-world distribution shifted:
   - Acknowledge the alert with a note.
   - Let the next weekly recalibration run.
   - If the model still misses on the next cycle, retrain with extra
     features (this is product work, not on-call work).

3. If a buggy data source poisoned the training set:
   - Identify the source via `detection_evidence.source` distribution.
   - Drop those detections from the training query for the
     recalibration run:
     ```sql
     -- Manual trigger excluding the suspect source.
     SELECT net.http_post(
       url := current_setting('app.supabase_functions_url') || '/recalibrate-engine',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')),
       body := jsonb_build_object('exclude_outcome_source', ARRAY['implicit_news'])
     );
     ```
     (Note: the exclude flag is a future enhancement; today the cron
     ignores extra body fields, so file a follow-up to add support.)

### Noise (n too small):

- Wait one more weekly cron cycle. If the alert clears, mark as
  resolved with reason "below MDE; statistical noise."
- If alerts recur weekly on the same cohort, the threshold may be too
  tight for that cohort's sample size. File a follow-up to make the
  drift threshold cohort-aware.

## Verification

- `engine_drift_alerts` row for this incident is `status = 'resolved'`.
- Next weekly `coverage_measurements` row shows `is_misaligned = FALSE`
  for the affected cohort.
- 30 days of stable coverage in the SLO dashboard.

## Post-incident

- If rollback: file the new "broken" version as `rejected` with the
  reason in `activation_reason`.
- If real-world shift: note in the next quarterly model review that
  the cohort's base rate changed.
