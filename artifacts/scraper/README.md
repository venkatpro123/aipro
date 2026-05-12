# humansheild-scraper

Real-time AI intelligence scraper for the HumanProof Layoff Audit engine. Runs on a single **Fly.io** machine (~$5–10/mo). Combines **Playwright** for browser-based scraping, a **Crawl4AI** Python subprocess for AI-native structured extraction, and a dual-mode queue (BullMQ when Redis is available, in-process otherwise). Pushes results into the existing Supabase tables (`breaking_news_events`, `live_signals_v2`, `warn_filings`) plus a handful of source-specific snapshot tables. Optionally indexes composed events into **Meilisearch**.

The existing 30-agent swarm and audit dashboard consume the same Supabase tables — no swarm code changes are required.

## Minimum config — only TWO secrets to boot

| Secret | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | ✅ always | The Supabase project's REST URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ always | Server-side service-role JWT — never expose to browser |
| `HMAC_SHARED_SECRET` | ✅ in production | Auto-generated for dev. Production must set this (same value used by `scraper-enqueue` EF). Generate with `openssl rand -hex 32` |

Everything else is **optional** and the scraper degrades gracefully when missing.

### Optional services and what's lost without them

| Missing | Effect |
|---|---|
| `REDIS_URL` | **Falls back to in-process queue.** Single-machine only, no persistence across restarts. Fine for MVP. |
| `GEMINI_API_KEY` | `signalComposeWorker` falls back to rule-based scoring (no LLM enrichment) |
| `GITHUB_TOKEN` | `githubWorker` uses anonymous API — **60 req/h** instead of 5000 |
| `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` | `redditWorker` uses anonymous API — **10 req/min** instead of 60 |
| `MEILISEARCH_HOST` + `MEILISEARCH_API_KEY` | Frontend "search past events" panel disabled; scraper skips indexing |

Free public sources that **never need API keys**:
SEC EDGAR (10 req/sec free), layoffs.fyi mirrors, WARN Act CA EDD, Google News RSS, RSS news feeds, Hacker News Algolia, Reddit anon, GitHub anon, Glassdoor (browser), LinkedIn (browser, high block risk), MCA India.

## Architecture (one paragraph)

`pg_cron` (every 10 min) **AND** frontend audit-submit → Supabase Edge Function `scraper-enqueue` → HMAC-signed POST → this app's `POST /enqueue` → queue (BullMQ or in-process) → workers (10 source-specific) → writes to Supabase (+ optional Meilisearch) → SPA receives Realtime push for any company the user audited in the last 24 h.

## Source coverage

| Source | Worker | Concurrency | Notes |
|---|---|---|---|
| SEC EDGAR (8-K, Item 5.02) | `secEdgarWorker` | 10 | No quota, 6 h cache |
| Reddit | `redditWorker` | 10 | OAuth or anon fallback |
| GitHub | `githubWorker` | 10 | PAT — 5000 req/h |
| WARN Act (CA) | `warnActWorker` | 10 | HTML scrape |
| layoffs.fyi mirrors | `layoffTrackerWorker` | 10 | JSON datasets |
| Google News + Crawl4AI | `newsWorker` | 10 | Crawl4AI Python subprocess |
| Career pages | `careerPageWorker` | **1** | Playwright Chromium |
| LinkedIn jobs | `linkedinWorker` | **1** | High block risk — gated to top50 only |
| Glassdoor | `glassdoorWorker` | **1** | Weekly cadence |
| Signal composition | `signalComposeWorker` | 1 | Cross-source fusion + Gemini Flash 2.0 |

Browser workers are mutex-guarded by `src/sources/playwrightPool.ts` so only one Chromium page is alive at a time — keeps memory under the 2 GB Fly.io machine limit.

## Local development (2-secret quickstart)

```bash
# 1. Minimum local .env — just point at Supabase
cat > .env.local <<EOF
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>
EOF
# HMAC secret will be auto-generated on boot and printed to the console.
# Redis omitted → in-process queue mode.

npm install
npx playwright install chromium

# Run the HTTP server + workers in one process (matches production)
npm run dev

# In another shell, test enqueue (HMAC-signed):
node -e '
  const crypto = require("node:crypto");
  const body = JSON.stringify({ jobs: [{ type: "secEdgarPoll", companyName: "Microsoft", cik: "0000789019" }] });
  const ts = Date.now();
  const sig = crypto.createHmac("sha256", process.env.HMAC_SHARED_SECRET).update(`${ts}.${body}`).digest("hex");
  fetch("http://localhost:8080/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-HP-Timestamp": String(ts), "X-HP-Signature": sig },
    body,
  }).then(r => r.json()).then(console.log);
'
```

