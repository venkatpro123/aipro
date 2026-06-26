import { useState, useEffect } from 'react';
import PeerBenchmark from './PeerBenchmark';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { quizQuestions, dimensionLabels, dimensionDescriptions, Dimension } from '../data/quizQuestions';
import { useHumanProof } from '../context/HumanProofContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

// Section 3.3 — Expanded JOB_DIM_WEIGHTS to 30 job types
// Each dimension weight reflects how protective that dimension is for the given role
const JOB_DIM_WEIGHTS: Record<string, Record<string, number>> = {
  // Technology
  software_engineer: { empathic:1.0, moral:1.1, creative:1.2, physical:0.6, social:1.1, contextual:1.0 },
  data_scientist:    { empathic:0.9, moral:1.1, creative:1.2, physical:0.5, social:1.0, contextual:1.1 },
  product_manager:   { empathic:1.2, moral:1.1, creative:1.2, physical:0.7, social:1.3, contextual:1.2 },
  ux_designer:       { empathic:1.3, moral:1.0, creative:1.4, physical:0.8, social:1.1, contextual:1.0 },
  cybersecurity:     { empathic:0.9, moral:1.3, creative:1.1, physical:0.6, social:0.9, contextual:1.2 },
  // Healthcare
  doctor:            { empathic:1.3, moral:1.4, creative:1.0, physical:1.2, social:1.2, contextual:1.1 },
  nurse:             { empathic:1.4, moral:1.3, creative:0.9, physical:1.4, social:1.2, contextual:1.0 },
  therapist:         { empathic:1.5, moral:1.3, creative:1.0, physical:1.1, social:1.3, contextual:1.2 },
  dentist:           { empathic:1.2, moral:1.3, creative:0.9, physical:1.4, social:1.1, contextual:1.0 },
  pharmacist:        { empathic:1.1, moral:1.4, creative:0.9, physical:1.0, social:1.0, contextual:1.1 },
  // Legal / Finance
  lawyer:            { empathic:1.1, moral:1.4, creative:1.0, physical:0.7, social:1.2, contextual:1.3 },
  accountant:        { empathic:1.0, moral:1.3, creative:0.9, physical:0.7, social:1.0, contextual:1.1 },
  financial_analyst: { empathic:0.9, moral:1.2, creative:1.0, physical:0.6, social:1.0, contextual:1.1 },
  // Education / Research
  teacher:           { empathic:1.4, moral:1.2, creative:1.1, physical:1.1, social:1.2, contextual:1.0 },
  academic:          { empathic:1.1, moral:1.3, creative:1.3, physical:0.7, social:1.0, contextual:1.2 },
  researcher:        { empathic:1.0, moral:1.3, creative:1.3, physical:0.7, social:0.9, contextual:1.1 },
  // Social / Care
  social_worker:     { empathic:1.5, moral:1.4, creative:0.9, physical:1.1, social:1.3, contextual:1.2 },
  counsellor:        { empathic:1.5, moral:1.3, creative:1.0, physical:1.0, social:1.2, contextual:1.2 },
  // Business / Operations
  sales:             { empathic:1.2, moral:1.0, creative:1.0, physical:1.0, social:1.4, contextual:1.3 },
  hr:                { empathic:1.3, moral:1.2, creative:1.0, physical:0.8, social:1.2, contextual:1.1 },
  recruiter:         { empathic:1.3, moral:1.1, creative:0.9, physical:0.9, social:1.3, contextual:1.2 },
  consultant:        { empathic:1.1, moral:1.2, creative:1.2, physical:0.8, social:1.3, contextual:1.2 },
  project_manager:   { empathic:1.2, moral:1.1, creative:1.0, physical:0.8, social:1.3, contextual:1.2 },
  // Creative
  designer:          { empathic:1.0, moral:0.9, creative:1.4, physical:0.8, social:1.1, contextual:1.0 },
  journalist:        { empathic:1.1, moral:1.4, creative:1.3, physical:0.9, social:1.1, contextual:1.2 },
  // Trades / Physical
  architect:         { empathic:1.0, moral:1.1, creative:1.3, physical:1.1, social:1.1, contextual:1.2 },
  chef:              { empathic:1.1, moral:1.0, creative:1.3, physical:1.5, social:1.0, contextual:1.0 },
  engineer:          { empathic:0.9, moral:1.1, creative:1.1, physical:1.1, social:1.0, contextual:1.1 },
  // Marketing / Comms
  marketing:         { empathic:1.1, moral:1.0, creative:1.3, physical:0.7, social:1.2, contextual:1.1 },
  pr_communications: { empathic:1.2, moral:1.2, creative:1.2, physical:0.9, social:1.3, contextual:1.2 },
  // Default
  default:           { empathic:1.0, moral:1.0, creative:1.0, physical:1.0, social:1.0, contextual:1.0 },
};

