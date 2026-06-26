import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface Props {
  score: number;
  tier: { label: string; color: string; advice: string };
  companyName: string;
  roleTitle: string;
  onClose: () => void;
}

export const LayoffShareCard: React.FC<Props> = ({ score, tier, companyName, roleTitle, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const getTierHex = (colorString: string) => {
    const map: any = { 'red': 'var(--color-red-text)', 'orange': 'var(--color-orange-text)', 'amber': 'var(--color-amber500-text)', 'green': 'var(--color-emerald-text)', 'teal': '#14b8a6' };
    return map[colorString] || '#14b8a6';
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `humanproof-layoff-risk-${score}.png`;
      link.click();
    } catch (e) {
      console.error('Failed to generate image', e);
    }
    setDownloading(false);
  };

  const handleShareLinkedIn = () => {
    const shareText = `I just checked my layoff risk with HumanProof — my score is ${score}% (${tier.label}) as a ${roleTitle}. Check yours:`;
    const shareUrl = 'https://humanproof.app';
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '540px', background: 'var(--bg1, #0a0a0c)', borderRadius: '16px', overflow: 'hidden' }}>
        
        {/* The Card Element to be screenshotted */}
        <div id="layoff-share-card" ref={cardRef} style={{
          width: '540px', 
          padding: '40px', 
          background: '#0f0f11',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderBottom: '1px solid var(--alpha-bg-06)',
          boxSizing: 'border-box'
        }}>
          <div style={{ color: '#9a9a9a', fontSize: '13px', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            HumanProof — Layoff Risk Score
          </div>

          <div style={{ fontSize: '64px', fontWeight: 700, color: getTierHex(tier.color), lineHeight: 1 }}>
            {score}%
          </div>
          <div style={{ color: 'var(--text)', fontSize: '22px', marginTop: '8px', marginBottom: '24px', fontWeight: 600 }}>
            layoff risk estimation
          </div>

          <div style={{ color: '#9a9a9a', fontSize: '15px', lineHeight: 1.6 }}>
            <div><strong style={{ color: 'var(--color-gray300-text)' }}>Role:</strong> {roleTitle}</div>
            <div><strong style={{ color: 'var(--color-gray300-text)' }}>Company:</strong> {companyName}</div>
            <div><strong style={{ color: 'var(--color-gray300-text)' }}>Risk tier:</strong> <span style={{ color: getTierHex(tier.color) }}>{tier.label}</span></div>
          </div>

          <div style={{ marginTop: '32px', color: '#555', fontSize: '12px' }}>
            humanproof.app · Based on company signals + role exposure data · April 2026
          </div>
        </div>

        {/* Actions (Not screenshotted) */}
        <div style={{ padding: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleDownload}
            disabled={downloading}
            style={{ flex: 1, padding: '12px', background: 'var(--cyan, #00F5FF)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            {downloading ? 'Generating...' : 'Download Image'}
          </button>
          <button 
            onClick={handleShareLinkedIn}
            style={{ flex: 1, padding: '12px', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            Share to LinkedIn
          </button>
          <button 
            onClick={onClose}
            style={{ flex: '1 1 100%', padding: '10px', background: 'transparent', color: 'var(--color-gray-custom-text)', border: 'none', cursor: 'pointer', marginTop: '8px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
