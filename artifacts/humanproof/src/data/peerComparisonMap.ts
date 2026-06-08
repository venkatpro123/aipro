// peerComparisonMap — Static peer survival comparisons by role family prefix.
// Each entry: 4 adjacent or competing roles with representative Career Survival %.
// Survival % derived from automationTimeline riskTier + riskToSurvival(). Static — no API.

export interface PeerRole {
  role: string;
  pct: number;
  trend: 'up' | 'stable' | 'down';
}

export const PEER_SURVIVAL_MAP: Record<string, PeerRole[]> = {
  // ── Software Engineering ──────────────────────────────────────────
  'sw_': [
    { role: 'Software Architect',      pct: 82, trend: 'up'     },
    { role: 'AI / ML Engineer',        pct: 89, trend: 'up'     },
    { role: 'Frontend Developer',      pct: 68, trend: 'stable' },
    { role: 'QA / Test Engineer',      pct: 61, trend: 'down'   },
  ],

  // ── Data / Analytics ─────────────────────────────────────────────
  'da_': [
    { role: 'ML Engineer',             pct: 86, trend: 'up'     },
    { role: 'Data Scientist',          pct: 79, trend: 'up'     },
    { role: 'BI Analyst',              pct: 58, trend: 'down'   },
    { role: 'Data Engineer',           pct: 73, trend: 'stable' },
  ],

  // ── Machine Learning / AI ─────────────────────────────────────────
  'ml_': [
    { role: 'AI Research Scientist',   pct: 91, trend: 'up'     },
    { role: 'ML Platform Engineer',    pct: 84, trend: 'up'     },
    { role: 'Data Scientist',          pct: 79, trend: 'up'     },
    { role: 'Data Analyst',            pct: 62, trend: 'down'   },
  ],

  // ── Healthcare / Clinical ─────────────────────────────────────────
  'hc_': [
    { role: 'Surgeon',                 pct: 94, trend: 'stable' },
    { role: 'Nurse Practitioner',      pct: 88, trend: 'up'     },
    { role: 'General Physician',       pct: 82, trend: 'stable' },
    { role: 'Medical Coder',           pct: 31, trend: 'down'   },
  ],

  // ── Nursing / Allied Health ───────────────────────────────────────
  'nur_': [
    { role: 'Nurse Practitioner',      pct: 88, trend: 'up'     },
    { role: 'Registered Nurse',        pct: 84, trend: 'stable' },
    { role: 'Physical Therapist',      pct: 89, trend: 'up'     },
    { role: 'Medical Records Clerk',   pct: 28, trend: 'down'   },
  ],

  // ── Mental Health ─────────────────────────────────────────────────
  'mh_': [
    { role: 'Psychiatrist',            pct: 88, trend: 'stable' },
    { role: 'Therapist / Counselor',   pct: 85, trend: 'up'     },
    { role: 'Social Worker',           pct: 81, trend: 'stable' },
    { role: 'Life Coach',              pct: 55, trend: 'down'   },
  ],

  // ── BPO / Customer Support ───────────────────────────────────────
  'bpo_': [
    { role: 'CX Team Lead',            pct: 62, trend: 'stable' },
    { role: 'Conversation Designer',   pct: 78, trend: 'up'     },
    { role: 'Inbound Agent',           pct: 38, trend: 'down'   },
    { role: 'Quality Analyst',         pct: 44, trend: 'down'   },
  ],

  // ── Security / DevOps ─────────────────────────────────────────────
  'sec_': [
    { role: 'Security Architect',      pct: 87, trend: 'up'     },
    { role: 'Penetration Tester',      pct: 83, trend: 'up'     },
    { role: 'SOC Analyst L1',          pct: 45, trend: 'down'   },
    { role: 'Incident Responder',      pct: 79, trend: 'stable' },
  ],
  'dev_': [
    { role: 'Platform Engineer',       pct: 81, trend: 'up'     },
    { role: 'SRE',                     pct: 78, trend: 'stable' },
    { role: 'CI/CD Engineer',          pct: 62, trend: 'down'   },
    { role: 'Cloud Architect',         pct: 85, trend: 'up'     },
  ],

  // ── HR / People Ops ───────────────────────────────────────────────
  'hr_': [
    { role: 'CHRO / HR Director',      pct: 81, trend: 'stable' },
    { role: 'HR Business Partner',     pct: 72, trend: 'stable' },
    { role: 'Recruiter',               pct: 54, trend: 'down'   },
    { role: 'Payroll Administrator',   pct: 29, trend: 'down'   },
  ],

  // ── Marketing ─────────────────────────────────────────────────────
  'mkt_': [
    { role: 'Brand Strategist',        pct: 77, trend: 'stable' },
    { role: 'Marketing Director',      pct: 80, trend: 'up'     },
    { role: 'SEO Specialist',          pct: 43, trend: 'down'   },
    { role: 'Growth Marketer',         pct: 68, trend: 'stable' },
  ],

  // ── Legal ─────────────────────────────────────────────────────────
  'legal_': [
    { role: 'Trial Lawyer',            pct: 85, trend: 'stable' },
    { role: 'In-House Counsel',        pct: 79, trend: 'stable' },
    { role: 'Paralegal',               pct: 41, trend: 'down'   },
    { role: 'Legal Document Reviewer', pct: 22, trend: 'down'   },
  ],

  // ── Finance ───────────────────────────────────────────────────────
  'fin_': [
    { role: 'CFO / Finance Director',  pct: 85, trend: 'up'     },
    { role: 'Financial Analyst',       pct: 64, trend: 'stable' },
    { role: 'Accountant',              pct: 52, trend: 'down'   },
    { role: 'Bookkeeper',              pct: 31, trend: 'down'   },
  ],

  // ── Investment / Banking ──────────────────────────────────────────
  'inv_': [
    { role: 'Portfolio Manager',       pct: 79, trend: 'stable' },
    { role: 'Investment Banker',       pct: 76, trend: 'stable' },
    { role: 'Equity Research Analyst', pct: 54, trend: 'down'   },
    { role: 'Quant Analyst',           pct: 82, trend: 'up'     },
  ],

  // ── Insurance ─────────────────────────────────────────────────────
  'ins_': [
    { role: 'Actuary',                 pct: 77, trend: 'stable' },
    { role: 'Claims Adjuster',         pct: 41, trend: 'down'   },
    { role: 'Insurance Broker',        pct: 63, trend: 'stable' },
    { role: 'Underwriter',             pct: 47, trend: 'down'   },
  ],

  // ── Consulting ────────────────────────────────────────────────────
  'cons_': [
    { role: 'Strategy Principal',      pct: 82, trend: 'up'     },
    { role: 'Management Consultant',   pct: 75, trend: 'stable' },
    { role: 'Business Analyst',        pct: 59, trend: 'down'   },
    { role: 'Process Improvement Lead',pct: 67, trend: 'stable' },
  ],

  // ── Operations / Supply Chain ─────────────────────────────────────
  'ops_': [
    { role: 'Supply Chain Director',   pct: 78, trend: 'stable' },
    { role: 'Logistics Manager',       pct: 68, trend: 'stable' },
    { role: 'Warehouse Coordinator',   pct: 39, trend: 'down'   },
    { role: 'Procurement Specialist',  pct: 55, trend: 'down'   },
  ],

  // ── Product Management ────────────────────────────────────────────
  'pm_': [
    { role: 'Chief Product Officer',   pct: 83, trend: 'up'     },
    { role: 'Product Manager',         pct: 76, trend: 'stable' },
    { role: 'Product Analyst',         pct: 62, trend: 'stable' },
    { role: 'Scrum Master',            pct: 48, trend: 'down'   },
  ],

  // ── Design / UX ───────────────────────────────────────────────────
  'des_': [
    { role: 'UX Research Director',    pct: 82, trend: 'up'     },
    { role: 'Senior UX Designer',      pct: 74, trend: 'stable' },
    { role: 'UI Designer',             pct: 58, trend: 'down'   },
    { role: 'Graphic Designer',        pct: 47, trend: 'down'   },
  ],

  // ── Education ─────────────────────────────────────────────────────
  'edu_': [
    { role: 'Professor / Lecturer',    pct: 81, trend: 'stable' },
    { role: 'Curriculum Designer',     pct: 73, trend: 'stable' },
    { role: 'Tutor',                   pct: 52, trend: 'down'   },
    { role: 'Instructional Designer',  pct: 67, trend: 'stable' },
  ],

  // ── Media / Journalism ────────────────────────────────────────────
  'med_': [
    { role: 'Investigative Journalist',pct: 79, trend: 'stable' },
    { role: 'Editor-in-Chief',         pct: 76, trend: 'stable' },
    { role: 'SEO Content Writer',      pct: 34, trend: 'down'   },
    { role: 'Podcast Host',            pct: 68, trend: 'stable' },
  ],

  // ── Animation / Creative Visual ───────────────────────────────────
  'anim_': [
    { role: 'Creative Director',       pct: 78, trend: 'stable' },
    { role: '3D Animator',             pct: 61, trend: 'down'   },
    { role: 'VFX Supervisor',          pct: 74, trend: 'stable' },
    { role: 'Motion Designer',         pct: 55, trend: 'down'   },
  ],

  // ── Travel / Hospitality ─────────────────────────────────────────
  'trav_': [
    { role: 'Hotel General Manager',   pct: 75, trend: 'stable' },
    { role: 'Travel Experience Lead',  pct: 70, trend: 'stable' },
    { role: 'Tour Guide',              pct: 71, trend: 'stable' },
    { role: 'Booking Agent',           pct: 38, trend: 'down'   },
  ],

  // ── Aerospace / Aviation ─────────────────────────────────────────
  'aero_': [
    { role: 'Systems Integration Lead',pct: 85, trend: 'up'     },
    { role: 'Aerospace Engineer',      pct: 81, trend: 'stable' },
    { role: 'Avionics Technician',     pct: 72, trend: 'stable' },
    { role: 'Quality Inspector',       pct: 55, trend: 'down'   },
  ],

  // ── Government / Public Sector ────────────────────────────────────
  'gov_': [
    { role: 'Policy Director',         pct: 83, trend: 'stable' },
    { role: 'Government Analyst',      pct: 71, trend: 'stable' },
    { role: 'Civil Servant',           pct: 64, trend: 'stable' },
    { role: 'Data Entry Clerk',        pct: 24, trend: 'down'   },
  ],

  // ── Emerging / AI-Native Roles ────────────────────────────────────
  'em_': [
    { role: 'AI Systems Designer',     pct: 92, trend: 'up'     },
    { role: 'Prompt Engineer',         pct: 79, trend: 'up'     },
    { role: 'AI Ethics Lead',          pct: 86, trend: 'up'     },
    { role: 'Robotics Engineer',       pct: 88, trend: 'up'     },
  ],

  // ── Cloud ─────────────────────────────────────────────────────────
  'cloud_': [
    { role: 'Cloud Architect',         pct: 85, trend: 'up'     },
    { role: 'Platform Engineer',       pct: 81, trend: 'stable' },
    { role: 'Cloud Cost Analyst',      pct: 57, trend: 'down'   },
    { role: 'SRE',                     pct: 78, trend: 'stable' },
  ],

  // ── Retail / Sales ────────────────────────────────────────────────
  'sales_': [
    { role: 'Enterprise Sales Director',pct: 80, trend: 'stable'},
    { role: 'Account Executive',       pct: 72, trend: 'stable' },
    { role: 'SDR / BDR',               pct: 44, trend: 'down'   },
    { role: 'Sales Ops Analyst',       pct: 55, trend: 'down'   },
  ],

  // ── Veterinary ────────────────────────────────────────────────────
  'vet_': [
    { role: 'Veterinary Surgeon',      pct: 89, trend: 'stable' },
    { role: 'Veterinarian',            pct: 86, trend: 'stable' },
    { role: 'Vet Technician',          pct: 72, trend: 'stable' },
    { role: 'Vet Receptionist',        pct: 43, trend: 'down'   },
  ],

  // ── Aliases for automationTimelineData key conventions ────────────
  // These keys don't end in '_' so they are matched before prefix scan.
  'swe': [
    { role: 'Software Architect',      pct: 82, trend: 'up'     },
    { role: 'AI / ML Engineer',        pct: 89, trend: 'up'     },
    { role: 'Frontend Developer',      pct: 68, trend: 'stable' },
    { role: 'QA / Test Engineer',      pct: 61, trend: 'down'   },
  ],
  'registered_nurse': [
    { role: 'Nurse Practitioner',      pct: 88, trend: 'up'     },
    { role: 'Physical Therapist',      pct: 89, trend: 'up'     },
    { role: 'Medical Records Clerk',   pct: 28, trend: 'down'   },
    { role: 'General Physician',       pct: 82, trend: 'stable' },
  ],
  'bpo_associate': [
    { role: 'CX Team Lead',            pct: 62, trend: 'stable' },
    { role: 'Conversation Designer',   pct: 78, trend: 'up'     },
    { role: 'Inbound Agent',           pct: 38, trend: 'down'   },
    { role: 'Quality Analyst',         pct: 44, trend: 'down'   },
  ],
  'data_analyst': [
    { role: 'ML Engineer',             pct: 86, trend: 'up'     },
    { role: 'Data Scientist',          pct: 79, trend: 'up'     },
    { role: 'BI Analyst',              pct: 58, trend: 'down'   },
    { role: 'Data Engineer',           pct: 73, trend: 'stable' },
  ],
  'data_scientist': [
    { role: 'ML Engineer',             pct: 86, trend: 'up'     },
    { role: 'AI Research Scientist',   pct: 91, trend: 'up'     },
    { role: 'BI Analyst',              pct: 58, trend: 'down'   },
    { role: 'Data Analyst',            pct: 62, trend: 'down'   },
  ],
  'ml_engineer': [
    { role: 'AI Research Scientist',   pct: 91, trend: 'up'     },
    { role: 'ML Platform Engineer',    pct: 84, trend: 'up'     },
    { role: 'Data Scientist',          pct: 79, trend: 'up'     },
    { role: 'Data Analyst',            pct: 62, trend: 'down'   },
  ],
  'customer_support_specialist': [
    { role: 'CX Team Lead',            pct: 62, trend: 'stable' },
    { role: 'Conversation Designer',   pct: 78, trend: 'up'     },
    { role: 'Inbound Agent',           pct: 38, trend: 'down'   },
    { role: 'Quality Analyst',         pct: 44, trend: 'down'   },
  ],
};

