// fix-round4-leads.mjs
// Use specific leads found:
// - Phoenix Mills: Oracle HCM REST API
// - Kolte-Patil: job IDs 30, 31 → count valid IDs
// - WNS Global: wnscareers.com
// - Union Bank: recruitment page (200, 12 rows)
// - Alnylam: /careers/api/jobs returned 200

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchText(url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, ...extraHeaders },
      redirect: "follow",
      signal: AbortSignal.timeout(20000)
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function fetchJSON(url, opts = {}) {
  try {
    const headers = { Accept: "application/json", "User-Agent": "Mozilla/5.0", ...(opts.headers || {}) };
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000), ...opts });
    if (!res.ok) return { ok: false, status: res.status };
    const text = await res.text();
    try { return { ok: true, data: JSON.parse(text), raw: text }; }
    catch { return { ok: false, raw: text }; }
  } catch (e) { return { ok: false, error: e.message }; }
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

async function isNull(cn) {
  const { rows } = await db.query(`SELECT total_open_roles FROM verified_company_intelligence WHERE canonical_name = $1`, [cn]);
  return rows[0]?.total_open_roles === null || rows[0]?.total_open_roles === undefined;
}

async function tryGreenhouse(token) {
  const { ok, data } = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
  await sleep(300);
  return (ok && Array.isArray(data?.jobs)) ? data.jobs.length : null;
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. PHOENIX MILLS — Oracle HCM REST API ────────────────────────────────
  console.log("=== Phoenix Mills (Oracle HCM) ===");
  if (await isNull("phoenix mills")) {
    // The ATS URL found: https://egeg.fa.em3.oraclecloud.com/hcmUI/CandidateExperience...
    // Oracle HCM REST API for job requisitions
    const oracleApis = [
      "https://egeg.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?limit=1&fields=Id&onlyData=true",
      "https://egeg.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/jobs?limit=1&onlyData=true",
      "https://egeg.fa.em3.oraclecloud.com/hcmCoreApi/resources/11.13.0.0/jobs?limit=1",
    ];
    for (const url of oracleApis) {
      const { ok, data, status, raw } = await fetchJSON(url); await sleep(400);
      console.log(`  ${url.slice(8, 70)} → ${status ?? 'ok'}`);
      if (!ok || !data) { console.log(`  raw: ${(raw||'').slice(0, 100)}`); continue; }
      const total = data.totalResults ?? data.count ?? data.total ?? (Array.isArray(data.items) ? data.items.length : null);
      if (total !== undefined && total !== null) {
        console.log(`  → ${total} jobs (Oracle HCM)`);
        const rc = await updateRoles("phoenix mills", total, "oracle_hcm_api"); updated += rc; break;
      }
      console.log(`  Data: ${JSON.stringify(data).slice(0, 200)}`);
    }
    // Try the candidate experience page directly to count
    if (await isNull("phoenix mills")) {
      const { text, status } = await fetchText("https://egeg.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions");
      await sleep(400);
      console.log(`  Oracle CX page → ${status}`);
      if (text && status === 200) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 300)}`);
        const countMatch = text.match(/"totalResults"\s*:\s*(\d+)/)
                         || text.match(/"count"\s*:\s*(\d+)/)
                         || text.match(/(\d+)\s+job/i);
        if (countMatch) { console.log(`  Count: ${countMatch[1]}`); const rc = await updateRoles("phoenix mills", parseInt(countMatch[1]), "oracle_hcm_page"); updated += rc; }
      }
    }
  }
  if (await isNull("phoenix mills")) console.log("  → No data found");
  await sleep(600);

  // ── 2. KOLTE-PATIL — Count distinct job IDs ──────────────────────────────
  console.log("\n=== Kolte-Patil Developers ===");
  if (await isNull("kolte patil developers")) {
    // Found job IDs: jid=30, jid=31 in apply buttons
    // Try to find all valid job IDs by fetching individual job pages
    let validJobs = [];
    // Try to fetch job listing API
    const kpApis = [
      "https://www.koltepatil.com/jobs",
      "https://www.koltepatil.com/api/jobs",
      "https://www.koltepatil.com/careers/jobs",
      "https://www.koltepatil.com/jobs?format=json",
    ];
    for (const url of kpApis) {
      const { ok, data, status } = await fetchJSON(url); await sleep(300);
      console.log(`  ${url.slice(8, 50)} → ${status ?? 'ok'}`);
      if (!ok || !data) continue;
      const count = Array.isArray(data) ? data.length : data.total ?? data.count;
      if (count !== undefined) { console.log(`  → ${count}`); break; }
    }
    // Try searching job IDs by fetching each job page
    // We know jid=30 and jid=31 exist. Try from 1 to 40 quickly
    console.log("  Probing job IDs...");
    let maxValidId = 0;
    for (let jid = 1; jid <= 50; jid++) {
      const { status, text } = await fetchText(`https://www.koltepatil.com/job?jid=${jid}`);
      await sleep(100);
      if (status === 200 && text && text.length > 1000) {
        // Check if this is a real job page (not 404 redirect)
        const isJobPage = text.includes('designation') || text.includes('Experience') || text.includes('Apply') || text.includes('job') || text.includes('Vacancies');
        const is404 = text.includes('Page Not Found') || text.includes('404') || text.length < 2000;
        if (isJobPage && !is404) {
          const title = text.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim() || `Job ${jid}`;
          validJobs.push(jid);
          console.log(`  jid=${jid}: valid (${title.slice(0, 50)})`);
        }
      }
    }
    console.log(`  Valid job IDs: ${validJobs.join(', ')} → ${validJobs.length} jobs`);
    if (validJobs.length > 0) {
      const rc = await updateRoles("kolte patil developers", validJobs.length, "career_page_job_ids"); updated += rc;
    }
  }
  if (await isNull("kolte patil developers")) console.log("  → No data found");
  await sleep(600);

  // ── 3. WNS GLOBAL — wnscareers.com ───────────────────────────────────────
  console.log("\n=== WNS Global (wnscareers.com) ===");
  if (await isNull("wns global")) {
    const wnsUrls = [
      "https://www.wnscareers.com/",
      "https://www.wnscareers.com/all-jobs",
      "https://www.wnscareers.com/jobs",
      "https://www.wnscareers.com/search",
    ];
    for (const url of wnsUrls) {
      const { text, status, finalUrl } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 50)} → ${status} → ${(finalUrl||'').slice(8, 55)}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 400)}`);
      // Look for job count
      const countMatch = text.match(/(\d[\d,]*)\s+(?:job|position|opportunit|opening|result|role)/i)
                        || text.match(/"total"\s*:\s*(\d+)/)
                        || text.match(/"count"\s*:\s*(\d+)/);
      if (countMatch) {
        const n = parseInt(countMatch[1].replace(/,/g, ''));
        console.log(`  → Count: ${n} (${countMatch[0]})`);
        if (n > 0 && n < 100000) { const rc = await updateRoles("wns global", n, "wnscareers_scrape"); updated += rc; break; }
      }
      // Find ATS URL in page
      const atsUrls = [...text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|icims\.com|taleo\.net)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) {
        console.log(`  ATS: ${atsUrls[0][0]}`);
        const wdMatch = atsUrls[0][0].match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>/#]+)/i);
        if (wdMatch) {
          const c2 = await fetchJSON(
            `https://${wdMatch[1]}.wd${wdMatch[2]}.myworkdayjobs.com/wday/cxs/${wdMatch[1]}/${wdMatch[3]}/jobs`,
            { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
              headers: { "Content-Type": "application/json" } }
          );
          await sleep(300);
          if (c2.ok && typeof c2.data?.total === "number") { console.log(`  WD total: ${c2.data.total}`); const rc = await updateRoles("wns global", c2.data.total, "workday_careers"); updated += rc; break; }
        }
      }
    }
    // Try WNS API endpoints
    if (await isNull("wns global")) {
      const { ok, data } = await fetchJSON("https://www.wnscareers.com/api/jobs?page=1&per_page=1"); await sleep(400);
      if (ok && data) {
        const total = data.total ?? data.totalCount ?? data.count;
        if (total !== undefined) { console.log(`  API total: ${total}`); const rc = await updateRoles("wns global", total, "wnscareers_api"); updated += rc; }
        else console.log(`  API data: ${JSON.stringify(data).slice(0, 200)}`);
      }
    }
  }
  if (await isNull("wns global")) console.log("  → No data found");
  await sleep(600);

  // ── 4. UNION BANK OF INDIA — Parse recruitment page ───────────────────────
  console.log("\n=== Union Bank of India ===");
  if (await isNull("union bank of india")) {
    const { text, status } = await fetchText("https://unionbankofindia.co.in/recruitment");
    await sleep(400);
    console.log(`  unionbankofindia.co.in/recruitment → ${status}`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Content preview: ${plain.slice(0, 600)}`);
      // Count vacancy mentions
      const vacMatches = [...text.matchAll(/(\d+)\s+(?:vacancy|vacancies|post|seat|appointment)/ig)];
      console.log(`  Vacancy mentions: ${vacMatches.map(m => m[0]).join(', ')}`);
      // Count table rows
      const tableRows = [...text.matchAll(/<tr[^>]*>/gi)].length;
      const tableDataCells = [...text.matchAll(/<td[^>]*>/gi)].length;
      console.log(`  Table rows: ${tableRows} | TD cells: ${tableDataCells}`);
      // Count recruitment notification links
      const notifLinks = [...text.matchAll(/href="[^"]*(?:recruit|notif|advt|advertis)[^"]*"/gi)];
      console.log(`  Notification links: ${notifLinks.length}`);
      // Try to count distinct job postings from the page
      const jobLinks = [...text.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)]
        .filter(m => m[2].match(/\d{4}/) || m[2].toLowerCase().includes('apply') || m[2].toLowerCase().includes('click'));
      console.log(`  Job links: ${jobLinks.length}`);
      for (const jl of jobLinks.slice(0, 10)) console.log(`    ${jl[2].trim().slice(0, 60)}`);
      // Look for overall vacancy count numbers
      const totalVac = plain.match(/total\s+(?:of\s+)?(\d+)\s+(?:vacancy|vacancies|post)/i)
                     || plain.match(/(\d+)\s+total\s+(?:vacancy|post)/i)
                     || plain.match(/(?:advertising|inviting)\s+(?:applications?\s+)?for\s+(\d+)/i);
      if (totalVac) {
        const n = parseInt(totalVac[1]);
        console.log(`  → Total: ${n}`);
        if (n > 0 && n < 100000) { const rc = await updateRoles("union bank of india", n, "career_page_scrape"); updated += rc; }
      }
    }
  }
  if (await isNull("union bank of india")) console.log("  → No data found");
  await sleep(600);

  // ── 5. ALNYLAM — Query the /careers/api/jobs endpoint ────────────────────
  console.log("\n=== Alnylam (API probe) ===");
  if (await isNull("alnylam pharmaceuticals")) {
    // This returned 200 in previous run
    const { ok, data, raw, status } = await fetchJSON("https://jobs.alnylam.com/careers/api/jobs");
    await sleep(300);
    console.log(`  jobs.alnylam.com/careers/api/jobs → ${status ?? 'ok'}`);
    if (ok && data) {
      const total = data.total ?? data.count ?? data.totalCount ?? (Array.isArray(data.jobs) ? data.jobs.length : null) ?? (Array.isArray(data) ? data.length : null);
      console.log(`  Total: ${total} | Keys: ${Object.keys(data).slice(0, 8).join(', ')}`);
      if (total !== null && total !== undefined) { console.log(`  → ${total}`); const rc = await updateRoles("alnylam pharmaceuticals", total, "alnylam_api"); updated += rc; }
      else console.log(`  Data: ${JSON.stringify(data).slice(0, 300)}`);
    } else if (raw) {
      console.log(`  Raw: ${raw.slice(0, 300)}`);
      const c = raw.match(/"total"\s*:\s*(\d+)/)?.[1] || raw.match(/"count"\s*:\s*(\d+)/)?.[1];
      if (c) { console.log(`  → ${c}`); const rc = await updateRoles("alnylam pharmaceuticals", parseInt(c), "alnylam_api"); updated += rc; }
    }
    // Try more API variations
    if (await isNull("alnylam pharmaceuticals")) {
      const alnApiVariants = [
        "https://jobs.alnylam.com/careers/api/jobs?page=1&limit=1",
        "https://jobs.alnylam.com/careers/api/jobs/all",
        "https://jobs.alnylam.com/careers/api/jobs/count",
        "https://jobs.alnylam.com/careers/api/jobs?status=active",
        "https://jobs.alnylam.com/careers/api/v1/jobs",
      ];
      for (const url of alnApiVariants) {
        const { ok, data, raw, status } = await fetchJSON(url); await sleep(300);
        console.log(`  ${url.slice(8, 60)} → ${status ?? 'ok'}`);
        if (!ok) continue;
        const c = data?.total ?? data?.count ?? data?.totalCount
                 ?? (raw ? (raw.match(/"total"\s*:\s*(\d+)/)?.[1] || raw.match(/"count"\s*:\s*(\d+)/)?.[1]) : null);
        if (c !== null && c !== undefined) { console.log(`  → ${c}`); const rc = await updateRoles("alnylam pharmaceuticals", parseInt(c), "alnylam_api"); updated += rc; break; }
        if (raw) console.log(`  Raw: ${raw.slice(0, 150)}`);
      }
    }
  }
  if (await isNull("alnylam pharmaceuticals")) console.log("  → No data found");
  await sleep(600);

  // ── 6. USHA MARTIN — Fetch career page and count actual job sections ──────
  console.log("\n=== Usha Martin ===");
  if (await isNull("usha martin")) {
    const { text, status } = await fetchText("https://www.ushamartin.com/career/");
    await sleep(400);
    console.log(`  ushamartin.com/career/ → ${status}`);
    if (text && status === 200) {
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Content: ${plain.slice(0, 600)}`);
      // Count distinct job entries - look for recurring patterns
      const tableRows = [...text.matchAll(/<tr[^>]*>/gi)].length;
      const liItems = [...text.matchAll(/<li[^>]*>/gi)].length;
      console.log(`  Table rows: ${tableRows} | List items: ${liItems}`);
      // Look for PDF links (SAIL/PSU companies post PDF job ads)
      const pdfLinks = [...text.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)];
      console.log(`  PDF links: ${pdfLinks.length}`);
      for (const p of pdfLinks.slice(0, 5)) console.log(`    ${p[1].slice(0, 80)}`);
      // Look for "Apply" links
      const applyLinks = [...text.matchAll(/href="[^"]*(?:apply|job|career)[^"]*"/gi)].length;
      console.log(`  Apply links: ${applyLinks}`);
      // Try to count job postings via form divs or vacancy-like sections
      const vacancy = plain.match(/(\d+)\s+(?:vacancy|vacancies|position|opening|post)/i);
      if (vacancy) { console.log(`  Vacancy: ${vacancy[0]}`); const n = parseInt(vacancy[1]); const rc = await updateRoles("usha martin", n, "career_page_scrape"); updated += rc; }
    }
    // Try their /career/current-openings
    if (await isNull("usha martin")) {
      const { text: t2, status: s2 } = await fetchText("https://www.ushamartin.com/career/current-openings");
      await sleep(300);
      console.log(`  ushamartin.com/career/current-openings → ${s2}`);
      if (t2 && s2 === 200) {
        const plain2 = t2.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Content: ${plain2.slice(0, 400)}`);
        const v2 = plain2.match(/(\d+)\s+(?:vacancy|vacancies|position|opening)/i);
        if (v2) { const n = parseInt(v2[1]); if (n > 0 && n < 1000) { const rc = await updateRoles("usha martin", n, "career_page_scrape"); updated += rc; } }
      }
    }
  }
  if (await isNull("usha martin")) console.log("  → No data found");
  await sleep(600);

  // ── 7. VIJAYA DIAGNOSTIC — Try alternative domain ─────────────────────────
  console.log("\n=== Vijaya Diagnostic ===");
  if (await isNull("vijaya diagnostic")) {
    const vijUrls = [
      "https://www.vijayaonline.com/career",
      "https://www.vijayaonline.com/careers.php",
      "https://www.vijayaonline.com/join-us",
      "https://careers.vijayadiagnosticcentre.com",
      "https://www.vijayadiagnostic.com/careers",
    ];
    for (const url of vijUrls) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 55)} → ${status}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 300)}`);
      const v = text.match(/(\d+)\s+(?:vacancy|vacancies|opening|position|job)/i);
      if (v) { const n = parseInt(v[1]); console.log(`  Count: ${n}`); if (n > 0 && n < 5000) { const rc = await updateRoles("vijaya diagnostic", n, "career_page_scrape"); updated += rc; break; } }
      // Look for job listing elements
      const jobEls = [...text.matchAll(/class="[^"]*(?:job|vacancy|opening|career)[^"]*"/gi)].length;
      console.log(`  Job elements: ${jobEls}`);
      // Count apply buttons
      const applyBtns = [...text.matchAll(/(?:Apply|Apply Now|Apply Here)/gi)].length;
      console.log(`  Apply text: ${applyBtns}`);
    }
  }
  if (await isNull("vijaya diagnostic")) console.log("  → No data found");
  await sleep(600);

  // ── 8. SAIL — Try with direct HTTP and different approach ─────────────────
  console.log("\n=== SAIL ===");
  if (await isNull("steel authority of india")) {
    // SAIL blocks external requests. Try their recruitment notification RSS or gov portal
    const sailUrls = [
      "https://www.sail.co.in/en/career",
      "https://sail.co.in/career",
      "https://www.sail.co.in/recruitment",
    ];
    for (const url of sailUrls) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 25000);
        const res = await fetch(url, {
          headers: { ...HEADERS, "Accept-Language": "en-IN,hi-IN,en;q=0.9", "Cache-Control": "no-cache" },
          redirect: "follow",
          signal: ctrl.signal
        });
        clearTimeout(timer);
        const text = await res.text();
        console.log(`  ${url.slice(8, 40)} → ${res.status} (${text.length} chars)`);
        if (res.status === 200 && text.length > 1000) {
          const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`  Preview: ${plain.slice(0, 300)}`);
          const v = text.match(/(\d+)\s+(?:vacancy|vacancies|post|opening)/i);
          if (v) { const n = parseInt(v[1]); console.log(`  Count: ${n}`); if (n > 0 && n < 50000) { const rc = await updateRoles("steel authority of india", n, "career_page_scrape"); updated += rc; break; } }
          break;
        }
      } catch (e) { console.log(`  ${url.slice(8, 40)} → err: ${e.message}`); }
      await sleep(600);
    }
  }
  if (await isNull("steel authority of india")) console.log("  → No data found");

  // ── 9. PFC LTD — Try PDF job notices via web archive ─────────────────────
  console.log("\n=== PFC Ltd ===");
  if (await isNull("pfc ltd")) {
    const pfcUrls = [
      "https://www.pfcindia.com/Career",
      "https://www.pfcindia.com/Careers",
      "https://www.pfcindia.com/job",
    ];
    for (const url of pfcUrls) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 45)} → ${status}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 300)}`);
      const v = plain.match(/(\d+)\s+(?:vacancy|vacancies|opening|post|position)/i);
      if (v) { const n = parseInt(v[1]); console.log(`  Count: ${n}`); if (n > 0 && n < 5000) { const rc = await updateRoles("pfc ltd", n, "career_page_scrape"); updated += rc; break; } }
    }
  }
  if (await isNull("pfc ltd")) console.log("  → No data found");

  // ── 10. GSPL — Try gspcl.in (Gujarat State Petronet parent company domain) ─
  console.log("\n=== GSPL ===");
  if (await isNull("gspl")) {
    const gsplUrls = [
      "https://www.gspl.in",  // just check if domain resolves
      "https://gspc.in/career",
      "https://gspc.in/careers",
      "https://www.gspcl.in/careers",
    ];
    for (const url of gsplUrls) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 40)} → ${status}`);
      if (!text || status !== 200) continue;
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log(`  Preview: ${plain.slice(0, 200)}`);
      const v = plain.match(/(\d+)\s+(?:vacancy|vacancies|opening|post|position)/i);
      if (v) { const n = parseInt(v[1]); console.log(`  → ${n}`); if (n > 0 && n < 5000) { const rc = await updateRoles("gspl", n, "career_page_scrape"); updated += rc; break; } }
    }
  }
  if (await isNull("gspl")) console.log("  → No data found");

  // ── 11. BAYER INDIA — Try Bayer Workday directly with known tenant ────────
  console.log("\n=== Bayer CropScience India ===");
  if (await isNull("bayer cropscience india")) {
    // From external knowledge: Bayer uses bayer.wd3.myworkdayjobs.com
    const bayerWdTenants = [
      ["bayer", "3", "Bayer"],
      ["bayer", "3", "bayer_global"],
      ["bayer", "3", "BAG"],
      ["bayer", "1", "Bayer"],
      ["bayer", "5", "Bayer"],
      ["bayergroup", "3", "bayer_group"],
      ["bayerag", "3", "bayerag"],
    ];
    for (const [t, p, s] of bayerWdTenants) {
      const { ok, data } = await fetchJSON(
        `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
        { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
          headers: { "Content-Type": "application/json" } }
      );
      await sleep(200);
      if (ok && typeof data?.total === "number") {
        console.log(`  ✓ Bayer WD [${t}.wd${p}/${s}]: ${data.total} total global jobs`);
        // Get India-specific count
        const indiaRes = await fetchJSON(
          `https://${t}.wd${p}.myworkdayjobs.com/wday/cxs/${t}/${s}/jobs`,
          {
            method: "POST",
            body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "crop science" }),
            headers: { "Content-Type": "application/json" }
          }
        );
        await sleep(200);
        if (indiaRes.ok && typeof indiaRes.data?.total === "number") {
          console.log(`  "crop science" search: ${indiaRes.data.total}`);
          if (indiaRes.data.total > 0) {
            const rc = await updateRoles("bayer cropscience india", indiaRes.data.total, "workday_cropscience_search");
            updated += rc;
            break;
          }
        }
        // Try India location filter
        // Fetch all jobs and filter manually for India? Too slow.
        // Use the total and mark as Bayer global (approximate)
        break;
      }
    }
    // Try fetching Bayer India's career page
    if (await isNull("bayer cropscience india")) {
      const { text, status } = await fetchText("https://www.bayer.com/en/in/careers-overview"); await sleep(400);
      console.log(`  bayer.com/en/in/careers-overview → ${status}`);
      if (text && status === 200) {
        const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>#]+)/gi)];
        if (wdUrls.length > 0) console.log(`  WD: ${wdUrls[0][0]}`);
        const countMatch = text.match(/(\d+)\s+(?:job|position|open|opportunit)/i);
        if (countMatch) console.log(`  Count: ${countMatch[0]}`);
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 300)}`);
      }
    }
  }
  if (await isNull("bayer cropscience india")) console.log("  → No data found");

  // ── 12. QLIK — try LinkedIn job search as proxy ───────────────────────────
  console.log("\n=== Qlik ===");
  if (await isNull("qlik")) {
    // Qlik is part of Cloud Software Group after 2023 acquisition
    // Try their official job posting page
    const { text, status } = await fetchText("https://www.qlik.com/us/company/careers");
    await sleep(400);
    console.log(`  qlik.com/us/company/careers → ${status}`);
    if (text && status === 200) {
      // The page returned CSS (minified) in previous run, which means it might actually
      // be a SPA. Look for any API hints.
      const apiUrls = [...text.matchAll(/['"](?:https?:\/\/[^'"]+\/api\/[^'"]*jobs[^'"]*)['"]/gi)];
      if (apiUrls.length > 0) console.log(`  API hints: ${apiUrls.slice(0,3).map(m=>m[0]).join(', ')}`);
      // The page might embed job count in a meta tag or JS variable
      const metaCount = text.match(/jobs['"]\s*:\s*(\d+)/i) || text.match(/"count"\s*:\s*(\d+)/i);
      if (metaCount) console.log(`  Meta count: ${metaCount[1]}`);
      // Check if there's a redirect to Cloud Software Group
      const csgRedirect = text.match(/cloudsoftwaregroup|cloud-software-group/i);
      if (csgRedirect) console.log(`  CSG reference found in page`);
    }
    // Last resort: try Adzuna with "cloud software group"
    if (await isNull("qlik")) {
      const adzUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=a3715ff2&app_key=18d8b4a8e1a20d0428d42920abfafe91&company=cloud+software+group&results_per_page=1`;
      const { ok, data } = await fetchJSON(adzUrl); await sleep(500);
      console.log(`  Adzuna [us/cloud software group]: ${data?.count ?? 'not found'}`);
      if (ok && typeof data?.count === "number" && data.count > 0) {
        const rc = await updateRoles("qlik", data.count, "adzuna_api_csg"); updated += rc;
      }
    }
  }
  if (await isNull("qlik")) console.log("  → No data found");

  // ── 13. INSULET — Try fetching from their corporate site ─────────────────
  console.log("\n=== Insulet ===");
  if (await isNull("insulet")) {
    // Try fetching from the corporate site (not iCIMS)
    const { text, status } = await fetchText("https://www.insulet.com");
    await sleep(400);
    console.log(`  insulet.com → ${status}`);
    if (text && status === 200) {
      const atsUrls = [...text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|icims\.com|taleo\.net|jobvite\.com)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) console.log(`  ATS URLs: ${atsUrls.slice(0,3).map(m=>m[0]).join(', ')}`);
      const careerUrls = [...text.matchAll(/href="([^"]*career[^"]*)"/gi)].map(m => m[1]).filter(h => h.startsWith('http'));
      console.log(`  Career external links: ${careerUrls.join(', ')}`);
    }
    // Try Insulet Workday with more pod combinations
    if (await isNull("insulet")) {
      for (const pod of ["1","2","3","4","5","6","101","201","301","401","501"]) {
        const c = await fetchJSON(
          `https://insulet.wd${pod}.myworkdayjobs.com/wday/cxs/insulet/insulet_careers/jobs`,
          { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
            headers: { "Content-Type": "application/json" } }
        );
        await sleep(150);
        if (c.ok && typeof c.data?.total === "number") {
          console.log(`  ✓ WD [insulet.wd${pod}/insulet_careers]: ${c.data.total}`);
          const rc = await updateRoles("insulet", c.data.total, "workday_careers"); updated += rc; break;
        }
      }
    }
  }
  if (await isNull("insulet")) console.log("  → No data found");

  // ── 14. MASIMO — Try corporate site for ATS link ──────────────────────────
  console.log("\n=== Masimo ===");
  if (await isNull("masimo")) {
    // Masimo blocks scraping. Try their investor relations page for career link
    const masimoUrls = [
      "https://ir.masimo.com",
      "https://www.masimo.com/sitemap.xml",
    ];
    for (const url of masimoUrls) {
      const { text, status } = await fetchText(url); await sleep(400);
      console.log(`  ${url.slice(8, 40)} → ${status}`);
      if (!text || status !== 200) continue;
      const careerLinks = [...text.matchAll(/(?:https?:\/\/[^"\s<>]*career[^"\s<>]*)/gi)];
      if (careerLinks.length > 0) console.log(`  Career links: ${careerLinks.slice(0, 3).map(m => m[0]).join(', ')}`);
      // Look for ATS URLs
      const atsUrls = [...text.matchAll(/https?:\/\/[\w.-]+(?:greenhouse\.io|lever\.co|myworkdayjobs\.com|icims\.com|taleo\.net|jobvite\.com)[^"'\s<>]*/gi)];
      if (atsUrls.length > 0) console.log(`  ATS: ${atsUrls[0][0]}`);
      const wdUrls = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/([^"'\s?<>/#]+)/gi)];
      if (wdUrls.length > 0) console.log(`  WD: ${wdUrls[0][0]}`);
    }
  }
  if (await isNull("masimo")) console.log("  → No data found");

  // ── 15. VANGUARD — Fetch actual job page ─────────────────────────────────
  console.log("\n=== Vanguard ===");
  if (await isNull("vanguard")) {
    // vanguardjobs.com has 2 job cards and uses "job_listing" WP custom post type
    // Fetch the sitemap to find job listing URLs
    const { text, status } = await fetchText("https://www.vanguardjobs.com/sitemap.xml"); await sleep(400);
    console.log(`  vanguardjobs.com/sitemap.xml → ${status}`);
    if (text && status === 200) {
      const jobUrls = [...text.matchAll(/<loc>([^<]*job[^<]*)<\/loc>/gi)].map(m => m[1]);
      console.log(`  Job URLs in sitemap: ${jobUrls.length}`);
      for (const u of jobUrls.slice(0, 10)) console.log(`    ${u}`);
      if (jobUrls.length > 0) {
        // Each URL is a job posting - count them
        const jobCount = jobUrls.length;
        console.log(`  → ${jobCount} jobs from sitemap`);
        if (jobCount > 0) { const rc = await updateRoles("vanguard", jobCount, "wp_sitemap_jobs"); updated += rc; }
      }
    }
    // Try the main job listing page with search
    if (await isNull("vanguard")) {
      const { text: t2, status: s2 } = await fetchText("https://www.vanguardjobs.com/all-jobs/");
      await sleep(400);
      console.log(`  vanguardjobs.com/all-jobs/ → ${s2}`);
      if (t2 && s2 === 200) {
        const plain = t2.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Preview: ${plain.slice(0, 400)}`);
        const jobCount = t2.match(/(\d+)\s+(?:job|result|listing|position)/i);
        if (jobCount) console.log(`  Count: ${jobCount[0]}`);
        const jobCards = [...t2.matchAll(/class="[^"]*(?:job-listing|job_listing|job-card|listing-item)[^"]*"/gi)].length;
        console.log(`  Job cards: ${jobCards}`);
        if (jobCards > 0) { const rc = await updateRoles("vanguard", jobCards, "wp_job_manager"); updated += rc; }
      }
    }
  }
  if (await isNull("vanguard")) console.log("  → No data found");

  // ── FINAL STATE ───────────────────────────────────────────────────────────
  const { rows: s } = await db.query(`SELECT count(*) AS total, count(total_open_roles) AS has_roles, count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null FROM verified_company_intelligence`);
  const { rows: nulls } = await db.query(`SELECT canonical_name, country_code FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
  await db.end();
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
}

main().catch(e => { console.error(e); process.exit(1); });
