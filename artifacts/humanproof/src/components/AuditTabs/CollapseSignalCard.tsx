// CollapseSignalCard.tsx
// Renders Stage 1-3 collapse prediction for a company inside CompanyProfileTab.
// Calls detectCollapseStage() from collapsePredictor.ts and shows signal list + watchlist CTA.

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldCheck, Eye, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  detectCollapseStage,
  addToWatchList,
  getWatchList,
  type CollapseReport,
  type CollapseInputs,
} from "../../services/collapsePredictor";

interface CollapseSignalCardProps {
  companyName: string;
  industry: string;
  roleTitle: string;
  stock90dChange: number | null;
  aiInvestmentSignal: string;
  layoffRounds: number;
  mostRecentLayoffDate: string | null;
  filingDelinquent?: boolean;
  /** v4.0: User's department for personalised cut probability */
  userDepartment?: string;
}

const STAGE_CONFIG = {
  1: { label: "Stage 1 — Early Warning",  color: "var(--amber)",  bg: "bg-amber-500/10",   border: "border-amber-500/30"  },
  2: { label: "Stage 2 — Active Risk",    color: "var(--orange)", bg: "bg-orange-500/10",  border: "border-orange-500/30" },
  3: { label: "Stage 3 — Imminent Risk",  color: "var(--red)",    bg: "bg-red-500/10",     border: "border-red-500/30"    },
} as const;

