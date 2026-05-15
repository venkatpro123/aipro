// executiveMovementLayer.ts — DAG migration of L14 executive movement.
//
// Legacy call site:
//   const departures = deriveExecutiveDepartures(companyData);
//   const executiveMovement = computeExecutiveMovementRisk(departures);
//   (hybridResult as any).executiveMovement = executiveMovement;
//
// In the DAG this becomes a pure-compute layer: no I/O, depends only on
// companyData, and its output is consumable by downstream layers via
// ctx.read('executive_movement').

import { registerLayer, type AuditLayer } from '../layerRegistry';
import {
  computeExecutiveMovementRisk,
  deriveExecutiveDepartures,
  type ExecutiveMovementSignal,
} from '../../../services/executiveMovementEngine';

const NEUTRAL_SIGNAL: ExecutiveMovementSignal = {
  departures: [],
  riskSignalStrength: 0,
  layoffProbabilityUplift: 0,
  isLeadershipExodus: false,
  mostAlarmingDeparture: null,
  interpretation: 'Layer fell back — no executive movement signal computed.',
  scoreAmplifier: 1.0,
  recommendedActions: [],
};

export const executiveMovementLayer: AuditLayer<'executive_movement'> = {
  id: 'executive_movement',
  dependencies: [],
  // Pure compute over companyData fields.
  timeoutMs: 150,
  failureMode: 'degrade',
  async run(ctx) {
    const departures = deriveExecutiveDepartures(ctx.companyData);
    return computeExecutiveMovementRisk(departures);
  },
  fallback: () => NEUTRAL_SIGNAL,
};

registerLayer(executiveMovementLayer as AuditLayer);
