// EnsembleLoadingState.tsx — replaced by unified AuditLoader (Phase 6 UI/UX redesign).
// Props preserved for backwards-compatibility.

import React from 'react';
import { AuditLoader, mapEnsembleStage } from './AuditLoader';

interface Props {
  stage: number; // 0=starting, 1=agents running, 2=synthesizing, 3=done
}

export const EnsembleLoadingState: React.FC<Props> = ({ stage }) => (
  <AuditLoader stage={mapEnsembleStage(stage)} />
);

export default EnsembleLoadingState;