// Industry benchmark averages per job type
const JOB_INDUSTRY_RADAR_AVG: Record<string, Record<string, number>> = {
  software_engineer: { empathic:52, moral:55, creative:58, physical:38, social:50, contextual:52 },
  data_scientist:    { empathic:48, moral:54, creative:60, physical:35, social:46, contextual:54 },
  product_manager:   { empathic:60, moral:58, creative:65, physical:40, social:66, contextual:60 },
  ux_designer:       { empathic:65, moral:50, creative:72, physical:45, social:58, contextual:52 },
  cybersecurity:     { empathic:46, moral:65, creative:55, physical:38, social:46, contextual:60 },
  doctor:            { empathic:68, moral:72, creative:50, physical:60, social:62, contextual:58 },
  nurse:             { empathic:72, moral:68, creative:46, physical:72, social:62, contextual:54 },
  therapist:         { empathic:78, moral:70, creative:52, physical:58, social:68, contextual:64 },
  dentist:           { empathic:60, moral:66, creative:46, physical:72, social:58, contextual:52 },
  pharmacist:        { empathic:56, moral:70, creative:44, physical:52, social:52, contextual:58 },
  lawyer:            { empathic:55, moral:70, creative:52, physical:40, social:60, contextual:65 },
  accountant:        { empathic:50, moral:65, creative:45, physical:36, social:52, contextual:58 },
  financial_analyst: { empathic:46, moral:62, creative:50, physical:34, social:50, contextual:58 },
  teacher:           { empathic:72, moral:65, creative:58, physical:55, social:64, contextual:55 },
  academic:          { empathic:55, moral:66, creative:68, physical:38, social:50, contextual:62 },
  researcher:        { empathic:50, moral:64, creative:68, physical:36, social:46, contextual:58 },
  social_worker:     { empathic:76, moral:72, creative:46, physical:56, social:68, contextual:64 },
  counsellor:        { empathic:76, moral:68, creative:52, physical:52, social:64, contextual:64 },
  sales:             { empathic:62, moral:52, creative:50, physical:52, social:72, contextual:66 },
  hr:                { empathic:68, moral:62, creative:50, physical:44, social:64, contextual:56 },
  recruiter:         { empathic:66, moral:58, creative:46, physical:46, social:68, contextual:62 },
  consultant:        { empathic:58, moral:62, creative:62, physical:42, social:66, contextual:62 },
  project_manager:   { empathic:62, moral:58, creative:52, physical:44, social:66, contextual:62 },
  designer:          { empathic:52, moral:48, creative:72, physical:44, social:55, contextual:50 },
  journalist:        { empathic:58, moral:70, creative:68, physical:46, social:58, contextual:62 },
  architect:         { empathic:52, moral:58, creative:68, physical:58, social:58, contextual:64 },
  chef:              { empathic:56, moral:52, creative:68, physical:78, social:52, contextual:52 },
  engineer:          { empathic:48, moral:58, creative:58, physical:58, social:52, contextual:58 },
  marketing:         { empathic:58, moral:52, creative:68, physical:38, social:62, contextual:58 },
  pr_communications: { empathic:62, moral:62, creative:64, physical:48, social:68, contextual:62 },
  default:           { empathic:55, moral:55, creative:55, physical:55, social:55, contextual:55 },
};

