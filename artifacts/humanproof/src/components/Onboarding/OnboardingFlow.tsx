// OnboardingFlow.tsx — 4-step onboarding: Welcome → Company → Profile → Goals → Launch
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Sparkles, Loader2 } from 'lucide-react';
import { upsertUserProfile } from '../../services/userProfileService';
import { OnboardingStep1Company } from './OnboardingStep1Company';
import { OnboardingStep2Profile } from './OnboardingStep2Profile';
import { OnboardingStep3Goals } from './OnboardingStep3Goals';
import type { Step1Data } from './OnboardingStep1Company';
import type { Step2Data } from './OnboardingStep2Profile';
import type { Step3Data } from './OnboardingStep3Goals';

const ONBOARDING_DONE_KEY = 'hp_onboarding_done';
const PREFILL_KEY = 'hp_onboarding_prefill';

export function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(ONBOARDING_DONE_KEY) === '1'; } catch { return false; }
}

const STEPS = ['Welcome', 'Your Job', 'About You', 'Your Goals'];

const STEP_DOTS = [0, 1, 2, 3];

function StepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '0 0 32px' }}>
      {STEP_DOTS.map(i => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 7, height: 7, borderRadius: 10,
            background: i <= current ? 'var(--cyan)' : 'rgba(255,255,255,0.12)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  onComplete?: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1);

  const [step1, setStep1] = useState<Step1Data>({ companyName: '', roleTitle: '' });
  const [step2, setStep2] = useState<Step2Data>({ yearsExperience: null, salaryBand: null, visaStatus: null });
  const [step3, setStep3] = useState<Step3Data>({ primaryGoal: '', urgency: 'this_year', concerns: [] });

  const canAdvance = () => {
    if (step === 1) return step1.companyName.trim().length > 0 && step1.roleTitle.trim().length > 0;
    if (step === 2) return step2.yearsExperience !== null;
    return true;
  };

  const goNext = async () => {
    if (step < 3) {
      setDirection(1);
      setStep(s => s + 1);
      return;
    }
    // Final step — save profile and launch audit
    setSaving(true);
    try {
      // Save profile fields from step 2
      await upsertUserProfile({
        yearsExperience: step2.yearsExperience ?? undefined,
        salaryBand: step2.salaryBand ?? undefined,
        visaStatus: step2.visaStatus ?? undefined,
        primaryGoal: step3.primaryGoal || undefined,
      });
    } catch {
      // Non-fatal — proceed anyway
    }

    // Store prefill for the audit terminal
    try {
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify({
        companyName: step1.companyName.trim(),
        roleTitle: step1.roleTitle.trim(),
      }));
    } catch { /* storage full */ }

    // Mark onboarding complete
    try { localStorage.setItem(ONBOARDING_DONE_KEY, '1'); } catch { /* */ }

    setSaving(false);
    onComplete?.();
    navigate('/terminal', { state: { fromOnboarding: true } });
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep(s => s - 1);
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit:  (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 40 }}>
          <span style={{ width: 8, height: 8, background: 'var(--cyan)', borderRadius: '50%', boxShadow: '0 0 10px var(--cyan)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.04em', color: 'var(--text)' }}>
            HumanShield
          </span>
        </div>

        <StepDots current={step} />

        {/* Step label */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </span>
        </div>

        {/* Step content */}
        <div className="card-premium" style={{ padding: '32px 32px 28px', position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
            >
              {step === 0 && <WelcomeStep />}
              {step === 1 && <OnboardingStep1Company data={step1} onChange={setStep1} />}
              {step === 2 && <OnboardingStep2Profile data={step2} onChange={setStep2} />}
              {step === 3 && <OnboardingStep3Goals data={step3} onChange={setStep3} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          {step > 0 ? (
            <button onClick={goBack} style={backBtnStyle}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={goNext}
            disabled={!canAdvance() || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: 10, border: 'none',
              cursor: canAdvance() && !saving ? 'pointer' : 'default',
              background: canAdvance() && !saving
                ? 'linear-gradient(135deg, var(--cyan) 0%, #38bdf8 100%)'
                : 'rgba(255,255,255,0.1)',
              color: canAdvance() && !saving ? '#000' : 'rgba(255,255,255,0.25)',
              fontWeight: 800, fontSize: 14, transition: 'all 0.2s',
              boxShadow: canAdvance() && !saving ? '0 4px 20px rgba(0,212,255,0.3)' : 'none',
            }}
          >
            {saving ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Launching…</>
            ) : step === 3 ? (
              <><Sparkles size={16} /> Launch My Audit</>
            ) : (
              <>Continue <ChevronRight size={16} /></>
            )}
          </button>
        </div>

        {/* Skip link */}
        {step === 0 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => navigate('/terminal')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Skip setup — go straight to audit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🛡️</div>
      <h1 style={{
        fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800,
        color: 'var(--text)', margin: '0 0 12px', letterSpacing: '-0.02em',
      }}>
        Your Career Operating System
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px' }}>
        In 3 quick steps we'll build your personalized career risk profile and run your first audit.
        Takes 2 minutes.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 340, margin: '0 auto' }}>
        {[
          { emoji: '📊', text: 'Risk score for your company & role' },
          { emoji: '🤖', text: 'AI displacement exposure analysis' },
          { emoji: '🎯', text: 'Personalized action plan to protect your career' },
        ].map(item => (
          <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 20 }}>{item.emoji}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '10px 16px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
  background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13,
};
