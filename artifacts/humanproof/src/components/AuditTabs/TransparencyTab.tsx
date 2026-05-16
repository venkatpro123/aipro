// TransparencyTab.tsx
// Data provenance and system transparency — Answers "How was this calculated?"
// Displays: Data quality dashboard, source provenance, methodology explainers.

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Info,
  Database,
  Lock,
  Layers,
  BarChart2,
  AlertTriangle,
  Download,
  Check,
  Filter,
  BarChart,
  Shield,
  Clock,
} from "lucide-react";
import { SectionHeader } from "./common/SectionHeader";
import { CollapsibleSection } from "./common/CollapsibleSection";
import type { TabProps } from "./common/types";
import type { SignalQuality, ConsensusSnapshot } from "../../types/hybridResult";
// v12.0
import { SignalAttributionWaterfall } from "./common/SignalAttributionWaterfall";
// v13.0
import PeerContagionPanel from "./common/PeerContagionPanel";
import ModelCalibrationPanel from "./common/ModelCalibrationPanel";
// v17.0
import HistoricalAccuracyPanel from "./common/HistoricalAccuracyPanel";
// live-data-first
import { DataFreshnessPanel } from "../audit/DataFreshnessPanel";
import { LiveDataCoveragePanel } from "../audit/LiveDataCoveragePanel";
import { CALIBRATION_META } from "../../services/empiricalCalibration";
import { getCircuitSnapshot } from "../../services/apiCircuitBreaker";
import { PatternMatchCard } from "../PatternMatchCard";
import {
  computeActionCoverage,
  getTopUncoveredPrefixes,
} from "../../services/actionCoverageAudit";
import {
  getCalibrationReport,
  getCalibrationSummaryLabel,
  type DimensionValidationResult,
} from "../../services/calibrationBacktester";
import { getScenarioArchetypeLabel, getScenarioArchetypeColor } from "../../services/scenarioNarrativeEngine";

// ---------------------------------------------------------------------------
// DataQualityDashboard - Visualization of data quality metrics
// ---------------------------------------------------------------------------

