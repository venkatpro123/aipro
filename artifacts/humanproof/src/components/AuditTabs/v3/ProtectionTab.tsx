import React, { useMemo } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import type { TabProps } from '../common/types';
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

export const ProtectionTab: React.FC<TabProps> = ({ result }) => {
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

  const currentRoleLabel = r.roleTitle ?? r.userProfile?.roleTitle ?? (roleKey.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Current Role');
  const hasContent = Boolean(skillGap || skillPortfolio || intel);

  return (
    <div className="flex flex-col gap-3">
      {radarDimensions.length >= 3 && (
        <SkillRadarChart dimensions={radarDimensions} title="SKILL RESILIENCE RADAR" />
      )}
      {skillGap      && <ScrollReveal><SkillGapIntelligencePanel skillGapIntelligence={skillGap} /></ScrollReveal>}
      {skillPortfolio && <ScrollReveal><SkillPortfolioPanel portfolio={skillPortfolio} /></ScrollReveal>}
      {intel && <ScrollReveal><AIRiskSkillMatrix intel={intel} scoreColor={scoreColor} roleKey={roleKey} /></ScrollReveal>}
      {/* Skill dependency graph — derived from safe/at-risk skills */}
      {(() => {
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
          for (let i = 0; i < Math.min(atRisk.length, 2); i++) {
            edges.push({ from: `risk-${i}`, to: `safe-0` });
          }
          if (safe.length >= 2) edges.push({ from: `safe-1`, to: `safe-0` });
        }
        return nodes.length >= 3 ? <ScrollReveal><SkillDependencyGraph nodes={nodes} edges={edges} /></ScrollReveal> : null;
      })()}

      {careerPaths.length > 0 && (
        <ScrollReveal>
          <CareerPathMap
            currentRole={currentRoleLabel}
            currentScore={result.total}
            paths={careerPaths}
          />
        </ScrollReveal>
      )}

      {/* Financial runway assessment — above career evolution timeline */}
      {r.userFinancialRunway && (
        <ScrollReveal>
          <UserFinancialRunwayPanel userFinancialRunway={r.userFinancialRunway} />
        </ScrollReveal>
      )}

      <ScrollReveal>
        <CareerEvolutionTimeline
          currentRole={currentRoleLabel}
          currentScore={result.total}
          adjacentRoles={r.roleAdjacency?.adjacentRoles ?? []}
          twoHopPaths={r.roleAdjacency?.twoHopPaths}
        />
      </ScrollReveal>
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
