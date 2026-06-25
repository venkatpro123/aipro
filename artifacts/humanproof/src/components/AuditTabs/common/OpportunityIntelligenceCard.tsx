// OpportunityIntelligenceCard.tsx — Wave 7.2 Proactive Opportunity Detection
//
// PROBLEM: Platform is purely risk-focused. Every card tells users what might
// go wrong. Zero surfacing of career leverage moments or market tailwinds.
//
// SOLUTION: A compact "Opportunities Detected" card that derives positive
// signals from ALREADY-COMPUTED fields:
//   • roleAdjacency.adjacentRoles with marketDemandScore > 70 → pivot opportunity
//   • jobMarketLiquidity with tier "Fast" or marketDemandTrend "rising" → hot market signal
//   • competitivePosition.overallPercentile > 60 → leverage window signal
//   • score < 50 AND preparedness.overallScore > 70 → "you're well-prepared in a stable position"
//
// This requires NO new data pipeline — it synthesizes existing HybridResult
// fields into opportunity language.
//
// Placement: SummaryTab, after the score hero, only when ≥1 opportunity found.
// Not shown: when score ≥ 75 (emergency mode — stay in risk framing there).

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp, ArrowUpRight, ChevronRight } from 'lucide-react';
import type { RoleAdjacencyResult } from '../../../services/roleAdjacencyEngine';
import type { JobMarketLiquidityResult } from '../../../services/jobMarketLiquidityService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string;
  icon: React.ElementType;
  title: string;
  body: string;
  accentColor: string;
  cta?: string;
  ctaTab?: string;  // which tab to navigate to on CTA click
}

interface Props {
  roleAdjacency?: RoleAdjacencyResult;
  jobMarketLiquidity?: JobMarketLiquidityResult;
  competitivePosition?: { overallPercentile?: number; strengths?: string[] };
  currentScore: number;
  preparednessScore?: number;
  currentRoleLabel?: string;
}

// ── Opportunity derivation ────────────────────────────────────────────────────

