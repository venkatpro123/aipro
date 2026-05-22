// GdprConsentModal.tsx
// GDPR consent modal — shown on first use for EU users.
//
// Triggered by: LayoffAuditDashboard detecting isEuUser && !hasGdprConsent().
// The modal blocks interaction until the user accepts. Rejecting is not an
// option — the service requires core consent (Art. 6(1)(b), contract).
// Community share and financial cloud storage are genuinely optional.
//
// Consent captured:
//   1. Core service data (non-optional) — required for the service to function
//   2. Community risk signal sharing (opt-IN required for EU)
//   3. Financial data cloud storage (opt-IN; default opt-OUT for EU)
//
// On "Save my preferences": calls saveGdprConsent() which writes to
// localStorage AND to user_profiles (if authenticated).

import React, { useState } from 'react';
import { Shield, Download, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import {
  saveGdprConsent,
  exportUserData,
  requestDataDeletion,
  type GdprConsentState,
} from '../services/gdprService';

interface Props {
  onConsentSaved: () => void;
}

const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border:     '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  padding: '16px 20px',
};

const TOGGLE_STYLE = (on: boolean): React.CSSProperties => ({
  width: 40, height: 22, borderRadius: 11,
  background: on ? 'var(--cyan, #00d4e0)' : 'rgba(255,255,255,0.15)',
  border: 'none', cursor: 'pointer', padding: 0,
  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
});

const THUMB_STYLE = (on: boolean): React.CSSProperties => ({
  position: 'absolute', top: 3, left: on ? 21 : 3,
  width: 16, height: 16, borderRadius: 8,
  background: '#fff', transition: 'left 0.2s',
});

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }> = ({
  on, onChange, disabled, label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => !disabled && onChange(!on)}
    style={{ ...TOGGLE_STYLE(on), opacity: disabled ? 0.4 : 1 }}
  >
    <span style={THUMB_STYLE(on)} />
  </button>
);

