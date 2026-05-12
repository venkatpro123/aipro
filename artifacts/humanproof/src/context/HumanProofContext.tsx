import { createContext, useContext, useReducer, useEffect, useState, useCallback, ReactNode } from 'react';
import { saveScore } from '../utils/scoreStorage';
import { KEY_REGISTRY } from '../data/riskData';
import { assessmentAPI } from '../utils/apiClient';
import {
  fetchUserProfile,
  upsertUserProfile,
  type UserProfile,
} from '../services/userProfileService';

interface SkillEntry {
  id: number;
  name: string;
  category: string;
  riskScore: number;
  trend: string;
}

interface HumanProofState {
  jobRiskScore: number | null;
  jobTitle: string | null;
  jobId: string | null;
  skillRiskScore: number | null;
  selectedSkills: SkillEntry[];
  skillBreakdown: SkillEntry[];
  humanScore: number | null;
  humanDimensions: Record<string, number>;
  humanJustification: string | null;
  userName: string | null;
  industry: string | null;
  lastUpdated: string | null;
  activeToolTab: string;
  jobSpecificInsights: any[] | null;
  roadmapStartDate: string | null;
  assessmentTimestamp: number | null;
  roadmapStarted: boolean;
  skillIntents: Record<string, 'protect' | 'pivot'>;
  quizAnswers: Record<number, number>;
  initialWorkTypeKey: string | null;
  initialIndustryKey: string | null;
  companyName: string | null;
}

type Action =
  | { type: 'SET_JOB_RISK'; score: number; title: string; industry?: string; companyName?: string }
  | { type: 'SET_SKILL_RISK'; score: number; skills: SkillEntry[]; breakdown: SkillEntry[] }
  | { type: 'SET_HUMAN_SCORE'; score: number; dimensions: Record<string, number>; justification?: string }
  | { type: 'SET_USER_NAME'; name: string }
  | { type: 'SET_ACTIVE_TAB'; tab: string }
  | { type: 'SET_JOB_ID'; payload: string }
  | { type: 'SET_ROADMAP_STARTED'; startDate: string }
  | { type: 'SET_SKILL_INTENTS'; intents: Record<string, 'protect' | 'pivot'> }
  | { type: 'SET_QUIZ_ANSWERS'; answers: Record<number, number> }
  | { type: 'SET_INITIAL_ROLE'; industryKey: string; workTypeKey: string }
  | { type: 'CLEAR_INITIAL_ROLE' }
  | { type: 'HYDRATE'; payload: Partial<HumanProofState> };

const defaultState: HumanProofState = {
  jobRiskScore: null,
  jobTitle: null,
  jobId: null,
  skillRiskScore: null,
  selectedSkills: [],
  skillBreakdown: [],
  humanScore: null,
  humanDimensions: {},
  humanJustification: null,
  userName: null,
  industry: null,
  lastUpdated: null,
  activeToolTab: 'job-risk',
  jobSpecificInsights: null,
  roadmapStartDate: null,
  assessmentTimestamp: null,
  roadmapStarted: false,
  skillIntents: {},
  quizAnswers: {},
  initialWorkTypeKey: null,
  initialIndustryKey: null,
  companyName: null,
};

function reducer(state: HumanProofState, action: Action): HumanProofState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };
    case 'SET_JOB_RISK':
      saveScore(action.score, 'job');
      return {
        ...state,
        jobRiskScore: action.score,
        jobTitle: action.title,
        industry: action.industry ?? state.industry,
        companyName: action.companyName ?? state.companyName,
        lastUpdated: new Date().toISOString(),
        assessmentTimestamp: Date.now(),
      };
    case 'SET_SKILL_RISK':
      saveScore(action.score, 'skill');
      localStorage.setItem(KEY_REGISTRY.SKILL_BREAKDOWN, JSON.stringify(action.breakdown ?? []));
      return {
        ...state,
        skillRiskScore: action.score,
        selectedSkills: action.skills,
        skillBreakdown: action.breakdown,
        lastUpdated: new Date().toISOString(),
        assessmentTimestamp: Date.now(),
      };
    case 'SET_HUMAN_SCORE':
      saveScore(action.score, 'human-index');
      return {
        ...state,
        humanScore: action.score,
        humanDimensions: action.dimensions,
        humanJustification: action.justification ?? state.humanJustification,
        lastUpdated: new Date().toISOString(),
        assessmentTimestamp: Date.now(),
      };
    case 'SET_USER_NAME':
      return { ...state, userName: action.name };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeToolTab: action.tab };
    case 'SET_JOB_ID':
      return { ...state, jobId: action.payload };
    case 'SET_ROADMAP_STARTED':
      localStorage.setItem(KEY_REGISTRY.ROADMAP_START_DATE, action.startDate);
      return { ...state, roadmapStarted: true, roadmapStartDate: action.startDate };
    case 'SET_SKILL_INTENTS':
      return { ...state, skillIntents: action.intents };
    case 'SET_QUIZ_ANSWERS':
      return { ...state, quizAnswers: action.answers };
    case 'SET_INITIAL_ROLE':
      return { 
        ...state, 
        initialIndustryKey: action.industryKey, 
        initialWorkTypeKey: action.workTypeKey 
      };
    case 'CLEAR_INITIAL_ROLE':
      return {
        ...state,
        initialIndustryKey: null,
        initialWorkTypeKey: null
      };
    default:
      return state;
  }
}


interface AssessmentData {
  industry: string;
  workType: string;
  country: string;
  experience?: string;
  score: number;
  details: any;
}

