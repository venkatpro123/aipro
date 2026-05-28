// SpyLoadingState.tsx — Globe intelligence-scan loader.
// Delegates to GlobeAuditLoader. Props preserved for backwards-compatibility.

import React from 'react';
import { GlobeAuditLoader } from './GlobeAuditLoader';
import { mapEnsembleStage } from './AuditLoader';

interface Props {
  stage: number;
  companyName?: string;
  roleTitle?: string;       // accepted but not forwarded
  agentCount?: number;      // accepted but not forwarded
  limitedDataMode?: boolean;
  limitedDataReason?: string;
}

export const SpyLoadingState: React.FC<Props> = ({
  stage,
  companyName,
  limitedDataMode,
  limitedDataReason,
}) => (
  <GlobeAuditLoader
    stage={mapEnsembleStage(stage)}
    companyName={companyName}
    limitedDataMode={limitedDataMode}
    limitedDataReason={limitedDataReason}
  />
);

export default SpyLoadingState;
