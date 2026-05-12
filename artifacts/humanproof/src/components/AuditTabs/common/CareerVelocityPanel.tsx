// CareerVelocityPanel.tsx — v14.0
// Career trajectory score, plateau risk, internal visibility, seniority.

import React from "react";
import { motion } from "framer-motion";
import { Rocket, TrendingUp, Minus, TrendingDown, Eye } from "lucide-react";
import type { CareerVelocityResult, CareerTrajectory } from "@/services/careerVelocityEngine";

interface CareerVelocityPanelProps {
  velocity: CareerVelocityResult;
}

const TRAJECTORY_CONFIG: Record<CareerTrajectory, { icon: React.ReactNode; label: string; color: string }> = {
  ACCELERATING: { icon: <TrendingUp className="w-4 h-4" />,    label: 'Accelerating',  color: '#10b981' },
  STEADY:       { icon: <TrendingUp className="w-4 h-4" />,    label: 'Steady',         color: '#3b82f6' },
  PLATEAUED:    { icon: <Minus className="w-4 h-4" />,         label: 'Plateaued',      color: '#f59e0b' },
  DECLINING:    { icon: <TrendingDown className="w-4 h-4" />,  label: 'Declining',      color: '#ef4444' },
  UNKNOWN:      { icon: <Minus className="w-4 h-4" />,         label: 'Unknown',        color: 'rgba(255,255,255,0.40)' },
};

const PLATEAU_COLORS: Record<CareerVelocityResult['plateauRisk'], { text: string; bg: string }> = {
  HIGH:   { text: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  MEDIUM: { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  LOW:    { text: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  NONE:   { text: '#10b981', bg: 'rgba(16,185,129,0.06)' },
};

const CareerVelocityPanel: React.FC<CareerVelocityPanelProps> = ({ velocity }) => {
  const traj = TRAJECTORY_CONFIG[velocity.trajectory] ?? TRAJECTORY_CONFIG.UNKNOWN;
  const plateau = PLATEAU_COLORS[velocity.plateauRisk];
  const mainColor = traj.color;
  const bgColor = velocity.velocityScore >= 70 ? 'rgba(239,68,68,0.08)'
    : velocity.velocityScore >= 50 ? 'rgba(245,158,11,0.08)'
    : velocity.velocityScore >= 30 ? 'rgba(59,130,246,0.08)'
    : 'rgba(16,185,129,0.06)';
  const borderColor = velocity.velocityScore >= 70 ? 'rgba(239,68,68,0.22)'
    : velocity.velocityScore >= 50 ? 'rgba(245,158,11,0.22)'
    : velocity.velocityScore >= 30 ? 'rgba(59,130,246,0.22)'
    : 'rgba(16,185,129,0.18)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4" style={{ color: mainColor }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Career Velocity</span>
        </div>
        <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${mainColor}18`, color: mainColor, border: `1px solid ${mainColor}30` }}>
          RISK {velocity.velocityScore}/100
        </span>
      </div>

      {/* Trajectory + seniority */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5" style={{ color: traj.color }}>
          {traj.icon}
          <span className="text-sm font-bold">{traj.label}</span>
        </div>
        <div className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
          {velocity.careerStageProfile.seniorityLabel}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 text-center" style={{ background: plateau.bg }}>
          <div className="text-[10px] font-bold" style={{ color: plateau.text }}>
            {velocity.plateauRisk}
          </div>
          <div className="text-[9px] opacity-40 mt-0.5">Plateau Risk</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-sm font-bold" style={{ color: velocity.internalVisibilityScore >= 60 ? '#10b981' : 'rgba(255,255,255,0.9)' }}>
            {velocity.internalVisibilityScore}
          </div>
          <div className="text-[9px] opacity-40 mt-0.5">Visibility</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-[10px] font-bold" style={{
            color: velocity.replaceabilityEstimate === 'RARE_SPECIALIST' ? '#10b981'
              : velocity.replaceabilityEstimate === 'COMMODITY' ? '#ef4444' : 'rgba(255,255,255,0.9)',
          }}>
            {velocity.replaceabilityEstimate === 'RARE_SPECIALIST' ? 'Rare'
              : velocity.replaceabilityEstimate === 'SKILLED_GENERALIST' ? 'Skilled'
              : velocity.replaceabilityEstimate === 'COMMODITY' ? 'Commodity'
              : '?'}
          </div>
          <div className="text-[9px] opacity-40 mt-0.5">Market Position</div>
        </div>
      </div>

      {/* Promotion note */}
      <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {velocity.promotionNote}
        </p>
      </div>

      {/* Role tenure */}
      <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>ROLE TENURE</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{
              background: velocity.currentRoleTenureRisk === 'OPTIMAL' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: velocity.currentRoleTenureRisk === 'OPTIMAL' ? '#10b981' : '#f59e0b',
            }}>
            {velocity.currentRoleTenureRisk.replace('_', ' ')}
          </span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
          {velocity.currentRoleTenureNote}
        </p>
      </div>

      {/* Visibility note */}
      <div className="flex items-start gap-1.5">
        <Eye className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: velocity.internalVisibilityScore >= 60 ? '#10b981' : 'rgba(255,255,255,0.35)' }} />
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
          {velocity.internalVisibilityNote}
        </p>
      </div>
    </motion.div>
  );
};

export default CareerVelocityPanel;
