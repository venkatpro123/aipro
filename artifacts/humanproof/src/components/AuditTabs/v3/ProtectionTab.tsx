import React, { useMemo } from 'react';
import type { TabProps } from '../common/types';
import SkillGapIntelligencePanel from '../common/SkillGapIntelligencePanel';
import SkillPortfolioPanel from '../common/SkillPortfolioPanel';
import AIRiskSkillMatrix from '@/components/AIRiskSkillMatrix';
import { getCareerIntelligence } from '@/data/intelligence';
import type { CareerIntelligence } from '@/data/intelligence/types';
import { riskColor } from '../../../lib/riskTokens';

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

  const hasContent = Boolean(skillGap || skillPortfolio || intel);

  return (
    <div className="flex flex-col gap-3">
      {skillGap      && <SkillGapIntelligencePanel skillGapIntelligence={skillGap} />}
      {skillPortfolio && <SkillPortfolioPanel portfolio={skillPortfolio} />}
      {intel && <AIRiskSkillMatrix intel={intel} scoreColor={scoreColor} roleKey={roleKey} />}
      {!hasContent && (
        <div className="rounded-xl px-4 py-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.50)' }}>
            We don't know your skills yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Add your role details to see which skills to improve.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProtectionTab;
