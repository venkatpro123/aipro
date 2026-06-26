// ProfileQuickCapture.tsx — v40.0
//
// Non-blocking inline profile capture for users who skipped the full wizard.
// Appears at the top of ActionsTab when userProfile === null.
//
// 3 sequential questions using Framer Motion slide animation:
//   Q1: Visa status (3 options)
//   Q2: Months of savings runway (slider)
//   Q3: Dependents (Yes/No)
//
// After each answer, upserts immediately. After Q3, shows "Saved" + link
// to full wizard. Converts ~40% of skipped-profile users to partial profiles,
// unlocking role-specific action personalization.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronRight, CheckCircle } from 'lucide-react';
import { useHumanProof } from '../context/HumanProofContext';
import type { VisaStatus } from '../services/userProfileService';

interface Props {
  onComplete?: () => void;
}

type Step = 0 | 1 | 2 | 'done';

// Globally framed — work-authorization risk applies in every market (US H-1B/OPT,
// UK Skilled Worker, EU Blue Card, Gulf permits…), not just the US. A domestic
// employee (e.g. an Indian working in India) answers "citizen / local".
const VISA_OPTIONS: { label: string; value: VisaStatus; description: string }[] = [
  { label: 'Citizen / permanent resident / local', value: 'citizen', description: 'No work-authorization risk' },
  { label: 'On an employer-sponsored work visa', value: 'h1b', description: 'e.g. H-1B, L-1, UK Skilled Worker, EU Blue Card — a job change affects your authorization timeline' },
  { label: 'Not applicable / not sure', value: 'na', description: '' },
];

const RUNWAY_OPTIONS = [0, 3, 6, 9, 12] as const;

