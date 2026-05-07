// strategyArchetypes.ts
// Intelligence Upgrade 3 — v4.0
// Career capital × experience → 4 strategy archetypes.
//
// ARCHETYPE COUNT: exactly 4. No additional archetypes are planned or partially
// implemented. Any external documentation claiming "~8 archetypes" is incorrect
// and should be treated as a stale reference.
//
// These 4 playbooks supersede the bracket-based 3-phase roadmap structure
// when triggered. They produce fundamentally different strategies, not
// content variations inside the same template.
//
// The 4 archetypes — trigger conditions, phase structure, and hybrid detection:
//
//   LEVERAGE   — trigger: exp ≥ 10yr AND networkCapital ≥ 18/25
//                phases: P0 "Activate network map" (wk 1–2),
//                        P1 "Run 15 conversations" (wk 3–8),
//                        P2 "Close 1 offer" (wk 9–16)
//                hybrid: when knowledgeCapital ≥ 15 → secondary PLATFORM
//                collapse compression: applies to phase week ranges
//
//   PLATFORM   — trigger: exp ≥ 10yr AND knowledgeCapital ≥ 18/25 AND network < 12
//                phases: P0 "Identify publishable insight" (wk 1–2),
//                        P1 "Publish 2 artifacts" (wk 3–10),
//                        P2 "Convert inbound to offer" (wk 11–20)
//                hybrid: when networkCapital ≥ 9 → secondary LEVERAGE
//                collapse compression: applies to phase week ranges
//
//   AUGMENT    — trigger: exp ≥ 5yr AND exp < 10yr AND augmentationRiskScore < 0.35
//                (augHigh = low augmentation risk = high augmentation POTENTIAL)
//                phases: P0 "Map AI-augmentable tasks" (wk 1–2),
//                        P1 "Ship 1 AI-augmented proof point" (wk 3–10),
//                        P2 "Position as AI-fluent specialist" (wk 11–18)
//                hybrid: no secondary (exp bracket is exclusive)
//                collapse compression: applies to phase week ranges
//
//   RESKILL    — trigger: capitalTotal < 25 (Foundation tier)
//                OR (exp > 10yr AND capitalTotal < 35)
//                phases: P0 "Emergency fund + runway assessment" (wk 1),
//                        P1 "Select one adjacent skill and build proof" (wk 2–12),
//                        P2 "Apply with new credential" (wk 13–24)
//                hybrid: no secondary (RESKILL is the fallback when no capital threshold met)
//                collapse compression: applies to phase week ranges
//
// Hybrid detection (v6.0 Fix 9):
//   primary + secondary are detected by selectStrategyArchetypeFull().
//   Hybrid sequence instructions are pre-written in the code (not LLM-generated)
//   so they remain deterministic. See selectStrategyArchetypeFull() for the
//   four hybrid combinations and their sequencing rationales.

import type { CapitalPillars } from './capitalLeverageStrategy';

export type StrategyArchetype = 'LEVERAGE' | 'PLATFORM' | 'AUGMENT' | 'RESKILL' | null;

export interface ArchetypePhase {
  phase: number;
  title: string;
  weekRange: string;
  /** v6.0: Original un-compressed week range — shown when compression was applied */
  originalWeekRange?: string;
  focus: string;
  actions: string[];
  milestone: string;
}

export interface ArchetypeResult {
  archetype: StrategyArchetype;
  headline: string;
  /** Phase 0 prerequisite — must complete before other phases */
  phase0?: {
    title: string;
    actions: string[];
    milestone: string;
    weekRange: string;
    originalWeekRange?: string;
  };
  phases: ArchetypePhase[];
  whyThisArchetype: string;
  /** v6.0: Collapse stage compression metadata — shown as a banner above the roadmap */
  compressionApplied?: {
    collapseStage: number;
    factor: number;
    bannerText: string;
  };
}

export interface ArchetypeSelection {
  primary: StrategyArchetype;
  /** v6.0 Fix 9: Secondary archetype when user qualifies for two simultaneously */
  secondary?: Exclude<StrategyArchetype, null>;
  /** Hybrid sequencing instructions when both primary and secondary apply */
  hybridSequence?: string;
}

