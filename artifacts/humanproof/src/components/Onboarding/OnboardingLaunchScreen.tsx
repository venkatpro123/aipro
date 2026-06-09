// OnboardingLaunchScreen.tsx — "Building your Career OS" animated screen
// Shown while the background Tier-A audit runs (~8s).
// Reuses the cinematic stage-reveal pattern from AuditTerminalPage.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Brain, Zap, Target, CheckCircle2 } from 'lucide-react';

interface Props {
  isComplete: boolean;
}

const STAGES = [
  { icon: Shield,       text: 'Analyzing company risk signals…',       durationMs: 1400 },
  { icon: Brain,        text: 'Running AI displacement model…',        durationMs: 1600 },
  { icon: Zap,          text: 'Calibrating personalization engine…',   durationMs: 1500 },
  { icon: Target,       text: 'Building your action plan…',            durationMs: 1200 },
  { icon: CheckCircle2, text: 'Career OS ready.',                       durationMs: 500  },
];

export function OnboardingLaunchScreen({ isComplete }: Props) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (stageIndex >= STAGES.length - 1) return;
    const ms = STAGES[stageIndex]?.durationMs ?? 1000;
    const t = setTimeout(() => setStageIndex(i => Math.min(i + 1, STAGES.length - 1)), ms);
    return () => clearTimeout(t);
  }, [stageIndex]);

  const currentStage = STAGES[Math.min(stageIndex, STAGES.length - 1)];
  const Icon = currentStage.icon;
  const progress = isComplete ? 100 : Math.round(((stageIndex + 1) / STAGES.length) * 92);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
    }}>
      {/* Pulsing ring */}
      <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 36 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(0,212,255,0.15)',
          animation: 'spin 3s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          background: 'rgba(0,212,255,0.06)', border: '1.5px solid rgba(0,212,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={stageIndex}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.3 }}
            >
              <Icon size={28} color="var(--cyan)" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        <span style={{ width: 8, height: 8, background: 'var(--cyan)', borderRadius: '50%', boxShadow: '0 0 10px var(--cyan)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.04em', color: 'var(--text)' }}>
          HumanShield
        </span>
      </div>

      <h2 style={{
        fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 800,
        color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.02em', textAlign: 'center',
      }}>
        Building your Career OS
      </h2>

      {/* Stage label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={stageIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', minHeight: 22 }}
        >
          {currentStage.text}
        </motion.p>
      </AnimatePresence>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{
          height: 4, borderRadius: 10, background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden', marginBottom: 10,
        }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, var(--cyan), #38bdf8)', borderRadius: 10 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Initializing…</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{progress}%</span>
        </div>
      </div>

      {/* Completed stages */}
      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 340 }}>
        {STAGES.slice(0, stageIndex).map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <CheckCircle2 size={13} color="#10b981" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{s.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
