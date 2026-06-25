// CareerIllustrations.tsx — P1 Visual Storytelling
//
// Premium SVG illustration components for career intelligence concepts.
// Each illustration uses the design system colors (cyan, violet, emerald, amber, red)
// with gradient fills and subtle glow effects for premium feel.
// Designed to replace text-heavy explanations with visual anchors.

import React from 'react';

interface IllustrationProps {
  size?: number;
  className?: string;
}

// Shield with pulse — career protection / low risk
export const ProtectionIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    <defs>
      <linearGradient id="shield-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
      </linearGradient>
      <filter id="shield-glow">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Outer pulse rings */}
    <circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" strokeWidth="0.5" strokeOpacity="0.15">
      <animate attributeName="r" values="45;55;45" dur="4s" repeatCount="indefinite" />
      <animate attributeName="stroke-opacity" values="0.15;0.05;0.15" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="60" cy="60" r="40" fill="none" stroke="#10b981" strokeWidth="0.5" strokeOpacity="0.1">
      <animate attributeName="r" values="35;42;35" dur="3s" repeatCount="indefinite" />
    </circle>
    {/* Shield body */}
    <path
      d="M60 20 L90 38 L90 62 C90 82 75 98 60 104 C45 98 30 82 30 62 L30 38 Z"
      fill="url(#shield-grad)"
      fillOpacity="0.15"
      stroke="#10b981"
      strokeWidth="1.5"
      strokeOpacity="0.5"
      filter="url(#shield-glow)"
    />
    {/* Check mark */}
    <path
      d="M45 60 L55 72 L78 48"
      fill="none"
      stroke="#10b981"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.8"
    />
    {/* Inner glow dot */}
    <circle cx="60" cy="60" r="3" fill="#10b981" fillOpacity="0.4">
      <animate attributeName="fill-opacity" values="0.4;0.15;0.4" dur="2s" repeatCount="indefinite" />
    </circle>
  </svg>
);

// AI brain circuit — AI displacement / automation risk
export const AIDisplacementIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    <defs>
      <linearGradient id="ai-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#00d4e0" stopOpacity="0.4" />
      </linearGradient>
    </defs>
    {/* Brain outline */}
    <ellipse cx="60" cy="55" rx="32" ry="28" fill="none" stroke="url(#ai-grad)" strokeWidth="1.5" strokeOpacity="0.5" />
    {/* Neural connections */}
    {[[40, 42, 55, 50], [55, 50, 70, 45], [70, 45, 80, 55], [45, 58, 60, 65], [60, 65, 75, 60], [50, 70, 65, 72], [65, 72, 78, 65]].map(([x1, y1, x2, y2], i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7c3aed" strokeWidth="0.8" strokeOpacity="0.35" />
    ))}
    {/* Neural nodes */}
    {[[40, 42], [55, 50], [70, 45], [80, 55], [45, 58], [60, 65], [75, 60], [50, 70], [65, 72]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="2.5" fill="#7c3aed" fillOpacity="0.5">
        <animate attributeName="fill-opacity" values="0.5;0.2;0.5" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
      </circle>
    ))}
    {/* Data flow arrows */}
    <path d="M35 90 L50 82" stroke="#00d4e0" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 2" />
    <path d="M85 90 L70 82" stroke="#00d4e0" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 2" />
    {/* Bottom label bar */}
    <rect x="30" y="95" width="60" height="12" rx="6" fill="#7c3aed" fillOpacity="0.1" stroke="#7c3aed" strokeWidth="0.5" strokeOpacity="0.2" />
    <text x="60" y="103" textAnchor="middle" fill="#7c3aed" fillOpacity="0.6" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">AI EXPOSURE</text>
  </svg>
);

// Rising chart with arrow — career growth / opportunity
export const OpportunityIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    <defs>
      <linearGradient id="opp-fill" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#00d4e0" stopOpacity="0" />
        <stop offset="100%" stopColor="#00d4e0" stopOpacity="0.15" />
      </linearGradient>
    </defs>
    {/* Grid lines */}
    {[30, 50, 70, 90].map(y => (
      <line key={y} x1="20" y1={y} x2="100" y2={y} stroke="var(--alpha-bg-04)" strokeWidth="0.5" />
    ))}
    {/* Growth area */}
    <path d="M20 90 L40 75 L55 78 L70 55 L85 35 L100 25 L100 90 Z" fill="url(#opp-fill)" />
    {/* Growth line */}
    <path d="M20 90 L40 75 L55 78 L70 55 L85 35 L100 25" fill="none" stroke="#00d4e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" />
    {/* Arrow tip */}
    <path d="M95 22 L100 25 L97 30" fill="none" stroke="#00d4e0" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
    {/* Glow dot at peak */}
    <circle cx="100" cy="25" r="3" fill="#00d4e0" fillOpacity="0.5">
      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
      <animate attributeName="fill-opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
    </circle>
    {/* Label */}
    <text x="60" y="108" textAnchor="middle" fill="#00d4e0" fillOpacity="0.5" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">OPPORTUNITY</text>
  </svg>
);

