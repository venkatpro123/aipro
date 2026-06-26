import { useState } from 'react';
import { useHumanProof } from '../context/HumanProofContext';

const STORAGE_KEY = 'hp_digest_subscribed';

interface DigestSignupProps {
  onClose?: () => void;
  embedded?: boolean;
}

export default function DigestSignup({ onClose, embedded = false }: DigestSignupProps) {
  const { state } = useHumanProof();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const alreadySubscribed = localStorage.getItem(STORAGE_KEY) === 'true';

  if (alreadySubscribed && !embedded) return null;

  const handleSubscribe = () => {
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMsg('Please enter a valid email address.');
      return;
    }
    localStorage.setItem(STORAGE_KEY, 'true');
    setStatus('success');
    setMsg(`You're in! Your first AI threat brief arrives next Monday.`);
    setTimeout(() => {
      if (onClose) onClose();
    }, 3000);
  };

  const jobTitle = state.jobTitle || 'your role';

  if (embedded) {
    return (
      <div style={{ padding: '40px 0', maxWidth: 600, margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 4, height: 32, background: 'var(--cyan)', borderRadius: 2 }} />
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: '1.5rem', color: 'var(--cyan)' }}>Weekly AI Threat Brief</h2>
          </div>
        </div>
        <SignupCard email={email} setEmail={setEmail} status={status} msg={msg} onSubscribe={handleSubscribe} jobTitle={jobTitle} alreadySubscribed={alreadySubscribed} />
      </div>
    );
  }

  return (
    <div
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 150, maxWidth: 360, width: 'calc(100vw - 48px)' }}
    >
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
        )}
        <SignupCard email={email} setEmail={setEmail} status={status} msg={msg} onSubscribe={handleSubscribe} jobTitle={jobTitle} alreadySubscribed={alreadySubscribed} />
      </div>
    </div>
  );
}

function SignupCard({
  email, setEmail, status, msg, onSubscribe, jobTitle, alreadySubscribed,
}: {
  email: string;
  setEmail: (v: string) => void;
  status: 'idle' | 'success' | 'error';
  msg: string;
  onSubscribe: () => void;
  jobTitle: string;
  alreadySubscribed: boolean;
}) {
  if (alreadySubscribed) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>✅</div>
        <div style={{ color: 'var(--emerald)', fontFamily: 'var(--mono)', fontSize: '0.9rem', fontWeight: 700 }}>You're subscribed!</div>
        <div style={{ color: 'var(--text2)', fontSize: '0.8rem', marginTop: 6 }}>Your AI threat brief arrives every Monday.</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
        🔔 Get Your Weekly AI Threat Brief
      </div>
      <h3 style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
        Stay ahead of what's changing in {jobTitle}
      </h3>
      <p style={{ color: 'var(--text2)', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 16 }}>
        Every Monday — 5 AI developments that affect {jobTitle} specifically. No fluff. Unsubscribe any time.
      </p>

      {status !== 'success' ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSubscribe()}
              placeholder="your@email.com"
              style={{ flex: 1, background: 'var(--alpha-bg-06)', border: `1px solid ${status === 'error' ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--body)', fontSize: '0.85rem', outline: 'none' }}
            />
            <button
              onClick={onSubscribe}
              style={{ background: 'var(--cyan)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '9px 16px', fontFamily: 'var(--mono)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
            >
              Subscribe
            </button>
          </div>
          {status === 'error' && msg && (
            <div style={{ color: 'var(--red)', fontSize: '0.75rem' }}>{msg}</div>
          )}
          <div style={{ color: 'var(--text2)', fontSize: '0.7rem' }}>Free forever. No spam. Unsubscribe any time.</div>
        </>
      ) : (
        <div style={{ background: 'rgba(0,255,159,0.1)', border: '1px solid rgba(0,255,159,0.3)', borderRadius: 8, padding: '12px 14px', color: 'var(--emerald)', fontSize: '0.85rem', textAlign: 'center' }}>
          ✓ {msg}
        </div>
      )}
    </>
  );
}