export function selectStrategyArchetype(
  experienceYears: number,
  capitalPillars: CapitalPillars,
  capitalTotal: number,
  /** D3 augmentation risk score 0–1 (higher = LOWER augmentation potential) */
  augmentationRiskScore?: number,
): StrategyArchetype {
  return selectStrategyArchetypeFull(experienceYears, capitalPillars, capitalTotal, augmentationRiskScore).primary;
}

/** Full selection including secondary archetype detection. */
export function selectStrategyArchetypeFull(
  experienceYears: number,
  capitalPillars: CapitalPillars,
  capitalTotal: number,
  augmentationRiskScore?: number,
): ArchetypeSelection {
  const { networkCapital, knowledgeCapital } = capitalPillars;
  const augHigh = augmentationRiskScore !== undefined && augmentationRiskScore < 0.35;

  // Determine primary
  let primary: StrategyArchetype = null;
  if (experienceYears >= 10 && networkCapital >= 18) primary = 'LEVERAGE';
  else if (experienceYears >= 10 && knowledgeCapital >= 18 && networkCapital < 12) primary = 'PLATFORM';
  else if (experienceYears >= 5 && experienceYears < 10 && augHigh) primary = 'AUGMENT';
  else if (capitalTotal < 25 || (experienceYears > 10 && capitalTotal < 35)) primary = 'RESKILL';

  if (!primary) return { primary: null };

  // v6.0 Fix 9: Detect secondary archetype (within 3 pts of trigger threshold)
  let secondary: Exclude<StrategyArchetype, null> | undefined;
  let hybridSequence: string | undefined;

  if (primary === 'LEVERAGE' && knowledgeCapital >= 15) {
    // Also near PLATFORM threshold — strong knowledge available to publish
    secondary = 'PLATFORM';
    hybridSequence = `Your primary strategy is LEVERAGE — activate your network first because warm relationships close 6× faster than cold applications. Your secondary strategy is PLATFORM — publish one proof of expertise in parallel to give your network something concrete to share.\n\nSequence: Weeks 1–2: execute Phase 0 of both archetypes simultaneously — map your network AND identify one publishable insight. Weeks 3–6: LEVERAGE activates conversations (15 minimum) while PLATFORM publishes first artifact. Week 7 onward: LEVERAGE conversations reference the PLATFORM artifact. Your network now has something specific to share rather than a general referral.`;
  } else if (primary === 'PLATFORM' && networkCapital >= 9) {
    // Network is weak but not zero — can run parallel track
    secondary = 'LEVERAGE';
    hybridSequence = `Your primary strategy is PLATFORM — publish first to create the proof of expertise that converts cold outreach into warm reception. Your secondary strategy is LEVERAGE — your network is limited but not zero.\n\nSequence: Weeks 1–4: PLATFORM only — publish two pieces before any outreach. Week 5 onward: begin LEVERAGE track with your published work as the introduction. "I wrote this piece on [topic] last week — I thought of you because..." converts at 4× the rate of cold contact without a reference point.`;
  } else if (primary === 'AUGMENT' && networkCapital >= 12) {
    // Mid-career with both augmentation potential and meaningful network
    secondary = 'LEVERAGE';
    hybridSequence = `Your primary strategy is AUGMENT — become the AI-capable version of your role because your augmentation potential is high. Your secondary strategy is LEVERAGE — you have enough network to activate relationships around your demonstrated productivity improvement.\n\nSequence: Weeks 1–6: AUGMENT Phase 1 only — build genuine AI tool proficiency. Week 7: begin LEVERAGE in parallel using your productivity improvement as the conversation hook. "I reduced X from 4 hours to 45 minutes using [AI tool] — I wanted to share this with you before writing it up more formally."`;
  }

  return { primary, ...(secondary ? { secondary, hybridSequence } : {}) };
}

/**
 * Compress a week-range string by a factor.
 * "Weeks 1–6" × 0.5 → "Weeks 1–3"
 * "Before Phase 1" is left unchanged (it's a label, not a duration).
 */
