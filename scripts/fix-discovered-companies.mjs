// fix-discovered-companies.mjs
// Use discovered ATS endpoints and career page counts with verification

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function updateRoles(canonicalName, openRoles, source, confidence = 0.88) {
  const velocityScore = openRoles > 1000 ? 1.5 : openRoles > 500 ? 1.0 : openRoles > 100 ? 0.5 : openRoles > 0 ? 0.1 : -0.5;
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence
     SET total_open_roles = $2, hiring_source = $3,
         hiring_verified_at = NOW(), hiring_confidence = $5,
         hiring_velocity_score = $4, updated_at = NOW()
     WHERE canonical_name = $1`,
    [canonicalName, openRoles, source, velocityScore, confidence]
  );
  return rowCount ?? 0;
}

async function fetchJson(url, opts = {}) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", ...opts.headers }, signal: AbortSignal.timeout(12000), ...opts });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    return { ok: true, status: 200, data };
  } catch (e) { return { ok: false, status: "err", error: e.message }; }
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15000), redirect: "follow" });
    return { ok: res.ok, status: res.status, finalUrl: res.url, text: await res.text() };
  } catch (e) { return { ok: false, status: "err", text: "", error: e.message }; }
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");
  let updated = 0;

  // ── 1. EQUINOR — Confirmed Workday equinor.wd3/EQNR → 14 jobs ─────────────
  {
    const { data } = await fetchJson(
      "https://equinor.wd3.myworkdayjobs.com/wday/cxs/equinor/EQNR/jobs",
      { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
        headers: { "Content-Type": "application/json" } }
    );
    const count = data?.total ?? null;
    console.log(`Equinor Workday API: ${count} jobs`);
    if (count !== null) {
      const rc = await updateRoles("equinor", count, "workday_careers");
      updated += rc;
      console.log(`  ✓ ${count} jobs inserted [equinor.wd3/EQNR]`);
    }
  }
  await sleep(600);

  // ── 2. CHECK POINT — Verify 181 from career page ──────────────────────────
  // Their career page checkpoint.com/careers shows "181" — verify this is job count
  {
    const { text, status } = await fetchText("https://www.checkpoint.com/careers/");
    console.log(`\nCheck Point career page: HTTP ${status}`);
    if (text) {
      // Look for context around the number 181 and job-related text
      const idx = text.indexOf("181");
      if (idx >= 0) {
        const ctx = text.slice(Math.max(0, idx - 100), idx + 150).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Context around 181: "${ctx.slice(0, 200)}"`);
      }
      // Also look for JSON data
      const jsonMatch = text.match(/"jobs"\s*:\s*\[/) || text.match(/"openings"\s*:\s*(\d+)/);
      if (jsonMatch) console.log(`  Jobs JSON found: ${jsonMatch[0].slice(0, 50)}`);
      // Look for "position" count
      const posMatch = text.match(/(\d+)\s+(?:open\s+)?(?:position|job|role|opportunit)/gi);
      if (posMatch) console.log(`  Position mentions: ${posMatch.slice(0, 3).join(', ')}`);
    }
  }
  await sleep(600);

  // ── 3. CHECK POINT — Try their Workday ────────────────────────────────────
  // Check Point may have a Workday portal
  for (const [tenant, site, wd] of [
    ["checkpoint", "CheckPoint", "1"],
    ["checkpointsw", "CheckPoint", "1"],
    ["checkpoint", "CheckPointSoftware", "1"],
    ["checkpoint", "Jobs", "5"],
  ]) {
    const { data } = await fetchJson(
      `https://${tenant}.wd${wd}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
      { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
        headers: { "Content-Type": "application/json" } }
    );
    await sleep(400);
    if (data?.total !== undefined) {
      console.log(`  Check Point Workday [${tenant}.wd${wd}/${site}]: ${data.total} jobs`);
      if (data.total >= 0) {
        const rc = await updateRoles("check point", data.total, "workday_careers");
        updated += rc;
        break;
      }
    }
  }
  await sleep(600);

  // ── 4. PENUMBRA — Lever token penumbrainc (discovered from career page) ────
  {
    const { ok, data } = await fetchJson("https://api.lever.co/v0/postings/penumbrainc?mode=json");
    console.log(`\nPenumbra Lever [penumbrainc]: HTTP ${ok ? 200 : 'err'} | count=${Array.isArray(data) ? data.length : 'N/A'}`);
    if (ok && Array.isArray(data)) {
      const count = data.length;
      const rc = await updateRoles("penumbra", count, "lever_api");
      updated += rc;
      console.log(`  ✓ ${count} jobs [lever:penumbrainc]`);
    }
  }
  await sleep(600);

  // ── 5. CERTARA — Verify 3544 count (seems high for 1500-person company) ────
  {
    const { text, status } = await fetchText("https://careers.certara.com/");
    console.log(`\nCertara career page: HTTP ${status}`);
    if (text) {
      // Check what "3544" refers to
      const idx = text.indexOf("3544");
      if (idx >= 0) {
        const ctx = text.slice(Math.max(0, idx - 150), idx + 200).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        console.log(`  Context around 3544: "${ctx.slice(0, 300)}"`);
      }
      // Look for actual job count
      const patterns = [
        /(\d+)\s+(?:open\s+)?(?:position|job|role|opportunit)/gi,
        /"totalJobs"\s*:\s*(\d+)/g,
        /"count"\s*:\s*(\d+)/g,
        /"total"\s*:\s*(\d+)/g,
      ];
      for (const p of patterns) {
        const matches = [...text.matchAll(p)];
        if (matches.length > 0) {
          console.log(`  Pattern ${p.source.slice(0, 30)}: ${matches.slice(0, 3).map(m => m[0]).join(', ')}`);
        }
      }
    }
  }
  await sleep(600);

  // ── 6. ALIGN TECHNOLOGY — jobs.aligntech.com discovered ──────────────────
  {
    const { text, status, finalUrl } = await fetchText("https://jobs.aligntech.com");
    console.log(`\nAlign Technology jobs.aligntech.com: HTTP ${status} → ${finalUrl}`);
    if (text) {
      // Look for Workday URLs
      const wdMatch = text.match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>]+)/i);
      if (wdMatch) {
        console.log(`  Workday URL: ${wdMatch[0]}`);
        const [, tenant, wdNum, site] = wdMatch;
        // Query the API
        const { data } = await fetchJson(
          `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
          { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
            headers: { "Content-Type": "application/json" } }
        );
        await sleep(500);
        if (data?.total !== undefined) {
          console.log(`  Workday API: ${data.total} jobs`);
          const rc = await updateRoles("align technology", data.total, "workday_careers");
          updated += rc;
        }
      }
      // Extract any ATS tokens
      const atsSrc = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/);
      if (atsSrc) console.log(`  Greenhouse token: ${atsSrc[1]}`);
      const leverSrc = text.match(/api\.lever\.co\/v0\/postings\/([a-zA-Z0-9_-]+)/);
      if (leverSrc) console.log(`  Lever token: ${leverSrc[1]}`);

      // Show text snippet
      const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400);
      console.log(`  Text snippet: ${snippet}`);
    }
  }
  await sleep(600);

  // ── 7. ALNYLAM — jobs.alnylam.com/careers discovered ─────────────────────
  {
    const { text, status, finalUrl } = await fetchText("https://jobs.alnylam.com/careers");
    console.log(`\nAlnylam careers: HTTP ${status} → ${finalUrl}`);
    if (text) {
      const wdMatch = text.match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>]+)/i);
      if (wdMatch) {
        console.log(`  Workday URL: ${wdMatch[0]}`);
        const [, tenant, wdNum, site] = wdMatch;
        const { data } = await fetchJson(
          `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
          { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
            headers: { "Content-Type": "application/json" } }
        );
        await sleep(500);
        if (data?.total !== undefined) {
          console.log(`  Workday API: ${data.total} jobs`);
          const rc = await updateRoles("alnylam pharmaceuticals", data.total, "workday_careers");
          updated += rc;
        }
      }
      const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400);
      console.log(`  Snippet: ${snippet}`);
    }
  }
  await sleep(600);

  // ── 8. VANGUARD — Analyze vanguardjobs.com HTML for Workday link ──────────
  {
    const { text, status } = await fetchText("https://www.vanguardjobs.com");
    console.log(`\nVanguard vanguardjobs.com: HTTP ${status}`);
    if (text) {
      const wdMatches = [...text.matchAll(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>]+)/gi)];
      if (wdMatches.length > 0) {
        for (const m of wdMatches.slice(0, 3)) {
          console.log(`  Workday URL: ${m[0]}`);
        }
        // Try first match
        const [, tenant, wdNum, site] = wdMatches[0];
        if (site) {
          const { data } = await fetchJson(
            `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
            { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
              headers: { "Content-Type": "application/json" } }
          );
          await sleep(500);
          if (data?.total !== undefined) {
            console.log(`  Workday API: ${data.total} jobs`);
            const rc = await updateRoles("vanguard", data.total, "workday_careers");
            updated += rc;
          }
        }
      } else {
        // Look for any iframe src, href with Workday or job-related link
        const links = [...text.matchAll(/href="([^"]*myworkdayjobs[^"]*|[^"]*careers[^"]*wd\d[^"]*)"/gi)];
        console.log(`  Job/WD links found: ${links.slice(0, 3).map(m => m[1]).join(' | ')}`);
        // Show count references
        const countRef = text.match(/(\d{2,4})\s+(?:open|current|available)?\s*(?:job|position|opportunit|opening)/i);
        if (countRef) console.log(`  Count reference: "${countRef[0]}"`);
        const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(200, 600);
        console.log(`  Text: ${snippet}`);
      }
    }
  }
  await sleep(600);

  // ── 9. MASIMO — Try different URL patterns ────────────────────────────────
  {
    const urls = [
      "https://www.masimo.com/careers/",
      "https://www.masimo.com/company/careers/",
    ];
    console.log("\nMasimo career pages:");
    for (const url of urls) {
      const { text, status, finalUrl } = await fetchText(url);
      console.log(`  ${url} → HTTP ${status} → ${finalUrl}`);
      if (text) {
        const wdMatch = text.match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>]+)/i);
        if (wdMatch) {
          console.log(`  Workday: ${wdMatch[0]}`);
          const [, tenant, wdNum, site] = wdMatch;
          const { data } = await fetchJson(
            `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
            { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
              headers: { "Content-Type": "application/json" } }
          );
          await sleep(500);
          if (data?.total !== undefined) {
            console.log(`  Workday API: ${data.total} jobs`);
            const rc = await updateRoles("masimo", data.total, "workday_careers");
            updated += rc;
          }
          break;
        }
        const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200);
        console.log(`  Snippet: ${snippet}`);
      }
      await sleep(400);
    }
  }
  await sleep(600);

  // ── 10. VERTEX PHARMACEUTICALS — Try correct Workday ─────────────────────
  // Vertex uses Workday; career page redirected to /working-here (not /careers)
  {
    const urls = [
      "https://www.vrtx.com/working-here",
      "https://careers.vrtx.com/careers",
      "https://www.vrtx.com/careers",
    ];
    console.log("\nVertex Pharmaceuticals:");
    for (const url of urls) {
      const { text, status, finalUrl } = await fetchText(url);
      console.log(`  ${url} → HTTP ${status} → ${finalUrl}`);
      if (!text || status !== 200) { await sleep(300); continue; }
      const wdMatch = text.match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>]+)/i);
      if (wdMatch) {
        console.log(`  Workday: ${wdMatch[0]}`);
        const [, tenant, wdNum, site] = wdMatch;
        const { data } = await fetchJson(
          `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
          { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
            headers: { "Content-Type": "application/json" } }
        );
        await sleep(500);
        if (data?.total !== undefined) {
          console.log(`  Workday API: ${data.total} jobs`);
          const rc = await updateRoles("vertex pharmaceuticals", data.total, "workday_careers");
          updated += rc;
          break;
        }
      }
      await sleep(400);
    }
  }
  await sleep(600);

  // ── 11. INSULET — Try different URL patterns ──────────────────────────────
  {
    const urls = [
      "https://www.insulet.com/company/careers",
      "https://www.myomnipod.com/careers",
    ];
    console.log("\nInsulet:");
    for (const url of urls) {
      const { text, status, finalUrl } = await fetchText(url);
      console.log(`  ${url} → HTTP ${status} → ${finalUrl}`);
      if (!text || status !== 200) { await sleep(300); continue; }
      const wdMatch = text.match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>]+)/i);
      if (wdMatch) {
        console.log(`  Workday: ${wdMatch[0]}`);
        const [, tenant, wdNum, site] = wdMatch;
        const { data } = await fetchJson(
          `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
          { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
            headers: { "Content-Type": "application/json" } }
        );
        await sleep(500);
        if (data?.total !== undefined) {
          console.log(`  Workday API: ${data.total} jobs`);
          const rc = await updateRoles("insulet", data.total, "workday_careers");
          updated += rc;
          break;
        }
      }
      const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300);
      console.log(`  Snippet: ${snippet}`);
      await sleep(400);
    }
  }
  await sleep(600);

  // ── 12. QLIK — Try their careers page URL ────────────────────────────────
  {
    const urls = [
      "https://careers.qlik.com/careers",
      "https://www.qlik.com/us/company/careers/overview",
    ];
    console.log("\nQlik:");
    for (const url of urls) {
      const { text, status, finalUrl } = await fetchText(url);
      console.log(`  ${url} → HTTP ${status} → ${finalUrl}`);
      if (!text || status !== 200) { await sleep(300); continue; }
      const wdMatch = text.match(/https?:\/\/(\w+)\.wd(\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([^"'\s?<>]+)/i);
      if (wdMatch) {
        console.log(`  Workday: ${wdMatch[0]}`);
        const [, tenant, wdNum, site] = wdMatch;
        const { data } = await fetchJson(
          `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
          { method: "POST", body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
            headers: { "Content-Type": "application/json" } }
        );
        await sleep(500);
        if (data?.total !== undefined) {
          console.log(`  Workday API: ${data.total} jobs`);
          const rc = await updateRoles("qlik", data.total, "workday_careers");
          updated += rc;
          break;
        }
      }
      // Check for Greenhouse/Lever
      const ghToken = text.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)?.[1];
      const lvToken = text.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/)?.[1];
      const ashbyToken = text.match(/jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/)?.[1];
      if (ghToken) console.log(`  Greenhouse token: ${ghToken}`);
      if (lvToken) console.log(`  Lever token: ${lvToken}`);
      if (ashbyToken) console.log(`  Ashby token: ${ashbyToken}`);
      const countMatch = text.match(/(\d+)\s+(?:open|available|current)?\s*(?:job|position|role)/i);
      if (countMatch) console.log(`  Count: "${countMatch[0]}"`);
      await sleep(400);
    }
  }

  // Final summary
  const { rows: s } = await db.query(`
    SELECT count(*) AS total, count(total_open_roles) AS has_roles,
      count(CASE WHEN total_open_roles IS NULL THEN 1 END) AS still_null
    FROM verified_company_intelligence
  `);
  const { rows: nulls } = await db.query(`
    SELECT canonical_name, country_code, display_name
    FROM verified_company_intelligence
    WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name
  `);
  await db.end();
  console.log(`\n=== STATE ===`);
  console.log(`Updated: ${updated} | ${s[0].has_roles}/${s[0].total} filled | ${s[0].still_null} NULL`);
  for (const r of nulls) console.log(`  [${r.country_code}] ${r.canonical_name}`);
}

main().catch(e => { console.error(e); process.exit(1); });
