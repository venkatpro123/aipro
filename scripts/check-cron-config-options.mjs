// Investigate what config mechanisms are available on Supabase Postgres.
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log("=== Available extensions ===");
const ext = await client.query(`SELECT extname FROM pg_extension ORDER BY extname`);
for (const r of ext.rows) console.log(" -", r.extname);

console.log("\n=== Vault accessible? ===");
try {
  const v = await client.query(`SELECT count(*) FROM vault.decrypted_secrets`);
  console.log("vault.decrypted_secrets: rows =", v.rows[0].count);
} catch (e) {
  console.log("vault inaccessible:", e.message);
}

console.log("\n=== Existing app.* settings ===");
try {
  const s = await client.query(`SELECT name, setting FROM pg_db_role_setting drs JOIN pg_database d ON d.oid = drs.setdatabase WHERE d.datname='postgres'`);
  for (const r of s.rows) console.log(" -", r.name, "=", String(r.setting).slice(0, 60));
  if (s.rows.length === 0) console.log("  (no DB-level role settings)");
} catch (e) {
  console.log("query failed:", e.message);
}

console.log("\n=== Current role ===");
const cur = await client.query(`SELECT current_user, current_setting('role', true) as role`);
console.log(cur.rows[0]);

await client.end();
