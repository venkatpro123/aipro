// PreferencesPanel.tsx — Career preferences stored in user_profiles.career_preferences
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { fetchUserProfile, upsertUserProfile, type UserProfile } from '../../../services/userProfileService';

// ── Phase 5: decision-shaping personalization (typed columns, not JSON prefs) ──
type RiskTolerance = NonNullable<UserProfile['riskTolerance']>;
type GeoMobility = NonNullable<UserProfile['geographicMobility']>;
const CAREER_VALUE_OPTIONS = ['Stability', 'Growth', 'Compensation', 'Flexibility', 'Impact', 'Work–life balance'];

interface Preferences {
  workMode: 'remote' | 'hybrid' | 'onsite' | '';
  relocationWilling: boolean;
  relocationRegions: string;
  roleType: 'ic' | 'manager' | 'either' | '';
  companySize: 'startup' | 'mid' | 'enterprise' | 'any' | '';
  industryPrefs: string;
  salaryMin: string;
  openToContract: boolean;
  openToPartTime: boolean;
}

const DEFAULT_PREFS: Preferences = {
  workMode: '',
  relocationWilling: false,
  relocationRegions: '',
  roleType: '',
  companySize: '',
  industryPrefs: '',
  salaryMin: '',
  openToContract: false,
  openToPartTime: false,
};

