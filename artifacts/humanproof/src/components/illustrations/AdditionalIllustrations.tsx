// AdditionalIllustrations.tsx — P3 Visual Completeness
//
// 6 additional SVG illustrations for career concepts not covered
// by CareerIllustrations.tsx. Extends the visual language.

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

// Network/connections — professional network strength
export const NetworkIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    {/* Connection lines */}
    {[[30,40,60,30],[60,30,90,45],[30,40,50,70],[50,70,85,65],[60,30,50,70],[90,45,85,65],[85,65,70,90],[50,70,35,85]].map(([x1,y1,x2,y2],i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,212,224,0.20)" strokeWidth="1" />
    ))}
    {/* Nodes */}
    {[[60,30,7,'#00d4e0'],[30,40,5,'#7c3aed'],[90,45,5,'#10b981'],[50,70,6,'#00d4e0'],[85,65,4,'#f59e0b'],[70,90,4,'#7c3aed'],[35,85,3,'#10b981']].map(([cx,cy,r,color],i) => (
      <g key={i}>
        <circle cx={cx as number} cy={cy as number} r={(r as number)+3} fill={color as string} fillOpacity="0.08" />
        <circle cx={cx as number} cy={cy as number} r={r as number} fill={color as string} fillOpacity="0.5" stroke={color as string} strokeWidth="0.5" strokeOpacity="0.3">
          {i === 0 && <animate attributeName="r" values={`${r};${(r as number)+1.5};${r}`} dur="3s" repeatCount="indefinite" />}
        </circle>
      </g>
    ))}
    <text x="60" y="110" textAnchor="middle" fill="#00d4e0" fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">NETWORK</text>
  </svg>
);

// Financial runway — coins/bar chart
export const FinancialRunwayIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    {/* Bar chart bars */}
    {[{x:25,h:50,c:'#10b981'},{x:40,h:40,c:'#22d3ee'},{x:55,h:55,c:'#10b981'},{x:70,h:35,c:'#f59e0b'},{x:85,h:20,c:'#ef4444'}].map((b,i) => (
      <g key={i}>
        <rect x={b.x} y={85-b.h} width={10} height={b.h} rx={3} fill={b.c} fillOpacity="0.20" stroke={b.c} strokeWidth="0.5" strokeOpacity="0.30" />
        <rect x={b.x} y={85-b.h} width={10} height={b.h*0.6} rx={3} fill={b.c} fillOpacity="0.10" />
      </g>
    ))}
    {/* Axis */}
    <line x1="20" y1="85" x2="100" y2="85" stroke="var(--alpha-bg-06)" strokeWidth="0.5" />
    {/* Trend line */}
    <path d="M30 40 L45 50 L60 35 L75 55 L90 70" fill="none" stroke='#f59e0b' strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 2" />
    <text x="60" y="105" textAnchor="middle" fill='#f59e0b' fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">RUNWAY</text>
  </svg>
);

// Learning/upskilling — book with glow
export const LearningIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    {/* Book body */}
    <path d="M35 30 L60 25 L85 30 L85 80 L60 85 L35 80 Z" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
    {/* Book spine */}
    <line x1="60" y1="25" x2="60" y2="85" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.25" />
    {/* Page lines */}
    {[35,42,49,56].map(y => (
      <g key={y}>
        <line x1="40" y1={y} x2="56" y2={y-1.5} stroke="var(--alpha-bg-06)" strokeWidth="0.5" />
        <line x1="64" y1={y-1.5} x2="80" y2={y} stroke="var(--alpha-bg-06)" strokeWidth="0.5" />
      </g>
    ))}
    {/* Knowledge glow */}
    <circle cx="60" cy="52" r="12" fill="#7c3aed" fillOpacity="0.08">
      <animate attributeName="r" values="12;16;12" dur="3s" repeatCount="indefinite" />
      <animate attributeName="fill-opacity" values="0.08;0.03;0.08" dur="3s" repeatCount="indefinite" />
    </circle>
    {/* Star sparkle */}
    <path d="M60 44 L61.5 49 L66 50 L62 52.5 L63 57 L60 54 L57 57 L58 52.5 L54 50 L58.5 49 Z" fill="#7c3aed" fillOpacity="0.4" />
    <text x="60" y="105" textAnchor="middle" fill="#7c3aed" fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">LEARNING</text>
  </svg>
);

