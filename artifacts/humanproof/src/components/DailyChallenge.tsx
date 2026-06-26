import { useState, useEffect } from 'react';
import { useHumanProof } from '../context/HumanProofContext';
import type { Dimension } from '../data/quizQuestions';

// NEW-10: Daily Micro-Challenges
// One challenge per day, tied to user's lowest HII dimension
// Streak tracking, one-tap journal link

const CHALLENGES: Record<Dimension, string[]> = {
  empathic: [
    'In your next meeting, paraphrase what someone else said before responding. Log how it felt.',
    'Notice three emotional states in people around you today without telling them — just observe and reflect.',
    'Ask a colleague how they\'re really doing — and listen for at least 2 minutes without offering solutions.',
    'Write down the last time you truly felt heard. What made it different? Use that today with someone else.',
    'Send a thoughtful message to someone who helped you recently. Be specific about what they did.',
    'During a disagreement today, try to articulate the other person\'s position before stating yours.',
    'At the end of today, identify one emotion you avoided acknowledging. Journal about why.',
  ],
  moral: [
    'Identify one decision you made this week that had an ethical dimension. What values guided it?',
    'Find a grey-area situation in your work. Write down what two different ethical frameworks would say.',
    'Notice one moment where you compromised your values, even slightly. What would you do differently?',
    'Speak up about something you disagree with today — professionally, specifically, constructively.',
    'Journal: What do you stand for at work? List three non-negotiables and test if you lived them today.',
    'Before a decision today, explicitly consider who else is affected. Document your reasoning.',
    'Reflect on accountability: own one mistake from the last week — to yourself in writing.',
  ],
  creative: [
    'Solve a routine problem today using a method you\'ve never tried. Document what happened.',
    'Find one thing in your work that everyone assumes is "just how it\'s done" — question it.',
    'Make an unexpected connection between two unrelated ideas in your field. Write it down.',
    'Spend 10 minutes sketching or freewriting without editing — let ideas surface without judgment.',
    'Identify a problem you\'ve given up on. Approach it from a completely different angle today.',
    'Combine ideas from two different industries to solve a challenge you\'re facing. Share the concept.',
    'Write a "what if" scenario about your role: what if everything you assumed was reversed?',
  ],
  physical: [
    'Notice how your physical presence in a meeting affects the energy in the room. Adjust intentionally.',
    'Practice deliberate body language: shoulders back, eye contact, grounded stance. Observe the response.',
    'Use your hands to explain something complex today. Notice if it aids communication.',
    'Find a task that requires physical precision or spatial judgment. Document what makes you good at it.',
    'Use your physical presence to de-escalate a tense situation. Make eye contact, speak slowly.',
    'Practise being fully present — no multitasking for a 30-minute block. Note what you notice.',
    'Identify one embodied skill (a physical intuition or craft) you\'ve built over years. Articulate its value.',
  ],
  social: [
    'Map your professional network: identify one person you haven\'t connected with in 3+ months. Reach out.',
    'In your next group setting, actively include someone who hasn\'t spoken. Create space for them.',
    'Broker an introduction between two people who should know each other but don\'t.',
    'Identify someone in your organisation who is underestimated. Publicly acknowledge their contribution.',
    'Build trust today: follow through on something small you promised, and note the impact.',
    'Notice the informal influence dynamics in a meeting. Who isn\'t speaking? Who holds the real power?',
    'Practise the art of disagreeing without damaging the relationship — pick one real issue to test this.',
  ],
  contextual: [
    'Before a meeting, spend 5 minutes reading the room: who\'s there, what context are they bringing?',
    'Notice when a rule or process doesn\'t fit the situation today. What would you do differently?',
    'Identify an unspoken norm in your workplace. When did it form? Is it still serving its purpose?',
    'Pay attention to what\'s NOT being said in a conversation today. What does the silence mean?',
    'Adapt your communication style explicitly: use one register with a senior, another with a peer.',
    'Find a decision being made without the full context. Supply the missing information respectfully.',
    'Reflect: what institutional knowledge do you hold that would be lost if you left? Document one piece.',
  ],
};

const DIM_LABELS: Record<Dimension, string> = {
  empathic: 'Empathic Reasoning',
  moral: 'Moral Judgment',
  creative: 'Creative Synthesis',
  physical: 'Physical Presence',
  social: 'Social Navigation',
  contextual: 'Contextual Adaptation',
};

