import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWindowSize } from '../hooks/useWindowSize';

interface Dimension {
  key: string;
  label: string;
  score: number;
  icon?: string;
}

interface Props {
  dimensions: Dimension[];
  size?: number;
  color?: string;
}

export const DimensionRadar: React.FC<Props> = ({ 
  dimensions, 
  size: initialSize = 320, 
  color = 'var(--cyan)' 
}) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const size = isMobile ? Math.min(initialSize, width - 48) : initialSize;

  const CENTER = size / 2;
  const RADIUS = size * 0.35;
  const LABEL_OFFSET = size * 0.08;

  // Calculate polygon points within a fixed 400x400 coordinate system
  const points = useMemo(() => {
    return dimensions.map((d, i) => {
      const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2;
      const r = (d.score / 100) * RADIUS;
      
      // Calculate normal label positions
      const lx = CENTER + (RADIUS + LABEL_OFFSET) * Math.cos(angle);
      const ly = CENTER + (RADIUS + LABEL_OFFSET) * Math.sin(angle);

      return {
        x: CENTER + r * Math.cos(angle),
        y: CENTER + r * Math.sin(angle),
        labelX: lx,
        labelY: ly,
        angle
      };
    });
  }, [dimensions]);

  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return d + ' Z';
  }, [points]);

  const webLines = [0.2, 0.4, 0.6, 0.8, 1].map((scale) => {
    return dimensions.map((_, i) => {
      const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2;
      const r = RADIUS * scale;
      return {
        x: CENTER + r * Math.cos(angle),
        y: CENTER + r * Math.sin(angle),
      };
    });
  });

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '450px', 
      margin: '0 auto',
      aspectRatio: '1/1',
      position: 'relative'
    }} className="fade-in">
      <svg 
        viewBox="0 0 400 400" 
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="radarGrad">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </radialGradient>
          <filter id="radarBlur">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Web Background */}
        {webLines.map((line, idx) => (
          <path
            key={idx}
            d={line.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'}
            fill="none"
            stroke="var(--alpha-bg-06)"
            strokeWidth="0.5"
          />
        ))}

        {/* Axis Lines */}
        {dimensions.map((_, i) => {
          const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2;
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={CENTER + RADIUS * Math.cos(angle)}
              y2={CENTER + RADIUS * Math.sin(angle)}
              stroke="var(--alpha-bg-06)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* The Data Polygon */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          d={pathData}
          fill="url(#radarGrad)"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          filter="url(#radarBlur)"
        />

        {/* Data Points */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            initial={{ r: 0 }}
            animate={{ r: 3.5 }}
            transition={{ delay: 0.8 + (i * 0.08) }}
            cx={p.x}
            cy={p.y}
            fill={color}
            stroke="#fff"
            strokeWidth="0.5"
          />
        ))}

        {/* Labels with improved positioning */}
        {dimensions.map((d, i) => {
          const p = points[i];
          const angle = p.angle;
          
          // Improved anchoring
          let textAnchor: "middle" | "start" | "end" = 'middle';
          if (Math.cos(angle) > 0.1) textAnchor = 'start';
          if (Math.cos(angle) < -0.1) textAnchor = 'end';

          let dy = '0.35em';
          if (Math.sin(angle) > 0.5) dy = '0.8em';
          if (Math.sin(angle) < -0.5) dy = '-0.5em';

          return (
            <g key={i}>
              <text
                x={p.labelX}
                y={p.labelY}
                textAnchor={textAnchor}
                dy={dy}
                fill="var(--text-2)"
                fontSize="11"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                {d.label}
              </text>
              <text
                x={p.labelX}
                y={p.labelY}
                textAnchor={textAnchor}
                dy={Math.sin(angle) > 0.5 ? '2.1em' : (Math.sin(angle) < -0.5 ? '0.8em' : '1.55em')}
                fill={color}
                fontSize="14"
                fontFamily="var(--font-display)"
                fontWeight="900"
              >
                {d.score}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
