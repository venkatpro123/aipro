// CardSkeleton.tsx — Wave 6.1 Skeleton Screen System
//
// Generic shimmer skeleton for loading states.
// Use instead of text spinners in Suspense fallbacks.

import React from 'react';

interface Props {
  height?: number | string;
  width?: string;
  rounded?: string;
  className?: string;
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
};

// Inject shimmer keyframes once
if (typeof document !== 'undefined' && !document.getElementById('hp-skeleton-style')) {
  const style = document.createElement('style');
  style.id = 'hp-skeleton-style';
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

export const CardSkeleton: React.FC<Props> = ({
  height = 80, width = '100%', rounded = '12px', className = '',
}) => (
  <div
    className={className}
    style={{ height, width, borderRadius: rounded, ...shimmerStyle }}
  />
);

export const TextSkeleton: React.FC<{ width?: string; height?: number }> = ({
  width = '80%', height = 12,
}) => (
  <CardSkeleton height={height} width={width} rounded="6px" />
);

export const AvatarSkeleton: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <CardSkeleton height={size} width={`${size}px`} rounded="50%" />
);

export default CardSkeleton;