const DIM_COLORS: Record<Dimension, string> = {
  empathic: 'var(--cyan)',
  moral: 'var(--violet-light)',
  creative: 'var(--emerald)',
  physical: 'var(--orange)',
  social: 'var(--yellow)',
  contextual: 'var(--red)',
};

const STREAK_KEY = 'hp_challenge_streak';
const LAST_DATE_KEY = 'hp_challenge_last_date';
const COMPLETED_TODAY_KEY = 'hp_challenge_completed_today';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getStreak(): number {
  return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
}

function getLastDate(): string {
  return localStorage.getItem(LAST_DATE_KEY) || '';
}

function markCompleted(): void {
  const today = getTodayStr();
  const lastDate = getLastDate();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let streak = getStreak();
  if (lastDate === yesterday) {
    streak += 1;
  } else if (lastDate !== today) {
    streak = 1;
  }
  localStorage.setItem(STREAK_KEY, String(streak));
  localStorage.setItem(LAST_DATE_KEY, today);
  localStorage.setItem(COMPLETED_TODAY_KEY, today);
}

function isCompletedToday(): boolean {
  return localStorage.getItem(COMPLETED_TODAY_KEY) === getTodayStr();
}

function getDailyChallenge(dim: Dimension): string {
  const challenges = CHALLENGES[dim];
  // Deterministically pick challenge based on date (same challenge all day)
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return challenges[dayOfYear % challenges.length];
}

function getLowestDim(dimensions: Record<string, number>): Dimension {
  const dims = Object.entries(dimensions) as [Dimension, number][];
  if (dims.length === 0) return 'empathic';
  return dims.sort(([, a], [, b]) => a - b)[0][0];
}

interface DailyChallengeProps {
  onNavigateJournal?: () => void;
}

export default function DailyChallenge({ onNavigateJournal }: DailyChallengeProps) {
  const { state } = useHumanProof();
  const [completed, setCompleted] = useState(isCompletedToday());
  const [streak, setStreak] = useState(getStreak());
  const [dismissed, setDismissed] = useState(false);

  // Check for missed day and reset streak if needed
  useEffect(() => {
    const lastDate = getLastDate();
    const today = getTodayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastDate && lastDate !== today && lastDate !== yesterday) {
      // Missed a day — streak reset happens naturally on next markCompleted call
    }
  }, []);

  if (dismissed) return null;

  // Determine which dimension to target
  const dims = state.humanDimensions || {};
  const hasDimensions = Object.keys(dims).length > 0;
  const targetDim: Dimension = hasDimensions ? getLowestDim(dims) : 'empathic';
  const challenge = getDailyChallenge(targetDim);
  const dimColor = DIM_COLORS[targetDim];

  const handleComplete = () => {
    markCompleted();
    setCompleted(true);
    setStreak(getStreak());
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      left: 24,
      zIndex: 998,
      background: 'var(--bg2, #111827)',
      border: `1px solid ${dimColor}40`,
      borderRadius: 14,
      padding: '18px 20px',
      maxWidth: 320,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            Daily Challenge · {DIM_LABELS[targetDim]}
          </div>
          {streak > 0 && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6875rem', color: dimColor }}>
              🔥 {streak} day streak
            </div>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1, marginLeft: 10, flexShrink: 0 }}
          aria-label="Dismiss challenge"
        >×</button>
      </div>

      {completed ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div>
          <div style={{ color: 'var(--emerald)', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Challenge complete!</div>
          <div style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>Streak: {streak} day{streak !== 1 ? 's' : ''}. New challenge tomorrow.</div>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 14 }}>
            {challenge}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleComplete}
              style={{
                background: `${dimColor}18`, border: `1px solid ${dimColor}60`,
                color: dimColor, borderRadius: 7, padding: '6px 14px',
                fontFamily: 'var(--mono)', fontSize: '0.7rem', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              Mark Done
            </button>
            {onNavigateJournal && (
              <button
                onClick={() => { handleComplete(); onNavigateJournal(); }}
                style={{
                  background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.3)',
                  color: 'var(--cyan)', borderRadius: 7, padding: '6px 14px',
                  fontFamily: 'var(--mono)', fontSize: '0.7rem', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                Log in Journal
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
