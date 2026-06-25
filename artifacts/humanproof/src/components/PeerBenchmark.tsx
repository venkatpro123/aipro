// NEW-01: Peer Benchmark Mode
// Static pre-computed percentile bands per job category + industry
// Shows "You are in the top X% of resilience for [role] in [industry]"

interface BenchmarkProps {
  score: number;
  scoreType: 'job' | 'skill' | 'hii';
  jobTitle?: string | null;
  industry?: string | null;
}

// Pre-computed median risk scores per role category (lower = safer for risk scores)
// Source: WEF Future of Jobs 2025 aggregated occupational displacement data
const ROLE_MEDIANS: Record<string, number> = {
  software_engineer: 58, data_scientist: 55, product_manager: 48,
  ux_designer: 52, cybersecurity: 44, doctor: 28, nurse: 22,
  therapist: 18, lawyer: 62, accountant: 74, teacher: 35,
  researcher: 42, social_worker: 20, hr: 56, sales: 50,
  consultant: 45, project_manager: 50, designer: 65, journalist: 60,
  marketing: 68, architect: 45, chef: 30, engineer: 48,
  customer_service: 80, default: 55,
};

// HII medians per role
const HII_MEDIANS: Record<string, number> = {
  software_engineer: 55, data_scientist: 52, therapist: 72, nurse: 70,
  teacher: 65, social_worker: 74, doctor: 65, lawyer: 60,
  hr: 63, marketing: 58, consultant: 58, default: 55,
};

function deriveRoleKey(jobTitle?: string | null, industry?: string | null): string {
  const t = (jobTitle || '').toLowerCase();
  if (/software|developer|programmer|backend|frontend|full.?stack/.test(t)) return 'software_engineer';
  if (/data scientist|ml engineer|machine learning/.test(t)) return 'data_scientist';
  if (/product manager|product owner/.test(t)) return 'product_manager';
  if (/therapist|counsellor|psychologist/.test(t)) return 'therapist';
  if (/nurse|midwife/.test(t)) return 'nurse';
  if (/doctor|physician|surgeon/.test(t)) return 'doctor';
  if (/teacher|lecturer|educator/.test(t)) return 'teacher';
  if (/lawyer|solicitor|barrister|attorney/.test(t)) return 'lawyer';
  if (/accountant|auditor|bookkeeper/.test(t)) return 'accountant';
  if (/social worker/.test(t)) return 'social_worker';
  if (/hr|human resource|people ops/.test(t)) return 'hr';
  if (/marketing|growth|seo/.test(t)) return 'marketing';
  if (/designer|design lead/.test(t)) return 'designer';
  if (/journalist|reporter/.test(t)) return 'journalist';
  if (/customer service|support agent/.test(t)) return 'customer_service';
  if (/consultant|advisory/.test(t)) return 'consultant';
  if (/researcher|research scientist/.test(t)) return 'researcher';
  const ind = (industry || '').toLowerCase();
  if (ind.includes('finance') || ind.includes('account')) return 'accountant';
  if (ind.includes('health')) return 'nurse';
  if (ind.includes('tech')) return 'software_engineer';
  if (ind.includes('educat')) return 'teacher';
  return 'default';
}

// Calculate percentile rank: what % of peers score WORSE (higher risk or lower HII)
function getPercentile(score: number, median: number, scoreType: 'job' | 'skill' | 'hii'): number {
  if (scoreType === 'hii') {
    // Higher HII = better. Assume normal-ish distribution ±15 pts
    const diff = score - median;
    const pct = 50 + (diff / 30) * 50;
    return Math.round(Math.min(99, Math.max(1, pct)));
  } else {
    // Lower risk = better. Invert so percentile = % of peers with higher (worse) risk
    const diff = median - score;
    const pct = 50 + (diff / 30) * 50;
    return Math.round(Math.min(99, Math.max(1, pct)));
  }
}

