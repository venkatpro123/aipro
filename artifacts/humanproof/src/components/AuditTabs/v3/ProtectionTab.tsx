import React from 'react';
import type { TabProps } from '../common/types';
import SkillGapIntelligencePanel from '../common/SkillGapIntelligencePanel';
import SkillPortfolioPanel from '../common/SkillPortfolioPanel';

export const ProtectionTab: React.FC<TabProps> = ({ result }) => {
  const r = result as any;
  const skillGap      = r.skillGapIntelligence;
  const skillPortfolio = r.skillPortfolioFit;

  const hasContent = Boolean(skillGap || skillPortfolio);

  return (
    <div className="flex flex-col gap-3">
      {skillGap      && <SkillGapIntelligencePanel skillGapIntelligence={skillGap} />}
      {skillPortfolio && <SkillPortfolioPanel portfolio={skillPortfolio} />}
      {!hasContent && (
        <div className="rounded-xl px-4 py-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.50)' }}>
            No skill data available yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Add your role details to see your skill risk profile.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProtectionTab;
