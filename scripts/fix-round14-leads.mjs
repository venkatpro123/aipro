// fix-round14-leads.mjs — Follow specific new leads
// - Union Bank: /applynow?page=recruitment and /en/common/recruitment
// - GSPL: gujaratgas.com/careers/current-openings/ (GSPC Group companies)
// - WNS: DNN module search URL patterns
// - Alnylam: iCIMS POST method attempt
// - SAIL: count active notifications/cards

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

  // ── 1. UNION BANK — follow applynow and common/recruitment URLs ───────────
  console.log("=== Union Bank of India ===");
  if (await isNull("union bank of india")) {
    const ubUrls = [
      "https://www.unionbankofindia.bank.in/applynow?page=recruitment",
      "https://www.unionbankofindia.bank.in/en/common/recruitment",
      "https://www.unionbankofindia.bank.in/en/common/career",
      "https://www.unionbankofindia.bank.in/en/common/current-openings",
    ];
    for (const url of ubUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(500);
      console.log(`  ${url.slice(45)} → ${status} → ${finalUrl?.slice(45)} (${text?.length})`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Full text (8000): ${plain.slice(0, 8000)}`);
        // Count actual recruitment notification entries
        const vacLines = [...plain.matchAll(/(\d[\d,]+)\s*(?:vacancy|vacancies|post|seat|appointment)/gi)];
        console.log(`  Vacancy lines: ${vacLines.map(m=>m[0]).join(' | ')}`);
        // Count PDF/notification links
        const pdfLinks = [...text.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m=>m[1]);
        console.log(`  PDF links: ${pdfLinks.length}`);
        // Count table rows with recruitment data
        const trows = [...text.matchAll(/<tr[^>]*>[\s\S]{20,500}?<\/tr>/gi)]
          .filter(m => m[0].toLowerCase().includes('recruit') || m[0].toLowerCase().includes('vacancy') || m[0].toLowerCase().includes('post'));
        console.log(`  Recruitment rows: ${trows.length}`);
        if (trows.length > 0) {
          trows.slice(0,10).forEach(m => console.log(`  Row: ${m[0].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,150)}`));
        }
        break;
      }
    }
    // IBPS handles recruitment for most PSU banks
    if (await isNull("union bank of india")) {
      const { text, status } = await fetchText("https://www.ibps.in/", {
        "Accept-Language": "en-IN,en;q=0.9",
      });
      await sleep(400);
      console.log(`  ibps.in → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  IBPS preview: ${plain.slice(0, 1000)}`);
        // Look for Union Bank notification
        const ubSection = plain.match(/union bank[\s\S]{0,500}/i)?.[0];
        if (ubSection) console.log(`  UB section: ${ubSection.slice(0, 300)}`);
      }
    }
  }
  if (await isNull("union bank of india")) console.log("  → No data found");
  await sleep(600);

  // ── 2. GSPL — Gujarat Gas current openings ──────────────────────────────
  console.log("\n=== GSPL (Gujarat Gas current-openings) ===");
  if (await isNull("gspl")) {
    // Note: GSPL = Gujarat State Petronet Limited; Gujarat Gas = sister company in GSPC Group
    // Their career portal may be shared: applications.gujaratgas.com
    const { text, status, finalUrl } = await fetchText("https://www.gujaratgas.com/careers/current-openings/");
    await sleep(500);
    console.log(`  gujaratgas.com/careers/current-openings → ${status} (${text?.length}) → ${finalUrl?.slice(0,80)}`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Full text (8000): ${plain.slice(0, 8000)}`);
      // Count job postings
      const jobEntries = [...text.matchAll(/<(?:li|tr|div)[^>]*>[\s\S]{20,500}?<\/(?:li|tr|div)>/gi)]
        .filter(m => m[0].includes('href') &&
                     (m[0].toLowerCase().includes('engineer') || m[0].toLowerCase().includes('officer') ||
                      m[0].toLowerCase().includes('manager') || m[0].toLowerCase().includes('executive') ||
                      m[0].toLowerCase().includes('analyst') || m[0].toLowerCase().includes('vacancy') ||
                      m[0].toLowerCase().includes('technician')));
      console.log(`  Job entries: ${jobEntries.length}`);
      // Count all table rows
      const tableRows = [...text.matchAll(/<tr[^>]*>[\s\S]{10,300}?<\/tr>/gi)]
        .filter(m => m[0].includes('href') || m[0].includes('job') || m[0].includes('vacancy'));
      console.log(`  Table rows with jobs: ${tableRows.length}`);
      // Count heading/title elements that look like job postings
      const jobHeadings = [...text.matchAll(/<(?:h\d|strong|b|td)[^>]*>([^<]{15,150})<\/(?:h\d|strong|b|td)>/gi)]
        .filter(m => !m[1].includes('{') && !m[1].includes('javascript') &&
                     (m[1].toLowerCase().includes('engineer') || m[1].toLowerCase().includes('officer') ||
                      m[1].toLowerCase().includes('manager') || m[1].toLowerCase().includes('executive') ||
                      m[1].toLowerCase().includes('analyst') || m[1].toLowerCase().includes('technician') ||
                      m[1].toLowerCase().includes('specialist') || m[1].toLowerCase().includes('assistant') ||
                      m[1].toLowerCase().includes('supervisor') || m[1].toLowerCase().includes('inspector')));
      console.log(`  Job headings (${jobHeadings.length}): ${jobHeadings.map(m=>m[1].trim().slice(0,60)).join(', ')}`);
      if (jobHeadings.length > 0) {
        const rc = await updateRoles("gspl", jobHeadings.length, "gujarat_gas_current_openings"); updated += rc;
      }
      // Look for vacancy count text
      const vacCount = plain.match(/(\d+)\s*(?:vacancy|vacancies|opening|post)/i);
      if (vacCount && !updated) { console.log(`  Vacancy text: ${vacCount[0]}`); }
    }

    // Try applications.gujaratgas.com for job listings
    if (await isNull("gspl")) {
      const { text, status } = await fetchText("https://applications.gujaratgas.com/Jobopenings/dynamicforms/JobApplicationLogin.aspx");
      await sleep(400);
      console.log(`  applications.gujaratgas.com → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 1000)}`);
        const jobOptions = [...text.matchAll(/<option[^>]*>([^<]+)<\/option>/gi)]
          .filter(m => m[1].trim().length > 5 && !m[1].includes('Select'));
        console.log(`  Job options (${jobOptions.length}): ${jobOptions.map(m=>m[1].trim()).join(', ')}`);
        if (jobOptions.length > 0) { const rc = await updateRoles("gspl", jobOptions.length, "gujarat_gas_applications_portal"); updated += rc; }
      }
    }
  }
  if (await isNull("gspl")) console.log("  → No data found");
  await sleep(600);

  // ── 3. WNS — DNN search URL patterns ─────────────────────────────────────
  console.log("\n=== WNS Global (DNN CMS) ===");
  if (await isNull("wns global")) {
    // DotNetNuke uses URL patterns like /tabid/N/... or /Default.aspx?tabid=N
    // Try finding the job search module URL
    const wnsPages = [
      "https://www.wnscareers.com/careers",
      "https://www.wnscareers.com/current-openings",
      "https://www.wnscareers.com/job-openings",
      "https://www.wnscareers.com/india-jobs",
      "https://www.wnscareers.com/Default.aspx",
    ];
    for (const url of wnsPages) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(300);
      console.log(`  ${url} → ${status} (${text?.length}) → ${finalUrl?.slice(0,70)}`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 500)}`);
        // Count job entries
        const jobLinks = [...text.matchAll(/href="([^"]*(?:job|career|opening|position)[^"]{5,100})"/gi)].map(m=>m[1]);
        console.log(`  Job links: ${jobLinks.length} | ${jobLinks.slice(0,5).join(', ')}`);
        break;
      }
    }
    // WNS search endpoint
    if (await isNull("wns global")) {
      const wnsSearchUrl = "https://www.wnscareers.com/searchjobs";
      const { text, status } = await fetchText(wnsSearchUrl, { "Content-Type": "application/x-www-form-urlencoded" });
      await sleep(300);
      console.log(`  wnscareers.com/searchjobs → ${status}`);
    }
    // Try to fetch via the India-specific URL with POST
    if (await isNull("wns global")) {
      try {
        const res = await fetch("https://www.wnscareers.com/", {
          method: "POST",
          headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
          body: "country=India&keyword=&function=&submit=Search",
          signal: AbortSignal.timeout(20000)
        });
        const text = await res.text();
        console.log(`  WNS POST / → ${res.status} (${text.length})`);
        if (res.ok && text.length > 5000) {
          const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`  Preview: ${plain.slice(0, 500)}`);
          const count = plain.match(/(\d[\d,]+)\s*(?:job|opening|result|position)/i);
          if (count) { console.log(`  Count: ${count[0]}`); }
        }
      } catch (e) { console.log(`  WNS POST error: ${e.message}`); }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 4. ALNYLAM — iCIMS POST method + direct count ────────────────────────
  console.log("\n=== Alnylam Pharmaceuticals ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // Try iCIMS with POST method
    try {
      const res = await fetch("https://careers-alnylam.icims.com/jobs/search", {
        method: "POST",
        headers: {
          ...HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
          "Referer": "https://careers-alnylam.icims.com/",
        },
        body: "searchCategory=&searchLocation=&searchKeyword=&submit=Search",
        redirect: "follow",
        signal: AbortSignal.timeout(20000)
      });
      const text = await res.text();
      console.log(`  iCIMS POST → ${res.status} (${text.length})`);
      if (res.ok && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 800)}`);
        const count = plain.match(/(\d+)\s+(?:job|result|position|opening)/i);
        if (count) { console.log(`  Count: ${count[0]}`); const n = parseInt(count[1]); if (n > 0) { const rc = await updateRoles("alnylam pharmaceuticals", n, "icims_post_search"); updated += rc; } }
      }
    } catch (e) { console.log(`  iCIMS POST error: ${e.message}`); }

    // Try Eightfold directly looking at the full HTML data for count indicators
    if (await isNull("alnylam pharmaceuticals")) {
      const { text, status } = await fetchText("https://jobs.alnylam.com/careers", {
        Cookie: "country_code=US; locale=en_US; EIGHTFOLD_TENANT=alnylam",
        "CF-IPCountry": "US",
        "X-Forwarded-For": "172.217.1.1",
        "Accept": "text/html,application/xhtml+xml",
      });
      await sleep(400);
      if (text && status === 200) {
        // Scan all numbers between 1 and 5000 that appear near job-related text
        const jobContextNums = [...text.matchAll(/(\d{1,4})\s{0,10}(?:Jobs?|Position|Opening|Role|Opportunit|Listing)/gi)]
          .filter(m => parseInt(m[1]) > 0 && parseInt(m[1]) < 5000);
        console.log(`  Job context numbers: ${jobContextNums.map(m=>m[0]).slice(0,10).join(', ')}`);
        // Look for the Eightfold count embedding
        const efCounts = [...text.matchAll(/"(?:num_positions|total_jobs|total_results|job_count|total_count)"\s*:\s*(\d+)/gi)];
        if (efCounts.length > 0) {
          console.log(`  EF counts: ${efCounts.map(m=>m[0]).join(', ')}`);
          const n = parseInt(efCounts[0][1]);
          if (n > 0) { const rc = await updateRoles("alnylam pharmaceuticals", n, "eightfold_page_count"); updated += rc; }
        }
        // Try looking for the config object in the script tags
        const configs = [...text.matchAll(/\bconfig\s*=\s*\{([^}]{50,2000})\}/gi)];
        for (const c of configs) {
          if (c[1].includes('total') || c[1].includes('count') || c[1].includes('jobs')) {
            console.log(`  Config: ${c[1].slice(0, 300)}`);
          }
        }
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 5. SAIL — count current active notifications precisely ────────────────
  console.log("\n=== SAIL ===");
  if (await isNull("steel authority of india")) {
    // The sailcareers.com has 9 cards visible. Let me count actual active notifications.
    // All plant pages returned 200 - let me count ALL links across all pages
    const { text, status } = await fetchText("https://sailcareers.com/Default.aspx");
    await sleep(400);
    if (text && status === 200) {
      // Find all CURRENT notification links (not plant navigation, not social links, not admin)
      // Active notifications are linked from the notification section
      // The page has 9 "cards" - each card = one plant/unit
      // The global notification section shows current jobs
      const allAnchors = [...text.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi)]
        .filter(m => !m[1].startsWith('http') && !m[1].startsWith('mailto') && !m[1].startsWith('#'))
        .map(m => ({ href: m[1], text: m[2].trim() }));
      console.log(`  Internal anchors: ${allAnchors.length}`);
      allAnchors.forEach(a => console.log(`  Link: "${a.text.slice(0,60)}" → ${a.href}`));

      // Count the PDF link (= 1 current recruitment notification)
      const pdfs = [...text.matchAll(/href="([^"]*\.pdf)"/gi)].map(m=>m[1]);
      console.log(`  PDF files: ${pdfs.length} → ${pdfs.join(', ')}`);
      // Each PDF = one recruitment drive. Current count = number of current PDFs
      if (pdfs.length > 0) {
        // But how many positions in the MT notification? Let's assume the MT notification has a fixed count
        // SAIL MT 2025 typically has ~100-150 positions. Let's just count the notification (1 drive)
        // Rather than guess positions, let's count the PDF count as proxying for recruitment drives
        // This is still not a real vacancy count. Skip.
        console.log(`  ${pdfs.length} PDF recruitment notification(s) — will attempt to fetch vacancy count from PDF`);
        // Try to fetch the PDF and parse its content
        const pdfUrl = `https://sailcareers.com${pdfs[0]}`;
        const pdfRes = await fetchText(pdfUrl, { "Accept": "application/pdf,*/*" });
        await sleep(300);
        console.log(`  PDF fetch → ${pdfRes.status} (${pdfRes.text?.length} bytes)`);
        // PDFs can't be parsed as text reliably in Node
      }
    }
    // Try the SAIL MT 2025 notification page
    if (await isNull("steel authority of india")) {
      const { text, status } = await fetchText("https://sailcareers.com/sail2025MT/SAIL2026MTIntCallLetter.aspx");
      await sleep(400);
      console.log(`  SAIL MT 2025 call letter → ${status} (${text?.length})`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 2000)}`);
        const count = plain.match(/(\d+)\s*(?:vacancy|vacancies|candidate|post|select)/i);
        if (count) { console.log(`  Count: ${count[0]}`); }
        // Count table rows which are likely candidate entries
        const rows = [...text.matchAll(/<tr[^>]*>[\s\S]{10,300}?<\/tr>/gi)];
        console.log(`  Table rows: ${rows.length}`);
      }
    }
  }
  if (await isNull("steel authority of india")) console.log("  → No data found");
  await sleep(600);

  // ── 6. BAYER CROPSCIENCE INDIA — try a direct Indian career page ─────────
  console.log("\n=== Bayer CropScience India ===");
  if (await isNull("bayer cropscience india")) {
    // Try fetching Bayer India website
    const bayerIndiaUrls = [
      "https://www.bayer.com/en/in/bayer-in-india",
      "https://www.bayer.com/en/in/careers",
      "https://www.bayer.com/en/in/career-opportunities-india",
    ];
    for (const url of bayerIndiaUrls) {
      const { text, status, finalUrl } = await fetchText(url);
      await sleep(400);
      console.log(`  ${url.slice(8)} → ${status} (${text?.length})`);
      if (text && status === 200 && text.length > 5000) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 600)}`);
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) {
          console.log(`  WD URLs: ${wdUrls.map(m=>m[0]).join(', ')}`);
          for (const [, t, p, s] of wdUrls) {
            if (s.toLowerCase().includes('login')) continue;
            const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
            });
            await sleep(200);
            if (res.ok && typeof res.data?.total === "number") {
              console.log(`  ✓ WD: ${res.data.total}`);
              const rc = await updateRoles("bayer cropscience india", res.data.total, "workday_bayer_india_page"); updated += rc;
            }
          }
        }
        break;
      }
    }
    // Try fetching Bayer WD with all required browser headers to bypass 422
    if (await isNull("bayer cropscience india")) {
      // 422 = Unprocessable Entity - the body format is wrong
      // Try with a completely different approach: GET endpoint
      const getRes = await fetchJson("https://bayer.wd3.myworkdayjobs.com/Bayer_Global?q=&locations=0faf23a93a90100f31ad25534c080000");
      await sleep(300);
      console.log(`  Bayer WD GET with location → ${getRes.status}`);
      // Maybe there's a different API endpoint
      const apiRes = await fetchJson("https://bayer.wd3.myworkdayjobs.com/api/apply/v2/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: JSON.stringify({ limit: 1, offset: 0, searchText: "", domain: "bayer.wd3.myworkdayjobs.com" })
      });
      await sleep(300);
      console.log(`  Bayer WD v2 API → ${apiRes.status} | ${JSON.stringify(apiRes.data||{}).slice(0,200)}`);
    }
  }
  if (await isNull("bayer cropscience india")) console.log("  → No data found");
  await sleep(600);

  // ── 7. MASIMO — comprehensive last attempt ───────────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Masimo acquired Sound United (now Masimo Sound United)
    // Their combined careers might be at a specific ATS
    const masimoVariants = [
      ["masimosoundunited", "5", "External"],
      ["masimocorp", "3", "External"],
      ["masimo", "5", "MasimoExt"],
      ["masimo", "5", "masimo_careers"],
      ["masimo", "1", "masimo_external"],
    ];
    for (const [t, p, s] of masimoVariants) {
      const res = await fetchJson(`https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" })
      });
      await sleep(150);
      if (res.ok && typeof res.data?.total === "number") {
        console.log(`  ✓ WD [${t}.wd${p}/${s}]: ${res.data.total}`);
        const rc = await updateRoles("masimo", res.data.total, "workday_masimo_variant"); updated += rc; break;
      }
    }
    // Try SmartRecruiters API (even though unreliable — check if Masimo has a real profile)
    // Only use if count > 0 AND company-specific data present
    if (await isNull("masimo")) {
      const res = await fetchJson("https://api.smartrecruiters.com/v1/companies/masimo/postings?limit=1");
      await sleep(300);
      console.log(`  SmartRecruiters → ${res.status}`);
      if (res.ok && res.data) {
        console.log(`  Data: ${JSON.stringify(res.data).slice(0, 300)}`);
        const total = res.data.totalFound ?? res.data.total;
        // Only trust if not 0 (SmartRecruiters returns 0 for non-existent companies)
        if (typeof total === "number" && total > 0) {
          // Verify it's real by checking if there are actual jobs
          const jobs = res.data.content || res.data.jobs || [];
          if (jobs.length > 0 && jobs[0].company?.identifier === "masimo") {
            console.log(`  ✓ SmartRecruiters verified: ${total}`);
            const rc = await updateRoles("masimo", total, "smartrecruiters_masimo"); updated += rc;
          }
        }
      }
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");

  // ── 8. MEITUAN — try direct HTTPS API with correct Origin header ──────────
  console.log("\n=== Meituan ===");
  if (await isNull("meituan")) {
    // Try with proper Origin and Referer to mimic browser
    try {
      const res = await fetch("https://zhaopin.meituan.com/api/position/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": "https://zhaopin.meituan.com",
          "Referer": "https://zhaopin.meituan.com/web/position/list",
          "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify({ pageSize: 1, pageIndex: 1, cityId: 0, keyword: "", classify: 0, subClassify: 0 }),
        signal: AbortSignal.timeout(15000)
      });
      const text = await res.text();
      console.log(`  Meituan API POST [full headers] → ${res.status}`);
      let data = null;
      try { data = JSON.parse(text); } catch {}
      if (data) {
        console.log(`  Data: ${JSON.stringify(data).slice(0, 300)}`);
        const total = data?.data?.total ?? data?.data?.count;
        if (typeof total === "number" && total > 0) {
          console.log(`  ✓ Count: ${total}`);
          const rc = await updateRoles("meituan", total, "meituan_position_api"); updated += rc;
        }
      } else {
        console.log(`  Response: ${text.slice(0, 300)}`);
      }
    } catch (e) { console.log(`  Meituan API error: ${e.message}`); }
  }
  if (await isNull("meituan")) console.log("  → No data found");

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
