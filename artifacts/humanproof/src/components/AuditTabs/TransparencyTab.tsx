// TransparencyTab.tsx
// Data provenance and system transparency — Answers "How was this calculated?"
// Displays: Data quality dashboard, source provenance, methodology explainers.

import React, { useState, useEffect } from "react";
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
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Building,
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
import {
  getLiveCalibrationStatus,
  getLiveCalibrationStatusSync,
  type LiveCalibrationStatus,
  getFormulaHoldoutValidation,
  getFormulaHoldoutValidationSync,
  type FormulaHoldoutValidation,
} from "../../services/empiricalCalibration";
import {
  getStealthPrecisionStats,
  getStealthPrecisionStatsSync,
  type StealthPrecisionStats,
  type StealthSubSignal,
} from "../../services/stealthLayoffDetector";
import {
  getD8ValidationStatus,
  getD8ValidationStatusSync,
  type D8ValidationStatus,
  D8_VALIDATION_GATE,
} from "../../services/d8ValidationService";
// v17.0
import HistoricalAccuracyPanel from "./common/HistoricalAccuracyPanel";
// live-data-first
import { DataFreshnessPanel } from "../audit/DataFreshnessPanel";
import { LiveDataCoveragePanel } from "../audit/LiveDataCoveragePanel";
import { CALIBRATION_META, LAYER_CALIBRATION } from "../../services/empiricalCalibration";
import type { SegmentCalibrationResult } from "../../services/segmentedCalibrationEngine";
import type { ParentPropagationResult } from "../../services/parentSubsidiaryPropagation";
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
import {
  SOURCE_LABELS,
  AGREEMENT_CONFLICT_THRESHOLD,
  type HeadcountSourceKey,
} from "../../services/headcountConsensus";
import {
  getProvenanceSummary,
  getProvenanceSummarySync,
  provenanceLabel,
  provenanceColor,
  type ProvenanceSummary,
} from "../../services/calibration/calibrationProvenance";
import type { ConformalBundle, ConformalInterval } from "../../services/conformalCI";

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