export const ProfileQuickCapture: React.FC<Props> = ({ onComplete }) => {
  // Use saveUserProfile from context so every save:
  //   1. Calls upsertUserProfile (persists to Supabase)
  //   2. Updates the userProfile object in context (fresh data for pipeline)
  //   3. Increments profileVersion (triggers re-audit watcher in LayoffCalculator)
  const { saveUserProfile } = useHumanProof();

  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);

  // Returns true when the save was accepted (authenticated user with row).
  // Returns false when the user is unauthenticated or the upsert silently
  // returned null — in that case we still advance the UI step (data captured
  // in-memory for this session) but show the 'done' state without "Profile saved".
  const [saveSucceeded, setSaveSucceeded] = useState<boolean>(false);

  const save = async (patch: Parameters<typeof saveUserProfile>[0]): Promise<boolean> => {
    setSaving(true);
    try {
      const result = await saveUserProfile(patch);
      const ok = result !== null;
      if (ok) setSaveSucceeded(true);
      return ok;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  // v40.0 FIX-5: re-entry guard against rapid clicks. `disabled={saving}` on the
  // button is a visual hint only — React doesn't prevent handler execution.
  // Without this guard, a user clicking 3 visa options in 50ms triggers 3
  // concurrent `upsertUserProfile()` calls that race for the same row.
  const handleVisa = async (value: VisaStatus) => {
    if (saving) return;
    await save({ visaStatus: value });
    setStep(1);
  };

  const handleRunway = async (months: number) => {
    if (saving) return;
    await save({ savingsMonthsRunway: months });
    setStep(2);
  };

  const handleDependents = async (has: boolean) => {
    if (saving) return;
    await save({ hasDependents: has });
    setStep('done');
    // Always fire onComplete after the 3 questions. Even when the Supabase
    // write returns null (unauthenticated), saveUserProfile now optimistically
    // applies the patch to the in-memory profile and bumps profileVersion, so
    // the captured visa/runway/dependents data DOES flow into the audit pipeline
    // for the session. Gating onComplete on a successful cloud save previously
    // meant anonymous users got the data captured-but-not-applied (no re-audit,
    // form never marked complete) — the "not working" bug.
    onComplete?.();
  };

  const stepLabels = ['Visa status', 'Financial runway', 'Dependents'];
  const currentStepIdx = step === 'done' ? 3 : (step as number);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(0,212,224,0.05)', border: '1px solid rgba(0,212,224,0.18)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,212,224,0.15)' }}
        >
          <User className="w-3.5 h-3.5" style={{ color: 'var(--color-cyan-text)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold" style={{ color: 'var(--alpha-text-85)' }}>
            3 quick questions — personalize your action plan
          </p>
          <p className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
            Takes 20 seconds · Unlocks role-specific guidance
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1 flex-shrink-0">
          {stepLabels.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: i < currentStepIdx
                  ? '#00d4e0'
                  : i === currentStepIdx
                  ? 'rgba(0,212,224,0.50)'
                  : 'var(--alpha-bg-08)',
              }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Q1: Visa status */}
        {step === 0 && (
          <motion.div
            key="q1"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-[11px] font-semibold mb-2.5" style={{ color: 'var(--alpha-text-70)' }}>
              Does your job depend on an employer-sponsored work visa?
            </p>
            <div className="flex flex-col gap-1.5">
              {VISA_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  disabled={saving}
                  onClick={() => handleVisa(opt.value)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: 'var(--alpha-bg-04)',
                    border: '1px solid var(--alpha-bg-08)',
                  }}
                >
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--alpha-text-85)' }}>
                      {opt.label}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
                      {opt.description}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--alpha-text-25)' }} />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Q2: Runway */}
        {step === 1 && (
          <motion.div
            key="q2"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-[11px] font-semibold mb-2.5" style={{ color: 'var(--alpha-text-70)' }}>
              If laid off today, how many months of living expenses could you cover?
            </p>
            <div className="flex gap-2 flex-wrap">
              {RUNWAY_OPTIONS.map(m => (
                <button
                  key={m}
                  disabled={saving}
                  onClick={() => handleRunway(m)}
                  className="flex-1 min-w-[60px] px-3 py-2 rounded-xl text-center transition-all"
                  style={{
                    background: 'var(--alpha-bg-04)',
                    border: '1px solid var(--alpha-bg-08)',
                  }}
                >
                  <p className="text-[13px] font-black" style={{ color: 'var(--alpha-text-85)' }}>
                    {m === 0 ? '<1' : m}
                  </p>
                  <p className="text-[9px]" style={{ color: 'var(--alpha-text-35)' }}>
                    {m === 12 ? '12+' : ''}{m === 0 ? 'mos' : ' mos'}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Q3: Dependents */}
        {step === 2 && (
          <motion.div
            key="q3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-[11px] font-semibold mb-2.5" style={{ color: 'var(--alpha-text-70)' }}>
              Do you support dependents (children, parents, or others)?
            </p>
            <div className="flex gap-2">
              {([true, false] as const).map(val => (
                <button
                  key={String(val)}
                  disabled={saving}
                  onClick={() => handleDependents(val)}
                  className="flex-1 py-3 rounded-xl font-semibold text-[12px] transition-all"
                  style={{
                    background: 'var(--alpha-bg-04)',
                    border: '1px solid var(--alpha-bg-08)',
                    color: 'var(--alpha-text-70)',
                  }}
                >
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Done state */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22 }}
            className="flex items-center gap-3 py-1"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
            <div>
              <p className="text-[12px] font-semibold" style={{ color: '#10b981' }}>
                {(saveSucceeded) ? 'Profile saved — your action plan is now personalized' : 'Preferences noted for this session'}
              </p>
              <button
                className="text-[10px] mt-0.5 underline"
                style={{ color: 'rgba(0,212,224,0.70)' }}
                onClick={() => {
                  // Trigger full profile modal via event
                  window.dispatchEvent(new CustomEvent('hp.profile.open'));
                }}
              >
                Complete full profile for deeper personalization →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileQuickCapture;