// Section 3.3 — Expanded deriveJobKey to match all 30 types
function deriveJobKey(title: string | null, jobId: string | null): string {
  const key = jobId || title || '';
  const t = key.toLowerCase();
  // Healthcare
  if (/nurse|midwife|health visitor|district nurse/.test(t)) return 'nurse';
  if (/therapist|counsellor|counselor|psychologist|psychiatrist/.test(t)) return 'therapist';
  if (/dentist|dental/.test(t)) return 'dentist';
  if (/pharmacist|pharmacy/.test(t)) return 'pharmacist';
  if (/doctor|physician|surgeon|gp\b|consultant physician/.test(t)) return 'doctor';
  // Legal / Finance
  if (/lawyer|solicitor|barrister|attorney|paralegal/.test(t)) return 'lawyer';
  if (/accountant|auditor|bookkeeper|cpa|chartered accountant/.test(t)) return 'accountant';
  if (/financial analyst|finance analyst|investment analyst|equity|trading/.test(t)) return 'financial_analyst';
  // Technology
  if (/ux designer|ux researcher|user experience/.test(t)) return 'ux_designer';
  if (/product manager|product owner/.test(t)) return 'product_manager';
  if (/data scientist|ml engineer|machine learning|ai engineer/.test(t)) return 'data_scientist';
  if (/cybersecurity|security analyst|pen test|infosec|soc analyst/.test(t)) return 'cybersecurity';
  if (/software engineer|developer|programmer|swe\b|full.?stack|backend|frontend/.test(t)) return 'software_engineer';
  // Education / Research
  if (/teacher|lecturer|professor|tutor|educator/.test(t)) return 'teacher';
  if (/research scientist|researcher/.test(t)) return 'researcher';
  if (/academic|faculty/.test(t)) return 'academic';
  // Social / Care
  if (/social worker|case manager|community worker|welfare/.test(t)) return 'social_worker';
  if (/counsellor|counselor|life coach/.test(t)) return 'counsellor';
  // Business / Operations
  if (/recruiter|talent acquisition|headhunter/.test(t)) return 'recruiter';
  if (/hr |human resource|people ops|hrbp/.test(t)) return 'hr';
  if (/consultant|advisory|management consultant/.test(t)) return 'consultant';
  if (/project manager|scrum master|programme manager/.test(t)) return 'project_manager';
  if (/sales|account executive|business development/.test(t)) return 'sales';
  // Creative / Media
  if (/journalist|reporter|editor|correspondent/.test(t)) return 'journalist';
  if (/pr manager|communications|public relations|comms/.test(t)) return 'pr_communications';
  if (/marketing|brand manager|growth|seo|digital market/.test(t)) return 'marketing';
  if (/designer|design lead/.test(t)) return 'designer';
  // Architecture / Engineering / Trades
  if (/architect(?!ure|ural|data|software|enterprise|solution)/.test(t)) return 'architect';
  if (/chef|cook|culinary/.test(t)) return 'chef';
  if (/engineer/.test(t)) return 'engineer';
  return 'default';
}

// Section 3.4 — Quiz progress persistence keys
const QUIZ_PROGRESS_KEY = 'hp_quiz_progress';

interface QuizProgress {
  answers: Record<number, number>;
  currentQuestion: number;
  timestamp: number;
}

function saveQuizProgress(answers: Record<number, number>, currentQ: number) {
  const progress: QuizProgress = { answers, currentQuestion: currentQ, timestamp: Date.now() };
  localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progress));
}

