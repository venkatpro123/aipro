// useOrchestratorBus.ts — Phase 2 (R11, R13): Reactive signal → recommendation
//
// Subscribes to the OrchestratorBus event emitter in signalOrchestrator.ts.
// Whenever a new orchestration fires (any call to orchestrate()), this hook
// provides the updated OrchestratedFeed to the subscribing component.
//
// Usage:
//   const latestFeed = useOrchestratorBus();
//   // latestFeed is null until the first orchestration fires or initialFeed is provided.
//
// Components use this for push-on-change updates without requiring a re-audit.
// The hook is purely reactive — it never calls orchestrate() itself.

import { useState, useEffect } from 'react';
import { subscribeToOrchestrator, type OrchestratedFeed } from '../services/orchestration/signalOrchestrator';

export function useOrchestratorBus(
  initialFeed?: OrchestratedFeed | null,
): OrchestratedFeed | null {
  const [feed, setFeed] = useState<OrchestratedFeed | null>(initialFeed ?? null);

  useEffect(() => {
    // Subscribe — returns unsubscribe cleanup fn
    return subscribeToOrchestrator((newFeed) => {
      setFeed(newFeed);
    });
  }, []);

  return feed;
}
