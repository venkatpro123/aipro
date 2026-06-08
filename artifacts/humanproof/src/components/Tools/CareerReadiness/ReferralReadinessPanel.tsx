// ReferralReadinessPanel.tsx — Referral activation using network leverage data
import { useState } from 'react';
import { Users, Copy, CheckCircle } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult | null;
}

const OUTREACH_TEMPLATES = [
  {
    type: 'Former Manager',
    template: `Hi [Name],

Hope you're doing well! I've been following [Company]'s recent progress — really impressive work.

I'm currently exploring new opportunities in [role category] and would love your perspective on the market. If there's ever a fit at [Company], I'd love to be considered.

Would you be open to a quick 15-minute chat sometime this week?`,
  },
  {
    type: 'Peer / Colleague',
    template: `Hey [Name],

Great seeing your recent post about [topic]!

Quick question — is your team at [Company] hiring [role] right now? I'm passively exploring and [Company] has always been on my list.

No pressure at all — just thought I'd reach out since we've worked together and I trust your judgment on culture fit.`,
  },
  {
    type: 'Recruiter',
    template: `Hi [Name],

I came across your profile and noticed you recruit for [domain] roles. I'm a [title] with [X] years of experience in [specialty], currently open to new opportunities.

My key strengths: [3 bullet points from your resume]. I'm particularly interested in [company type/industry].

Would you be open to a brief call to explore if I might be a fit for any of your current openings?`,
  },
];

export function ReferralReadinessPanel({ scoreResult }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const networkLeverage = scoreResult?.networkLeverage;
  const networkScore = networkLeverage?.networkScore ?? null;

  async function copyTemplate(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Referral Readiness
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Activate your network with proven outreach templates. Referred candidates are 4× more likely to be hired.
        </div>
      </div>

      {/* Network score */}
      {networkScore !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '16px 20px',
          borderRadius: 14,
          background: networkScore >= 60 ? 'rgba(16,185,129,0.1)' : networkScore >= 35 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${networkScore >= 60 ? 'rgba(16,185,129,0.3)' : networkScore >= 35 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
          marginBottom: 24,
        }}>
          <Users size={24} color={networkScore >= 60 ? '#10b981' : networkScore >= 35 ? '#f59e0b' : '#ef4444'} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              Network Leverage: {Math.round(networkScore)}/100
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {networkScore >= 60
                ? networkLeverage?.networkHeadline ?? 'Strong network — activate referrals now.'
                : networkScore >= 35
                ? 'Moderate network — focus on reactivating dormant contacts.'
                : 'Weak network — prioritize building relationships this month.'}
            </div>
          </div>
        </div>
      )}

      {/* Referral tips */}
      <div className="card-premium" style={{ padding: 18, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>
          Referral Activation Playbook
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'Identify 3 target companies where you know someone (even loosely)',
            'Reconnect with former colleagues before asking for referrals',
            'Be specific: ask about a particular role, not a general referral',
            'Offer to send your resume in advance to make it easy for them',
            'Follow up once after 5 days if no response — then move on',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ color: '#a78bfa', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Outreach templates */}
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>
        Copy & Customize Outreach Templates
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OUTREACH_TEMPLATES.map((tmpl, idx) => (
          <div key={idx} className="card-premium" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#a78bfa' }}>{tmpl.type}</div>
              <button
                onClick={() => copyTemplate(tmpl.template, idx)}
                style={{
                  background: copiedIdx === idx ? 'rgba(16,185,129,0.2)' : 'rgba(167,139,250,0.15)',
                  border: '1px solid rgba(167,139,250,0.3)',
                  borderRadius: 6,
                  padding: '5px 10px',
                  color: copiedIdx === idx ? '#10b981' : '#a78bfa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                }}
              >
                {copiedIdx === idx ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
              margin: 0,
              fontFamily: 'inherit',
            }}>
              {tmpl.template}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
