// GuidanceView.tsx — Guidance Mode: 5-section decision-oriented advisor.
//
// Design principle: answer three questions immediately, clearly, and completely.
//   1. What is happening?     → Section 1 (score + verdict)
//   2. Why is it happening?   → Section 2 (top 3 risk drivers with evidence)
//   3. What should I do next? → Section 3 (one primary move) + Section 4 (this week)
//   + How confident?          → Section 5 (confidence & trust badges)
//
// Rules:
//   • No cards. No panel headers. No expandable blocks. No analytics clutter.
//   • Section labels are subtle (10px, all-caps, rgba(255,255,255,0.35)).
//   • Each section separated by a thin divider line.
//   • Emergency layout: Section 1 → red banner; Section 4 hidden; Section 3 dominant.
//   • Beast Mode invite at the bottom — one subtle line, not a button.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { riskColor, riskLabel } from '../../../lib/riskTokens';
import { ScoreRingHero } from './SummaryTab';

// ── Props ─────────────────────────────────────────────────────────────────────

interface GuidanceViewProps {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  /** Called when the user taps "Explore full intelligence →" */
  onSwitchToBeast: () => void;
}

// ── Priority ordering ─────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const PRIORITY_COLOR: Record<string, string> = {
  Critical: '#dc2626',
  High:     '#f97316',
  Medium:   '#f59e0b',
  Low:      '#22d3ee',
};

const URGENCY_LABEL: Record<string, string> = {
  CRITICAL: 'Critical urgency',
  HIGH:     'High urgency',
  MODERATE: 'Moderate urgency',
  LOW:      'Low urgency',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVerdictSentence(result: HybridResult, feedSpine?: string): string {
  const brief = (result as any).intelligenceBrief;
  if (brief?.paragraphs?.[0]) return brief.paragraphs[0] as string;
  if (feedSpine) return feedSpine;
  const company = result.companyName ?? 'Your company';
  const score = result.total;
  const level = score >= 75 ? 'critical' : score >= 55 ? 'elevated' : score >= 35 ? 'moderate' : 'low';
  return `${company} is showing ${level} risk signals. Your displacement probability sits at ${score}/100 based on ${score >= 65 ? 'multiple elevated' : 'several'} risk dimensions.`;
}

// UIDimension has: key (L1–L5, D1–D7), label, score (0–100).
// There is NO polarity, evidence, or source field on UIDimension.
// Evidence text is derived from a key-based map below.
const DIMENSION_EVIDENCE: Record<string, string> = {
  L1: 'Financial signals: stock performance, revenue trend, P/E ratio',
  L2: 'Layoff history: recent rounds, headcount contraction, hiring freeze',
  L3: 'Role displacement: AI automation exposure for your specific role',
  L4: 'Industry headwinds: sector-wide layoff wave, funding contraction',
  L5: 'Regional market: local job demand and macro labor conditions',
  D1: 'Company size & sector amplifier: adjusts base risk for your context',
  D2: 'Tenure & experience: years in role and company adjust risk exposure',
  D3: 'Department risk: function-level exposure within the company',
  D4: 'Performance credibility: self-reported vs signal-validated standing',
  D5: 'Geographic risk: country/city-level economic and labor signals',
  D6: 'Market demand: external job postings and recruiter activity for your role',
  D7: 'Cost-of-living adjustment: compensation vulnerability to location',
};

interface DriverRow {
  label: string;
  score: number;
  evidence: string;
}

function getTopDrivers(result: HybridResult): DriverRow[] {
  const dims = (result.dimensions ?? []) as Array<{ key: string; label: string; score: number }>;
  // Sort all dimensions by score descending, take top 3 elevated ones (score > 35)
  const elevated = [...dims]
    .filter(d => typeof d.score === 'number' && d.score > 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (elevated.length > 0) {
    return elevated.map(d => ({
      label: d.label ?? d.key ?? 'Risk factor',
      score: Math.min(100, Math.max(0, Math.round(d.score))),
      // UIDimension has no evidence field — derive from key map
      evidence: DIMENSION_EVIDENCE[d.key] ?? '',
    }));
  }

  // Fallback: use singleBiggestRisk from strategy synthesis as a single row
  const synthesis = (result as any).strategySynthesis;
  const risk: string = synthesis?.singleBiggestRisk ?? '';
  if (risk) {
    return [{ label: 'Primary risk factor', score: result.total, evidence: risk }];
  }
  return [];
}

interface ActionRow {
  title: string;
  description: string;
  riskReductionPct?: number;
  effortBadge?: string;
  priority: string;
}

function getThisWeekActions(result: HybridResult, excludeTitle?: string): ActionRow[] {
  const recs = (result.recommendations ?? []) as any[];
  return [...recs]
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))
    // Exclude the primary move shown in Section 3 to avoid duplicate
    .filter(r => !excludeTitle || (r.title ?? '').trim() !== excludeTitle.trim())
    .slice(0, 4)
    .map(r => ({
      title: r.title ?? '',
      // Truncate long descriptions to 2 sentences max for Guidance Mode readability
      description: truncateToSentences(r.description ?? '', 2),
      riskReductionPct: typeof r.riskReductionPct === 'number' ? r.riskReductionPct : undefined,
      effortBadge: r.effortBadge ?? undefined,
      priority: r.priority ?? 'Medium',
    }));
}