export const GENERIC_FALLBACK: PeerRole[] = [
  { role: 'Knowledge Worker (Avg)', pct: 65, trend: 'stable' },
  { role: 'AI-Augmented Specialist', pct: 82, trend: 'up'    },
  { role: 'Routine Task Worker',     pct: 38, trend: 'down'  },
  { role: 'Creative Professional',   pct: 71, trend: 'stable'},
];

export function getPeersForRole(roleKey: string, userRole: string, userSurvivalPct: number): { role: string; pct: number; trend: 'up' | 'stable' | 'down'; isUser: boolean }[] {
  const key = roleKey.toLowerCase();
  let peers: PeerRole[] | undefined;

  // Try exact match first (covers full aliases like 'swe', 'ml_engineer', etc.)
  if (PEER_SURVIVAL_MAP[key]) {
    peers = PEER_SURVIVAL_MAP[key];
  } else {
    // Then try prefix match
    for (const prefix of Object.keys(PEER_SURVIVAL_MAP)) {
      if (key.startsWith(prefix) || key.startsWith(prefix.replace('_', ''))) {
        peers = PEER_SURVIVAL_MAP[prefix];
        break;
      }
    }
  }

  if (!peers) {
    peers = GENERIC_FALLBACK;
  }

  const result = [
    { role: userRole || 'Your Role', pct: userSurvivalPct, trend: 'stable' as const, isUser: true },
    ...peers.map(p => ({ ...p, isUser: false })),
  ];

  return result.sort((a, b) => b.pct - a.pct);
}

