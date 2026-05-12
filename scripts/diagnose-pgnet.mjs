// Dig into pg_net response details — why are some status_code values null?
import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// Show full pg_net response detail incl error_msg
console.log("=== pg_net detailed history (last 15) ===");
const r = await client.query(`
  SELECT id, status_code, error_msg, content_type, created,
         CASE WHEN length(content::text) > 80 THEN substring(content::text from 1 for 80) || '...' ELSE content::text END AS content_preview
  FROM net._http_response
  ORDER BY created DESC
  LIMIT 15
`);
for (const row of r.rows) {
  console.log(`id=${row.id}  status=${row.status_code ?? "NULL"}  err=${row.error_msg ?? "-"}  ct=${row.content_type ?? "-"}  preview=${row.content_preview ?? ""}`);
}

// Show queue state
console.log("\n=== pg_net queue state ===");
try {
  const q = await client.query(`SELECT COUNT(*) AS pending FROM net.http_request_queue`);
  console.log("pending requests:", q.rows[0].pending);
} catch (e) {
  console.log("queue check:", e.message);
}

console.log("\n=== Checking dispatch consistency ===");
// Count failed pgnet calls in last 24h
const stats = await client.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status_code BETWEEN 200 AND 299) AS ok,
    COUNT(*) FILTER (WHERE status_code >= 400) AS err4xx_5xx,
    COUNT(*) FILTER (WHERE status_code IS NULL) AS null_status,
    COUNT(*) FILTER (WHERE error_msg IS NOT NULL) AS with_err
  FROM net._http_response
  WHERE created > NOW() - INTERVAL '24 hours'
`);
console.log(stats.rows[0]);

await client.end();
