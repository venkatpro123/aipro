// ReferralIntelligencePanel.tsx — Referral probability and outreach script generator
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const OUTREACH_TEMPLATES = [
  {
    type: 'Former Manager',
    color: '#10b981',
    subject: 'Catching up + quick ask',
    body: `Hi [Name],

Hope things are going well at [their company]! I've been following [something specific] and it looks like an exciting time.

I'm currently exploring my next chapter — ideally [target role] at a company like yours or similar. If you have 15 mins for a quick call, I'd love to get your perspective on the market.

And of course, if you happen to know of any relevant openings, a referral would mean the world.

Thanks so much,
[Your name]`,
  },
  {
    type: 'Peer / Colleague',
    color: '#a78bfa',
    subject: 'Long time — would love to reconnect',
    body: `Hey [Name],

It's been a while! I saw [something they posted/shared] and it reminded me we haven't caught up in ages.

I'm actively exploring new roles in [space] and would love your ear for 20 mins — both for your perspective and to see if your company or network has any openings in [role].

Let me know if you're free for a quick call this week or next!

[Your name]`,
  },
  {
    type: 'Recruiter',
    color: 'var(--cyan)',
    subject: 'Experienced [Role] open to the right opportunity',
    body: `Hi [Name],

I'm a [Your title] with [X] years at [Company / space]. I noticed you specialize in [their specialty] and wanted to reach out directly.

I'm selectively exploring opportunities — particularly at companies where [AI / growth / mission] is a priority. My background is [quick 1-line value prop].

If you're working with companies that could use someone with my profile, I'd love to talk.

Best,
[Your name]`,
  },
];

export function ReferralIntelligencePanel({ scoreResult }: Props) {
  const net = scoreResult.networkLeverage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Referral Intelligence</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Referrals increase interview probability by 5–10×. Use these scripts to activate your network.
        </div>
      </div>

      {net && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div className="card-premium" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>REFERRAL ACCESS</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{Math.round(net.referralAccessScore ?? 0)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>/ 100</div>
          </div>
          <div className="card-premium" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>NETWORK TIER</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--cyan)' }}>{net.networkTier}</div>
          </div>
          <div className="card-premium" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>WARM OUTREACH TARGET</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{net.applicationChannelSplit?.warmReferral ?? 30}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>of applications</div>
          </div>
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Outreach Templates</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {OUTREACH_TEMPLATES.map((tmpl, i) => (
          <div key={i} className="card-premium" style={{ padding: 20, borderLeft: `3px solid ${tmpl.color}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: tmpl.color, marginBottom: 4 }}>{tmpl.type}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
              Subject: <em style={{ color: 'rgba(255,255,255,0.6)' }}>{tmpl.subject}</em>
            </div>
            <pre style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '14px 16px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              margin: 0,
            }}>{tmpl.body}</pre>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
        💡 Personalize every message — reference something specific about their work. Generic messages get ignored.
        Aim for 5 warm outreach messages per week during active search.
      </div>
    </div>
  );
}