export function getMarketPositioning(
  survivalPct: number,
  roleLabel?: string,
  country?: string,
  experience?: string,
): {
  protectionRank: string;
  demandRank: string;
  adaptabilityRank: string;
  futureReadinessRank: string;
  populationContext: string;
  positioningReason: string;
} {
  const rank = survivalPct >= 90 ? 5 : survivalPct >= 80 ? 15 : survivalPct >= 70 ? 25 : survivalPct >= 60 ? 35 : 50;
  const expLabel =
    experience === '0-2'  ? 'Entry-Level' :
    experience === '2-5'  ? 'Early-Career' :
    experience === '5-10' ? 'Mid-Level' :
    experience === '10-20'? 'Senior' :
    experience === '20+'  ? 'Principal' : 'Professional';
  const rolePart    = roleLabel?.trim() || 'Professionals';
  const countryPart = country?.trim()   || 'Global';
  const populationContext = `Among ${expLabel} ${rolePart}s · ${countryPart}`;

  const positioningReason =
    rank <= 10 ? 'Your combination of low task automatability and strong experience shield places you in the top tier of peers with similar profiles.' :
    rank <= 20 ? 'Your experience provides meaningful protection above average peers — automation exposure is present but moderated by your human-advantage skills.' :
    rank <= 30 ? 'You sit near the upper-middle range for your peer group — active upskilling will move you meaningfully higher in the distribution.' :
    rank <= 45 ? 'High automation exposure in your core tasks is pulling your ranking below the peer median — targeted repositioning has the largest impact here.' :
    'Your role\'s task profile places you in the highest-risk segment of your peer group — immediate strategic action yields the most career runway extension.';

  return {
    protectionRank:      `Top ${rank}%`,
    demandRank:          `Top ${Math.max(5, rank - 5)}%`,
    adaptabilityRank:    `Top ${Math.min(75, rank + 10)}%`,
    futureReadinessRank: `Top ${rank}%`,
    populationContext,
    positioningReason,
  };
}

