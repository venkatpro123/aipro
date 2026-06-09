// EarlyWarningStrip — compact detection strip (Rule 3, Rule 11)
// Shows detected signals (NOT predictions) organized by category.
// Only renders if any signals are active — stays invisible when clear.
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Zap, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { HybridResult } from '../../types/hybridResult';
import type { ActionPlanItem } from '../../types/hybridResult';
import type { AdaptationTrigger } from '../../services/adaptationTriggerService';
import { computeInaction30Day } from '../../services/inactionConsequenceCalculator';
import { ConsequenceFrameStrip } from '../shared/ConsequenceFrameStrip';

interface DetectedSignal {
  category: 'company' | 'market' | 'peer';
  label: string;
  count: number;
  severity: 'critical' | 'high' | 'info';
}

interface Props {
  scoreResult: HybridResult;
  adaptationTriggers: AdaptationTrigger[];
}

function buildSignals(hr: HybridResult, triggers: AdaptationTrigger[]): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  // Company health signals — stealth layoff + collapse stage
  const stealth = (hr as any)._stealthSignal;
  const collapseStage = (hr as any).collapseStage;
  let companyCount = 0;
  if (stealth?.severity && stealth.severity !== 'STABLE') companyCount++;
  if (collapseStage?.stage && collapseStage.stage >= 2) companyCount++;
  if (triggers.some(t => t.type === 'signal_changed')) companyCount++;
  if (companyCount > 0) {
    const hasCollapse = collapseStage?.stage >= 3;
    signals.push({
      category: 'company',
      label: hasCollapse ? 'Company collapse indicators active' : 'Company health signals',
      count: companyCount,
      severity: hasCollapse || (stealth?.severity === 'SILENT_PURGE') ? 'critical' : 'high',
    });
  }

  // Market / skill demand signals
  const marketSignal = (hr as any).marketDemand;
  const hiringSignal = (hr as any).hiringSignalResult;
  let marketCount = 0;
  if (marketSignal?.demandTrend === 'declining') marketCount++;
  if (hiringSignal?.hiringFreezeDetected) marketCount++;
  if (marketCount > 0) {
    signals.push({
      category: 'market',
      label: hiringSignal?.hiringFreezeDetected ? 'Hiring freeze detected' : 'Market demand shifting',
      count: marketCount,
      severity: 'high',
    });
  }

  // Peer sector layoffs
  const peerTrigger = triggers.find(t => t.type === 'peer_surge');
  if (peerTrigger) {
    signals.push({
      category: 'peer',
      label: 'Layoff events in your industry',
      count: 1,
      severity: peerTrigger.severity === 'critical' ? 'critical' : 'high',
    });
  }

  return signals;
}

const CATEGORY_ICON = {
  company: AlertTriangle,
  market: TrendingDown,
  peer: Zap,
} as const;

const SEV_COLOR = {
  critical: '#ef4444',
  high: '#f59e0b',
  info: 'rgba(255,255,255,0.4)',
} as const;

export function EarlyWarningStrip({ scoreResult, adaptationTriggers }: Props) {
  const navigate = useNavigate();
  const signals = buildSignals(scoreResult, adaptationTriggers);

  if (signals.length === 0) return null;

  // Consequence framing (Rule 7): show 30-day projection when high/critical signals active
  const hasSevereSignal = signals.some(s => s.severity === 'critical' || s.severity === 'high');
  const currentScore = scoreResult.total ?? 0;
  const topAction = (scoreResult.actionItems ?? [])[0] as ActionPlanItem | undefined;
  const consequence30 = hasSevereSignal && topAction
    ? computeInaction30Day(currentScore, null, topAction)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 14 }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
      }}>
        <div style={{
          fontSize: '0.63rem', fontWeight: 800, color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: 'var(--font-mono, monospace)', flexShrink: 0,
        }}>
          EARLY WARNINGS
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {signals.map(sig => {
            const Icon = CATEGORY_ICON[sig.category];
            const color = SEV_COLOR[sig.severity];
            return (
              <button
                key={sig.category}
                type="button"
                aria-label={`${sig.label} — view details`}
                onClick={() => navigate('/monitor')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', borderRadius: 6,
                  background: `${color}10`, border: `1px solid ${color}25`,
                  fontSize: '0.73rem', fontWeight: 600, color,
                  cursor: 'pointer', transition: 'background 150ms', outline: 'none',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${color}20`}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = `${color}10`}
                onFocus={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${color}55`}
                onBlur={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
              >
                <Icon size={11} style={{ flexShrink: 0 }} />
                {sig.count > 1 ? `${sig.count} ` : ''}{sig.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="View all early warnings"
          onClick={() => navigate('/monitor')}
          onFocus={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--cyan)55'}
          onBlur={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--cyan)', fontSize: '0.72rem', fontWeight: 700,
            cursor: 'pointer', padding: '2px 4px', flexShrink: 0, borderRadius: 4,
          }}
        >
          View all
          <ArrowUpRight size={11} />
        </button>
      </div>

      {consequence30 && (
        <ConsequenceFrameStrip
          trajectory={{ days: 30, projectedScore: consequence30.projectedScore, label: consequence30.label, rationale: `If signals persist unaddressed by ${consequence30.targetDate}, risk compounds further.` }}
          currentScore={currentScore}
        />
      )}
    </motion.div>
  );
}