function deriveOpportunities(props: Props): Opportunity[] {
  const {
    roleAdjacency,
    jobMarketLiquidity,
    competitivePosition,
    currentScore,
    preparednessScore,
    currentRoleLabel,
  } = props;

  const opps: Opportunity[] = [];

  // Skip opportunity framing when in emergency mode (score ≥ 75)
  if (currentScore >= 75) return [];

  // ── 1. Hot adjacent role demand ───────────────────────────────────────────
  const hotAdjacentRoles = (roleAdjacency?.adjacentRoles ?? [])
    .filter(r => r.marketDemandScore >= 72 && r.adjacencyStrength !== 'weak')
    .slice(0, 2);

  if (hotAdjacentRoles.length > 0) {
    const top = hotAdjacentRoles[0];
    const label = top.targetRoleLabel ?? top.targetRoleKey?.replace(/_/g, ' ');
    opps.push({
      id: 'adjacent-demand',
      icon: ArrowUpRight,
      title: `Companies are hiring for ${label}`,
      body: `Your skills already match about ${Math.round((top as any).skillOverlapPercent ?? 65)}% of what this role needs. You could likely move into it in about ${Math.round((top as any).transitionWeeks ?? 12)} weeks.`,
      accentColor: '#10b981',
      cta: 'See ways to switch roles',
      ctaTab: 'protection',
    });
  }

  // ── 2. Rising job market demand ───────────────────────────────────────────
  if (
    jobMarketLiquidity?.marketDemandTrend === 'rising' ||
    (jobMarketLiquidity?.tier === 'Fast' && currentScore < 55)
  ) {
    const months = jobMarketLiquidity?.monthsToReemploy ?? 3;
    const roleLabel = currentRoleLabel ?? 'your role';
    opps.push({
      id: 'rising-market',
      icon: TrendingUp,
      title: `Jobs for ${roleLabel} are ${jobMarketLiquidity?.tier === 'Fast' ? 'easy to find right now' : 'getting easier to find'}`,
      body: `People in similar roles are getting hired in ${months < 2 ? 'under' : 'around'} ${months < 1.5 ? '6' : Math.round(months * 4)} weeks. Companies are actively hiring — a good time to start looking.`,
      accentColor: '#22d3ee',
      cta: 'See the job market',
      ctaTab: 'company',  // Company tab (IntelligenceTab) hosts RoleMarketDemand/PeerContagion/Macro panels
    });
  }

  // ── 3. Competitive advantage signal ──────────────────────────────────────
  const percentile = competitivePosition?.overallPercentile;
  if (typeof percentile === 'number' && percentile >= 62 && currentScore < 60) {
    const strengths = competitivePosition?.strengths?.slice(0, 2) ?? [];
    opps.push({
      id: 'competitive-edge',
      icon: Star,
      title: `You're stronger than most people in similar roles`,
      body: `Your background is better than most people at your level.${strengths.length > 0 ? ` Your strengths: ${strengths.join(', ')}.` : ''} It's a good time to use this to your advantage — things can change.`,
      accentColor: '#a78bfa',
      cta: 'See where you stand',
      ctaTab: 'protection',
    });
  }

  // ── 4. Well-prepared stable position ─────────────────────────────────────
  if (
    currentScore < 45 &&
    typeof preparednessScore === 'number' &&
    preparednessScore >= 68 &&
    opps.length === 0
  ) {
    opps.push({
      id: 'stable-prepared',
      icon: Star,
      title: 'You\'re in a strong position — use this time well',
      body: `Your job looks safe right now, and you're well-prepared if anything changes. This is a good time to keep building your skills and experience.`,
      accentColor: '#10b981',
      cta: 'See ways to grow',
      ctaTab: 'actions',
    });
  }

  return opps.slice(0, 2); // cap at 2 opportunities to avoid card bloat
}

// ── Component ─────────────────────────────────────────────────────────────────

export const OpportunityIntelligenceCard: React.FC<Props> = (props) => {
  const opportunities = useMemo(() => deriveOpportunities(props), [
    props.roleAdjacency,
    props.jobMarketLiquidity,
    props.competitivePosition,
    props.currentScore,
    props.preparednessScore,
  ]);

  if (opportunities.length === 0) return null;

  const handleCtaClick = (ctaTab?: string) => {
    if (!ctaTab) return;
    window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: ctaTab } }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--alpha-bg-04)',
        border: '1px solid rgba(16,185,129,0.20)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 pt-3 pb-2"
        style={{ borderBottom: '1px solid var(--alpha-bg-06)' }}
      >
        <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10b981' }} />
        <p className="text-[10px] font-black tracking-[0.14em] flex-1" style={{ color: 'var(--alpha-text-35)' }}>
          GOOD NEWS
        </p>
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          ACT NOW
        </span>
      </div>

      {/* Opportunity rows */}
      <div className="divide-y" style={{ borderColor: 'var(--alpha-bg-06)' }}>
        {opportunities.map((opp, i) => {
          const OppIcon = opp.icon;
          return (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 px-4 py-3"
            >
              {/* Icon */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center mt-0.5"
                style={{ background: `${opp.accentColor}12` }}
              >
                <OppIcon className="w-3.5 h-3.5" style={{ color: opp.accentColor }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold leading-snug mb-1" style={{ color: 'var(--alpha-text-85)' }}>
                  {opp.title}
                </p>
                <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: 'var(--alpha-text-45)' }}>
                  {opp.body}
                </p>
                {opp.cta && (
                  <button
                    onClick={() => handleCtaClick(opp.ctaTab)}
                    className="flex items-center gap-1 text-[10px] font-bold transition-opacity hover:opacity-80"
                    style={{ color: opp.accentColor }}
                  >
                    {opp.cta}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default OpportunityIntelligenceCard;