export const GdprConsentModal: React.FC<Props> = ({ onConsentSaved }) => {
  const [communityShare, setCommunityShare]         = useState(false);
  const [financialDataCloud, setFinancialDataCloud] = useState(false);
  const [showDetails, setShowDetails]               = useState(false);
  const [saving, setSaving]                         = useState(false);
  const [exportStatus, setExportStatus]             = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [deletePhase, setDeletePhase]               = useState<'idle'|'confirm'|'deleting'|'done'>('idle');

  const handleSave = async () => {
    setSaving(true);
    const consent: GdprConsentState = {
      version:            '1.0',
      isEuUser:           true,
      coreConsent:        true,
      communityShare,
      financialDataCloud,
      consentedAt:        new Date().toISOString(),
    };
    await saveGdprConsent(consent);
    setSaving(false);
    onConsentSaved();
  };

  const handleExport = async () => {
    setExportStatus('loading');
    try {
      await exportUserData();
      setExportStatus('done');
    } catch {
      setExportStatus('error');
    }
  };

  const handleDeleteRequest = async () => {
    if (deletePhase === 'idle') { setDeletePhase('confirm'); return; }
    if (deletePhase === 'confirm') {
      setDeletePhase('deleting');
      try {
        await requestDataDeletion();
        setDeletePhase('done');
      } catch {
        setDeletePhase('idle');
      }
    }
  };

  if (deletePhase === 'done') {
    return (
      <div style={OVERLAY}>
        <div style={PANEL}>
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <Trash2 style={{ color: '#10b981', width: 40, height: 40, margin: '0 auto 16px' }} />
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              All data deleted
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6 }}>
              Your personal data has been permanently erased from our systems.
              Your account has been closed. Thank you for using HumanProof.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={OVERLAY} role="dialog" aria-modal="true" aria-labelledby="gdpr-modal-title">
      <div style={PANEL}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(0,212,224,0.12)', border: '1px solid rgba(0,212,224,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield style={{ width: 22, height: 22, color: '#00d4e0' }} />
          </div>
          <div>
            <h2 id="gdpr-modal-title" style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              Your data. Your control.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              We operate under EU GDPR. Before you start, choose how your data is handled.
            </p>
          </div>
        </div>

        {/* Item 1: Core consent (non-optional) */}
        <div style={{ ...CARD_STYLE, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Toggle on={true} onChange={() => {}} disabled label="Core service data (required)" />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
                Core service data
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 500,
                  color: 'rgba(255,255,255,0.40)', letterSpacing: '0.05em',
                }}>
                  REQUIRED
                </span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, lineHeight: 1.55, margin: 0 }}>
                Risk assessment results, career profile, and audit history. Required for the
                service to function. Legal basis: contract (GDPR Art. 6(1)(b)).
              </p>
            </div>
          </div>
        </div>

        {/* Item 2: Community share (explicit opt-IN for EU) */}
        <div style={{ ...CARD_STYLE, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Toggle
              on={communityShare}
              onChange={setCommunityShare}
              label="Share anonymized risk score for peer benchmarks"
            />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
                Anonymized risk signal sharing
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 500,
                  color: 'rgba(0,212,224,0.70)', letterSpacing: '0.05em',
                }}>
                  OPTIONAL
                </span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, lineHeight: 1.55, margin: 0 }}>
                Share your anonymized score tier, industry, and role to improve peer benchmarks.
                Never your name, employer, or salary. You can withdraw at any time.
                Legal basis: explicit consent (GDPR Art. 6(1)(a)).
              </p>
            </div>
          </div>
        </div>

        {/* Item 3: Financial data cloud (opt-IN for EU) */}
        <div style={{ ...CARD_STYLE, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Toggle
              on={financialDataCloud}
              onChange={setFinancialDataCloud}
              label="Store financial context in cloud for cross-device access"
            />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
                Financial context cloud storage
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 500,
                  color: 'rgba(0,212,224,0.70)', letterSpacing: '0.05em',
                }}>
                  OPTIONAL
                </span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, lineHeight: 1.55, margin: 0 }}>
                Monthly expenses and savings runway stored in our EU-region database for
                cross-device access. If declined, this data stays on this device only.
                Legal basis: explicit consent (GDPR Art. 6(1)(a)).
              </p>
            </div>
          </div>
        </div>

        {/* Your rights (collapsible) */}
        <button
          type="button"
          onClick={() => setShowDetails(d => !d)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
            color: 'rgba(0,212,224,0.75)', fontSize: 11, display: 'flex',
            alignItems: 'center', gap: 4, marginBottom: showDetails ? 12 : 16,
          }}
        >
          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Your GDPR rights
        </button>

        {showDetails && (
          <div style={{
            ...CARD_STYLE, marginBottom: 16, fontSize: 11,
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.65,
          }}>
            <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.70)', fontWeight: 600 }}>
              You have the right to:
            </p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li><strong style={{ color: 'rgba(255,255,255,0.65)' }}>Access</strong> — download all data we hold about you (GDPR Art. 15)</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.65)' }}>Portability</strong> — receive your data in machine-readable JSON (Art. 20)</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.65)' }}>Erasure</strong> — permanently delete your account and all data (Art. 17)</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.65)' }}>Withdraw consent</strong> — at any time from Profile → Data & Privacy</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.65)' }}>Lodge a complaint</strong> — with your national DPA</li>
            </ul>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.35)' }}>
              Contact: privacy@humanproof.ai
            </p>

            {/* Inline export / deletion shortcuts */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={handleExport}
                disabled={exportStatus === 'loading'}
                style={{
                  background: 'rgba(0,212,224,0.10)', border: '1px solid rgba(0,212,224,0.25)',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                  color: '#00d4e0', fontSize: 10, display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <Download size={11} />
                {exportStatus === 'loading' ? 'Exporting…' : exportStatus === 'done' ? 'Downloaded ✓' : 'Export my data'}
              </button>

              <button
                type="button"
                onClick={handleDeleteRequest}
                style={{
                  background: deletePhase === 'confirm' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${deletePhase === 'confirm' ? 'rgba(239,68,68,0.40)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                  color: deletePhase === 'confirm' ? '#ef4444' : 'rgba(255,255,255,0.40)',
                  fontSize: 10, display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <Trash2 size={11} />
                {deletePhase === 'idle'     ? 'Delete my account'
                  : deletePhase === 'confirm'  ? 'Click again to confirm permanent deletion'
                  : 'Deleting…'}
              </button>
            </div>

            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: 'rgba(0,212,224,0.55)', fontSize: 10, marginTop: 10,
                textDecoration: 'none',
              }}
            >
              Privacy Policy <ExternalLink size={9} />
            </a>
          </div>
        )}

        {/* Accept button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
            background: saving ? 'rgba(0,212,224,0.30)' : 'var(--cyan, #00d4e0)',
            color: saving ? 'rgba(255,255,255,0.60)' : '#0a0f1a',
            fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving…' : 'Save my preferences and continue'}
        </button>

        <p style={{
          textAlign: 'center', marginTop: 10, fontSize: 10,
          color: 'rgba(255,255,255,0.25)', lineHeight: 1.5,
        }}>
          You can change these settings at any time in Profile → Data &amp; Privacy.
        </p>
      </div>
    </div>
  );
};

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px',
};

const PANEL: React.CSSProperties = {
  width: '100%', maxWidth: 480,
  background: '#0d1320',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 20,
  padding: '28px 24px 24px',
  maxHeight: '90vh',
  overflowY: 'auto',
};
