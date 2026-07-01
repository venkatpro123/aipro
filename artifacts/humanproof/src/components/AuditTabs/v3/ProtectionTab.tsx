import React, { useMemo } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { GraduationCap, ArrowUpRight, LifeBuoy } from 'lucide-react';
import type { TabProps } from '../common/types';
import AdaptiveBlock from '../common/AdaptiveBlock';
import SkillGapIntelligencePanel from '../common/SkillGapIntelligencePanel';
import SkillPortfolioPanel from '../common/SkillPortfolioPanel';
import AIRiskSkillMatrix from '@/components/AIRiskSkillMatrix';
import { SkillRadarChart, type RadarDimension } from '../common/SkillRadarChart';
import { CareerPathMap } from '../common/CareerPathMap';
import { CareerEvolutionTimeline } from '../common/CareerEvolutionTimeline';
import { SkillDependencyGraph, type SkillNode, type SkillEdge } from '../common/SkillDependencyGraph';
import { SkillEvolutionIllustration } from '../../illustrations/CareerIllustrations';
import { getCareerIntelligence } from '@/data/intelligence';
import type { CareerIntelligence } from '@/data/intelligence/types';
import { riskColor } from '../../../lib/riskTokens';
import UserFinancialRunwayPanel from '../common/UserFinancialRunwayPanel';
import { VisaRiskPanel } from '../common/VisaRiskPanel';
import CareerConfidencePanel from '../common/CareerConfidencePanel';
import { CareerHealthDashboard } from '../common/CareerHealthDashboard';
import SkillFusionPanel from '../common/SkillFusionPanel';
import RoleMarketDemandPanel from '../common/RoleMarketDemandPanel';
import { TechObsolescencePanel } from '../common/TechObsolescencePanel';
import { CareerResilienceSimulator } from '../common/CareerResilienceSimulator';

// Fallback intel for roles with no seeded data — mirrors the same fallback
// previously used by the now-retired CareerSkillsTab. Only the `skills` field
// is ever rendered by AIRiskSkillMatrix, so the other fields just need to be
// present and type-valid, not polished copy.
function buildFallbackIntel(roleKey: string, score: number): CareerIntelligence {
  const isHighRisk = score >= 65;
  const isMedRisk = score >= 40 && score < 65;
  return {
    displayRole: roleKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    summary: '',
    skills: {
      safe: [
        { skill: 'Stakeholder Communication', whySafe: 'Trust-based human relationships AI cannot replicate', longTermValue: 92, difficulty: 'Medium' },
        { skill: 'Strategic Decision Making', whySafe: 'Requires contextual judgment + accountability', longTermValue: 90, difficulty: 'High' },
        { skill: 'Cross-functional Collaboration', whySafe: 'Nuanced organizational dynamics are human-native', longTermValue: 88, difficulty: 'Medium' },
        { skill: 'Creative Problem Solving', whySafe: 'Novel situation handling with incomplete information', longTermValue: 85, difficulty: 'High' },
        { skill: 'Emotional Intelligence', whySafe: 'Empathy, rapport, and interpersonal trust are irreplaceable', longTermValue: 95, difficulty: 'High' },
      ],
      at_risk: isHighRisk ? [
        { skill: 'Routine Data Processing', riskScore: 88, riskType: 'Automatable', horizon: '1-3yr', reason: 'AI tools process structured data far faster than manual work', aiReplacement: 'Full', aiTool: 'UiPath / Copilot' },
        { skill: 'Template Report Generation', riskScore: 82, riskType: 'Automatable', horizon: '1-3yr', reason: 'AI generates reports from structured inputs with no human needed', aiReplacement: 'Full', aiTool: 'Claude / GPT-4o' },
        { skill: 'Standard Research Compilation', riskScore: 75, riskType: 'Augmented', horizon: '1-3yr', reason: 'AI can do most of the synthesis; human adds judgment', aiReplacement: 'Partial', aiTool: 'Perplexity / NotebookLM' },
      ] : isMedRisk ? [
        { skill: 'Routine Scheduling & Coordination', riskScore: 65, riskType: 'Augmented', horizon: '3-5yr', reason: 'AI tools handle calendaring and logistics', aiReplacement: 'Partial', aiTool: 'Reclaim AI / Copilot' },
        { skill: 'Basic Email Drafting', riskScore: 60, riskType: 'Augmented', horizon: '1-3yr', reason: 'AI drafts most emails; human approves and personalizes', aiReplacement: 'Partial', aiTool: 'Claude / Gmail AI' },
      ] : [],
    },
    careerPaths: [],
  };
}

