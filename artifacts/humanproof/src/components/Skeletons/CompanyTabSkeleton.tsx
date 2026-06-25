// CompanyTabSkeleton.tsx — Wave 6.1 Skeleton Screen System
// Layout-matched skeleton for the Company (IntelligenceTab).

import React from 'react';
import { CardSkeleton, TextSkeleton } from './CardSkeleton';

const BlockSkeleton: React.FC<{ open?: boolean }> = ({ open = false }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
    <div className="flex items-center gap-3 p-4">
      <div className="w-8 h-8 rounded-full flex-shrink-0" style={{
        background: 'linear-gradient(90deg, var(--alpha-bg-04) 25%, var(--alpha-bg-08) 50%, var(--alpha-bg-04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
      }} />
      <div className="flex-1 flex flex-col gap-1.5">
        <TextSkeleton width="60%" height={11} />
        <TextSkeleton width="45%" height={9} />
      </div>
    </div>
    {open && (
      <div className="px-4 pb-4 flex flex-col gap-2">
        <CardSkeleton height={60} />
        <CardSkeleton height={60} />
      </div>
    )}
  </div>
);

export const CompanyTabSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 px-1">
    {/* CompanyPulseCard skeleton — top, collapsed */}
    <BlockSkeleton open={false} />
    {/* Ground truth signals — may be open */}
    <BlockSkeleton open={true} />
    {/* Market environment */}
    <BlockSkeleton open={false} />
  </div>
);

export default CompanyTabSkeleton;
