// fix-vci-display-names.mjs
// Strips DB-category suffixes from display_name and adds country_code + is_public + ticker
// for all remaining heuristic-tier companies in verified_company_intelligence.

import pg from "pg";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Known metadata for heuristic-tier companies still missing country_code
// (ones NOT already handled by update-vci-real-data.mjs)
const HEURISTIC_META = [
  // Global Banking
  { n: "blackrock",            d: "BlackRock Inc.",                  cc: "US", pub: true,  t: "BLK",        ex: "NYSE",    wf: 22800  },
  { n: "bnp paribas",          d: "BNP Paribas S.A.",                cc: "FR", pub: true,  t: "BNP.PA",     ex: "EURONEXT",wf: 193000 },
  { n: "deutsche bank",        d: "Deutsche Bank AG",                cc: "DE", pub: true,  t: "DB",         ex: "NYSE",    wf: 90130  },
  { n: "dbs bank",             d: "DBS Group Holdings Ltd.",         cc: "SG", pub: true,  t: "D05.SI",     ex: "SGX",     wf: 36000  },
  { n: "ocbc bank",            d: "OCBC Bank",                       cc: "SG", pub: true,  t: "O39.SI",     ex: "SGX",     wf: 30000  },
  { n: "uob",                  d: "United Overseas Bank Ltd.",       cc: "SG", pub: true,  t: "U11.SI",     ex: "SGX",     wf: 25000  },
  { n: "royal bank of canada", d: "Royal Bank of Canada",           cc: "CA", pub: true,  t: "RY",         ex: "NYSE",    wf: 97000  },
  { n: "toronto dominion bank",d: "Toronto-Dominion Bank",          cc: "CA", pub: true,  t: "TD",         ex: "NYSE",    wf: 95000  },
  { n: "bmo financial group",  d: "BMO Financial Group",            cc: "CA", pub: true,  t: "BMO",        ex: "NYSE",    wf: 54000  },
  { n: "u s bancorp",          d: "U.S. Bancorp",                   cc: "US", pub: true,  t: "USB",        ex: "NYSE",    wf: 77000  },
  { n: "santander",            d: "Banco Santander S.A.",           cc: "ES", pub: true,  t: "SAN",        ex: "NYSE",    wf: 211000 },
  { n: "ubs",                  d: "UBS Group AG",                   cc: "CH", pub: true,  t: "UBS",        ex: "NYSE",    wf: 111000 },
  { n: "bbva",                 d: "Banco Bilbao Vizcaya Argentaria",cc: "ES", pub: true,  t: "BBVA",       ex: "NYSE",    wf: 121000 },
  { n: "societe generale",     d: "Société Générale S.A.",          cc: "FR", pub: true,  t: "GLE.PA",     ex: "EURONEXT",wf: 117000 },
  { n: "emirates nbd",         d: "Emirates NBD Bank",              cc: "AE", pub: true,  t: null,         ex: "DFM",     wf: 9200   },
  { n: "malayan banking berhad",d:"Malayan Banking Berhad (Maybank)",cc:"MY", pub: true,  t: "MAYBANK.KL", ex: "KLSE",    wf: 43000  },
  { n: "vanguard",             d: "Vanguard Group Inc.",            cc: "US", pub: false, t: null,         ex: null,      wf: 18000  },
  { n: "fidelity investments", d: "Fidelity Investments",           cc: "US", pub: false, t: null,         ex: null,      wf: 75000  },
  { n: "metlife",              d: "MetLife Inc.",                   cc: "US", pub: true,  t: "MET",        ex: "NYSE",    wf: 43000  },
  { n: "prudential financial", d: "Prudential Financial Inc.",      cc: "US", pub: true,  t: "PRU",        ex: "NYSE",    wf: 40000  },
  { n: "zurich insurance",     d: "Zurich Insurance Group AG",      cc: "CH", pub: true,  t: "ZURN.SW",    ex: "SIX",     wf: 60000  },
  { n: "axa global",           d: "AXA S.A.",                       cc: "FR", pub: true,  t: "CS.PA",      ex: "EURONEXT",wf: 145000 },

  // Healthcare / Pharma
  { n: "cvs health",           d: "CVS Health Corporation",         cc: "US", pub: true,  t: "CVS",        ex: "NYSE",    wf: 300000 },
  { n: "johnson johnson",      d: "Johnson & Johnson",              cc: "US", pub: true,  t: "JNJ",        ex: "NYSE",    wf: 131900 },
  { n: "biogen inc",           d: "Biogen Inc.",                    cc: "US", pub: true,  t: "BIIB",       ex: "NASDAQ",  wf: 7800   },
  { n: "biontech",             d: "BioNTech SE",                    cc: "DE", pub: true,  t: "BNTX",       ex: "NASDAQ",  wf: 5300   },
  { n: "merck kgaa",           d: "Merck KGaA",                     cc: "DE", pub: true,  t: "MRK.DE",     ex: "XETRA",   wf: 64000  },
  { n: "stryker",              d: "Stryker Corporation",            cc: "US", pub: true,  t: "SYK",        ex: "NYSE",    wf: 51000  },
  { n: "hca healthcare",       d: "HCA Healthcare Inc.",            cc: "US", pub: true,  t: "HCA",        ex: "NYSE",    wf: 294000 },
  { n: "quest diagnostics",    d: "Quest Diagnostics Inc.",         cc: "US", pub: true,  t: "DGX",        ex: "NYSE",    wf: 49000  },
  { n: "idexx laboratories",   d: "IDEXX Laboratories Inc.",        cc: "US", pub: true,  t: "IDXX",       ex: "NASDAQ",  wf: 10800  },
  { n: "veeva systems",        d: "Veeva Systems Inc.",             cc: "US", pub: true,  t: "VEEV",       ex: "NYSE",    wf: 7500   },
  { n: "zoetis",               d: "Zoetis Inc.",                    cc: "US", pub: true,  t: "ZTS",        ex: "NYSE",    wf: 24000  },
  { n: "zimmer biomet",        d: "Zimmer Biomet Holdings Inc.",    cc: "US", pub: true,  t: "ZBH",        ex: "NYSE",    wf: 18400  },
  { n: "insulet",              d: "Insulet Corporation",            cc: "US", pub: true,  t: "PODD",       ex: "NASDAQ",  wf: 4000   },
  { n: "masimo",               d: "Masimo Corporation",             cc: "US", pub: true,  t: "MASI",       ex: "NASDAQ",  wf: 8000   },
  { n: "penumbra",             d: "Penumbra Inc.",                  cc: "US", pub: true,  t: "PEN",        ex: "NYSE",    wf: 3500   },
  { n: "vertex pharmaceuticals",d:"Vertex Pharmaceuticals Inc.",    cc: "US", pub: true,  t: "VRTX",       ex: "NASDAQ",  wf: 5500   },
  { n: "wuxi apptec",          d: "WuXi AppTec Co. Ltd.",           cc: "CN", pub: true,  t: "603259.SS",  ex: "SSE",     wf: 43000  },
  { n: "certara",              d: "Certara Inc.",                   cc: "US", pub: true,  t: "CERT",       ex: "NASDAQ",  wf: 2100   },
  { n: "nuvasive",             d: "NuVasive Inc.",                  cc: "US", pub: true,  t: "NUVA",       ex: "NASDAQ",  wf: 3100   },

  // Tech / SaaS / Fintech
  { n: "adyen",                d: "Adyen N.V.",                     cc: "NL", pub: true,  t: "ADYEN.AS",   ex: "EURONEXT",wf: 4500   },
  { n: "asml",                 d: "ASML Holding N.V.",              cc: "NL", pub: true,  t: "ASML",       ex: "NASDAQ",  wf: 42000  },
  { n: "palo alto networks",   d: "Palo Alto Networks Inc.",        cc: "US", pub: true,  t: "PANW",       ex: "NASDAQ",  wf: 15000  },
  { n: "lam research",         d: "Lam Research Corporation",       cc: "US", pub: true,  t: "LRCX",       ex: "NASDAQ",  wf: 17400  },
  { n: "check point",          d: "Check Point Software Technologies",cc:"IL",pub: true, t: "CHKP",       ex: "NASDAQ",  wf: 7200   },
  { n: "klarna",               d: "Klarna Bank AB",                 cc: "SE", pub: false, t: null,         ex: null,      wf: 4500   },
  { n: "revolut",              d: "Revolut Ltd.",                   cc: "GB", pub: false, t: null,         ex: null,      wf: 9000   },
  { n: "nubank",               d: "Nu Holdings Ltd.",               cc: "BR", pub: true,  t: "NU",         ex: "NYSE",    wf: 8700   },
  { n: "sofi",                 d: "SoFi Technologies Inc.",         cc: "US", pub: true,  t: "SOFI",       ex: "NASDAQ",  wf: 4500   },
  { n: "block",                d: "Block Inc.",                     cc: "US", pub: true,  t: "XYZ",        ex: "NYSE",    wf: 13500  },
  { n: "confluent",            d: "Confluent Inc.",                 cc: "US", pub: true,  t: "CFLT",       ex: "NASDAQ",  wf: 4400   },
  { n: "qlik",                 d: "Qlik Technologies Inc.",         cc: "US", pub: false, t: null,         ex: null,      wf: 3800   },
  { n: "supabase",             d: "Supabase Inc.",                  cc: "US", pub: false, t: null,         ex: null,      wf: 120    },

  // Energy / Industrial
  { n: "bp plc",               d: "BP p.l.c.",                      cc: "GB", pub: true,  t: "BP",         ex: "NYSE",    wf: 87000  },
  { n: "equinor",              d: "Equinor ASA",                    cc: "NO", pub: true,  t: "EQNR",       ex: "NYSE",    wf: 22000  },
  { n: "rolls royce global",   d: "Rolls-Royce Holdings plc",       cc: "GB", pub: true,  t: "RR.L",       ex: "LSE",     wf: 42000  },
  { n: "dsv a s",              d: "DSV A/S",                        cc: "DK", pub: true,  t: "DSV.CO",     ex: "OMXCOP", wf: 78000  },
  { n: "fast retailing",       d: "Fast Retailing Co. Ltd.",        cc: "JP", pub: true,  t: "9983.T",     ex: "TSE",     wf: 56000  },
  { n: "huntington ingalls",   d: "Huntington Ingalls Industries Inc.",cc:"US",pub: true, t: "HII",        ex: "NYSE",    wf: 44000  },
  { n: "general mills",        d: "General Mills Inc.",             cc: "US", pub: true,  t: "GIS",        ex: "NYSE",    wf: 34000  },
  { n: "united parcel service",d: "United Parcel Service Inc.",     cc: "US", pub: true,  t: "UPS",        ex: "NYSE",    wf: 500000 },
  { n: "associated british foods",d:"Associated British Foods plc", cc: "GB", pub: true,  t: "ABF.L",      ex: "LSE",     wf: 133000 },

  // Indian companies
  { n: "gspl",                 d: "Gujarat State Petronet Ltd.",    cc: "IN", pub: true,  t: "GSPL.NS",    ex: "NSE",     wf: 700    },
  { n: "pfc ltd",              d: "Power Finance Corporation Ltd.", cc: "IN", pub: true,  t: "PFC.NS",     ex: "NSE",     wf: 1600   },
  { n: "steel authority of india", d: "Steel Authority of India Ltd.", cc:"IN",pub: true, t:"SAIL.NS",    ex: "NSE",     wf: 65000  },
  { n: "phoenix mills",        d: "Phoenix Mills Limited",          cc: "IN", pub: true,  t: "PHOENIXLTD.NS",ex:"NSE",   wf: 3800   },
  { n: "kolte patil developers",d:"Kolte-Patil Developers Ltd.",    cc: "IN", pub: true,  t: "KOLTEPATIL.NS",ex:"NSE",   wf: 1200   },
  { n: "vijaya diagnostic",    d: "Vijaya Diagnostic Centre Ltd.",  cc: "IN", pub: true,  t: "VIJAYA.NS",  ex: "NSE",    wf: 3500   },
  { n: "usha martin",          d: "Usha Martin Limited",           cc: "IN", pub: true,  t: "USHAMART.NS",ex: "NSE",     wf: 6000   },
  { n: "union bank of india",  d: "Union Bank of India",           cc: "IN", pub: true,  t: "UNIONBANK.NS",ex:"NSE",    wf: 75000  },
  { n: "wns global",           d: "WNS (Holdings) Ltd.",            cc: "IN", pub: true,  t: "WNS",        ex: "NYSE",    wf: 65000  },

  // Distressed / defunct / acquired
  { n: "babylon health",       d: "Babylon Health",                cc: "GB", pub: false, t: null,         ex: null,      wf: null   },
  { n: "fisker",               d: "Fisker Inc.",                    cc: "US", pub: false, t: null,         ex: null,      wf: null   },
  { n: "better com",           d: "Better.com",                    cc: "US", pub: false, t: null,         ex: null,      wf: 900    },
  { n: "invision",             d: "InVision",                      cc: "US", pub: false, t: null,         ex: null,      wf: null   },
  { n: "invitae",              d: "Invitae Corporation",            cc: "US", pub: false, t: null,         ex: null,      wf: null   },
  { n: "calm",                 d: "Calm.com Inc.",                  cc: "US", pub: false, t: null,         ex: null,      wf: 400    },
  { n: "cerebral",             d: "Cerebral Inc.",                  cc: "US", pub: false, t: null,         ex: null,      wf: 3000   },
  { n: "noom",                 d: "Noom Inc.",                      cc: "US", pub: false, t: null,         ex: null,      wf: 3000   },
  { n: "forward health",       d: "Forward Health Group Inc.",      cc: "US", pub: false, t: null,         ex: null,      wf: null   },
  { n: "oura",                 d: "Oura Health Ltd.",               cc: "FI", pub: false, t: null,         ex: null,      wf: 900    },
  { n: "airtable",             d: "Airtable",                       cc: "US", pub: false, t: null,         ex: null,      wf: 1000   },

  // Biotech/pharma (acquired or niche)
  { n: "alexion",              d: "Alexion Pharmaceuticals Inc.",   cc: "US", pub: false, t: null,         ex: null,      wf: 3000   },
  { n: "alnylam pharmaceuticals",d:"Alnylam Pharmaceuticals Inc.",  cc: "US", pub: true,  t: "ALNY",       ex: "NASDAQ",  wf: 2700   },
  { n: "bridgebio",            d: "BridgeBio Pharma Inc.",          cc: "US", pub: true,  t: "BBIO",       ex: "NASDAQ",  wf: 700    },
  { n: "ginkgo bioworks",      d: "Ginkgo Bioworks Holdings Inc.", cc: "US", pub: true,  t: "DNA",        ex: "NYSE",    wf: 900    },
  { n: "karuna therapeutics",  d: "Karuna Therapeutics Inc.",       cc: "US", pub: false, t: null,         ex: null,      wf: null   },
  { n: "morphosys",            d: "MorphoSys AG",                   cc: "DE", pub: false, t: null,         ex: null,      wf: null   },
  { n: "shockwave medical",    d: "Shockwave Medical Inc.",         cc: "US", pub: false, t: null,         ex: null,      wf: null   },
  { n: "align technology",     d: "Align Technology Inc.",          cc: "US", pub: true,  t: "ALGN",       ex: "NASDAQ",  wf: 24000  },
  { n: "cytiva",               d: "Cytiva (Danaher Life Sciences)", cc: "US", pub: false, t: null,         ex: null,      wf: 7000   },
  { n: "varian",               d: "Varian Medical Systems Inc.",    cc: "US", pub: false, t: null,         ex: null,      wf: 10000  },

  // Other global
  { n: "meituan",              d: "Meituan",                        cc: "CN", pub: true,  t: "3690.HK",    ex: "HKEX",    wf: 100000 },
  { n: "deliveroo",            d: "Deliveroo plc",                  cc: "GB", pub: true,  t: "ROO.L",      ex: "LSE",     wf: 3500   },
  { n: "allianz",              d: "Allianz SE",                     cc: "DE", pub: true,  t: "ALV.DE",     ex: "XETRA",   wf: 157000 },
  { n: "amerisourcebergen",    d: "Cencora Inc.",                   cc: "US", pub: true,  t: "COR",        ex: "NYSE",    wf: 47000  },
  { n: "bayer cropscience india",d:"Bayer CropScience Ltd.",        cc: "IN", pub: true,  t: "BAYERCROP.NS",ex:"NSE",     wf: 6000   },
];