export const ProtectionTab: React.FC<TabProps> = ({ result, emergencyMode }) => {
  const r = result as any;
  const skillGap      = r.skillGapIntelligence;
  const skillPortfolio = r.skillPortfolioFit;

  const roleKey: string = result.workTypeKey ?? '';
  const intel = useMemo(
    () => (roleKey ? (getCareerIntelligence(roleKey) ?? buildFallbackIntel(roleKey, result.total)) : null),
    [roleKey, result.total],
  );
  const scoreColor = riskColor(result.total);

  const radarDimensions: RadarDimension[] = useMemo(() => {
    if (!intel) return [];
    const dims: RadarDimension[] = [];
    const safe = intel.skills?.safe ?? [];
    const atRisk = intel.skills?.at_risk ?? [];
    for (const s of safe.slice(0, 4)) {
      dims.push({
        key: s.skill,
        label: s.skill.length > 16 ? s.skill.slice(0, 15) + '…' : s.skill,
        value: s.longTermValue ?? 80,
        benchmark: 50,
        disruption: 10,
      });
    }
    for (const s of atRisk.slice(0, 4)) {
      dims.push({
        key: s.skill,
        label: s.skill.length > 16 ? s.skill.slice(0, 15) + '…' : s.skill,
        value: Math.max(10, 100 - (s.riskScore ?? 50)),
        benchmark: 50,
        disruption: s.riskScore ?? 60,
      });
    }
    return dims.slice(0, 8);
  }, [intel]);

  // Career path map from roleAdjacency data
  const careerPaths = useMemo(() => {
    const adj = r.roleAdjacency?.adjacentRoles ?? [];
    return adj.slice(0, 5).map((a: any) => ({
      key: String(a.targetRoleKey ?? a.targetRoleLabel ?? 'role'),
      label: String(a.targetRoleLabel ?? String(a.targetRoleKey ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())),
      type: (a.adjacencyStrength === 'strong' ? 'target' : a.adjacencyStrength === 'moderate' ? 'pivot' : 'stretch') as 'target' | 'pivot' | 'stretch',
      demand: a.marketDemandScore ?? undefined,
      riskDelta: typeof a.estimatedRiskDelta === 'number' ? a.estimatedRiskDelta : undefined,
      adjacencyStrength: a.adjacencyStrength,
      description: a.transitionNarrative ?? a.rationale ?? undefined,
    }));
  }, [r.roleAdjacency]);

  const currentRoleLabel = r.roleTitle ?? r.userProfile?.roleTitle ?? intel?.displayRole ?? (roleKey.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Current Role');
  const hasContent = Boolean(skillGap || skillPortfolio || intel);

  // Cluster gates — used to auto-open a cluster when it's the only place
  // with a strong signal, and to show the AdaptiveBlock "empty" state when
  // a whole cluster has nothing to show (mirrors AnalysisProtectionTab's
  // approach, just grouping the full Beast Mode depth instead of trimming it).
  const hasSkillsCluster = Boolean(
    radarDimensions.length >= 3 || r.careerConfidence || skillGap || skillPortfolio
    || r.skillFusion || r.techStackObsolescence || intel,
  );
  const hasMarketCluster = Boolean(
    r.roleMarketDemand || careerPaths.length > 0
    || (r.roleAdjacency?.adjacentRoles?.length ?? 0) > 0 || (r.roleAdjacency?.twoHopPaths?.length ?? 0) > 0,
  );
  const hasSafetyNetCluster = Boolean(r.userFinancialRunway || r.visaRisk);

  // Auto-open gates — Skills opens by default (primary content for this tab).
  // Market and Safety Net stay collapsed unless something urgent is inside,
  // so a typical audit doesn't reproduce the old wall-of-cards on first paint.
  const runwayMonths: number | undefined = r.userFinancialRunway?.monthsOfRunway;
  const marketAutoOpen = hasMarketCluster && Boolean(emergencyMode);
  const safetyNetAutoOpen = hasSafetyNetCluster && Boolean(
    emergencyMode || (typeof runwayMonths === 'number' && runwayMonths <= 3) || r.visaRisk?.overallVisaRisk === 'CRITICAL',
  );

  // Build skill dependency graph nodes/edges from intel (extracted from inline IIFE)
  const skillDepGraph = useMemo(() => {
    if (!intel) return null;
    const safe = intel.skills?.safe ?? [];
    const atRisk = intel.skills?.at_risk ?? [];
    const nodes: SkillNode[] = [];
    const edges: SkillEdge[] = [];
    safe.slice(0, 3).forEach((s: any, i: number) => {
      nodes.push({ id: `safe-${i}`, label: s.skill, tier: i === 0 ? 'advanced' : 'intermediate', status: 'safe', value: s.longTermValue });
    });
    atRisk.slice(0, 3).forEach((s: any, i: number) => {
      nodes.push({ id: `risk-${i}`, label: s.skill, tier: 'foundation', status: 'at_risk', value: s.riskScore });
    });
    if (nodes.length >= 2) {
      for (let i = 0; i < Math.min(atRisk.length, 2); i++) edges.push({ from: `risk-${i}`, to: 'safe-0' });
      if (safe.length >= 2) edges.push({ from: 'safe-1', to: 'safe-0' });
    }
    return nodes.length >= 3 ? <ScrollReveal><SkillDependencyGraph nodes={nodes} edges={edges} /></ScrollReveal> : null;
  }, [intel]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3">
      {/* Career Health Dashboard — "Protection tab hero" — 5-dimension resilience overview */}
      <CareerHealthDashboard
        currentScore={result.total}
        preparedness={r.preparednessScore}
        careerResilience={r.careerResilience}
        skillGapIntelligence={r.skillGapIntelligence}
        jobMarketLiquidity={r.jobMarketLiquidity}
        userFinancialRunway={r.userFinancialRunway}
        careerVelocity={r.careerVelocity}
      />

      {/* "If laid off tomorrow" scenario — weeks to reemployment, salary, escape path */}
      <ScrollReveal>
        <CareerResilienceSimulator
          currentScore={result.total}
          currentRoleLabel={currentRoleLabel}
          jobMarketLiquidity={r.jobMarketLiquidity}
          careerResilience={r.careerResilience}
          roleAdjacency={r.roleAdjacency}
          userFinancialRunway={r.userFinancialRunway}
        />
      </ScrollReveal>

      {/* Skills & Risk Profile — everything about what you know and how exposed it is */}
      <AdaptiveBlock
        title="Skills & risk profile"
        subtitle="Radar, gaps, portfolio fit, and AI exposure by skill"
        icon={GraduationCap}
        accentColor="var(--color-emerald-text)"
        defaultOpen={hasSkillsCluster}
        empty={!hasSkillsCluster}
      >
        {radarDimensions.length >= 3 && (
          <SkillRadarChart dimensions={radarDimensions} title="SKILL RESILIENCE RADAR" />
        )}
        {r.careerConfidence && <CareerConfidencePanel confidence={r.careerConfidence} />}
        {skillGap && <SkillGapIntelligencePanel skillGapIntelligence={skillGap} />}
        {skillPortfolio && <SkillPortfolioPanel portfolio={skillPortfolio} />}
        {r.skillFusion && <SkillFusionPanel fusion={r.skillFusion} />}
        {r.techStackObsolescence && <TechObsolescencePanel techStackObsolescence={r.techStackObsolescence} />}
        {intel && <AIRiskSkillMatrix intel={intel} scoreColor={scoreColor} roleKey={roleKey} />}
        {skillDepGraph}
      </AdaptiveBlock>

      {/* Market Position & Pivot Paths — where you stand and where you could move */}
      <AdaptiveBlock
        title="Market position & pivot paths"
        subtitle="Demand for your role and safer adjacent roles"
        icon={ArrowUpRight}
        accentColor="#06b6d4"
        defaultOpen={marketAutoOpen}
        empty={!hasMarketCluster}
      >
        <RoleMarketDemandPanel roleMarketDemand={r.roleMarketDemand} />
        {careerPaths.length > 0 && (
          <CareerPathMap currentRole={currentRoleLabel} currentScore={result.total} paths={careerPaths} />
        )}
        {(r.roleAdjacency?.adjacentRoles?.length > 0 || r.roleAdjacency?.twoHopPaths?.length > 0) && (
          <CareerEvolutionTimeline
            currentRole={currentRoleLabel}
            currentScore={result.total}
            adjacentRoles={r.roleAdjacency?.adjacentRoles ?? []}
            twoHopPaths={r.roleAdjacency?.twoHopPaths}
          />
        )}
      </AdaptiveBlock>

      {/* Safety Net — financial runway and work-authorization exposure */}
      <AdaptiveBlock
        title="Safety net"
        subtitle="Financial runway and visa/work-authorization exposure"
        icon={LifeBuoy}
        accentColor="var(--color-amber500-text)"
        defaultOpen={safetyNetAutoOpen}
        empty={!hasSafetyNetCluster}
      >
        {r.userFinancialRunway && <UserFinancialRunwayPanel userFinancialRunway={r.userFinancialRunway} />}
        {r.visaRisk && (
          <VisaRiskPanel visaRisk={r.visaRisk} countryCode={result.countryKey} tenureYears={result.tenureYears} />
        )}
      </AdaptiveBlock>

      {!hasContent && (
        <div className="rounded-xl px-4 py-8 text-center flex flex-col items-center gap-3" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
          <SkillEvolutionIllustration size={80} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--alpha-text-50)' }}>
              We don't know your skills yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--alpha-text-30)' }}>
              Add your role details to see which skills to protect and which to evolve.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtectionTab;