// ── Computed peer comparison (Phase 8) ────────────────────────────────────────
// Score-anchored: peers derive from the user's actual computed risk score.
// Replaces static PEER_SURVIVAL_MAP lookup as primary peer signal.
export interface ComputedPeer {
  role: string;
  survival: number;
  trend: 'up' | 'stable' | 'down';
  isUser: boolean;
  reason: string;
}

import { riskToSurvival } from './riskFormula';

export function computePeerSurvival(
  roleKey: string,
  roleLabel: string,
  userRiskScore: number,
  experience?: string,
): ComputedPeer[] {
  const baseline = riskToSurvival(userRiskScore);
  const isSenior = experience === '10-20' || experience === '20+' || experience === '10-15' || experience === '15+';

  const aiAugLabel   = `AI-Augmented ${roleLabel}`;
  const seniorLabel  = isSenior ? `Principal ${roleLabel}` : `Senior ${roleLabel}`;
  const typicalLabel = `Typical ${roleLabel}`;
  const juniorLabel  = `Junior ${roleLabel}`;

  const peers: ComputedPeer[] = [
    {
      role: aiAugLabel,
      survival: Math.min(97, Math.round(baseline + 18)),
      trend: 'up',
      isUser: false,
      reason: 'Actively uses AI tools to multiply output — produces 3–5x volume with better quality; commands 25–35% salary premium over traditional peers',
    },
    {
      role: seniorLabel,
      survival: Math.min(95, Math.round(baseline + 10)),
      trend: isSenior ? 'stable' : 'up',
      isUser: false,
      reason: 'Experience shield + professional network compound over time — institutional knowledge and relationship capital create durable protection above junior peers',
    },
    {
      role: roleLabel + ' (You)',
      survival: baseline,
      trend: 'stable',
      isUser: true,
      reason: 'Your current assessed position — based on your role, experience, country, and task automatability profile',
    },
    {
      role: typicalLabel,
      survival: Math.max(5, Math.round(baseline - 10)),
      trend: 'stable',
      isUser: false,
      reason: 'Average automation exposure with no active upskilling — tracking market average without differentiated positioning',
    },
    {
      role: juniorLabel,
      survival: Math.max(5, Math.round(baseline - 20)),
      trend: 'down',
      isUser: false,
      reason: 'Low experience shield + high task automatability — earliest career stage faces the steepest displacement curve in this role category',
    },
  ];

  return peers.sort((a, b) => b.survival - a.survival);
}