function compressWeekRange(original: string, factor: number): string {
  const m = original.match(/Weeks\s+(\d+)[–\-](\d+)/);
  if (!m) return original;
  const start = parseInt(m[1], 10);
  const end = parseInt(m[2], 10);
  const newEnd = Math.max(start, Math.round(end * factor));
  return `Weeks ${start}–${newEnd}`;
}

export function buildArchetypeRoadmap(
  archetype: StrategyArchetype,
  roleDisplayName: string,
  capitalPillars: CapitalPillars,
  experienceYears: number,
  /** v6.0 Fix 5: collapse stage compresses phase timelines */
  collapseStage?: 1 | 2 | 3 | null,
): ArchetypeResult {
  switch (archetype) {
    case 'LEVERAGE':
      return {
        archetype: 'LEVERAGE',
        headline: 'Leverage your network — warm relationships close 6× faster than cold applications',
        whyThisArchetype: `With ${experienceYears}+ years of experience and strong network capital (${capitalPillars.networkCapital}/25), your primary asset is the trust accumulated through professional relationships. The most efficient path is activating this network, not building new skills from scratch.`,
        phase0: {
          title: 'Map Your Network Value',
          weekRange: 'Before Phase 1',
          actions: [
            'List your 10 highest-value professional relationships (decision-makers, clients, peers who have hired)',
            'For each: what do they value about you? What roles could they refer you for?',
            'Identify the 2–3 people most likely to accelerate your transition with one conversation',
          ],
          milestone: 'Network map complete with 10 contacts ranked by transition value',
        },
        phases: [
          {
            phase: 1,
            title: 'Activate Relationships',
            weekRange: 'Weeks 1–3',
            focus: 'Genuine reconnection — not job-asking',
            actions: [
              'Contact your top 5 network relationships with a specific, genuine ask for a 15-minute conversation',
              'Do NOT lead with "I am looking for a job" — lead with "I am thinking about X, your perspective would be valuable"',
              'One relationship conversation per day for 3 weeks — 15 conversations minimum',
            ],
            milestone: '15 warm conversations completed; 3+ referral conversations identified',
          },
          {
            phase: 2,
            title: 'Create a Shareable Proof Point',
            weekRange: 'Weeks 4–8',
            focus: 'Give your network something concrete to share about you',
            actions: [
              'Publish one visible artifact: LinkedIn article, GitHub project, or conference talk on your domain expertise',
              'Frame it as "here is what I know about [specific domain problem]" — not as a portfolio',
              'Send it personally to your top 5 network contacts with a specific note about why they would find it relevant',
            ],
            milestone: '1 published proof point with 500+ views or 10+ shares',
          },
          {
            phase: 3,
            title: 'Advisory Positioning',
            weekRange: 'Weeks 9–16',
            focus: 'Convert relationships to opportunities before looking externally',
            actions: [
              `Pitch 2–3 consulting or advisory engagements to existing clients or contacts in your target area`,
              'Even one ₹5,000 engagement validates your positioning and builds momentum',
              'If no consulting engagement materialises in 6 weeks, escalate to external job search with warm referrals as primary channel',
            ],
            milestone: '1+ consulting/advisory engagement or 3+ active job conversations via warm referrals',
          },
        ],
      };

    case 'PLATFORM':
      return {
        archetype: 'PLATFORM',
        headline: 'Convert knowledge to visibility first — cold outreach without proof converts at <2%',
        whyThisArchetype: `With ${experienceYears}+ years of experience and strong knowledge capital (${capitalPillars.knowledgeCapital}/25) but limited network capital (${capitalPillars.networkCapital}/25), your expertise needs to be made visible before networking will work. Publishing and speaking creates inbound — then you activate the resulting network.`,
        phase0: {
          title: 'Knowledge Inventory',
          weekRange: 'Before Phase 1',
          actions: [
            'List the 5 things you know about your domain that most people in your role do not',
            'Identify the format that best communicates your expertise: writing, speaking, or demos',
            'Choose one platform: LinkedIn for reach, GitHub for technical credibility, or conference talks for authority',
          ],
          milestone: 'Knowledge inventory complete with 5 publishable insights identified',
        },
        phases: [
          {
            phase: 1,
            title: 'Knowledge to Visibility',
            weekRange: 'Weeks 1–6',
            focus: 'Publish before you network — give people something to share',
            actions: [
              'Publish one piece per week for 6 weeks: LinkedIn post, article, or GitHub repository',
              'Topic: one insight from your knowledge inventory per week',
              'Respond to every comment — early engagement amplifies algorithmic reach',
            ],
            milestone: '6 published pieces; 1 with >500 views or 20+ meaningful engagements',
          },
          {
            phase: 2,
            title: 'Community Building',
            weekRange: 'Weeks 7–12',
            focus: 'Join and contribute before you ask',
            actions: [
              'Join 2 professional communities in your target domain (Slack groups, LinkedIn groups, Discord)',
              'Contribute answers and insights for 4 weeks before posting anything about your transition',
              'Identify the 10 most active members in each community — these become your new network nodes',
            ],
            milestone: 'Active contributor in 2 communities; 10+ new meaningful professional connections',
          },
          {
            phase: 3,
            title: 'Network-Led Search',
            weekRange: 'Weeks 13–20',
            focus: 'Your visibility generates inbound; supplement with targeted outreach',
            actions: [
              'Begin reaching out to the 10 community members identified in Phase 2 — you now have visible proof of expertise to reference',
              'Submit one conference talk or webinar proposal based on your Phase 1 content',
              'Begin targeted job applications — lead with your published work, not just your CV',
            ],
            milestone: '5+ warm network conversations from community; first job application sent',
          },
        ],
      };

    case 'AUGMENT':
      return {
        archetype: 'AUGMENT',
        headline: 'Become the AI-capable version of your role — the new title that didn\'t exist 2 years ago',
        whyThisArchetype: `At ${experienceYears} years of experience, you have deep enough domain knowledge to direct AI tools effectively — but not so much that your identity is locked to the old way of working. Your augmentation potential is high. The transition is not to a different role but to a fundamentally enhanced version of this one.`,
        phases: [
          {
            phase: 1,
            title: 'Master the 2–3 Transformative AI Tools for Your Function',
            weekRange: 'Weeks 1–6',
            focus: 'Don\'t change roles — change how you do this role',
            actions: [
              `Identify the 2–3 AI tools that are most transformative specifically for ${roleDisplayName} work`,
              'Spend 8–10 hours per week for 6 weeks building genuine proficiency — not surface-level familiarity',
              'Goal: you can perform your core tasks 2× faster using AI assistance than your colleagues can without it',
            ],
            milestone: 'Demonstrable 2× productivity improvement in 2+ core tasks',
          },
          {
            phase: 2,
            title: 'Demonstrate the Multiplier Internally',
            weekRange: 'Weeks 7–12',
            focus: 'Make your AI-augmented productivity visible',
            actions: [
              'Document and quantify your productivity improvement with specific numbers: "reduced X from 4 hours to 45 minutes"',
              'Present this to your team or manager as a process improvement — not a personal showcase',
              'Offer to train 2 colleagues: teaching forces you to systemise the knowledge and builds your credibility',
            ],
            milestone: 'Internal presentation delivered; 2 colleagues trained',
          },
          {
            phase: 3,
            title: 'Title and Scope Negotiation',
            weekRange: 'Weeks 13–20',
            focus: 'The person who leads AI adoption in your function deserves a new title',
            actions: [
              'Formally request a title or scope change reflecting your new function: "AI-Augmented [role]", "[role] + AI Lead", or "Senior [role]"',
              'If current employer does not recognise the expanded scope, identify the 5 employers who already have this title posted on Naukri/LinkedIn',
              'Apply with your AI productivity data as the lead credential — this is the interview differentiator',
            ],
            milestone: 'New title negotiated internally, OR 3+ interviews scheduled at target employers',
          },
        ],
      };

    case 'RESKILL':
    default:
      return {
        archetype: 'RESKILL',
        headline: 'Your years provide tenure protection (L5) — but transferable career capital requires deliberate investment',
        whyThisArchetype: `Your capital assessment shows limited transferable assets (total: ${capitalPillars.networkCapital + capitalPillars.knowledgeCapital + capitalPillars.deliveryCapital + capitalPillars.influenceCapital}/100). This is honest context: years of experience protect you from L5 displacement risk, but they do not automatically generate the network, knowledge credibility, or delivery track record that makes transitions fast. The path is through skill building.`,
        phases: [
          {
            phase: 1,
            title: 'Build One High-ROI Skill to Interview Readiness',
            weekRange: 'Weeks 1–8',
            focus: 'One skill to completion beats five skills to familiarity',
            actions: [
              'Choose the single highest-ROI skill for your target role from the action plan recommendations',
              'Block 2–3 hours daily. No exceptions for 8 weeks. Treat it as a second job.',
              'Deliverable: one published proof point demonstrating the skill (GitHub, LinkedIn, portfolio)',
            ],
            milestone: 'One skill at interview-ready proficiency with a visible proof point',
          },
          {
            phase: 2,
            title: 'Build Minimal Network While Applying',
            weekRange: 'Weeks 9–16',
            focus: 'Start job search in parallel with network building — do not wait',
            actions: [
              'Apply to 3 targeted roles per week. Cold applications convert at 2% — accept this and increase volume',
              'Contact 2 people per week in your target function: informational conversations only',
              'Join one professional community in your target domain and contribute answers for 30 min/day',
            ],
            milestone: 'First interview scheduled; 5+ informational conversations completed',
          },
          {
            phase: 3,
            title: 'Compound and Accelerate',
            weekRange: 'Weeks 17+',
            focus: 'Apply capital built in Phase 1 to accelerate the search',
            actions: [
              'Add second high-ROI skill from action plan recommendations',
              'Re-contact Phase 2 network connections — they know you now, which dramatically changes conversion',
              'Negotiate any offers — do not accept first number. Your demonstrated skills are now the leverage.',
            ],
            milestone: 'Offer in hand or 3+ active interview pipelines',
          },
        ],
      };
  }
}

