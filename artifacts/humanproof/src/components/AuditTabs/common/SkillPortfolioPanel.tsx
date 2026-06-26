// SkillPortfolioPanel.tsx — v14.0
// Skill portfolio fit score, declining skills, gap skills, retool priority.

import React from "react";
import { motion } from "framer-motion";
import { Layers, TrendingUp, TrendingDown, Zap, AlertCircle } from "lucide-react";
import type { SkillPortfolioFitResult } from "@/services/skillPortfolioFitEngine";

interface SkillPortfolioPanelProps {
  portfolio: SkillPortfolioFitResult;
}

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  ELITE:       { text: 'var(--color-emerald-text)', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)' },
  STRONG:      { text: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.22)' },
  ADEQUATE:    { text: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)' },
  WEAK:        { text: 'var(--color-orange-text)', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.22)' },
  VULNERABLE:  { text: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)' },
};

const TREND_ICON = {
  SURGING:  <TrendingUp className="w-3 h-3" style={{ color: 'var(--color-emerald-text)' }} />,
  GROWING:  <TrendingUp className="w-3 h-3" style={{ color: 'var(--color-blue500-text)' }} />,
  STABLE:   <Zap className="w-3 h-3" style={{ color: 'var(--color-amber500-text)' }} />,
  DECLINING: <TrendingDown className="w-3 h-3" style={{ color: 'var(--color-orange-text)' }} />,
  OBSOLETE:  <AlertCircle className="w-3 h-3" style={{ color: 'var(--color-red-text)' }} />,
};

const SkillPortfolioPanel: React.FC<SkillPortfolioPanelProps> = ({ portfolio }) => {
  const colors = TIER_COLORS[portfolio.portfolioStrengthTier] ?? TIER_COLORS.ADEQUATE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: colors.text }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--alpha-text-85)' }}>Your Skills</span>
        </div>
        <span
          className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${colors.text}18`, color: colors.text, border: `1px solid ${colors.text}30` }}
        >
          {portfolio.portfolioStrengthTier}
        </span>
      </div>

      {/* Score */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2 text-center" style={{ background: 'var(--alpha-bg-04)' }}>
          <div className="text-sm font-bold" style={{ color: colors.text }}>{portfolio.fitScore}</div>
          <div className="text-[10px] opacity-45 mt-0.5">Skill Match</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'var(--alpha-bg-04)' }}>
          <div className="text-[10px] font-bold" style={{ color: portfolio.skillDecayRisk === 'HIGH' ? 'var(--color-red-text)' : portfolio.skillDecayRisk === 'MEDIUM' ? 'var(--color-amber500-text)' : 'var(--color-emerald-text)' }}>
            {portfolio.skillDecayRisk}
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">Going Out of Date</div>
        </div>
      </div>

      {/* Portfolio insight */}
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--alpha-text-55)' }}>
        {portfolio.portfolioInsight}
      </p>

      {/* Surging skills — with 12-month demand projection */}
      {portfolio.surgingSkills.length > 0 && (
        <div className="mb-2.5">
          <div className="text-[10px] font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-emerald-text)' }}>
            <TrendingUp className="w-3 h-3" /> SURGING DEMAND
          </div>
          <div className="flex flex-col gap-1">
            {portfolio.surgingSkills.slice(0, 4).map(s => (
              <div key={s.skill} className="flex items-center justify-between rounded-lg px-2 py-1"
                style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--color-emerald-text)' }}>{s.skill}</span>
                <div className="flex items-center gap-2 text-[9px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--alpha-text-45)' }}>
                  {s.demandIn12Months != null && (
                    <span style={{ color: s.demandIn12Months > s.demandScore ? 'var(--color-emerald-text)' : 'var(--alpha-text-30)' }}>
                      getting more valuable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Declining skills — with urgency and projected demand */}
      {portfolio.decliningSkills.length > 0 && (
        <div className="mb-2.5">
          <div className="text-[10px] font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-red-text)' }}>
            <TrendingDown className="w-3 h-3" /> DECLINING SKILLS
          </div>
          <div className="flex flex-col gap-1">
            {portfolio.decliningSkills.slice(0, 3).map(s => (
              <div key={s.skill} className="flex items-center justify-between rounded-lg px-2 py-1"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <div className="flex items-center gap-1.5">
                  {TREND_ICON[s.trend]}
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--color-red-text)' }}>{s.skill}</span>
                  <span className="text-[9px] px-1 rounded"
                    style={{ background: 'rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.70)' }}>
                    {s.trend}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--alpha-text-45)' }}>
                  {s.demandIn12Months != null && (
                    <span style={{ color: 'var(--color-red-text)' }}>losing value</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retool priority */}
      {portfolio.retoolPriority.length > 0 && (
        <div>
          <div className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--alpha-text-35)' }}>
            SKILLS TO UPDATE
          </div>
          <div className="space-y-1">
            {portfolio.retoolPriority.slice(0, 3).map((skill, i) => {
              const ALWAYS_UPPER = /^(llm|ai|ml|api|aws|gcp|sql|etl|erp|crm|ux|ui|iot|saas|paas|iaas|rpa|qa|devops)$/i;
              const displaySkill = ALWAYS_UPPER.test(skill.trim())
                ? skill.trim().toUpperCase()
                : skill.replace(/\b\w/g, (c: string) => c.toUpperCase());
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold w-4" style={{ color: 'var(--alpha-text-30)' }}>{i + 1}.</span>
                  <span className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>{displaySkill}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SkillPortfolioPanel;
