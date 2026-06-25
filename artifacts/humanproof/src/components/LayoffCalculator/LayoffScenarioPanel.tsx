import React, { useState } from 'react';
import { ScoreInputs, ScenarioOverrides, ScoreResult } from '../../services/layoffScoreEngine';

interface Props {
  baseInputs: ScoreInputs;
  currentScore: number;
  onSimulate: (overrides: ScenarioOverrides) => ScoreResult | null;
}

export const LayoffScenarioPanel: React.FC<Props> = ({ baseInputs, currentScore, onSimulate }) => {
  const [department, setDepartment] = useState(baseInputs.department);
  const [performanceTier, setPerformanceTier] = useState(baseInputs.userFactors.performanceTier);
  const [hasRecentPromotion, setHasRecentPromotion] = useState(baseInputs.userFactors.hasRecentPromotion);
  
  const [scenarioResult, setScenarioResult] = useState<ScoreResult | null>(null);

  const departments = [
    'Engineering', 'Sales', 'Product', 'Marketing', 'HR', 'Finance',
    'Operations', 'Legal', 'Customer Support', 'Research', 'Design',
    'Data', 'IT', 'Supply Chain', 'Administration',
  ];

  const handleSimulate = () => {
    const override: ScenarioOverrides = {
      department,
      performanceTier,
      hasRecentPromotion,
    };
    const res = onSimulate(override);
    setScenarioResult(res);
  };

  const handleReset = () => {
    setDepartment(baseInputs.department);
    setPerformanceTier(baseInputs.userFactors.performanceTier);
    setHasRecentPromotion(baseInputs.userFactors.hasRecentPromotion);
    setScenarioResult(null);
  };

  const diff = scenarioResult ? scenarioResult.score - currentScore : 0;

  const getTierHex = (c: string) => {
    const map: Record<string, string> = { red: '#ef4444', orange: '#f97316', amber: '#f59e0b', green: '#10b981', teal: '#14b8a6' };
    return map[c] || '#14b8a6';
  };

  const selectStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    background: 'var(--alpha-bg-06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
  };

  return (
    <div style={{
      marginTop: '40px',
      background: 'var(--alpha-bg-04)',
      border: '1px solid rgba(0, 245, 255, 0.2)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      margin: '40px auto 0'
    }}>
      <h3 style={{ color: '#00F5FF', marginTop: 0, marginBottom: '8px', fontSize: '1.2rem' }}>
        What-If Scenario Simulator
      </h3>
      <p style={{ color: '#9ba5b4', fontSize: '0.9rem', marginBottom: '24px' }}>
        See how career changes would affect your current {currentScore}% layoff risk.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ width: '140px', color: '#d1d5db', fontSize: '0.9rem' }}>Department:</label>
          <select value={department} onChange={e => setDepartment(e.target.value)} style={selectStyle}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ width: '140px', color: '#d1d5db', fontSize: '0.9rem' }}>Performance:</label>
          <select value={performanceTier} onChange={e => setPerformanceTier(e.target.value as any)} style={selectStyle}>
            <option value="top">Top performer</option>
            <option value="average">Meeting expectations</option>
            <option value="below">Below expectations</option>
            <option value="unknown">Not sure</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ width: '140px', color: '#d1d5db', fontSize: '0.9rem' }}>Recent Review:</label>
          <select value={hasRecentPromotion ? 'yes' : 'no'} onChange={e => setHasRecentPromotion(e.target.value === 'yes')} style={selectStyle}>
            <option value="no">No promotion</option>
            <option value="yes">Got promoted</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={handleSimulate}
          style={{
            padding: '10px 20px',
            background: 'var(--cyan, #00F5FF)',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          Simulate Scenario
        </button>
        <button 
          onClick={handleReset}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ba5b4',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          Reset
        </button>
      </div>

      {scenarioResult && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--alpha-bg-06)',
          borderRadius: '8px',
          borderLeft: `4px solid ${diff > 0 ? '#ef4444' : diff < 0 ? '#10b981' : '#9ba5b4'}`
        }}>
        <h4 style={{ margin: '0 0 8px', color: '#fff', fontSize: '1.1rem' }}>
            New Scenario Risk: <span style={{ color: getTierHex(scenarioResult.tier.color) }}>{scenarioResult.score}%</span>
          </h4>
          <div style={{ color: '#d1d5db', fontSize: '0.95rem' }}>
            {diff > 0 && <span>That's an <strong>increase of {diff} points</strong>. {scenarioResult.tier.advice}</span>}
            {diff < 0 && <span>That's a <strong>decrease of {Math.abs(diff)} points</strong>. Good move!</span>}
            {diff === 0 && <span>No change to your overall risk score.</span>}
          </div>
        </div>
      )}
    </div>
  );
};