function truncateToSentences(text: string, maxSentences: number): string {
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

interface TopAction {
  title: string;
  timeHorizon: string;
  urgencyLevel: string;
  rationale: string;
}

function getTopAction(result: HybridResult): TopAction | null {
  const synthesis = (result as any).strategySynthesis;
  const action = synthesis?.topPriorityAction;
  if (action?.title) {
    return {
      title: action.title as string,
      timeHorizon: (action.timeHorizon as string) ?? '',
      urgencyLevel: (synthesis?.urgencyLevel as string) ?? 'HIGH',
      rationale: (action.rationale as string) ?? '',
    };
  }
  const fallback = (result.recommendations ?? []).find((r: any) => r.priority === 'Critical') ?? result.recommendations?.[0];
  if (!fallback) return null;
  return {
    title: (fallback as any).title ?? '',
    timeHorizon: (fallback as any).deadline ?? '',
    urgencyLevel: synthesis?.urgencyLevel ?? 'HIGH',
    rationale: (fallback as any).description ?? '',
  };
}

interface ConfidenceSummary {
  confidencePercent: number;
  liveSignals: number;
  freshnessTier: string;
  lowDataWarning: boolean;
}

function getConfidenceSummary(result: HybridResult): ConfidenceSummary {
  return {
    confidencePercent: result.confidencePercent ?? Math.round(Number(result.confidence ?? 0.5) * 100),
    liveSignals: result.signalQuality?.liveSignals ?? 0,
    freshnessTier: (result as any).unifiedFreshness?.tier ?? 'heuristic',
    lowDataWarning: !!(result.signalQuality?.lowDataWarning),
  };
}

// ── Section label helper ──────────────────────────────────────────────────────

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <p style={{
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--alpha-text-35)',
    margin: '0 0 10px',
  }}>
    {text}
  </p>
);

// ── Section wrapper ───────────────────────────────────────────────────────────
// card=true wraps content in a glass card (matching Analysis/Beast card pattern).
// card=false is a plain animation wrapper used when content has its own card styling.

