// useStaggeredReveal.ts — Wave 6.2
//
// Progressively reveals a list of items with a configurable delay between each.
// Used to animate data arrival in signal chips, driver cards, and action items
// so they feel "live" rather than appearing as a static dump.
//
// Returns a subset of items that have been "revealed" so far.
// Items are added one-by-one at intervals. On unmount, all timeouts are cleared.
//
// Usage:
//   const visibleSignals = useStaggeredReveal(allSignals, 80);
//   return visibleSignals.map(signal => <SignalChip key={signal.id} {...signal} />);
//
// Notes:
//   • Resets when `items` reference changes (new audit result)
//   • If delayMs is 0, returns all items immediately (no animation needed)
//   • In reduced-motion mode, callers should pass delayMs = 0

import { useState, useEffect, useRef } from 'react';

export function useStaggeredReveal<T>(items: T[], delayMs: number): T[] {
  const [revealed, setRevealed] = useState<T[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear previous timers before starting a new reveal sequence
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (delayMs <= 0 || items.length === 0) {
      // Skip animation — reveal all at once
      setRevealed(items);
      return;
    }

    // Reset and reveal items progressively
    setRevealed([]);

    items.forEach((item, index) => {
      const t = setTimeout(() => {
        setRevealed(prev => [...prev, item]);
      }, index * delayMs);
      timeoutsRef.current.push(t);
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  // We want to re-run when items array reference changes (new audit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, delayMs]);

  return revealed;
}