const CalibrationFreshnessPanel: React.FC<{
  calibrationCoverage?: number;
  holdoutValidation?: FormulaHoldoutValidation;
}> = ({ calibrationCoverage, holdoutValidation }) => {
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
  const fmtDateStr = (s: string) =>
    fmtDate(new Date(s.includes('T') ? s : s + 'T00:00:00Z'));

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

        {/* GAP-A01: Formula accuracy disclosure — live holdout AUC from v_formula_heldout_validation */}
        {holdoutValidation && (
          <div className="border-t border-white/8">
            {/* Recalibration alert — only when live AUC computed AND below threshold */}
            {holdoutValidation.recalibrationNeeded && (
              <div className="px-4 py-3 bg-red-500/8 border-b border-red-500/20 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 leading-relaxed">
                  <span className="font-bold">Hold-out AUC {holdoutValidation.effectiveAuc.toFixed(2)} is below the 0.78 recalibration threshold.</span>{' '}
                  Formula weights require re-regression against updated outcome data.
                  Until recalibration runs, treat risk scores as provisional estimates with wider uncertainty.
                </p>
              </div>
            )}

            {/* Formula accuracy row */}
            <div className="px-4 py-3 bg-white/[0.015]">
              <div className="flex items-center gap-2 mb-2">
                <BarChart className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/80">
                  Formula Accuracy
                </span>
                {holdoutValidation.isLiveComputed ? (
                  <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                    Live · {holdoutValidation.holdoutN} events
                  </span>
                ) : (
                  <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-500/15 text-slate-400 border border-slate-500/20">
                    Bootstrap fallback
                  </span>
                )}
              </div>

              <p className={`text-[11px] leading-relaxed ${
                holdoutValidation.effectiveAuc >= 0.80
                  ? 'text-emerald-400'
                  : holdoutValidation.effectiveAuc >= 0.78
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}>
                Formula accuracy: AUC{' '}
                <span className="font-black text-sm">
                  {holdoutValidation.effectiveAuc.toFixed(2)}
                </span>{' '}
                on{' '}
                <span className="font-semibold">
                  {holdoutValidation.effectiveN.toLocaleString()}-event
                </span>{' '}
                held-out validation set
                {holdoutValidation.effectivePeriodStart && holdoutValidation.effectivePeriodEnd && (
                  <span className="text-muted-foreground font-normal">
                    {' '}(events from{' '}
                    {fmtDateStr(holdoutValidation.effectivePeriodStart)}{' '}
                    to{' '}
                    {fmtDateStr(holdoutValidation.effectivePeriodEnd)})
                  </span>
                )}
              </p>

              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                {holdoutValidation.isLiveComputed
                  ? `Live-computed from ${holdoutValidation.holdoutN} outcome reports (${holdoutValidation.holdoutAuc?.toFixed(2) ?? '—'} raw). ` +
                    `Training set: ${holdoutValidation.trainingN.toLocaleString()} events before ${holdoutValidation.partitionBoundary}.`
                  : `Bootstrap anchor (${holdoutValidation.bootstrapN} held-out events from Jan 2026 calibration). ` +
                    `Live AUC will appear here once ≥ 5 positive and ≥ 5 negative outcomes are collected after ${holdoutValidation.partitionBoundary}.`}
              </p>
            </div>
          </div>
        )}
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

// ---------------------------------------------------------------------------
// EffectiveWeightsPanel — composed formula × global calibration × segment
// ---------------------------------------------------------------------------
// Principle 1 compliance: the formula weights (e.g. L1=30%) are NOT what
// drives the final score after calibration composition. This panel shows the
// three-component product so users can see the actual effective contribution
// of each layer for their specific segment.
//
// Effective contribution of Lₙ:
//   formula_weight × LAYER_CALIBRATION.Lₙ × segment_multiplier.Lₙ
//
// Normalized effective share = effective_Lₙ / Σ effective_Lₖ
// These are disclosed as percentages so users understand why their India BPO
// score behaves differently from a US Tech score given the same raw signals.
//
// Country context (D5_countryContext) is NOT a formula row in this table.
// It enters the composite score via two factored channels and contributes 0
// as a standalone dimension:
//   (1) D1 channel (w=0.18): computeD1CountryMultiplier() applies country-
//       specific enterprise AI deployment rates to the Role Exposure score.
//       Germany QA = 0.844×, USA = 0.906×, Singapore = 0.940×.
//   (2) L1 channel (w=0.16): getPPPMultiplier() adjusts financial distress
//       thresholds for purchasing-power differences across currencies.
// See COMPOSITE_FORMULA_WEIGHTS architecture note in layoffScoreEngine.ts.

const HYBRID_FORMULA_WEIGHTS_DISPLAY = {
  L1: 0.30,
  L2: 0.25,
  L3: 0.20,
  L5: 0.13,
} as const;

const LAYER_DISPLAY_NAMES: Record<string, string> = {
  L1: 'Company Health',
  L2: 'Layoff History',
  L3: 'Role Exposure',
  L5: 'Personal Factors',
};

const EffectiveWeightsPanel: React.FC<{
  segmentCalibration?: SegmentCalibrationResult;
  /** BUG-02: D8 effective weight state from calculateLayoffScore. */
  d8FlagActive?: boolean;
  d8HeuristicActive?: boolean;
  d8EffectiveWeight?: number;
  /** True when D8 flag off + D8=0: its 0.09 was redistributed ⅓ each to D1/D2/D3. */
  d8WeightRedistributed?: boolean;
  /** Per-dimension bump added to D1, D2, D3 during redistribution (≈ 0.030). */
  d8RedistributedBumpPerDimension?: number;
  /** L1 sector-baseline flag: true when revenue + stock absent; L1 ESTIMATED from sector. */
  l1EstimatedFromSector?: boolean;
  l1SectorBaseline?: number;
}> = ({ segmentCalibration: seg, d8FlagActive, d8HeuristicActive, d8EffectiveWeight, d8WeightRedistributed, d8RedistributedBumpPerDimension, l1EstimatedFromSector, l1SectorBaseline }) => {
  type LayerKey = 'L1' | 'L2' | 'L3' | 'L5';
  const layers: LayerKey[] = ['L1', 'L2', 'L3', 'L5'];

  const segMultiplierKey: Record<LayerKey, keyof SegmentCalibrationResult> = {
    L1: 'l1Multiplier',
    L2: 'l2Multiplier',
    L3: 'l3Multiplier',
    L5: 'l5Multiplier',
  };

  const rows = layers.map((l) => {
    const fw   = HYBRID_FORMULA_WEIGHTS_DISPLAY[l];
    const gc   = LAYER_CALIBRATION[l];
    const sm   = seg ? (seg[segMultiplierKey[l]] as number) ?? 1.0 : 1.0;
    const eff  = fw * gc * sm;
    return { layer: l, name: LAYER_DISPLAY_NAMES[l], fw, gc, sm, eff };
  });

  // BUG-02 — D8 row: formula weight is always 0.09, but effective contribution
  // depends on flag state. d8EffectiveWeight=0 means the 0.09 slot is occupied
  // but contributing nothing this run. d8IsActive covers both the validated
  // logistic path (flag on) and the EFFICIENCY-cohort heuristic fallback.
  const d8IsActive    = d8FlagActive || d8HeuristicActive;
  const d8FormulaWt   = 0.09; // COMPOSITE_FORMULA_WEIGHTS.D8_aiEfficiencyRestructuring
  const d8EffWt       = d8IsActive ? (d8EffectiveWeight ?? d8FormulaWt) : 0;
  const D8_CAL        = 1.00; // D8 is used as its logistic output directly — no separate cal multiplier

  const totalEff  = rows.reduce((s, r) => s + r.eff, 0) + d8EffWt * D8_CAL;
  const hasSegAdj = seg != null && rows.some((r) => Math.abs(r.sm - 1.0) > 0.01);

  const pct  = (v: number) => `${Math.round(v * 100)}%`;
  const mult = (v: number) => v === 1.0 ? '×1.00' : `×${v.toFixed(2)}`;
  const share = (eff: number) => totalEff > 0 ? `${Math.round((eff / totalEff) * 100)}%` : '0%';

  return (
    <div className="glass-panel overflow-hidden">
      {hasSegAdj && (
        <div className="px-4 py-2 text-[10px] bg-amber-500/10 border-b border-amber-500/20 text-amber-400/80 leading-relaxed">
          <span className="font-bold uppercase tracking-widest mr-1">Segment active:</span>
          {seg!.segmentLabel} — calibration multipliers shift the effective layer contributions below.
        </div>
      )}
      {/* L1 ESTIMATED banner: shown when both revenue + stock signals absent; sector baseline used. */}
      {l1EstimatedFromSector && (
        <div className="px-4 py-2 text-[10px] bg-amber-500/10 border-b border-amber-500/20 text-amber-400/80 leading-relaxed">
          <span className="font-bold uppercase tracking-widest mr-1">L1 ESTIMATED (sector baseline):</span>
          Revenue and stock signals are absent for this company. L1 (direct financial health, 16% weight)
          uses the industry sector baseline{l1SectorBaseline != null ? ` (${Math.round(l1SectorBaseline * 100)}%)` : ''} rather than
          company-specific financials. Score may be ±8 pts from true value.
        </div>
      )}
      {/* BUG-02 — D8 redistributed banner: shown when D8 is flag-gated off and its
          0.09 weight has been redistributed ⅓ each to D1/D2/D3. */}
      {d8WeightRedistributed && (
        <div className="px-4 py-2 text-[10px] bg-slate-500/10 border-b border-slate-500/20 text-slate-400/80 leading-relaxed">
          <span className="font-bold uppercase tracking-widest mr-1">D8 flag-gated — weight redistributed:</span>
          D8 (AI efficiency restructuring, 9%) is currently flag-gated. Its 0.09 weight is
          redistributed equally to D1/D2/D3
          {d8RedistributedBumpPerDimension != null
            ? ` (+${Math.round(d8RedistributedBumpPerDimension * 100)}% each)`
            : ''
          }, preserving the 1.00 formula sum. The Hyperscaler D8 Proxy (+12 pts) is applied
          separately when conditions are met and is labeled{' '}
          <span className="font-semibold text-amber-400/80">ESTIMATED</span>.
        </div>
      )}
      {/* Fallback banner when D8 inactive but redistribution prop not yet wired (legacy). */}
      {!d8IsActive && !d8WeightRedistributed && (
        <div className="px-4 py-2 text-[10px] bg-slate-500/10 border-b border-slate-500/20 text-slate-400/80 leading-relaxed">
          <span className="font-bold uppercase tracking-widest mr-1">D8 weight slot inactive (9%):</span>
          The AI efficiency restructuring dimension (0.09 formula weight) contributes 0 this audit.
          The hyperscaler proxy (+12 pts) compensates only for named hyperscalers with very-high AI investment.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="text-left py-2.5 px-4 label-xs text-muted-foreground opacity-50 uppercase">Layer</th>
              <th className="text-right py-2.5 px-4 label-xs text-muted-foreground opacity-50 uppercase">Formula&nbsp;Wt</th>
              <th className="text-right py-2.5 px-4 label-xs text-muted-foreground opacity-50 uppercase">Global Cal</th>
              {hasSegAdj && (
                <th className="text-right py-2.5 px-4 label-xs text-amber-400/60 opacity-80 uppercase">Seg Mult</th>
              )}
              <th className="text-right py-2.5 px-4 label-xs text-cyan-400/70 opacity-80 uppercase">Eff&nbsp;Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(({ layer, name, fw, gc, sm, eff }) => {
              const effShare    = eff / totalEff;
              const driftFromFw = Math.abs(effShare - fw) > 0.03;
              const isL1Estimated = layer === 'L1' && l1EstimatedFromSector;
              return (
                <tr key={layer} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground opacity-60 w-6">{layer}</span>
                      <span className="font-medium">{name}</span>
                      {isL1Estimated && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                          ESTIMATED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono opacity-60">{pct(fw)}</td>
                  <td className="py-2.5 px-4 text-right font-mono" style={{
                    color: gc > 1.05 ? 'var(--amber)' : gc < 0.95 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.55)'
                  }}>
                    {mult(gc)}
                  </td>
                  {hasSegAdj && (
                    <td className="py-2.5 px-4 text-right font-mono" style={{
                      color: sm > 1.1 ? 'var(--amber)' : sm < 0.9 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.55)'
                    }}>
                      {mult(sm)}
                    </td>
                  )}
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-white/5 rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${effShare * 100}%`,
                            background: driftFromFw ? 'var(--amber)' : 'var(--cyan)',
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold w-8 text-right" style={{
                        color: driftFromFw ? 'var(--amber)' : 'var(--cyan)'
                      }}>
                        {share(eff)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* BUG-02 — D8 row: always shown, state-aware. */}
            {(() => {
              const d8Eff      = d8EffWt * D8_CAL;
              const d8EffShare = totalEff > 0 ? d8Eff / totalEff : 0;
              const d8Label    = d8FlagActive
                ? 'AI Efficiency (logistic)'
                : d8HeuristicActive
                ? 'AI Efficiency (heuristic)'
                : d8WeightRedistributed
                ? 'AI Efficiency (redistributed)'
                : 'AI Efficiency (inactive)';
              return (
                <tr className={`hover:bg-white/5 transition-colors ${!d8IsActive ? 'opacity-40' : ''}`}>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground opacity-60 w-6">D8</span>
                      <span className="font-medium">{d8Label}</span>
                      {d8WeightRedistributed && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                          style={{ background: 'rgba(100,116,139,0.2)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.3)' }}>
                          →D1/D2/D3
                        </span>
                      )}
                      {!d8IsActive && !d8WeightRedistributed && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                          style={{ background: 'rgba(100,116,139,0.2)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.3)' }}>
                          LOCKED
                        </span>
                      )}
                      {d8IsActive && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                          {d8FlagActive ? 'LOGISTIC' : 'HEURISTIC'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono opacity-60">{d8WeightRedistributed ? '0%' : pct(d8FormulaWt)}</td>
                  <td className="py-2.5 px-4 text-right font-mono" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {d8IsActive ? mult(D8_CAL) : '—'}
                  </td>
                  {hasSegAdj && (
                    <td className="py-2.5 px-4 text-right font-mono" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      —
                    </td>
                  )}
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-white/5 rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${d8EffShare * 100}%`,
                            background: d8IsActive ? 'var(--cyan)' : 'rgba(100,116,139,0.4)',
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold w-8 text-right" style={{
                        color: d8IsActive ? 'var(--cyan)' : 'rgba(100,116,139,0.6)'
                      }}>
                        {d8IsActive ? share(d8Eff) : '0%'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-white/5 text-[10px] text-muted-foreground leading-relaxed space-y-1">
        <p>
          <span className="text-cyan-400/70 font-bold">Eff Share</span> = formula weight × global calibration × segment multiplier, normalized.
          Amber rows deviate &gt;3 pts from the raw formula weight — these are the layers where calibration has most changed the score composition.
          D6 (AI Agent, 4%) and D7 (Company Health, 7%) are always active and omitted for brevity.
        </p>
        <p className="text-slate-400/70">
          <span className="font-semibold text-slate-300/80">Country context</span> is encoded inside Role Exposure (D1, 18%) via
          jurisdiction-specific AI deployment rates (e.g. Germany QA = 0.844×, Singapore = 0.940×) and inside Company Health (L1, 16%)
          via PPP-adjusted financial thresholds — not as a separate formula dimension.
        </p>
        {!hasSegAdj && (
          <p className="opacity-60">
            No segment-specific adjustment active for this company profile. Effective shares reflect global calibration only.
          </p>
        )}
        {hasSegAdj && seg!.calibrationStatus === 'developer_estimate' && (
          <p className="text-amber-400/60">
            Segment multipliers are developer-estimated (not regression-derived). Use for directional guidance only.
          </p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// D8ValidationPanel — inline deployment gate status for D8
// ---------------------------------------------------------------------------
const D8ValidationPanel: React.FC = () => {
  const [d8Status, setD8Status] = React.useState<D8ValidationStatus>(
    getD8ValidationStatusSync()
  );

  React.useEffect(() => {
    let cancelled = false;
    getD8ValidationStatus().then(s => { if (!cancelled) setD8Status(s); });
    return () => { cancelled = true; };
  }, []);

  const gate = D8_VALIDATION_GATE;
  const r = d8Status.latest_result;

  if (d8Status.is_active && r) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-3 mt-2">
        <div className="flex items-start gap-2">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-mono text-emerald-300 font-medium">
              D8 term active — empirically calibrated from {r.n_heldout} efficiency
              restructuring events, AUC-ROC: {r.auc_roc}.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Precision at threshold {r.threshold}: {r.precision_at_threshold} · Recall: {r.recall_at_threshold} ·
              Positives: {r.n_positive} · Negatives: {r.n_negative}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const n = r?.n_heldout ?? 0;
  const auc = r?.auc_roc ?? null;
  const prec = r?.precision_at_threshold ?? null;

  const nOk   = n   >= gate.N_HELDOUT_MIN;
  const aucOk = auc !== null && auc  >= gate.AUC_ROC_MIN;
  const precOk = prec !== null && prec >= gate.PRECISION_MIN;

  const gateRow = (label: string, value: string | null, required: string, passes: boolean) => (
    <div className="flex items-center justify-between font-mono text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className={passes ? 'text-emerald-400' : 'text-rose-400'}>
          {value ?? '—'}
        </span>
        <span className="text-muted-foreground/50">≥ {required}</span>
        <span>{passes ? '✓' : '✗'}</span>
      </span>
    </div>
  );

  return (
    <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 mt-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="w-full">
          <p className="text-xs font-medium text-amber-300 mb-2">
            D8 validation pending — held-out gate not yet cleared
          </p>
          <div className="bg-black/20 rounded px-2 py-1 space-y-0.5">
            {gateRow('n_heldout', String(n),    String(gate.N_HELDOUT_MIN),  nOk)}
            {gateRow('AUC-ROC',  auc  !== null ? auc.toFixed(3)  : null, String(gate.AUC_ROC_MIN),    aucOk)}
            {gateRow('precision', prec !== null ? prec.toFixed(3) : null, String(gate.PRECISION_MIN),  precOk)}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Heuristic fallback active (EFFICIENCY cohort + Condition 3). D8 will be
            auto-promoted when gate clears via recalibrate-engine cron.
          </p>
        </div>
      </div>
    </div>
  );
};

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
        "L1–L5 thresholds calibrated via logistic regression on 200 verified layoff events (layoffs.fyi 2023–2025, AUC-ROC 0.81 on 40-event hold-out). Cross-sectional validation on 56 companies (2024–2026) produced L1-only AUC 0.73 (95% CI: 0.58–0.86). The model accurately detects distress-driven layoffs (AUC 0.96 for this cohort); D8 (efficiency-driven restructuring) is regression-calibrated (47 events, AUC 0.76) but held pending a 15-event held-out gate. Next temporal recalibration: July 2026.",
      icon: <BarChart2 className="w-6 h-6 text-amber-400" />,
    },
    {
      title: "Known Model Limitations",
      description:
        "The system predicts two distinct layoff types differently: (1) Distress-driven layoffs (financial pressure + high L1/L2) — accurately predicted, AUC ~0.96. (2) Efficiency-driven restructuring (profitable companies replacing workers with AI) — covered by D8 signal (regression-calibrated, 47 events), currently held pending held-out validation gate (n ≥ 15, AUC ≥ 0.72, precision ≥ 0.65). Heuristic fallback active. Companies with no prior rounds (Anthropic, OpenAI) correctly score as low risk despite high AI investment. Score confidence intervals reflect this uncertainty.",
      icon: <Shield className="w-6 h-6 text-orange-400" />,
    },
  ];

  return (
    <div className="methodology-explainer space-y-[var(--space-4)]">
      {sections.map((section, index) => (
        <div key={index} className="bg-white/5 border border-white/5 rounded-lg p-[var(--space-4)] hover:bg-white/10 transition-colors">
          <div className="flex gap-[var(--space-3)]">
            <div className="flex-shrink-0 mt-1">{section.icon}</div>
            <div className="w-full">
              <h4 className="label-xs font-black uppercase tracking-wider mb-[var(--space-2)]">{section.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {section.description}
              </p>
              {section.title === "Known Model Limitations" && <D8ValidationPanel />}
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
              Formula: 10-term composite (D1–D8, L1, L2), weights defined to sum to 1.00.
              D8 (AI efficiency restructuring, weight 9%) contributes to the score only when
              the v39_d8_ai_efficiency_active flag is on (validated logistic, 47 events, AUC 0.76)
              or when the EFFICIENCY cohort heuristic fires. When D8 = 0, the maximum
              achievable composite from the formula alone is 91 — the D8 weight slot is
              occupied but inactive. The Effective Layer Weights table above shows D8's
              current state for this audit. Deployment gate status in Known Model Limitations above.
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
                {dim.calibrationStatus !== 'regression_derived' && dim.calibrationStatus !== 'pseudo_validated' && (
                  <div className="text-[8px] text-amber-500/70 leading-tight mt-0.5">(estimate)</div>
                )}
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
// ParentPropagationPanel — parent→subsidiary propagation by office function
// ---------------------------------------------------------------------------

const RISK_LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  negligible: { bg: 'rgba(16,185,129,0.04)',  border: 'rgba(16,185,129,0.20)',  text: '#6ee7b7',  badge: 'rgba(16,185,129,0.15)' },
  low:        { bg: 'rgba(16,185,129,0.04)',  border: 'rgba(16,185,129,0.20)',  text: '#6ee7b7',  badge: 'rgba(16,185,129,0.15)' },
  moderate:   { bg: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.20)', text: '#fcd34d', badge: 'rgba(245,158,11,0.15)' },
  elevated:   { bg: 'rgba(249,115,22,0.04)', border: 'rgba(249,115,22,0.20)', text: '#fdba74', badge: 'rgba(249,115,22,0.15)' },
  high:       { bg: 'rgba(239,68,68,0.04)',  border: 'rgba(239,68,68,0.20)',  text: '#fca5a5', badge: 'rgba(239,68,68,0.15)' },
};

const ParentPropagationPanel: React.FC<{ propagation: ParentPropagationResult }> = ({ propagation: p }) => {
  const colors = RISK_LEVEL_COLORS[p.propagationRisk.level] ?? RISK_LEVEL_COLORS['moderate'];
  const lagStr = p.lagMonths.min === p.lagMonths.max
    ? `${p.lagMonths.min}mo`
    : `${p.lagMonths.min}–${p.lagMonths.max}mo`;
  const runwayStr = `${p.effectiveRunwayMonths.min}–${p.effectiveRunwayMonths.max} months`;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: colors.border, background: colors.bg }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2.5 flex flex-wrap items-center gap-2 border-b" style={{ borderColor: colors.border }}>
        <Building className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.text }} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: colors.text }}>
          {p.parentName} → {p.officeFunctionLabel}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
          style={{ background: colors.badge, color: colors.text, border: `1px solid ${colors.border}` }}>
          {p.propagationRisk.level} propagation risk
        </span>
        {p.functionRefinedFromRole && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(99,179,237,0.10)', color: '#93c5fd', border: '1px solid rgba(99,179,237,0.20)' }}>
            function inferred from role
          </span>
        )}
        <span className="ml-auto text-[9px] text-white/30 uppercase tracking-widest">ESTIMATED</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="data-label mb-1">Propagation Factor</div>
            <div className="text-sm font-black" style={{ color: colors.text }}>
              {(p.propagationFactor * 100).toFixed(0)}%
            </div>
            <div className="data-label opacity-50">of parent risk transmitted</div>
          </div>
          <div>
            <div className="data-label mb-1">Announcement → Action</div>
            <div className="text-sm font-black text-white/80">{lagStr}</div>
            <div className="data-label opacity-50">expected lag</div>
          </div>
          <div>
            <div className="data-label mb-1">Effective Runway</div>
            <div className="text-sm font-black text-emerald-400">{runwayStr}</div>
            <div className="data-label opacity-50">lag + legal protection</div>
          </div>
        </div>

        {/* Function narrative */}
        <p className="text-[10px] text-white/60 leading-relaxed border-l-2 pl-3"
          style={{ borderColor: colors.border }}>
          {p.functionNarrative}
        </p>

        {/* Protection vs vulnerability */}
        <div className="grid grid-cols-2 gap-3">
          {p.protectionFactors.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-400/70 mb-1">
                Protection factors
              </div>
              <ul className="space-y-0.5">
                {p.protectionFactors.slice(0, 2).map((f, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-emerald-400/60 flex-shrink-0">›</span>
                    <span className="text-[8.5px] text-white/55 leading-tight">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.vulnerabilityFactors.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-red-400/70 mb-1">
                Vulnerability factors
              </div>
              <ul className="space-y-0.5">
                {p.vulnerabilityFactors.slice(0, 2).map((f, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-400/60 flex-shrink-0">›</span>
                    <span className="text-[8.5px] text-white/55 leading-tight">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Legal protection window */}
        {p.legalProtectionDays && (
          <div className="flex items-center gap-2 p-2 rounded-lg"
            style={{ background: 'rgba(99,179,237,0.06)', border: '1px solid rgba(99,179,237,0.15)' }}>
            <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="text-[9px] text-blue-200/70">
              After parent-triggered announcement: <span className="font-bold text-blue-300">
                {Math.round(p.legalProtectionDays.min / 7)}–{Math.round(p.legalProtectionDays.max / 7)} weeks
              </span> legal protection window before last day (ESTIMATED from local employment law).
              Combined runway: <span className="font-bold text-blue-300">{runwayStr}</span>.
            </span>
          </div>
        )}

        {/* Priority actions */}
        {p.priorityActions.length > 0 && (
          <div className="border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/40 mb-1.5">
              Use the {lagStr} window to
            </div>
            <ul className="space-y-1">
              {p.priorityActions.slice(0, 3).map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[8px] font-bold text-white/30 flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-[8.5px] text-white/60 leading-tight">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
// CIWideningSourcesPanel — surfaces all three independent CI widening sources
// ---------------------------------------------------------------------------

const STALENESS_LEVEL: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const STALENESS_COLOR: Record<string, string> = {
  Low: '#10b981', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444',
};

const SourceRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  isDominant: boolean;
  color: string;
  impactLevel: number;
  detail: string;
  note: string;
  subItems?: string[];
}> = ({ icon, label, isDominant, color, impactLevel, detail, note, subItems }) => (
  <div style={{
    borderRadius: 8, padding: '10px 12px',
    background: impactLevel > 0 ? `${color}09` : 'rgba(255,255,255,0.02)',
    border: `1px solid ${impactLevel > 0 ? color + '25' : 'rgba(255,255,255,0.07)'}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      {icon}
      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'rgba(255,255,255,0.80)' }}>{label}</span>
      {isDominant && impactLevel > 0 && (
        <span style={{ fontSize: '0.59rem', padding: '0 5px', borderRadius: 3, fontWeight: 800, background: `${color}22`, color, border: `1px solid ${color}38`, lineHeight: '18px' }}>
          DOMINANT
        </span>
      )}
      {/* 4-pip impact bar */}
      <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
        {[1, 2, 3, 4].map(pip => (
          <div
            key={pip}
            style={{
              width: 6, height: 6, borderRadius: 2,
              background: pip <= Math.round(impactLevel) ? color : 'rgba(255,255,255,0.10)',
            }}
          />
        ))}
      </div>
    </div>
    <div style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{detail}</div>
    {subItems && subItems.length > 0 && (
      <div style={{ marginTop: 4 }}>
        {subItems.map((item, i) => (
          <div key={i} style={{ fontSize: '0.67rem', color: `${color}99`, marginTop: 2 }}>· {item}</div>
        ))}
      </div>
    )}
    <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.28)', marginTop: 5, fontStyle: 'italic' }}>{note}</div>
  </div>
);

const CIWideningSourcesPanel: React.FC<{
  dataFreshness: TabProps['result']['dataFreshness'];
  signalQuality: TabProps['result']['signalQuality'];
  ciRange: number;
}> = ({ dataFreshness, signalQuality, ciRange }) => {
  const conflictCount = signalQuality.conflictingSignals.length;
  const conflictPenaltyPct = Math.min(conflictCount * 5, 20);
  const hasLowDataGuard = !!signalQuality.lowDataWarning;

  const stalenessScore = STALENESS_LEVEL[dataFreshness.accuracyImpact] ?? 0;
  const stalenessColor = STALENESS_COLOR[dataFreshness.accuracyImpact] ?? '#9ca3af';
  const conflictScore  = conflictCount > 0 ? Math.min(conflictCount * 1.5, 4) : 0;
  const nullDataScore  = hasLowDataGuard ? 4 : 0;

  const dominantKey = (() => {
    if (stalenessScore >= conflictScore && stalenessScore >= nullDataScore && stalenessScore > 0) return 'staleness';
    if (conflictScore >= nullDataScore && conflictScore > 0) return 'conflict';
    if (nullDataScore > 0) return 'nulldata';
    return null;
  })();

  const dominantLabel: Record<string, string> = {
    staleness: 'dominant: data age',
    conflict:  'dominant: source conflicts',
    nulldata:  'dominant: missing critical signals',
  };

  return (
    <div style={{ borderRadius: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Layers style={{ width: 14, height: 14, flexShrink: 0, color: 'rgba(255,255,255,0.45)' }} />
        <span style={{ fontSize: '0.67rem', fontWeight: 800, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          CI Widening Sources — {ciRange}pt interval
        </span>
        {dominantKey && (
          <span style={{ fontSize: '0.61rem', padding: '1px 7px', borderRadius: 4, fontWeight: 800, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,255,255,0.10)' }}>
            {dominantLabel[dominantKey]}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SourceRow
          icon={<Clock style={{ width: 12, height: 12, color: stalenessColor }} />}
          label="Data staleness"
          isDominant={dominantKey === 'staleness'}
          color={stalenessColor}
          impactLevel={stalenessScore}
          detail={`Age: ${dataFreshness.ageInDays}d · CI impact: ${dataFreshness.accuracyImpact}${dataFreshness.stalenessWarning ? ` — ${dataFreshness.stalenessWarning.replace(/^[^\s]+\s/, '')}` : ''}`}
          note="Older data → larger uncertainty band. Fresh live signals narrow this component."
        />
        <SourceRow
          icon={<AlertTriangle style={{ width: 12, height: 12, color: conflictCount > 0 ? '#f97316' : '#9ca3af' }} />}
          label="Source conflicts"
          isDominant={dominantKey === 'conflict'}
          color={conflictCount > 0 ? '#f97316' : '#9ca3af'}
          impactLevel={conflictScore}
          detail={conflictCount === 0
            ? 'No cross-source conflicts detected — confidence not penalized'
            : `${conflictCount} conflict${conflictCount !== 1 ? 's' : ''} · −${conflictPenaltyPct}% confidence (5% per conflict, capped at 20%)`}
          subItems={signalQuality.conflictingSignals.slice(0, 2).map(c => `${c.signalType}: ${c.descriptions[0] ?? 'conflicting values across sources'}`)}
          note="Each conflict reduces confidence, which propagates to a wider CI."
        />
        <SourceRow
          icon={<Shield style={{ width: 12, height: 12, color: hasLowDataGuard ? '#ef4444' : '#9ca3af' }} />}
          label="Null-data guard (L1)"
          isDominant={dominantKey === 'nulldata'}
          color={hasLowDataGuard ? '#ef4444' : '#9ca3af'}
          impactLevel={nullDataScore}
          detail={hasLowDataGuard
            ? `${signalQuality.lowDataWarning!.missingCount} critical signals missing — confidence capped at ${signalQuality.lowDataWarning!.capAt}%`
            : 'All critical L1 signals present — guard not active'}
          subItems={hasLowDataGuard && signalQuality.missingDataFallbacks ? signalQuality.missingDataFallbacks.slice(0, 2) : []}
          note={hasLowDataGuard ? 'CI is conservatively wide until missing signals are resolved.' : 'No CI inflation from missing data.'}
        />
      </div>

      <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.27)', marginTop: 12, lineHeight: 1.6, marginBottom: 0 }}>
        These three sources are independent — each can be resolved separately. The dominant source
        is the single largest contributor to the {ciRange}pt interval. Resolving it alone would
        narrow the CI; resolving all three would narrow it to its minimum achievable width given
        the current model.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ConformalCIPanel — per-cohort conformal prediction interval disclosure
// ---------------------------------------------------------------------------

const COHORT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  DISTRESS:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.28)',   text: '#f87171' },
  EFFICIENCY: { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.28)',  text: '#60a5fa' },
  WAVE:       { bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.28)',  text: '#c084fc' },
  GLOBAL:     { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)',  text: '#a5b4fc' },
  UNKNOWN:    { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
};

const ConformalCIPanel: React.FC<{ bundle: ConformalBundle }> = ({ bundle }) => {
  // Display the 90% interval as the primary; 80% and 50% as secondary.
  const i90 = bundle.intervals.find((i) => Math.abs(i.nominalCoverage - 0.9) < 0.01);
  const i80 = bundle.intervals.find((i) => Math.abs(i.nominalCoverage - 0.8) < 0.01);
  const primary = i90 ?? i80 ?? bundle.intervals[0] ?? null;

  const isFallback   = bundle.source === 'fallback_heuristic';
  const isConformal  = bundle.source === 'conformal';
  const isPooled     = !!primary?.pooledFromCohort;

  const resolvedCohort  = primary?.resolvedCohort  ?? 'GLOBAL';
  const requestedCohort = primary?.pooledFromCohort ?? resolvedCohort; // requested = pooledFromCohort when set
  const cohortStyle     = COHORT_COLORS[resolvedCohort] ?? COHORT_COLORS.GLOBAL;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: cohortStyle.bg, border: `1px solid ${cohortStyle.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 flex-shrink-0" style={{ color: cohortStyle.text }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Conformal Prediction Interval
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Source badge */}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={isConformal
              ? { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }
              : { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }
            }
          >
            {isConformal ? 'CONFORMAL' : 'HEURISTIC FALLBACK'}
          </span>
          {/* Cohort badge */}
          {isConformal && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${cohortStyle.border}`, color: cohortStyle.text, border: `1px solid ${cohortStyle.border}` }}
            >
              {resolvedCohort}
            </span>
          )}
        </div>
      </div>

      {/* Pool-up warning — the critical disclosure this panel exists for */}
      {isPooled && primary && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-3"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <div>
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#fbbf24' }}>
              Pooled CI — cohort data insufficient
            </p>
            <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Your audit was classified as <span className="font-mono font-bold" style={{ color: COHORT_COLORS[requestedCohort]?.text ?? '#9ca3af' }}>{requestedCohort}</span>, but
              that cohort currently has fewer than 80 calibration outcomes.
              This confidence interval was computed from <span className="font-bold">{primary.calibrationN.toLocaleString()}</span> pooled{' '}
              <span className="font-mono font-bold" style={{ color: cohortStyle.text }}>{resolvedCohort}</span> outcomes.
              A {requestedCohort}-specific CI would be narrower and more precise once sufficient
              outcomes accumulate. The interval shown here is valid but conservatively wide.
            </p>
          </div>
        </div>
      )}

      {/* Heuristic fallback warning */}
      {isFallback && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-3"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.60)' }}>
            Insufficient calibration data across all cohorts (fewer than 80 confirmed outcomes).
            This is a heuristic width estimate — not an empirically validated coverage guarantee.
            Do not interpret as a "90% credible interval."
          </p>
        </div>
      )}

      {/* Interval tiles */}
      {bundle.intervals.length > 0 && (
        <div className={`grid gap-2 mb-3 ${bundle.intervals.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {bundle.intervals.map((iv: ConformalInterval) => {
            const pct = Math.round(iv.nominalCoverage * 100);
            return (
              <div
                key={iv.nominalCoverage}
                className="rounded-lg p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div className="text-sm font-bold" style={{ color: cohortStyle.text }}>
                  {iv.low}–{iv.high}
                </div>
                <div className="text-[10px] opacity-50 mt-0.5">{pct}% interval</div>
                {iv.empiricalCoverage != null && (
                  <div
                    className="text-[9px] mt-0.5 font-medium"
                    style={{ color: Math.abs(iv.empiricalCoverage - iv.nominalCoverage) < 0.05 ? '#34d399' : '#fbbf24' }}
                  >
                    empirical {Math.round(iv.empiricalCoverage * 100)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Calibration metadata */}
      {isConformal && primary && (
        <div className="flex items-center gap-4 flex-wrap mt-1 mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.40)' }}>
          <span>n = {primary.calibrationN.toLocaleString()} calibration outcomes</span>
          {primary.lastCalibratedAt && (
            <span>last calibrated {new Date(primary.lastCalibratedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          )}
          {primary.empiricalCoverage != null && (
            <span>empirical coverage {Math.round(primary.empiricalCoverage * 100)}% (90% nominal)</span>
          )}
        </div>
      )}

      {/* Rationale */}
      {primary?.rationale && (
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {primary.rationale}
        </p>
      )}

      {!isFallback && (
        <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.22)' }}>
          Split-conformal prediction. Interval = [score − q_α, score + q_α] where q_α is the{' '}
          ⌈(n+1)(1−α)⌉-th quantile of calibration non-conformity scores.
          Marginal coverage guarantee holds for i.i.d. data regardless of distribution.
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// TransparencyTab main component
// ---------------------------------------------------------------------------

export const TransparencyTab: React.FC<TabProps> = ({ result, companyData }) => {
  // v40.0 FIX-8: fetch live calibration status async so ModelCalibrationPanel
  // sees real drift data, not the bootstrap default returned by the sync accessor
  // when the async cache hasn't been primed yet.
  const [liveCalibStatus, setLiveCalibStatus] = useState<LiveCalibrationStatus>(
    getLiveCalibrationStatusSync()
  );
  useEffect(() => {
    getLiveCalibrationStatus().then(setLiveCalibStatus).catch(() => {});
  }, []);

  // v40.0: calibration constant provenance summary — fetch async, render from cache first.
  // Falls back to HybridResult.uncalibratedConstantCount when the DB view is unavailable.
  const [provenanceSummary, setProvenanceSummary] = useState<ProvenanceSummary | null>(
    getProvenanceSummarySync()
  );
  useEffect(() => {
    getProvenanceSummary().then(s => { if (s) setProvenanceSummary(s); }).catch(() => {});
  }, []);

  // GAP-A01: live holdout AUC from v_formula_heldout_validation (1-hour cache).
  const [holdoutValidation, setHoldoutValidation] = useState<FormulaHoldoutValidation>(
    getFormulaHoldoutValidationSync()
  );
  useEffect(() => {
    getFormulaHoldoutValidation().then(setHoldoutValidation).catch(() => {});
  }, []);

  // GAP-A03: live stealth detector precision from stealth_layoff_precision_summary (1-hour cache).
  const [stealthPrecision, setStealthPrecision] = useState<StealthPrecisionStats>(
    getStealthPrecisionStatsSync()
  );
  useEffect(() => {
    getStealthPrecisionStats().then(setStealthPrecision).catch(() => {});
  }, []);

  // Derive uncalibrated count from: DB view > HybridResult snapshot count > 0
  const uncalibratedCount =
    provenanceSummary?.uncalibratedCount
    ?? result.uncalibratedConstantCount
    ?? 0;
  const uncalibratedKeys: string[] =
    provenanceSummary?.uncalibratedKeys
    ?? result.uncalibratedConstantKeys
    ?? [];
  const totalConstantCount = provenanceSummary?.totalCount ?? 0;
  const regressionCoveragePct = provenanceSummary?.regressionCoveragePct ?? 0;

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
      domain: "proxy-live-signals Edge Function (Yahoo Finance, SEC EDGAR, RSS news, job board scrapers)",
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
      details: `Interval: [${result.confidenceInterval?.low ?? "?"}–${result.confidenceInterval?.high ?? "?"}]${uncalibratedCount > 0 ? ' (estimate — CI spread from unvalidated constants)' : ''} · Freshness: ${freshnessDays}d`,
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

          {/* Filing regime quality — structural CI/confidence adjustment by domicile.
              Filed in result.signalQuality.filingRegime (added to signalQuality spread in engine). */}
          {(() => {
            const regime = (result.signalQuality as any)?.filingRegime;
            if (!regime || regime.regimeCode === 'SEC') return null;  // US baseline: no disclosure needed
            const hasPenalty = regime.confidencePercentPenalty > 0 || regime.ciWidthPenaltyPts > 0;
            if (!hasPenalty) return null;
            return (
              <div className="mb-6 p-4 rounded-xl border overflow-hidden"
                style={{ borderColor: 'rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.05)' }}>
                <div className="flex gap-3">
                  <Database className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h4 className="font-semibold text-violet-300 text-sm">
                        Filing Regime Signal Quality
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}>
                        ESTIMATED
                      </span>
                    </div>
                    <p className="text-xs text-violet-200/80 font-semibold mb-1">
                      {regime.label} — CI widened by +{regime.ciWidthPenaltyPts} pts, confidence reduced by {regime.confidencePercentPenalty}% vs US SEC baseline.
                    </p>
                    <p className="text-xs text-violet-200/60 leading-relaxed mb-2">
                      {regime.penaltyRationale}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="text-violet-400/60 mb-0.5">Filing frequency</div>
                        <div className="font-medium text-violet-200/80 capitalize">
                          {regime.filingFrequency.replace('_', ' ')}
                        </div>
                      </div>
                      <div>
                        <div className="text-violet-400/60 mb-0.5">Source quality</div>
                        <div className="font-medium text-violet-200/80">
                          {Math.round(regime.regulatorySourceQuality * 100)}% vs SEC 95%
                        </div>
                      </div>
                      <div>
                        <div className="text-violet-400/60 mb-0.5">Layoff notice</div>
                        <div className="font-medium" style={{ color: regime.hasMandatoryLayoffNotice ? '#6ee7b7' : '#fca5a5' }}>
                          {regime.hasMandatoryLayoffNotice ? 'Mandatory' : 'None required'}
                        </div>
                      </div>
                    </div>
                    {regime.layoffNoticeNote && (
                      <p className="text-[9px] text-violet-200/45 mt-1.5 leading-tight">
                        {regime.layoffNoticeNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Scraper-timeout floor disclosure.
              Shows when the 45s quorum ceiling fired without quorum — confidence is
              anchored to the DB quality tier floor, NOT evidence from this session.
              "62% confidence" from a Tier A floor is categorically different from
              "62% confidence" from genuine evidence agreement; this block makes that
              distinction explicit and machine-readable for the user. */}
          {(() => {
            const floor = (result as any).signalQuality?._liveUnavailableFloor as number | null | undefined;
            const tier  = (result as any).signalQuality?._dbReliabilityTier   as 'A'|'B'|'C'|'D' | null | undefined;
            if (floor == null || tier == null) return null;
            const floorPct = Math.round(floor * 100);
            const TIER_LABELS: Record<string, string> = {
              A: 'A — full record, high completeness',
              B: 'B — partial record',
              C: 'C — sparse record',
              D: 'D — minimal data / unknown company',
            };
            return (
              <div className="mb-6 p-4 rounded-xl border overflow-hidden"
                style={{ borderColor: 'rgba(244,63,94,0.30)', background: 'rgba(244,63,94,0.06)' }}>
                <div className="flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h4 className="font-semibold text-rose-300 text-sm">
                        Scraper Timeout — DB Quality Floor Applied
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{ background: 'rgba(244,63,94,0.15)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.25)' }}>
                        Tier {tier}
                      </span>
                    </div>
                    <p className="text-xs text-rose-200/80 leading-relaxed mb-3">
                      Live scraping did not complete within the quorum window (45-second ceiling reached).
                      Confidence is anchored to the <strong className="text-rose-200">DB record quality floor</strong>,
                      not to signals collected during this audit session.
                      A score of <strong className="text-rose-200">{floorPct}%</strong> here means
                      "the database record for this company is Tier {tier} quality" —
                      it does <em>not</em> mean evidence collected today supports {floorPct}% confidence.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
                        DB Tier {tier}
                        <span className="text-base font-bold text-rose-300 ml-1">{floorPct}%</span>
                      </div>
                      <span className="text-rose-400/50 text-xs">floor (not evidence score)</span>
                    </div>
                    <p className="text-[9px] text-rose-200/40 mt-2 leading-tight">
                      {TIER_LABELS[tier] ?? `Tier ${tier}`}.
                      Re-running the audit when live sources are reachable will replace this floor with an evidence-based score.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* BUG-05: Private-company structural ceiling disclosure.
              Shows "Evidence quality: X% → Structural cap: Y%" only when the ceiling
              actually fired (evidence > ceiling). Distinguishes a user with strong
              evidence capped by law from a user who naturally has weak evidence. */}
          {(() => {
            const preCeiling = result._confidencePreCeiling;
            const ceiling = result._confidenceRegimeCeiling;
            const regimeLabel = result._confidenceRegimeLabel;
            if (preCeiling == null || ceiling == null) return null;
            const prePct   = Math.round(preCeiling * 100);
            const capPct   = Math.round(ceiling * 100);
            const effPct   = result.confidencePercent ?? capPct;
            const REGIME_LABELS: Record<string, string> = {
              german_gmbh:        'German GmbH',
              uk_private_ltd:     'UK Private Ltd',
              india_unlisted_pvt: 'India Unlisted Pvt',
              us_private:         'US Private Co.',
              apac_private:       'APAC Private',
              eu_other_private:   'EU Private',
            };
            const regimeDisplay = (regimeLabel && REGIME_LABELS[regimeLabel]) ?? regimeLabel ?? 'Private company';
            return (
              <div className="mb-6 p-4 rounded-xl border overflow-hidden"
                style={{ borderColor: 'rgba(251,146,60,0.30)', background: 'rgba(251,146,60,0.06)' }}>
                <div className="flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h4 className="font-semibold text-orange-300 text-sm">
                        Structural Confidence Ceiling Applied
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{ background: 'rgba(251,146,60,0.15)', color: '#fdba74', border: '1px solid rgba(251,146,60,0.25)' }}>
                        {regimeDisplay}
                      </span>
                    </div>
                    <p className="text-xs text-orange-200/80 leading-relaxed mb-3">
                      Evidence quality would have supported <strong className="text-orange-200">{prePct}% confidence</strong>,
                      but local corporate disclosure law limits verifiable data for this entity type.
                      Confidence is capped at <strong className="text-orange-200">{capPct}%</strong> regardless of scrape quality.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', color: '#fdba74' }}>
                        Evidence quality
                        <span className="text-base font-bold text-orange-300">{prePct}%</span>
                      </div>
                      <span className="text-orange-400/60 text-xs">→</span>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(251,146,60,0.18)', border: '1px solid rgba(251,146,60,0.40)', color: '#fb923c' }}>
                        Structural cap
                        <span className="text-base font-bold text-orange-200">{capPct}%</span>
                      </div>
                      {effPct !== capPct && (
                        <>
                          <span className="text-orange-400/60 text-xs">→</span>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.20)', color: '#fed7aa' }}>
                            Effective
                            <span className="text-base font-bold text-orange-200">{effPct}%</span>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-[9px] text-orange-200/45 mt-2 leading-tight">
                      This ceiling reflects a jurisdiction-imposed information gap, not a data quality problem.
                      A company in this regime with 71% evidence confidence shows identically to one with 42%
                      evidence confidence — this disclosure separates the two cases.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

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

          {/* Kill-switch floor disclosure — one block per fired switch.
              Spec: each floor must appear as a "Score Floor Active" badge with the exact
              disclosure text. A floor-adjusted score must never look formula-derived. */}
          {(result.activatedKillSwitches ?? []).length > 0 && (() => {
            const floors = result.killSwitchFloors ?? {};
            const DISCLOSURE: Record<string, string> = {
              confirmed_recent_layoff_news:
                'confirmed_recent_layoff_news floor applied — minimum score 72 (breaking news event detected within 30 days).',
              financial_distress_triad:
                'financial_distress_triad floor applied — minimum score 65 (L1 > 75%, negative FCF, stock < −30%).',
              pre_layoff_precursor:
                'pre_layoff_precursor floor applied — minimum score 58 (confirmed hiring freeze, layoff history, sector contagion detected).',
              pre_layoff_precursor_inferred:
                'pre_layoff_precursor_inferred floor applied — minimum score 52 (AI inference from news/Glassdoor).',
              warn_act_filing:
                'warn_act_filing floor applied — minimum score 68 (active WARN Act filing is regulatory ground truth: company legally confirmed a planned mass layoff).',
              stealth_layoff_floor:
                'stealth_layoff_floor floor applied — aggregate headcount decline detected without public announcement.',
            };

            // GAP-A03: resolve _stealthSignal from the result for rich disclosure
            const stealthSig = (result as any)._stealthSignal as {
              severity: string; pctChange6mo: number | null;
              recentEmployeeCount: number | null; priorEmployeeCount: number | null;
              dataSource: string | null; confidence: number; hasAnnouncedRound: boolean;
              subSignals?: StealthSubSignal[];
            } | undefined;

            return (
              <div className="mb-6 space-y-2">
                {(result.activatedKillSwitches ?? []).map(ks => {
                  const floorVal = floors[ks];
                  const disclosure =
                    DISCLOSURE[ks] ??
                    `${ks.replace(/_/g, ' ')} floor applied${floorVal != null ? ` — minimum score ${floorVal}` : ''}.`;
                  const isStealth = ks === 'stealth_layoff_floor';
                  return (
                    <div
                      key={ks}
                      className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/8"
                    >
                      <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h4 className="text-[11px] font-bold text-rose-300 uppercase tracking-wide">
                              Score Floor Active
                            </h4>
                            <span
                              className="text-[9px] font-black px-2 py-0.5 rounded"
                              style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
                            >
                              FLOOR-ADJUSTED · NOT FORMULA-DERIVED
                            </span>
                            {floorVal != null && (
                              <span
                                className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                                style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
                              >
                                min {floorVal}
                              </span>
                            )}
                            {/* GAP-A03: ESTIMATED label + dynamic precision badge */}
                            {isStealth && (
                              <>
                                <span
                                  className="text-[9px] font-bold px-2 py-0.5 rounded"
                                  style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.30)' }}
                                >
                                  ESTIMATED
                                </span>
                                <span
                                  className="text-[9px] font-bold px-2 py-0.5 rounded"
                                  style={{
                                    background: stealthPrecision.gateStatus === 'gate_clears'
                                      ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                    color: stealthPrecision.gateStatus === 'gate_clears'
                                      ? '#34d399' : '#fbbf24',
                                    border: stealthPrecision.gateStatus === 'gate_clears'
                                      ? '1px solid rgba(16,185,129,0.30)' : '1px solid rgba(245,158,11,0.30)',
                                  }}
                                >
                                  PRECISION: {stealthPrecision.precisionLabel}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-rose-200/85 leading-relaxed font-mono">
                            {disclosure}
                          </p>
                          {/* GAP-A03: structured detection signal list with precision disclosure */}
                          {isStealth && stealthSig && (
                            <div className="mt-3 space-y-2">
                              {/* Numbered detection signals */}
                              {(stealthSig.subSignals ?? []).length > 0 && (
                                <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                  <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">
                                    Detection signals ({(stealthSig.subSignals ?? []).length})
                                  </div>
                                  {(stealthSig.subSignals as StealthSubSignal[]).map((sig, idx) => (
                                    <div key={idx} className="flex gap-2 items-start">
                                      <span className="text-[9px] font-black text-rose-400 shrink-0 mt-0.5 w-3">
                                        {idx + 1}.
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[10px] font-semibold text-rose-200/90">
                                          {sig.label}
                                        </span>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                          <span className="text-[9px] text-rose-300/80">
                                            Observed: <span className="font-black">{sig.observedValue}</span>
                                          </span>
                                          <span className="text-[9px] opacity-55">
                                            Threshold: {sig.threshold}
                                          </span>
                                          <span className="text-[9px] opacity-45">
                                            Window: {sig.windowPeriod}
                                          </span>
                                          <span className="text-[9px] opacity-40">
                                            Source: {sig.dataSource}
                                            {sig.dataSource !== 'linkedin' && ' (not LinkedIn)'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {/* Headcount from→to when available */}
                                  {stealthSig.priorEmployeeCount != null && stealthSig.recentEmployeeCount != null && (
                                    <div className="mt-1.5 pt-1.5 border-t border-rose-500/15 flex items-center gap-1.5">
                                      <span className="text-[9px] opacity-50 uppercase tracking-wider">Headcount:</span>
                                      <span className="text-[10px] font-mono font-semibold text-rose-200/80">
                                        {stealthSig.priorEmployeeCount.toLocaleString()}
                                        {' → '}
                                        {stealthSig.recentEmployeeCount.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ESTIMATED heuristic note + live precision */}
                              <div className="rounded-lg p-2.5 space-y-1" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
                                <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(200,200,255,0.65)' }}>
                                  <span className="font-black text-indigo-300">ESTIMATED</span> — stealth layoff detection is a
                                  pattern-matching heuristic, not a confirmed event. It detects headcount
                                  contraction without an announcement; it cannot distinguish mass layoffs,
                                  contractor re-classification, or voluntary attrition acceleration.
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5">
                                  <span className="text-[9px]" style={{ color: 'rgba(200,200,255,0.55)' }}>
                                    Detection precision:{' '}
                                    <span className={`font-black ${stealthPrecision.gateStatus === 'gate_clears' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {stealthPrecision.precisionLabel}
                                    </span>
                                  </span>
                                  <span className="text-[9px]" style={{ color: 'rgba(200,200,255,0.55)' }}>
                                    False positive rate:{' '}
                                    <span className={`font-black ${stealthPrecision.gateStatus === 'gate_clears' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {stealthPrecision.fprLabel}
                                    </span>
                                  </span>
                                  {stealthPrecision.overallN > 0 && (
                                    <span className="text-[9px] opacity-40">
                                      n={stealthPrecision.overallN} confirmed outcomes
                                    </span>
                                  )}
                                </div>
                                {stealthPrecision.gateStatus === 'insufficient_cases' && (
                                  <p className="text-[9px] opacity-40 leading-relaxed">
                                    Precision gate not yet cleared — requires ≥20 confirmed outcomes with outcome_reported.
                                    Floor applies conservatively until gate clears (precision ≥ 60%).
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
                  Kill-switch floors apply when signal combinations indicate risks the base formula
                  cannot fully capture. The score is bounded below by the floor value regardless of
                  formula output. Disclosed here so you know the final score is not purely formula-derived.
                </p>
              </div>
            );
          })()}

          {/* GAP-A04: Collapse Predictor precision disclosure — shown when collapseStage is active */}
          {result.collapseStage != null && (() => {
            const stage      = result.collapseStage as 1 | 2 | 3;
            const sigConf    = result.collapseStageConfidence;
            const cp         = result.collapsePredictor;
            const precision  = cp?.stagePrecision ?? null;
            const nEvents    = cp?.stageBasedOnNEvents ?? 0;
            const precLabel  = cp?.stagePrecisionLabel ?? 'UNKNOWN';
            const fprLabel   = cp?.stageFprLabel ?? 'UNKNOWN';
            const horizonDays = cp?.stageHorizonDays ?? (stage === 1 ? 365 : stage === 2 ? 180 : 90);
            const gateStatus = cp?.stageGateStatus ?? 'insufficient_cases';
            const precisionKnown = precision != null && precision >= 0.60;

            const stageLabels: Record<1 | 2 | 3, string> = {
              1: 'Stage 1 — Early Warning (12–18 months)',
              2: 'Stage 2 — Displacement in Progress (6–12 months)',
              3: 'Stage 3 — Imminent Risk (1–6 months)',
            };
            const stageColors: Record<1 | 2 | 3, { border: string; bg: string; text: string }> = {
              1: { border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.07)', text: '#fbbf24' },
              2: { border: 'rgba(249,115,22,0.35)', bg: 'rgba(249,115,22,0.07)', text: '#fb923c' },
              3: { border: 'rgba(239,68,68,0.40)',  bg: 'rgba(239,68,68,0.09)',  text: '#f87171' },
            };
            const c = stageColors[stage];
            return (
              <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: c.border, background: c.bg }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: c.text }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {/* Stage label — suppressed when precision < 0.60 */}
                      <h4 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: c.text }}>
                        Collapse Predictor —{' '}
                        {precisionKnown ? stageLabels[stage] : 'Early warning signals present'}
                      </h4>
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded"
                        style={{
                          background: precisionKnown ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          color: precisionKnown ? '#34d399' : '#fbbf24',
                          border: precisionKnown ? '1px solid rgba(16,185,129,0.30)' : '1px solid rgba(245,158,11,0.30)',
                        }}
                      >
                        PRECISION: {precLabel}
                      </span>
                      {stage === 3 && (
                        <span
                          className="text-[9px] font-black px-2 py-0.5 rounded"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                        >
                          EMERGENCY PROTOCOL ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Empirical precision statement */}
                    <div className="mb-2 p-2.5 rounded-lg text-[10px] leading-relaxed"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {precisionKnown ? (
                        <span style={{ color: 'rgba(255,255,255,0.75)' }}>
                          <span className="font-bold" style={{ color: c.text }}>
                            {stageLabels[stage]} classification
                          </span>
                          {' '}({precLabel} precision on{' '}
                          <span className="font-semibold">{nEvents} historical companies</span>{' '}
                          — meaning{' '}
                          <span className="font-semibold">{fprLabel}</span>{' '}
                          of Stage {stage} companies did not have a confirmed layoff within{' '}
                          {horizonDays} days).
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.60)' }}>
                          Stage label suppressed — empirical precision is{' '}
                          <span className="font-bold text-amber-400">{precLabel}</span>
                          {nEvents > 0
                            ? ` (${nEvents} confirmed outcome${nEvents !== 1 ? 's' : ''} collected; gate requires ≥20 at ≥60%)`
                            : ' (0 confirmed outcomes; requires ≥20 to validate)'}.{' '}
                          Signals indicate distress but the {horizonDays}-day layoff confirmation rate is unvalidated.
                          {gateStatus === 'precision_below_gate' && (
                            <span className="text-rose-400/80"> Precision below 60% gate.</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Signal confidence vs empirical precision — distinguish the two */}
                    {sigConf != null && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div className="text-[9px] opacity-50 mb-0.5 uppercase tracking-wider">Signal Quality</div>
                          <div className="text-xs font-black" style={{ color: c.text }}>
                            {Math.round(sigConf * 100)}%
                          </div>
                          <div className="text-[8px] opacity-40 mt-0.5 leading-tight">
                            severity-weighted · internal
                          </div>
                        </div>
                        <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div className="text-[9px] opacity-50 mb-0.5 uppercase tracking-wider">Empirical Precision</div>
                          <div className={`text-xs font-black ${precisionKnown ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {precLabel}
                          </div>
                          <div className="text-[8px] opacity-40 mt-0.5 leading-tight">
                            {nEvents > 0 ? `n=${nEvents} outcomes` : '0 confirmed cases'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 3 timeline claim — labeled UNVERIFIED */}
                    {stage === 3 && (
                      <div className="flex items-start gap-1.5 mb-2 p-2 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <AlertTriangle className="w-3 h-3 text-rose-400/60 flex-shrink-0 mt-0.5" />
                        <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          <span className="font-bold text-amber-400/80">UNVERIFIED: </span>
                          Stage 3 cites "Historical median time to layoff announcement: 4–8 weeks" — no citation, not derived from outcome data. Treat as an estimate until validated.
                        </p>
                      </div>
                    )}

                    {/* Precision gate explanation */}
                    <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      Signal Quality ({sigConf != null ? `${Math.round(sigConf * 100)}%` : '—'}) is a severity-weighted ratio of active signals — it is NOT the fraction of Stage {stage} predictions that confirmed as layoffs. Empirical precision gate: ≥20 outcomes AND precision ≥60% required before the stage label is shown. Until then: "Early warning signals present".
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Circuit breaker disclosure — shown when any API has OPEN/HALF_OPEN circuit */}
          {(() => {
            const yahooSnap  = getCircuitSnapshot('yahoo-finance-us');
            const naukriSnap = getCircuitSnapshot('naukri');
            const openCircuits = [yahooSnap, naukriSnap].filter(
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

          {/* Calibration constants bootstrap disclosure — shown when the DB was unreachable
              at score computation time and all constants fell back to hardcoded defaults.
              The score is valid but used bootstraps instead of live-calibrated values. */}
          {result.calibrationDbBootstrap && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <div className="flex gap-3">
                <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-300 text-sm mb-1">
                    Calibration constants loaded from backup (database unavailable)
                  </h4>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    The scoring engine could not reach the calibration constants database
                    when this score was computed. All scalar constants — AI displacement
                    weights, confidence caps, visa risk amplifiers, and peer contagion
                    multipliers — were served from hardcoded fallback values instead of
                    live DB-calibrated values.
                  </p>
                  <p className="text-xs text-amber-200/60 mt-1.5 leading-relaxed">
                    Your score is valid and will not differ substantially from a DB-backed
                    score, but the exact constant values may differ slightly from the
                    currently active calibrated rows. Recalculate once the database is
                    reachable to confirm with live constants.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Segmented calibration disclosure — always shown when a segment resolved. */}
          {result.appliedCalibrationSegment && (
            <div className="mb-6 p-4 rounded-xl border border-cyan-500/25 bg-cyan-500/8">
              <div className="flex gap-3">
                <BarChart2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-cyan-300 text-sm">
                      Calibration segment applied
                    </h4>
                    <span
                      className={[
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        result.calibrationFallbackLevel === 'segment_db'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : result.calibrationFallbackLevel === 'segment_bootstrap'
                            ? 'bg-cyan-500/12 text-cyan-400 border-cyan-500/25'
                            : result.calibrationFallbackLevel === 'cohort_db'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-white/10 text-gray-400 border-white/15',
                      ].join(' ')}
                    >
                      {result.calibrationFallbackLevel === 'segment_db'       ? 'DB-calibrated (≥80 outcomes)' :
                       result.calibrationFallbackLevel === 'segment_bootstrap' ? 'Research bootstrap' :
                       result.calibrationFallbackLevel === 'cohort_db'         ? 'Cohort DB' :
                                                                                 'Global bootstrap'}
                    </span>
                  </div>
                  <p className="text-xs text-cyan-200/80 leading-relaxed">
                    <span className="font-mono font-semibold">{result.appliedCalibrationSegment}</span>
                    {' '}— L1–L5 layer multipliers were adjusted for this company's region,
                    industry, and size. A 50,000-person Indian IT services firm has structurally
                    different layoff dynamics from a 300-person US fintech; the global pooled
                    coefficients would systematically miscalibrate for one or both populations.
                  </p>
                  {result.calibrationFallbackLevel === 'segment_bootstrap' && (
                    <p className="text-[10px] text-cyan-200/55 mt-1.5 leading-relaxed">
                      Research-grounded estimates are applied — this segment has not yet
                      accumulated ≥80 verified outcomes for regression-derived coefficients.
                      The multipliers are from published literature, not empirical regression.
                    </p>
                  )}
                  {result.calibrationFallbackLevel === 'global_bootstrap' && (
                    <p className="text-[10px] text-cyan-200/55 mt-1.5 leading-relaxed">
                      No segment-specific calibration was available — global pooled coefficients
                      applied. Accuracy may be lower for under-represented markets.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Unknown company inference disclosure — shown when industry/region were
              inferred from the company name because the company wasn't in the DB. */}
          {(() => {
            const cd = (companyData as any) ?? (result as any).companyData ?? (result._engineResult as any)?.companyData;
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

          {/* D4 Performance credibility disclosure.
              Shown when the credibility engine adjusted the effective tier (d4CredibilityAdjustmentApplied).
              Spec-exact format v2:
                "Reported performance: Top. Effective (credibility-adjusted): Moderate.
                 Contradicting signals: no promotion in 5 years (−0.55 credibility)."
              Falls back to legacy flat fields when d4-prefixed fields are absent. */}
          {((result as any).d4CredibilityAdjustmentApplied === true ||
            (result.reportedPerformanceTier !== undefined &&
             result.reportedPerformanceTier !== result.performanceTier)) && (() => {
            // Prefer d4-prefixed fields; fall back to legacy flat fields for backwards compat.
            const reported  = ((result as any).d4ReportedPerformanceTier  ?? result.reportedPerformanceTier) as string | undefined;
            const effective = ((result as any).d4EffectivePerformanceTier ?? result.performanceTier)         as string | undefined;
            const contradictingSignals = ((result as any).d4ContradictingSignals ?? []) as Array<{
              shortLabel: string; penaltyApplied: number; severity: string; signal2: string;
            }>;

            // Compact tier labels: "Top", "Moderate", "Below average".
            const tierLabel = (t: string | undefined): string => {
              if (t === 'top')     return 'Top';
              if (t === 'average') return 'Moderate';
              if (t === 'below')   return 'Below average';
              return 'Unknown';
            };
            const reportedLabel  = tierLabel(reported);
            const effectiveLabel = tierLabel(effective);
            const credPct = result.performanceCredibilityScore != null
              ? Math.round(result.performanceCredibilityScore * 100)
              : null;

            const regionKey      = (result as any).performanceCredibilityRegionKey as string | undefined;
            const thresholdLabel = (result as any).performanceCredibilityThresholdLabel as string | undefined;
            const isRegionAdjusted = regionKey === 'india' || regionKey === 'germany';
            const progressionNoun  = regionKey === 'india' ? 'role change' : 'promotion';
            const thresholdYears   = (regionKey === 'india' || regionKey === 'germany') ? 5 : 3;
            // Downward adjustment (top→average/unknown) vs upward (below→average).
            const isDownwardAdj = reported === 'top';

            return (
              <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <h4 className="font-semibold text-amber-300 text-sm mb-1.5">
                      D4 · Performance Credibility Analysis
                    </h4>

                    {/* Spec-exact line 1: "Reported performance: Top. Effective (credibility-adjusted): Moderate." */}
                    <p className="text-sm font-semibold text-amber-200 mb-1.5">
                      Reported performance: <span className="font-black">{reportedLabel}</span>.{' '}
                      Effective (credibility-adjusted): <span className="font-black">{effectiveLabel}</span>.
                    </p>

                    {/* Spec-exact line 2: contradicting signals with per-signal penalty.
                        Format: "Contradicting signals: no promotion in 5 years (−0.55 credibility)." */}
                    {contradictingSignals.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-amber-300/90 mb-1">
                          Contradicting signals:
                        </p>
                        <ul className="space-y-1">
                          {contradictingSignals.map((s, i) => (
                            <li key={i} className="text-xs text-amber-200/80 flex items-start gap-1.5">
                              <span className="text-amber-400/60 mt-px shrink-0">•</span>
                              <span>
                                {s.shortLabel}
                                {s.penaltyApplied > 0 && (
                                  <span className="text-amber-400/70 font-medium">
                                    {' '}(−{s.penaltyApplied.toFixed(2)} credibility)
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Region-adjusted threshold context */}
                    {isRegionAdjusted && thresholdLabel && (
                      <p className="text-xs font-medium text-amber-300/80 mb-1.5">
                        Region threshold: no {progressionNoun} in {thresholdYears} years
                        {' '}({thresholdLabel}).
                      </p>
                    )}

                    {/* Credibility score + explanation */}
                    <p className="text-xs text-amber-200/65 leading-relaxed">
                      {credPct !== null && (
                        <>Credibility score: <span className="font-bold">{credPct}%</span>.{' '}</>
                      )}
                      {isDownwardAdj
                        ? <>The engine applied the effective tier (<span className="font-bold">{effectiveLabel}</span>) to L5 scoring.</>
                        : <>Objective signals suggest the reported tier may be conservative — effective tier used for scoring.</>
                      }
                    </p>
                    {isDownwardAdj && (
                      <p className="text-xs text-amber-200/50 mt-1.5 leading-relaxed">
                        This is not punitive — it is accurate. If you are on an IC track, in a flat
                        org{regionKey === 'india' ? ', or made a lateral rotation' : ''}, your actual
                        risk is lower than shown. Update your profile to reflect that context.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Hyperscaler D8 proxy disclosure.
              Spec-exact format: "Hyperscaler AI efficiency proxy applied (+0.12 composite).
              This pattern matches Meta/Google/Amazon efficiency restructuring (2022-2023).
              Full D8 empirical term pending flag activation (currently at N of 47 target events)."
              Shown ONLY when the proxy was actually applied (hyperscalerD8ProxyApplied = true). */}
          {(result as any).hyperscalerD8ProxyApplied && (() => {
            const proxyAmt  = (result as any).hyperscalerD8ProxyAmount as number | undefined;
            const pctStr    = proxyAmt != null ? `+${proxyAmt.toFixed(2)}` : '+0.12';
            const ptStr     = proxyAmt != null ? `+${Math.round(proxyAmt * 100)}` : '+12';
            return (
              <div className="mb-6 p-4 rounded-xl border border-violet-500/30 bg-violet-500/[0.06]">
                <div className="flex gap-3">
                  <Zap className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h4 className="font-semibold text-violet-300 text-sm">
                        Hyperscaler AI Efficiency Proxy Applied
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}>
                        ESTIMATED
                      </span>
                    </div>
                    {/* Spec-exact disclosure line */}
                    <p className="text-sm font-semibold text-violet-200 mb-1.5">
                      Hyperscaler AI efficiency proxy applied ({pctStr} composite, {ptStr} pts).
                      This pattern matches Meta/Google/Amazon efficiency restructuring (2022–2023).
                    </p>
                    <p className="text-xs text-violet-200/70 leading-relaxed mb-1.5">
                      Full D8 empirical term is pending flag activation (calibrated on 47 target events,
                      AUC-ROC 0.76). Until the held-out validation gate clears, this proxy
                      prevents dangerously under-scored results for profitable hyperscalers with
                      very-high AI investment — a documented pattern where L1 and L2 are both low
                      (healthy company, no distress) but AI efficiency restructuring is underway.
                    </p>
                    <p className="text-xs text-violet-200/50 leading-relaxed mb-1">
                      This is NOT the validated D8 term. It is a named approximation disclosed here
                      for full transparency. The proxy fires only when:
                      company is a named hyperscaler + aiInvestmentSignal = very-high + L1 &lt; 0.45 (profitable).
                    </p>
                    <p className="text-xs text-violet-200/40 leading-relaxed">
                      Calibration note: proxy (+12 pts) is intentionally set 3 pts above D8&apos;s
                      maximum formula contribution (+9 pts at D8_value = 1.0). The 33% margin
                      compensates for the heuristic&apos;s inability to match the full logistic output
                      range. Proxy is suppressed when the EFFICIENCY cohort heuristic is already
                      firing D8 through the formula (which would otherwise double-count).
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Headcount consensus conflict disclosure.
              SPEC RULE: when agreement < 0.60, the Transparency tab MUST
              surface an explicit conflict notice. This is non-negotiable.
              The spec also says: "Never show a headcount figure without the
              source and the agreement score that produced it." */}
          {(() => {
            const cd = (companyData as any) ?? (result as any).companyData ?? (result._engineResult as any)?.companyData;
            const hc = cd?._headcountConsensus as {
              value: number | null;
              agreement: number;
              confidence: number;
              anchorSource: HeadcountSourceKey | null;
              contributingSources: HeadcountSourceKey[];
              rejectedSources: HeadcountSourceKey[];
              conflictDisclosure: boolean;
              perSource: Array<{
                source: HeadcountSourceKey;
                value: number;
                rejected: boolean;
                rejectionReason: 'ratio' | 'mad' | null;
                observedAt?: string;
              }>;
            } | undefined;

            if (!hc || hc.value == null) return null;

            const agreePct     = Math.round(hc.agreement * 100);
            const confPct      = Math.round(hc.confidence * 100);
            const anchorLabel  = hc.anchorSource ? (SOURCE_LABELS[hc.anchorSource] ?? hc.anchorSource) : 'unknown source';
            const isConflict   = hc.conflictDisclosure;
            const borderColor  = isConflict ? 'border-amber-500/30' : 'border-emerald-500/20';
            const bgColor      = isConflict ? 'bg-amber-500/08'     : 'bg-emerald-500/05';
            const headingColor = isConflict ? 'text-amber-300'      : 'text-emerald-300';
            const textColor    = isConflict ? 'text-amber-200/80'   : 'text-emerald-200/80';
            const Icon         = isConflict ? AlertTriangle         : Check;
            const iconColor    = isConflict ? 'text-amber-400'      : 'text-emerald-400';

            return (
              <div className={`mb-6 p-4 rounded-xl border ${borderColor} ${bgColor}`}>
                <div className="flex gap-3">
                  <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm mb-1.5 ${headingColor}`}>
                      {isConflict
                        ? 'Headcount Source Conflict'
                        : 'Headcount Consensus'}
                    </h4>

                    {/* Spec: never show a headcount figure without source + agreement. */}
                    <p className={`text-sm font-semibold mb-1.5 ${isConflict ? 'text-amber-200' : 'text-emerald-200'}`}>
                      {hc.value.toLocaleString()} employees
                      {' '}·{' '}anchor: {anchorLabel}
                      {' '}·{' '}agreement {agreePct}%
                      {' '}· confidence {confPct}%{' '}
                      <span
                        className="font-mono text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: isConflict ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.12)',
                          color: isConflict ? '#fbbf24' : '#34d399',
                        }}
                      >
                        MODELED
                      </span>
                    </p>

                    {isConflict && (
                      <p className={`text-xs ${textColor} leading-relaxed mb-2`}>
                        Agreement score {agreePct}% is below the {Math.round(AGREEMENT_CONFLICT_THRESHOLD * 100)}%
                        threshold. Sources disagree by more than ±15% of the consensus median.
                        The figure shown is the median of {hc.contributingSources.length} accepted
                        source{hc.contributingSources.length !== 1 ? 's' : ''} after
                        {hc.rejectedSources.length > 0
                          ? ` rejecting ${hc.rejectedSources.length} outlier${hc.rejectedSources.length !== 1 ? 's' : ''}.`
                          : ' no outlier rejection.'}
                        {' '}Treat it as an approximation — workforce-size signals should be
                        interpreted directionally, not as precise counts.
                      </p>
                    )}

                    {/* Per-source table */}
                    <div className="mt-2 space-y-1">
                      {hc.perSource.map((row) => {
                        const label = SOURCE_LABELS[row.source] ?? row.source;
                        const pct   = hc.value != null && hc.value > 0
                          ? Math.round(((row.value - hc.value) / hc.value) * 100)
                          : 0;
                        const pctStr = pct === 0 ? '±0%'
                          : pct > 0 ? `+${pct}%` : `${pct}%`;
                        const withinBand = Math.abs(pct) <= 15;
                        return (
                          <div
                            key={row.source}
                            className="flex items-center gap-2 text-xs"
                            style={{ opacity: row.rejected ? 0.45 : 1 }}
                          >
                            <span
                              className="font-mono w-2 h-2 rounded-full shrink-0"
                              style={{
                                background: row.rejected
                                  ? '#ef4444'
                                  : withinBand ? '#34d399' : '#f59e0b',
                              }}
                            />
                            <span className="text-[var(--text-secondary)] w-36 shrink-0 truncate">{label}</span>
                            <span className="font-semibold tabular-nums">{row.value.toLocaleString()}</span>
                            {!row.rejected && (
                              <span
                                className="font-mono"
                                style={{ color: withinBand ? '#34d399' : '#f59e0b' }}
                              >
                                {pctStr}
                              </span>
                            )}
                            {row.rejected && (
                              <span className="text-red-400 font-mono">
                                REJECTED ({row.rejectionReason === 'ratio' ? '>10× median' : 'MAD outlier'})
                              </span>
                            )}
                            {row.observedAt && (
                              <span className="text-[var(--text-muted)] ml-auto shrink-0">
                                {new Date(row.observedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {hc.contributingSources.length > 0 && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-2 leading-relaxed">
                        Weighted by source reliability: SEC EDGAR 1.00 · Yahoo Finance 0.92 ·
                        Wikipedia 0.78 · LinkedIn 0.55 · Intelligence DB 0.40 · Career page 0.30.
                        Outlier rule: any source reporting &gt;10× the median is unconditionally
                        rejected before MAD z-score classification.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Live Hiring Signal → L3 Adjustment
              Shows exactly how Naukri/Serper postingTrend moved L3.
              Spec: "Live hiring data that affects only display but not scoring
              is decorative. It must mechanically affect the score." This panel
              makes the mechanical effect visible in the Transparency tab. */}
          {(() => {
            const cd = (companyData as any) ?? (result as any).companyData ?? (result._engineResult as any)?.companyData;
            const postingTrend = cd?._hiringPostingTrend as string | undefined;
            const isLive       = cd?._hiringIsLive === true;
            const freezeScore  = cd?._hiringFreezeScore as number | undefined;
            const openings     = cd?._estimatedRoleOpenings as number | null | undefined;
            const naukriOpenings   = cd?._naukriOpenings as number | null | undefined;
            const linkedinOpenings = cd?._linkedinOpenings as number | null | undefined;
            const disclosure   = cd?._hiringDisclosure as string | undefined;
            // v41+: geographic market whose job-board connectors ran
            const hiringMarketRaw = cd?._hiringMarket as string | null | undefined;
            // Also check result.hiringSignal.hiringMarket as a secondary source
            const hiringMarket = hiringMarketRaw ?? (result as any).hiringSignal?.hiringMarket ?? null;

            if (!postingTrend || postingTrend === 'unknown') return null;

            const L3_DELTA: Record<string, number> = {
              frozen: 0.12, declining: 0.06, growing: -0.05, stable: 0,
            };
            const delta    = isLive ? (L3_DELTA[postingTrend] ?? 0) : 0;
            const hasDelta = delta !== 0;

            const TREND_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
              frozen:   { label: 'Frozen',   color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.30)',   icon: <Zap className="w-4 h-4" style={{ color: '#ef4444' }} /> },
              declining:{ label: 'Declining', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.30)', icon: <TrendingDown className="w-4 h-4" style={{ color: '#f97316' }} /> },
              stable:   { label: 'Stable',   color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.20)', icon: <Minus className="w-4 h-4" style={{ color: '#94a3b8' }} /> },
              growing:  { label: 'Growing',  color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.28)',  icon: <TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} /> },
            };
            const meta = TREND_META[postingTrend] ?? TREND_META['stable'];

            return (
              <div
                className="mb-6 p-4 rounded-xl"
                style={{ border: `1px solid ${meta.border}`, background: meta.bg }}
              >
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5">{meta.icon}</div>
                  <div className="flex-1 min-w-0">

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm" style={{ color: meta.color }}>
                        Live Hiring Signal — L3 Adjustment
                      </h4>
                      {isLive ? (
                        <span
                          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}
                        >
                          LIVE
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}
                        >
                          HEURISTIC
                        </span>
                      )}
                      {hiringMarket && (
                        <span
                          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
                          title={`Job-board connectors routed to the ${hiringMarket} hiring market`}
                        >
                          {hiringMarket.toUpperCase()} market
                        </span>
                      )}
                    </div>

                    {/* Core signal row */}
                    <div className="flex flex-wrap gap-4 mb-2 text-sm">
                      <span>
                        <span className="text-[var(--text-secondary)] text-xs">Posting trend </span>
                        <span className="font-semibold font-mono" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </span>
                      {hasDelta && isLive && (
                        <span>
                          <span className="text-[var(--text-secondary)] text-xs">L3 adjustment </span>
                          <span
                            className="font-semibold font-mono"
                            style={{ color: delta > 0 ? '#ef4444' : '#10b981' }}
                          >
                            {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-1">
                            (mechanical — not decorative)
                          </span>
                        </span>
                      )}
                      {!isLive && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          No L3 adjustment — heuristic data excluded from scoring
                        </span>
                      )}
                    </div>

                    {/* Opening counts */}
                    {isLive && (
                      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)] mb-2">
                        {openings != null && (
                          <span>Estimated openings: <span className="font-semibold text-white/80">{openings}</span></span>
                        )}
                        {naukriOpenings != null && (
                          <span>Naukri: <span className="font-semibold text-white/80">{naukriOpenings}</span></span>
                        )}
                        {linkedinOpenings != null && (
                          <span>LinkedIn: <span className="font-semibold text-white/80">{linkedinOpenings}</span></span>
                        )}
                        {freezeScore != null && (
                          <span>Freeze score: <span className="font-semibold" style={{ color: freezeScore >= 0.75 ? '#ef4444' : freezeScore >= 0.5 ? '#f97316' : '#94a3b8' }}>{(freezeScore * 100).toFixed(0)}%</span></span>
                        )}
                      </div>
                    )}

                    {/* L3 delta table */}
                    {isLive && hasDelta && (
                      <div
                        className="text-xs rounded-lg px-3 py-2 mb-2 font-mono"
                        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <span className="text-[var(--text-muted)]">
                          frozen +0.12 · declining +0.06 · stable 0 · growing −0.05
                        </span>
                        <span className="ml-3 font-semibold" style={{ color: meta.color }}>
                          Applied: {postingTrend} → {delta > 0 ? '+' : ''}{delta.toFixed(2)} on L3
                        </span>
                      </div>
                    )}

                    {/* Heuristic disclosure */}
                    {!isLive && disclosure && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {disclosure}
                      </p>
                    )}

                  </div>
                </div>
              </div>
            );
          })()}

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
          <CalibrationFreshnessPanel
            calibrationCoverage={(result as any).calibrationCoverage}
            holdoutValidation={holdoutValidation}
          />

          {/* v40.0: Constant provenance chip — shows uncalibrated_placeholder count */}
          {(uncalibratedCount > 0 || totalConstantCount > 0) && (
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/6 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-300 mb-1">
                    {uncalibratedCount} of {totalConstantCount || '42+'} scoring constants are unvalidated estimates
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    These constants carry <span className="text-amber-400 font-medium">uncalibrated_placeholder</span> provenance —
                    they are developer estimates that have not yet been validated through logistic regression on outcome data.
                    Any score component that depends on them is labeled <span className="font-mono text-amber-300">(estimate)</span> in the UI.
                    Validated constants ({regressionCoveragePct}%) are derived from regression on {' '}
                    {(result as any).calibrationCoverage != null
                      ? `${Math.round((result as any).calibrationCoverage * 100)}% of formula weight`
                      : 'the primary outcome dataset'}.
                  </p>
                  {uncalibratedKeys.length > 0 && (
                    <details className="group">
                      <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1">
                        <span className="group-open:hidden">▶</span>
                        <span className="hidden group-open:inline">▼</span>
                        {uncalibratedKeys.length} unvalidated constant{uncalibratedKeys.length !== 1 ? 's' : ''}
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {uncalibratedKeys.map(k => (
                          <span key={k} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                            {k}
                          </span>
                        ))}
                      </div>
                    </details>
                  )}
                  {provenanceSummary && (
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
                      <span><span className="text-emerald-400 font-medium">{provenanceSummary.regressionCount}</span> regression</span>
                      <span><span className="text-sky-400 font-medium">{provenanceSummary.gridSearchCount}</span> grid-search</span>
                      <span><span className="text-violet-400 font-medium">{provenanceSummary.manualSeedCount}</span> expert estimate</span>
                      <span><span className="text-amber-400 font-medium">{provenanceSummary.uncalibratedCount}</span> unvalidated</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* v8.0: Per-dimension calibration status with backtester */}
        <div className="mb-6">
          <SectionHeader
            title="Formula Weight Validation"
            description="Validation status for each of the 10 scoring formula weights. Shows which are regression-derived vs developer estimates."
          />
          <DimensionCalibrationPanel />
        </div>

        {/* v40.0: Effective layer weights after calibration composition (Principle 1 disclosure) */}
        <div className="mb-6">
          <SectionHeader
            title="Effective Layer Weights"
            description="What each layer actually contributes to your score after global calibration multipliers and segment adjustments are applied. Formula weights (e.g. L1=30%) are not the effective contribution — calibration composition changes the share."
          />
          <EffectiveWeightsPanel
            segmentCalibration={(result as any).segmentCalibration}
            d8FlagActive={(result as any).d8FlagActive}
            d8HeuristicActive={(result as any).d8HeuristicActive}
            d8EffectiveWeight={(result as any).d8EffectiveWeight}
            d8WeightRedistributed={(result as any).d8WeightRedistributed}
            d8RedistributedBumpPerDimension={(result as any).d8RedistributedBumpPerDimension}
            l1EstimatedFromSector={(result as any).l1EstimatedFromSector}
            l1SectorBaseline={(result as any).l1SectorBaseline}
          />
        </div>

        {/* v40.0: Sector × Region L4 stability multiplier — banking + telecom × CA/US/UK/EU */}
        {(() => {
          const srAdj =
            (result as any).sectorRegionStabilityAdjustment ??
            (result._engineResult as any)?.sectorRegionStabilityAdjustment;
          if (!srAdj) return null;
          const deltaPct = Math.round((srAdj.multiplier - 1.0) * 100);
          const isLower = srAdj.multiplier < 1.0;
          return (
            <div className="mb-6">
              <SectionHeader
                title="Sector × Region Stability"
                description="An L4 calibration multiplier applied when company.region AND company.industry match a known sector-region stability profile (banking + telecom × CA/US/UK/EU)."
              />
              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground opacity-60 font-semibold">
                    Applied multiplier
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    {srAdj.key}
                  </span>
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded font-semibold"
                    style={{
                      background: isLower ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
                      color:      isLower ? '#34d399' : '#fbbf24',
                      borderColor: isLower ? 'rgba(16,185,129,0.30)' : 'rgba(245,158,11,0.30)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    ×{srAdj.multiplier.toFixed(2)} ({isLower ? '−' : '+'}{Math.abs(deltaPct)}%)
                  </span>
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground opacity-50 font-medium">
                    {srAdj.labeledAs}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                  {srAdj.disclosure}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground opacity-60 font-mono">
                  <span>L4 baseline before: {srAdj.baselineBefore.toFixed(3)}</span>
                  <span>→</span>
                  <span style={{ color: isLower ? '#34d399' : '#fbbf24' }}>
                    after: {srAdj.baselineAfter.toFixed(3)}
                  </span>
                  <span className="ml-auto">provenance: {srAdj.provenance}</span>
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* Parent-Subsidiary Propagation — shown when company is a known subsidiary */}
        {(result as any).parentPropagation && (
          <div className="mb-6">
            <SectionHeader
              title="Parent Company Propagation Analysis"
              description="How layoff signals from the parent company propagate to this office — modeled by office function, entity dependence, and local employment law. ESTIMATED from documented 2022–2026 restructuring patterns."
            />
            <ParentPropagationPanel propagation={(result as any).parentPropagation} />
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
              overlapScore={result.patternMatchOverlapScore ?? undefined}
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

        {/* v40.0: Per-signal decay weights — shows how each signal's age reduces its scoring weight */}
        {result.signalDecayWeights && (
          <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-slate-200">Signal Freshness Decay</h4>
              <span className="ml-auto text-xs text-slate-500">weight × age → effective formula contribution</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Each signal type has an empirically derived half-life. A breaking news layoff announcement
              decays to 50% predictive weight in 3 days. Revenue figures decay in 90 days.
              Decayed weights are renormalised so the formula budget stays at 100%.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { label: 'Stock 90d change', key: 'stock',         halfLife: '7d',  color: result.signalDecayWeights.stock         >= 0.7 ? 'text-emerald-400' : result.signalDecayWeights.stock         >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                  { label: 'Revenue growth',   key: 'revenue',       halfLife: '90d', color: result.signalDecayWeights.revenue       >= 0.7 ? 'text-emerald-400' : result.signalDecayWeights.revenue       >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                  { label: 'Layoff history',   key: 'layoffHistory', halfLife: '30d', color: result.signalDecayWeights.layoffHistory >= 0.7 ? 'text-emerald-400' : result.signalDecayWeights.layoffHistory >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                  { label: 'Hiring trend',     key: 'hiring',        halfLife: '10d', color: result.signalDecayWeights.hiring        >= 0.7 ? 'text-emerald-400' : result.signalDecayWeights.hiring        >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                  { label: 'Sector contagion', key: 'sector',        halfLife: '21d', color: result.signalDecayWeights.sector        >= 0.7 ? 'text-emerald-400' : result.signalDecayWeights.sector        >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                  { label: 'Breaking news',    key: 'breakingNews',  halfLife: '3d',  color: result.signalDecayWeights.breakingNews  >= 0.7 ? 'text-emerald-400' : result.signalDecayWeights.breakingNews  >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                  { label: 'L1 (composite)',   key: 'L1_effective',  halfLife: 'max(stock, rev×0.6)', color: result.signalDecayWeights.L1_effective >= 0.7 ? 'text-emerald-400' : result.signalDecayWeights.L1_effective >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                  { label: 'D7 (composite)',   key: 'D7_effective',  halfLife: 'avg(stock, layoff)', color: result.signalDecayWeights.D7_effective >= 0.7 ? 'text-emerald-400' : result.signalDecayWeights.D7_effective >= 0.4 ? 'text-amber-400' : 'text-red-400' },
                ] as const
              ).map(({ label, key, halfLife, color }) => {
                const w = result.signalDecayWeights![key];
                const pct = Math.round(w * 100);
                return (
                  <div key={key} className="rounded-lg bg-slate-900/50 border border-slate-700/30 p-3">
                    <div className="text-xs text-slate-400 mb-1 truncate">{label}</div>
                    <div className={`text-lg font-bold tabular-nums ${color}`}>{pct}%</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1">t½ {halfLife}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-600 mt-3">
              Formula: weight = max(floor, e^(−ln2/t½ × age)). Floors: breaking news 10%, stock 15%, hiring 15%, layoff history 25%, revenue 30%, sector 20%, exec departure 20%.
            </p>
          </div>
        )}

        {/* Data freshness: live signal coverage bar + static fallback badge */}
        <div className="mt-6">
          <DataFreshnessPanel
            dataFreshnessScore={(result as any)._dataFreshnessScore}
            reconciliationSummary={(result as any).reconciliationSummary}
            lastUpdated={(result as any).companyData?.lastUpdated}
            staleDb={(result as any).companyData?._staleDb}
            dbAgeDays={(result as any).companyData?._ageDays}
            liveUnavailableFloor={(result as any).signalQuality?._liveUnavailableFloor ?? null}
            dbReliabilityTier={(result as any).signalQuality?._dbReliabilityTier ?? null}
            scrapeJobQueueTimeMs={(result as any)._scrapeJobQueueTimeMs ?? null}
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
            <ModelCalibrationPanel
              calibration={(result as any).modelCalibration}
              liveCalibrationStatus={liveCalibStatus}
            />
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

        {/* v40.0: Conformal Prediction Interval — per-cohort calibration with pool-up disclosure */}
        {result.conformalBundle && result.conformalBundle.source !== 'no_data' && (
          <div className="mt-6">
            <ConformalCIPanel bundle={result.conformalBundle} />
          </div>
        )}

        {/* CI widening sources — three independent factors that expand the uncertainty interval */}
        <div className="mt-2">
          <CIWideningSourcesPanel
            dataFreshness={result.dataFreshness}
            signalQuality={result.signalQuality}
            ciRange={result.confidenceInterval
              ? (result.confidenceInterval.range ?? (result.confidenceInterval.high - result.confidenceInterval.low))
              : 0}
          />
        </div>

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
