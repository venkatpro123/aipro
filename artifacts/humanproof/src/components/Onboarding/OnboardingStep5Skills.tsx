// OnboardingStep5Skills.tsx — Step 5: Skills snapshot
// Extracted from ProfileSetupModal skills step.
import { useState } from 'react';
import { Zap } from 'lucide-react';

export interface Step5Data {
  selfRatedSkills: string[];
  targetSkills: string[];
}

interface Props {
  data: Step5Data;
  onChange: (data: Step5Data) => void;
}

const COMMON_SKILLS = [
  'Python', 'SQL', 'JavaScript', 'TypeScript', 'React', 'Node.js',
  'Java', 'Go', 'Rust', 'C++', 'Machine Learning', 'Data Analysis',
  'Product Management', 'Project Management', 'Agile / Scrum',
  'Cloud (AWS/GCP/Azure)', 'DevOps / CI-CD', 'System Design',
  'Excel / Sheets', 'Salesforce', 'SAP', 'Tableau / Power BI',
  'Technical Writing', 'UX Design', 'Graphic Design',
  'Financial Modeling', 'Accounting', 'Legal Research',
  'Business Development', 'Customer Success', 'Sales',
  'Leadership', 'People Management', 'Executive Communication',
];

const TARGET_SKILLS = [
  'AI / LLM Engineering', 'Prompt Engineering', 'MLOps',
  'Kubernetes', 'Terraform', 'Cybersecurity', 'Blockchain',
  'Swift / iOS', 'Kotlin / Android', 'Flutter',
  'Data Engineering', 'Spark / Databricks', 'dbt',
  'Product Analytics', 'Growth Hacking', 'SEO / SEM',
  'Video Editing', 'Motion Design', 'Brand Strategy',
  'Negotiation', 'Executive Presence', 'Board Readiness',
];

export function OnboardingStep5Skills({ data, onChange }: Props) {
  const [customCurrent, setCustomCurrent] = useState('');
  const [customTarget, setCustomTarget] = useState('');

  const toggleSkill = (skill: string, field: 'selfRatedSkills' | 'targetSkills') => {
    const list = data[field];
    const next = list.includes(skill) ? list.filter(s => s !== skill) : [...list, skill];
    onChange({ ...data, [field]: next });
  };

  const addCustom = (field: 'selfRatedSkills' | 'targetSkills', raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const tags = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    const existing = data[field];
    const merged = [...existing, ...tags.filter(t => !existing.includes(t))];
    onChange({ ...data, [field]: merged });
    if (field === 'selfRatedSkills') setCustomCurrent('');
    else setCustomTarget('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="#c4b5fd" />
          </div>
          <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            Your Skills
          </h2>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
          Pick your strongest current skills and what you want to learn.
          This personalizes your action plan and skill gap analysis.
        </p>
      </div>

      {/* Current skills */}
      <div>
        <label style={labelStyle}>
          Current Skills{' '}
          <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none' }}>
            ({data.selfRatedSkills.length} selected)
          </span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {COMMON_SKILLS.map(skill => {
            const active = data.selfRatedSkills.includes(skill);
            return (
              <button key={skill} onClick={() => toggleSkill(skill, 'selfRatedSkills')} style={chipStyle(active, 'cyan')}>
                {active ? '✓ ' : ''}{skill}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Add custom skill (comma-separated)…"
            value={customCurrent}
            onChange={e => setCustomCurrent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom('selfRatedSkills', customCurrent)}
            style={inputStyle}
          />
          <button onClick={() => addCustom('selfRatedSkills', customCurrent)} style={addBtnStyle}>Add</button>
        </div>
        {data.selfRatedSkills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {data.selfRatedSkills.map(s => (
              <span key={s} style={{ ...chipStyle(true, 'cyan'), fontSize: 11, cursor: 'default' }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Target skills */}
      <div>
        <label style={labelStyle}>
          Learning Goals{' '}
          <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none' }}>
            (skills you want to acquire)
          </span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {TARGET_SKILLS.map(skill => {
            const active = data.targetSkills.includes(skill);
            return (
              <button key={skill} onClick={() => toggleSkill(skill, 'targetSkills')} style={chipStyle(active, 'purple')}>
                {active ? '✓ ' : ''}{skill}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Add custom target skill…"
            value={customTarget}
            onChange={e => setCustomTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom('targetSkills', customTarget)}
            style={inputStyle}
          />
          <button onClick={() => addCustom('targetSkills', customTarget)} style={addBtnStyle}>Add</button>
        </div>
      </div>

      {data.selfRatedSkills.length === 0 && data.targetSkills.length === 0 && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: 0 }}>
          You can update skills anytime from your Career Twin profile.
        </p>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10,
};

const chipStyle = (active: boolean, color: 'cyan' | 'purple'): React.CSSProperties => {
  const c = color === 'cyan'
    ? { border: 'var(--cyan)', bg: 'rgba(0,212,255,0.1)', text: 'var(--cyan)' }
    : { border: 'rgba(167,139,250,0.7)', bg: 'rgba(167,139,250,0.1)', text: '#c4b5fd' };
  return {
    padding: '5px 11px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    border: `1.5px solid ${active ? c.border : 'rgba(255,255,255,0.1)'}`,
    background: active ? c.bg : 'rgba(255,255,255,0.03)',
    color: active ? c.text : 'rgba(255,255,255,0.45)',
    transition: 'all 0.15s',
  };
};

const inputStyle: React.CSSProperties = {
  flex: 1, background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none',
};

const addBtnStyle: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
