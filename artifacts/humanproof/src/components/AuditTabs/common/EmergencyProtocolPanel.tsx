// EmergencyProtocolPanel.tsx — v13.0
// 72-hour crisis response panel. Shown in OverviewTab when score ≥ 80 or collapseStage ≥ 2.

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, Shield } from "lucide-react";
import type { EmergencyResponseResult } from "@/services/emergencyResponseProtocol";
import type { ActionTimeboxLabel } from "@/services/emergencyResponseProtocol";

interface EmergencyProtocolPanelProps {
  emergency: EmergencyResponseResult;
}

const TIMEBOX_COLORS: Record<ActionTimeboxLabel, string> = {
  '0–4h':   '#ef4444',
  '4–24h':  '#f97316',
  '24–48h': '#f59e0b',
  '48–72h': '#00d4e0',
};

const TIMEBOX_LABELS: Record<ActionTimeboxLabel, string> = {
  '0–4h':   'Hour 0–4',
  '4–24h':  'Hour 4–24',
  '24–48h': 'Day 2',
  '48–72h': 'Day 3',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  information:       <Clock className="w-3 h-3" />,
  documentation:    <Shield className="w-3 h-3" />,
  career_materials: <AlertTriangle className="w-3 h-3" />,
  financial:        <AlertTriangle className="w-3 h-3" />,
  network:          <AlertTriangle className="w-3 h-3" />,
  legal:            <Shield className="w-3 h-3" />,
  market_entry:     <AlertTriangle className="w-3 h-3" />,
};

const EmergencyProtocolPanel: React.FC<EmergencyProtocolPanelProps> = ({ emergency }) => {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedBoxes, setExpandedBoxes] = useState<Set<ActionTimeboxLabel>>(new Set(['0–4h', '4–24h']));
  const [showSeverance, setShowSeverance] = useState(false);

  if (!emergency.isActive) return null;

  const toggle = (id: string) => setCompletedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleBox = (box: ActionTimeboxLabel) => setExpandedBoxes(prev => {
    const next = new Set(prev); next.has(box) ? next.delete(box) : next.add(box); return next;
  });

  const timeboxes: ActionTimeboxLabel[] = ['0–4h', '4–24h', '24–48h', '48–72h'];
  const completedCount = emergency.actions.filter(a => completedIds.has(a.id)).length;
  const progressPct = Math.round((completedCount / emergency.totalActions) * 100);

  const tierColor = emergency.protocolTier === 'CRITICAL' ? '#ef4444' : '#f97316';

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${tierColor}35`, background: `${tierColor}08` }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${tierColor}18`, border: `1px solid ${tierColor}35` }}>
            <AlertTriangle className="w-4.5 h-4.5" style={{ color: tierColor }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black tracking-widest" style={{ color: tierColor }}>
                {emergency.protocolTier === 'CRITICAL' ? 'URGENT' : emergency.protocolTier} — YOUR NEXT 72 HOURS
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {emergency.keyMessage}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {completedCount}/{emergency.totalActions} actions
            </span>
            <span className="text-xs font-semibold" style={{ color: tierColor }}>{progressPct}%</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div className="h-full rounded-full" style={{ background: tierColor }}
              animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      </div>

      {/* Timebox groups */}
      <div className="px-4 pb-4 space-y-2">
        {timeboxes.map(box => {
          const boxActions = emergency.actions.filter(a => a.timebox === box);
          if (boxActions.length === 0) return null;
          const boxColor = TIMEBOX_COLORS[box];
          const expanded = expandedBoxes.has(box);
          const boxCompleted = boxActions.filter(a => completedIds.has(a.id)).length;

          return (
            <div key={box} className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${boxColor}20`, background: `${boxColor}05` }}>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-left"
                onClick={() => toggleBox(box)}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: boxColor }} />
                <span className="text-xs font-semibold flex-1" style={{ color: boxColor }}>{TIMEBOX_LABELS[box]}</span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {boxCompleted}/{boxActions.length}
                </span>
                {expanded ? <ChevronDown className="w-3 h-3 opacity-40" /> : <ChevronRight className="w-3 h-3 opacity-40" />}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    transition={{ duration: 0.18 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2">
                      {boxActions.map(action => (
                        <div key={action.id}
                          className="flex gap-2.5 cursor-pointer group"
                          onClick={() => toggle(action.id)}>
                          <div className="mt-0.5 flex-shrink-0">
                            {completedIds.has(action.id)
                              ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                              : <Circle className="w-3.5 h-3.5 opacity-25 group-hover:opacity-50 transition-opacity" />
                            }
                          </div>
                          <div>
                            <p className="text-xs font-medium leading-snug" style={{
                              color: completedIds.has(action.id) ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
                              textDecoration: completedIds.has(action.id) ? 'line-through' : 'none',
                            }}>
                              {action.title}
                            </p>
                            {action.specificScript && (
                              <div className="mt-1.5 p-2 rounded-lg text-[10px] leading-relaxed"
                                style={{ background: `${boxColor}10`, color: 'rgba(255,255,255,0.55)', border: `1px solid ${boxColor}15` }}>
                                {action.specificScript}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Severance strategy */}
      <div className="mx-4 mb-4 rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        <button className="w-full flex items-center justify-between px-3 py-2.5 text-left"
          onClick={() => setShowSeverance(s => !s)}>
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Severance Negotiation Strategy
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
              background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)',
            }}>
              {emergency.severanceStrategy.negotiabilityLevel.toUpperCase()} leverage
            </span>
            {showSeverance ? <ChevronDown className="w-3.5 h-3.5 opacity-40" /> : <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
          </div>
        </button>

        <AnimatePresence>
          {showSeverance && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              transition={{ duration: 0.18 }} className="overflow-hidden">
              <div className="px-3 pb-3 space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <p>
                  <span className="font-semibold" style={{ color: '#f59e0b' }}>Typical severance: </span>
                  {emergency.severanceStrategy.typicalSeveranceWeeks} weeks
                </p>
                <div>
                  <p className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>First move:</p>
                  <p className="leading-relaxed p-2 rounded-lg" style={{ background: 'rgba(0,212,224,0.08)', border: '1px solid rgba(0,212,224,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                    {emergency.severanceStrategy.firstNegotiationMove}
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: '#ef4444' }}>Red lines (never do):</p>
                  <ul className="space-y-0.5">
                    {emergency.severanceStrategy.redLines.map((r) => (
                      <li key={r.slice(0, 32)} className="flex gap-1.5">
                        <span style={{ color: '#ef4444' }}>×</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EmergencyProtocolPanel;