// Warning triangle with waves — risk alert
export const RiskAlertIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    <defs>
      <linearGradient id="risk-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
      </linearGradient>
    </defs>
    {/* Warning waves */}
    {[0, 1, 2].map(i => (
      <circle key={i} cx="60" cy="58" r={30 + i * 12} fill="none" stroke="#ef4444" strokeWidth="0.5" strokeOpacity={0.12 - i * 0.03}>
        <animate attributeName="r" values={`${28 + i * 12};${34 + i * 12};${28 + i * 12}`} dur={`${3 + i}s`} repeatCount="indefinite" />
      </circle>
    ))}
    {/* Triangle */}
    <path
      d="M60 25 L92 82 L28 82 Z"
      fill="url(#risk-grad)"
      fillOpacity="0.12"
      stroke="#ef4444"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeOpacity="0.45"
    />
    {/* Exclamation */}
    <line x1="60" y1="45" x2="60" y2="62" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
    <circle cx="60" cy="72" r="2" fill="#ef4444" fillOpacity="0.7" />
    {/* Label */}
    <text x="60" y="105" textAnchor="middle" fill="#ef4444" fillOpacity="0.5" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">RISK ALERT</text>
  </svg>
);

// Skill evolution — nodes transforming
export const SkillEvolutionIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    <defs>
      <linearGradient id="skill-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#00d4e0" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    {/* Evolution path */}
    <path d="M20 60 C35 60 35 35 55 35 C75 35 75 60 95 60" fill="none" stroke="url(#skill-grad)" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="4 3" />
    <path d="M20 80 C35 80 35 60 55 60 C75 60 75 80 95 80" fill="none" stroke="url(#skill-grad)" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 3" />
    {/* Skill nodes — old (fading) */}
    <circle cx="20" cy="60" r="6" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.3" />
    <circle cx="20" cy="80" r="4" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.2" />
    {/* Skill nodes — transitioning */}
    <circle cx="55" cy="35" r="7" fill="#00d4e0" fillOpacity="0.15" stroke="#00d4e0" strokeWidth="1" strokeOpacity="0.4">
      <animate attributeName="fill-opacity" values="0.15;0.25;0.15" dur="3s" repeatCount="indefinite" />
    </circle>
    <circle cx="55" cy="60" r="5" fill="#00d4e0" fillOpacity="0.1" stroke="#00d4e0" strokeWidth="0.8" strokeOpacity="0.3" />
    {/* Skill nodes — new (bright) */}
    <circle cx="95" cy="60" r="8" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.2" strokeOpacity="0.5">
      <animate attributeName="r" values="8;9.5;8" dur="2.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="95" cy="80" r="5" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeWidth="0.8" strokeOpacity="0.3" />
    {/* Arrow heads */}
    <path d="M90 57 L95 60 L90 63" fill="none" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" />
    {/* Labels */}
    <text x="20" y="100" textAnchor="middle" fill="#f59e0b" fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="600">OLD</text>
    <text x="55" y="100" textAnchor="middle" fill="#00d4e0" fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="600">EVOLVING</text>
    <text x="95" y="100" textAnchor="middle" fill="#10b981" fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="600">NEW</text>
  </svg>
);

// Market dynamics — waves with data points
export const MarketDynamicsIllustration: React.FC<IllustrationProps> = ({ size = 120, className }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
    <defs>
      <linearGradient id="market-wave" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#00d4e0" stopOpacity="0.3" />
        <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
      </linearGradient>
    </defs>
    {/* Wave layers */}
    <path d="M0 70 Q30 50 60 65 Q90 80 120 60" fill="none" stroke="url(#market-wave)" strokeWidth="1.5">
      <animate attributeName="d" values="M0 70 Q30 50 60 65 Q90 80 120 60;M0 65 Q30 55 60 60 Q90 75 120 65;M0 70 Q30 50 60 65 Q90 80 120 60" dur="6s" repeatCount="indefinite" />
    </path>
    <path d="M0 80 Q30 65 60 75 Q90 85 120 72" fill="none" stroke="#00d4e0" strokeWidth="0.8" strokeOpacity="0.2">
      <animate attributeName="d" values="M0 80 Q30 65 60 75 Q90 85 120 72;M0 75 Q30 70 60 70 Q90 80 120 75;M0 80 Q30 65 60 75 Q90 85 120 72" dur="5s" repeatCount="indefinite" />
    </path>
    {/* Data markers */}
    {[[25, 55], [50, 60], [75, 50], [95, 58]].map(([cx, cy], i) => (
      <g key={i}>
        <line x1={cx} y1={cy} x2={cx} y2={90} stroke="var(--alpha-bg-06)" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r="2.5" fill="#00d4e0" fillOpacity="0.4" stroke="#00d4e0" strokeWidth="0.5" strokeOpacity="0.3" />
      </g>
    ))}
    {/* Bottom axis */}
    <line x1="15" y1="95" x2="105" y2="95" stroke="var(--alpha-bg-06)" strokeWidth="0.5" />
    <text x="60" y="110" textAnchor="middle" fill="#00d4e0" fillOpacity="0.4" fontSize="6" fontFamily="var(--font-mono)" fontWeight="700">MARKET DYNAMICS</text>
  </svg>
);

export const CareerIllustrations = {
  ProtectionIllustration,
  AIDisplacementIllustration,
  OpportunityIllustration,
  RiskAlertIllustration,
  SkillEvolutionIllustration,
  MarketDynamicsIllustration,
};
