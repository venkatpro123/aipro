// SystemPerformanceWidget.tsx — Phase 5: OS metrics at a glance
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCareerMemorySummary } from '../../services/careerMemoryService';
import type { CareerMemorySummary } from '../../services/careerMemoryService';

export function SystemPerformanceWidget() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CareerMemorySummary | null>(null);

  useEffect(() => {
    if (!user) return;
    getCareerMemorySummary(user.id).then(setSummary).catch(() => { /* non-fatal */ });
  }, [user]);

  if (!summary?.hasData) return null;

  const { auditCount, actionsCompleted, scoreDelta, daysMonitored } = summary;

  const deltaColor = scoreDelta === null ? 'rgba(255,255,255,0.5)'
    : scoreDelta < 0 ? '#10b981'
    : scoreDelta > 0 ? '#ef4444'
    : 'rgba(255,255,255,0.5)';

  const stats: { label: string; value: string; color: string }[] = [
    {
      label: 'Audits run',
      value: String(auditCount),
      color: 'var(--cyan)',
    },
    {
      label: 'Actions completed',
      value: String(actionsCompleted),
      color: '#10b981',
    },
    ...(scoreDelta !== null ? [{
      label: 'Risk trend',
      value: `${scoreDelta > 0 ? '+' : ''}${Math.round(scoreDelta)} pts`,
      color: deltaColor,
    }] : []),
    {
      label: 'Days monitored',
      value: String(daysMonitored),
      color: 'rgba(255,255,255,0.6)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        marginBottom: 16,
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Activity size={13} style={{ color: 'var(--cyan)', opacity: 0.7 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)' }}>
          OS Performance
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
        {stats.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {daysMonitored > 0 && (
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0, fontStyle: 'italic' }}>
          Active {daysMonitored}d
        </div>
      )}
    </motion.div>
  );
}
