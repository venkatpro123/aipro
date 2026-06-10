// DefenseIntelligenceContext.tsx
// Shared signal bus: clicking a threat in any tab illuminates related items in all other tabs

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DefenseIntelligenceState {
  // The dimension key (e.g. "D1", "L2") that the user clicked to investigate
  activeThreat: string | null;
  setActiveThreat: (key: string | null) => void;
  // The programmatic tab the CommandCenter wants to navigate to
  requestedTab: string | null;
  setRequestedTab: (tab: string | null) => void;
}

const DefenseIntelligenceContext = createContext<DefenseIntelligenceState>({
  activeThreat: null,
  setActiveThreat: () => {},
  requestedTab: null,
  setRequestedTab: () => {},
});

export function DefenseIntelligenceProvider({ children }: { children: ReactNode }) {
  const [activeThreat, setActiveThreat] = useState<string | null>(null);
  const [requestedTab, setRequestedTab] = useState<string | null>(null);

  return (
    <DefenseIntelligenceContext.Provider
      value={{ activeThreat, setActiveThreat, requestedTab, setRequestedTab }}
    >
      {children}
    </DefenseIntelligenceContext.Provider>
  );
}

export function useDefenseIntelligence() {
  return useContext(DefenseIntelligenceContext);
}
