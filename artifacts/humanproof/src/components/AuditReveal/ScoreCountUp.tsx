// ScoreCountUp.tsx — animated number counter for AuditRevealScreen
// Counts from 0 (or from) to the target value over the specified duration.

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  to: number;
  from?: number;
  duration?: number; // ms, default 1200
  className?: string;
  style?: React.CSSProperties;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const ScoreCountUp: React.FC<Props> = ({
  to, from = 0, duration = 1200, className, style,
}) => {
  const [current, setCurrent] = useState(from);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setCurrent(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [to, from, duration]);

  return <span className={className} style={style}>{current}</span>;
};

export default ScoreCountUp;