interface HumanProofContextValue {
  state: HumanProofState;
  dispatch: React.Dispatch<Action>;
  isHydrated: boolean;
  // BUG-C1 FIX: saveAssessment was called in CalculatorPage but never existed on context
  saveAssessment: (data: AssessmentData) => Promise<void>;
  // v15.0 personalization profile (salary band, visa, metro, tenure).
  // Null until the profile setup modal is completed; null if unauthenticated.
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  refreshUserProfile: () => Promise<void>;
  saveUserProfile: (
    patch: Parameters<typeof upsertUserProfile>[0],
  ) => Promise<UserProfile | null>;
}

const HumanProofContext = createContext<HumanProofContextValue | null>(null);

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #0A0A14)', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)', fontSize: '1.2rem', letterSpacing: '0.1em' }}>
        HumanProof
      </div>
      <div style={{ width: 200, height: 2, background: 'rgba(0,245,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: 'var(--cyan)', borderRadius: 2,
          animation: 'loading-bar 1.2s ease-in-out infinite',
          width: '40%',
        }} />
      </div>
    </div>
  );
}

export function HumanProofProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Safety timeout: if localStorage hydration stalls for any reason, unblock
  // the render after 3 s so the app is never permanently stuck on LoadingScreen.
  useEffect(() => {
    const id = setTimeout(() => setIsHydrated(true), 3000);
    return () => clearTimeout(id);
  }, []);

  const refreshUserProfile = useCallback(async () => {
    const profile = await fetchUserProfile();
    setUserProfile(profile);
  }, []);

  const saveUserProfile = useCallback(
    async (patch: Parameters<typeof upsertUserProfile>[0]) => {
      const updated = await upsertUserProfile(patch);
      if (updated) setUserProfile(updated);
      return updated;
    },
    [],
  );

  useEffect(() => {
    const hydrateLocal = () => {
      try {
        const history = JSON.parse(localStorage.getItem(KEY_REGISTRY.SCORE_HISTORY) || '[]');
        const lastJobScore    = [...history].filter((e: any) => e.source === 'job').at(-1);
        const lastSkillScore  = [...history].filter((e: any) => e.source === 'skill').at(-1);
        const lastHumanScore  = [...history].filter((e: any) => e.source === 'human-index').at(-1);
        const skills          = JSON.parse(localStorage.getItem(KEY_REGISTRY.SKILL_SELECTIONS) || '[]');
        const breakdown       = JSON.parse(localStorage.getItem(KEY_REGISTRY.SKILL_BREAKDOWN) || '[]');
        const roadmapStart    = localStorage.getItem(KEY_REGISTRY.ROADMAP_START_DATE) || null;

        dispatch({
          type: 'HYDRATE',
          payload: {
            jobRiskScore:    lastJobScore?.score   ?? null,
            skillRiskScore:  lastSkillScore?.score ?? null,
            humanScore:      lastHumanScore?.score ?? null,
            selectedSkills:  skills,
            skillBreakdown:  breakdown,
            roadmapStartDate: roadmapStart,
            roadmapStarted:  !!roadmapStart,
          },
        });
      } catch {
        // Graceful degradation if localStorage is unavailable
      }
      setIsHydrated(true);
    };

    const hydrateCloud = async () => {
      try {
        const cloudAssessments = await assessmentAPI.getAssessments();
        if (cloudAssessments && cloudAssessments.length > 0) {
          const mergedHistory = cloudAssessments.map((a: any) => ({
             source: "job",
             roleKey: a.work_type,
             industryKey: a.industry,
             countryKey: a.country || 'usa',
             experience: a.experience || '5-10',
             score: a.score,
             timestamp: new Date(a.created_at).getTime(),
             isGrounded: true
          }));

          const localStr = localStorage.getItem(KEY_REGISTRY.SCORE_HISTORY) || '[]';
          let local = [];
          try { local = JSON.parse(localStr); } catch {}
          
          const combined = [...mergedHistory, ...local];
          
          const uniqueMap = new Map();
          for (const item of combined) {
             uniqueMap.set(item.timestamp, item);
          }
          const finalHistory = Array.from(uniqueMap.values()).sort((a,b) => b.timestamp - a.timestamp).slice(0, 50);

          localStorage.setItem(KEY_REGISTRY.SCORE_HISTORY, JSON.stringify(finalHistory));
          hydrateLocal(); // Re-hydrate with synced data
        }
      } catch (err) {
        console.warn("Cloud Drift Hydration bypassed (Network or Auth failure)", err);
      }
    };

    hydrateLocal();
    hydrateCloud();
    refreshUserProfile();
  }, [refreshUserProfile]);

  // BUG-C1 FIX: saveAssessment method — was called in CalculatorPage but missing from context
  // Saves to localStorage via dispatch and attempts API persist (silent fail if not authed)
  const saveAssessment = useCallback(async (data: AssessmentData) => {
    // Always save locally via dispatch
    dispatch({
      type: 'SET_JOB_RISK',
      score: data.score,
      title: data.workType,
      industry: data.industry,
      companyName: data.details?.companyName || null,
    });
    // Best-effort API persist (silently ignored if not authenticated)
    try {
      await assessmentAPI.saveAssessmentData(
        data.industry,
        data.workType,
        data.country,
        data.score,
        data.details
      );
    } catch {
      // Not authenticated or network error — local save is sufficient
    }
  }, []);

  if (!isHydrated) return <LoadingScreen />;

  return (
    <HumanProofContext.Provider
      value={{
        state,
        dispatch,
        isHydrated,
        saveAssessment,
        userProfile,
        setUserProfile,
        refreshUserProfile,
        saveUserProfile,
      }}
    >
      {children}
    </HumanProofContext.Provider>
  );
}

export function useHumanProof() {
  const ctx = useContext(HumanProofContext);
  if (!ctx) throw new Error('useHumanProof must be used within HumanProofProvider');
  return ctx;
}
