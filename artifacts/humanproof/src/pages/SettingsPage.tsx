import { useEffect, useState } from 'react';
import { AchievementGallery } from '../components/AchievementGallery';
import { useUserPlan, planDisplayName } from '../services/subscriptionService';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  CreatedApiKey,
  ApiKey,
  KeyScope,
  SCOPE_LABELS,
} from '../services/apiKeyService';
import {
  WhiteLabelConfig,
  getWhiteLabelConfig,
  saveWhiteLabelConfig,
  resetWhiteLabelConfig,
  fileToDataUrl,
} from '../services/whiteLabelService';
import { useI18n, languages } from '../i18n';
import { track } from '../services/analyticsService';
import { GateCard } from '../components/GateCard';

type Tab = 'account' | 'api_keys' | 'white_label' | 'locale';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account');
  useEffect(() => { track('settings_viewed', { tab }); }, [tab]);

  return (
    <div className="page-wrap" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ maxWidth: 960 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
            SETTINGS
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800 }}>
            Your account & workspace
          </h1>
        </div>

        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24,
          borderBottom: '1px solid var(--border)', paddingBottom: 12,
        }}>
          <TabButton active={tab === 'account'} onClick={() => setTab('account')}>Account</TabButton>
          <TabButton active={tab === 'api_keys'} onClick={() => setTab('api_keys')}>API keys</TabButton>
          <TabButton active={tab === 'white_label'} onClick={() => setTab('white_label')}>White-label</TabButton>
          <TabButton active={tab === 'locale'} onClick={() => setTab('locale')}>Language</TabButton>
        </div>

        {tab === 'account' && <AccountTab />}
        {tab === 'api_keys' && <ApiKeysTab />}
        {tab === 'white_label' && <WhiteLabelTab />}
        {tab === 'locale' && <LocaleTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(0,245,255,0.15)' : 'transparent',
        border: `1px solid ${active ? 'rgba(0,245,255,0.5)' : 'var(--border)'}`,
        color: active ? 'var(--cyan)' : 'var(--text)',
        padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
        fontSize: '0.88rem', fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}

function AccountTab() {
  const plan = useUserPlan();
  return (
    <Panel>
      <h2 style={h2}>Plan</h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
        You're on the <strong style={{ color: 'var(--text)' }}>{planDisplayName(plan)}</strong> plan.
      </p>
      <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="/pricing" className="btn-primary" style={{ padding: '10px 18px' }}>
          {plan === 'free' ? 'Upgrade →' : 'Manage plan →'}
        </a>
        <a href="/team" className="btn-teal" style={{ padding: '10px 18px' }}>Team dashboard</a>
      </div>
      <div style={{ marginTop: 32 }}>
        <AchievementGallery />
      </div>
    </Panel>
  );
}

function ApiKeysTab() {
  const plan = useUserPlan();
  const canUse = plan === 'thriver' || plan === 'enterprise';
  const [keys, setKeys] = useState<ApiKey[]>(() => (canUse ? listApiKeys() : []));
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<KeyScope[]>(['read:scores']);

  if (!canUse) {
    return (
      <Panel>
        <GateCard feature="team_audit" onUpgrade={() => (window.location.href = '/pricing')} />
      </Panel>
    );
  }

  const refresh = () => setKeys(listApiKeys());

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const created = createApiKey({ label, scopes });
    setCreatedKey(created);
    setLabel('');
    refresh();
  };

  const toggleScope = (s: KeyScope) => {
    setScopes(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  };

  const active = keys.filter(k => !k.revokedAt);
  const revoked = keys.filter(k => k.revokedAt);

  return (
    <Panel>
      <h2 style={h2}>Create a new API key</h2>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Key label (e.g. 'Production server')"
          style={inputStyle}
          required
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(Object.keys(SCOPE_LABELS) as KeyScope[]).map(s => (
            <label key={s} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              borderRadius: 999, border: '1px solid var(--border)',
              background: scopes.includes(s) ? 'rgba(0,245,255,0.12)' : 'transparent',
              cursor: 'pointer', fontSize: '0.8rem',
            }}>
              <input
                type="checkbox"
                checked={scopes.includes(s)}
                onChange={() => toggleScope(s)}
                style={{ accentColor: 'var(--cyan)' }}
              />
              {SCOPE_LABELS[s]}
            </label>
          ))}
        </div>
        <button type="submit" className="btn-primary" style={{ padding: '10px 18px', fontSize: '0.88rem', alignSelf: 'flex-start' }}>
          Create key
        </button>
      </form>

      {createdKey && (
        <div style={{
          marginTop: 20, padding: 16,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--emerald)', fontWeight: 700, marginBottom: 6 }}>
            ⚠ Copy this key now — we won't show it again.
          </div>
          <code style={{
            display: 'block', padding: 10, background: 'rgba(0,0,0,0.35)',
            borderRadius: 6, fontSize: '0.82rem', wordBreak: 'break-all',
          }}>{createdKey.fullKey}</code>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(createdKey.fullKey);
              track('api_key_copied', {});
            }}
            className="btn-teal"
            style={{ marginTop: 10, padding: '6px 12px', fontSize: '0.78rem' }}
          >
            Copy to clipboard
          </button>
          <button
            onClick={() => setCreatedKey(null)}
            style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.8rem' }}
          >Dismiss</button>
        </div>
      )}

      <h2 style={{ ...h2, marginTop: 32 }}>Active keys ({active.length})</h2>
      {active.length === 0 ? (
        <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>No active keys yet.</p>
      ) : (
        <KeyList keys={active} onRevoke={(id) => { revokeApiKey(id); refresh(); }} />
      )}

      {revoked.length > 0 && (
        <>
          <h2 style={{ ...h2, marginTop: 32, color: 'var(--text-2)' }}>Revoked ({revoked.length})</h2>
          <KeyList keys={revoked} onDelete={(id) => { deleteApiKey(id); refresh(); }} />
        </>
      )}
    </Panel>
  );
}