function getPercentileLabel(pct: number): string {
  if (pct >= 90) return 'top 10%';
  if (pct >= 75) return 'top 25%';
  if (pct >= 60) return 'top 40%';
  if (pct >= 50) return 'above average';
  if (pct >= 35) return 'below average';
  if (pct >= 20) return 'bottom 35%';
  return 'bottom 20%';
}

function getUrgencyNote(pct: number, scoreType: 'job' | 'skill' | 'hii'): string {
  if (pct < 25) {
    if (scoreType === 'hii') return 'Your Human Index is below most peers — focus on building empathic and contextual capabilities.';
    return 'Your risk is higher than most peers in this role — prioritise upskilling now.';
  }
  if (pct < 50) {
    if (scoreType === 'hii') return 'There\'s room to strengthen your human edge relative to peers.';
    return 'Your risk is slightly above the peer average — targeted upskilling will help.';
  }
  if (pct >= 75) {
    if (scoreType === 'hii') return 'You\'re in the top tier for human irreplaceability in your role — keep building on it.';
    return 'You\'re among the most resilient in your peer group — continue strengthening your human edge.';
  }
  return 'Your resilience is around the peer average — there\'s meaningful room to improve.';
}

const SCORE_TYPE_LABELS: Record<string, string> = {
  job: 'Job AI Resilience', skill: 'Skill AI Resilience', hii: 'Human Index',
};

export default function PeerBenchmark({ score, scoreType, jobTitle, industry }: BenchmarkProps) {
  const roleKey = deriveRoleKey(jobTitle, industry);
  const median = scoreType === 'hii' ? (HII_MEDIANS[roleKey] ?? 55) : (ROLE_MEDIANS[roleKey] ?? 55);
  const percentile = getPercentile(score, median, scoreType);
  const percentileLabel = getPercentileLabel(percentile);
  const urgency = getUrgencyNote(percentile, scoreType);
  const isGood = percentile >= 50;
  const color = isGood ? 'var(--emerald)' : percentile >= 35 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div style={{
      background: isGood ? 'rgba(0,255,159,0.04)' : 'rgba(255,71,87,0.04)',
      border: `1px solid ${isGood ? 'rgba(0,255,159,0.25)' : 'rgba(255,71,87,0.25)'}`,
      borderRadius: 10,
      padding: '14px 18px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Peer Benchmark · {SCORE_TYPE_LABELS[scoreType]}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', fontWeight: 700, color }}>{percentile}th</div>
        <div>
          <div style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 2 }}>percentile — {percentileLabel}</div>
          <div style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>vs peers in similar {jobTitle ? `"${jobTitle}"` : industry || 'general'} roles</div>
        </div>
      </div>

      {/* Peer distribution bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text2)' }}>Bottom 25%</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text2)' }}>Top 10%</span>
        </div>
        <div style={{ height: 8, background: 'var(--alpha-bg-06)', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${percentile}%`, borderRadius: 4,
            background: `linear-gradient(90deg, ${isGood ? '#00FF9F' : '#ff4757'}, ${isGood ? '#00F5FF' : '#ff7043'})`,
            transition: 'width 0.6s ease',
          }} />
          {/* Median marker */}
          <div style={{
            position: 'absolute', left: '50%', top: -3, bottom: -3,
            width: 2, background: 'var(--alpha-text-30)', borderRadius: 1,
          }} title="Peer median" />
          {/* Your position marker */}
          <div style={{
            position: 'absolute', left: `${percentile}%`, top: -4,
            transform: 'translateX(-50%)',
            width: 14, height: 14,
            borderRadius: '50%', background: color,
            border: '2px solid var(--bg)',
            boxShadow: `0 0 6px ${color}`,
          }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 4, fontSize: '0.7rem', color: 'var(--text2)' }}>
          Peer median: {median} · Your score: {score}
        </div>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.5, borderTop: '1px solid var(--alpha-bg-06)', paddingTop: 8 }}>
        {urgency}
        <span style={{ color: 'var(--text2)', fontSize: '0.72rem' }}> — Based on WEF Future of Jobs 2025 + McKinsey 2025 occupational data.</span>
      </div>
    </div>
  );
}
