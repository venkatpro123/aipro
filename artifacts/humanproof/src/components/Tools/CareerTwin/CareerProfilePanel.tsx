// CareerProfilePanel.tsx — Full profile view/edit using userProfileService
import { useState, useEffect } from 'react';
import { fetchUserProfile, upsertUserProfile } from '../../../services/userProfileService';
import { useAuth } from '../../../context/AuthContext';

const PERFORMANCE_TIERS = ['top', 'above_average', 'average', 'below_average'];
const VISA_STATUSES = ['citizen', 'permanent_resident', 'h1b', 'l1', 'opt', 'other'];

export function CareerProfilePanel() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchUserProfile().then(p => {
      setProfile(p ?? {});
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await upsertUserProfile(profile as any);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const field = (key: string, label: string, type: 'text' | 'number' = 'text', hint?: string) => (
    <div key={key}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <input
        type={type}
        value={profile[key] ?? ''}
        onChange={e => setProfile(p => ({ ...p, [key]: type === 'number' ? parseFloat(e.target.value) || '' : e.target.value }))}
        placeholder={hint}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
      />
    </div>
  );

  const select = (key: string, label: string, options: string[]) => (
    <div key={key}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <select
        value={profile[key] ?? ''}
        onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text)', fontSize: 13 }}
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  );

  if (loading) return <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px 0' }}>Loading profile…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Career Profile</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your career twin's core profile. More complete = more personalized recommendations.
        </div>
      </div>

      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Role & Experience</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('jobTitle', 'Job Title', 'text', 'e.g. Senior Software Engineer')}
          {field('yearsExperience', 'Years of Experience', 'number', 'e.g. 6')}
          {field('industryKey', 'Industry', 'text', 'e.g. technology, finance')}
          {select('performanceTier', 'Performance Tier', PERFORMANCE_TIERS)}
        </div>
      </div>

      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Location & Visa</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('metroArea', 'Metro Area', 'text', 'e.g. San Francisco, Bangalore')}
          {select('visaStatus', 'Visa Status', VISA_STATUSES)}
        </div>
      </div>

      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Financial Situation</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('monthlySalaryUsd', 'Monthly Salary (USD)', 'number', 'e.g. 10000')}
          {field('monthlyExpensesUsd', 'Monthly Expenses (USD)', 'number', 'e.g. 6000')}
          {field('savingsMonthsRunway', 'Savings Runway (months)', 'number', 'e.g. 8')}
          {field('equityVestMonths', 'Equity Vest Months Remaining', 'number', 'e.g. 18')}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{
          padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          background: saved ? '#10b981' : 'var(--cyan)', color: '#000', transition: 'background 0.2s',
          alignSelf: 'flex-start',
        }}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Profile'}
      </button>
    </div>
  );
}