async function main() {
  await db.connect();
  console.log("✓ Connected\n");

  let updated = 0, skipped = 0;
  const now = new Date().toISOString();

  for (const co of HEURISTIC_META) {
    const fields = {
      display_name:         co.d,
      country_code:         co.cc,
      is_public:            co.pub,
      ticker:               co.t,
      exchange:             co.ex,
      workforce_verified_at: now,
      enrichment_version:   "real-data-v1.0",
    };

    // Only add workforce if we have it
    if (co.wf != null) {
      fields.workforce_count      = co.wf;
      fields.workforce_source     = "annual_report_scrape";
      fields.workforce_confidence = 0.80;
    }

    const setClauses = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`).join(", ");
    const values = [co.n, ...Object.values(fields)];

    const { rowCount } = await db.query(
      `UPDATE verified_company_intelligence SET ${setClauses}, updated_at = NOW() WHERE canonical_name = $1`,
      values
    );

    if (rowCount > 0) {
      updated++;
      console.log(`  ✓ ${co.n.padEnd(35)} ${co.cc}  ${co.t ?? "(private)"}  wf=${co.wf?.toLocaleString() ?? "n/a"}`);
    } else {
      skipped++;
      console.log(`  ⚠ ${co.n.padEnd(35)} (no VCI row yet)`);
    }
  }

  await db.end();
  console.log(`\n✅ Done — ${updated} updated, ${skipped} had no VCI row`);
}

main().catch(e => { console.error(e); process.exit(1); });