export const CollapseSignalCard: React.FC<CollapseSignalCardProps> = ({
  companyName,
  industry,
  roleTitle,
  stock90dChange,
  aiInvestmentSignal,
  layoffRounds,
  mostRecentLayoffDate,
  filingDelinquent = false,
  userDepartment,
}) => {
  const [report, setReport] = useState<CollapseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    const inputs: CollapseInputs = {
      companyName,
      industry,
      roleTitle,
      stock90dChange,
      aiInvestmentSignal,
      layoffRounds,
      mostRecentLayoffDate,
      filingDelinquent,
      userDepartment, // v4.0: pass for department-level analysis
    };

    detectCollapseStage(inputs)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));

    // Check if already watching
    const list = getWatchList();
    setWatching(list.some(w => w.companyName.toLowerCase() === companyName.toLowerCase()));
  }, [companyName]);

  const handleWatch = () => {
    addToWatchList(companyName, industry, report?.stage ?? null);
    setWatching(true);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-5 bg-muted border rounded-lg text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Scanning for collapse signals…
      </div>
    );
  }

  if (!report) return null;

  const stageConf = report.stage ? STAGE_CONFIG[report.stage] : null;
  // Fallback colour for the score badge when overallRisk > 0 but no Stage
  // 1–3 was assigned (e.g. signals tripped sub-threshold totals). Previously
  // the code used `stageConf!.color` which crashed with "Cannot read
  // properties of null (reading 'color')". We pick a colour from overallRisk
  // so the badge stays informative even outside the named stages.
  const fallbackColor =
    report.overallRisk >= 70 ? "var(--red, #ef4444)"
    : report.overallRisk >= 40 ? "var(--orange, #f59e0b)"
    : report.overallRisk >= 15 ? "var(--amber, #fbbf24)"
    : "var(--green, #10b981)";
  const badgeColor = stageConf?.color ?? fallbackColor;
  const allSignals = [...report.stage1Signals, ...report.stage2Signals, ...report.stage3Signals];
  const activeSignals = allSignals.filter(s => s.detected);

  return (
    <div className={`rounded-xl border ${stageConf ? stageConf.border : "border-emerald-500/30"} ${stageConf ? stageConf.bg : "bg-emerald-500/10"} overflow-hidden`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {report.stage ? (
              <AlertTriangle className="w-5 h-5" style={{ color: badgeColor }} />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            )}
            <div>
              <div className="font-bold text-sm tracking-tight flex items-center gap-2 flex-wrap">
                {/* stageLabel already contains the promoted qualifier when isPromoted=true
                    e.g. "Stage 2 — partial evidence (1/3 Stage 2, 2/3 Stage 1)" */}
                {report.stageLabel ?? (stageConf?.label ?? "No Collapse Signals Detected")}
                {/* Promoted badge — shown when cross-stage rule promoted the stage */}
                {report.isPromoted && report.stage && (
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest"
                    style={{ background: `${badgeColor}22`, color: badgeColor }}
                    title="Stage promoted from cross-stage evidence — single higher-stage signal confirmed by multiple lower-stage signals"
                  >
                    PROMOTED
                  </span>
                )}
              </div>
              {report.stage && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Estimated timeframe: {report.timeToCollapseRange}
                  {report.signalConfidence !== undefined && (
                    <span className="ml-2 opacity-60">
                      · {report.signalConfidence >= 0.67 ? 'high' : report.signalConfidence >= 0.33 ? 'moderate' : 'low'} confidence
                    </span>
                  )}
                </div>
              )}
              {/* Suppressed stage disclosure */}
              {!report.stage && report.suppressedStage && (
                <div className="text-[10px] text-amber-400/70 mt-0.5">
                  Stage {report.suppressedStage} signals present but below confidence threshold
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Risk score badge — uses badgeColor so it renders even when no
                Stage 1–3 has been assigned but overallRisk is still > 0. */}
            {report.overallRisk > 0 && (
              <span
                className="text-xs font-black px-2 py-0.5 rounded"
                style={{ backgroundColor: `${badgeColor}22`, color: badgeColor }}
              >
                {report.overallRisk}/100
              </span>
            )}

            <button
              onClick={() => setExpanded(v => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle signals"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Recommendation */}
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          {report.recommendation}
        </p>

        {/* v4.0: Department-level cut probability breakdown */}
        {report.stage && report.stage >= 2 && report.departmentRisks && report.departmentRisks.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/8">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Department Risk Distribution
            </div>
            <div className="space-y-1.5">
              {report.departmentRisks.slice(0, 5).map(dept => {
                const barColor = dept.freezeScore >= 80 ? '#ef4444'
                  : dept.freezeScore >= 55 ? '#f97316'
                  : dept.freezeScore >= 30 ? '#f59e0b'
                  : '#10b981';
                return (
                  <div key={dept.department} className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-semibold truncate"
                      style={{ width: 110, color: dept.isUserDepartment ? barColor : 'var(--text-3)', fontWeight: dept.isUserDepartment ? 800 : 400 }}
                    >
                      {dept.isUserDepartment ? '→ ' : ''}{dept.department}
                    </span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div style={{ width: `${dept.freezeScore}%`, height: '100%', background: barColor, borderRadius: 'inherit' }} />
                    </div>
                    <span className="text-[9px] font-mono font-bold" style={{ color: barColor, width: 32, textAlign: 'right' }}>
                      {dept.freezeScore}%
                    </span>
                  </div>
                );
              })}
            </div>
            {report.userDepartmentFreezeScore !== null && report.userDepartmentFreezeScore !== undefined && (
              <p className="text-[10px] text-muted-foreground mt-2 opacity-70">
                Your department ({userDepartment}) freeze score: {report.userDepartmentFreezeScore}%
              </p>
            )}
          </div>
        )}

        {/* Watch CTA */}
        {!watching ? (
          <button
            onClick={handleWatch}
            className="mt-3 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Watch {companyName} for alerts
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500">
            <Eye className="w-3.5 h-3.5" />
            Watching {companyName}
          </div>
        )}
      </div>

      {/* Expandable signal list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="p-5 space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Signal Detail — {report.activeSignalCount} active / {allSignals.length} total
              </div>
              {allSignals.map((sig, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg text-xs ${
                    sig.detected
                      ? "bg-white/5 border border-white/10"
                      : "opacity-40"
                  }`}
                >
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      !sig.detected
                        ? "bg-muted"
                        : sig.severity === "strong"
                          ? "bg-red-500"
                          : sig.severity === "moderate"
                            ? "bg-amber-500"
                            : "bg-cyan-500"
                    }`}
                  />
                  <div>
                    <div className="font-semibold">{sig.name}</div>
                    <div className="text-muted-foreground mt-0.5">{sig.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollapseSignalCard;