For Crawl4AI development on the host (skip Docker):

```bash
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r python/requirements.txt
python3 -m playwright install chromium
```

## Production deploy (Fly.io)

### Minimal deploy (in-process mode, no Redis)

```bash
# 1. Provision the app
fly apps create humansheild-scraper --org <your-org>

# 2. Set the bare minimum secrets — only THREE values
HMAC_SECRET=$(openssl rand -hex 32)
fly secrets set \
  SUPABASE_URL=https://<project>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt> \
  HMAC_SHARED_SECRET=$HMAC_SECRET

# 3. Persistent volume for Playwright cache
fly volumes create scraper_cache --region bom --size 1

# 4. Deploy
fly deploy

# That's it. The scraper boots, runs in in-process queue mode, and immediately
# starts processing /enqueue requests. /health reports queueMode="in-process"
# and lists the optional features running degraded.
```

### Full deploy (BullMQ + Redis + optional services)

Add these to the `fly secrets set` command above as you need richer signal:

```bash
fly secrets set \
  REDIS_URL=<upstash-redis-url> \
  GEMINI_API_KEY=<gemini-key> \
  GITHUB_TOKEN=<github-pat> \
  REDDIT_CLIENT_ID=<reddit-oauth-id> \
  REDDIT_CLIENT_SECRET=<reddit-oauth-secret> \
  MEILISEARCH_HOST=http://meili.internal:7700 \
  MEILISEARCH_API_KEY=<meili-master-key>
```

Each is independent — add them one at a time and `/health` will progressively report fewer items in its `degraded` array.

### Wire Supabase Edge Function

```bash
# Deploy the EF
cd ../../supabase && supabase functions deploy scraper-enqueue --no-verify-jwt

# Set EF secrets (same HMAC secret as the Fly.io scraper)
supabase secrets set \
  HMAC_SHARED_SECRET=$HMAC_SECRET \
  FLY_SCRAPER_URL=https://humansheild-scraper.fly.dev

# Apply DB migrations (creates scrape_jobs, tracked_companies, view, etc.)
supabase db push

# Wire pg_cron (one-time, in Supabase SQL editor):
ALTER DATABASE postgres SET app.scraper_enqueue_url = 'https://<project>.supabase.co/functions/v1/scraper-enqueue';
ALTER DATABASE postgres SET app.supabase_service_key = '<service-role-jwt>';
```

### Provision Meilisearch (optional but recommended)

```bash
# Sister Fly.io app — 1 GB RAM machine
fly apps create humansheild-meili --org <your-org>
# (Deploy from getmeili/meilisearch Docker image with a 3GB volume)
# See: https://fly.io/docs/app-guides/run-a-global-image-service-with-meilisearch/
```

Then create a search-only API key in the Meilisearch dashboard and set it in `artifacts/humanproof/.env`:

```
VITE_MEILISEARCH_HOST=https://humansheild-meili.fly.dev
VITE_MEILISEARCH_SEARCH_KEY=<search-only-key>
```

The frontend's `EventSearchPanel.tsx` will auto-enable.

## Verification

```bash
# 1. Liveness probe
curl https://humansheild-scraper.fly.dev/health
# → {"ok":true,"service":"humansheild-scraper",...}

# 2. Queue stats (Bearer = HMAC shared secret)
curl -H "Authorization: Bearer $HMAC_SECRET" https://humansheild-scraper.fly.dev/stats

# 3. Manual enqueue via Edge Function (no auth needed; EF signs internally)
supabase functions invoke scraper-enqueue --no-verify-jwt --body \
  '{"companies":["Microsoft","Google"]}'

# 4. Watch Supabase scrape_jobs table for results
# In Supabase SQL editor:
SELECT job_type, status, error_kind, count(*)
FROM public.scrape_jobs
WHERE enqueued_at > now() - interval '15 minute'
GROUP BY 1, 2, 3 ORDER BY 1, 2;

# 5. Block-rate alarm
SELECT job_type, count(*) FILTER (WHERE error_kind IN ('429','captcha')) AS blocked,
       count(*) AS total,
       round(100.0 * count(*) FILTER (WHERE error_kind IN ('429','captcha')) / count(*), 1) AS block_pct
FROM public.scrape_jobs
WHERE enqueued_at > now() - interval '24 hour'
GROUP BY 1 ORDER BY 3 DESC;
# LinkedIn block_pct > 5%  → gate LinkedIn behind feature flag, add Bright Data
```

