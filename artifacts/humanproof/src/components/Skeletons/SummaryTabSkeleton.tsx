// SummaryTabSkeleton.tsx — Wave 6.1 Skeleton Screen System
//
// Layout-matched skeleton for SummaryTab.
// Matches: score ring placeholder, 3 driver cards, 2 action items.
// Use as Suspense fallback when SummaryTab is lazy-loaded.

import React from 'react';
import { CardSkeleton, TextSkeleton } from './CardSkeleton';

export const SummaryTabSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4 px-1">
    {/* Score ring + tier placeholder */}
    <div className="rounded-2xl p-5" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-2">
          <TextSkeleton width="120px" height={10} />
          <TextSkeleton width="80px" height={8} />
        </div>
        {/* Ring placeholder */}
        <div className="w-28 h-28 rounded-full" style={{
          background: 'linear-gradient(90deg, var(--alpha-bg-04) 25%, var(--alpha-bg-08) 50%, var(--alpha-bg-04) 75%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
        }} />
      </div>
      <CardSkeleton height={32} rounded="8px" />
    </div>

    {/* 3 driver cards */}
    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-xl p-3 flex flex-col gap-2"
          style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
          <TextSkeleton width="60%" height={8} />
          <CardSkeleton height={20} rounded="6px" />
          <TextSkeleton width="80%" height={8} />
        </div>
      ))}
    </div>

    {/* 2 action items */}
    {[0, 1].map(i => (
      <div key={i} className="rounded-xl p-3 flex items-start gap-3"
        style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{
          background: 'var(--alpha-bg-06)', animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
          backgroundSize: '200% 100%',
          backgroundImage: 'linear-gradient(90deg, var(--alpha-bg-04) 25%, var(--alpha-bg-08) 50%, var(--alpha-bg-04) 75%)',
        }} />
        <div className="flex-1 flex flex-col gap-2">
          <TextSkeleton width="70%" height={12} />
          <TextSkeleton width="90%" height={10} />
        </div>
      </div>
    ))}
  </div>
);

export default SummaryTabSkeleton;
