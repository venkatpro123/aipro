# Runbook: Scraper degradation

## Symptom

One or more scrape sources returning empty / blocked / timeout responses.
SLO #2 (layer fallback rate) above warn threshold.

Typical triggers:
- **Glassdoor anti-bot** trips suddenly.
- **Yahoo Finance** rate limits the source IP.
- **Wikipedia** parser hits an infobox-format edge case.
- **Naukri / Indeed** rotate their HTML structure.

## Diagnosis (5 minutes)

1. **Which source?**
   ```sql
   SELECT source_name, fallback_reason, COUNT(*) AS n
   FROM layer_fallback_log
   WHERE created_at >= NOW() - INTERVAL '15 minutes'
     AND source_name IS NOT NULL
   GROUP BY source_name, fallback_reason
   ORDER BY n DESC;
   ```

2. **All-companies or specific company?**
   ```sql
   SELECT company_canonical, COUNT(*)
   FROM layer_fallback_log
   WHERE created_at >= NOW() - INTERVAL '15 minutes'
     AND source_name = '<offending source>'
   GROUP BY company_canonical
   LIMIT 20;
   ```
   - "All companies, all the time" → source-level outage.
   - "All companies, intermittent" → rate limit.
   - "Specific company only" → parser drift on that company's page shape.

3. **Anti-bot vs network?**
   - `fallback_reason='anti_bot'` → CAPTCHA, Cloudflare challenge, IP block.
   - `fallback_reason='timeout'` → network latency, source slow but reachable.
   - `fallback_reason='parser_failed'` → HTML structure changed.

## Mitigation (immediate)

- **Trip the circuit breaker manually** so we don't waste retries:
  ```sql
  UPDATE api_circuit_status
     SET state = 'OPEN', opened_at = NOW()
   WHERE source_name = '<offending source>';
  ```
  The 60s breaker cooldown applies; in-flight audits get the cached
  prior value or fall to heuristic.

- **For anti-bot:** rotate the user-agent in the scraper config. If
  the breaker stays open, expect 24-48h before the IP block lifts.

- **For parser drift:** the layer's fallback returns the prior cached
  value, so the score impact is bounded. Filing a parser fix is
  next-business-day work, not pager-worthy unless the source is
  REGULATORY tier.

## Resolution

### Source-level outage (Glassdoor down):
- No action; their service returns when it returns.
- Verify the breaker auto-reopens via the 60s HALF_OPEN probe.

### Rate limit:
- Reduce the scrape cadence in `scrape_jobs` enqueue policy:
  ```sql
  UPDATE due_for_scrape_config SET poll_freq_min = 60
   WHERE source = '<source>';
  ```
- Investigate why we burned the quota (usually a buggy retry loop).

### Parser drift:
- Pull a current sample of the source's HTML/JSON.
- Update the parser in the relevant connector
  (`src/services/dataConnectors/*Connector.ts`).
- Write a regression test against the new sample.
- Ship behind the existing flag for the connector if one exists.

## Verification

- `slo_layer_fallback_5m` view shows source fallback rate back below
  5% for at least 15 min.
- A test audit on a representative company succeeds without the
  source falling back.

## Post-incident

- File a follow-up if anti-bot keeps recurring — consider whether
  the source belongs in the evidence hierarchy at all. A source that
  costs more in incident time than it adds in signal is debt.
- Add the failure case to the connector's test fixtures.