export function PreferencesPanel() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Phase 5: decision-shaping fields (typed user_profiles columns) ──────────
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance | ''>('');
  const [geoMobility, setGeoMobility] = useState<GeoMobility | ''>('');
  const [careerValues, setCareerValues] = useState<string[]>([]);
  const [advSaving, setAdvSaving] = useState(false);
  const [advSaved, setAdvSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_profiles').select('career_preferences').eq('user_id', user.id).single().then(({ data }) => {
      if (data?.career_preferences) setPrefs({ ...DEFAULT_PREFS, ...(data.career_preferences as Preferences) });
      setLoading(false);
    });
    // Load the typed decision fields via the profile service (handles mapping).
    fetchUserProfile().then(p => {
      if (!p) return;
      if (p.riskTolerance) setRiskTolerance(p.riskTolerance);
      if (p.geographicMobility) setGeoMobility(p.geographicMobility);
      if (p.careerValues?.length) setCareerValues(p.careerValues);
    }).catch(() => { /* unauthenticated — leave defaults */ });
  }, [user]);

  const toggleValue = (v: string) =>
    setCareerValues(cur => cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]);

  const saveAdvanced = async () => {
    setAdvSaving(true);
    await upsertUserProfile({
      riskTolerance: riskTolerance || null,
      geographicMobility: geoMobility || null,
      careerValues: careerValues.length > 0 ? careerValues : null,
    });
    setAdvSaving(false);
    setAdvSaved(true);
    setTimeout(() => setAdvSaved(false), 2500);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('user_profiles').upsert({ user_id: user.id, career_preferences: prefs }, { onConflict: 'user_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPrefs(p => ({ ...p, [key]: value }));

  if (loading) return <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px 0' }}>Loading preferences…</div>;

  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 };
  const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text)', fontSize: 13 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Career Preferences</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your ideal work environment and job search filters — used to personalize all recommendations.
        </div>
      </div>

      {/* Work style */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Work Style</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={labelStyle}>WORK MODE</div>
            <select value={prefs.workMode} onChange={e => set('workMode', e.target.value as Preferences['workMode'])} style={selectStyle}>
              <option value="">Select…</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
          <div>
            <div style={labelStyle}>ROLE TYPE</div>
            <select value={prefs.roleType} onChange={e => set('roleType', e.target.value as Preferences['roleType'])} style={selectStyle}>
              <option value="">Select…</option>
              <option value="ic">Individual Contributor</option>
              <option value="manager">Manager / Lead</option>
              <option value="either">Either</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <input type="checkbox" checked={prefs.openToContract} onChange={e => set('openToContract', e.target.checked)} style={{ accentColor: 'var(--cyan)' }} />
            Open to contract / freelance
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <input type="checkbox" checked={prefs.openToPartTime} onChange={e => set('openToPartTime', e.target.checked)} style={{ accentColor: 'var(--cyan)' }} />
            Open to part-time
          </label>
        </div>
      </div>

      {/* Company preference */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Company Preference</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={labelStyle}>COMPANY SIZE</div>
            <select value={prefs.companySize} onChange={e => set('companySize', e.target.value as Preferences['companySize'])} style={selectStyle}>
              <option value="">Select…</option>
              <option value="startup">Startup (&lt;200)</option>
              <option value="mid">Mid-size (200–5K)</option>
              <option value="enterprise">Enterprise (5K+)</option>
              <option value="any">No preference</option>
            </select>
          </div>
          <div>
            <div style={labelStyle}>MIN SALARY (USD/yr)</div>
            <input type="number" value={prefs.salaryMin} onChange={e => set('salaryMin', e.target.value)} placeholder="e.g. 120000" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={labelStyle}>PREFERRED INDUSTRIES (comma-separated)</div>
            <input value={prefs.industryPrefs} onChange={e => set('industryPrefs', e.target.value)} placeholder="e.g. fintech, healthcare, B2B SaaS" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Relocation */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Relocation</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 14 }}>
          <input type="checkbox" checked={prefs.relocationWilling} onChange={e => set('relocationWilling', e.target.checked)} style={{ accentColor: 'var(--cyan)', width: 16, height: 16 }} />
          Willing to relocate for the right role
        </label>
        {prefs.relocationWilling && (
          <div>
            <div style={labelStyle}>PREFERRED REGIONS (comma-separated)</div>
            <input value={prefs.relocationRegions} onChange={e => set('relocationRegions', e.target.value)} placeholder="e.g. San Francisco, London, Singapore, Remote-first" style={inputStyle} />
          </div>
        )}
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
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Preferences'}
      </button>

      {/* ── Phase 5: Customize Your Advice — shapes the decision engine directly ── */}
      <div className="card-premium" style={{ padding: 20, borderColor: 'rgba(167,139,250,0.2)' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>Customize Your Advice</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
          These directly shape the system's stay/leave verdict and strategy — not just job filters.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <div style={labelStyle}>RISK TOLERANCE</div>
            <select aria-label="Risk tolerance" value={riskTolerance} onChange={e => setRiskTolerance(e.target.value as RiskTolerance | '')} style={selectStyle}>
              <option value="">Default (balanced)</option>
              <option value="conservative">Conservative — recommend leaving only at high risk</option>
              <option value="moderate">Moderate — balanced threshold</option>
              <option value="aggressive">Aggressive — flag exits earlier</option>
            </select>
          </div>
          <div>
            <div style={labelStyle}>GEOGRAPHIC MOBILITY</div>
            <select aria-label="Geographic mobility" value={geoMobility} onChange={e => setGeoMobility(e.target.value as GeoMobility | '')} style={selectStyle}>
              <option value="">Not specified</option>
              <option value="none">Can't relocate — keep advice local</option>
              <option value="same_country">Open within my country</option>
              <option value="global">Open globally</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>WHAT YOU OPTIMIZE FOR</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {CAREER_VALUE_OPTIONS.map(v => {
              const active = careerValues.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleValue(v)}
                  style={{
                    padding: '6px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${active ? 'rgba(167,139,250,0.5)' : 'var(--border)'}`,
                    background: active ? 'rgba(167,139,250,0.15)' : 'transparent',
                    color: active ? '#a78bfa' : 'rgba(255,255,255,0.55)', transition: 'all 0.15s',
                  }}
                >
                  {active ? '✓ ' : ''}{v}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={saveAdvanced}
          disabled={advSaving}
          style={{
            padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
            background: advSaved ? '#10b981' : '#a78bfa', color: '#000', transition: 'background 0.2s',
          }}
        >
          {advSaving ? 'Saving…' : advSaved ? '✓ Saved' : 'Save Advice Settings'}
        </button>
      </div>
    </div>
  );
}
