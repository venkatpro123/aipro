/**
 * JobTargetPanel.tsx — v45.0
 *
 * Displays specific company targets from jobTargetingEngine.ts.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Clock, Copy, CheckCheck, AlertCircle, Building2,
  ChevronDown, ChevronUp, TrendingUp, Timer, Users, Zap
} from "lucide-react";
import type { JobTargetingResult, JobTarget } from "@/services/jobTargetingEngine";

interface JobTargetPanelProps {
  targeting: JobTargetingResult;
  className?: string;
}

function MatchScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#3b82f6' : '#f59e0b';
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Moderate';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{ background: `${color}18`, color }}>
        {score}
      </div>
      <span className="text-xs" style={{ color }}>{label}</span>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: JobTargetingResult['searchUrgency'] }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    start_today:      { label: 'Start today',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
    start_this_week:  { label: 'This week',     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    start_this_month: { label: 'This month',    color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
    steady_monitoring:{ label: 'Monitoring',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  };
  const c = config[urgency] ?? config.steady_monitoring;
  return (
    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
      style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  );
}

function CompanyTargetCard({ target, index }: { target: JobTarget; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyTemplate = async () => {
    if (!target.linkedinApproachTemplate) return;
    try {
      await navigator.clipboard.writeText(target.linkedinApproachTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const accentColor = target.matchScore >= 85 ? '#10b981' : target.matchScore >= 70 ? '#3b82f6' : '#f59e0b';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: `${accentColor}15`, color: accentColor }}>
              {(target.displayName[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-[var(--alpha-text-85)] text-sm">{target.displayName}</div>
              <div className="text-xs text-[var(--alpha-text-40)]">{target.industry} · {target.companyStage}</div>
            </div>
          </div>
          <MatchScoreBadge score={target.matchScore} />
        </div>

        {/* Match reasons */}
        <div className="space-y-1.5 mb-3">
          {target.matchReasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: accentColor }} />
              <span className="text-xs text-[var(--alpha-text-60)]">{reason}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Timer className="w-3 h-3 text-[var(--alpha-text-25)]" />
            <span className="text-xs text-[var(--alpha-text-50)]">{target.averageTimeToOffer} avg offer</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-[var(--alpha-text-25)]" />
            <span className="text-xs text-[var(--alpha-text-50)]">{target.employeeCount} employees</span>
          </div>
          <div className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-[var(--alpha-text-25)]" />
            <span className="text-xs text-[var(--alpha-text-50)]">{target.remotePolicy.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Primary action */}
        <div className="mt-3 px-3 py-2 rounded-lg"
          style={{ background: `${accentColor}0D`, border: `1px solid ${accentColor}25` }}>
          <div className="flex items-start gap-1.5">
            <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
            <p className="text-xs text-[var(--alpha-text-78)]">{target.channelRationale}</p>
          </div>
        </div>

        {/* Expand button */}
        {(target.linkedinApproachTemplate || target.interviewFocusAreas.length > 0) && (
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2.5 text-xs text-[var(--alpha-text-35)] hover:text-[var(--alpha-text-55)] transition-colors">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide outreach tools' : 'Show outreach template + interview focus'}
          </button>
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pt-0 pb-3.5 space-y-3"
              style={{ borderTop: '1px solid var(--alpha-bg-06)' }}>
              {target.linkedinApproachTemplate && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[var(--alpha-text-50)] uppercase tracking-wide">LinkedIn Outreach Template</span>
                    <button onClick={copyTemplate}
                      className="flex items-center gap-1 text-[10px] text-[var(--alpha-text-35)] hover:text-[var(--alpha-text-55)] transition-colors">
                      {copied
                        ? <><CheckCheck className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                        : <><Copy className="w-3 h-3" /><span>Copy</span></>
                      }
                    </button>
                  </div>
                  <div className="text-xs text-[var(--alpha-text-60)] leading-relaxed whitespace-pre-wrap rounded-lg p-2.5"
                    style={{ background: 'var(--alpha-bg-04)', fontFamily: 'monospace' }}>
                    {target.linkedinApproachTemplate}
                  </div>
                </div>
              )}

              {target.interviewFocusAreas.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-[var(--alpha-text-50)] uppercase tracking-wide">Interview Focus</span>
                  <ul className="mt-1.5 space-y-1">
                    {target.interviewFocusAreas.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0 text-[var(--alpha-text-25)]" />
                        <span className="text-xs text-[var(--alpha-text-55)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {target.cautions && target.cautions.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-amber-400/60 uppercase tracking-wide">Verify before applying</span>
                  {target.cautions.map((c, i) => (
                    <p key={i} className="text-xs text-[var(--alpha-text-45)] mt-1">· {c}</p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const JobTargetPanel: React.FC<JobTargetPanelProps> = ({ targeting, className = '' }) => {
  const [showAvoidList, setShowAvoidList] = useState(false);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Strategy header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4"
        style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--alpha-text-85)]">Targeted Job Search</div>
              <div className="text-xs text-[var(--alpha-text-45)]">Specific companies matched to your profile</div>
            </div>
          </div>
          <UrgencyBadge urgency={targeting.searchUrgency} />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--alpha-text-25)]" />
            <span className="text-xs text-[var(--alpha-text-55)]">
              Est. search: <span className="text-[var(--alpha-text-78)] font-medium">{targeting.estimatedSearchDuration}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[var(--alpha-text-25)]" />
            <span className="text-xs text-[var(--alpha-text-55)]">
              <span className="text-[var(--alpha-text-78)] font-medium">{targeting.targets.length}</span> target companies
            </span>
          </div>
        </div>

        {targeting.strategyRecommendation && (
          <p className="mt-2.5 text-xs text-[var(--alpha-text-60)] leading-relaxed border-t border-[var(--alpha-bg-07)] pt-2.5">
            {targeting.strategyRecommendation}
          </p>
        )}

        {targeting.marketSummary && (
          <p className="mt-1.5 text-xs text-[var(--alpha-text-40)] leading-relaxed italic">{targeting.marketSummary}</p>
        )}
      </motion.div>

      {/* Company cards */}
      <div className="space-y-2.5">
        {targeting.targets.map((target, i) => (
          <CompanyTargetCard key={target.companyName} target={target} index={i} />
        ))}
      </div>

      {/* Avoid list */}
      {targeting.avoidList && targeting.avoidList.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl overflow-hidden"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <button
            onClick={() => setShowAvoidList(!showAvoidList)}
            className="flex items-center justify-between w-full px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400/70" />
              <span className="text-sm text-[var(--alpha-text-70)] font-medium">
                {targeting.avoidList.length} companies to avoid (layoff wave contagion)
              </span>
            </div>
            {showAvoidList ? <ChevronUp className="w-4 h-4 text-[var(--alpha-text-25)]" /> : <ChevronDown className="w-4 h-4 text-[var(--alpha-text-25)]" />}
          </button>

          <AnimatePresence>
            {showAvoidList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3">
                  <p className="text-xs text-[var(--alpha-text-45)] mb-2 leading-relaxed">
                    These companies are in the same layoff wave as your current employer — compounded risk if you join them now.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {targeting.avoidList.map(company => (
                      <span key={company} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(239,68,68,0.10)', color: 'rgba(239,68,68,0.70)' }}>
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default JobTargetPanel;
