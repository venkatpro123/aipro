// ════════════════════════════════════════════════════════════════
// AuthModal.tsx — Futuristic Classic Redesign
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetMessages = () => { setErrorMsg(''); setSuccessMsg(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccessMsg('✓ Identity verification reset sent.');
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('✓ Account initialized. Verify email.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failure.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setOauthLoading(true);
    resetMessages();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Neural link failed.');
      setOauthLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px',
    background: 'var(--alpha-bg-04)',
    border: '1px solid var(--alpha-bg-06)', borderRadius: '12px',
    color: 'var(--text)', fontFamily: 'var(--body)', fontSize: '0.85rem',
    // v40.0 a11y: outline removed from inline style. Global `:focus:not(:focus-visible)`
    // CSS rule handles mouse focus, while `:focus-visible` preserves keyboard focus.
    boxSizing: 'border-box', transition: 'all 0.3s',
    fontWeight: '500',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(1,2,4,0.92)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(20px)',
    }}
    role="dialog"
    aria-modal="true"
    aria-label="Sign in to HumanProof"
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-deep, #020408)',
        border: '1px solid var(--alpha-bg-08)',
        borderRadius: '32px', padding: '48px', width: '100%',
        maxWidth: '440px', position: 'relative',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        animation: 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}>
        {/* Top Glow Bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)', opacity: 0.5 }} />

        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: '24px', right: '24px',
          background: 'var(--alpha-bg-04)', border: 'none', color: 'var(--color-slate500-text)',
          cursor: 'pointer', fontSize: '1rem', width: 28, height: 28, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
        }}>×</button>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'var(--text)', marginBottom: '8px', fontFamily: 'var(--heading)', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {mode === 'forgot' ? 'Protocol Reset' : mode === 'login' ? 'Authenticating' : 'Initialize Node'}
          </h2>
          <p style={{ color: 'var(--color-slate500-text)', fontSize: '0.85rem', fontWeight: 500 }}>
            {mode === 'forgot' ? "Verify your network address to proceed." :
             mode === 'login' ? 'Access your high-fidelity risk profile.' :
             'Join the standard for career irreplaceability.'}
          </p>
        </div>

        {errorMsg && (
          <div style={{ color: 'var(--color-red-text)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '24px', padding: '12px 16px', background: 'rgba(244,63,94,0.05)', borderRadius: '12px', border: '1px solid rgba(244,63,94,0.1)' }}>
             CRITICAL ERROR: {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ color: 'var(--cyan)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '24px', padding: '12px 16px', background: 'rgba(0,245,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,245,255,0.1)' }}>
            STATUS: {successMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {mode !== 'forgot' && (
            <button
              type="button" onClick={handleGoogleOAuth} disabled={oauthLoading}
              style={{
                width: '100%', padding: '14px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 12, background: 'white',
                border: 'none', borderRadius: '100px',
                color: '#000', fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 800,
                cursor: oauthLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s', opacity: oauthLoading ? 0.7 : 1,
                textTransform: 'uppercase', letterSpacing: '0.1em'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {oauthLoading ? 'Initiating Link...' : 'Continue with Google'}
            </button>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="auth-email" style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--color-slate600-text)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Network Identity</label>
              <input id="auth-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="USER://EMAIL_ADDR" />
            </div>

            {mode !== 'forgot' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="auth-password" style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--color-slate600-text)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Access Key</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('forgot'); resetMessages(); }}
                      style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: '0.6875rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Recover Key?
                    </button>
                  )}
                </div>
                <input id="auth-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={inputStyle} placeholder="KEY://••••••••" />
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '16px',
                background: 'transparent',
                color: 'var(--cyan)', border: '1px solid var(--cyan)', borderRadius: '100px',
                fontWeight: 800, fontFamily: 'var(--mono)', fontSize: '0.75rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.2em',
                opacity: loading ? 0.7 : 1, transition: 'all 0.3s',
                boxShadow: '0 0 20px rgba(0,245,255,0.05)',
              }}>
              {loading ? 'Processing...' : mode === 'forgot' ? 'Reset Identity' : mode === 'login' ? 'Authenticate' : 'Initialize'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '8px 0' }}>
            {mode !== 'login' && (
              <button type="button" onClick={() => { setMode('login'); resetMessages(); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-slate500-text)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                Sign In
              </button>
            )}
            {mode !== 'signup' && (
              <button type="button" onClick={() => { setMode('signup'); resetMessages(); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-slate500-text)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                Create Node
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
