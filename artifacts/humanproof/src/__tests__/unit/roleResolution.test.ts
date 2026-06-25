import { beforeAll, describe, expect, it } from "vitest";
import { ensureCareerIntelligenceLoaded, getCareerIntelligence, resolveIntelligenceKey } from "../../data/intelligence";
import { getPersonalizedActions } from "../../services/actionPersonalizationEngine";
import { resolveRoleInput } from "../../services/roleResolution";

beforeAll(async () => {
  await ensureCareerIntelligenceLoaded();
});

describe("roleResolution", () => {
  it("resolves Software Developer to the seeded software engineer key", () => {
    const resolved = resolveRoleInput("Software Developer");
    expect(resolved.canonicalKey).toBe("sw_software_engineer");
    expect(resolved.source).toBe("alias_map");
    expect(getCareerIntelligence("Software Developer")?.displayRole).toBe("Software Engineer");
  });

  it("resolves Backend Developer and Database Administrator deterministically", () => {
    expect(resolveRoleInput("Backend Developer").canonicalKey).toBe("sw_backend");
    expect(resolveRoleInput("Database Administrator").canonicalKey).toBe("sw_dba");
    expect(resolveIntelligenceKey("Database Administrator")).toBe("sw_dba");
  });

  it("keeps unresolved free text from silently falling back", () => {
    const resolved = resolveRoleInput("Oracle Ninja Wizard");
    expect(resolved.canonicalKey).toBeNull();
    expect(resolved.requiresConfirmation).toBe(true);
    expect(resolved.source).toBe("unresolved");
  });

  it("produces distinct action groups for Oracle evaluation roles", () => {
    const software = getPersonalizedActions("Software Developer", "mid", 62, "US");
    const backend = getPersonalizedActions("Backend Developer", "mid", 62, "US");
    const dba = getPersonalizedActions("Database Administrator", "mid", 62, "US");

    expect(software.roleGroup).toBe("swe");
    expect(backend.roleGroup).toBe("swe_backend");
    expect(dba.roleGroup).toBe("data_engineer");
    expect(software.roleGroup).not.toBe(backend.roleGroup);
  });

  // Regression: cloud_platform_actions.ts's ALIAS_ADDITIONS_CLOUD_PLATFORM module
  // loads after the base HUMAN_TITLE_ALIAS_MAP and previously shadowed
  // 'analytics engineer' / 'dbt engineer' with canonicalKey 'data_engineer',
  // making the dedicated analytics_engineer ACTION_DB pool (and its Phase-2
  // content) completely unreachable by title. Fixed to route to the correct
  // analytics_engineer canonical key.
  it("resolves Analytics Engineer / dbt Engineer to the dedicated analytics_engineer group, not data_engineer", () => {
    expect(resolveRoleInput("Analytics Engineer").canonicalKey).toBe("analytics_engineer");
    expect(resolveRoleInput("dbt engineer").canonicalKey).toBe("analytics_engineer");

    const analyticsEng = getPersonalizedActions("Analytics Engineer", "mid", 62, "US");
    const dataEng = getPersonalizedActions("Data Engineer", "mid", 62, "US");
    expect(analyticsEng.roleGroup).toBe("analytics_engineer");
    expect(analyticsEng.roleGroup).not.toBe(dataEng.roleGroup);
  });

  // Regression: manufacturing_energy_construction_actions.ts's alias module
  // (loaded after the base map) previously routed 'quality assurance engineer'
  // — overwhelmingly a software-QA title on a tech-dominant platform — to its
  // manufacturing 'quality_engineer' pool (Minitab/SPC/ASQ-CQE actions),
  // shadowing the far more relevant qa_engineer pool (SDET transition,
  // contract testing, AI test-generation tooling) for that exact title.
  it("resolves Quality Assurance Engineer to the software qa_engineer group, not the manufacturing quality_engineer group", () => {
    expect(resolveRoleInput("Quality Assurance Engineer").canonicalKey).toBe("qa_engineer");

    const qaEng = getPersonalizedActions("Quality Assurance Engineer", "mid", 70, "US");
    const qaEngShort = getPersonalizedActions("QA Engineer", "mid", 70, "US");
    expect(qaEng.roleGroup).toBe("qa_engineer");
    expect(qaEng.roleGroup).toBe(qaEngShort.roleGroup);

    // The plain 'Quality Engineer' (no "assurance") title is unambiguously
    // manufacturing and should remain unaffected by this fix.
    const manufacturingQuality = getPersonalizedActions("Quality Engineer", "mid", 70, "US");
    expect(manufacturingQuality.roleGroup).toBe("quality_engineer");
  });

  // Regression: "BI Analyst" (the common short-form title) had no base-map
  // alias entry — only the long form "Business Intelligence Analyst" and
  // "BI Developer" resolved. A user typing the obvious abbreviation fell
  // through to "unresolved" and never reached the dedicated bi_analyst pool.
  it("resolves the short-form 'BI Analyst' title to the bi_analyst group", () => {
    expect(resolveRoleInput("BI Analyst").canonicalKey).toBe("bi_analyst");
    expect(getPersonalizedActions("BI Analyst", "mid", 60, "US").roleGroup).toBe("bi_analyst");
  });

  // Regression: industrial_engineering_actions.ts's alias module (loaded
  // after qa_frontend_mobile_actions.ts) previously routed the bare
  // "reliability engineer" — an extremely common, unqualified SOFTWARE/SRE
  // title on a tech-dominant platform — to its manufacturing reliability_engineer
  // pool (CMRP, Weibull++, predictive maintenance), shadowing the tech-relevant
  // chaos_qa_engineer pool (Gremlin, k6, error budgets, FMEA ownership).
  it("resolves the bare 'Reliability Engineer' to the tech chaos_qa_engineer group, not the manufacturing reliability_engineer group", () => {
    expect(getPersonalizedActions("Reliability Engineer", "mid", 60, "US").roleGroup).toBe("chaos_qa_engineer");

    // Manufacturing-qualified variants remain unambiguous and unaffected.
    const manufacturing = getPersonalizedActions("Maintenance Reliability Engineer", "mid", 60, "US");
    expect(manufacturing.roleGroup).toBe("reliability_engineer");
  });
});
