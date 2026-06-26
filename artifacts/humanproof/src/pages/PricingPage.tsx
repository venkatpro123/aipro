import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Shield, Zap, Building2, ChevronDown, Star } from 'lucide-react';
import { KEY_REGISTRY } from '../data/riskData';

const plans = [
  {
    name: 'Defender',
    price: '$0',
    period: 'free forever',
    badge: null,
    featured: false,
    icon: Shield,
    iconColor: 'var(--text-2)',
    cta: 'Start Free →',
    action: 'free',
    highlight: 'var(--alpha-bg-04)',
    border: 'var(--alpha-bg-08)',
    features: [
      'Full AI Displacement Audit',
      '6-dimension risk calibration',
      'Thousands of job types',
      'At-risk task decomposition',
      '3 audit runs / month',
    ],
  },
  {
    name: 'Thriver',
    price: '$19',
    period: 'per month',
    badge: 'Most Popular',
    featured: true,
    icon: Zap,
    iconColor: 'var(--cyan)',
    cta: 'Start Pro Trial →',
    action: 'waitlist',
    highlight: 'rgba(0,213,224,0.05)',
    border: 'rgba(0,213,224,0.25)',
    features: [
      'Unlimited calculator audits',
      'High-fidelity PDF reports',
      'All 12+ resilience blueprints',
      'Quarterly risk drift alerts',
      'Priority AI analysis queue',
      'Career Twin Network access',
    ],
  },
  {
    name: 'Enterprise',
    price: '$79',
    period: 'per seat / month',
    badge: null,
    featured: false,
    icon: Building2,
    iconColor: 'var(--violet, #7c3aed)',
    cta: 'Contact Sales →',
    action: 'sales',
    highlight: 'rgba(124,58,237,0.04)',
    border: 'rgba(124,58,237,0.15)',
    features: [
      'Everything in Thriver',
      'Fleet-wide HR risk dashboard',
      'Custom sector intelligence',
      'White-label audit reports',
      'Dedicated account manager',
      'SLA + compliance packages',
    ],
  },
];

const faqs = [
  {
    q: 'How accurate is the risk assessment?',
    a: 'Audit nodes are calibrated against 8 global datasets (McKinsey, Goldman Sachs, WEF). Confidence margin: ±3.4% at the 95th percentile.',
  },
  {
    q: 'What is the D6 Social Capital dimension?',
    a: 'Dimension 6 quantifies network irreplaceability. Relationship-heavy roles show 2.3× higher resilience scores against automation pressure.',
  },
  {
    q: 'How often is data updated?',
    a: "All data is synchronized quarterly. Pro subscribers receive real-time drift alerts whenever their sector's risk profile shifts significantly.",
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes — no contracts, no lock-in. Cancel from your settings page with a single click and keep access until the end of your billing period.',
  },
];

const TRUST_SIGNALS = [
  { label: '50,000+', desc: 'Roles analyzed' },
  { label: '9', desc: 'Tier-1 datasets' },
  { label: '±3.4%', desc: 'Accuracy margin' },
  { label: '140+', desc: 'Countries' },
];

