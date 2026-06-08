// CareerHistoryPanel.tsx — Career timeline with decision recorder + ROI accuracy
import { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Award } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLayoff } from '../../../context/LayoffContext';
import { getCareerTimeline } from '../../../services/careerMemoryService';
import { CareerTimelineView } from '../../CareerMemory/CareerTimelineView';
import { CareerDecisionRecorder } from '../../CareerMemory/CareerDecisionRecorder';
import { CareerOutcomeRecorder } from '../../CareerMemory/CareerOutcomeRecorder';
import { RecommendationAccuracyCard } from '../../Feedback/RecommendationAccuracyCard';
import type { TimelineEvent } from '../../../services/careerMemoryService';
import type { HybridResult } from '../../../types/hybridResult';

export function CareerHistoryPanel() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  const scoreResult = state.scoreResult as HybridResult | null;

  const loadTimeline = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getCareerTimeline(user.id).then(evts => {
      setEvents(evts);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  const auditCount   = events.filter(e => e.type === 'audit').length;
  const actionCount  = events.filter(e => e.type === 'action').length;
  const decisionCount = events.filter(e => e.type === 'decision').length;

  const firstAudit = events.filter(e => e.type === 'audit').at(-1);
  const latestAudit = events.filter(e => e.type === 'audit').at(0);
  const scoreDelta = (firstAudit?.score != null && latestAudit?.score != null && firstAudit.id !== latestAudit.id)
    ? Math.round(latestAudit.score - firstAudit.score)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>Career History</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Your audits, completed actions, and recorded career decisions.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowOutcomeModal(true)}
            style={secondaryBtnStyle}
            title="Record what happened after an audit"
          >
            <Award size={14} />
            Record Outcome
          </button>
          <button
            onClick={() => setShowDecisionModal(true)}
            style={primaryBtnStyle}
          >
            <PlusCircle size={14} />
            Add Decision
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && events.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          <div className="card-premium" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Audits</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--cyan)' }}>{auditCount}</div>
          </div>
          <div className="card-premium" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Actions</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{actionCount}</div>
          </div>
          <div className="card-premium" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Decisions</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#a78bfa' }}>{decisionCount}</div>
          </div>
          {scoreDelta !== null && (
            <div className="card-premium" style={{ padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Score Δ</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: scoreDelta < 0 ? '#10b981' : scoreDelta > 0 ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>
                {scoreDelta > 0 ? '+' : ''}{scoreDelta}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="card-premium" style={{ padding: '20px' }}>
        <CareerTimelineView events={events} loading={loading} />
      </div>

      {/* Action ROI accuracy */}
      {!loading && events.filter(e => e.type === 'audit').length >= 2 && (
        <div className="card-premium" style={{ padding: '20px' }}>
          <RecommendationAccuracyCard />
        </div>
      )}

      {/* Hint */}
      {!loading && events.length > 0 && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Use "Add Decision" to record milestones. Use "Record Outcome" to tell us what happened — it improves predictions for everyone.
        </div>
      )}

      {/* Modals */}
      <CareerDecisionRecorder
        open={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        onSaved={loadTimeline}
      />
      <CareerOutcomeRecorder
        open={showOutcomeModal}
        onClose={() => setShowOutcomeModal(false)}
        onSaved={loadTimeline}
      />
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'var(--cyan)', color: '#000', fontWeight: 700, fontSize: 12,
  transition: 'opacity 0.15s',
};

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
  background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 12,
  transition: 'all 0.15s',
};