function loadQuizProgress(): QuizProgress | null {
  try {
    const raw = localStorage.getItem(QUIZ_PROGRESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as QuizProgress;
    // Only resume if saved within the last 7 days
    if (Date.now() - p.timestamp > 7 * 24 * 3600 * 1000) {
      localStorage.removeItem(QUIZ_PROGRESS_KEY);
      return null;
    }
    return p;
  } catch { return null; }
}

function clearQuizProgress() {
  localStorage.removeItem(QUIZ_PROGRESS_KEY);
}

// UX FIX 2: Compute a provisional score from partial answers (for halfway banner)
function computeProvisionalScore(
  partialAnswers: Record<number, number>,
  jobTitle: string | null,
  jobId: string | null,
): number | null {
  const answeredQs = quizQuestions.filter(q => partialAnswers[q.id] !== undefined);
  if (answeredQs.length === 0) return null;
  const jobKey = deriveJobKey(jobTitle, jobId);
  const weights = JOB_DIM_WEIGHTS[jobKey] || JOB_DIM_WEIGHTS.default;
  const dimScores: Record<string, number[]> = {};
  answeredQs.forEach(q => {
    const rawScore = partialAnswers[q.id] ?? 1;
    const score = q.reverse_scored ? (6 - rawScore) : rawScore;
    if (!dimScores[q.dimension]) dimScores[q.dimension] = [];
    dimScores[q.dimension].push(score);
  });
  const dimAvgs = Object.entries(dimScores).map(([dim, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const raw = (avg - 1) * 25;
    return Math.min(100, Math.max(0, Math.round(raw * (weights[dim] || 1.0))));
  });
  return dimAvgs.length > 0
    ? Math.round(dimAvgs.reduce((a, b) => a + b, 0) / dimAvgs.length)
    : null;
}

const HALFWAY_Q = Math.floor(quizQuestions.length / 2); // index 15 for 30-question quiz

type QuizMode = 'standard' | 'adaptive';
type QuestionMode = 'mcq' | 'text';

interface AdaptiveQuestion {
  id: string;
  question: string;
  dimension: string;
  options: { text: string; score: number }[];
  idealKeywords: string[];
}

export default function HumanIrreplacibilityIndex({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { state, dispatch } = useHumanProof();
  const { session } = useAuth();
  
  const [quizMode, setQuizMode] = useState<QuizMode | null>(null);
  const [adaptiveMode, setAdaptiveMode] = useState<QuestionMode>('mcq');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<AdaptiveQuestion[]>([]);
  const [adaptiveAnswers, setAdaptiveAnswers] = useState<any[]>([]);
  const [adaptiveText, setAdaptiveText] = useState('');
  
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  // Section 3.4 — resume banner state
  const [savedProgress, setSavedProgress] = useState<QuizProgress | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Derive roleKey from state or compute it
  const getRoleKey = () => {
    if (state.jobId && JOB_DIM_WEIGHTS[state.jobId]) return state.jobId;
    return deriveJobKey(state.jobTitle, state.jobId);
  };
  const roleKey = getRoleKey();

  const [displayedText, setDisplayedText] = useState('');
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const text = quizMode === 'standard' ? question.question : (adaptiveQuestions[currentQ]?.question || '');
    if (!text) return;

    setTyping(true);
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(prev => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 15); // Fast typing effect

    return () => clearInterval(interval);
  }, [currentQ, quizMode, adaptiveQuestions.length]);

  const startAdaptiveQuiz = async (mode: QuestionMode) => {
    setLoading(true);
    setAdaptiveMode(mode);
    try {
      // @ts-ignore - Supabase client has auth.admin or is createClient instance
      const supabaseUrl = (supabase as any).supabaseUrl;
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-adaptive-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ roleKey: roleKey || 'default' }),
      });
      const data = await resp.json();
      if (data.questions) {
        setAdaptiveQuestions(data.questions);
        setQuizMode('adaptive');
      }
    } catch (e) {
      console.error("Failed to start adaptive quiz", e);
    } finally {
      setLoading(false);
    }
  };

  const submitAdaptiveAnswer = () => {
    const q = adaptiveQuestions[currentQ];
    const newAnswer = {
      id: q.id,
      question: q.question,
      dimension: q.dimension,
      mode: adaptiveMode,
      response: adaptiveMode === 'mcq' ? selected : adaptiveText
    };
    
    const newAnswers = [...adaptiveAnswers, newAnswer];
    setAdaptiveAnswers(newAnswers);
    setAdaptiveText('');
    setSelected(null);
    
    if (currentQ < adaptiveQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishAdaptiveQuiz(newAnswers);
    }
  };

  const finishAdaptiveQuiz = async (finalAnswers: any[]) => {
    setLoading(true);
    try {
      // @ts-ignore
      const supabaseUrl = (supabase as any).supabaseUrl;
      const resp = await fetch(`${supabaseUrl}/functions/v1/evaluate-adaptive-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ roleKey: roleKey || 'default', answers: finalAnswers }),
      });
      const result = await resp.json();
      if (result.dimensions) {
        dispatch({ 
          type: 'SET_HUMAN_SCORE', 
          score: result.totalScore, 
          dimensions: result.dimensions,
          justification: result.justification 
        });
        setCompleted(true);
      }
    } catch (e) {
      console.error("Evaluation failed", e);
    } finally {
      setLoading(false);
    }
  };

  // Section 3.4 — Check for saved progress on mount
  useEffect(() => {
    const p = loadQuizProgress();
    if (p && p.currentQuestion > 0 && p.currentQuestion < quizQuestions.length) {
      setSavedProgress(p);
      setShowResumeBanner(true);
    }
  }, []);

  const question = quizQuestions[currentQ];

  const handleSelect = (score: number) => setSelected(score);

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = { ...answers, [question.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);
    const nextQ = currentQ + 1;
    if (nextQ < quizQuestions.length) {
      setCurrentQ(nextQ);
      // Section 3.4 — Persist progress after each answer
      saveQuizProgress(newAnswers, nextQ);
    } else {
      clearQuizProgress();
      finishQuiz(newAnswers);
    }
  };

  const handleResume = () => {
    if (!savedProgress) return;
    setAnswers(savedProgress.answers);
    setCurrentQ(savedProgress.currentQuestion);
    setShowResumeBanner(false);
  };

  const handleStartFresh = () => {
    clearQuizProgress();
    setSavedProgress(null);
    setShowResumeBanner(false);
    setAnswers({});
    setCurrentQ(0);
  };

  const finishQuiz = (finalAnswers: Record<number, number>) => {
    const dimScores: Record<Dimension, number[]> = { empathic: [], moral: [], creative: [], physical: [], social: [], contextual: [] };
    quizQuestions.forEach(q => {
      const rawScore = finalAnswers[q.id] ?? 1;
      // Section 3.1 — Apply reverse scoring for reverse_scored questions
      const score = q.reverse_scored ? (6 - rawScore) : rawScore;
      dimScores[q.dimension].push(score);
    });

    const jobKey = deriveJobKey(state.jobTitle, state.jobId);
    const weights = JOB_DIM_WEIGHTS[jobKey] || JOB_DIM_WEIGHTS.default;

    const dimensions: Record<string, number> = {};
    (Object.keys(dimScores) as Dimension[]).forEach(dim => {
      const scores = dimScores[dim];
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      // (rawAnswer - 1) × 25 maps 1→0, 2→25, 3→50, 4→75, 5→100
      const raw = (avg - 1) * 25;
      const weighted = raw * (weights[dim] || 1.0);
      dimensions[dim] = Math.min(100, Math.max(0, Math.round(weighted)));
    });

    const humanScore = Math.round(Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.values(dimensions).length);
    dispatch({ type: 'SET_HUMAN_SCORE', score: humanScore, dimensions });
    setCompleted(true);
  };

  const { humanScore, humanDimensions } = state;

  if (completed && humanScore !== null) {
    const jobKey = deriveJobKey(state.jobTitle, state.jobId);
    const industryAvgs = JOB_INDUSTRY_RADAR_AVG[jobKey] || JOB_INDUSTRY_RADAR_AVG.default;

    const radarData = Object.entries(humanDimensions).map(([dim, score]) => ({
      dimension: dimensionLabels[dim as Dimension] || dim,
      score,
      industryAvg: industryAvgs[dim] || 55,
    }));
    const topDimension = Object.entries(humanDimensions).sort((a, b) => b[1] - a[1])[0];
    const topLabel = topDimension ? dimensionLabels[topDimension[0] as Dimension] : '';
    const scoreColor = humanScore >= 75 ? 'var(--emerald)' : humanScore >= 50 ? 'var(--cyan)' : 'var(--orange)';

    return (
      <div style={{ padding: '40px 0', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Human Irreplaceability Score</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '5rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{humanScore}</div>
          <div style={{ color: 'var(--text2)', fontSize: '0.9rem', marginTop: 8 }}>out of 100</div>
          <div style={{ marginTop: 16, color: 'var(--text)', fontSize: '1rem' }}>
            Your strongest human edge is <strong style={{ color: scoreColor }}>{topLabel}</strong>
          </div>
          {jobKey !== 'default' && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text2)' }}>
              Scores weighted for your role context · Industry benchmarks shown
            </div>
          )}
        </div>

        {/* NEW-01: Peer Benchmark for Human Index */}
        <PeerBenchmark
          score={humanScore}
          scoreType="hii"
          jobTitle={state.jobTitle}
          industry={state.industry ?? undefined}
        />

        <div style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Human Signature Profile</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: 16, display: 'flex', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--emerald)' }} /> Your score</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'rgba(0,245,255,0.4)' }} /> Industry avg</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(0,255,159,0.12)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--text2)', fontSize: 10 }} />
              <Radar name="Industry Average" dataKey="industryAvg" stroke="rgba(0,245,255,0.3)" fill="rgba(0,245,255,0.05)" strokeDasharray="4 4" />
              <Radar
                name="Human Score"
                dataKey="score"
                stroke="var(--emerald)"
                fill="var(--emerald)"
                fillOpacity={0.15}
              />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {Object.entries(humanDimensions)
            .sort((a, b) => b[1] - a[1])
            .map(([dim, score]) => (
              <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 160, fontSize: '0.8rem', color: 'var(--text2)', flexShrink: 0 }}>{dimensionLabels[dim as Dimension]}</div>
                <div style={{ flex: 1, height: 6, background: 'var(--alpha-bg-06)', borderRadius: 3, position: 'relative' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: score >= 75 ? 'var(--emerald)' : score >= 50 ? 'var(--cyan)' : 'var(--orange)', borderRadius: 3 }} />
                </div>
                <div style={{ width: 36, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--text)', flexShrink: 0 }}>{score}</div>
              </div>
            ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate?.('progress')}
            style={{ flex: 1, minWidth: 180, background: 'var(--emerald)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Share My Human Score →
          </button>
          <button
            onClick={() => onNavigate?.('journal')}
            style={{ flex: 1, minWidth: 180, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Log a Human Moment →
          </button>
          <button
            onClick={() => { setCompleted(false); setAnswers({}); setCurrentQ(0); setSelected(null); clearQuizProgress(); }}
            style={{ flex: 1, minWidth: 180, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 8, padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  const progress = (currentQ / quizQuestions.length) * 100;

  if (!quizMode && !completed) {
    return (
      <div style={{ padding: '40px 0', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--mono)', fontSize: '1.5rem', color: 'var(--emerald)', marginBottom: 24 }}>
          Human Irreplaceability Index
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: 40 }}>
          Quantify your resistance to AI displacement. Choose an assessment mode below.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <div style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>⚡</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Standard Mode</h3>
            <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: 24, flex: 1 }}>
              30 Multiple choice questions. Calibrated benchmarks for your role. (6–8 mins)
            </p>
            <button 
              onClick={() => setQuizMode('standard')}
              className="w-full py-3 bg-[var(--alpha-bg-10)] hover:bg-[var(--alpha-bg-12)] border border-[var(--alpha-bg-10)] rounded-xl font-bold transition-all"
            >
              Start Standard Assessment
            </button>
          </div>

          <div style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.3)', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>✨</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--cyan)' }}>Adaptive AI Mode</h3>
            <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: 24, flex: 1 }}>
              Personalized questions generated by **Gemma 4**. High-accuracy semantic analysis of your reasoning.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => startAdaptiveQuiz('mcq')}
                disabled={loading}
                style={{ flex: 1, padding: '12px', background: 'rgba(0,245,255,0.2)', color: 'var(--cyan)', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              >
                {loading ? '...' : 'Fast (MCQ)'}
              </button>
              <button 
                onClick={() => startAdaptiveQuiz('text')}
                disabled={loading}
                style={{ flex: 1, padding: '12px', background: 'var(--cyan)', color: 'black', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              >
                {loading ? '...' : '98% Accuracy (Text)'}
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: '0.7rem', color: 'rgba(0,245,255,0.6)', fontFamily: 'var(--mono)' }}>
              POWERED BY GEMMA 4 31B
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressVal = quizMode === 'standard' 
    ? (currentQ / quizQuestions.length) * 100
    : (currentQ / (adaptiveQuestions.length || 1)) * 100;

  const adaptiveQ = adaptiveQuestions[currentQ];

  return (
    <div style={{ padding: '40px 0', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 4, height: 32, background: quizMode === 'adaptive' ? 'var(--cyan)' : 'var(--emerald)', borderRadius: 2 }} />
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: '1.5rem', color: quizMode === 'adaptive' ? 'var(--cyan)' : 'var(--emerald)' }}>
            {quizMode === 'adaptive' ? 'Adaptive AI Index' : 'Human Irreplaceability Index'}
          </h2>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginLeft: 16 }}>
          {quizMode === 'adaptive' ? `Analyzing your human edge via role-specific scenarios.` : `${quizQuestions.length} questions across 6 human dimensions that AI cannot replicate.`}
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text2)' }}>
            Question {currentQ + 1} of {quizMode === 'standard' ? quizQuestions.length : adaptiveQuestions.length}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: quizMode === 'adaptive' ? 'var(--cyan)' : 'var(--emerald)' }}>
            {Math.round(progressVal)}%
          </span>
        </div>
        <div style={{ height: 3, background: 'var(--alpha-bg-08)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${progressVal}%`, background: quizMode === 'adaptive' ? 'var(--cyan)' : 'var(--emerald)', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: quizMode === 'adaptive' ? 'var(--cyan)' : 'var(--emerald)', background: quizMode === 'adaptive' ? 'rgba(0,245,255,0.08)' : 'rgba(0,255,159,0.08)', padding: '4px 12px', borderRadius: 4, border: `1px solid ${quizMode === 'adaptive' ? 'rgba(0,245,255,0.2)' : 'rgba(0,255,159,0.2)'}` }}>
          {quizMode === 'standard' ? dimensionLabels[question.dimension] : adaptiveQ?.dimension}
        </span>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 20 }}>
        <p style={{ color: 'var(--text)', fontSize: '1.05rem', lineHeight: 1.7, fontWeight: 500, minHeight: '3em' }}>
          {displayedText}
          {typing && <span className="inline-block w-1 h-5 bg-cyan-500 ml-1 animate-pulse" />}
        </p>
      </div>

      {quizMode === 'adaptive' && adaptiveMode === 'text' ? (
        <textarea
          value={adaptiveText}
          onChange={(e) => setAdaptiveText(e.target.value)}
          placeholder="Describe your reasoning and how you would handle this situation..."
          style={{
            width: '100%', minHeight: 180, background: 'var(--alpha-bg-04)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, color: 'var(--text)', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none'
          }}
        />
      ) : (
        <div role="group" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {(quizMode === 'standard' ? question.options : adaptiveQ?.options).map((opt: any, i: number) => (
            <button
              key={i}
              onClick={() => handleSelect(opt.score)}
              style={{
                width: '100%', background: selected === opt.score ? (quizMode === 'adaptive' ? 'rgba(0,245,255,0.1)' : 'rgba(0,255,159,0.1)') : 'var(--alpha-bg-04)', border: selected === opt.score ? `1px solid ${quizMode === 'adaptive' ? 'var(--cyan)' : 'var(--emerald)'}` : '1px solid var(--border)', borderRadius: 10, padding: '14px 20px', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <span style={{ color: selected === opt.score ? (quizMode === 'adaptive' ? 'var(--cyan)' : 'var(--emerald)') : 'var(--text2)', fontFamily: 'var(--mono)', fontSize: '0.75rem', marginRight: 10 }}>{String.fromCharCode(65 + i)}</span>
              {opt.text}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <button
          onClick={() => setCurrentQ(q => q - 1)}
          disabled={currentQ === 0}
          style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', opacity: currentQ === 0 ? 0 : 1 }}
        >
          ← Back
        </button>
        <button
          onClick={quizMode === 'standard' ? handleNext : submitAdaptiveAnswer}
          disabled={selected === null && adaptiveText === ''}
          style={{
            background: (selected !== null || adaptiveText !== '') ? (quizMode === 'adaptive' ? 'var(--cyan)' : 'var(--emerald)') : 'var(--alpha-bg-08)',
            color: (selected !== null || adaptiveText !== '') ? 'black' : 'var(--text2)', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 700, cursor: (selected !== null || adaptiveText !== '') ? 'pointer' : 'not-allowed'
          }}
        >
          {quizMode === 'standard' 
            ? (currentQ < quizQuestions.length - 1 ? 'Next →' : 'See My Score →')
            : (currentQ < adaptiveQuestions.length - 1 ? 'Next →' : 'Analyze Accuracy →')}
        </button>
      </div>
    </div>
  );
}
