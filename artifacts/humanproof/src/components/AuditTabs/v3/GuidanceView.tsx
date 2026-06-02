// GuidanceView.tsx — Guidance Mode: the "expert advisor" experience.
//
// Design principle: this is a NARRATIVE, not a dashboard.
// Intelligence Mode is cards and panels. Guidance Mode is one voice.
//
// Four zones, no cards, no section headers:
//   Zone 1 — Score Signal     (ring + label + one italic reassurance line)
//   Zone 2 — Advisor Brief    (3 flowing prose paragraphs: WHAT / WHY / DO)
//   Zone 3 — The One Action   (single full-width action button)
//   Zone 4 — Depth Invite     (one subtle link to Intelligence Mode)
//
// Emergency layout strips further: red banner + one paragraph + one action.
//
// The user should feel like they just received a clear message from a trusted
// advisor — not like they are reading a condensed version of a report.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { riskColor, riskLabel } from '../../../lib/riskTokens';
import { ScoreRingHero } from './SummaryTab';
import { VerdictReassurance } from '../common/VerdictReassurance';

// ── Props ─────────────────────────────────────────────────────────────────────

interface GuidanceViewProps {
  result: HybridResult;
  companyData: CompanyData;
  /** Called when the user wants to see the full analysis. */
  onSwitchToIntelligence: () => void;
  emergencyMode: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getParagraph1(result: HybridResult, feedSpine?: string): string {
  const brief = (result as any).intelligenceBrief;
  if (brief?.paragraphs?.[0]) return brief.paragraphs[0] as string;
  if (feedSpine) return feedSpine;
  // Minimal deterministic fallback when no brief and no feed spine yet
  const company = result.companyName ?? 'Your company';
  const score = result.total;
  return `${company} is showing risk signals that have placed your displacement probability at ${score}/100. ` +
    `The analysis has processed ${score >= 65 ? 'multiple elevated' : 'several'} risk dimensions to reach this assessment.`;
}

function getParagraph2(result: HybridResult): string {
  const synthesis = (result as any).strategySynthesis;
  const rationale: string = synthesis?.strategyRationale ?? '';
  const biggestRisk: string = synthesis?.singleBiggestRisk ?? '';
  const keyRiskDriver: string | undefined = (result as any).intelligenceBrief?.keyRiskDriver;

  // Lead with the key risk driver as a bold-intent inline string
  // (rendered via dangerouslySetInnerHTML-free JSX in the component below)
  // We return a structured object instead of a plain string for paragraph 2
  // so the component can bold the driver without HTML injection.
  // Convention: driver is stored as __driver__ prefix
  const driver = keyRiskDriver ? `__driver__${keyRiskDriver}` : '';
  const body = rationale
    ? (biggestRisk ? `${rationale}, because ${biggestRisk.toLowerCase()}.` : rationale)
    : (biggestRisk ? `The primary risk is: ${biggestRisk}` : '');
  return driver ? `${driver}\n${body}` : body;
}

function getParagraph3(result: HybridResult): string {
  const brief = (result as any).intelligenceBrief;
  const synthesis = (result as any).strategySynthesis;

  // Prefer the market-grounded topActionThisWeek from the brief — it cites real numbers
  if (brief?.marketGrounded && brief?.topActionThisWeek) {
    return brief.topActionThisWeek as string;
  }
  // Fall back to the strategy engine's topPriorityAction
  const action = synthesis?.topPriorityAction;
  if (action?.title) {
    const rationale: string = action.rationale ?? '';
    return rationale ? `${action.title}. ${rationale}` : action.title as string;
  }
  return '';
}

interface TopAction {
  title: string;
  timeHorizon: string;
  urgencyLevel: string;
}

function getTopAction(result: HybridResult): TopAction | null {
  const synthesis = (result as any).strategySynthesis;
  const action = synthesis?.topPriorityAction;
  if (!action?.title) {
    // Fall back to first Critical recommendation
    const rec = (result.recommendations ?? []).find(r => r.priority === 'Critical') ?? result.recommendations?.[0];
    if (!rec) return null;
    return {
      title: rec.title,
      timeHorizon: rec.deadline ?? '',
      urgencyLevel: synthesis?.urgencyLevel ?? 'HIGH',
    };
  }
  return {
    title: action.title as string,
    timeHorizon: (action.timeHorizon as string) ?? '',
    urgencyLevel: (synthesis?.urgencyLevel as string) ?? 'HIGH',
  };
}

const URGENCY_LABEL: Record<string, string> = {
  CRITICAL: 'Critical urgency',
  HIGH:     'High urgency',
  MODERATE: 'Moderate urgency',
  LOW:      'Low urgency',
};

// ── Paragraph 2 renderer — supports bold driver prefix ────────────────────────

const Paragraph2: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  if (!text) return null;
  if (text.startsWith('__driver__')) {
    const nl = text.indexOf('\n');
    const driver = text.slice('__driver__'.length, nl > 0 ? nl : undefined);
    const body = nl > 0 ? text.slice(nl + 1) : '';
    return (
      <p
        style={{
          fontSize: '14px',
          lineHeight: 1.75,
          color: 'rgba(255,255,255,0.80)',
          margin: 0,
        }}
      >
        {driver && (
          <strong style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
            {driver}{body ? ' ' : ''}
          </strong>
        )}
        {body}
      </p>
    );
  }
  return (
    <p style={{ fontSize: '14px', lineHeight: 1.75, color: 'rgba(255,255,255,0.80)', margin: 0 }}>
      {text}
    </p>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const GuidanceView: React.FC<GuidanceViewProps> = ({
  result,
  companyData,
  onSwitchToIntelligence,
  emergencyMode,
}) => {
  const adaptation = useDashboardAdaptation(result, companyData);
  const score = result.total;
  const confidence = result.confidencePercent ?? Math.round(Number(result.confidence ?? 0.5) * 100);
  const accentColor = riskColor(score);
  const urgency = ((result as any).strategySynthesis?.urgencyLevel as string | undefined) ?? 'HIGH';
  const synthesis = (result as any).strategySynthesis;

  // CI for the score ring
  const ciLow  = result.confidenceInterval?.low  ?? undefined;
  const ciHigh = result.confidenceInterval?.high ?? undefined;
  const trendDirection = (result as any).scoreTrajectory?.trendDirection ?? undefined;

  // Compose the three advisor paragraphs
  const para1 = useMemo(() => getParagraph1(result, adaptation.feed?.spine), [result, adaptation.feed?.spine]);
  const para2 = useMemo(() => getParagraph2(result), [result]);
  const para3 = useMemo(() => getParagraph3(result), [result]);
  const topAction = useMemo(() => getTopAction(result), [result]);

  // ── Emergency layout ──────────────────────────────────────────────────────
  if (emergencyMode) {
    const emergencyHeadline = urgency === 'CRITICAL'
      ? 'This is critical.'
      : 'This needs your attention now.';
    const emergencySubline = synthesis?.singleBiggestRisk as string | undefined;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '8px 0 32px' }}>

        {/* Zone 1 — Emergency signal banner (no ring; urgency replaces precision) */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          style={{
            background: 'rgba(220,38,38,0.10)',
            border: '2px solid rgba(220,38,38,0.45)',
            borderRadius: '14px',
            padding: '20px 20px',
          }}
        >
          <p style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444', margin: 0, lineHeight: 1.3 }}>
            {emergencyHeadline}
          </p>
          {emergencySubline && (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.82)', margin: '8px 0 0', lineHeight: 1.6 }}>
              {emergencySubline}
            </p>
          )}
        </motion.div>

        {/* Zone 2 — Emergency brief: just the situation paragraph */}
        {para1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            style={{ fontSize: '14px', lineHeight: 1.75, color: 'rgba(255,255,255,0.80)', margin: 0 }}
          >
            {para1}
          </motion.p>
        )}

