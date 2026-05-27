// final-vci-audit.mjs — Complete current state of VCI
import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const { rows: all } = await db.query(`
  SELECT
    canonical_name, display_name, country_code, is_public,
    workforce_count, stock_price, market_cap_usd, pe_ratio,
    revenue_ttm_usd, total_open_roles, recent_layoff_count,
    data_quality_tier, hiring_source
  FROM verified_company_intelligence
  ORDER BY country_code, canonical_name
`);

// Summary stats
const total = all.length;
const publicCos = all.filter(r => r.is_public).length;
const privateCos = all.filter(r => !r.is_public).length;
const hasWorkforce = all.filter(r => r.workforce_count !== null).length;
const hasPrice = all.filter(r => r.stock_price !== null).length;
const hasMktCap = all.filter(r => r.market_cap_usd !== null).length;
const hasPE = all.filter(r => r.pe_ratio !== null).length;
const hasRevenue = all.filter(r => r.revenue_ttm_usd !== null).length;
const hasOpenRoles = all.filter(r => r.total_open_roles !== null).length;
const hasLayoffs = all.filter(r => r.recent_layoff_count !== null).length;
const nullOpenRoles = all.filter(r => r.total_open_roles === null);

console.log(`
╔════════════════════════════════════════════════╗
║      VCI COMPREHENSIVE STATE (May 2026)        ║
╠════════════════════════════════════════════════╣
║ Total companies     : ${String(total).padStart(3)}                      ║
║ Public              : ${String(publicCos).padStart(3)}                      ║
║ Private             : ${String(privateCos).padStart(3)}                      ║
╠════════════════════════════════════════════════╣
║ workforce_count     : ${String(hasWorkforce).padStart(3)} / ${total}  ║
║ stock_price         : ${String(hasPrice).padStart(3)} / ${total}  ║
║ market_cap_usd      : ${String(hasMktCap).padStart(3)} / ${total}  ║
║ pe_ratio            : ${String(hasPE).padStart(3)} / ${total}  ║
║ revenue_ttm_usd     : ${String(hasRevenue).padStart(3)} / ${total}  ║
║ total_open_roles    : ${String(hasOpenRoles).padStart(3)} / ${total}  ║
║ recent_layoff_count : ${String(hasLayoffs).padStart(3)} / ${total}  ║
╚════════════════════════════════════════════════╝
`);

// Companies still missing open_roles
if (nullOpenRoles.length > 0) {
  console.log(`\n=== ${nullOpenRoles.length} companies still missing total_open_roles ===`);
  const byCountry = {};
  for (const r of nullOpenRoles) {
    const cc = r.country_code || 'XX';
    if (!byCountry[cc]) byCountry[cc] = [];
    byCountry[cc].push(r);
  }
  for (const [cc, cos] of Object.entries(byCountry).sort()) {
    console.log(`\n  ${cc}:`);
    for (const co of cos) {
      const pub = co.is_public ? '[PUB]' : '[PVT]';
      console.log(`    ${pub} "${co.canonical_name}" — ${co.display_name}`);
    }
  }
}

// Companies with open_roles data
const withRoles = all.filter(r => r.total_open_roles !== null);
console.log(`\n=== ${withRoles.length} companies WITH total_open_roles ===`);
const topHiring = withRoles.filter(r => r.total_open_roles > 0).sort((a,b) => b.total_open_roles - a.total_open_roles).slice(0,15);
console.log(`\nTop 15 hiring companies:`);
for (const r of topHiring) {
  console.log(`  ${r.total_open_roles.toString().padStart(6)} — ${r.display_name} [${r.hiring_source}]`);
}

await db.end();
