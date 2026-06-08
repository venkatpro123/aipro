// AuthPage.tsx — Full-page auth for direct /auth URL access and protected redirects
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'login' | 'signup' | 'forgot';

const FEATURES = [
  'Real-time layoff risk scoring',
  'AI career defense roadmap',
  'Live company intelligence',
  'Personalized action plan',
];

const STATS = [
  { value: '60s', label: 'to your first risk score' },
  { value: '10K+', label: 'professionals protected' },
  { value: 'Free', label: 'forever, no credit card' },
];

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/os';
  const modeParam = searchParams.get('mode') as AuthMode | null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>(modeParam === 'signup' ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect already-authed users
  useEffect(() => {
    if (!authLoading && user) {
      navigate(returnTo, { replace: true });
    }
  }, [authLoading, user, navigate, returnTo]);

  if (authLoading) return null;

  const resetMessages = () => { setErrorMsg(''); setSuccessMsg(''); };
  const switchMode = (next: AuthMode) => { setMode(next); resetMessages(); };

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
        navigate(returnTo, { replace: true });
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
        options: { redirectTo: `${window.location.origin}${returnTo}` },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
      setOauthLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c14',
      display: 'flex',
      alignItems: 'stretch',
    }}>
      {/* Left panel — branding (desktop only) */}
      <div style={{
        flex: '0 0 480px',
        background: 'linear-gradient(160deg, #0a1628 0%, #0c1a2e 50%, #080f1c 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '48px 56px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="auth-page-left"
      >
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: -80, left: -80, width: 360, height: 360, background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 280, height: 280, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--cyan), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>HumanProof</span>
        </div>

        {/* Main copy */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              fontSize: 42, fontWeight: 900, color: '#fff',
              lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 20,
            }}
          >
            Know your<br />
            risk before<br />
            <span style={{ color: 'var(--cyan)' }}>it finds you.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 320 }}
          >
            AI-powered layoff risk scoring for professionals who want to stay ahead of the market.
          </motion.p>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {FEATURES.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <CheckCircle size={13} color="var(--cyan)" />
              </div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{f}</span>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', gap: 32 }}
        >
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        overflowY: 'auto',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--cyan), #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>HumanProof</span>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8 }}>
              {mode === 'forgot' ? 'Reset your password'
                : mode === 'login' ? 'Welcome back'
                : 'Create your free account'}
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              {mode === 'forgot' ? "Enter your email and we'll send you a reset link."
                : mode === 'login' ? 'Sign in to access your career intelligence dashboard.'
                : 'Get your layoff risk score in 60 seconds. No credit card needed.'}
            </p>
          </div>

          {errorMsg && (
            <div style={{
              padding: '14px 16px', borderRadius: 12, marginBottom: 20,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 14, color: '#fca5a5', lineHeight: 1.4,
            }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{
              padding: '14px 16px', borderRadius: 12, marginBottom: 20,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              fontSize: 14, color: '#6ee7b7',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <CheckCircle size={16} color="#6ee7b7" style={{ flexShrink: 0, marginTop: 1 }} />
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
                  width: '100%', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: '#fff', border: 'none', borderRadius: 14,
                  color: '#1a1a1a', fontWeight: 600, fontSize: 15,
                  cursor: oauthLoading ? 'not-allowed' : 'pointer',
                  opacity: oauthLoading ? 0.7 : 1, transition: 'opacity 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {oauthLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 500, whiteSpace: 'nowrap' }}>or sign in with email</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label htmlFor="auth-email-page" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input
                  id="auth-email-page"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  style={{
                    width: '100%', padding: '14px 16px 14px 46px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#fff', fontSize: 15,
                    boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--cyan)'; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label htmlFor="auth-password-page" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>
                    Password
                  </label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')}
                      style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0 }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  <input
                    id="auth-password-page"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={mode === 'signup' ? 'Create a password (6+ characters)' : 'Your password'}
                    style={{
                      width: '100%', padding: '14px 46px 14px 46px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, color: '#fff', fontSize: 15,
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
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.35)', padding: 4,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '15px 20px', marginTop: 4,
                background: 'var(--cyan)', border: 'none', borderRadius: 14,
                color: '#000', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(0,212,255,0.3)',
              }}
            >
              {loading ? 'Please wait...' : (
                <>
                  {mode === 'forgot' ? 'Send reset link' : mode === 'login' ? 'Sign in to dashboard' : 'Create my free account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 28, textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            {mode === 'login' ? (
              <>Do not have an account?{' '}
                <button type="button" onClick={() => switchMode('signup')}
                  style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                  Sign up — it is free
                </button>
              </>
            ) : mode === 'signup' ? (
              <>Already have an account?{' '}
                <button type="button" onClick={() => switchMode('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                  Sign in
                </button>
              </>
            ) : (
              <button type="button" onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Back to sign in
              </button>
            )}
          </div>

          {mode === 'signup' && (
            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