/**
 * Apply collapse stage time compression to an ArchetypeResult.
 * Stage 3: compress all phase timelines to 30% of original (factor 0.3).
 * Stage 2: compress to 50% (factor 0.5).
 * Stage 1: compress to 75% (factor 0.75).
 * Phase 3 is dropped entirely at Stage 3 — 3–4 months is not enough for 3 phases.
 * Shows both original and compressed timelines so urgency is visible.
 */
export function applyCollapseCompression(
  roadmap: ArchetypeResult,
  collapseStage: 1 | 2 | 3,
): ArchetypeResult {
  const factors: Record<1 | 2 | 3, number> = { 1: 0.75, 2: 0.50, 3: 0.30 };
  const factor = factors[collapseStage];

  const bannerPhrases: Record<1 | 2 | 3, string> = {
    1: 'Stage 1 signals detected — timelines compressed to 75% of standard duration.',
    2: 'Stage 2 signals detected — timelines compressed to 50% of standard duration. Execute phases concurrently where possible.',
    3: 'Stage 3 signals detected — timelines compressed to 30%. Phase 3 dropped: you have 3–4 months, not 16–20. Focus on Phase 1 and Phase 2 only.',
  };

  const compressedPhases = roadmap.phases
    .filter(p => collapseStage < 3 || p.phase < 3) // drop Phase 3 at Stage 3
    .map(p => ({
      ...p,
      originalWeekRange: p.weekRange,
      weekRange: compressWeekRange(p.weekRange, factor),
    }));

  const compressedPhase0 = roadmap.phase0
    ? {
        ...roadmap.phase0,
        originalWeekRange: roadmap.phase0.weekRange,
        weekRange: compressWeekRange(roadmap.phase0.weekRange, factor),
      }
    : undefined;

  return {
    ...roadmap,
    ...(compressedPhase0 ? { phase0: compressedPhase0 } : {}),
    phases: compressedPhases,
    compressionApplied: {
      collapseStage,
      factor,
      bannerText: bannerPhrases[collapseStage],
    },
  };
}
