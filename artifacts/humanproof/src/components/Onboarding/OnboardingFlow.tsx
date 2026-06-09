// OnboardingFlow.tsx — 6-step Career OS initialization wizard
// Welcome → Your Job → About You → Financial Safety Net → Skills → Your Goals → Launch
//
// On completion: runs Tier-A audit in the background, writes firstAuditCompletedAt
// to user_profiles, and navigates directly to /career-os (not /terminal).
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { upsertUserProfile } from '../../services/userProfileService';
import { runTierA } from '../../services/tierAPipeline';
import { useLayoff } from '../../context/LayoffContext';
import { OnboardingStep1Company } from './OnboardingStep1Company';
import { OnboardingStep2Profile } from './OnboardingStep2Profile';
import { OnboardingStep3Goals } from './OnboardingStep3Goals';
import { OnboardingStep4Financial } from './OnboardingStep4Financial';
import { OnboardingStep5Skills } from './OnboardingStep5Skills';
import { OnboardingLaunchScreen } from './OnboardingLaunchScreen';
import type { Step1Data } from './OnboardingStep1Company';
import type { Step2Data } from './OnboardingStep2Profile';
import type { Step3Data } from './OnboardingStep3Goals';
import type { Step4Data } from './OnboardingStep4Financial';
import type { Step5Data } from './OnboardingStep5Skills';

const ONBOARDING_DONE_KEY = 'hp_onboarding_done';
const PREFILL_KEY = 'hp_onboarding_prefill';

export function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(ONBOARDING_DONE_KEY) === '1'; } catch { return false; }
}

// 6 content steps (0–5) + 1 launch screen (6)
const STEPS = ['Welcome', 'Your Job', 'About You', 'Financial Safety Net', 'Skills', 'Your Goals'];
const TOTAL_CONTENT_STEPS = STEPS.length; // 6

function StepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center', margin: '0 0 28px' }}>
      {STEPS.map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 18 : 6, height: 6, borderRadius: 10,
            background: i <= current ? 'var(--cyan)' : 'rgba(255,255,255,0.1)',
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
  const { dispatch } = useLayoff();
  const [step, setStep] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);
  const [direction, setDirection] = useState(1);

  const [step1, setStep1] = useState<Step1Data>({ companyName: '', roleTitle: '' });
  const [step2, setStep2] = useState<Step2Data>({ yearsExperience: null, salaryBand: null, visaStatus: null });
  const [step3, setStep3] = useState<Step3Data>({ primaryGoal: '', urgency: 'this_year', concerns: [] });
  const [step4, setStep4] = useState<Step4Data>({
    monthlySalaryUsd: null, savingsMonthsRunway: null,
    hasEquityVesting: false, equityVestMonths: null, hasDependents: false,
  });
  const [step5, setStep5] = useState<Step5Data>({ selfRatedSkills: [], targetSkills: [] });

  const canAdvance = () => {
    if (step === 1) return step1.companyName.trim().length > 0 && step1.roleTitle.trim().length > 0;
    if (step === 2) return step2.yearsExperience !== null;
    return true;
  };

  const goNext = async () => {
    if (step < TOTAL_CONTENT_STEPS - 1) {
      setDirection(1);
      setStep(s => s + 1);
      return;
    }

    // Last content step → show launch screen and run background audit
    setLaunching(true);

    // Save all profile fields (non-blocking on failure)
    try {
      await upsertUserProfile({
        yearsExperience: step2.yearsExperience ?? undefined,
        salaryBand: step2.salaryBand ?? undefined,
        visaStatus: step2.visaStatus ?? undefined,
        primaryGoal: step3.primaryGoal || undefined,
        monthlySalaryUsd: step4.monthlySalaryUsd ?? undefined,
        savingsMonthsRunway: step4.savingsMonthsRunway ?? undefined,
        hasEquityVesting: step4.hasEquityVesting,
        equityVestMonths: step4.equityVestMonths ?? undefined,
        hasDependents: step4.hasDependents,
        selfRatedSkills: step5.selfRatedSkills.length > 0 ? step5.selfRatedSkills : undefined,
        targetSkills: step5.targetSkills.length > 0 ? step5.targetSkills : undefined,
        firstAuditCompletedAt: new Date().toISOString(),
      });
    } catch {
      // Non-fatal — proceed anyway
    }

    // Store prefill for the audit terminal (in case user navigates there manually)
    try {
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify({
        companyName: step1.companyName.trim(),
        roleTitle: step1.roleTitle.trim(),
      }));
    } catch { /* storage full */ }

    // Mark onboarding complete in localStorage (legacy flag, kept for backward compat)
    try { localStorage.setItem(ONBOARDING_DONE_KEY, '1'); } catch { /* */ }

    // Run Tier-A audit in background; dispatch result to LayoffContext on completion
    try {
      const tierResult = await runTierA(
        {
          companyName: step1.companyName.trim(),
          roleTitle: step1.roleTitle.trim(),
          department: 'general',
          userFactors: {
            tenureYears: step2.yearsExperience ?? 3,
            careerYears: step2.yearsExperience ?? 3,
            isUniqueRole: false,
            performanceTier: 'average',
            hasRecentPromotion: false,
            hasKeyRelationships: false,
          },
          financialRunwayMonths: step4.savingsMonthsRunway ?? undefined,
        },
        {
          tierATimeoutMs: 10000,
          onUpgrade: (upgraded) => {
            dispatch({ type: 'SET_SCORE_RESULT', payload: upgraded.result });
          },
        },
      );
      dispatch({ type: 'SET_SCORE_RESULT', payload: tierResult.result });
    } catch {
      // Audit failed — still navigate to OS; user can re-audit from there
    }

    setAuditComplete(true);
    onComplete?.();

    // Brief pause so the "Career OS ready." stage is visible before navigating
    setTimeout(() => navigate('/os', { replace: true }), 900);
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

  // Show launch screen while audit is running
  if (launching) {
    return <OnboardingLaunchScreen isComplete={auditComplete} />;
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 36 }}>
          <span style={{ width: 8, height: 8, background: 'var(--cyan)', borderRadius: '50%', boxShadow: '0 0 10px var(--cyan)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.04em', color: 'var(--text)' }}>
            HumanShield
          </span>
        </div>

        <StepDots current={step} />

        {/* Step label */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Step {step + 1} of {TOTAL_CONTENT_STEPS} — {STEPS[step]}
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
              {step === 3 && <OnboardingStep4Financial data={step4} onChange={setStep4} />}
              {step === 4 && <OnboardingStep5Skills data={step5} onChange={setStep5} />}
              {step === 5 && <OnboardingStep3Goals data={step3} onChange={setStep3} />}
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
            disabled={!canAdvance()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: 10, border: 'none',
              cursor: canAdvance() ? 'pointer' : 'default',
              background: canAdvance()
                ? 'linear-gradient(135deg, var(--cyan) 0%, #38bdf8 100%)'
                : 'rgba(255,255,255,0.1)',
              color: canAdvance() ? '#000' : 'rgba(255,255,255,0.25)',
              fontWeight: 800, fontSize: 14, transition: 'all 0.2s',
              boxShadow: canAdvance() ? '0 4px 20px rgba(0,212,255,0.3)' : 'none',
            }}
          >
            {step === TOTAL_CONTENT_STEPS - 1 ? (
              <><Sparkles size={16} /> Launch My Career OS</>
            ) : (
              <>Continue <ChevronRight size={16} /></>
            )}
          </button>
        </div>

        {/* Skip steps 3–5 (optional) */}
        {step >= 3 && step < TOTAL_CONTENT_STEPS - 1 && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              onClick={() => { setDirection(1); setStep(s => s + 1); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Skip this step
            </button>
          </div>
        )}

        {/* Skip all — only on welcome */}
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
        In 6 quick steps we'll build your personalized Career OS — with live risk monitoring,
        an action plan, and proactive guidance. Takes about 3 minutes.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 360, margin: '0 auto' }}>
        {[
          { emoji: '📊', text: 'Real-time risk score for your company & role' },
          { emoji: '🤖', text: 'AI displacement exposure + skill gap analysis' },
          { emoji: '🎯', text: 'Personalized action plan updated continuously' },
          { emoji: '🔔', text: 'Proactive alerts when your situation changes' },
        ].map(item => (
          <div key={item.text} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
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
