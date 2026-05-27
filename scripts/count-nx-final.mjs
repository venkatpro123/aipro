import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false } });
const { rows } = await pool.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(stock_price) AS has_stock,
    COUNT(pe_ratio) AS has_pe,
    COUNT(revenue_ttm_usd) AS has_revenue,
    COUNT(CASE WHEN country_code='US' THEN 1 END) AS us,
    COUNT(CASE WHEN country_code='GB' THEN 1 END) AS uk,
    COUNT(CASE WHEN country_code IN ('DE','FR','ES') THEN 1 END) AS deu_fra_esp,
    COUNT(CASE WHEN country_code='JP' THEN 1 END) AS japan,
    COUNT(CASE WHEN country_code='KR' THEN 1 END) AS korea,
    COUNT(CASE WHEN country_code='IN' THEN 1 END) AS india,
    COUNT(CASE WHEN country_code='CA' THEN 1 END) AS canada,
    COUNT(CASE WHEN country_code='SE' THEN 1 END) AS sweden,
    COUNT(CASE WHEN country_code='ZA' THEN 1 END) AS south_africa,
    COUNT(CASE WHEN country_code NOT IN ('US','GB','DE','FR','ES','JP','KR','IN','CA','SE','ZA') THEN 1 END) AS rest
  FROM verified_company_intelligence
`);
const r = rows[0];
console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║   verified_company_intelligence — FINAL TOTALS   ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log(`║  Total companies  : ${String(r.total).padEnd(28)}║`);
console.log(`║  Has stock price  : ${String(r.has_stock).padEnd(20)} (${Math.round(r.has_stock/r.total*100)}%)   ║`);
console.log(`║  Has PE ratio     : ${String(r.has_pe).padEnd(20)} (${Math.round(r.has_pe/r.total*100)}%)   ║`);
console.log(`║  Has Revenue TTM  : ${String(r.has_revenue).padEnd(20)} (${Math.round(r.has_revenue/r.total*100)}%)   ║`);
console.log('╠══════════════════════════════════════════════════╣');
console.log('║  By Region:                                      ║');
console.log(`║    USA            : ${String(r.us).padEnd(28)}║`);
console.log(`║    UK             : ${String(r.uk).padEnd(28)}║`);
console.log(`║    DE/FR/ES       : ${String(r.deu_fra_esp).padEnd(28)}║`);
console.log(`║    Japan          : ${String(r.japan).padEnd(28)}║`);
console.log(`║    Korea          : ${String(r.korea).padEnd(28)}║`);
console.log(`║    India          : ${String(r.india).padEnd(28)}║`);
console.log(`║    Canada         : ${String(r.canada).padEnd(28)}║`);
console.log(`║    Sweden         : ${String(r.sweden).padEnd(28)}║`);
console.log(`║    South Africa   : ${String(r.south_africa).padEnd(28)}║`);
console.log(`║    Rest of World  : ${String(r.rest).padEnd(28)}║`);
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
await pool.end();
