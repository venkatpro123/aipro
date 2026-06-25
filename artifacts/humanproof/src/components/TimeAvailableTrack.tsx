// TimeAvailableTrack.tsx
// "How many hours per week can you invest?" — The filter that makes
// the action plan realistic instead of aspirational.
// Three tracks with time estimates grounded in learning-curve research.

import React from "react";
import { motion } from "framer-motion";
import { Clock, Zap, Target, Shield } from "lucide-react";

export type TrackType = "minimal" | "moderate" | "intensive";

export interface TrackConfig {
  type: TrackType;
  label: string;
  hoursPerWeek: number;
  icon: React.ReactNode;
  color: string;
  description: string;
  maxActions: number;
  weeklySchedule?: string;
}

export const TRACKS: Record<TrackType, TrackConfig> = {
  minimal: {
    type: "minimal",
    label: "Minimal",
    hoursPerWeek: 2,
    icon: <Shield className="w-4 h-4" />,
    color: "var(--cyan)",
    description: "2 hrs/week — highest ROI per hour only",
    maxActions: 2,
    weeklySchedule: "30 min on 4 days",
  },
  moderate: {
    type: "moderate",
    label: "Moderate",
    hoursPerWeek: 8,
    icon: <Target className="w-4 h-4" />,
    color: "var(--amber)",
    description: "8 hrs/week — skill building + network",
    maxActions: 5,
    weeklySchedule: "~1 hr on 5 days + 3 hrs dedicated session",
  },
  intensive: {
    type: "intensive",
    label: "Intensive",
    hoursPerWeek: 20,
    icon: <Zap className="w-4 h-4" />,
    color: "var(--red)",
    description: "20+ hrs/week — full transformation",
    maxActions: 99,
    weeklySchedule: "~3 hrs/day including weekends",
  },
};

// Time estimates per action type, grounded in documented learning curves
export const TIME_ESTIMATES: Record<string, { minimal: string; moderate: string; intensive: string }> = {
  // Role displacement
  default: { minimal: "—", moderate: "6–8 weeks", intensive: "3–4 weeks" },
  // Python fundamentals from zero
  python: { minimal: "—", moderate: "8 weeks @ 8h/wk", intensive: "4 weeks @ 20h/wk" },
  // AI tool proficiency (e.g., Copilot, Harvey)
  ai_tool: { minimal: "2 weeks @ 2h/wk", moderate: "1 week @ 8h/wk", intensive: "3 days @ 20h/wk" },
  // LinkedIn + CV update
  profile: { minimal: "3 days @ 2h/wk", moderate: "1 day intensive", intensive: "Half-day" },
  // Network activation (2–3 warm contacts)
  network: { minimal: "Ongoing — 30 min/wk", moderate: "Ongoing — 1 hr/wk", intensive: "Dedicated weekly block" },
  // Certification (e.g., Google Data Analytics)
  certification: { minimal: "—", moderate: "12 weeks @ 8h/wk", intensive: "6 weeks @ 20h/wk" },
  // Emergency fund
  finance: { minimal: "1 day to set up", moderate: "1 day to set up", intensive: "1 day to set up" },
};

interface Props {
  selectedTrack: TrackType;
  onTrackChange: (track: TrackType) => void;
  riskScore: number;
}

export const TimeAvailableTrack: React.FC<Props> = ({
  selectedTrack,
  onTrackChange,
  riskScore,
}) => {
  const recommended: TrackType = riskScore >= 70 ? "intensive" : riskScore >= 45 ? "moderate" : "minimal";

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold">How many hours per week can you invest?</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(Object.values(TRACKS) as TrackConfig[]).map(track => {
          const isActive = selectedTrack === track.type;
          const isRecommended = recommended === track.type;
          return (
            <motion.button
              key={track.type}
              onClick={() => onTrackChange(track.type)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative rounded-xl p-4 text-left transition-all"
              style={{
                background: isActive ? `${track.color}12` : "var(--alpha-bg-04)",
                border: `1px solid ${isActive ? track.color : "var(--alpha-bg-08)"}`,
                cursor: "pointer",
              }}
            >
              {isRecommended && (
                <span
                  className="absolute -top-2 left-3 text-[9px] font-black px-2 py-0.5 rounded uppercase"
                  style={{ background: track.color, color: "#000" }}
                >
                  RECOMMENDED
                </span>
              )}
              <div className="flex items-center gap-2 mb-2" style={{ color: isActive ? track.color : "var(--text-3)" }}>
                {track.icon}
                <span className="text-sm font-black">{track.label}</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                {track.description}
              </div>
              {isActive && (
                <div className="text-[9px] mt-1.5 font-mono opacity-60" style={{ color: track.color }}>
                  {track.weeklySchedule}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
      {selectedTrack && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {selectedTrack === "minimal"
            ? "Minimal track shows only the 2 actions with the highest risk-reduction-per-hour. Every hour is maximized."
            : selectedTrack === "moderate"
              ? "Moderate track includes 5 prioritized actions — skill building, network activation, and profile optimization."
              : "Intensive track shows all actions plus a week-by-week schedule. Reserved for profiles where urgency is confirmed."}
        </p>
      )}
    </div>
  );
};

export default TimeAvailableTrack;