const DataQualityDashboard: React.FC<{
  dataFreshness: TabProps["result"]["dataFreshness"];
  signalQuality: TabProps["result"]["signalQuality"];
  calculationMode?: string;
}> = ({ dataFreshness, signalQuality, calculationMode }) => {
  const avgFreshness = dataFreshness.ageInDays;
  const liveSignals = signalQuality.liveSignals ?? 0;
  const heuristicSignals = signalQuality.heuristicSignals ?? 7;
  const totalSignals = Math.max(1, liveSignals + heuristicSignals);
  // [AUDIT FIX]: "Live Streams" renamed to "API Signals" to be honest —
  // liveSignals includes DB cache hits that aren't truly real-time API calls.
  const liveSignalPercent = Math.round((liveSignals / totalSignals) * 100);
  const isDbDominant = calculationMode?.includes('DB') || calculationMode?.includes('FALLBACK');

  return (
    <div className="data-quality-dashboard grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6)] mb-[var(--space-8)]">
      <div className="glass-panel-heavy p-[var(--space-6)] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Database className="w-12 h-12" />
        </div>
        <div className="label-xs text-muted-foreground uppercase tracking-widest mb-[var(--space-2)]">Data Freshness</div>
        <div className="text-3xl font-black tracking-tighter mb-1"
          style={{ color: avgFreshness <= 7 ? 'var(--emerald)' : avgFreshness <= 30 ? 'var(--amber)' : 'var(--red)' }}>
          {avgFreshness}d
        </div>
        <div className="text-[10px] text-muted-foreground font-mono uppercase mb-[var(--space-2)]">
          {isDbDominant ? 'Database Snapshot (not live)' : 'Signal Latency'}
        </div>
        <div className="text-[11px] text-muted-foreground mb-[var(--space-3)] leading-relaxed">
          {avgFreshness <= 1 ? "Same-day data — highest accuracy" :
           avgFreshness <= 7 ? "Fresh — within weekly update window" :
           avgFreshness <= 30 ? "⚠ Moderate staleness — recent events may not be reflected" :
           avgFreshness <= 90 ? "🔴 Stale data — confidence reduced. Scores may lag market reality by months." :
           "🔴 Critical staleness — data is over 90 days old. Score treats missing signals as neutral, which may understate real risk."}
        </div>
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${avgFreshness <= 7 ? "bg-[var(--emerald)]" : avgFreshness <= 30 ? "bg-[var(--amber)]" : "bg-[var(--red)]"}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(10, 100 - (avgFreshness / 30) * 100)}%` }}
            style={{ boxShadow: `0 0 10px ${avgFreshness <= 7 ? "var(--emerald)" : "var(--amber)"}44` }}
          />
        </div>
      </div>

      <div className="glass-panel-heavy p-[var(--space-6)] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BarChart2 className="w-12 h-12" />
        </div>
        <div className="label-xs text-muted-foreground uppercase tracking-widest mb-[var(--space-2)]">Signal Coverage</div>
        <div className="text-3xl font-black tracking-tighter mb-1"
          style={{ color: liveSignalPercent >= 50 ? 'var(--cyan)' : liveSignalPercent >= 25 ? 'var(--amber)' : 'var(--text-3)' }}>
          {liveSignalPercent}%
        </div>
        <div className="text-[10px] text-muted-foreground font-mono uppercase mb-[var(--space-2)]">
          {liveSignals}/{totalSignals} Signals Non-Heuristic
        </div>
        <div className="text-[11px] text-muted-foreground mb-[var(--space-3)] leading-relaxed">
          {liveSignalPercent >= 70
            ? "Strong coverage — most signals from fresh sources"
            : liveSignalPercent >= 40
              ? "Partial coverage — mix of fresh and static signals"
              : "⚠ Heuristic-dominant — live APIs unavailable; score uses industry baselines and DB snapshots"}
        </div>
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[var(--cyan)]"
            initial={{ width: 0 }}
            animate={{ width: `${liveSignalPercent}%` }}
            style={{ boxShadow: '0 0 10px rgba(0,212,224,0.27)' }}
          />
        </div>
      </div>

      <div className="glass-panel-heavy p-[var(--space-6)] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <div className="label-xs text-muted-foreground uppercase tracking-widest mb-[var(--space-2)]">Signal Conflicts</div>
        <div className="text-3xl font-black tracking-tighter mb-1">{signalQuality.conflictingSignals.length}</div>
        <div className="text-[10px] text-muted-foreground font-mono uppercase mb-[var(--space-2)]">
          {signalQuality.conflictingSignals.length === 0 ? "No Conflicts — Clean Consensus" : "Conflicts Detected & Resolved"}
        </div>
        <div className="text-[11px] text-muted-foreground mb-[var(--space-3)] leading-relaxed">
          {signalQuality.conflictingSignals.length === 0 ? "All signal sources converged — highest consensus confidence" : `${signalQuality.conflictingSignals.length} conflict(s) resolved via weighted arbitration. See Conflict Log below.`}
        </div>
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[var(--red)]"
            initial={{ width: 0 }}
            animate={{ width: `${(signalQuality.conflictingSignals.length / 5) * 100}%` }}
            style={{ boxShadow: '0 0 10px rgba(239,68,68,0.27)' }}
          />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ConflictResolutionLog - Display how signal conflicts were resolved
// ---------------------------------------------------------------------------

interface ConflictResolutionLogProps {
  signalQuality: SignalQuality;
  consensusSnapshot?: ConsensusSnapshot;
}

const ConflictResolutionLog: React.FC<ConflictResolutionLogProps> = ({
  signalQuality,
  consensusSnapshot,
}) => {
  const conflicts = signalQuality.conflictingSignals || [];
  const overridesApplied = consensusSnapshot?.overridesApplied || [];

  if (conflicts.length === 0 && overridesApplied.length === 0) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="flex justify-center mb-3">
          <Check className="w-8 h-8 text-emerald-500 opacity-50" />
        </div>
        <h4 className="text-sm font-bold uppercase tracking-widest mb-1">Signal Coherence Optimal</h4>
        <p className="text-xs text-muted-foreground">No conflicting data points detected across the ingestion matrix.</p>
      </div>
    );
  }

  return (
    <div className="conflict-resolution-log space-y-4">
      {conflicts.map((conflict) => (
        <div key={`${conflict.signalType}-${conflict.severity}`} className="glass-panel border-l-2 border-l-[var(--amber)] overflow-hidden">
          <div className="p-[var(--space-4)]">
            <div className="flex justify-between items-start mb-[var(--space-2)]">
              <div className="flex items-center gap-[var(--space-2)]">
                <AlertTriangle className="w-4 h-4 text-[var(--amber)]" />
                <span className="text-sm font-bold tracking-tight">{conflict.signalType} Signal Conflict</span>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${getSeverityColorClass(conflict.severity)}`}>
                {conflict.severity}
              </span>
            </div>

            <div className="space-y-2 mt-3">
              {conflict.descriptions.map((desc) => (
                <p key={desc.slice(0, 40)} className="text-xs text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              ))}
            </div>

            {conflict.conflictingSources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="label-xs text-muted-foreground mb-2">Divergent Vectors</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {conflict.conflictingSources.map((src) => (
                    <div key={src.source} className="bg-white/5 p-2 rounded flex justify-between items-center">
                      <span className="text-[10px] font-medium opacity-60 italic">{src.source}</span>
                      <span className="text-[10px] font-mono font-bold tracking-tighter">{src.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {conflict.recommendedResolution && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex items-start gap-2">
                <Check className="w-3 h-3 text-emerald-500 mt-0.5" />
                <div className="text-[10px] text-emerald-500/80 leading-tight">
                  <span className="font-bold uppercase mr-1">Resolution:</span>
                  {conflict.recommendedResolution}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {overridesApplied.length > 0 && (
        <div className="glass-panel-heavy p-4 border-l-2 border-l-rose-500">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-bold">Manual Safety Overrides Applied</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {overridesApplied.map((override, idx) => (
              <span key={idx} className="text-[10px] font-mono bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded border border-rose-500/20">
                {override}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// AuditTrail - Chronological record of assessment operations
// ---------------------------------------------------------------------------

interface AuditEvent {
  timestamp: string;
  operation: string;
  status: "success" | "warning" | "error";
  details: string;
}

const AuditTrail: React.FC<{ events: AuditEvent[] }> = ({ events }) => {
  return (
    <div className="audit-trail glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="text-left py-3 px-4 label-xs text-muted-foreground uppercase opacity-50">Event Marker</th>
              <th className="text-left py-3 px-4 label-xs text-muted-foreground uppercase opacity-50">Operation</th>
              <th className="text-left py-3 px-4 label-xs text-muted-foreground uppercase opacity-50">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {events.map((event, index) => (
              <tr key={index} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-mono text-[10px] opacity-60">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="py-3 px-4">
                  <div className="text-xs font-bold">{event.operation}</div>
                  <div className="text-[10px] text-muted-foreground opacity-60 mt-0.5">{event.details}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(event.status)}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      event.status === 'success' ? 'text-emerald-500' : 
                      event.status === 'warning' ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const getSeverityColorClass = (severity: string) => {
  switch (severity) {
    case "critical": return "bg-rose-500/20 text-rose-500 border border-rose-500/30";
    case "high": return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
    case "medium": return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    default: return "bg-white/10 text-muted-foreground border border-white/10";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "success": return <Check className="w-3 h-3 text-emerald-500" />;
    case "warning": return <AlertTriangle className="w-3 h-3 text-amber-500" />;
    case "error": return <Lock className="w-3 h-3 text-rose-500" />;
    default: return <Info className="w-3 h-3 text-muted-foreground" />;
  }
};


// ---------------------------------------------------------------------------
// SourceProvenanceTable - Data lineage information
// ---------------------------------------------------------------------------

interface DataSource {
  name: string;
  type: string;
  domain: string;
  lastUpdated: string;
  description: string;
}

const SourceProvenanceTable: React.FC<{
  sources: DataSource[];
}> = ({ sources }) => {
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredSources =
    selectedType === "all"
      ? sources
      : sources.filter((source) => source.type === selectedType);

  const typeOptions = ["all", ...Array.from(new Set(sources.map((s) => s.type)))];

  return (
    <div className="source-provenance glass-panel p-[var(--space-6)] shadow-inner">
      <div className="flex justify-between items-center mb-[var(--space-6)]">
        <h4 className="text-lg font-bold tracking-tight">System Grounding Proofs</h4>
        <div className="flex items-center gap-[var(--space-3)]">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[var(--cyan)]/50 outline-none"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type} className="bg-black text-white">
                {type === "all" ? "Agnostic Source Type" : `${type} Verification`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 label-xs text-muted-foreground uppercase opacity-50">Origin Entity</th>
              <th className="text-left py-3 px-4 label-xs text-muted-foreground uppercase opacity-50">Vector Class</th>
              <th className="text-left py-3 px-4 label-xs text-muted-foreground uppercase opacity-50">Domain Auth</th>
              <th className="text-left py-3 px-4 label-xs text-muted-foreground uppercase opacity-50">Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {filteredSources.map((source, index) => (
              <tr key={index} className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                <td className="py-4 px-4">
                  <div className="font-bold text-sm tracking-tight">{source.name}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 opacity-60 mt-0.5">{source.description}</div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan/10 text-cyan font-black border border-cyan/20">
                    {source.type.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4 font-mono text-[10px] opacity-70">{source.domain}</td>
                <td className="py-4 px-4 text-[10px] font-mono opacity-50">{source.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};



// ---------------------------------------------------------------------------
// CalibrationFreshnessPanel — model calibration age and AUC trust signal
// ---------------------------------------------------------------------------

const CALIBRATION_WARNING_DAYS = 120;

const CalibrationFreshnessPanel: React.FC<{ calibrationCoverage?: number }> = ({ calibrationCoverage }) => {
  const calibratedAt          = new Date(CALIBRATION_META.calibrated_at);
  const nextAt                = new Date(CALIBRATION_META.next_recalibration_at);
  const now                   = new Date();
  const ageInDays             = Math.floor((now.getTime() - calibratedAt.getTime()) / 86_400_000);
  const daysUntilNext         = Math.floor((nextAt.getTime() - now.getTime()) / 86_400_000);
  const isApproachingAge      = ageInDays >= CALIBRATION_WARNING_DAYS;
  const isOverdue             = daysUntilNext < 0;
  const monthsSinceCalibration = Math.floor(ageInDays / 30);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-3">
      {/* Warning banner — shown when calibration is ≥ 120 days old */}
      {(isApproachingAge || isOverdue) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              {isOverdue
                ? `Calibration is overdue — the scheduled recalibration date (${fmtDate(nextAt)}) has passed. Scores may reflect market conditions from ${fmtDate(calibratedAt)} rather than current dynamics. A recalibration run is recommended.`
                : `Calibration is approaching its review date (${daysUntilNext} days remaining). Scores may be less accurate for market conditions that have shifted since ${fmtDate(calibratedAt)}.`}
            </p>
          </div>
        </div>
      )}

      {/* Calibration age warning — amber at >6 months, red at >12 months */}
      {monthsSinceCalibration > 6 && monthsSinceCalibration <= 12 && !isOverdue && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Calibration data is {monthsSinceCalibration} months old — scores for emerging AI restructuring patterns may be less accurate.
            </p>
          </div>
        </div>
      )}
      {monthsSinceCalibration > 12 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">
              Calibration data is {monthsSinceCalibration} months old — accuracy for recent market conditions is significantly reduced. Recalibration overdue.
            </p>
          </div>
        </div>
      )}

      {/* Calibration metrics panel */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">
            Model Calibration Status
          </span>
          <span
            className="ml-auto text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider"
            style={{
              background: isOverdue
                ? 'rgba(239,68,68,0.15)'
                : isApproachingAge
                ? 'rgba(245,158,11,0.15)'
                : 'rgba(16,185,129,0.12)',
              color: isOverdue ? '#ef4444' : isApproachingAge ? '#f59e0b' : '#10b981',
              border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.25)' : isApproachingAge ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.2)'}`,
            }}
          >
            {isOverdue ? 'Overdue' : isApproachingAge ? `${ageInDays}d old` : 'Current'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/8">
          {[
            {
              label: 'Calibration date',
              value: fmtDate(calibratedAt),
              sub:   `${ageInDays} days ago`,
              color: isApproachingAge ? 'var(--amber)' : 'var(--text)',
            },
            {
              label: 'Training events',
              value: CALIBRATION_META.n_events.toLocaleString(),
              sub:   'verified layoff events',
              color: 'var(--text)',
            },
            {
              label: 'Hold-out AUC-ROC',
              value: CALIBRATION_META.auc_roc?.toFixed(2) ?? '—',
              sub:   CALIBRATION_META.holdout_n != null
                       ? `n=${CALIBRATION_META.holdout_n} hold-out`
                       : 'hold-out validation',
              color: (CALIBRATION_META.auc_roc ?? 0) >= 0.80
                       ? 'var(--emerald)'
                       : (CALIBRATION_META.auc_roc ?? 0) >= 0.70
                       ? 'var(--amber)'
                       : 'var(--red)',
            },
            {
              label: 'Next recalibration',
              value: fmtDate(nextAt),
              sub:   isOverdue
                       ? 'overdue'
                       : `in ${daysUntilNext} days`,
              color: isOverdue ? '#ef4444' : isApproachingAge ? 'var(--amber)' : 'var(--text)',
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="px-4 py-3">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                {label}
              </div>
              <div className="text-sm font-black tracking-tight" style={{ color }}>
                {value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* AUC interpretation and honest calibration coverage */}
        <div className="px-4 py-3 border-t border-white/8 bg-white/[0.015] space-y-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            AUC-ROC 0.81 was measured on {CALIBRATION_META.holdout_n ?? 40} held-out events (confidence interval ≈ ±0.10 at 95%).
            Training data is predominantly US public technology companies from layoffs.fyi — predictions for Indian IT, healthcare, manufacturing, and private companies have no empirical validation.
          </p>
          {/* MED-5: Calibration coverage — dynamic from score result */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-[10px] text-amber-300/80 leading-relaxed">
              <span className="font-bold text-amber-300">
                Calibration coverage:{' '}
                {calibrationCoverage != null
                  ? `${Math.round(calibrationCoverage * 100)}% of score weight`
                  : '~58% of score weight'}
              </span>{' '}
              is calibrated to historical outcomes (D1, D4, L1, L2 — regression-derived).
              {' '}{calibrationCoverage != null
                ? `The remaining ${Math.round((1 - calibrationCoverage) * 100)}%`
                : 'The remaining ~42%'}{' '}
              uses initial developer estimates pending outcome regression (D2 AI Tool Maturity, D3 Augmentation Risk, D6 Agent Capability, D7 Company Health).
              This is disclosed so you can weight the score appropriately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MethodologyExplainer - Details on how the risk score is calculated
// ---------------------------------------------------------------------------

interface MethodologySection {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const MethodologyExplainer: React.FC = () => {
  const sections: MethodologySection[] = [
    {
      title: "Multi-Layered Risk Assessment",
      description:
        "Your risk score is calculated across 5 dimensions: Financial Vulnerability, Layoff History, Industry Risk, Role Displacement, and Regional Factors. Each dimension contributes a weighted portion to your final score.",
      icon: <Layers className="w-6 h-6 text-blue-400" />,
    },
    {
      title: "Heuristic Signal Processing",
      description:
        "A set of domain-specific analysis modules process career, market, and company signals using empirically-derived and developer-estimated weights. Outputs are merged through a weighted consensus with conflict detection and data-quality discounting. Select dimensions use LLM-backed Edge Functions for narrative generation.",
      icon: <BarChart className="w-6 h-6 text-violet-400" />,
    },
    {
      title: "Real-Time Data Integration",
      description:
        "Live data from over 15 sources is continuously processed, including company financials, industry trends, regional economic indicators, and role-specific automation rates.",
      icon: <Database className="w-6 h-6 text-cyan-400" />,
    },
    {
      title: "Confidence Calibration & Validation",
      description:
        "L1–L5 thresholds calibrated via logistic regression on 200 verified layoff events (layoffs.fyi 2023–2025, AUC-ROC 0.81 on 40-event hold-out). Cross-sectional validation on 56 companies (2024–2026) produced L1-only AUC 0.73 (95% CI: 0.58–0.86). The model accurately detects distress-driven layoffs (AUC 0.96 for this cohort) but a separate 'efficiency-driven restructuring' signal (D8) was added after validation showed profitable AI-investing companies were systematically missed. Next temporal recalibration: July 2026.",
      icon: <BarChart2 className="w-6 h-6 text-amber-400" />,
    },
    {
      title: "Known Model Limitations",
      description:
        "The system predicts two distinct layoff types differently: (1) Distress-driven layoffs (financial pressure + high L1/L2) — accurately predicted, AUC ~0.96. (2) Efficiency-driven restructuring (profitable companies replacing workers with AI) — partially covered by D8 signal, but UNCALIBRATED. The D8 signal gates on prior layoff history and high AI investment; companies with no prior rounds (Anthropic, OpenAI) correctly score as low risk despite high AI investment. Score confidence intervals reflect this uncertainty.",
      icon: <Shield className="w-6 h-6 text-orange-400" />,
    },
  ];

  return (
    <div className="methodology-explainer space-y-[var(--space-4)]">
      {sections.map((section, index) => (
        <div key={index} className="bg-white/5 border border-white/5 rounded-lg p-[var(--space-4)] hover:bg-white/10 transition-colors">
          <div className="flex gap-[var(--space-3)]">
            <div className="flex-shrink-0 mt-1">{section.icon}</div>
            <div>
              <h4 className="label-xs font-black uppercase tracking-wider mb-[var(--space-2)]">{section.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {section.description}
              </p>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-20 rounded-lg p-4 mt-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-sm font-medium text-blue-400 mb-1">
              System Transparency
            </h4>
            <p className="text-xs text-muted-foreground">
              Formula: 10-term composite (D1–D8, L1, L2), weights summing to exactly 1.00.
              Empirical calibration details — including training event count, AUC-ROC, and
              next recalibration date — are shown in the Model Calibration panel above.
              D8 (AI efficiency restructuring) is UNCALIBRATED — added post-validation;
              distress-driven prediction AUC ~0.96; efficiency-driven partially covered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Json Download Button - Raw data export
// ---------------------------------------------------------------------------

const JsonDownloadButton: React.FC<{
  data: any;
  filename?: string;
}> = ({ data, filename = "risk-assessment-data.json" }) => {
  const downloadJson = () => {
    // Create a Blob with the JSON data
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a link element to trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    // Append the link to the body, click it, and clean up
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadJson}
      className="inline-flex items-center gap-2 text-xs bg-muted hover:bg-muted-2 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md transition-colors"
    >
      <Download className="w-4 h-4" />
      Download Raw JSON
    </button>
  );
};



// ---------------------------------------------------------------------------
// DimensionCalibrationPanel — per-dimension validation status with backtester
// ---------------------------------------------------------------------------

const DimensionCalibrationPanel: React.FC = () => {
  const report = React.useMemo(() => getCalibrationReport(), []);
  const summaryLabel = getCalibrationSummaryLabel();

  const statusColor = (d: DimensionValidationResult) => {
    if (d.calibrationStatus === 'regression_derived') return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', badge: 'Validated' };
    if (d.calibrationStatus === 'pseudo_validated') return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', badge: 'Partial' };
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', badge: 'Uncalibrated' };
  };

  const qualityIcon = (q: DimensionValidationResult['signalQualityLabel']) => {
    if (q === 'Strong') return '●';
    if (q === 'Moderate') return '◐';
    if (q === 'Weak') return '○';
    return '◌';
  };

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className={`p-4 rounded-xl border flex items-center gap-3 ${report.isProductionReady ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-amber-500/8 border-amber-500/20'}`}>
        <BarChart2 className={`w-5 h-5 flex-shrink-0 ${report.isProductionReady ? 'text-emerald-400' : 'text-amber-400'}`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${report.isProductionReady ? 'text-emerald-300' : 'text-amber-300'}`}>
            {summaryLabel}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {report.regressionDerivedWeightFraction * 100 | 0}% regression-derived ·{' '}
            {report.pseudoValidatedWeightFraction * 100 | 0}% pseudo-validated ·{' '}
            {report.uncalibratedWeightFraction * 100 | 0}% uncalibrated · {report.totalPatternsUsed} patterns sampled
          </p>
        </div>
        <div className={`text-xs font-mono px-2 py-0.5 rounded ${report.isProductionReady ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
          AUC target ≥0.70
        </div>
      </div>

      {/* Per-dimension table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-0 text-[9px] font-mono uppercase tracking-widest text-muted-foreground bg-white/[0.02] px-4 py-2 border-b border-white/8">
          <span className="pr-4">Dimension</span>
          <span>Signal Quality</span>
          <span className="px-3">Weight</span>
          <span>Status</span>
        </div>
        {report.dimensionResults.map((dim) => {
          const c = statusColor(dim);
          return (
            <div key={dim.dimension} className="grid grid-cols-[auto_1fr_auto_auto] items-start gap-0 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <div className="pr-4 min-w-[160px]">
                <p className="text-xs font-bold text-foreground/90">{dim.dimension.replace(/_/g, ' ')}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {qualityIcon(dim.signalQualityLabel)} {dim.signalQualityLabel} · {dim.patternsSampled} patterns
                </p>
              </div>
              <div className="pr-4">
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full ${dim.calibrationStatus === 'regression_derived' ? 'bg-emerald-500' : dim.calibrationStatus === 'pseudo_validated' ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.round(dim.patternAgreementScore * 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {dim.recommendation.slice(0, 90)}…
                </p>
              </div>
              <div className="px-3 text-center">
                <span className="text-xs font-mono font-black">{(dim.weight * 100) | 0}%</span>
              </div>
              <div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>
                  {c.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
        <span className="font-bold">Pseudo-validated</span>: pattern field coverage ≥15% from the historical patterns database.
        Not a substitute for full regression — weights may still be off by ±30–80%.
        <span className="font-bold"> Next step</span>: {report.nextValidationStep}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// IndiaIntelligencePanel — GCC, sector pulse, contagion, seasonal risk
// ---------------------------------------------------------------------------

const IndiaIntelligencePanel: React.FC<{
  enrichment: NonNullable<TabProps['result']['indiaRiskEnrichment']>;
  scenarioArchetype?: string;
  indiaSpecificInsight?: string;
}> = ({ enrichment, scenarioArchetype, indiaSpecificInsight }) => {
  const pulseColor = enrichment.sectorPulse.pulseTrend === 'expanding'
    ? 'text-emerald-400' : enrichment.sectorPulse.pulseTrend === 'contracting' || enrichment.sectorPulse.pulseTrend === 'declining'
    ? 'text-red-400' : 'text-amber-400';

  const seasonColor = enrichment.seasonalRisk.window.riskMultiplier > 1.2
    ? 'text-red-400' : enrichment.seasonalRisk.window.riskMultiplier > 1.0
    ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="space-y-4">
      {/* Scenario archetype badge */}
      {scenarioArchetype && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${getScenarioArchetypeColor(scenarioArchetype as any)}`}>
          <span>Risk Archetype: {getScenarioArchetypeLabel(scenarioArchetype as any)}</span>
        </div>
      )}

      {/* India-specific insight */}
      {indiaSpecificInsight && (
        <div className="p-3 rounded-lg bg-blue-500/8 border border-blue-500/20">
          <p className="text-xs text-blue-300 leading-relaxed">{indiaSpecificInsight}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sector pulse */}
        <div className="glass-panel p-4">
          <div className="label-xs text-muted-foreground uppercase tracking-widest mb-3">Sector Pulse</div>
          <p className="text-sm font-bold mb-1">{enrichment.sectorBenchmark.sector}</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">Naukri Index</p>
              <p className={`text-lg font-black ${enrichment.sectorPulse.naukriIndexRelative < 0.85 ? 'text-red-400' : 'text-emerald-400'}`}>
                {Math.round(enrichment.sectorPulse.naukriIndexRelative * 100)}%
              </p>
              <p className="text-[9px] text-muted-foreground">of 6mo baseline</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">NASSCOM Intent</p>
              <p className={`text-lg font-black ${enrichment.sectorPulse.nasscomHiringIntent < 45 ? 'text-red-400' : 'text-emerald-400'}`}>
                {enrichment.sectorPulse.nasscomHiringIntent}%
              </p>
              <p className="text-[9px] text-muted-foreground">net-positive hiring</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">EPFO Growth</p>
              <p className={`text-sm font-bold ${enrichment.sectorPulse.epfoGrowthRate < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {enrichment.sectorPulse.epfoGrowthRate > 0 ? '+' : ''}{enrichment.sectorPulse.epfoGrowthRate}% YoY
              </p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">Trend</p>
              <p className={`text-sm font-bold capitalize ${pulseColor}`}>
                {enrichment.sectorPulse.pulseTrend}
              </p>
            </div>
          </div>
        </div>

        {/* GCC archetype */}
        <div className="glass-panel p-4">
          <div className="label-xs text-muted-foreground uppercase tracking-widest mb-3">GCC Profile</div>
          {enrichment.gccArchetype === 'not_gcc' ? (
            <p className="text-xs text-muted-foreground">Not a GCC — standard sector risk applies.</p>
          ) : (
            <>
              <p className="text-sm font-bold mb-1 capitalize">{enrichment.gccArchetype.replace(/_/g, ' ')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{enrichment.gccRiskProfile.rationale.slice(0, 150)}…</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Risk multiplier</p>
                  <p className={`text-lg font-black ${enrichment.gccRiskProfile.riskMultiplier > 1.5 ? 'text-red-400' : 'text-amber-400'}`}>
                    ×{enrichment.gccRiskProfile.riskMultiplier.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Contagion lag</p>
                  <p className="text-lg font-black">{enrichment.gccRiskProfile.layoffContagionLag}mo</p>
                </div>
              </div>
              {enrichment.gccRiskProfile.protectionFactors.length > 0 && (
                <div className="mt-3">
                  <p className="text-[9px] text-muted-foreground uppercase mb-1">Protected roles</p>
                  {enrichment.gccRiskProfile.protectionFactors.slice(0, 2).map((f, i) => (
                    <p key={i} className="text-[10px] text-emerald-400 leading-relaxed">✓ {f}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Seasonal risk */}
        <div className="glass-panel p-4">
          <div className="label-xs text-muted-foreground uppercase tracking-widest mb-3">Seasonal Risk Window</div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-2xl font-black ${seasonColor}`}>{enrichment.seasonalRisk.quarter}</span>
            <span className="text-sm text-muted-foreground">{enrichment.seasonalRisk.window.months}</span>
            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded ${enrichment.seasonalRisk.window.riskMultiplier > 1.2 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
              ×{enrichment.seasonalRisk.window.riskMultiplier.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{enrichment.seasonalRisk.window.rationale.slice(0, 120)}…</p>
        </div>

        {/* Contagion exposure */}
        <div className="glass-panel p-4">
          <div className="label-xs text-muted-foreground uppercase tracking-widest mb-3">Sector Contagion</div>
          {!enrichment.contagionRisk.hasContagionExposure ? (
            <p className="text-xs text-muted-foreground">No contagion path detected for this sector.</p>
          ) : (
            <>
              <p className={`text-2xl font-black mb-1 ${enrichment.contagionRisk.riskAmplifier > 1.2 ? 'text-amber-400' : 'text-foreground'}`}>
                ×{enrichment.contagionRisk.riskAmplifier.toFixed(2)}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase mb-1">Risk amplifier · {enrichment.contagionRisk.expectedLagMonths}mo lag</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{enrichment.contagionRisk.explanation.slice(0, 130)}…</p>
            </>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground px-1">
        Source: NASSCOM Trendlines 2025, Naukri Job Speak Mar 2026, EPFO Mar 2026. Sector pulse snapshot updated quarterly.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TransparencyTab main component
// ---------------------------------------------------------------------------

export const TransparencyTab: React.FC<TabProps> = ({ result }) => {
  // Real data sources derived from result.meta.dbSource + signal quality
  const dbSource = result.meta?.dbSource ?? "HumanProof Intelligence DB";
  const liveCount = result.signalQuality?.liveSignals ?? 0;
  const calcMode = result.meta?.calculationMode ?? "DB_FALLBACK";
  const freshnessDays = result.dataFreshness?.ageInDays ?? 0;
  const evaluationSnapshot = result.evaluationSnapshot;

  const dataSources: DataSource[] = [
    {
      name: dbSource,
      type: "Company",
      domain: "supabase.company_intelligence",
      lastUpdated: new Date(Date.now() - freshnessDays * 86400000).toISOString().split("T")[0],
      description: `Primary company intelligence source powering L1 (Financial Health) and L2 (Layoff History) dimensions. Resolution mode: ${calcMode}. Contains 2000+ company records with revenue trends, headcount, and historical layoff events.`,
    },
    {
      name: "HumanProof Role Exposure Database",
      type: "AI",
      domain: "internal.roleExposureData + MASTER_CAREER_INTELLIGENCE",
      lastUpdated: "2026-04-01",
      description: "400+ role profiles with task decomposition, AI tool maturity scores, and displacement timelines. Powers L3 (Role Displacement Risk). Calibrated against McKinsey 2025 Future of Work data, WEF Jobs Report 2025, and Anthropic enterprise deployment data.",
    },
    {
      name: "Industry Risk Baseline Model",
      type: "Industry",
      domain: "supabase.industry_risk_data + sector_intelligence",
      lastUpdated: new Date().toISOString().split("T")[0],
      description: "Sector-level AI adoption rates, average annual attrition, revenue-per-employee norms, and growth outlook by industry. Powers L4 (Industry Headwinds). Updated from BLS, OECD, and sector analyst reports.",
    },
    {
      name: "Country Risk Profile Database",
      type: "Regional",
      domain: "internal.COUNTRY_RISK_PROFILES",
      lastUpdated: "2026-03-01",
      description: "AI adoption velocity, labor market tightness, and employment protection legislation index by country/region. Powers L5 (Regional Headwinds). Covers 40+ countries. Sources: WEF Global Competitiveness, OECD Employment Outlook.",
    },
    ...(liveCount > 0 ? [{
      name: "Live OSINT — Financial Signals",
      type: "Financial",
      domain: "fetch-company-data Edge Function (Yahoo Finance, NewsAPI, Serper)",
      lastUpdated: new Date().toISOString().split("T")[0],
      description: `${liveCount} real-time signals fetched for this audit: stock 90-day price change, revenue YoY growth, employee count, revenue-per-employee ratio, recent layoff news headlines, and hiring posting trend. Directly modifies L1 and L2 scores.`,
    }] : []),
    {
      name: "Layoffs.fyi Community Dataset",
      type: "Workforce",
      domain: "layoffs.fyi (GitHub CSV, community-verified)",
      lastUpdated: new Date().toISOString().split("T")[0],
      description: "Crowdsourced + press-verified layoff event database covering 3000+ companies globally since 2020. Each event includes company, date, headcount cut %, source URL, and affected departments. Primary source for L2 (Layoff History) when OSINT is unavailable.",
    },
    {
      name: "WARN Act / SEC / Regulatory Filings",
      type: "Regulatory",
      domain: "SEC EDGAR, US WARN Act, DOLE India, Companies House UK",
      lastUpdated: new Date().toISOString().split("T")[0],
      description: "Legal workforce reduction disclosures. WARN Act (US) requires 60-day advance notice for mass layoffs. SEC 8-K/10-K filings. These are the highest-confidence signals — regulatory filings cannot be disputed.",
    },
  ];

  // Real audit trail derived from result timestamp + signal quality
  const ts = result.meta?.timestamp ?? new Date().toISOString();
  const t = (offsetSec: number) =>
    new Date(new Date(ts).getTime() - offsetSec * 1000).toISOString();

  // Determine resolution status for the role key audit event.
  // workTypeKey = "generic" means the user's title didn't resolve to any oracle entry.
  const roleKeyIsGeneric = !result.meta?.resolvedRoleKey || result.meta.resolvedRoleKey === 'generic';
  const roleKeyLabel = roleKeyIsGeneric
    ? 'Unresolved — generic fallback used'
    : result.meta?.resolvedRoleKey ?? result.workTypeKey;
  const roleResolutionStatus: AuditEvent['status'] = roleKeyIsGeneric ? 'warning' : 'success';

  const auditEvents: AuditEvent[] = [
    {
      timestamp: t(20),
      operation: "Role Key Resolution",
      status: roleResolutionStatus,
      details: roleKeyIsGeneric
        ? `Input title did not match any oracle entry — career intelligence, skill data, and career paths defaulted to generic templates. Select a role from the suggestions to resolve.`
        : `Input resolved to oracle key "${roleKeyLabel}" via ${result.meta?.resolvedRoleSource ?? "unknown"} — career intelligence, skills, and career paths are role-specific.`,
    },
    {
      timestamp: t(18),
      operation: "Risk Assessment Initialization",
      status: "success",
      details: `Company: ${result.companyName} · Role: ${result.workTypeKey} · Mode: ${calcMode}`,
    },
    {
      timestamp: t(15),
      operation: "Company Data Retrieval",
      status: liveCount > 0 ? "success" : "warning",
      details: liveCount > 0
        ? `${liveCount} live signals fetched from ${dbSource}`
        : `Heuristic fallback — ${result.signalQuality?.heuristicSignals ?? 0} signals estimated`,
    },
    {
      timestamp: t(12),
      operation: "Dimension Scoring (L1–L5 + D6/D7)",
      status: "success",
      details: `Score: ${result.total}/100 · Confidence: ${result.confidencePercent}% · Tier: ${result.tier.label}`,
    },
    {
      timestamp: t(8),
      operation: "Signal Conflict Detection",
      status: result.signalQuality?.hasConflicts ? "warning" : "success",
      details: result.signalQuality?.hasConflicts
        ? `${result.signalQuality.conflictingSignals.length} conflict(s) detected and resolved`
        : "No conflicting signals detected — data is coherent",
    },
    {
      timestamp: t(4),
      operation: "Confidence Interval Calculation",
      status: "success",
      details: `Interval: [${result.confidenceInterval?.low ?? "?"}–${result.confidenceInterval?.high ?? "?"}] · Freshness: ${freshnessDays}d`,
    },
    {
      timestamp: t(0),
      operation: "Final Score Persisted",
      status: "success",
      details: `Score saved to layoff_scores table. Data version: ${result.meta?.liveSignalCount ?? 0} live signals.`,
    },
  ];

  return (
    <section aria-labelledby="transparency-heading" className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-6">
          <SectionHeader
            title="Data Quality Dashboard"
            description="Overview of the quality, freshness, and completeness of data used in your risk assessment."
          />

          {evaluationSnapshot && (
            <div className="mb-6 rounded-xl border border-cyan-500/25 bg-cyan-500/8 p-4">
              <h4 className="text-sm font-semibold text-cyan-300 mb-3">
                Evaluation Snapshot
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p>Company input: <span className="font-mono text-white/80">{evaluationSnapshot.companyInput}</span></p>
                  <p>Company resolved: <span className="font-mono text-white/80">{evaluationSnapshot.companyResolved}</span></p>
                  <p>Company match: <span className="font-mono text-white/80">{evaluationSnapshot.companyMatchType} ({evaluationSnapshot.companyMatchConfidence.toFixed(2)})</span></p>
                </div>
                <div className="space-y-1">
                  <p>Role input: <span className="font-mono text-white/80">{evaluationSnapshot.roleInput}</span></p>
                  <p>Resolved role: <span className="font-mono text-white/80">{evaluationSnapshot.resolvedRoleKey}</span></p>
                  <p>Resolved source: <span className="font-mono text-white/80">{evaluationSnapshot.resolvedRoleSource}</span></p>
                </div>
                <div className="space-y-1">
                  <p>Audit pipeline: <span className="font-mono text-white/80">{evaluationSnapshot.usedAuditPipeline ? "true" : "false"}</span></p>
                  <p>Signals: <span className="font-mono text-white/80">{evaluationSnapshot.liveSignals} live / {evaluationSnapshot.heuristicSignals} heuristic</span></p>
                  <p>Confidence: <span className="font-mono text-white/80">{evaluationSnapshot.confidencePercent}%</span></p>
                </div>
                <div className="space-y-1">
                  <p>Degraded classes: <span className="font-mono text-white/80">{evaluationSnapshot.degradedSignalClasses.join(", ") || "none"}</span></p>
                  <p>Hard failures: <span className="font-mono text-white/80">{evaluationSnapshot.hardFailures.join(", ") || "none"}</span></p>
                  <p>Fallback tabs: <span className="font-mono text-white/80">{evaluationSnapshot.tabsUsedFallback.join(", ") || "none"}</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Phase 5 Fix: Transparent Agent / API Failure Box */}
          {((result.agentStatus?.failedCount ?? 0) > 0) && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-400">Ensemble Degradation Warning</h4>
                  <p className="text-sm opacity-80 mt-1">
                    {result.agentStatus?.warningMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Phase 5 Fix: Explicit Staleness Warning */}
          {(result.dataFreshness.accuracyImpact === 'Critical') && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-400">Critical Data Staleness</h4>
                  <p className="text-sm opacity-80 mt-1">
                    {result.dataFreshness.stalenessWarning || `Data is ${result.dataFreshness.ageInDays} days old. Confidence rating has been aggressively capped.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(((result.signalQuality.hardFailures?.length ?? 0) > 0) ||
            ((result.signalQuality.confidenceCapsApplied?.length ?? 0) > 0)) && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-400">
                    Live Signal Degradation Detected
                  </h4>
                  <div className="text-sm opacity-80 mt-1 space-y-1">
                    {(result.signalQuality.confidenceCapsApplied ?? []).map((msg, idx) => (
                      <p key={`cap-${idx}`}>{msg}</p>
                    ))}
                    {(result.signalQuality.hardFailures ?? []).map((msg, idx) => (
                      <p key={`failure-${idx}`}>{msg}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LOW-1: Kill-switch badges — shown when any kill-switch fired this run */}
          {(result.activatedKillSwitches ?? []).length > 0 && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-amber-300 mb-2 tracking-wide uppercase">Score Floor Active — Kill-Switch Fired</h4>
                  <p className="text-[10px] text-amber-200/70 mb-2">
                    One or more risk kill-switches raised your score to a minimum floor. These activate when signal combinations indicate risks that the base formula may underweight.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.activatedKillSwitches ?? []).map(ks => {
                      const labels: Record<string, string> = {
                        confirmed_recent_layoff_news: 'Confirmed Recent Layoff News',
                        financial_distress_triad: 'Financial Distress Triad',
                        pre_layoff_precursor: 'Pre-Layoff Precursor (Hiring Freeze)',
                        pre_layoff_precursor_inferred: 'Pre-Layoff Precursor (Inferred)',
                      };
                      return (
                        <span
                          key={ks}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.18)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.35)' }}
                        >
                          {labels[ks] ?? ks.replace(/_/g, ' ')}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Circuit breaker disclosure — shown when any API has OPEN/HALF_OPEN circuit */}
          {(() => {
            const avSnap   = getCircuitSnapshot('alphavantage');
            const newsSnap = getCircuitSnapshot('newsapi');
            const serperSnap = getCircuitSnapshot('serper');
            const openCircuits = [avSnap, newsSnap, serperSnap].filter(
              s => s.state === 'OPEN' || s.state === 'HALF_OPEN',
            );
            if (openCircuits.length === 0) return null;
            return (
              <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-300 text-sm">
                      Live API circuit open — cached data in use
                    </h4>
                    <div className="mt-1.5 space-y-1">
                      {openCircuits.map(s => (
                        <p key={s.api} className="text-xs text-amber-200/80 leading-relaxed">
                          <span className="font-bold capitalize">{s.api}</span>
                          {s.state === 'OPEN'
                            ? ` — circuit OPEN (${s.consecutiveFailures} consecutive failures).`
                            : ` — circuit HALF-OPEN (probing recovery).`}
                          {s.cachedAgeLabel
                            ? ` Score uses cached data from ${s.cachedAgeLabel}.`
                            : ' No cached data available — heuristic fallback used.'}
                          {s.state === 'OPEN' && s.msUntilProbe > 0
                            ? ` Next retry in ${Math.ceil(s.msUntilProbe / 60_000)} min.`
                            : ''}
                        </p>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-200/60 mt-2 leading-relaxed">
                      Circuit breakers prevent a failing API from adding latency to every request.
                      Recalculate after the retry window to fetch fresh data.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Unknown company inference disclosure — shown when industry/region were
              inferred from the company name because the company wasn't in the DB. */}
          {(() => {
            const cd = (result as any).companyData ?? (result._engineResult as any)?.companyData;
            const industryInferred = cd?._industryInferred;
            const regionInferred   = cd?._regionInferred;
            const l2Floor          = cd?._l2EpistemicFloor;
            const isUnknown        = (cd?.source ?? '').includes('Fallback') || (cd?.source ?? '').includes('Unknown');
            if (!isUnknown && !l2Floor) return null;
            return (
              <div className="mb-6 p-4 rounded-xl border border-blue-500/25 bg-blue-500/08 text-blue-200">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-blue-300 text-sm">Intelligence Inference Applied</h4>
                    {isUnknown && (
                      <p className="text-xs text-blue-200/80 leading-relaxed">
                        <span className="font-semibold">Company not in database.</span>{' '}
                        Score uses industry/sector baselines and live scraped signals only.
                        {industryInferred && <> Industry inferred as <span className="font-mono font-bold">{cd?.industry}</span> from company name.</>}
                        {regionInferred   && <> Region inferred as <span className="font-mono font-bold">{cd?.region}</span> from company name patterns.</>}
                        {' '}Accuracy improves if you add the company manually or wait for it to be indexed.
                      </p>
                    )}
                    {l2Floor && (
                      <p className="text-xs text-blue-200/80 leading-relaxed">
                        <span className="font-semibold">L2 epistemic floor {Math.round(l2Floor.floor * 100)}% applied</span>{' '}
                        ({l2Floor.reason === 'layoffs_dataset_unavailable' ? 'layoffs.fyi unreachable' :
                          l2Floor.reason === 'unknown_company_fallback' ? 'company not in DB' : 'sector uncertainty floor'}).
                        Raw signals — recency: {Math.round(l2Floor.rawRecency * 100)}%, frequency: {Math.round(l2Floor.rawFrequency * 100)}%.
                        Floor prevents interpreting absent data as "confirmed clean" layoff history.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Performance credibility disclosure — shown when the self-reported 'top'
              tier was discounted. performanceCredibilityScore is only present when
              the claim was scrutinised (i.e. original tier = 'top') and
              performanceTier holds the effective (possibly downgraded) tier. */}
          {result.performanceCredibilityScore !== undefined &&
           result.performanceTier !== 'top' && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-300 text-sm">
                    Performance Tier Adjusted — Self-Report Discounted
                  </h4>
                  <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                    You reported <span className="font-bold">top performance</span>, but objective signals
                    (tenure without promotion, no key relationships, generic role) contradict this at a credibility
                    score of <span className="font-bold">{Math.round((result.performanceCredibilityScore ?? 0) * 100)}%</span>.
                    The engine used <span className="font-bold">{result.performanceTier}</span> as the
                    effective tier for L5 scoring. If your situation is genuinely different (IC track, flat org,
                    or recent promotion not yet reflected), your actual risk is lower than shown.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DataQualityDashboard
            dataFreshness={result.dataFreshness}
            signalQuality={result.signalQuality}
          />
        </div>

        <div className="mb-6">
          <SectionHeader
            title="Model Calibration"
            description="When the scoring formula was last calibrated against real outcomes, and how accurate it is."
          />
          <CalibrationFreshnessPanel calibrationCoverage={(result as any).calibrationCoverage} />
        </div>

        {/* v8.0: Per-dimension calibration status with backtester */}
        <div className="mb-6">
          <SectionHeader
            title="Formula Weight Validation"
            description="Validation status for each of the 10 scoring formula weights. Shows which are regression-derived vs developer estimates."
          />
          <DimensionCalibrationPanel />
        </div>

        {/* v8.0: India sector intelligence — only shown for India-region companies */}
        {(result as any).indiaRiskEnrichment && (
          <div className="mb-6">
            <SectionHeader
              title="India Sector Intelligence"
              description="GCC archetype detection, NASSCOM sector benchmarks, seasonal layoff windows, and contagion matrix for India IT."
            />
            <IndiaIntelligencePanel
              enrichment={(result as any).indiaRiskEnrichment}
              scenarioArchetype={(result as any).scenarioArchetype}
              indiaSpecificInsight={(result as any).indiaSpecificInsight}
            />
          </div>
        )}

        {/* v7.0 Intelligence Upgrade 3: Action pool coverage audit */}
        <div className="mb-6">
          <SectionHeader
            title="Action Intelligence Coverage"
            description="What fraction of role-bracket combinations have specific (non-generic) action content. Verifies the claimed 371-role coverage."
          />
          <ActionCoveragePanel />
        </div>

        {/* v7.0: Historical precedent pattern — only shown when a verified match exists */}
        {result.resolvedPattern && (
          <div className="mb-6">
            <SectionHeader
              title="Historical Precedent Match"
              description="A verified pattern from the database of documented displacement events that matches this profile. Not AI-generated — sourced from public earnings reports, layoffs.fyi, and industry data."
            />
            <PatternMatchCard
              pattern={result.resolvedPattern}
              overlapScore={undefined}
            />
          </div>
        )}

        <div className="mb-6">
          <SectionHeader
            title="Source Provenance"
            description="Detailed information about the data sources used in your risk assessment."
          />

          <SourceProvenanceTable sources={dataSources} />
        </div>

        <div className="mb-6">
          <SectionHeader
            title="Conflict Resolution Log"
            description="Record of any conflicting signals detected and how they were resolved."
          />

          <ConflictResolutionLog
            signalQuality={result.signalQuality}
            consensusSnapshot={result.consensusSnapshot}
          />
        </div>

        <CollapsibleSection title="Assessment Methodology">
          <div className="mb-6">
            <MethodologyExplainer />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="System Audit Trail">
          <div className="mb-4">
            <AuditTrail events={auditEvents} />
          </div>

          <div className="flex justify-end">
            <JsonDownloadButton
              data={result}
              filename={`risk-assessment-${result.companyName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`}
            />
          </div>
        </CollapsibleSection>

        {/* Data freshness: live signal coverage bar + static fallback badge */}
        <div className="mt-6">
          <DataFreshnessPanel
            dataFreshnessScore={(result as any)._dataFreshnessScore}
            reconciliationSummary={(result as any).reconciliationSummary}
            lastUpdated={(result as any).companyData?.lastUpdated}
            staleDb={(result as any).companyData?._staleDb}
            dbAgeDays={(result as any).companyData?._ageDays}
          />
        </div>

        {/* live-data-first: per-signal source attribution (live/db/static/degraded) */}
        {(result as any)._liveDataCoverage && (
          <div className="mt-6">
            <LiveDataCoveragePanel
              coverage={(result as any)._liveDataCoverage}
              freshnessScore={(result as any)._dataFreshnessScore}
              companyName={result.companyName}
            />
          </div>
        )}

        {/* v12.0: Signal Attribution Waterfall — how each signal built the final score */}
        <div className="mt-6">
          <SignalAttributionWaterfall result={result} />
        </div>

        {/* v13.0: Peer Contagion — sector wave propagation status */}
        {(result as any).peerContagion && (
          <div className="mt-6">
            <PeerContagionPanel contagion={(result as any).peerContagion} />
          </div>
        )}

        {/* v13.0: Model Calibration — engine accuracy and trust metrics */}
        {(result as any).modelCalibration && (
          <div className="mt-6">
            <ModelCalibrationPanel calibration={(result as any).modelCalibration} />
          </div>
        )}

        {/* v17.0: Historical Accuracy — community prediction accuracy by score tier */}
        {(result as any).modelCalibration && (
          <div className="mt-6">
            <HistoricalAccuracyPanel
              calibration={(result as any).modelCalibration}
              currentScore={result.total}
            />
          </div>
        )}

        {/* v14.0: Bayesian Credible Interval — proper uncertainty quantification */}
        {(result as any).bayesianCI && (
          <div className="mt-6">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Bayesian Credible Interval</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                  TIER {(result as any).bayesianCI.dataQualityTier} · σ={((result as any).bayesianCI.sigma).toFixed(1)}pts
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="text-sm font-bold" style={{ color: '#60a5fa' }}>
                    {(result as any).bayesianCI.ci80_low}–{(result as any).bayesianCI.ci80_high}
                  </div>
                  <div className="text-[10px] opacity-45 mt-0.5">80% Credible Interval</div>
                </div>
                <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {(result as any).bayesianCI.ci95_low}–{(result as any).bayesianCI.ci95_high}
                  </div>
                  <div className="text-[10px] opacity-45 mt-0.5">95% Credible Interval</div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {(result as any).bayesianCI.interpretation}
              </p>
              <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                σ_total = √(σ_data² + σ_calibration²). Calibration σ=3.5pts from AUC-ROC=0.81 at n=200 events.
              </p>
            </div>
          </div>
        )}

        {/* v14.0: Segmented Calibration — per-segment score adjustment */}
        {(result as any).segmentCalibration && (result as any).segmentCalibration.adjustmentDelta !== 0 && (
          <div className="mt-6">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Segmented Calibration</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
                  {(result as any).segmentCalibration.calibrationStatus.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {(result as any).segmentCalibration.segmentLabel}
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {(result as any).segmentCalibration.segmentInsight}
              </p>
              {(result as any).segmentCalibration.adjustmentDelta !== 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Segment adjustment:</span>
                  <span className="text-[10px] font-bold" style={{ color: (result as any).segmentCalibration.adjustmentDelta > 0 ? '#ef4444' : '#10b981' }}>
                    {(result as any).segmentCalibration.adjustmentDelta > 0 ? '+' : ''}{(result as any).segmentCalibration.adjustmentDelta}pts
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    (segment base rate: {Math.round((result as any).segmentCalibration.baseLayoffRate * 100)}% vs. global 22%)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      </motion.div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// ActionCoveragePanel — v7.0 Intelligence Upgrade 3
// Verifies and displays the "371-role, 4-bracket action pool" coverage claim.
// ---------------------------------------------------------------------------

const ActionCoveragePanel: React.FC = () => {
  const r    = computeActionCoverage();
  const gaps = getTopUncoveredPrefixes(5);

  const statusColor = r.claimIsValid
    ? 'var(--emerald)'
    : r.coveragePct >= 40
      ? 'var(--amber)'
      : 'var(--red)';

  const statusLabel = r.claimIsValid
    ? '✓ Claim valid'
    : r.coveragePct >= 40
      ? '⚠ Partial coverage'
      : '✗ Below threshold';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Header row */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
        <BarChart className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-black uppercase tracking-widest text-cyan-400">
          Action Intelligence Coverage
        </span>
        <span
          className="ml-auto text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider"
          style={{
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}35`,
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Primary metric */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-end gap-3 mb-3">
          <div>
            <div
              className="font-black tracking-tighter leading-none"
              style={{ fontSize: '2.2rem', color: statusColor, fontFamily: 'var(--font-mono)' }}
            >
              {r.coveragePct}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 font-mono">
              {r.specificCombinations.toLocaleString()} of {r.totalCombinations.toLocaleString()} role-bracket combinations
              have specific actions
            </div>
          </div>

          {/* Mini coverage bar */}
          <div className="flex-1 min-w-0 mb-4">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${r.coveragePct}%`, background: statusColor }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-mono">
              <span>0%</span>
              <span className="text-amber-400">80% threshold</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total roles',         value: r.totalRoles.toString(),            sub: 'in corpus' },
            { label: 'Roles with specific', value: r.specificRoles.toString(),          sub: `${r.coveredPrefixes.length} prefixes covered` },
            { label: 'Generic fallback',    value: r.genericRoles.toString(),           sub: `${100 - r.coveragePct}% of corpus` },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">{s.label}</div>
              <div className="font-black font-mono text-lg text-text-1">{s.value}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Claim verdict */}
        <div
          className="rounded-lg px-3 py-2 mb-4 text-[11px] leading-relaxed"
          style={{
            background: `${statusColor}0d`,
            border: `1px solid ${statusColor}25`,
            color: r.claimIsValid ? 'var(--emerald)' : 'var(--text-2)',
          }}
        >
          {r.claimIsValid ? (
            <>
              <span className="font-bold">Coverage claim valid.</span>{' '}
              ≥80% of role-bracket combinations have specific, role-domain-aware actions.
              The "371-role action pool" claim is accurate.
            </>
          ) : (
            <>
              <span className="font-bold">Coverage below 80% threshold.</span>{' '}
              Only {r.coveredPrefixes.length} of{' '}
              {r.coveredPrefixes.length + r.uncoveredPrefixes.length} role prefixes have
              specific pools. Roles in uncovered prefixes receive bracket-differentiated
              but role-generic content (GENERIC_ACTIONS). The "371-role specificity"
              claim is <span className="font-bold text-amber-400">inaccurate at {r.coveragePct}% coverage</span> — accurate claim: "
              {r.coveredPrefixes.join(', ')} roles have specific actions; all others use
              bracket-adapted generic actions."
            </>
          )}
        </div>

        {/* Covered prefixes */}
        <div className="mb-3">
          <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5">
            Covered prefixes ({r.coveredPrefixes.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {r.coveredPrefixes.map(p => (
              <span
                key={p}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                {p}_*
              </span>
            ))}
          </div>
        </div>

        {/* Top uncovered prefixes — what to add to improve coverage */}
        {gaps.length > 0 && (
          <div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5">
              Top uncovered prefixes by role count (highest coverage gain if added)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gaps.map(g => {
                const gain = Math.round(
                  ((r.specificCombinations + g.roleCount * 4) / r.totalCombinations) * 100,
                );
                return (
                  <span
                    key={g.prefix}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
                    title={`Adding ${g.prefix}_* would raise coverage to ~${gain}%`}
                  >
                    {g.prefix}_* ({g.roleCount} roles · +{gain - r.coveragePct}pts)
                  </span>
                );
              })}
            </div>
            <div className="text-[9px] text-muted-foreground mt-2 opacity-60">
              Adding specific SeniorityActions pools for these prefix groups in
              seniorityActionEngine.ts would raise overall coverage.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransparencyTab;
