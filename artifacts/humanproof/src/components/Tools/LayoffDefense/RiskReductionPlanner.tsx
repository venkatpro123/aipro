// RiskReductionPlanner.tsx — Shows which levers reduce risk most
import { WhatIfSimulatorPanel } from '../../AuditTabs/WhatIfSimulatorPanel';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

export function RiskReductionPlanner({ scoreResult }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Risk Reduction Planner
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Simulate which changes will lower your layoff risk score most.
          Adjust inputs to see projected impact.
        </div>
      </div>
      <WhatIfSimulatorPanel result={scoreResult} />
    </div>
  );
}