// Interview readiness — target/bullseye
export const InterviewIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    {/* Concentric rings */}
    {[32,24,16,8].map((r,i) => (
      <circle key={i} cx="60" cy="55" r={r} fill="none" stroke="#00d4e0" strokeWidth="1" strokeOpacity={0.08 + i * 0.06} />
    ))}
    {/* Bullseye fill */}
    <circle cx="60" cy="55" r="8" fill="#00d4e0" fillOpacity="0.15" />
    <circle cx="60" cy="55" r="3" fill="#00d4e0" fillOpacity="0.5">
      <animate attributeName="fill-opacity" values="0.5;0.3;0.5" dur="2s" repeatCount="indefinite" />
    </circle>
    {/* Arrow */}
    <line x1="82" y1="33" x2="63" y2="52" stroke="#00d4e0" strokeWidth="1.5" strokeOpacity="0.5" />
    <path d="M82 33 L78 37 L82 33 L86 37" fill="none" stroke="#00d4e0" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
    <text x="60" y="105" textAnchor="middle" fill="#00d4e0" fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">INTERVIEW</text>
  </svg>
);

// Negotiation — balanced scales
export const NegotiationIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    {/* Pillar */}
    <line x1="60" y1="25" x2="60" y2="85" stroke="var(--alpha-bg-08)" strokeWidth="2" />
    {/* Beam */}
    <line x1="30" y1="45" x2="90" y2="40" stroke='#f59e0b' strokeWidth="1.5" strokeOpacity="0.4" />
    {/* Fulcrum triangle */}
    <path d="M55 28 L65 28 L60 22 Z" fill='#f59e0b' fillOpacity="0.3" />
    {/* Left pan */}
    <path d="M20 50 Q25 60 30 50" fill="none" stroke='#f59e0b' strokeWidth="1" strokeOpacity="0.35" />
    <line x1="25" y1="45" x2="20" y2="50" stroke='#f59e0b' strokeWidth="0.8" strokeOpacity="0.3" />
    <line x1="35" y1="45" x2="30" y2="50" stroke='#f59e0b' strokeWidth="0.8" strokeOpacity="0.3" />
    {/* Right pan */}
    <path d="M80 45 Q85 55 90 45" fill="none" stroke='#10b981' strokeWidth="1" strokeOpacity="0.35" />
    <line x1="85" y1="40" x2="80" y2="45" stroke='#10b981' strokeWidth="0.8" strokeOpacity="0.3" />
    <line x1="95" y1="40" x2="90" y2="45" stroke='#10b981' strokeWidth="0.8" strokeOpacity="0.3" />
    {/* Weight indicators */}
    <circle cx="25" cy="55" r="4" fill='#f59e0b' fillOpacity="0.15" />
    <circle cx="85" cy="50" r="5" fill='#10b981' fillOpacity="0.15" />
    <text x="60" y="105" textAnchor="middle" fill='#f59e0b' fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">LEVERAGE</text>
  </svg>
);

// Career milestone — flag on summit
export const MilestoneIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    {/* Mountain path */}
    <path d="M15 90 L45 55 L60 65 L80 35 L100 90" fill="rgba(0,212,224,0.04)" stroke="rgba(0,212,224,0.15)" strokeWidth="1" />
    {/* Path dots */}
    {[[25,80],[40,60],[55,65],[70,48],[80,35]].map(([cx,cy],i) => (
      <circle key={i} cx={cx} cy={cy} r={i === 4 ? 3 : 2} fill="#00d4e0" fillOpacity={0.2 + i * 0.1} />
    ))}
    {/* Flag at summit */}
    <line x1="80" y1="20" x2="80" y2="35" stroke='#10b981' strokeWidth="1.5" strokeOpacity="0.6" />
    <path d="M80 20 L95 25 L80 30" fill='#10b981' fillOpacity="0.25" stroke='#10b981' strokeWidth="0.5" strokeOpacity="0.4" />
    {/* Summit glow */}
    <circle cx="80" cy="35" r="6" fill='#10b981' fillOpacity="0.08">
      <animate attributeName="r" values="6;9;6" dur="2.5s" repeatCount="indefinite" />
    </circle>
    <text x="60" y="108" textAnchor="middle" fill='#10b981' fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">MILESTONE</text>
  </svg>
);