function KeyList({
  keys, onRevoke, onDelete,
}: {
  keys: ApiKey[];
  onRevoke?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {keys.map(key => (
        <div key={key.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10,
          background: 'var(--alpha-bg-02)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{key.label}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              color: 'var(--text-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {key.maskedKey}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 4 }}>
              Scopes: {key.scopes.join(', ')} · Created {new Date(key.createdAt).toLocaleDateString()}
              {key.revokedAt && ` · Revoked ${new Date(key.revokedAt).toLocaleDateString()}`}
            </div>
          </div>
          {onRevoke && (
            <button
              onClick={() => onRevoke(key.id)}
              style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
                color: '#fca5a5', padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >Revoke</button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(key.id)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-2)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >Delete</button>
          )}
        </div>
      ))}
    </div>
  );
}

function WhiteLabelTab() {
  const plan = useUserPlan();
  const canUse = plan === 'enterprise';
  const [config, setConfig] = useState<WhiteLabelConfig>(() => getWhiteLabelConfig());
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!canUse) {
    return (
      <Panel>
        <GateCard feature="team_audit" onUpgrade={() => (window.location.href = '/pricing')} />
      </Panel>
    );
  }

  const handleSave = () => {
    saveWhiteLabelConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogo = async (file: File) => {
    if (file.size > 500_000) {
      alert('Logo must be under 500KB');
      return;
    }
    setUploading(true);
    const dataUrl = await fileToDataUrl(file);
    setConfig(prev => ({ ...prev, logoDataUrl: dataUrl }));
    setUploading(false);
  };

  return (
    <Panel>
      <h2 style={h2}>White-label branding</h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 20 }}>
        Enable to apply your brand to shared score reports, team dashboards, and PDF exports.
      </p>

      <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={e => setConfig({ ...config, enabled: e.target.checked })}
          style={{ accentColor: 'var(--cyan)', width: 18, height: 18 }}
        />
        <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>Enable white-label mode</span>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Field label="Brand name">
          <input value={config.brandName} onChange={e => setConfig({ ...config, brandName: e.target.value })} style={inputStyle} placeholder="Acme Inc." />
        </Field>
        <Field label="Report title">
          <input value={config.reportTitle} onChange={e => setConfig({ ...config, reportTitle: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Primary color">
          <input value={config.primaryColor} onChange={e => setConfig({ ...config, primaryColor: e.target.value })} style={inputStyle} placeholder="#00F5FF" />
        </Field>
        <Field label="Accent color">
          <input value={config.accentColor} onChange={e => setConfig({ ...config, accentColor: e.target.value })} style={inputStyle} placeholder="#A855F7" />
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Logo (PNG/SVG ≤ 500KB)">
          <input
            type="file"
            accept="image/png,image/svg+xml,image/jpeg"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleLogo(file);
            }}
            style={{ ...inputStyle, padding: '6px 8px' }}
          />
        </Field>
        {config.logoDataUrl && (
          <div style={{ marginTop: 10, padding: 10, background: 'var(--alpha-bg-05)', borderRadius: 8, display: 'inline-block' }}>
            <img src={config.logoDataUrl} alt="Logo preview" style={{ maxHeight: 48, maxWidth: 200 }} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Footer disclaimer">
          <textarea
            value={config.footerDisclaimer}
            onChange={e => setConfig({ ...config, footerDisclaimer: e.target.value })}
            rows={2}
            style={{ ...inputStyle, fontFamily: 'inherit' }}
            placeholder="Confidential — for internal use only"
          />
        </Field>
      </div>

      <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
        <input
          type="checkbox"
          checked={config.hideHumanProofBranding}
          onChange={e => setConfig({ ...config, hideHumanProofBranding: e.target.checked })}
          style={{ accentColor: 'var(--cyan)' }}
        />
        <span style={{ fontSize: '0.88rem' }}>Hide "Powered by HumanProof" on exports</span>
      </label>

      <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
        <button onClick={handleSave} className="btn-primary" style={{ padding: '10px 20px' }}>
          {saved ? 'Saved ✓' : 'Save branding'}
        </button>
        <button
          onClick={() => { resetWhiteLabelConfig(); setConfig(getWhiteLabelConfig()); }}
          className="btn-teal"
          style={{ padding: '10px 20px' }}
        >
          Reset to defaults
        </button>
      </div>
      {uploading && <p style={{ color: 'var(--text-2)', fontSize: '0.82rem', marginTop: 10 }}>Uploading logo…</p>}
    </Panel>
  );
}

function LocaleTab() {
  const { locale, setLocale } = useI18n();
  return (
    <Panel>
      <h2 style={h2}>Language</h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 16 }}>
        Your language preference syncs across the app and exports.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            style={{
              padding: '12px 14px',
              border: `1px solid ${locale === lang.code ? 'rgba(0,245,255,0.5)' : 'var(--border)'}`,
              background: locale === lang.code ? 'rgba(0,245,255,0.1)' : 'transparent',
              borderRadius: 10, cursor: 'pointer',
              color: locale === lang.code ? 'var(--cyan)' : 'var(--text)',
              fontWeight: locale === lang.code ? 700 : 500,
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: '0.92rem' }}>{lang.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 2 }}>{lang.code.toUpperCase()}</div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 28,
    }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: '0.74rem', color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const h2: React.CSSProperties = {
  fontSize: '1.05rem', fontWeight: 700, marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'var(--alpha-bg-04)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: 'inherit',
};
