// types.ts
// Shared types for AuditTabs components.

import type { HybridResult } from "@/types/hybridResult";
import type { CompanyData } from "@/data/companyDatabase";

export interface TabProps {
  result: HybridResult;
  companyData: CompanyData;
  onDownload?: () => void;
  onRecalculate?: () => void;
  /** Current pipeline stage label — shown in AnalysisTab skeleton when brief is computing */
  auditStage?: string;
  /** V4 dashboard: true when mode === 'emergency'. Drives layout transformation in new tabs. */
  emergencyMode?: boolean;
}
