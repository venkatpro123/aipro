import React from 'react';
import { ActionPlanItem } from '../../services/layoffScoreEngine';

interface Props {
  recommendations: ActionPlanItem[];
}

export const RecommendationPanel: React.FC<Props> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) return null;

  const priorityColor = {
    High: 'var(--red, #ef4444)',
    Medium: 'var(--orange, #f97316)',
    Low: 'var(--teal, #14b8a6)',
  };

  return (
    <div className="recommendation-panel" style={{
      background: 'rgba(30, 41, 59, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '24px',
      marginTop: '24px'
    }}>
      <h3 style={{ color: 'var(--text)', marginBottom: '16px', fontSize: '1.25rem' }}>Personalized Action Plan</h3>
      <div style={{ display: 'grid', gap: '16px' }}>
        {recommendations.map((rec) => (
          <div key={rec.id} style={{
            background: 'rgba(15, 23, 42, 0.5)',
            borderLeft: `4px solid ${priorityColor[rec.priority]}`,
            padding: '16px',
            borderRadius: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ color: '#e2e8f0', margin: 0 }}>{rec.title}</h4>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: priorityColor[rec.priority], background: `${priorityColor[rec.priority]}20`, padding: '2px 8px', borderRadius: '12px' }}>
                {rec.priority} Priority
              </span>
            </div>
            <p style={{ color: 'var(--color-slate400-text)', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
              {rec.description}
            </p>
            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
              Signal Source: {rec.layerFocus}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
