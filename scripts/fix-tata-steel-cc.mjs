import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const r = await db.query(
  "UPDATE verified_company_intelligence SET country_code='IN', ticker='TATASTEEL.NS', exchange='NSE', is_public=true, updated_at=NOW() WHERE canonical_name='tata steel'"
);
console.log("tata steel country_code=IN fixed:", r.rowCount, "rows");
await db.end();
