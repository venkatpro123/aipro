import { describe, expect, it } from "vitest";
import { getCareerIntelligence, resolveIntelligenceKey } from "../../data/intelligence";
import { getPersonalizedActions } from "../../services/actionPersonalizationEngine";
import { resolveRoleInput } from "../../services/roleResolution";

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
});
