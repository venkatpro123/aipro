import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query(`
  SELECT canonical_name, ticker, exchange, stock_price, market_cap_usd, pe_ratio, revenue_ttm_usd, is_public
  FROM verified_company_intelligence 
  WHERE canonical_name IN ('confluent','deliveroo','ltimindtree','malayan banking berhad','nuvasive','tata motors','wns global')
  ORDER BY canonical_name
`);
console.log("=== 7 Companies Status ===");
rows.forEach(r => {
  const mc  = r.market_cap_usd  ? `$${(r.market_cap_usd/1e9).toFixed(1)}B`  : "NO_MC";
  const rev = r.revenue_ttm_usd ? `$${(r.revenue_ttm_usd/1e9).toFixed(1)}B` : "NO_REV";
  const pe  = r.pe_ratio        ? `PE=${r.pe_ratio}` : "NO_PE";
  const px  = r.stock_price     ? `price=${r.stock_price}` : "NO_PRICE";
  console.log(`${r.canonical_name.padEnd(30)} ${r.ticker?.padEnd(20)} ${px} ${mc} ${pe} ${rev}`);
});
await db.end();
