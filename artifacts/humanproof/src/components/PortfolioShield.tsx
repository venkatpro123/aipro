import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, HelpCircle, Briefcase, Building2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WORK_TYPES, INDUSTRIES } from '../data/catalogData';
import { calculateScore } from '../data/riskFormula';
import { PremiumSelect } from './ui/PremiumSelect';

export const PortfolioShield: React.FC<{ score?: number }> = ({ score: externalScore }) => {
  const [industry, setIndustry] = useState('');
  const [role, setRole] = useState('');
  const [showTooltips, setShowTooltips] = useState(false);

  const rolesInIndustry = industry ? (WORK_TYPES[industry as keyof typeof WORK_TYPES] ?? []) : [];
  const internalScoreData = (industry && role) ? calculateScore(role, industry) : null;
  
  const scoreTotal = externalScore ?? internalScoreData?.total ?? null;

  const getShieldColor = (score: number) => {
    if (score < 30) return 'var(--cyan)';
    if (score < 60) return 'var(--violet)';
    return 'var(--rose)';
  };

  const shieldPercent = scoreTotal !== null ? 100 - scoreTotal : null;

  return (
    <div className="card-glass" style={{ padding: '32px', borderRadius: 'var(--radius-xl)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,212,224,0.3), transparent)' }} />
      
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(0,212,224,0.1)', borderRadius: '12px', border: '1px solid rgba(0,212,224,0.2)' }}>
            <Shield size={20} style={{ color: 'var(--cyan)' }} />
          </div>
          <div>
            <h3 className="label-xs" style={{ margin: 0, fontSize: '0.7rem' }}>Portfolio Shield</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Verify protection level</div>
          </div>
        </div>
        <button 
          onClick={() => setShowTooltips(!showTooltips)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
        >
          <HelpCircle size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PremiumSelect
            label="Baseline Industry"
            placeholder="Select career cluster..."
            value={industry}
            onChange={(val) => { setIndustry(val); setRole(''); }}
            options={INDUSTRIES.map(i => ({ 
              key: i.key, 
              label: i.label, 
              icon: <Building2 size={16} /> 
            }))}
          />

          <PremiumSelect
            label="Target role"
            placeholder="Select specific role..."
            value={role}
            onChange={(val) => setRole(val)}
            disabled={!industry}
            options={rolesInIndustry.map((r: any) => ({ 
              key: r.key, 
              label: r.label, 
              icon: <Briefcase size={16} /> 
            }))}
          />
        </div>

        <div style={{ 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '24px', 
          padding: '32px', 
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px'
        }}>
          <AnimatePresence mode="wait">
            {scoreTotal !== null ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                   {scoreTotal < 30 ? (
                     <ShieldCheck size={48} style={{ color: 'var(--cyan)' }} />
                   ) : scoreTotal < 60 ? (
                     <Shield size={48} style={{ color: 'var(--violet)' }} />
                   ) : (
                     <ShieldAlert size={48} style={{ color: 'var(--rose)' }} />
                   )}
                   <motion.div 
                     animate={{ opacity: [0.3, 0.6, 0.3] }}
                     transition={{ duration: 2, repeat: Infinity }}
                     style={{ position: 'absolute', inset: 0, background: getShieldColor(scoreTotal), filter: 'blur(24px)', zIndex: -1, borderRadius: '50%', opacity: 0.4 }} 
                   />
                </div>
                <div style={{ fontWeight: 900, fontSize: '2.5rem', color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{shieldPercent}%</div>
                <div className="label-xs" style={{ color: 'var(--text-3)', marginTop: '4px' }}>Protection Factor</div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center', opacity: 0.4 }}
              >
                <Zap size={32} style={{ margin: '0 auto 12px', color: 'var(--text-3)' }} />
                <p className="label-xs" style={{ margin: 0 }}>Select a role to verify protection level</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showTooltips && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,212,224,0.05)', borderRadius: '12px', border: '1px solid rgba(0,212,224,0.1)', fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
              The **Protection Factor** represents the inverse of AI Displacement Risk. A score of 80% means your chosen role currently has an 80% shield against immediate automation in 2026.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