        {/* Zone 3 — The one action */}
        {topAction && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.14 }}
            onClick={onSwitchToIntelligence}
            style={{
              width: '100%',
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.38)',
              borderLeft: '3px solid #dc2626',
              borderRadius: '12px',
              padding: '18px 20px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#dc2626', margin: 0 }}>
              YOUR MOVE{topAction.timeHorizon ? ` — ${topAction.timeHorizon}` : ''}
            </p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: 0, lineHeight: 1.4 }}>
              {topAction.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#dc262699', padding: '2px 8px', background: 'rgba(220,38,38,0.12)', borderRadius: '20px' }}>
                {URGENCY_LABEL[topAction.urgencyLevel] ?? 'Critical urgency'}
              </span>
              <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>→ Open action plan</span>
            </div>
          </motion.button>
        )}

        {/* Zone 4 — Depth invite */}
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.22 }}
          onClick={onSwitchToIntelligence}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', textAlign: 'center', display: 'block', width: '100%' }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            See the complete analysis, all signals, and your full action plan{' '}
          </span>
          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>→</span>
        </motion.button>

      </div>
    );
  }

  // ── Standard Guidance layout ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '8px 0 32px' }}>

      {/* Zone 1 — Score signal */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
      >
        {/* Score ring — scaled to 70% via CSS transform so it feels focused, not dominant */}
        <div style={{ transform: 'scale(0.7)', transformOrigin: 'center center', lineHeight: 0 }}>
          <ScoreRingHero
            score={score}
            confidence={confidence}
            ciLow={ciLow}
            ciHigh={ciHigh}
            trendDirection={trendDirection}
          />
        </div>

        {/* Verdict reassurance — one italic line */}
        <VerdictReassurance score={score} urgency={urgency} />
      </motion.div>

      {/* Zone 2 — Advisor brief: three paragraphs of plain prose */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Paragraph 1 — WHAT IS HAPPENING */}
        {para1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.06 }}
            style={{ fontSize: '14px', lineHeight: 1.75, color: 'rgba(255,255,255,0.80)', margin: 0 }}
          >
            {para1}
          </motion.p>
        )}

        {/* Paragraph 2 — WHY IT MATTERS (with optional bold driver prefix) */}
        {para2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.13 }}
          >
            <Paragraph2 text={para2} color={accentColor} />
          </motion.div>
        )}

        {/* Paragraph 3 — WHAT TO DO (brighter + slightly larger, most important) */}
        {para3 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.20 }}
            style={{ fontSize: '15px', lineHeight: 1.75, color: 'rgba(255,255,255,0.92)', margin: 0, fontWeight: 450 }}
          >
            {para3}
          </motion.p>
        )}
      </div>

      {/* Zone 3 — The one action button */}
      {topAction && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          onClick={onSwitchToIntelligence}
          style={{
            width: '100%',
            background: `${accentColor}14`,
            border: `1px solid ${accentColor}38`,
            borderLeft: `3px solid ${accentColor}`,
            borderRadius: '12px',
            padding: '18px 20px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', color: accentColor, margin: 0 }}>
            YOUR MOVE{topAction.timeHorizon ? ` — ${topAction.timeHorizon}` : ''}
          </p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: 0, lineHeight: 1.4 }}>
            {topAction.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <span style={{ fontSize: '12px', color: accentColor, fontWeight: 600 }}>→ Start now</span>
          </div>
        </motion.button>
      )}

      {/* Zone 4 — Depth invite: one subtle line */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.32 }}
        onClick={onSwitchToIntelligence}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', textAlign: 'center', display: 'block', width: '100%' }}
      >
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          See the complete analysis, all signals, and your full action plan{' '}
        </span>
        <span style={{ fontSize: '12px', color: '#00d4e0', fontWeight: 600 }}>→</span>
      </motion.button>

    </div>
  );
};

export default GuidanceView;
