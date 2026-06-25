import { useState, useRef } from 'react';
import { useHumanProof } from '../context/HumanProofContext';
import { getRiskLabel, getPercentileStatement } from '../utils/riskCalculations';

const cardYear = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;

export default function ShareableScoreCard() {
  const { state, dispatch } = useHumanProof();
  const { jobRiskScore, skillRiskScore, humanScore, jobTitle, userName } = state;
  const [name, setName] = useState(userName || '');
  const [title, setTitle] = useState(jobTitle || '');
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const displayScore =
    humanScore ??
    (skillRiskScore != null ? 100 - skillRiskScore : null) ??
    (jobRiskScore != null ? 100 - jobRiskScore : null) ??
    72;

  const scoreType =
    humanScore != null ? 'Human Score' :
    skillRiskScore != null ? 'Skill Safety Score' :
    jobRiskScore != null ? 'Job Safety Score' :
    'HumanProof Score';

  const riskInfo = getRiskLabel(100 - displayScore > 50 ? 100 - displayScore : displayScore);
  const percentile = getPercentileStatement(100 - displayScore);

  const safeCount = state.skillBreakdown.filter(s => s.riskScore < 40).length;
  const riskyCount = state.skillBreakdown.filter(s => s.riskScore >= 65).length;
  const topSafe = state.skillBreakdown.find(s => s.riskScore < 40)?.name || 'Negotiation';

  const scoreColor = displayScore >= 70 ? '#00FF9F' : displayScore >= 50 ? '#00F5FF' : '#FF7043';

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      // 8D: Resolve CSS variables to hard values so html2canvas can render them
      const CSS_VAR_OVERRIDES: Record<string, string> = {
        '--bg': '#0f1118', '--text': '#e8e5dc', '--text2': '#8888a8',
        '--cyan': '#00F5FF', '--emerald': '#00FF9F', '--violet': '#7C3AFF',
        '--violet-light': '#A78BFA', '--red': '#FF4757', '--orange': '#FF7043',
        '--yellow': '#FCD34D', '--border': 'var(--alpha-bg-08)',
        '--border2': 'var(--alpha-bg-08)', '--mono': 'monospace',
        '--body': 'Inter, system-ui, sans-serif',
      };
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0f1118',
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector('[data-export="true"]') as HTMLElement;
          if (el) {
            Object.entries(CSS_VAR_OVERRIDES).forEach(([key, val]) => {
              el.style.setProperty(key, val);
            });
          }
        },
      });
      const link = document.createElement('a');
      link.download = 'my-humanproof-score.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://humanproof.app')}`;
    window.open(url, '_blank');
  };

  const shareToX = () => {
    const text = `My HumanProof score: ${displayScore}/100. ${percentile}. Check yours at humanproof.app`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSaveName = () => {
    dispatch({ type: 'SET_USER_NAME', name });
  };

  return (
    <div style={{ padding: '40px 0', maxWidth: 680, margin: '0 auto' }}>
      <div className="reveal" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 4, height: 32, background: 'var(--violet)', borderRadius: 2 }} />
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: '1.5rem', color: 'var(--violet-light)' }}>
            Shareable Score Card
          </h2>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginLeft: 16 }}>
          Download your score card and share it on LinkedIn, X, or WhatsApp.
        </p>
      </div>

      <div style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleSaveName}
              placeholder="Your name"
              style={{ width: '100%', background: 'var(--alpha-bg-06)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--body)', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Job Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Your role"
              style={{ width: '100%', background: 'var(--alpha-bg-06)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--body)', fontSize: '0.875rem', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div
        ref={cardRef}
        data-export="true"
        style={{
          background: '#0f1118',
          border: '1px solid rgba(0,245,255,0.3)',
          borderRadius: 16,
          padding: 32,
          marginBottom: 24,
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
          color: '#e8e5dc',
        }}
      >
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(0,245,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(124,58,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00F5FF', letterSpacing: '0.05em' }}>
              Human<span style={{ color: '#00FF9F' }}>Proof</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--alpha-text-35)', marginTop: 2 }}>AI Displacement Intelligence</div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--alpha-text-35)' }}>{cardYear}</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '1.2rem', color: '#E8E8F0', fontWeight: 600, letterSpacing: '0.02em' }}>
            {name || 'Your Name'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--alpha-text-45)', marginTop: 4 }}>
            {title || 'Your Role'}
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(0,245,255,0.15)', marginBottom: 20 }} />

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--alpha-text-45)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{scoreType}</div>
          <div className="score-num" style={{ fontSize: '4rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{displayScore}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--alpha-text-35)', marginTop: 4 }}>/ 100</div>
          <div className="safe-label" style={{ display: 'inline-block', marginTop: 8, fontSize: '0.7rem', padding: '3px 12px', borderRadius: 20, border: `1px solid ${scoreColor}60`, color: scoreColor }}>
            {displayScore >= 70 ? 'Human-Proof' : displayScore >= 50 ? 'Moderate Safety' : 'At Risk'}
          </div>
        </div>

        <div style={{ background: 'var(--alpha-bg-04)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#00FF9F' }}>
            <span>●</span> <span>Safe skills: {safeCount || '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#FF4757' }}>
            <span>●</span> <span>At-risk skills: {riskyCount || '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00F5FF' }}>
            <span>●</span> <span>Top strength: {topSafe}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--alpha-text-50)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 12 }}>
          "{percentile}"
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(0,245,255,0.6)', marginBottom: 16 }}>
          Assessed against 2026 AI capability benchmarks
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(0,245,255,0.1)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--alpha-text-35)' }}>humanproof.app</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--alpha-text-25)' }}>{cardYear}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={downloadCard}
          disabled={downloading}
          style={{ flex: 1, minWidth: 140, background: 'var(--cyan)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700, cursor: downloading ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: downloading ? 0.7 : 1 }}
        >
          {downloading ? 'Generating…' : '↓ Download PNG'}
        </button>
        <button
          onClick={shareToLinkedIn}
          style={{ flex: 1, minWidth: 140, background: 'rgba(10,102,194,0.2)', border: '1px solid rgba(10,102,194,0.5)', color: '#5EAEE8', borderRadius: 8, padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Share LinkedIn
        </button>
        <button
          onClick={shareToX}
          style={{ flex: 1, minWidth: 140, background: 'var(--alpha-bg-06)', border: '1px solid var(--alpha-bg-08)', color: 'var(--text)', borderRadius: 8, padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Share on X
        </button>
      </div>
    </div>
  );
}
