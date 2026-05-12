// Post-deploy verification — checks every v22 artifact ran successfully end-to-end.
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const checks = [
  // Tables
  { name: "ingestion_runs table exists",
    q: `SELECT to_regclass('public.ingestion_runs') IS NOT NULL AS ok`,
  },
  { name: "career_page_snapshots table exists",
    q: `SELECT to_regclass('public.career_page_snapshots') IS NOT NULL AS ok`,
  },
  { name: "company_intelligence.github_org column exists",
    q: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='company_intelligence' AND column_name='github_org') AS ok`,
  },
  // Seed
  { name: "github_org seeded for ≥30 companies",
    q: `SELECT (COUNT(*) FILTER (WHERE github_org IS NOT NULL) >= 30) AS ok, COUNT(*) FILTER (WHERE github_org IS NOT NULL) AS seeded FROM public.company_intelligence`,
  },
  // pg_cron
  { name: "pg_cron job 'ingest-breaking-news' active",
    q: `SELECT (active AND schedule = '*/10 * * * *') AS ok, schedule FROM cron.job WHERE jobname='ingest-breaking-news'`,
  },
  // Vault secrets
  { name: "vault secrets present",
    q: `SELECT (count(*) >= 2) AS ok, count(*) AS total FROM vault.decrypted_secrets WHERE name IN ('ingest_news_url','supabase_service_key')`,
  },
  // pg_net call latency (most recent dispatch)
  { name: "pg_net dispatch occurred (last 10 min)",
    q: `SELECT (count(*) > 0) AS ok, count(*) AS total FROM net._http_response WHERE created > NOW() - INTERVAL '10 minutes'`,
  },
  // ingest-news Edge Function recorded a run
  { name: "ingestion_runs has 'ingest-news' row",
    q: `SELECT (count(*) > 0) AS ok, MAX(last_run_at) AS last_run FROM public.ingestion_runs WHERE kind='ingest-news'`,
  },
  // breaking_news_events latency (remote schema uses `detected_at` not `created_at`)
  { name: "breaking_news_events activity (last 24h)",
    q: `SELECT (count(*) > 0) AS ok, count(*) AS total, MAX(detected_at) AS most_recent FROM public.breaking_news_events WHERE detected_at > NOW() - INTERVAL '24 hours'`,
  },
];

let passed = 0;
let total = 0;
for (const c of checks) {
  total++;
  try {
    const { rows } = await client.query(c.q);
    const row = rows[0] ?? {};
    const ok = row.ok === true;
    const detail = Object.entries(row)
      .filter(([k]) => k !== "ok")
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    console.log(`${ok ? "✓" : "✗"} ${c.name}${detail ? "  [" + detail + "]" : ""}`);
    if (ok) passed++;
  } catch (e) {
    console.log(`? ${c.name} — ${e.message}`);
  }
}

console.log(`\n${passed}/${total} checks passed.`);
await client.end();
