import { getRoleEntryByKey } from "@/data/oracleRoleIndex";
import { getCareerIntelligence, hasSeededData } from "@/data/intelligence";

export type ResolvedRoleSource =
  | "oracle_picker"
  | "alias_map"
  | "catalog_bridge"
  | "unresolved";

export interface ResolvedRole {
  input: string;
  canonicalKey: string | null;
  displayRole: string | null;
  source: ResolvedRoleSource;
  confidence: number;
  requiresConfirmation: boolean;
}

const HUMAN_TITLE_ALIAS_MAP: Record<string, { canonicalKey: string; displayRole: string }> = {
  "software developer": { canonicalKey: "sw_software_engineer", displayRole: "Software Engineer" },
  "software engineer": { canonicalKey: "sw_software_engineer", displayRole: "Software Engineer" },
  "backend developer": { canonicalKey: "sw_backend", displayRole: "Backend Developer" },
  "backend engineer": { canonicalKey: "sw_backend", displayRole: "Backend Developer" },
  "product manager": { canonicalKey: "sw_pm", displayRole: "Product Manager" },
  "product owner": { canonicalKey: "sw_pm", displayRole: "Product Manager" },
  "database administrator": { canonicalKey: "sw_dba", displayRole: "Database Administrator (DBA)" },
  "database administrator dba": { canonicalKey: "sw_dba", displayRole: "Database Administrator (DBA)" },
  dba: { canonicalKey: "sw_dba", displayRole: "Database Administrator (DBA)" },
};

const CANONICAL_TO_ACTION_GROUP: Record<string, string> = {
  sw_software_engineer: "swe",
  sw_backend: "swe_backend",
  sw_frontend: "swe_frontend",
  sw_fullstack: "swe_fullstack",
  sw_mobile_crossplatform: "swe_mobile",
  sw_dba: "data_engineer",
  sw_pm: "product_manager",
};

const normalizeRoleTitle = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function canonicalKeyToActionGroup(canonicalKey: string | null | undefined): string | null {
  if (!canonicalKey) return null;
  return CANONICAL_TO_ACTION_GROUP[canonicalKey] ?? null;
}

export function resolveRoleInput(
  input: string,
  options?: { oracleKey?: string | null },
): ResolvedRole {
  const trimmed = input.trim();
  const explicitOracleKey = options?.oracleKey?.trim();

  if (explicitOracleKey) {
    const roleEntry = getRoleEntryByKey(explicitOracleKey);
    const intel = getCareerIntelligence(explicitOracleKey);
    return {
      input,
      canonicalKey: explicitOracleKey,
      displayRole: roleEntry?.displayTitle ?? intel?.displayRole ?? explicitOracleKey,
      source: "oracle_picker",
      confidence: 1,
      requiresConfirmation: false,
    };
  }

  if (!trimmed) {
    return {
      input,
      canonicalKey: null,
      displayRole: null,
      source: "unresolved",
      confidence: 0,
      requiresConfirmation: false,
    };
  }

  const normalized = normalizeRoleTitle(trimmed);
  const alias = HUMAN_TITLE_ALIAS_MAP[normalized];
  if (alias) {
    return {
      input,
      canonicalKey: alias.canonicalKey,
      displayRole: alias.displayRole,
      source: "alias_map",
      confidence: 0.95,
      requiresConfirmation: false,
    };
  }

  const canUseCatalogBridge = trimmed.includes("_") || !trimmed.includes(" ");
  if (canUseCatalogBridge && hasSeededData(trimmed)) {
    const intel = getCareerIntelligence(trimmed);
    return {
      input,
      canonicalKey: trimmed,
      displayRole: intel?.displayRole ?? trimmed,
      source: "catalog_bridge",
      confidence: 0.85,
      requiresConfirmation: false,
    };
  }

  return {
    input,
    canonicalKey: null,
    displayRole: null,
    source: "unresolved",
    confidence: 0,
    requiresConfirmation: true,
  };
}
