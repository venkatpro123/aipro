# Runbook: Breaking-news flood

## Symptom

- A major company announces layoffs; thousands of users open the
  app for that company within minutes.
- SLO #1 (audit latency p95) spikes above 8s.
- `audit_coalesce_runs` shows many simultaneous fingerprints for the
  same company.
- Supabase realtime broadcasts back-pressure (subscriber connection
  errors in the log aggregator).

## Diagnosis (3 minutes)

1. **Which company is the focus?**
   ```sql
   SELECT company_canonical, COUNT(*) AS n
   FROM audit_coalesce_runs
   WHERE created_at >= NOW() - INTERVAL '15 minutes'
   GROUP BY company_canonical
   ORDER BY n DESC
   LIMIT 5;
   ```

2. **Is coalescing working?**
   - For each fingerprint there should be ~1 leader and N-1 followers.
   ```sql
   SELECT fingerprint, status, follower_count, created_at
   FROM audit_coalesce_runs
   WHERE company_canonical = '<focus company>'
     AND created_at >= NOW() - INTERVAL '15 minutes'
   ORDER BY created_at DESC;
   ```
   - If `follower_count` stays near 1 across many rows, coalescing
     isn't matching → fingerprints are diverging because role / dept /
     country differ. That's expected and fine.

3. **Is realtime fan-out saturating?**
   - Look at log aggregator for `breakingNewsBroker` subscribe failures.
   - The broker auto-downgrades to polling above 8 subscribers per
     tab; if you see "subscribe failed" repeatedly the downgrade isn't
     kicking in.

## Mitigation (immediate)

- **Throttle the rate limit downward** so each user can only fire one
  audit / 30s instead of one / 10s:
  ```sql
  UPDATE rate_limit_policies
     SET tokens_per_second = 0.033, capacity = 30
   WHERE bucket_key = 'audit';
  ```
  Remember to revert once the burst passes.

- **Force-promote ws6 realtime fan-out flag** if not already on:
  ```sql
  UPDATE engine_feature_flags
     SET mode = 'production'
   WHERE flag_key = 'ws6_realtime_fanout';
  ```
  The broker's polling fallback kicks in above the subscriber
  threshold; with the flag on, this happens automatically.

- **Increase analysisCache TTL** to reduce DB pressure for the focus
  company. This is a code change, not a SQL update — but ops can
  flip a flag if one exists for this purpose. Today there isn't one;
  file a follow-up to add `ws_burst_cache_ttl` for next time.

## Resolution

- The flood will subside on its own as the news cycle peaks (typically
  within 1-2 hours). Mitigations buy time; nothing to "resolve" in the
  product sense.
- The legitimate user demand is the system functioning correctly.

## Verification

- p95 audit latency back below 8s for 15 min.
- `audit_coalesce_runs` coalescing ratio (followers / leaders) > 5 for
  the focus company → coalescing IS reducing pipeline runs.
- No more realtime subscription errors in the log aggregator.

## Post-incident

- Revert the rate limit policy:
  ```sql
  UPDATE rate_limit_policies
     SET tokens_per_second = 0.1, capacity = 60
   WHERE bucket_key = 'audit';
  ```
- File a follow-up if the cache-TTL flag was missing.
- Update the SLO dashboard with the actual breaking-news peak load —
  this is real-world load testing data we can't fabricate.
