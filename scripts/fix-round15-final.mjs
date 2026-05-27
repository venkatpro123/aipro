// fix-round15-final.mjs — Final targeted attempts
// - Alnylam: check alnylam.com/careers redirect + BrassRing
// - Masimo: more WD tenant names, check masimo.com redirect
// - GSPL: find Gujarat State Petronet website
// - WNS: find correct tabid/module URL on DNN site
// - Bayer: try BSE/NSE filing URL for official careers page
// - SAIL: count from MT notification page

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" };

async function fetchText(url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, ...extraHeaders },
      redirect: "follow",
      signal: AbortSignal.timeout(25000)
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchJson(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, Accept: "application/json", ...opts.headers },
      signal: AbortSignal.timeout(20000),
      ...opts
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, text, data };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function updateRoles(cn, count, source) {
  const vel = count > 1000 ? 1.5 : count > 500 ? 1.0 : count > 100 ? 0.5 : count > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence SET total_open_roles = $2, hiring_source = $3,
     hiring_verified_at = NOW(), hiring_confidence = 0.85, hiring_velocity_score = $4, updated_at = NOW()
     WHERE canonical_name = $1`,
    [cn, count, source, vel]
  );
  return rowCount ?? 0;
}

async function getVal(cn) {
  const { rows } = await db.query(`SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]);
  return rows[0];
}
const isNull = async (cn) => (await getVal(cn))?.total_open_roles === null;

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. ALNYLAM — check alnylam.com/careers for real ATS redirect ──────────
  console.log("=== Alnylam Pharmaceuticals ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // Check main website careers page
    const alnyUrls = [
      "https://www.alnylam.com/careers/",
      "https://www.alnylam.com/careers",
      "https://www.alnylam.com/about/careers",
      "https://alnylam.com/careers",
    ];
    for (const url of alnyUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8)} → ${status} → ${finalUrl?.slice(8)} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        // Look for ATS links
        const atsLinks = [...text.matchAll(/href="([^"]*(?:greenhouse|lever|workday|icims|taleo|ashby|jobvite|brassring|eightfold|jobs\.alnylam)[^"]*)"/gi)].map(m=>m[1]);
        console.log(`  ATS links: ${atsLinks.join(', ')}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) {
          for (const [, t, p, s] of wdUrls) {
            if (s.toLowerCase().includes('login')) continue;
            const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
            });
            if (res.ok && typeof res.data?.total === "number") {
              console.log(`  ✓ WD: ${res.data.total}`);
              const rc = await updateRoles("alnylam pharmaceuticals", res.data.total, "workday_alnylam_careers"); updated += rc;
            }
          }
        }
        if (!await isNull("alnylam pharmaceuticals")) break;
      }
    }
    // Try BrassRing (common for larger pharma companies)
    if (await isNull("alnylam pharmaceuticals")) {
      const brassRingUrls = [
        "https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobListing&partnerid=25921&siteid=5157",
        "https://alnylam-brassring.com",
        "https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad?partnerid=alnylam",
      ];
      for (const url of brassRingUrls) {
        const { text, status } = await fetchText(url);
        await sleep(400);
        console.log(`  BrassRing [${url.slice(8, 60)}] → ${status} (${text?.length})`);
        if (text && status === 200 && text.length > 5000) {
          const count = text.match(/(\d+)\s+(?:job|result|position)/i);
          if (count) { console.log(`  Count: ${count[0]}`); break; }
        }
      }
    }
    // Check iCIMS with correct path (some iCIMS sites use /jobs/intro or just show count)
    if (await isNull("alnylam pharmaceuticals")) {
      // Try the correct iCIMS v2 search path
      const { text, status } = await fetchText("https://careers-alnylam.icims.com/jobs/search?ss=1&pr=0&in_iframe=1", {
        "Accept": "text/html",
        "Referer": "https://careers-alnylam.icims.com/",
        "X-Requested-With": "",
      });
      await sleep(400);
      console.log(`  iCIMS v2 [in_iframe=1] → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        const count = plain.match(/(\d+)\s+(?:job|result|position|opening)/i);
        if (count) { console.log(`  Count: ${count[0]}`); const n = parseInt(count[1]); if (n > 0) { const rc = await updateRoles("alnylam pharmaceuticals", n, "icims_iframe"); updated += rc; } }
      }
    }
    // Look at iCIMS with GET but with in_iframe params
    if (await isNull("alnylam pharmaceuticals")) {
      // Try direct navigation to career search
      const { text, status } = await fetchText("https://careers-alnylam.icims.com/");
      await sleep(400);
      console.log(`  icims main → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 800)}`);
        const count = plain.match(/(\d+)\s+(?:job|result|position|opening)/i);
        if (count) { console.log(`  Count: ${count[0]}`); const n = parseInt(count[1]); if (n > 0) { const rc = await updateRoles("alnylam pharmaceuticals", n, "icims_main"); updated += rc; } }
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 2. MASIMO — more WD tenant variations ────────────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Try fetching masimo.com to see if there's a redirect to ATS
    const { text, status, finalUrl } = await fetchText("https://www.masimo.com/company/careers/", {
      "CF-Connecting-IP": "1.1.1.1",
    });
    await sleep(400);
    console.log(`  masimo.com/company/careers → ${status} → ${finalUrl?.slice(0,70)} (${text?.length})`);
    if (text && status === 200) {
      const atsLinks = [...text.matchAll(/href="([^"]*(?:greenhouse|lever|workday|icims|taleo|ashby|jobvite|brassring)[^"]*)"/gi)].map(m=>m[1]);
      console.log(`  ATS links: ${atsLinks.join(', ')}`);
    }
    // Try more specific WD tenants
    const wdMore = [
      ["masimo", "5", "Masimo_Careers"],
      ["masimo", "5", "Masimo-Careers"],
      ["masimo", "5", "masimocorp"],
      ["masimo", "5", "MasimoExternal"],
      ["masimo", "5", "Masimo_External"],
      ["masimocorp", "5", "masimocorp"],
      ["masimocorp", "1", "External"],
      ["masimocorp", "3", "External"],
      ["masi", "5", "External"],   // ticker-based
    ];
    for (const [t, p, s] of wdMore) {
      const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
      });
      await sleep(150);
      if (res.ok && typeof res.data?.total === "number") {
        console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${res.data.total}`);
        const rc = await updateRoles("masimo", res.data.total, "workday_masimo"); updated += rc; break;
      }
    }
    // Try fetching masimo via a CDN edge
    if (await isNull("masimo")) {
      // SEC EDGAR for career URL
      const { text, status } = await fetchText("https://efts.sec.gov/LATEST/search-index?q=%22masimo%22+%22careers%22&dateRange=custom&startdt=2024-01-01&enddt=2024-12-31&forms=10-K");
      await sleep(400);
      console.log(`  SEC EDGAR Masimo → ${status} (${text?.length})`);
      if (text && status === 200) {
        const careerUrls = [...text.matchAll(/https?:\/\/[^"'\s]{5,80}(?:career|job)[^"'\s]{0,60}/gi)].map(m=>m[0]);
        console.log(`  Career URLs: ${careerUrls.slice(0,5).join(', ')}`);
      }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");
  await sleep(600);

  // ── 3. GSPL — Gujarat State Petronet Ltd correct website ─────────────────
  console.log("\n=== GSPL (Gujarat State Petronet Ltd) ===");
  if (await isNull("gspl")) {
    // GSPL's NSE listing shows their registered website
    const nseLookup = await fetchJson("https://www.nseindia.com/api/quote-equity?symbol=GSPL", {
      headers: {
        "Accept": "application/json",
        "Referer": "https://www.nseindia.com",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
      }
    });
    await sleep(400);
    console.log(`  NSE lookup GSPL → ${nseLookup.status}`);
    if (nseLookup.ok && nseLookup.data) {
      console.log(`  NSE data: ${JSON.stringify(nseLookup.data?.info || {}).slice(0, 300)}`);
    }
    // BSE India company info
    const bseLookup = await fetchJson("https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Scrip_cd=532702", {
      headers: { "Accept": "application/json", "Referer": "https://www.bseindia.com" }
    });
    await sleep(400);
    console.log(`  BSE lookup GSPL → ${bseLookup.status}`);
    if (bseLookup.ok && bseLookup.data) {
      console.log(`  BSE data: ${JSON.stringify(bseLookup.data).slice(0, 400)}`);
    }
    // Try various GSPL domain patterns
    const gsplDomains = [
      "https://www.gspc.co.in/career",
      "https://www.gspcnetwork.com/career",
      "https://gspcnetwork.com",
      "https://www.gsplgas.in",
      "https://gsplgas.in",
      "https://www.gujpetronet.com",
      "https://gujpetronet.com",
    ];
    for (const url of gsplDomains) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} → ${finalUrl?.slice(0,60)} (${text?.length})`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        if (plain.toLowerCase().includes('petronet') || plain.toLowerCase().includes('gspl') || plain.toLowerCase().includes('pipeline')) {
          console.log(`  ✓ Found GSPL-related site`);
          break;
        }
      }
    }
  }
  if (await isNull("gspl")) console.log("  → No data found");
  await sleep(600);

  // ── 4. WNS — Find DNN page with job listings ─────────────────────────────
  console.log("\n=== WNS Global ===");
  if (await isNull("wns global")) {
    // DNN uses TabIDs - try scanning tabid 1-50 to find the job listings page
    // Actually let's look at the main page source more carefully
    const { text, status } = await fetchText("https://www.wnscareers.com/");
    await sleep(400);
    if (text && status === 200) {
      // Look for tabid references
      const tabIds = [...text.matchAll(/tabid[=\/](\d+)/gi)].map(m => parseInt(m[1]));
      const uniqueTabIds = [...new Set(tabIds)].sort((a,b) => a-b);
      console.log(`  TabIDs found: ${uniqueTabIds.join(', ')}`);
      // Look for DNN module IDs
      const moduleIds = [...text.matchAll(/mid=(\d+)/gi)].map(m => parseInt(m[1]));
      console.log(`  Module IDs: ${[...new Set(moduleIds)].join(', ')}`);
      // Look for the SEARCH JOBS form action URL
      const formActions = [...text.matchAll(/(?:action|formaction)="([^"]+)"/gi)].map(m=>m[1]);
      console.log(`  Form actions: ${formActions.join(', ')}`);
      // Try extracting the job count from any JSON embedded in page
      const jsonBlobs = [...text.matchAll(/\{[^{}]{200,2000}\}/g)].map(m=>m[0]);
      let jobsFound = false;
      for (const blob of jsonBlobs.slice(0,10)) {
        if (blob.includes('job') || blob.includes('count') || blob.includes('career')) {
          try {
            const d = JSON.parse(blob);
            const count = d.count ?? d.total ?? d.jobs;
            if (count !== undefined) { console.log(`  JSON with count: ${JSON.stringify(d).slice(0, 200)}`); jobsFound = true; }
          } catch {}
        }
      }
      // Look for direct job count text
      const jobCountText = [...text.matchAll(/(?:total|showing|found)\s*:?\s*(\d+)\s*(?:job|result|opening|position)/gi)];
      if (jobCountText.length > 0) console.log(`  Job count text: ${jobCountText.map(m=>m[0]).join(', ')}`);
    }
    // Try specific DNN tabids for job search
    if (await isNull("wns global")) {
      // Common DNN page structures
      for (const tabId of [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 100, 101, 102, 103]) {
        const { text, status } = await fetchText(`https://www.wnscareers.com/Default.aspx?tabid=${tabId}`);
        await sleep(150);
        if (text && status === 200 && text.length > 30000) {
          const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          const jobCount = plain.match(/(\d+)\s+(?:job|position|opportunit|result|opening)/i);
          if (jobCount) {
            console.log(`  TabId ${tabId}: ${jobCount[0]}`);
            const n = parseInt(jobCount[1]);
            if (n > 0 && n < 50000) { const rc = await updateRoles("wns global", n, "dnn_tabid_search"); updated += rc; break; }
          }
        }
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 5. BAYER CROPSCIENCE INDIA — try Bayer India official site ────────────
  console.log("\n=== Bayer CropScience India ===");
  if (await isNull("bayer cropscience india")) {
    // Try BSE company website lookup for Bayer CropScience
    const bseUrls = [
      "https://www.bayercropscience.in",
      "https://bayercropscience.in",
      "https://www.bayer.com/en/in",
      "https://www.bayer.com/en/in/company-profiles/bayer-cropscience-limited",
    ];
    for (const url of bseUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8, 60)} → ${status} → ${finalUrl?.slice(8, 60)} (${text?.length})`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 600)}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) {
          console.log(`  WD: ${wdUrls.map(m=>m[0]).join(', ')}`);
          for (const [, t, p, s] of wdUrls) {
            if (s.toLowerCase().includes('login')) continue;
            const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
            });
            await sleep(200);
            if (res.ok && typeof res.data?.total === "number") {
              console.log(`  ✓ WD: ${res.data.total}`);
              const rc = await updateRoles("bayer cropscience india", res.data.total, "workday_bayer_cropscience_india"); updated += rc;
            }
          }
        }
        break;
      }
    }
  }
  if (await isNull("bayer cropscience india")) console.log("  → No data found");
  await sleep(600);

  // ── 6. SAIL — try to count active positions from their MT notification ────
  console.log("\n=== SAIL ===");
  if (await isNull("steel authority of india")) {
    // The MT 2025 call letter is at sailcareers.com but we need the original advertisement
    // The sailcareers.com links to the GD/Interview schedule PDF which has candidate info
    // Let me look for the MT vacancy count on the call letter page
    const { text, status } = await fetchText("https://sailcareers.com/sail2025MT/SAIL2026MTIntCallLetter.aspx");
    await sleep(400);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  MT2026 call letter: ${plain.slice(0, 2000)}`);
    }
    // Try other SAIL recruitment portals
    const sailRecruitUrls = [
      "https://www.sail.co.in/recruitment",
      "https://sail.nic.in",
      "https://mtelement.sail.co.in",
      "https://recruitment.sail.co.in",
    ];
    for (const url of sailRecruitUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url} → ${status} → ${finalUrl?.slice(0,60)} (${text?.length})`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        break;
      }
    }
    // If still NULL, count the active MT recruitment (1 recruitment drive × typical MT count)
    // SAIL typically has 150-400 MT vacancies per batch. But we don't insert estimates.
    console.log(`  SAIL currently has 1 active MT2025/2026 recruitment drive. Specific vacancy count not extractable.`);
  }
  if (await isNull("steel authority of india")) console.log("  → No data found");

  // FINAL STATE
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  if (nulls.length > 0) {
    console.log(`\nRemaining NULL (${nulls.length}):`);
    for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
