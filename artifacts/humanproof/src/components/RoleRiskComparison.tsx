import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, animate } from 'framer-motion';
import { GitCompare, TrendingDown, TrendingUp, Info, Briefcase, Zap, FastForward } from 'lucide-react';
import { PremiumSelect } from './ui/PremiumSelect';
import { INDUSTRIES, WORK_TYPES } from '../data/catalogData';
// Import from riskFormula (not riskEngine) so verdict/color bands are consistent
// with the main result screen — riskEngine's legacy stubs had inverted thresholds.
import { calculateScore, getScoreColor } from '../data/riskFormula';

interface RoleRiskComparisonProps {
  currentRoleKey: string;
  currentScore: number;
  /** Pass the user's selections so comparison scores use the same parameters. */
  experience?: string;
  country?: string;
}

const AnimatedNumber = ({ value, color }: { value: number; color: string }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value]);

  return <span style={{ color }}>{displayValue}</span>;
};

export const RoleRiskComparison: React.FC<RoleRiskComparisonProps> = ({
  currentRoleKey, currentScore, experience = '5-10', country = 'usa',
}) => {
  const [targetIndustry, setTargetIndustry] = useState('');
  const [targetRole, setTargetRole] = useState('');

  const targetRoles = targetIndustry ? (WORK_TYPES[targetIndustry as keyof typeof WORK_TYPES] ?? []) : [];
  // Use the SAME experience + country as the user's current audit so the
  // comparison is apples-to-apples, not biased by different defaults.
  const targetResult = (targetIndustry && targetRole)
    ? calculateScore(targetRole, targetIndustry, experience, country)
    : null;
  const targetScore = targetResult?.total || 0;

  const diff = targetScore - currentScore;
  const isLowerRisk = diff < 0;

  // Find icons for the dropdowns
  const industryOptions = INDUSTRIES.map(i => ({ 
    key: i.key, 
    label: i.label, 
    icon: i.icon // This is the emoji from catalogData
  }));

  return (
    <div className="card-glass" style={{ padding: '32px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{ padding: '10px', background: 'rgba(124,58,237,0.1)', borderRadius: '12px', border: '1px solid rgba(124,58,237,0.2)' }}>
          <GitCompare size={20} style={{ color: 'var(--violet)' }} />
        </div>
        <div>
          <h3 className="label-xs" style={{ margin: 0, fontSize: '0.7rem' }}>Compare Career Paths</h3>
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>How Would a Different Role Score?</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        <PremiumSelect
          label="Compare Industry"
          placeholder="Select comparison industry..."
          value={targetIndustry}
          onChange={(val) => { setTargetIndustry(val); setTargetRole(''); }}
          options={industryOptions}
        />

        <PremiumSelect
          label="Compare Role"
          placeholder="Select comparison role..."
          value={targetRole}
          onChange={(val) => setTargetRole(val)}
          disabled={!targetIndustry}
          options={targetRoles.map((r: any) => ({ 
            key: r.key, 
            label: r.label, 
            icon: <Briefcase size={16} /> 
          }))}
        />
      </div>

      <AnimatePresence mode="wait">
        {targetResult ? (
          <motion.div
            key="comparison-active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {/* VS DASHBOARD */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px', background: 'var(--alpha-bg-04)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="label-xs" style={{ marginBottom: '8px', fontSize: '0.6rem' }}>Current</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: getScoreColor(currentScore) }}>{currentScore}%</div>
              </div>

              <div style={{ width: 1, height: 40, background: 'var(--border)' }} />

              <div style={{ textAlign: 'center' }}>
                <div className="label-xs" style={{ marginBottom: '8px', fontSize: '0.6rem' }}>Target</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: getScoreColor(targetScore) }}>
                  <AnimatedNumber value={targetScore} color={getScoreColor(targetScore)} />%
                </div>
              </div>
            </div>

            {/* TRAJECTORY BAR */}
            <div style={{ position: 'relative', height: '40px', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--alpha-bg-06)' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(currentScore, targetScore)}%` }}
                style={{ position: 'absolute', top: '50%', left: 0, height: '4px', background: 'var(--border)', transform: 'translateY(-50%)', zIndex: 1 }}
              />
              <motion.div 
                animate={{ left: `${currentScore}%` }}
                style={{ position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: getScoreColor(currentScore), boxShadow: `0 0 10px ${getScoreColor(currentScore)}` }} />
              </motion.div>
              <motion.div 
                initial={{ left: 0 }}
                animate={{ left: `${targetScore}%` }}
                style={{ position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 11 }}
              >
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: getScoreColor(targetScore), border: '2px solid white', boxShadow: `0 0 15px ${getScoreColor(targetScore)}` }} />
              </motion.div>
            </div>

            {/* RISK DELTA PULSE */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '24px', 
              background: isLowerRisk ? 'rgba(0,212,224,0.05)' : 'rgba(255,20,100,0.05)', 
              borderRadius: '20px', 
              border: `1px dashed ${isLowerRisk ? 'rgba(0,212,224,0.2)' : 'rgba(255,20,100,0.2)'}`,
              position: 'relative',
              overflow: 'hidden'
            }}>
                <div>
                   <div className="label-xs" style={{ marginBottom: '4px' }}>Strategic Trajectory</div>
                   <div style={{ fontSize: '1.75rem', fontWeight: 900, color: isLowerRisk ? 'var(--cyan)' : 'var(--rose)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
                     {isLowerRisk ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
                     <AnimatedNumber value={Math.abs(diff)} color={isLowerRisk ? 'var(--cyan)' : 'var(--rose)'} />%
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isLowerRisk ? 'var(--cyan)' : 'var(--rose)', background: isLowerRisk ? 'rgba(0,212,224,0.1)' : 'rgba(255,20,100,0.1)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                     {isLowerRisk ? 'PROTECTION UPGRADED' : 'EXPOSURE INCREASED'}
                   </div>
                </div>
                {/* Visual pulse indicator */}
                <motion.div 
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ position: 'absolute', width: '100%', height: '100%', background: isLowerRisk ? 'radial-gradient(circle, rgba(0,212,224,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(255,20,100,0.1) 0%, transparent 70%)', top: 0, left: 0, pointerEvents: 'none' }}
                />
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(0,212,224,0.05)', border: '1px solid rgba(0,212,224,0.1)' }}>
                {isLowerRisk ? <Zap size={18} style={{ color: 'var(--cyan)' }} /> : <FastForward size={18} style={{ color: 'var(--rose)' }} />}
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                {isLowerRisk 
                  ? "Benchmarking indicates a strategic de-risking path. The target role offers superior shielding against current AI task-automation markers."
                  : "Caution: The comparison identifies a significant increase in role-specific AI exposure. This transition requires additional skill-moat fortification."}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="comparison-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '48px 32px', border: '1px dashed var(--border)', borderRadius: '24px', background: 'transparent' }}
          >
            <GitCompare size={40} style={{ margin: '0 auto 20px', color: 'var(--text-3)', opacity: 0.3 }} />
            <p className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>Select a target role to visualize the Risk Delta</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
