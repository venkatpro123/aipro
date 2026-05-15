// Barrel: importing this file registers every layer with the registry.
//
// IMPORTANT: every new layer file MUST be listed here. The registry is
// built at module load via top-level registerLayer() side effects; an
// unimported layer is an invisible layer.

import './macroSnapshotLayer';
import './cohortClassifierLayer';
import './stealthLayoffLayer';
import './acquisitionPremiumLayer';
import './conformalCILayer';
import './evidencePresenceLayer';
import './peerContagionLayer';
import './executiveMovementLayer';
import './hiringSignalLayer';
import './employeeSentimentLayer';
import './headcountVelocityLayer';
// Add new layer imports below as they migrate from the legacy pipeline.
// Layers with `core` as a dependency (e.g. conformal_ci) require the
// legacy engine to ctx.emit('core', ...) before executeRegistry is
// invoked for that wave. See hybridOrchestrator.ts for the bridge.