const Section: React.FC<{ delay: number; card?: boolean; children: React.ReactNode }> = ({ delay, card = false, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay }}
    style={card ? {
      background: 'var(--alpha-bg-04)',
      border: '1px solid var(--alpha-bg-08)',
      borderRadius: '16px',
      padding: '16px',
    } : undefined}
  >
    {children}
  </motion.div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const GuidanceView: React.FC<GuidanceViewProps> = ({
  result,
  companyData,
  emergencyMode,
  onSwitchToBeast,
}) => {
  const adaptation = useDashboardAdaptation(result, companyData);
  const score = result.total;
  const confidence = result.confidencePercent ?? Math.round(Number(result.confidence ?? 0.5) * 100);
  const accentColor = riskColor(score);
  const urgency = ((result as any).strategySynthesis?.urgencyLevel as string | undefined) ?? 'HIGH';
  const synthesis = (result as any).strategySynthesis;

  const ciLow  = result.confidenceInterval?.low  ?? undefined;
  const ciHigh = result.confidenceInterval?.high ?? undefined;
  const trendDirection = (result as any).scoreTrajectory?.trendDirection ?? undefined;

  const verdictSentence   = useMemo(() => getVerdictSentence(result, adaptation.feed?.spine), [result, adaptation.feed?.spine]);
  const topDrivers        = useMemo(() => getTopDrivers(result), [result]);
  const topAction         = useMemo(() => getTopAction(result), [result]);
  // Pass topAction title so Section 4 doesn't duplicate Section 3's primary move
  const thisWeekActions   = useMemo(() => getThisWeekActions(result, topAction?.title), [result, topAction?.title]);
  const confidenceSummary = useMemo(() => getConfidenceSummary(result), [result]);

  const FRESHNESS_LABEL: Record<string, string> = {
    live: 'Live data',
    mixed: 'Mixed data',
    stale: 'Stale data',
    heuristic: 'Estimated',
  };

  // ── Emergency layout ──────────────────────────────────────────────────────
  if (emergencyMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0 32px' }}>

        {/* Section 1 — Emergency signal banner */}
        <Section delay={0}>
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.10), rgba(153,27,27,0.06))',
              border: '1px solid rgba(220,38,38,0.28)',
              borderRadius: '16px',
              padding: '20px',
            }}
          >
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-red400-text)', margin: 0, lineHeight: 1.3 }}>
              {urgency === 'CRITICAL' ? 'This is critical.' : 'This needs your attention now.'}
            </p>
            {synthesis?.singleBiggestRisk && (
              <p style={{ fontSize: '14px', color: 'var(--alpha-text-85)', margin: '8px 0 0', lineHeight: 1.6 }}>
                {synthesis.singleBiggestRisk}
              </p>
            )}
          </motion.div>
        </Section>

        {/* Section 2 — Top drivers (still relevant in emergency) */}
        {topDrivers.length > 0 && (
          <Section delay={0.06} card>
            <SectionLabel text="Why This Is Happening" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topDrivers.map((driver, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--alpha-text-92)', margin: 0 }}>{driver.label}</p>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-red600-text)' }}>{driver.score}/100</span>
                  </div>
                  <div style={{ height: '3px', background: 'var(--alpha-bg-08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${driver.score}%`, background: riskColor(driver.score), borderRadius: '2px', transition: 'width 0.8s ease' }} />
                  </div>
                  {driver.evidence && (
                    <p style={{ fontSize: '11px', color: 'var(--alpha-text-45)', margin: '4px 0 0', lineHeight: 1.5 }}>{driver.evidence}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Section 3 — Dominant single action */}
        {topAction && (
          <Section delay={0.12}>
            <SectionLabel text="What To Do Next" />
            <button
              type="button"
              onClick={onSwitchToBeast}
              style={{
                width: '100%',
                background: 'rgba(220,38,38,0.15)',
                border: '1px solid rgba(220,38,38,0.38)',
                borderLeft: '3px solid var(--color-red600-text)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-red600-text)', margin: 0 }}>
                YOUR MOVE{topAction.timeHorizon ? ` — ${topAction.timeHorizon}` : ''}
              </p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--alpha-text-92)', margin: 0, lineHeight: 1.3 }}>
                {topAction.title}
              </p>
              {topAction.rationale && (
                <p style={{ fontSize: '12px', color: 'var(--alpha-text-55)', margin: 0, lineHeight: 1.5 }}>{topAction.rationale}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#dc262699', padding: '2px 8px', background: 'rgba(220,38,38,0.12)', borderRadius: '20px' }}>
                  {URGENCY_LABEL[topAction.urgencyLevel] ?? 'Critical urgency'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-red600-text)', fontWeight: 700 }}>Open emergency plan →</span>
              </div>
            </button>
          </Section>
        )}

        {/* Section 5 — Confidence (trust anchor, always shown) */}
        <Section delay={0.18} card>
          <SectionLabel text="Confidence & Trust" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <ConfidenceBadge text={`${confidenceSummary.confidencePercent}% confident`} color="var(--alpha-text-55)" />
            {confidenceSummary.lowDataWarning && (
              <ConfidenceBadge text="⚠ Limited data" color='#f59e0b' />
            )}
          </div>
        </Section>

        {/* Depth invite */}
        <button
          type="button"
          onClick={onSwitchToBeast}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'center', width: '100%', display: 'block' }}
        >
          <span style={{ fontSize: '12px', color: 'var(--alpha-text-35)' }}>Open full emergency plan </span>
          <span style={{ fontSize: '12px', color: 'var(--color-red600-text)', fontWeight: 600 }}>→</span>
        </button>

      </div>
    );
  }

  // ── Standard Guidance layout — 5 sections ────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0 32px' }}>

      {/* Section 1 — Current Situation */}
      <Section delay={0} card>
        <SectionLabel text="Current Situation" />
        {/* Score ring: rendered at 75% scale.
            transform: scale() does not shrink the layout box, so we use a
            negative bottom margin to collapse the dead vertical space.
            75% of clamp(148px,22vw,192px) ≈ 111–144px → margin-bottom compensates
            for the remaining ~37–48px of unused space left by the transform. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', marginBottom: '-38px' }}>
            <ScoreRingHero
              score={score}
              confidence={confidence}
              ciLow={ciLow}
              ciHigh={ciHigh}
              trendDirection={trendDirection}
            />
          </div>
          {/* Risk level label — plain-English colour-coded level below the ring */}
          <p style={{
            fontSize: '13px',
            fontWeight: 700,
            color: accentColor,
            letterSpacing: '0.04em',
            margin: '0 0 10px',
            textAlign: 'center',
          }}>
            {riskLabel(score)}
          </p>
        </div>
        {/* Verdict sentence */}
        <p style={{ fontSize: '14px', lineHeight: 1.75, color: 'var(--alpha-text-85)', margin: 0 }}>
          {verdictSentence}
        </p>
      </Section>

      {/* Section 2 — Why This Is Happening */}
      {topDrivers.length > 0 && (
        <Section delay={0.08} card>
          <SectionLabel text="Why This Is Happening" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {topDrivers.map((driver, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--alpha-text-92)', margin: 0 }}>{driver.label}</p>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: riskColor(driver.score),
                    padding: '1px 7px',
                    background: riskColor(driver.score) + '18',
                    borderRadius: '10px',
                  }}>{driver.score}/100</span>
                </div>
                {/* Score bar */}
                <div style={{ height: '3px', background: 'var(--alpha-bg-08)', borderRadius: '2px', overflow: 'hidden', marginBottom: driver.evidence ? '6px' : '0' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${driver.score}%` }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
                    style={{ height: '100%', background: riskColor(driver.score), borderRadius: '2px' }}
                  />
                </div>
                {driver.evidence && (
                  <p style={{ fontSize: '11px', color: 'var(--alpha-text-45)', margin: 0, lineHeight: 1.55 }}>{driver.evidence}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Section 3 — What To Do Next (one primary move) */}
      {/* This is a display card, not a button — the user reads their move here.
          The Beast Mode link is only at the bottom depth invite. */}
      {topAction && (
        <Section delay={0.16}>
          <SectionLabel text="What To Do Next" />
          <div
            style={{
              width: '100%',
              background: accentColor + '14',
              border: `1px solid ${accentColor}38`,
              borderLeft: `3px solid ${accentColor}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: accentColor, margin: 0 }}>
              YOUR MOVE{topAction.timeHorizon ? ` — ${topAction.timeHorizon}` : ''}
            </p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--alpha-text-92)', margin: 0, lineHeight: 1.4 }}>
              {topAction.title}
            </p>
            {topAction.rationale && (
              <p style={{ fontSize: '12px', color: 'var(--alpha-text-50)', margin: 0, lineHeight: 1.5 }}>{topAction.rationale}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: accentColor + '99',
                padding: '2px 8px',
                background: accentColor + '12',
                borderRadius: '20px',
                border: `1px solid ${accentColor}22`,
              }}>
                {URGENCY_LABEL[topAction.urgencyLevel] ?? 'High urgency'}
              </span>
              <button
                type="button"
                onClick={onSwitchToBeast}
                style={{ fontSize: '11px', color: accentColor, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Full plan →
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* Section 4 — This Week Action Plan */}
      {thisWeekActions.length > 0 && (
        <Section delay={0.24} card>
          <SectionLabel text="Also do this week" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {thisWeekActions.map((action, i) => {
              const pColor = PRIORITY_COLOR[action.priority] ?? '#22d3ee';
              return (
                <div
                  key={i}
                  style={{
                    borderLeft: `3px solid ${pColor}60`,
                    paddingLeft: '12px',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--alpha-text-92)', margin: '0 0 4px' }}>
                    {action.title}
                  </p>
                  {action.description && (
                    <p style={{ fontSize: '12px', color: 'var(--alpha-text-50)', margin: '0 0 6px', lineHeight: 1.5 }}>
                      {action.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {typeof action.riskReductionPct === 'number' && action.riskReductionPct > 0 && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--color-emerald500-text)',
                        padding: '1px 6px',
                        background: 'rgba(16,185,129,0.12)',
                        borderRadius: '10px',
                        border: '1px solid rgba(16,185,129,0.25)',
                      }}>
                        -{action.riskReductionPct}% risk
                      </span>
                    )}
                    {action.effortBadge && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'var(--alpha-text-45)',
                        padding: '1px 6px',
                        background: 'var(--alpha-bg-06)',
                        borderRadius: '10px',
                      }}>
                        {action.effortBadge}
                      </span>
                    )}
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: pColor + 'aa',
                      padding: '1px 6px',
                      background: pColor + '12',
                      borderRadius: '10px',
                    }}>
                      {action.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Section 5 — Confidence & Trust */}
      <Section delay={0.32} card>
        <SectionLabel text="Confidence & Trust" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <ConfidenceBadge
            text={`${confidenceSummary.confidencePercent}% confident`}
            color="var(--alpha-text-55)"
          />
          {confidenceSummary.lowDataWarning && (
            <ConfidenceBadge text="⚠ Limited data" color='#f59e0b' />
          )}
        </div>
      </Section>

      {/* Depth invite — one subtle line, not a button */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.40 }}
        onClick={onSwitchToBeast}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'center', width: '100%', display: 'block' }}
      >
        <span style={{ fontSize: '12px', color: 'var(--alpha-text-30)' }}>
          Want the full picture?{' '}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--color-cyan-text)', fontWeight: 600 }}>See full analysis →</span>
      </motion.button>

    </div>
  );
};

// ── Confidence badge ───────────────────────────────────────────────────────────

const ConfidenceBadge: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <span style={{
    fontSize: '11px',
    fontWeight: 600,
    color,
    padding: '3px 10px',
    background: 'var(--alpha-bg-06)',
    border: '1px solid var(--alpha-bg-08)',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
  }}>
    {text}
  </span>
);

export default GuidanceView;
