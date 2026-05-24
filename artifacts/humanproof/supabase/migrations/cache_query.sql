SELECT company_name, market, price_90d_change, revenue_growth_yoy, market_cap, pe_ratio, data_sources, fetched_at
FROM company_live_cache
ORDER BY fetched_at DESC LIMIT 10;
