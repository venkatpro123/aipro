import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query(`
  SELECT canonical_name, total_open_roles, hiring_source
  FROM verified_company_intelligence
  WHERE canonical_name IN ('noom','better com','vanguard','certara','masimo','alnylam pharmaceuticals','insulet','qlik','wns global')
  ORDER BY canonical_name
`);
for (const r of rows) console.log(r.canonical_name.padEnd(25), String(r.total_open_roles ?? 'NULL').padStart(6), r.hiring_source || '');
await db.end();
