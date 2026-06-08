// AuthModal.tsx — Professional auth modal with Google OAuth
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

type AuthMode = 'login' | 'signup' | 'forgot';

const FEATURES = [
  'Real-time layoff risk scoring',
  'AI career defense roadmap',
  'Live company intelligence',
  'Personalized action plan',
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
        setSuccessMsg('Password reset email sent. Check your inbox.');
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMsg('Account created! Check your email to verify your address.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
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
      setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
      setOauthLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => { setMode(next); resetMessages(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
            style={{
              background: '#0d1117',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24,
              width: '100%',
              maxWidth: 860,
              overflow: 'hidden',
              display: 'flex',
              maxHeight: '90vh',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Left panel */}
            <div
              className="auth-left-panel"
              style={{
                flex: '0 0 340px',
                background: 'linear-gradient(160deg, #0a1628 0%, #0d1a2e 60%, #091220 100%)',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                padding: '48px 36px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: -60, left: -60, width: 280, height: 280,
                background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: -40, right: -40, width: 200, height: 200,
                background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--cyan), #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield size={18} color="#fff" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                  HumanProof
                </span>
              </div>

              <div style={{ marginBottom: 32 }}>
                <h2 style={{
                  fontSize: 26, fontWeight: 800, color: '#fff',
                  lineHeight: 1.25, marginBottom: 12, letterSpacing: '-0.03em',
                }}>
                  Your career,<br />
                  <span style={{ color: 'var(--cyan)' }}>protected by AI</span>
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  Know your layoff risk before your manager does. Get a personalized action plan in 60 seconds.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={15} color="var(--cyan)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Trusted by professionals at
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8 }}>
                  Google · Microsoft · Amazon · Meta · Apple · Netflix
                </div>
              </div>
            </div>

            {/* Right panel — form */}
            <div style={{
              flex: 1, padding: '48px 40px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              overflowY: 'auto', position: 'relative',
            }}>
              <button
                onClick={onClose}
                type="button"
                aria-label="Close"
                style={{
                  position: 'absolute', top: 20, right: 20,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={15} />
              </button>

              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>
                  {mode === 'forgot' ? 'Reset your password'
                    : mode === 'login' ? 'Welcome back'
                    : 'Create your account'}
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
                  {mode === 'forgot' ? "Enter your email and we'll send you a reset link."
                    : mode === 'login' ? 'Sign in to access your career intelligence dashboard.'
                    : 'Start protecting your career in under 2 minutes. Free forever.'}
                </p>
              </div>

              {errorMsg && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 20,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 13, color: '#fca5a5',
                }}>
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 20,
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: 13, color: '#6ee7b7',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <CheckCircle size={14} color="#6ee7b7" style={{ flexShrink: 0 }} />
                  {successMsg}
                </div>
              )}

              {mode !== 'forgot' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleOAuth}
                    disabled={oauthLoading}
                    style={{
                      width: '100%', padding: '13px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      background: '#fff', border: 'none', borderRadius: 12,
                      color: '#1a1a1a', fontWeight: 600, fontSize: 14,
                      cursor: oauthLoading ? 'not-allowed' : 'pointer',
                      opacity: oauthLoading ? 0.7 : 1, transition: 'all 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    {oauthLoading ? 'Connecting to Google...' : 'Continue with Google'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>or continue with email</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="auth-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@company.com"
                      style={{
                        width: '100%', padding: '12px 14px 12px 42px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, color: '#fff', fontSize: 14,
                        boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s',
                      }}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--cyan)'; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label htmlFor="auth-password" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                        Password
                      </label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => switchMode('forgot')}
                          style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: 0 }}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                        style={{
                          width: '100%', padding: '12px 42px 12px 42px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10, color: '#fff', fontSize: 14,
                          boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s',
                        }}
                        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--cyan)'; }}
                        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(255,255,255,0.3)', padding: 4,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {mode === 'signup' && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>Use at least 6 characters.</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px 20px', marginTop: 4,
                    background: 'var(--cyan)', border: 'none', borderRadius: 12,
                    color: '#000', fontWeight: 700, fontSize: 14,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(0,212,255,0.25)',
                  }}
                >
                  {loading ? 'Please wait...' : (
                    <>
                      {mode === 'forgot' ? 'Send reset link' : mode === 'login' ? 'Sign in' : 'Create account'}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                {mode === 'login' ? (
                  <>Do not have an account?{' '}
                    <button type="button" onClick={() => switchMode('signup')}
                      style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      Sign up free
                    </button>
                  </>
                ) : mode === 'signup' ? (
                  <>Already have an account?{' '}
                    <button type="button" onClick={() => switchMode('login')}
                      style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      Sign in
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => switchMode('login')}
                    style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    Back to sign in
                  </button>
                )}
              </div>

              {mode === 'signup' && (
                <p style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                  By creating an account, you agree to our Terms and Privacy Policy.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
