import React, { useState } from 'react';
import { submitEnterpriseContact, TEAM_SIZE_OPTIONS, USE_CASE_OPTIONS, type EnterpriseContactInput } from '../services/enterpriseContactService';

interface EnterpriseContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1px solid var(--border, rgba(255,255,255,0.12))',
  borderRadius: '6px',
  background: 'var(--surface-glass, rgba(255,255,255,0.04))',
  color: 'var(--text)',
  fontSize: '14px',
  fontFamily: 'inherit',
};

const Row: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{display: 'flex', gap: '16px', marginBottom: '16px'}}>{children}</div>
);

const Field: React.FC<{label: string; children: React.ReactNode; flex?: number}> = ({label, children, flex = 1}) => (
  <div style={{flex}}>
    <label style={{display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-2)'}}>{label}</label>
    {children}
  </div>
);

export const EnterpriseContactModal: React.FC<EnterpriseContactModalProps> = ({isOpen, onClose}) => {
  const [formData, setFormData] = useState<Partial<EnterpriseContactInput>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitEnterpriseContact(formData as EnterpriseContactInput);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({});
      }, 2000);
    } else {
      setError(result.error || 'Something went wrong');
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card, #0b1020)',
    border: '1px solid var(--cyan, #00f5ff)',
    borderRadius: '12px', padding: '32px',
  };

  if (success) {
    return (
      <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="enterprise-modal-title">
        <div style={{...cardStyle, maxWidth: '400px', textAlign: 'center'}}>
          <div style={{fontSize: '48px', marginBottom: '16px'}}>✓</div>
          <h2 style={{marginBottom: '12px', color: 'var(--text)'}}>Thanks for reaching out!</h2>
          <p style={{color: 'var(--text-2)'}}>Our sales team will contact you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={{...cardStyle, maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
        <h2 id="enterprise-modal-title" style={{marginBottom: '24px', fontSize: '20px', color: 'var(--text)'}}>Enterprise Contact</h2>

        <form onSubmit={handleSubmit}>
          <Row>
            <Field label="Full Name *"><input type="text" placeholder="John Doe" required value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} style={inputStyle} autoComplete="name" /></Field>
            <Field label="Email *"><input type="email" placeholder="john@company.com" required value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} style={inputStyle} autoComplete="email" /></Field>
          </Row>

          <Row>
            <Field label="Company *"><input type="text" placeholder="Acme Corp" required value={formData.company || ''} onChange={(e) => setFormData({...formData, company: e.target.value})} style={inputStyle} autoComplete="organization" /></Field>
            <Field label="Job Role"><input type="text" placeholder="Head of HR" value={formData.role || ''} onChange={(e) => setFormData({...formData, role: e.target.value})} style={inputStyle} autoComplete="organization-title" /></Field>
          </Row>

          <Row>
            <Field label="Team Size">
              <select value={formData.teamSize || ''} onChange={(e) => setFormData({...formData, teamSize: e.target.value})} style={inputStyle}>
                <option value="">Select...</option>
                {TEAM_SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </Field>
            <Field label="Use Case">
              <select value={formData.useCase || ''} onChange={(e) => setFormData({...formData, useCase: e.target.value})} style={inputStyle}>
                <option value="">Select...</option>
                {USE_CASE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Phone (optional)"><input type="tel" placeholder="+1 (555) 123-4567" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={inputStyle} /></Field>
          </Row>

          <Row>
            <Field label="Message (optional)">
              <textarea placeholder="Tell us about your needs..." value={formData.message || ''} onChange={(e) => setFormData({...formData, message: e.target.value})} rows={4} style={inputStyle} />
            </Field>
          </Row>

          {error && (
            <div style={{padding: '12px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)', borderRadius: '6px', marginBottom: '16px', color: 'var(--color-red-text)', fontSize: '13px'}}>
              {error}
            </div>
          )}

          <Row>
            <button type="button" onClick={onClose} disabled={loading} style={{flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border, rgba(255,255,255,0.12))', borderRadius: '6px', color: 'var(--text-2)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, fontSize: '14px', fontWeight: '500'}}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{flex: 1, padding: '10px', background: 'var(--cyan, #00f5ff)', border: 'none', borderRadius: '6px', color: '#000', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, fontSize: '14px', fontWeight: '500'}}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </Row>
        </form>
      </div>
    </div>
  );
};
