// SpyLoadingState.tsx — Phase 11: Cinematic Earth AI analysis loader.
// Delegates to EarthAnalysisLoader. Props preserved for backwards-compatibility.

import React from 'react';
import { EarthAnalysisLoader } from './EarthAnalysisLoader';
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
  <EarthAnalysisLoader
    stage={mapEnsembleStage(stage)}
    companyName={companyName}
    limitedDataMode={limitedDataMode}
    limitedDataReason={limitedDataReason}
  />
);

export default SpyLoadingState;