## Cost monitor

```bash
fly status -a humansheild-scraper          # machine status (should auto-stop when idle)
fly logs -a humansheild-scraper            # tail the worker logs
fly scale show -a humansheild-scraper      # confirm 1× shared-cpu-2x 2GB
```

Target budget:

| Component | Spec | $/mo |
|---|---|---|
| scraper machine | shared-cpu-2x 2 GB scale-to-zero | $5.70 |
| persistent volume | 1 GB | $0.15 |
| Upstash Redis | free tier (10k cmds/day) | $0 |
| Meilisearch machine | shared-cpu-1x 1 GB | $3.19 |
| Meilisearch volume | 3 GB | $0.45 |
| **total** | | **~$9.50** |

## Files

```
src/
  server.ts                 ← Hono /enqueue, /health, /stats (also starts workers)
  queues.ts                 ← BullMQ queue definitions
  worker-entry.ts           ← Workers-only entrypoint (for splitting machines)
  lib/                      ← config, supabaseClient, hmacAuth, dedupe, types
  workers/                  ← 10 source-specific workers + index registry
  sources/                  ← playwrightPool, crawl4aiClient, geminiEnrich
python/
  crawl4ai_extract.py       ← stdin/stdout Crawl4AI subprocess
  requirements.txt
Dockerfile                  ← Node 20 + Python 3.11 + Chromium multi-stage
fly.toml                    ← Fly.io config: bom, 2 GB, scale-to-zero
.env.example                ← All secret names + free-tier quotas
```

## Adding a new source

1. Add a new entry to `JobType` in `src/lib/types.ts`.
2. Create `src/workers/<name>Worker.ts` exporting an async handler `(p: JobPayload) => Promise<JobResult>`.
3. Register it in `src/workers/index.ts` `HANDLERS` map with concurrency + `followUp` flag.
4. Add the job-type to the Zod enum in `src/server.ts` `EnqueueBody`.
5. Optionally add a row to `tracked_companies` triggering it via `supabase/functions/scraper-enqueue/index.ts`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/health` returns 503 with `status:"misconfigured"` and a `missing` array | Required `fly secrets` not set | Paste the `hint` field's command verbatim. Then `fly machine restart`. |
| Machine restart loop / "Missing SUPABASE_URL env var" in dashboard | Old image — current code never crashes on this. Re-deploy. | `fly deploy` from `artifacts/scraper/`. |
| `/health` 200 but no jobs running | pg_cron `app.scraper_enqueue_url` not set | `ALTER DATABASE postgres SET app.scraper_enqueue_url = '...'` |
| `HMAC rejected: stale_timestamp` | Server clock skew >5 min | NTP sync, or check Fly.io machine time |
| All LinkedIn jobs `error_kind=captcha` | LinkedIn detected scraper | Gate LinkedIn behind feature flag; consider Bright Data |
| Crawl4AI subprocess timeout | Python deps missing | Rebuild Docker image; check `python/requirements.txt` |
| `breaking_news_events` empty after deploy | No `tracked_companies` priority=top50 rows | Migration seeds 15 companies; verify with `SELECT * FROM tracked_companies LIMIT 5;` |
| Meili search panel disabled | `VITE_MEILISEARCH_HOST` not set | Provision Meili + set frontend env vars |

## Related

- Plan doc: `~/.claude/plans/i-want-to-make-vivid-bear.md`
- Edge Function: `supabase/functions/scraper-enqueue/index.ts`
- pg_cron schedule: `supabase/migrations/20260515000002_scraper_cron_schedule.sql`
- Tables: `supabase/migrations/20260515000001_scraper_infrastructure.sql`
- Frontend toast: `artifacts/humanproof/src/components/audit/RealtimeSignalToast.tsx`
- Frontend search: `artifacts/humanproof/src/components/audit/EventSearchPanel.tsx`
