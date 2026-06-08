// PortfolioReadinessPanel.tsx — Portfolio/GitHub readiness for technical roles
import { useState } from 'react';
import { CheckCircle, Circle, Github, Globe } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult | null;
}

interface PortfolioItem {
  id: string;
  label: string;
  description: string;
  forRole: 'all' | 'technical' | 'creative';
  points: number;
}

const PORTFOLIO_CHECKLIST: PortfolioItem[] = [
  { id: 'github_active',   label: 'Active GitHub profile',           description: 'Public repos + contributions in the last 90 days.',          forRole: 'technical', points: 20 },
  { id: 'pinned_projects', label: '3+ pinned/featured projects',     description: 'Pinned repos with clear READMEs and live demos.',             forRole: 'technical', points: 20 },
  { id: 'ai_project',      label: 'At least 1 AI/ML project',        description: 'Shows you\'re building with AI, not just using it.',          forRole: 'technical', points: 20 },
  { id: 'portfolio_site',  label: 'Personal portfolio website',       description: 'domain.com or yourname.github.io with key projects.',         forRole: 'creative',  points: 20 },
  { id: 'case_studies',    label: 'Case studies with outcomes',       description: 'Before/after metrics, not just "I designed this."',           forRole: 'creative',  points: 20 },
  { id: 'writing',         label: 'Published writing or thought leadership', description: 'Blog, LinkedIn articles, or conference talks.',         forRole: 'all',       points: 15 },
  { id: 'certifications',  label: 'Certifications visible on profile', description: 'AI/cloud/domain certs linked or displayed.',                 forRole: 'all',       points: 10 },
  { id: 'open_source',     label: 'Open source contributions',        description: 'PRs merged to popular repos signal collaboration skills.',     forRole: 'technical', points: 15 },
];

function computeScore(checked: Set<string>): number {
  const applicable = PORTFOLIO_CHECKLIST;
  const total = applicable.reduce((s, i) => s + i.points, 0);
  const earned = applicable.filter(i => checked.has(i.id)).reduce((s, i) => s + i.points, 0);
  return Math.round((earned / total) * 100);
}

export function PortfolioReadinessPanel({ scoreResult }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const score = computeScore(checked);
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  const skillPortfolio = scoreResult?.skillPortfolioFit;

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Portfolio Readiness
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          GitHub, portfolio site, writing, and open-source contributions that prove your skills.
        </div>
      </div>

      {skillPortfolio && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(167,139,250,0.08)',
          border: '1px solid rgba(167,139,250,0.2)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 20,
        }}>
          Skill portfolio fit from your audit: <strong style={{ color: '#a78bfa' }}>{Math.round(scoreResult?.skillPortfolioFit?.fitScore ?? 50)}/100</strong>
          {(scoreResult?.skillPortfolioFit?.fitScore ?? 100) < 50 &&
            <span style={{ color: '#f59e0b', marginLeft: 8 }}>— Portfolio improvements will help close this gap.</span>
          }
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '20px 24px',
        borderRadius: 14,
        background: `${color}10`,
        border: `1px solid ${color}33`,
        marginBottom: 24,
      }}>
        <div style={{ fontWeight: 800, fontSize: 48, color, lineHeight: 1 }}>{score}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            {score >= 70 ? 'Strong Portfolio' : score >= 45 ? 'Building Up' : 'Needs Work'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {checked.size} of {PORTFOLIO_CHECKLIST.length} items completed
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PORTFOLIO_CHECKLIST.map(item => {
          const isDone = checked.has(item.id);
          const RoleIcon = item.forRole === 'technical' ? Github : item.forRole === 'creative' ? Globe : null;
          return (
            <div
              key={item.id}
              className="card-premium"
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                border: isDone ? '1px solid rgba(167,139,250,0.4)' : undefined,
              }}
              onClick={() => toggle(item.id)}
            >
              {isDone
                ? <CheckCircle size={18} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
                : <Circle size={18} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 1 }} />
              }
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: isDone ? '#a78bfa' : 'var(--text)' }}>
                    {item.label}
                  </span>
                  {RoleIcon && <RoleIcon size={12} color="rgba(255,255,255,0.3)" />}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>+{item.points} pts</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