function WaitlistModal({ onClose, tier = 'pro' }: { onClose: () => void; tier?: string }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tier }),
      });
      localStorage.setItem(KEY_REGISTRY.WAITLIST_EMAIL, email);
    } catch {}
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="overlay-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="card"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25 }}
        style={{ padding: '48px', maxWidth: 460, width: '100%', position: 'relative' }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}
        >×</button>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div className="badge badge-cyan" style={{ marginBottom: '16px' }}>Join Waitlist</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '10px' }}>
                  Get Early Access
                </h2>
                <p style={{ color: 'var(--text-2)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                  Be first in line for the Pro experience. No spam, ever.
                </p>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label-xs" style={{ display: 'block', marginBottom: '8px' }}>Email Address</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@company.com"
                    required
                    className="input"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
                  {loading ? (
                    <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Registering...</>
                  ) : 'Reserve My Spot'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check size={28} color="var(--emerald)" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--emerald)', letterSpacing: '-0.03em', marginBottom: '10px' }}>
                You're on the list!
              </h2>
              <p style={{ color: 'var(--text-2)', marginBottom: '28px', fontSize: '0.875rem' }}>
                We'll notify you when Pro access opens.
              </p>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="page-wrap" style={{ background: 'var(--bg)' }}>
      <AnimatePresence>{showWaitlist && <WaitlistModal onClose={() => setShowWaitlist(false)} />}</AnimatePresence>

      <div className="container">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <motion.div
          className="section-hero reveal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '72px' }}
        >
          <div className="badge badge-ghost" style={{ marginBottom: '20px' }}>Simple Pricing</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            lineHeight: 0.95,
            marginBottom: '20px',
          }}>
            One standard.<br />
            <span style={{ background: 'linear-gradient(135deg, var(--cyan) 0%, rgba(0,213,224,0.4) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Your terms.
            </span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '1.1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Career protection intelligence with no lock-in and no hidden fees. Start free, scale when ready.
          </p>
        </motion.div>

        {/* ── Trust Signals Bar ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0',
            marginBottom: '64px',
            background: 'var(--alpha-bg-02)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}
        >
          {TRUST_SIGNALS.map((s, i) => (
            <div key={i} style={{
              flex: 1,
              padding: '20px 16px',
              textAlign: 'center',
              borderRight: i < TRUST_SIGNALS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: '4px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.desc}
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Plan Cards ───────────────────────────────────────────────── */}
        <div className="pricing-grid" style={{ marginBottom: '100px' }}>
          {plans.map((plan, idx) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                className="reveal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + idx * 0.08 }}
              >
                <div
                  style={{
                    padding: '36px',
                    borderRadius: 'var(--radius-xl)',
                    background: plan.highlight,
                    border: `1px solid ${plan.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    position: 'relative',
                    transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
                    boxShadow: plan.featured ? `0 0 60px ${plan.highlight.replace('0.05', '0.15')}` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = plan.featured
                      ? `0 0 80px ${plan.highlight.replace('0.05', '0.2')}, var(--shadow-xl)`
                      : 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                    (e.currentTarget as HTMLElement).style.boxShadow = plan.featured
                      ? `0 0 60px ${plan.highlight.replace('0.05', '0.15')}`
                      : 'none';
                  }}
                >
                  {plan.badge && (
                    <div style={{
                      position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--cyan)', color: '#000',
                      fontSize: '0.6875rem', fontWeight: 900, letterSpacing: '0.08em',
                      padding: '4px 14px', borderRadius: 'var(--radius-full)',
                      whiteSpace: 'nowrap', textTransform: 'uppercase',
                    }}>
                      <Star size={8} style={{ display: 'inline', marginRight: 4 }} />
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '28px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '12px',
                      background: `${plan.border.replace('0.15', '0.1').replace('0.25', '0.1')}`,
                      border: `1px solid ${plan.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={20} color={plan.iconColor} />
                    </div>
                    <div>
                      <div className="label-xs" style={{ color: plan.featured ? 'var(--cyan)' : 'var(--text-3)', marginBottom: '6px' }}>
                        {plan.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
                          {plan.price}
                        </span>
                        <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{plan.period}</span>
                      </div>
                    </div>
                  </div>

                  {/* Feature list */}
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px', flex: 1 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-2)' }}>
                        <Check size={14} style={{ color: plan.featured ? 'var(--cyan)' : 'var(--emerald)', flexShrink: 0, marginTop: '3px' }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      if (plan.action === 'free') navigate('/calculator');
                      else setShowWaitlist(true);
                    }}
                    className={`btn btn-full btn-lg ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ marginTop: 'auto' }}
                  >
                    {plan.cta}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: '60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em' }}>
              Common Questions
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className="card reveal"
                style={{ cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '20px 24px' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, flex: 1 }}>{faq.q}</h4>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ flexShrink: 0, color: 'var(--text-3)' }}
                  >
                    <ChevronDown size={18} />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <p style={{
                        color: 'var(--text-2)', fontSize: '0.875rem', lineHeight: 1.75,
                        margin: 0, padding: '0 24px 20px',
                        borderTop: '1px solid var(--border)', paddingTop: '16px',
                      }}>
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Final CTA */}
          <div style={{ textAlign: 'center', marginTop: '56px', padding: '48px', background: 'rgba(0,213,224,0.03)', border: '1px solid rgba(0,213,224,0.12)', borderRadius: 'var(--radius-xl)' }}>
            <p className="label-xs" style={{ color: 'var(--cyan)', marginBottom: '12px' }}>START TODAY</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '8px' }}>
              No risk. Literally.
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Run your first audit for free — no credit card required.
            </p>
            <button onClick={() => navigate('/calculator')} className="btn btn-primary btn-lg">
              Run Free Audit →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
