// AuditTerminalPage — Risk Oracle
// Deterministic 6-dimension AI displacement risk calculator.
// Completely separate from the Layoff Audit (swarm pipeline).
// Uses calculateScore() from riskFormula — client-side, no external calls.

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { INDUSTRIES, WORK_TYPES, COUNTRIES } from '../data/catalogData';
// All helpers from riskFormula — unified <25/<50/<70 bands, consistent with the
// ring colour and per-dimension reasoning. riskEngine re-exports these now too.
import {
  calculateScore,
  getScoreColor,
  getVerdict,
  getTimeline,
  getUrgency,
  calculateD7,
  riskToSurvival,
  getSurvivalVerdict,
  getSurvivalVerdictSubtext,
  getPreparationWindow,
  getActionDeadline,
  getSurvivalCurrentPosition,
  getSurvivalFutureOutlook,
  getCareerProtectionGrade,
  getPreparationWindowMonths,
  getSurvivalWindow,
  getPersonalizedScoreExplanation,
} from '../data/riskFormula';
import { PeerSurvivalCard } from '../components/AIDisplacementEngine/PeerSurvivalCard';
// normalizeExperience used internally in riskFormula; not needed at the page level.
import type { ScoreResult } from '../data/riskFormula';
import NeuralSphereLoader from '../components/RiskOracle/NeuralSphereLoader';
import { getCachedRisk, setCachedRisk } from '../services/cache/riskCache';
import { recordScore, getScoreDelta, type ScoreDelta } from '../services/scoreDeltaService';
import { PremiumSelect, type SelectOption } from '../components/ui/PremiumSelect';
import { RoleCombobox } from '../components/ui/RoleCombobox';
import { generateDynamicRoleIntelligence } from '../services/dynamicRoleIntelligence';
import { StrategicRoadmap } from '../components/StrategicRoadmap';
import { getCareerIntelligence } from '../data/intelligence/index';
import { AIRiskSkillMatrix } from '../components/AIRiskSkillMatrix';
import { ScoreComparison } from '../components/ScoreComparison';
import { DataFreshnessBadge } from '../components/DataFreshnessBadge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Cpu, Database, Globe, Layout, Lock, Smartphone,
  Users, ShieldCheck, BarChart, PenTool, Stethoscope, Gavel,
  GraduationCap, Factory, ShoppingBag, Zap, Clock, Star, Shield,
  Search, Share2, Check, SlidersHorizontal, ChevronDown, ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { calculateScore as calculateScoreFn } from '../data/riskFormula';
import { computeTrajectory, yearIndexToMonthLabel } from '../services/DisplacementTrajectoryEngine';
import type { OracleDimension }    from '../services/DisplacementTrajectoryEngine';
import { computeAgenticExposureScore } from '../services/agenticExposureEngine';
import { getAutomationTimeline, ROLE_EVOLUTION_PATHS } from '../data/automationTimelineData';
import { industryRiskData }        from '../data/industryRiskData';
import { CurrentRiskMetrics }      from '../components/AIDisplacementEngine/CurrentRiskMetrics';
import { AgenticExposurePanel }    from '../components/AIDisplacementEngine/AgenticExposurePanel';
import { CapabilityThresholdPanel }from '../components/AIDisplacementEngine/CapabilityThresholdPanel';
import { TaskExposureMatrix }      from '../components/AIDisplacementEngine/TaskExposureMatrix';
import { SurvivalFactorsPanel }    from '../components/AIDisplacementEngine/SurvivalFactorsPanel';
import { RoleEvolutionPath }       from '../components/AIDisplacementEngine/RoleEvolutionPath';
import { EarlyWarningSignals }     from '../components/AIDisplacementEngine/EarlyWarningSignals';
import { EnhancedActionPlan }      from '../components/AIDisplacementEngine/EnhancedActionPlan';
import { PsychologicalFramingPanel }from '../components/AIDisplacementEngine/PsychologicalFramingPanel';
import { StructuralRiskPanel }     from '../components/AIDisplacementEngine/StructuralRiskPanel';
import { RoleCategoryBadge }       from '../components/AIDisplacementEngine/RoleCategoryBadge';
import { ThreatBreakdownPanel }    from '../components/AIDisplacementEngine/ThreatBreakdownPanel';
import { CareerProtectionScorecard } from '../components/AIDisplacementEngine/CareerProtectionScorecard';
import { OutcomeFeedbackPrompt }   from '../components/OutcomeFeedbackPrompt';
import { buildMasterIntelligence } from '../data/masterIntelligenceEngine';
import { buildNarrativeState }     from '../data/narrativeState';
import { getCountryIntelligence }  from '../data/countryIntelligence';
import { getRoleNarrative }        from '../data/roleNarratives';
import { OpportunityPanel }        from '../components/AIDisplacementEngine/OpportunityPanel';

// ── Bridge: catalogData industry keys → industryRiskData keys ────────────────
const INDUSTRY_TO_RISK_KEY: Record<string, string> = {
  it_software: 'Technology', it_web: 'Technology', it_mobile: 'Technology',
  it_saas: 'Technology', it_ai_ml: 'Technology', it_cybersec: 'Cybersecurity',
  it_devops: 'Technology', it_blockchain: 'Technology', it_gaming: 'Gaming',
  it_qa: 'Technology', it_erp: 'Technology',
  finance: 'Financial Services', fintech: 'FinTech', insurance: 'Insurance',
  investment: 'Financial Services',
  media: 'Media & Publishing', content: 'Media & Publishing',
  marketing: 'Media & Publishing', advertising: 'Media & Publishing',
  healthcare: 'Healthcare', pharma: 'Biotech/Pharma', biotech: 'Biotech/Pharma',
  education: 'Education', edtech: 'EdTech',
  ecommerce: 'E-commerce', retail: 'Retail',
  manufacturing: 'Manufacturing', engineering: 'Manufacturing',
  energy: 'Energy', construction: 'Construction',
  legal: 'Legal', consulting: 'Consulting', hr: 'Consulting',
  government: 'Government', nonprofit: 'Nonprofit',
  hospitality: 'Hospitality', logistics: 'Logistics',
  telecom: 'Telecom', realestate: 'Real Estate',
  bpo: 'BPO', ites: 'ITES', it_services: 'IT Services',
  banking: 'Banking', mobility: 'Mobility',
};

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPERIENCE_LEVELS = [
  { key: '0-2',   label: '0–2 years (Entry)' },
  { key: '2-5',   label: '2–5 years (Early)' },
  { key: '5-10',  label: '5–10 years (Mid)' },
  { key: '10-20', label: '10–20 years (Senior)' },
  { key: '20+',   label: '20+ years (Principal)' },
];

const CAT_COLORS: Record<string, string> = {
  'Technology':             'var(--cyan)',
  'Finance & Business':     'var(--emerald)',
  'Media & Creative':       'var(--violet)',
  'Services':               'var(--amber)',
  'Healthcare & Science':   'var(--red)',
  'Education':              '#38bdf8',
  'Industry & Engineering': '#94a3b8',
  'Retail & Consumer':      '#f472b6',
  'Government & Social':    '#4ade80',
};

const DIM_INFO: Record<string, { label: string; desc: string }> = {
  D1: { label: 'How much AI can do your job',         desc: 'What percentage of your daily tasks AI tools can do without you' },
  D2: { label: 'How advanced the AI tools are',       desc: 'How developed and widely used AI tools are for your specific type of work' },
  D3: { label: "Where you're irreplaceable",          desc: 'How much your role depends on things only humans can do — judgment, empathy, creativity' },
  D4: { label: 'How much your experience protects you', desc: 'How much your years of experience and track record make you harder to replace' },
  D5: { label: 'How fast AI is moving in your country', desc: 'How quickly AI is being adopted in jobs like yours in your country' },
  D6: { label: 'How strong your professional network is', desc: 'How much your professional relationships and reputation protect your career' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getRoleIcon = (label: string | undefined | null): React.ReactNode => {
  if (!label) return <Star className="w-4 h-4" />;
  const l = label.toLowerCase();
  if (l.includes('backend') || l.includes('api') || l.includes('sql')) return <Database className="w-4 h-4" />;
  if (l.includes('frontend') || l.includes('web') || l.includes('react') || l.includes('ui') || l.includes('ux')) return <Layout className="w-4 h-4" />;
  if (l.includes('mobile') || l.includes('ios') || l.includes('android')) return <Smartphone className="w-4 h-4" />;
  if (l.includes('ai') || l.includes('ml') || l.includes('model') || l.includes('data')) return <Cpu className="w-4 h-4" />;
  if (l.includes('security') || l.includes('cyber')) return <Lock className="w-4 h-4" />;
  if (l.includes('manager') || l.includes('lead') || l.includes('product') || l.includes('pm')) return <Briefcase className="w-4 h-4" />;
  if (l.includes('test') || l.includes('qa')) return <Search className="w-4 h-4" />;
  if (l.includes('devops') || l.includes('cloud') || l.includes('infra')) return <Globe className="w-4 h-4" />;
  if (l.includes('content') || l.includes('write') || l.includes('copy')) return <PenTool className="w-4 h-4" />;
  if (l.includes('doctor') || l.includes('nurse') || l.includes('health')) return <Stethoscope className="w-4 h-4" />;
  if (l.includes('legal') || l.includes('law') || l.includes('compli')) return <Gavel className="w-4 h-4" />;
  if (l.includes('teach') || l.includes('edu') || l.includes('train')) return <GraduationCap className="w-4 h-4" />;
  if (l.includes('factory') || l.includes('manufactur')) return <Factory className="w-4 h-4" />;
  if (l.includes('retail') || l.includes('shop') || l.includes('sales')) return <ShoppingBag className="w-4 h-4" />;
  if (l.includes('analyst') || l.includes('research') || l.includes('bi')) return <BarChart className="w-4 h-4" />;
  if (l.includes('hr') || l.includes('recruit') || l.includes('people')) return <Users className="w-4 h-4" />;
  return <Star className="w-4 h-4" />;
};

type TabKey = 'overview' | 'intelligence' | 'tasks' | 'protection' | 'strategy';

// ── Component ─────────────────────────────────────────────────────────────────

const AuditTerminalPage: React.FC = () => {
  const [industryKey, setIndustryKey]     = useState('');
  const [workTypeKey, setWorkTypeKey]     = useState('');
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [experience, setExperience]       = useState('5-10');
  const [countryKey, setCountryKey]   = useState('usa');
  const [result, setResult]           = useState<ScoreResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab]     = useState<TabKey>('overview');
  const [delta, setDelta]             = useState<ScoreDelta | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Section refs for scroll-driven navigation
  const sectionRefs: Record<TabKey, React.RefObject<HTMLDivElement>> = {
    overview:     useRef<HTMLDivElement>(null),
    intelligence: useRef<HTMLDivElement>(null),
    tasks:        useRef<HTMLDivElement>(null),
    protection:   useRef<HTMLDivElement>(null),
    strategy:     useRef<HTMLDivElement>(null),
  };
  const heroRef   = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // ── Cinematic global-intelligence loader (plays before the score reveal) ──────
  const [loaderActive, setLoaderActive] = useState(false);
  const [loaderStage, setLoaderStage]   = useState(0);
  const pendingRef        = useRef<{ score: ScoreResult; delta: ScoreDelta | null } | null>(null);
  const loaderIntervalRef = useRef<number | null>(null);
  const loaderTimerRef    = useRef<number | null>(null);
  const loaderCleanupRef  = useRef<(() => void) | null>(null);

  // v40.0 FIX-5: clear isCalculating on unmount so a user who navigates away
  // mid-calculation and returns later doesn't find the button permanently disabled.
  // Also tracks mount state so async handlers don't try to setState after unmount
  // (which React would warn about and which could cause stale UI flashes).
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Tear down ALL in-flight timers and scroll-lock so the 7-second loader
      // sequence doesn't keep firing setState after the user navigated away.
      if (loaderIntervalRef.current) { window.clearInterval(loaderIntervalRef.current); loaderIntervalRef.current = null; }
      if (loaderTimerRef.current)    { window.clearTimeout(loaderTimerRef.current);   loaderTimerRef.current = null; }
      loaderCleanupRef.current?.();
      loaderCleanupRef.current = null;
    };
  }, []);

  // ── Scroll-driven navigation: IntersectionObserver + sticky bar ──────────
  useEffect(() => {
    if (!result) return;

    // Sticky bar appears when hero scrolls above viewport
    const heroEl = heroRef.current;
    if (heroEl) {
      const obs = new IntersectionObserver(
        ([entry]) => setStickyVisible(!entry.isIntersecting),
        { threshold: 0 },
      );
      obs.observe(heroEl);
      return () => obs.disconnect();
    }
  }, [result]);

  useEffect(() => {
    if (!result) return;

    // Track which section is currently in view → update active tab pill
    const observers: IntersectionObserver[] = [];
    const sectionEntries = new Map<TabKey, boolean>();

    const pickActive = () => {
      const order: TabKey[] = ['overview', 'intelligence', 'tasks', 'protection', 'strategy'];
      for (const key of order) {
        if (sectionEntries.get(key)) { setActiveTab(key); return; }
      }
    };

    for (const key of Object.keys(sectionRefs) as TabKey[]) {
      const el = sectionRefs[key].current;
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => { sectionEntries.set(key, entry.isIntersecting); pickActive(); },
        { threshold: 0.15, rootMargin: '-80px 0px -20% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach(o => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const scrollToSection = useCallback((key: TabKey) => {
    setActiveTab(key);
    sectionRefs[key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Select option builders ────────────────────────────────────────────────

  // Industries grouped by cat
  const industryGroups = useMemo<Record<string, SelectOption[]>>(() => {
    const groups: Record<string, SelectOption[]> = {};
    for (const ind of INDUSTRIES) {
      if (!groups[ind.cat]) groups[ind.cat] = [];
      groups[ind.cat].push({ key: ind.key, label: ind.label, icon: ind.icon });
    }
    return groups;
  }, []);

  const industryOptions: SelectOption[] = useMemo(
    () => INDUSTRIES.map((i) => ({ key: i.key, label: i.label, icon: i.icon, cat: i.cat })),
    [],
  );

  // Work types for selected industry
  const workTypeOptions: SelectOption[] = useMemo(() => {
    if (!industryKey) return [];
    const types = WORK_TYPES[industryKey] ?? [];
    return types.map((w) => ({ key: w.key, label: w.label, icon: getRoleIcon(w.label) }));
  }, [industryKey]);

  const experienceOptions: SelectOption[] = EXPERIENCE_LEVELS.map((e) => ({ key: e.key, label: e.label }));

  const countryOptions: SelectOption[] = COUNTRIES.map((c) => ({ key: c.key, label: `${c.flag} ${c.label}` }));

  // ── Calculate ─────────────────────────────────────────────────────────────

  // Commit the stashed score once the cinematic loader finishes.
  const revealPending = () => {
    if (loaderIntervalRef.current) { window.clearInterval(loaderIntervalRef.current); loaderIntervalRef.current = null; }
    if (loaderTimerRef.current) { window.clearTimeout(loaderTimerRef.current); loaderTimerRef.current = null; }
    loaderCleanupRef.current?.();
    loaderCleanupRef.current = null;
    if (!isMountedRef.current) return;
    const p = pendingRef.current;
    pendingRef.current = null;
    setLoaderActive(false);
    if (p) {
      setResult(p.score);
      setDelta(p.delta);
    }
    setActiveTab('overview');
    setStickyVisible(false);
    setIsCalculating(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  // Drive the ~7s, 9-stage cinematic build-up, then reveal. Honors reduced motion.
  const startLoaderSequence = () => {
    const prefersReduced = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Lock background scroll while the full-screen loader is up.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    loaderCleanupRef.current = () => { document.body.style.overflow = prevOverflow; };

    setLoaderStage(0);
    setLoaderActive(true);

    const STAGES = 9; // components 0..8

    if (prefersReduced) {
      // Reduced motion → show the final stage and reveal on the next tick (no wait).
      setLoaderStage(STAGES - 1);
      loaderTimerRef.current = window.setTimeout(revealPending, 0);
      return;
    }

    const STEP = 760; // ms per processing component → ~6.1s + ~0.9s finalize ≈ 7s
    let s = 0;
    loaderIntervalRef.current = window.setInterval(() => {
      s += 1;
      if (s >= STAGES - 1) {
        if (loaderIntervalRef.current) { window.clearInterval(loaderIntervalRef.current); loaderIntervalRef.current = null; }
        setLoaderStage(STAGES - 1);
        loaderTimerRef.current = window.setTimeout(revealPending, 900); // final "synthesizing" beat
      } else {
        setLoaderStage(s);
      }
    }, STEP);
  };

  const handleCalculate = async () => {
    if (!workTypeKey || !industryKey || loaderActive) return;
    setIsCalculating(true);

    const cacheParams = { roleKey: workTypeKey, industry: industryKey, country: countryKey, experience };
    const cached = getCachedRisk(cacheParams);

    // calculateScore() is synchronous & instant; cache hit or fresh, compute now
    // then play the cinematic loader and reveal on completion.
    const score = cached ?? calculateScore(workTypeKey, industryKey, experience, countryKey);
    if (!cached) setCachedRisk(cacheParams, score);

    const breakdown = Object.fromEntries(
      (score.dimensions ?? []).map(dim => [dim.key, dim.score / 100])
    );
    // Record FIRST so the new run becomes history[0]; getScoreDelta compares the
    // current score against history[1] (the genuine previous assessment). Calling
    // it before recordScore made it skip the real previous run and require 3 audits
    // before any delta appeared.
    recordScore({ roleKey: workTypeKey, industryKey, countryKey, experience, score: score.total, timestamp: Date.now(), isGrounded: !cached, breakdown });
    const d = getScoreDelta(workTypeKey, score.total, experience, countryKey);

    pendingRef.current = { score, delta: d };
    startLoaderSequence();
  };

  // Handle industry change: clear work type since options change.
  // v40.0 FIX-9: only clear (and only flag for user feedback) if a workType was
  // actually selected — otherwise the "reset" message is misleading on first
  // industry selection when workType was already empty.
  const handleIndustryChange = (key: string) => {
    setIndustryKey(key);
    if (workTypeKey) {
      // Toast is fired via the existing notification context (provided in App.tsx).
      // If the toast context isn't available (e.g., in a standalone test rig),
      // the no-op fallback below preserves the data clear without crashing.
      try {
        window.dispatchEvent(new CustomEvent('hp.toast', {
          detail: { type: 'info', message: 'Work type cleared — please re-select for the new industry.' }
        }));
      } catch { /* swallow */ }
    }
    setWorkTypeKey('');
  };

  // ── New-analysis reset ────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setResult(null);
    setDelta(null);
    setLoaderActive(false);
    setLoaderStage(0);
    setShowWhatIf(false);
    setShareCopied(false);
    setStickyVisible(false);
    if (loaderIntervalRef.current) { window.clearInterval(loaderIntervalRef.current); loaderIntervalRef.current = null; }
    if (loaderTimerRef.current)    { window.clearTimeout(loaderTimerRef.current);   loaderTimerRef.current = null; }
    loaderCleanupRef.current?.();
    loaderCleanupRef.current = null;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);
  }, []);

  const scoreColor       = result ? getScoreColor(result.total) : 'var(--cyan)';
  const _seededIntel     = workTypeKey && workTypeKey !== '__custom__' ? getCareerIntelligence(workTypeKey) : null;
  const _dynamicResult   = useMemo(() => {
    if (workTypeKey !== '__custom__' || !customRoleTitle || !result) return null;
    const d1 = result.dimensions.find((d) => d.key === 'D1')?.score ?? 50;
    const d6 = result.dimensions.find((d) => d.key === 'D6')?.score ?? 50;
    return generateDynamicRoleIntelligence(customRoleTitle, industryKey, experience, countryKey, d1, d6);
  }, [workTypeKey, customRoleTitle, result, industryKey, experience, countryKey]);
  const intel            = _seededIntel ?? _dynamicResult?.intel ?? null;
  const currentIndustry  = INDUSTRIES.find((i) => i.key === industryKey);
  const catColor         = currentIndustry ? (CAT_COLORS[currentIndustry.cat] ?? 'var(--cyan)') : 'var(--cyan)';
  const synthesis        = result?.inaction_scenario ?? null;

  // ── Share button state ────────────────────────────────────────────────────
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = useCallback(() => {
    if (!result) return;
    const roleLabel    = workTypeOptions.find((o) => o.key === workTypeKey)?.label ?? workTypeKey;
    const industryLabel = industryOptions.find((o) => o.key === industryKey)?.label ?? industryKey;
    const countryLabel  = COUNTRIES.find((c) => c.key === countryKey)?.label ?? countryKey;
    const expLabel      = EXPERIENCE_LEVELS.find((e) => e.key === experience)?.label ?? experience;

    // Build a permalink hash so anyone who opens the URL sees the same inputs.
    const hash = new URLSearchParams({ r: workTypeKey, i: industryKey, e: experience, c: countryKey }).toString();
    const url  = `${window.location.origin}${window.location.pathname}#${hash}`;

    const text = [
      `🤖 Risk Oracle Result`,
      `Role: ${roleLabel} · ${industryLabel}`,
      `Experience: ${expLabel} · Country: ${countryLabel}`,
      `Career Survival Probability: ${riskToSurvival(result.total)}% — ${getSurvivalVerdict(result.total)}`,
      `Preparation Window: ${getPreparationWindow(result.total)}`,
      `Action Deadline: ${getActionDeadline(result.total)}`,
      `\n${url}`,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    }).catch(() => {
      // fallback: open a pre-filled mailto
      window.open(`mailto:?subject=My AI Risk Oracle Score&body=${encodeURIComponent(text)}`);
    });
  }, [result, workTypeKey, industryKey, experience, countryKey, workTypeOptions, industryOptions]);

  // ── What-if slider state ──────────────────────────────────────────────────
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [wiExperience, setWiExperience] = useState(experience);
  const [wiCountry,    setWiCountry]    = useState(countryKey);

  // Sync sliders when main selects change so they start from current values.
  useEffect(() => { setWiExperience(experience); }, [experience]);
  useEffect(() => { setWiCountry(countryKey); },     [countryKey]);

  // Live what-if score — recalculated instantly whenever sliders move.
  const whatIfResult = useMemo(() => {
    if (!result || !workTypeKey || !industryKey) return null;
    if (wiExperience === experience && wiCountry === countryKey) return null; // same as main — nothing to show
    return calculateScoreFn(workTypeKey, industryKey, wiExperience, wiCountry);
  }, [result, workTypeKey, industryKey, wiExperience, wiCountry, experience, countryKey]);

  const wiDelta = whatIfResult ? whatIfResult.total - result!.total : 0;
  const wiColor = wiDelta < 0 ? 'var(--emerald)' : wiDelta > 0 ? 'var(--red)' : 'var(--text-3)';

  // ── On mount: restore inputs from URL hash permalink ─────────────────────
  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const p = new URLSearchParams(hash);
      if (p.get('r') && p.get('i')) {
        const ri = p.get('i')!;
        const rr = p.get('r')!;
        const re = p.get('e') ?? '5-10';
        const rc = p.get('c') ?? 'usa';
        setIndustryKey(ri);
        setWorkTypeKey(rr);
        setExperience(re);
        setCountryKey(rc);
        // Clear the hash so bookmarks don't replay the loader every time.
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Optional advanced profile inputs ──────────────────────────────────────
  const [showAdvanced,    setShowAdvanced]   = useState(false);
  const [salaryRange,     setSalaryRange]    = useState('');
  const [hasManagement,   setHasManagement]  = useState(false);
  const [companyType,     setCompanyType]    = useState('');
  const [techStack,       setTechStack]      = useState('');

  // ── AI Displacement Intelligence Engine derived data ──────────────────────
  const automationTimeline = useMemo(() => {
    if (!workTypeKey) return null;
    if (workTypeKey === '__custom__') return _dynamicResult?.timeline ?? null;
    return getAutomationTimeline(workTypeKey);
  }, [workTypeKey, _dynamicResult]);

  const industryRiskEntry = useMemo(() => {
    const rk = INDUSTRY_TO_RISK_KEY[industryKey];
    return rk ? (industryRiskData[rk] ?? null) : null;
  }, [industryKey]);

  // D7 — Agentic Disruption Potential (supplementary structural signal, not in base formula)
  const d7Score = useMemo(
    () => workTypeKey ? calculateD7(workTypeKey) : 55,
    [workTypeKey],
  );

  const agenticScore = useMemo(() => {
    if (!result || !workTypeKey) return null;
    return computeAgenticExposureScore({
      dimensions: result.dimensions,
      industryKey,
      roleKey: workTypeKey,
      experience,
      countryKey,
      companyType: companyType || undefined,
      d7Score,
    });
  }, [result, industryKey, workTypeKey, experience, countryKey, companyType, d7Score]);

  const trajectory = useMemo(() => {
    if (!result || !workTypeKey) return null;
    return computeTrajectory({
      currentScore: result.total,
      oracleResult: {
        total: result.total,
        dimensions: result.dimensions as OracleDimension[],
      },
      roleKey: workTypeKey,
      experience,
      careerIntelligence: intel ?? undefined,
      d7Score,
    });
  }, [result, workTypeKey, experience, intel, d7Score]);

  const evolutionPath = workTypeKey ? ROLE_EVOLUTION_PATHS[workTypeKey] : undefined;

  // ── Career Survival Probability derived values (placed after trajectory + automationTimeline) ──
  const survivalPct             = result ? riskToSurvival(result.total) : null;
  const survivalVerdict         = result ? getSurvivalVerdict(result.total) : '';
  const survivalVerdictSubtext  = result ? getSurvivalVerdictSubtext(result.total) : '';
  const survivalCurrentPosition = survivalPct != null ? getSurvivalCurrentPosition(survivalPct) : '';
  const survivalFutureOutlook   = trajectory ? getSurvivalFutureOutlook(trajectory.interpretation) : '';
  const preparationWindow       = result ? getPreparationWindow(result.total) : '';
  const actionDeadline          = result ? getActionDeadline(result.total) : '';

  const improvementPotential = useMemo(() => {
    if (!result || !automationTimeline || !trajectory) return null;
    const growthPerYear = Math.max(1, trajectory.growthPerYear);
    const base2028 = automationTimeline.displacementByYear[2028] * 100;
    const base2030 = automationTimeline.displacementByYear[2030] * 100;
    const noAction2028 = Math.min(95, base2028 + growthPerYear * 2);
    const noAction2030 = Math.min(95, base2030 + growthPerYear * 4);
    const planFull2028 = Math.round(noAction2028 * 0.53);
    const planFull2030 = Math.round(noAction2030 * 0.48);
    const gain2028 = Math.max(0, riskToSurvival(planFull2028) - riskToSurvival(Math.round(noAction2028)));
    const gain2030 = Math.max(0, riskToSurvival(planFull2030) - riskToSurvival(Math.round(noAction2030)));
    const lo = Math.min(gain2028, gain2030), hi = Math.max(gain2028, gain2030);
    return `+${lo}% to +${hi}%`;
  }, [result, automationTimeline, trajectory]);

  const roleLabel     = workTypeKey === '__custom__' ? (customRoleTitle || 'Custom Role') : (workTypeOptions.find((o) => o.key === workTypeKey)?.label ?? workTypeKey);

  // Phase 1: Single master intelligence engine — all downstream components consume this
  const masterIntel = useMemo(
    () => result ? buildMasterIntelligence(result, countryKey, experience) : null,
    [result, countryKey, experience],
  );

  // Phase 11: Single narrative state — all text-generating sections consume this
  const narrative = useMemo(
    () => (masterIntel && result) ? buildNarrativeState(masterIntel, result) : null,
    [masterIntel, result],
  );

  // Phase 9: Country intelligence — derived once, passed to country panel
  const countryIntel = useMemo(
    () => getCountryIntelligence(countryKey),
    [countryKey],
  );

  // Phase 5: Role-specific narrative (for "YOUR ROLE IN THE AI ERA" block)
  const roleNarrative = useMemo(
    () => workTypeKey ? getRoleNarrative(workTypeKey) : null,
    [workTypeKey],
  );

  const careerGrade      = survivalPct != null ? getCareerProtectionGrade(survivalPct) : null;
  const prepWindowMonths = result ? getPreparationWindowMonths(result.total) : null;
  const survivalWindow   = result ? getSurvivalWindow(result.total) : null;
  const scoreExplanation = result ? getPersonalizedScoreExplanation(result.total, experience, roleLabel) : null;

  // GAP #1 FIX: Generate guaranteed-declining month-by-month trajectory anchored to result.total.
  // Never uses trajectory.years directly (which can be flat for slow-growth roles).
  // Uses growthPerYear from trajectory (or fallback 2.5) to build a monotonic decline.
  const consequencesTimeline = useMemo(() => {
    if (!result) return null;
    const growthPerYear = trajectory ? Math.max(1.5, trajectory.growthPerYear) : 2.5;
    const startRisk = result.total;
    // Build 6 points: Today, Month 12, 24, 36, 48, 60
    return [0, 12, 24, 36, 48, 60].map((monthOffset, i) => {
      const riskAtMonth = Math.min(97, startRisk + (growthPerYear * monthOffset) / 12);
      const survPct = riskToSurvival(Math.round(riskAtMonth));
      const riskLevel = riskAtMonth < 30 ? 'Stable' : riskAtMonth < 45 ? 'Minimal pressure' : riskAtMonth < 60 ? 'Competition increases' : riskAtMonth < 75 ? 'Salary pressure' : 'High displacement';
      return {
        label: i === 0 ? 'Today' : `Month ${monthOffset}`,
        survPct,
        riskPct: Math.round(riskAtMonth),
        status: riskLevel,
        isToday: i === 0,
      };
    });
  }, [result, trajectory]);

  // GAP #6 FIX: Role-specific, personalized narrative — not generic boilerplate.
  const biggestThreat = useMemo(() => {
    if (!result) return null;
    const d1 = result.dimensions.find(d => d.key === 'D1')?.score ?? 50;
    const d2 = result.dimensions.find(d => d.key === 'D2')?.score ?? 50;
    const d3 = result.dimensions.find(d => d.key === 'D3')?.score ?? 50;
    const rl = roleLabel || 'professional';
    if (d2 >= 70) return `Your risk is not coming from full replacement — it's that AI tools now let one ${rl} do the work of three. Companies are quietly reducing headcount by expanding individual output rather than waiting for full automation.`;
    if (d1 >= 65) return `The core pressure on ${rl}s is task-layer erosion. The parts of your job that feel routine — the steady, predictable work — are the first to be absorbed. What remains requires more judgment and context than most people realize they're already providing.`;
    if (d3 <= 30) return `Your role has fewer uniquely-human anchors than comparable roles. When organizations run cost optimization exercises, positions with this profile are reviewed first — not because you're easily replaced, but because the case for your uniqueness is harder to make internally.`;
    return `The most likely threat isn't dramatic — it's that as AI restructures roles adjacent to yours, hiring budgets tighten and headcount pressure spreads inward. ${rl}s are rarely displaced directly; they're squeezed out through attrition as teams stop backfilling vacancies.`;
  }, [result, roleLabel]);

  // GAP #8 FIX: Ranked threat list — top 3 visible, rest collapsed.
  const rankedThreats = useMemo(() => {
    if (!result) return [];
    const d1 = result.dimensions.find(d => d.key === 'D1')?.score ?? 50;
    const d2 = result.dimensions.find(d => d.key === 'D2')?.score ?? 50;
    const d5 = result.dimensions.find(d => d.key === 'D5')?.score ?? 50;
    const threats = [
      { name: 'Task automation by AI tools', score: d1, action: 'Build AI collaboration skills — direct tools rather than compete with them' },
      { name: 'Market saturation & reduced demand', score: Math.round(d2 * 0.65), action: 'Build public portfolio and thought leadership to differentiate from the field' },
      { name: 'Offshoring & remote hiring pressure', score: Math.round(d5 * 0.7), action: 'Develop domain depth that requires physical proximity, stakeholder relationships, or cultural context' },
      { name: 'Economic downturn hiring freezes', score: Math.round((d1 + d2) / 2 * 0.5), action: 'Build a cash runway and secondary income stream before downturns arrive' },
      { name: 'Process automation (pre-full AI)', score: Math.round(d1 * 0.8), action: 'Own the workflow design layer — systems and processes that sit above individual task execution' },
    ].sort((a, b) => b.score - a.score);
    return threats;
  }, [result]);

  // GAP #14 FIX: Single primary recommendation derived from the highest-scoring threat.
  const primaryRecommendation = useMemo(() => {
    if (!result) return null;
    const d1 = result.dimensions.find(d => d.key === 'D1')?.score ?? 50;
    const d3 = result.dimensions.find(d => d.key === 'D3')?.score ?? 50;
    const d4 = result.dimensions.find(d => d.key === 'D4')?.score ?? 50;
    const rl = roleLabel || 'your role';
    if (d1 >= 65) return `Build AI collaboration expertise now — become the ${rl} who directs AI tools, not the one who competes with them.`;
    if (d3 <= 35) return `Deepen your uniquely-human skills: stakeholder trust, cross-functional judgment, and organizational context that AI cannot replicate.`;
    if (d4 >= 60) return `Leverage your experience advantage — move into roles where institutional knowledge and track record are explicit selection criteria.`;
    if (result.total >= 60) return `Act before conditions change — your current protection window is meaningful, but inaction compounds risk faster than most people expect.`;
    return `Stay ahead by monitoring AI adoption in your sector — you have structural protection, but early positioning in the next wave matters.`;
  }, [result, roleLabel]);

  const personalBlindSpots = useMemo(() => {
    if (!result) return [];
    const d1 = result.dimensions.find(d => d.key === 'D1')?.score ?? 50;
    const d2 = result.dimensions.find(d => d.key === 'D2')?.score ?? 50;
    const d4 = result.dimensions.find(d => d.key === 'D4')?.score ?? 50;
    const spots: string[] = [];
    if (d2 >= 60 && d1 < 60)
      spots.push(`Your AI exposure score looks manageable, but the real pressure is coming from productivity amplification — when one ${roleLabel || 'professional'} can do the work of three with AI tools, companies stop hiring the other two.`);
    if (d4 < 40 && (experience === '0-2' || experience === '2-5'))
      spots.push('Early-career in this field puts you in the highest-risk task band — your current work closely overlaps with what AI handles first. The window to build differentiated judgment is shorter than it appears.');
    if (d1 >= 65)
      spots.push('The tasks that feel most normal and routine are often the first to be absorbed. The cognitive work that feels hard and unusual is actually your strongest protection — lean into it.');
    if (d2 < 40)
      spots.push('Your industry is still early in AI adoption, which feels like safety — but adoption typically accelerates non-linearly after 30% penetration. You likely have 18–36 months before conditions change materially.');
    if (spots.length === 0)
      spots.push('Your current position is structurally sound, but the hidden risk is complacency — professionals who plateau on current capabilities for 18+ months often find the gap has widened faster than expected when they next enter the market.');
    return spots.slice(0, 2);
  }, [result, roleLabel, experience]);

  const industryLabel = industryOptions.find((o) => o.key === industryKey)?.label ?? industryKey;

  const TABS: { key: TabKey; label: string; chapter: string; question: string }[] = [
    { key: 'overview',     label: 'Threat Analysis',   chapter: '01', question: 'Why did you receive this score?' },
    { key: 'intelligence', label: 'AI Timeline',       chapter: '02', question: 'What does the AI timeline look like for your role?' },
    { key: 'tasks',        label: 'Task Exposure',     chapter: '03', question: 'What specific work is AI already doing in your field?' },
    { key: 'protection',   label: 'Your Advantages',  chapter: '04', question: 'What still protects you — and why?' },
    { key: 'strategy',     label: 'Action Plan',       chapter: '05', question: 'What should you do, in what order?' },
  ];

  return (
    <div className="page-wrap" style={{ fontFamily: 'var(--font-sans)' }}>
      {loaderActive && (
        <NeuralSphereLoader
          stage={loaderStage}
          roleLabel={workTypeOptions.find((o) => o.key === workTypeKey)?.label}
          industryLabel={industryOptions.find((o) => o.key === industryKey)?.label}
          countryLabel={COUNTRIES.find((c) => c.key === countryKey)?.label}
        />
      )}
      <div className="container" style={{ maxWidth: 1100 }}>

      {/* ── Input Form ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        marginBottom: '24px',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--cyan)' }}>
            RISK ORACLE
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            6-dimension deterministic AI displacement analysis · No company data required
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-3)' }}>INDUSTRY</label>
            <PremiumSelect
              options={industryOptions}
              groups={industryGroups}
              value={industryKey}
              onChange={handleIndustryChange}
              placeholder="Select your industry"
            />
          </div>

          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-3)' }}>YOUR ROLE</label>
            <RoleCombobox
              options={workTypeOptions}
              value={workTypeKey}
              customTitle={customRoleTitle}
              onChange={(key, title) => {
                setWorkTypeKey(key);
                if (title !== undefined) setCustomRoleTitle(title);
              }}
              placeholder={industryKey ? 'Search or type any role...' : 'Select industry first'}
              disabled={!industryKey}
            />
          </div>

          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-3)' }}>EXPERIENCE</label>
            <PremiumSelect
              options={experienceOptions}
              value={experience}
              onChange={setExperience}
              placeholder="Years of experience"
            />
          </div>

          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-3)' }}>COUNTRY</label>
            <PremiumSelect
              options={countryOptions}
              value={countryKey}
              onChange={setCountryKey}
              placeholder="Select country"
            />
          </div>
        </div>

        {/* ── Advanced Profile (optional) ─────────────────────────────── */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '16px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            aria-expanded={showAdvanced ? 'true' : 'false'}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
              border: 'none', cursor: 'pointer', color: 'var(--text-3)',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.07em' }}>
              ADVANCED PROFILE (OPTIONAL) — personalizes AI wave & action plan
            </span>
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showAdvanced && (
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="label-xs" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-3)' }}>SALARY RANGE</label>
                  <select value={salaryRange} onChange={e => setSalaryRange(e.target.value)}
                    aria-label="Salary range"
                    title="Salary range"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', fontSize: '0.75rem' }}>
                    <option value="">Not specified</option>
                    <option value="<50k">&lt;$50k</option>
                    <option value="50-100k">$50k–$100k</option>
                    <option value="100-200k">$100k–$200k</option>
                    <option value="200k+">$200k+</option>
                  </select>
                </div>
                <div>
                  <label className="label-xs" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-3)' }}>COMPANY TYPE</label>
                  <select value={companyType} onChange={e => setCompanyType(e.target.value)}
                    aria-label="Company type"
                    title="Company type"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', fontSize: '0.75rem' }}>
                    <option value="">Not specified</option>
                    <option value="startup">Startup</option>
                    <option value="scaleup">Scaleup</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="government">Government</option>
                    <option value="freelance">Freelance / Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="label-xs" style={{ display: 'block', marginBottom: '6px', color: 'var(--text-3)' }}>TECH STACK (optional)</label>
                  <input
                    type="text" value={techStack} onChange={e => setTechStack(e.target.value.slice(0, 120))}
                    placeholder="e.g. React, Python, AWS"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', fontSize: '0.75rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '18px' }}>
                  <input type="checkbox" id="mgmt-toggle" checked={hasManagement} onChange={e => setHasManagement(e.target.checked)} />
                  <label htmlFor="mgmt-toggle" style={{ fontSize: '0.75rem', color: 'var(--text-2)', cursor: 'pointer' }}>
                    Management responsibility
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          disabled={!workTypeKey || !industryKey || isCalculating}
          aria-busy={isCalculating ? 'true' : 'false'}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--cyan)',
            background: isCalculating
              ? 'rgba(0,245,255,0.05)'
              : 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(124,58,237,0.15))',
            color: 'var(--cyan)',
            fontWeight: 800,
            fontSize: '0.95rem',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            cursor: !workTypeKey || !industryKey || isCalculating ? 'not-allowed' : 'pointer',
            opacity: !workTypeKey || !industryKey ? 0.5 : 1,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          {isCalculating ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
              COMPUTING ORACLE DIMENSIONS...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              RUN RISK ORACLE
            </>
          )}
        </button>
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* ── FIXED STICKY NAVIGATION BAR (appears after hero scrolls away) ── */}
            <AnimatePresence>
              {stickyVisible && (
                <motion.div
                  initial={{ opacity: 0, y: -52 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -52 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    background: 'rgba(9,11,19,0.95)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${scoreColor}25`,
                    boxShadow: `0 2px 24px rgba(0,0,0,0.7)`,
                  }}
                >
                  <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '12px' }}>
                    {/* Score pill — compact, shows only survival + grade */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px 8px 0', borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 900, color: scoreColor, fontFamily: 'var(--font-mono)' }}>{survivalPct}%</span>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>survival</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 900, color: careerGrade === 'A' ? 'var(--emerald)' : careerGrade === 'B' ? 'var(--cyan)' : careerGrade === 'C' ? 'var(--amber)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>Grade {careerGrade}</span>
                    </div>
                    {/* Primary recommendation — GAP #14 */}
                    {primaryRecommendation && (
                      <div style={{ flex: 1, fontSize: '0.68rem', color: 'var(--text-2)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ↳ {primaryRecommendation}
                      </div>
                    )}
                    {/* Chapter nav pills */}
                    <div style={{ display: 'flex', gap: '0', flexShrink: 0, overflowX: 'auto' }}>
                      {TABS.map((tab) => (
                        <button type="button" key={tab.key} onClick={() => scrollToSection(tab.key)} style={{ padding: '10px 11px', border: 'none', background: 'transparent', color: activeTab === tab.key ? scoreColor : 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.6rem', fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap', borderBottom: activeTab === tab.key ? `2px solid ${scoreColor}` : '2px solid transparent' }}>
                          {tab.chapter}
                        </button>
                      ))}
                    </div>
                    <button type="button" aria-label="Start a new audit" onClick={handleReset} style={{ padding: '5px 9px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.58rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer', flexShrink: 0 }}>NEW</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── CHAPTER 0: HERO — Current Position ────────────────────────── */}
            <div ref={heroRef}>
              {/* ── GAP #12: Quick-read summary at very top ─────────────────── */}
              {primaryRecommendation && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ marginBottom: '8px', padding: '12px 20px', borderRadius: 'var(--radius-lg)', background: `${scoreColor}10`, border: `1px solid ${scoreColor}28`, display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <span style={{ fontSize: '0.55rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', flexShrink: 0 }}>YOUR #1 ACTION</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{primaryRecommendation}</span>
                  <button type="button" onClick={() => scrollToSection('strategy')} style={{ marginLeft: 'auto', flexShrink: 0, padding: '5px 12px', borderRadius: '5px', border: `1px solid ${scoreColor}40`, background: 'transparent', color: scoreColor, fontSize: '0.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer', whiteSpace: 'nowrap' }}>SEE PLAN →</button>
                </motion.div>
              )}

              <div style={{
                padding: '40px 36px',
                background: `linear-gradient(135deg, rgba(9,11,19,0.98) 0%, ${scoreColor}06 50%, rgba(9,11,19,0.98) 100%)`,
                border: `1px solid ${scoreColor}25`,
                borderRadius: 'var(--radius-xl)',
                marginBottom: '2px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Radial glow behind ring */}
                <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${scoreColor}10 0%, transparent 70%)`, pointerEvents: 'none' }} />

                {/* Chapter label */}
                <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '24px' }}>
                  HUMANPROOF CAREER INTELLIGENCE REPORT · {roleLabel.toUpperCase()}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '40px' }}>
                  {/* Score ring — large hero version */}
                  <div
                    role="img"
                    aria-label={`Career Survival: ${survivalPct}% — ${survivalVerdict}`}
                    style={{ position: 'relative', flexShrink: 0, width: 'clamp(120px,18vw,160px)', height: 'clamp(120px,18vw,160px)' }}
                  >
                    <svg width="100%" height="100%" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle
                        cx="80" cy="80" r="70" fill="none" stroke={scoreColor} strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${(result.total / 100) * 439.8} 439.8`}
                        strokeDashoffset="109.9"
                        style={{ filter: `drop-shadow(0 0 12px ${scoreColor}88)`, transition: 'stroke-dasharray 1.2s ease' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <span style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: scoreColor, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{survivalPct}%</span>
                      <span style={{ fontSize: '0.44rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.3 }}>CAREER SURVIVAL{'\n'}PROBABILITY</span>
                    </div>
                  </div>

                  {/* Hero right column */}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    {/* Verdict */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '6px', background: `${scoreColor}15`, border: `1px solid ${scoreColor}33`, marginBottom: '12px' }}>
                      <Shield size={14} style={{ color: scoreColor }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>{survivalVerdict.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '16px' }}>{survivalVerdictSubtext}</div>

                    {/* Role + category */}
                    {roleLabel && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 700 }}>{roleLabel}</span>
                        <RoleCategoryBadge
                          category={intel?.roleCategory ?? (workTypeKey === '__custom__' ? 'emerging_unknown' : undefined)}
                          isDynamic={workTypeKey === '__custom__'}
                        />
                        {currentIndustry && (
                          <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '4px', background: `${catColor}15`, border: `1px solid ${catColor}30`, color: catColor, fontWeight: 700 }}>{currentIndustry.cat}</span>
                        )}
                      </div>
                    )}

                    {/* 5 hero metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                      {[
                        { label: 'AI Risk', value: String(result.total), sub: masterIntel ? `${masterIntel.riskRange[0]}–${masterIntel.riskRange[1]} range` : '0–100', color: scoreColor },
                        { label: 'Grade', value: careerGrade ?? '—', sub: 'A–F protection', color: careerGrade === 'A' ? 'var(--emerald)' : careerGrade === 'B' ? 'var(--cyan)' : careerGrade === 'C' ? 'var(--amber)' : 'var(--red)' },
                        { label: 'Prep Window', value: prepWindowMonths === 0 ? 'Now' : prepWindowMonths ? `${prepWindowMonths}mo` : '—', sub: getPreparationWindow(result.total), color: 'var(--text)' },
                        { label: 'Exposure', value: masterIntel ? `${masterIntel.exposureScore}` : '—', sub: masterIntel ? `${masterIntel.exposureRange[0]}–${masterIntel.exposureRange[1]} range` : 'task overlap score', color: masterIntel && masterIntel.exposureScore >= 65 ? 'var(--red)' : masterIntel && masterIntel.exposureScore >= 45 ? 'var(--amber)' : 'var(--emerald)' },
                        { label: 'Protection', value: masterIntel ? `${masterIntel.protectionScore}` : '—', sub: masterIntel ? `${masterIntel.protectionRange[0]}–${masterIntel.protectionRange[1]} range` : 'shield score', color: masterIntel && masterIntel.protectionScore >= 60 ? 'var(--emerald)' : masterIntel && masterIntel.protectionScore >= 40 ? 'var(--cyan)' : 'var(--amber)' },
                      ].map(({ label, value, sub, color }) => (
                        <div key={label} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ fontSize: 'clamp(0.9rem,2vw,1.2rem)', fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{value}</div>
                          <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginTop: '3px' }}>{label.toUpperCase()}</div>
                          {sub && <div style={{ fontSize: '0.48rem', color: 'var(--text-3)', marginTop: '2px', lineHeight: 1.3 }}>{sub}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Confidence badge */}
                    {(() => {
                      const conf   = result.confidence;
                      const dq     = result.dataQuality;
                      const pct    = result.content_confidence ?? (conf === 'HIGH' ? 88 : conf === 'MODERATE' ? 68 : 48);
                      const cColor = conf === 'HIGH' ? 'var(--emerald)' : conf === 'MODERATE' ? 'var(--amber)' : 'var(--red)';
                      const cLabel = conf === 'HIGH' ? 'Strong confidence' : conf === 'MODERATE' ? 'Moderate confidence' : 'Limited data';
                      const cDesc  = dq === 'DQ_FULL' ? 'Detailed role data' : dq === 'DQ_PARTIAL' ? 'Partial data — some estimates used' : 'Estimated — limited role data';
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', marginTop: '12px', background: `${cColor}08`, border: `1px solid ${cColor}20` }}>
                          <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: cColor, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: cColor, fontFamily: 'var(--font-mono)' }}>{cLabel}</span>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{cDesc}</span>
                          {delta && Math.abs(delta.delta) >= 1 && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: delta.delta > 0 ? 'var(--red)' : 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              {delta.delta > 0 ? `▲ +${Math.abs(delta.delta).toFixed(1)}` : `▼ ${Math.abs(delta.delta).toFixed(1)}`} vs last audit
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action buttons — top right */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'flex-start', flexShrink: 0 }}>
                    <button onClick={handleReset} aria-label="New analysis" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                      <RefreshCw size={12} /> NEW
                    </button>
                    <button onClick={handleShare} aria-label="Share result" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: shareCopied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', color: shareCopied ? 'var(--emerald)' : 'var(--text-2)', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                      {shareCopied ? <><Check size={12} /> COPIED</> : <><Share2 size={12} /> SHARE</>}
                    </button>
                  </div>
                </div>

                {/* Personalized score explanation */}
                {scoreExplanation && (
                  <div style={{ marginTop: '24px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${scoreColor}20`, borderLeft: `3px solid ${scoreColor}` }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{scoreExplanation}</p>
                  </div>
                )}

                {/* Profile context chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
                  {roleLabel && <span style={{ fontSize: '0.62rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', fontWeight: 600 }}>{roleLabel}</span>}
                  {countryKey && COUNTRIES.find(c => c.key === countryKey) && <span style={{ fontSize: '0.62rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', fontWeight: 600 }}>{COUNTRIES.find(c => c.key === countryKey)?.label}</span>}
                  {experience && <span style={{ fontSize: '0.62rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', fontWeight: 600 }}>{experience} yrs exp</span>}
                  {industryLabel && <span style={{ fontSize: '0.62rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', fontWeight: 600 }}>{industryLabel}</span>}
                </div>

                {/* Current Risk Metrics pills */}
                <CurrentRiskMetrics
                  d1Score={result.dimensions.find(d => d.key === 'D1')?.score ?? 50}
                  industryRisk={industryRiskEntry}
                  timeline={automationTimeline}
                  scoreColor={scoreColor}
                />

                {/* Peer comparison — riskScore passed for score-anchored computed peers (Phase 8) */}
                {survivalPct != null && (
                  <PeerSurvivalCard
                    roleKey={workTypeKey ?? ''}
                    roleLabel={roleLabel}
                    survivalPct={survivalPct}
                    result={result}
                    countryKey={countryKey}
                    experience={experience}
                    riskScore={result.total}
                  />
                )}
              </div>

              {/* ── Survival Window strip ──────────────────────────────────── */}
              {survivalWindow && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  style={{ marginBottom: '2px', padding: '20px 28px', borderRadius: 'var(--radius-lg)', background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)' }}
                >
                  <div style={{ fontSize: '0.52rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '14px' }}>HOW LONG YOU HAVE TO PREPARE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                    {[
                      { label: 'Best Case', value: survivalWindow.best === 0 ? 'Act Now' : `${survivalWindow.best}mo`, color: 'var(--emerald)' },
                      { label: 'Most Likely', value: survivalWindow.likely === 0 ? 'Act Now' : `${survivalWindow.likely}mo`, color: 'var(--cyan)' },
                      { label: 'Worst Case', value: survivalWindow.worst === 0 ? 'Act Now' : `${survivalWindow.worst}mo`, color: survivalWindow.worst <= 36 ? 'var(--red)' : 'var(--amber)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>{label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '10px' }}>
                    Confidence: <span style={{ color: survivalWindow.confidence === 'High' ? 'var(--emerald)' : survivalWindow.confidence === 'Medium' ? 'var(--amber)' : 'var(--red)', fontWeight: 700 }}>{survivalWindow.confidence}</span>
                    <span style={{ marginLeft: 8 }}>— based on your score ±18 points scenario spread</span>
                  </div>
                </motion.div>
              )}

              {/* ── IF YOU STAY / IF YOU ACT ──────────────────────────────── */}
              {trajectory && (() => {
                const growthPerYear   = Math.max(1, trajectory.growthPerYear);
                const riskNoAction60  = Math.min(95, result.total + growthPerYear * 5);
                const riskWithPlan60  = Math.min(95, result.total + growthPerYear * 5 * 0.6);
                const sNow            = riskToSurvival(result.total);
                const sNoAction60     = riskToSurvival(Math.round(riskNoAction60));
                const sPlan60         = riskToSurvival(Math.round(riskWithPlan60));
                const decline         = Math.max(0, sNow - sNoAction60);
                const gain            = Math.max(0, sPlan60 - sNow);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ padding: '18px 20px', borderRadius: 'var(--radius-lg)', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)', borderTop: '3px solid var(--red)' }}>
                      <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '10px' }}>IF YOU STAY ON YOUR CURRENT PATH</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div><div style={{ fontSize: '0.5rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>NOW</div><div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{sNow}%</div></div>
                        <div style={{ color: 'var(--text-3)', fontSize: '1.2rem' }}>→</div>
                        <div><div style={{ fontSize: '0.5rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>MONTH 60</div><div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{sNoAction60}%</div></div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--red)', fontWeight: 700 }}>Expected Survival Decline: −{decline}%</div>
                    </div>
                    <div style={{ padding: '18px 20px', borderRadius: 'var(--radius-lg)', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)', borderTop: '3px solid var(--emerald)' }}>
                      <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '10px' }}>IF YOU FOLLOW THE RECOMMENDED PLAN</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div><div style={{ fontSize: '0.5rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>NOW</div><div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{sNow}%</div></div>
                        <div style={{ color: 'var(--text-3)', fontSize: '1.2rem' }}>→</div>
                        <div><div style={{ fontSize: '0.5rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>MONTH 60</div><div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{sPlan60}%</div></div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--emerald)', fontWeight: 700 }}>Potential Survival Improvement: +{gain}%</div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 5-Year Trajectory Timeline ─────────────────────────────── */}
              {consequencesTimeline && (
                <div style={{ marginBottom: '2px', padding: '20px 24px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '16px' }}>YOUR 5-YEAR CAREER TRAJECTORY (NO ACTION)</div>
                  <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
                    {consequencesTimeline.map((pt, i) => {
                      const ptColor = pt.survPct >= 70 ? 'var(--emerald)' : pt.survPct >= 50 ? 'var(--cyan)' : pt.survPct >= 35 ? 'var(--amber)' : 'var(--red)';
                      const isLast  = i === consequencesTimeline.length - 1;
                      return (
                        <div key={pt.label} style={{ flex: '1 1 0', minWidth: '80px', textAlign: 'center', position: 'relative' }}>
                          {!isLast && <div style={{ position: 'absolute', top: '14px', left: '50%', right: '-50%', height: '2px', background: 'rgba(255,255,255,0.08)', zIndex: 0 }} />}
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ptColor, margin: '9px auto 0', position: 'relative', zIndex: 1, boxShadow: `0 0 6px ${ptColor}88` }} />
                          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: ptColor, fontFamily: 'var(--font-mono)', marginTop: '6px' }}>{pt.survPct}%</div>
                          <div style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{pt.label}</div>
                          <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', marginTop: '3px', lineHeight: 1.3, padding: '0 4px' }}>{pt.status}</div>
                        </div>
                      );
                    })}
                  </div>
                  {result?.inaction_scenario && (
                    <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                      {result.inaction_scenario}
                    </div>
                  )}
                </div>
              )}

              {/* ── What-if sensitivity panel ────────────────────────────────── */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '2px', overflow: 'hidden' }}>
                <button onClick={() => setShowWhatIf(v => !v)} aria-expanded={showWhatIf} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SlidersHorizontal size={14} style={{ color: 'var(--cyan)' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'var(--cyan)' }}>WHAT-IF SENSITIVITY</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>— explore how experience or country changes your risk</span>
                  </div>
                  {showWhatIf ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showWhatIf && (
                  <div id="what-if-panel" style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '8px' }}>EXPERIENCE</div>
                        <div role="radiogroup" aria-label="What-if experience level" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {EXPERIENCE_LEVELS.map((lvl) => (
                            <button key={lvl.key} role="radio" aria-checked={wiExperience === lvl.key} onClick={() => setWiExperience(lvl.key)} style={{ padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, background: wiExperience === lvl.key ? 'rgba(0,245,255,0.18)' : 'rgba(255,255,255,0.05)', color: wiExperience === lvl.key ? 'var(--cyan)' : 'var(--text-3)', outline: wiExperience === lvl.key ? '1px solid var(--cyan)' : 'none', transition: 'all 0.15s' }}>{lvl.key}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: '1 1 200px' }}>
                        <label className="label-xs" style={{ color: 'var(--text-3)', display: 'block', marginBottom: '8px' }}>COUNTRY</label>
                        <PremiumSelect options={countryOptions} value={wiCountry} onChange={setWiCountry} placeholder="Select country" />
                      </div>
                      <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: '120px' }}>
                        {whatIfResult ? (
                          <div style={{ padding: '12px 20px', borderRadius: '10px', background: `${getScoreColor(whatIfResult.total)}12`, border: `1px solid ${getScoreColor(whatIfResult.total)}30` }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>WHAT-IF SCORE</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: getScoreColor(whatIfResult.total), lineHeight: 1 }}>{whatIfResult.total}</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: wiColor, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{wiDelta > 0 ? `▲ +${wiDelta}` : wiDelta < 0 ? `▼ ${wiDelta}` : '— no change'}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>{getVerdict(whatIfResult.total)}</div>
                          </div>
                        ) : (
                          <div style={{ padding: '12px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>Adjust sliders<br />to compare</div>
                        )}
                      </div>
                    </div>
                    {whatIfResult && (
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '12px' }}>DIMENSION IMPACT</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {whatIfResult.dimensions.map((wd) => {
                            const orig = result!.dimensions.find((d) => d.key === wd.key);
                            const diff = wd.score - (orig?.score ?? wd.score);
                            if (Math.abs(diff) < 1) return null;
                            const dc = getScoreColor(wd.score);
                            return (
                              <div key={wd.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem' }}>
                                <span style={{ width: 24, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: '0.65rem', fontWeight: 700 }}>{wd.key}</span>
                                <span style={{ flex: 1, color: 'var(--text-2)' }}>{DIM_INFO[wd.key]?.label ?? wd.label}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: dc, fontWeight: 700, minWidth: 28, textAlign: 'right' }}>{wd.score}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: diff < 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700, minWidth: 36, textAlign: 'right', fontSize: '0.7rem' }}>{diff > 0 ? `+${diff}` : diff}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>{/* end heroRef */}

            {/* ── Phase 9: YOUR MARKET CONTEXT — Country Intelligence Panel ── */}
            {countryIntel && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ margin: '0 0 2px', padding: '20px 24px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div style={{ fontSize: '0.48rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '12px' }}>
                  YOUR MARKET CONTEXT — {(COUNTRIES.find(c => c.key === countryKey)?.label ?? countryKey).toUpperCase()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'HIRING DEMAND', value: countryIntel.hiringDemandLabel, color: countryIntel.hiringDemandColor },
                    { label: 'AI ADOPTION SPEED', value: countryIntel.aiAdoptionSpeed, color: countryIntel.aiAdoptionColor },
                    { label: 'OFFSHORING PRESSURE', value: countryIntel.offshoringPressure, color: countryIntel.offshoringColor },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '8px 12px', borderRadius: '8px', background: `${color}08`, border: `1px solid ${color}20` }}>
                      <div style={{ fontSize: '0.48rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
                    </div>
                  ))}
                  <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.48rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', marginBottom: '3px' }}>LOCAL OPPORTUNITY</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{countryIntel.localOpportunity}</div>
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.48rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', marginBottom: '3px' }}>SALARY CONTEXT</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{countryIntel.salaryContext}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                FIX #3 — EXECUTIVE SUMMARY immediately after hero
                "Your career in 60 seconds" — 6 cards max, no charts
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              style={{ margin: '0 0 0', padding: '24px 28px', background: 'rgba(255,255,255,0.015)', borderBottom: `1px solid ${scoreColor}18` }}
            >
              <div style={{ fontSize: '0.48rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '14px' }}>
                YOUR CAREER IN 60 SECONDS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                {[
                  {
                    icon: '📍',
                    label: 'Current Position',
                    value: survivalVerdict,
                    sub: `${roleLabel} · ${experience} yrs`,
                    color: scoreColor,
                  },
                  {
                    icon: '⚡',
                    label: 'Biggest Threat',
                    value: (() => {
                      const d1 = result.dimensions.find(d => d.key === 'D1')?.score ?? 50;
                      const d2 = result.dimensions.find(d => d.key === 'D2')?.score ?? 50;
                      if (d1 >= 65) return 'Task automation';
                      if (d2 >= 55) return 'Market saturation';
                      return 'Sector contagion';
                    })(),
                    sub: rankedThreats[0]?.name ?? 'See threat analysis',
                    color: 'var(--red)',
                  },
                  {
                    icon: '🛡',
                    label: 'Strongest Advantage',
                    value: (() => {
                      const d3 = result.dimensions.find(d => d.key === 'D3')?.score ?? 50;
                      const d4 = result.dimensions.find(d => d.key === 'D4')?.score ?? 50;
                      if (d3 >= 65) return 'Human skills';
                      if (d4 >= 60) return 'Experience depth';
                      return 'Role structure';
                    })(),
                    sub: 'Your primary protection',
                    color: 'var(--emerald)',
                  },
                  {
                    icon: '⏱',
                    label: 'Time Horizon',
                    value: prepWindowMonths === 0 ? 'Act Now' : prepWindowMonths ? `${prepWindowMonths}mo` : `${survivalWindow?.likely ?? 60}mo`,
                    sub: prepWindowMonths === 0 ? 'Window is closing' : 'to take meaningful action',
                    color: prepWindowMonths === 0 ? 'var(--red)' : prepWindowMonths && prepWindowMonths <= 18 ? 'var(--amber)' : 'var(--cyan)',
                  },
                  {
                    icon: '🎯',
                    label: 'Top Action',
                    value: 'See Plan →',
                    sub: primaryRecommendation ?? 'Chapter 05 has your full plan',
                    color: scoreColor,
                    onClick: () => scrollToSection('strategy'),
                  },
                  {
                    icon: '📊',
                    label: 'Expected Outcome',
                    value: (() => {
                      const sNow = riskToSurvival(result.total);
                      const growth = trajectory ? Math.max(1.5, trajectory.growthPerYear) : 2.5;
                      const sAct = riskToSurvival(Math.round(Math.min(95, result.total + growth * 5 * 0.45)));
                      return `${sNow}% → ${sAct}%`;
                    })(),
                    sub: 'Survival if you follow the plan',
                    color: 'var(--emerald)',
                  },
                ].map(({ icon, label, value, sub, color, onClick }) => (
                  <div
                    key={label}
                    onClick={onClick}
                    style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
                  >
                    <div style={{ fontSize: '0.95rem', marginBottom: '5px' }}>{icon}</div>
                    <div style={{ fontSize: '0.48rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '4px' }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginBottom: '4px' }}>{value}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── SCROLL-ANCHOR NAV (inline sticky) ────────────────────────── */}
            <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(9,11,19,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${scoreColor}20` }}>
              <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
                {TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.key}
                    onClick={() => scrollToSection(tab.key)}
                    title={tab.question}
                    style={{
                      padding: '11px 14px', border: 'none', background: 'transparent', flexShrink: 0,
                      color: activeTab === tab.key ? scoreColor : 'rgba(255,255,255,0.38)',
                      fontWeight: 700, fontSize: '0.62rem', fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em', cursor: 'pointer', transition: 'color 0.15s',
                      whiteSpace: 'nowrap',
                      borderBottom: activeTab === tab.key ? `2px solid ${scoreColor}` : '2px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: '0.42rem', opacity: 0.45, marginRight: '4px' }}>{tab.chapter}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                CHAPTER 01 — WHAT IS WORKING AGAINST YOU
                Question: Why did you receive this score?
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
              ref={sectionRefs.overview}
              id="section-overview"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.06 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ paddingTop: '52px', scrollMarginTop: '88px' }}
            >
              {/* Chapter header */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '0.46rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '8px' }}>CHAPTER 01 OF 05</div>
                <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>What Is Working Against You</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  Your score of <strong style={{ color: scoreColor }}>{result.total}/100</strong> isn't random. These are the specific forces driving it.
                </p>
              </div>

              {/* GAP #8 FIX: Ranked threats — top 3 prominent, rest collapsed */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '12px' }}>RANKED BY SEVERITY — WHAT IS ACTUALLY THREATENING YOUR ROLE</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rankedThreats.slice(0, 3).map((t, i) => {
                    const tColor = t.score >= 60 ? 'var(--red)' : t.score >= 40 ? 'var(--amber)' : 'var(--cyan)';
                    const tLabel = t.score >= 60 ? 'HIGH' : t.score >= 40 ? 'MODERATE' : 'LOW';
                    return (
                      <div key={t.name} style={{ padding: '14px 18px', borderRadius: '10px', background: i === 0 ? `${tColor}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 0 ? tColor + '30' : 'rgba(255,255,255,0.07)'}`, borderLeft: `3px solid ${tColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.48rem', fontWeight: 800, color: tColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', background: `${tColor}15`, padding: '2px 6px', borderRadius: '3px' }}>#{i + 1} {tLabel}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{t.name}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 900, color: tColor, fontFamily: 'var(--font-mono)' }}>{t.score}%</span>
                        </div>
                        <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{ height: '100%', width: `${t.score}%`, background: tColor, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                        </div>
                        {/* GAP #9 FIX: Every threat maps to an action */}
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>→ </span>{t.action}
                        </div>
                      </div>
                    );
                  })}
                  {rankedThreats.length > 3 && (
                    <details style={{ marginTop: '4px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', padding: '6px 10px', listStyle: 'none' }}>
                        + {rankedThreats.length - 3} additional threat factors →
                      </summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {rankedThreats.slice(3).map((t) => {
                          const tColor = t.score >= 60 ? 'var(--red)' : t.score >= 40 ? 'var(--amber)' : 'var(--cyan)';
                          return (
                            <div key={t.name} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `2px solid ${tColor}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600, marginBottom: '4px' }}>
                                <span>{t.name}</span><span style={{ color: tColor, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{t.score}%</span>
                              </div>
                              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>→ {t.action}</div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              </div>

              {/* Full threat breakdown detail */}
              <ThreatBreakdownPanel result={result} />

              {/* Blind spots */}
              {personalBlindSpots.length > 0 && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {personalBlindSpots.map((spot, i) => (
                    <div key={i} style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', borderLeft: '3px solid var(--amber)' }}>
                      <div style={{ fontSize: '0.48rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '5px' }}>HIDDEN RISK</div>
                      <p style={{ fontSize: '0.73rem', color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>{spot}</p>
                    </div>
                  ))}
                </div>
              )}

              {agenticScore && (
                <AgenticExposurePanel result={agenticScore} currentScore={result.total} currentScoreColor={scoreColor} />
              )}

              {/* GAP #16 FIX: Narrative transition into next chapter */}
              <div style={{ marginTop: '40px', padding: '16px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${scoreColor}40` }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  Now that we've mapped the forces creating your risk — the next question is <strong style={{ color: 'var(--text-2)' }}>when</strong>. AI capability moves in waves, not gradually. The timing of those waves determines how much runway you actually have.
                </p>
                <button type="button" onClick={() => scrollToSection('intelligence')} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '5px', border: `1px solid ${scoreColor}35`, background: 'transparent', color: scoreColor, fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                  WHEN DOES THIS BECOME REAL? →
                </button>
              </div>
            </motion.div>

            {/* ── Chapter divider ── */}
            <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${scoreColor}15, transparent)`, margin: '56px 0' }} />

            {/* ═══════════════════════════════════════════════════════════════
                CHAPTER 02 — WHEN DOES THIS BECOME REAL
                Question: What does the AI timeline look like for your role?
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
              ref={sectionRefs.intelligence}
              id="section-intelligence"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.06 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ scrollMarginTop: '88px' }}
            >
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '0.46rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '8px' }}>CHAPTER 02 OF 05</div>
                <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>When Does This Become Real</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  Your current survival probability is <strong style={{ color: scoreColor }}>{survivalPct}%</strong>. Here's how that changes if nothing does.
                </p>
              </div>

              {/* GAP #1 FIX: Real declining trajectory — never flat */}
              {consequencesTimeline && (() => {
                const growthPerYear = trajectory ? Math.max(1.5, trajectory.growthPerYear) : 2.5;
                const sNow = riskToSurvival(result.total);
                const riskM60 = Math.min(97, result.total + growthPerYear * 5);
                const sM60 = riskToSurvival(Math.round(riskM60));
                const riskM60Act = Math.min(97, result.total + growthPerYear * 5 * 0.55);
                const sM60Act = riskToSurvival(Math.round(riskM60Act));
                const decline = Math.max(1, sNow - sM60);
                const saved = Math.max(0, sM60Act - sM60);
                return (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '14px' }}>
                      YOUR SURVIVAL PROBABILITY — NO ACTION TAKEN (MONTH-BY-MONTH)
                    </div>
                    {/* Timeline dots — guaranteed declining */}
                    <div style={{ display: 'flex', overflowX: 'auto', gap: '0', marginBottom: '16px', padding: '16px 0' }}>
                      {consequencesTimeline.map((pt, i) => {
                        const ptColor = pt.survPct >= 70 ? 'var(--emerald)' : pt.survPct >= 55 ? 'var(--cyan)' : pt.survPct >= 40 ? 'var(--amber)' : 'var(--red)';
                        const isLast = i === consequencesTimeline.length - 1;
                        const isFirst = i === 0;
                        return (
                          <div key={pt.label} style={{ flex: '1 1 0', minWidth: '72px', textAlign: 'center', position: 'relative' }}>
                            {!isLast && <div style={{ position: 'absolute', top: '16px', left: '50%', right: '-50%', height: '2px', background: `linear-gradient(90deg, ${ptColor}60, rgba(255,255,255,0.06))`, zIndex: 0 }} />}
                            <div style={{ width: isFirst ? '14px' : '10px', height: isFirst ? '14px' : '10px', borderRadius: '50%', background: ptColor, margin: '9px auto 0', position: 'relative', zIndex: 1, boxShadow: `0 0 ${isFirst ? 10 : 6}px ${ptColor}${isFirst ? 'cc' : '88'}`, border: isFirst ? `2px solid ${ptColor}` : 'none' }} />
                            <div style={{ fontSize: isFirst ? '0.95rem' : '0.78rem', fontWeight: 900, color: ptColor, fontFamily: 'var(--font-mono)', marginTop: '7px' }}>{pt.survPct}%</div>
                            <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{pt.label}</div>
                            <div style={{ fontSize: '0.48rem', color: 'var(--text-3)', marginTop: '3px', lineHeight: 1.3, padding: '0 3px' }}>{pt.status}</div>
                          </div>
                        );
                      })}
                    </div>
                    {/* GAP #2 FIX: Single survival model — both panels use same source */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '8px' }}>
                      <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderTop: '3px solid var(--red)' }}>
                        <div style={{ fontSize: '0.48rem', fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '10px' }}>IF NOTHING CHANGES</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                          <div><div style={{ fontSize: '0.48rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>TODAY</div><div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{sNow}%</div></div>
                          <div style={{ color: 'var(--text-3)', fontSize: '1.2rem', flexShrink: 0 }}>→</div>
                          <div><div style={{ fontSize: '0.48rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>MONTH 60</div><div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{sM60}%</div></div>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--red)', fontWeight: 700 }}>−{decline}% survival over 5 years without action</div>
                      </div>
                      <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderTop: '3px solid var(--emerald)' }}>
                        <div style={{ fontSize: '0.48rem', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '10px' }}>IF YOU FOLLOW THE PLAN</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                          <div><div style={{ fontSize: '0.48rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>TODAY</div><div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{sNow}%</div></div>
                          <div style={{ color: 'var(--text-3)', fontSize: '1.2rem', flexShrink: 0 }}>→</div>
                          <div><div style={{ fontSize: '0.48rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>MONTH 60</div><div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{sM60Act}%</div></div>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--emerald)', fontWeight: 700 }}>+{saved}% better outcome vs. inaction over 5 years</div>
                      </div>
                    </div>
                    {result?.inaction_scenario && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', fontSize: '0.7rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                        {result.inaction_scenario}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Survival window */}
              {survivalWindow && (
                <div style={{ marginBottom: '20px', padding: '18px 22px', borderRadius: 'var(--radius-lg)', background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <div style={{ fontSize: '0.52rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '12px' }}>YOUR PREPARATION WINDOW</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '10px' }}>
                    {[
                      { label: 'Best Case', value: survivalWindow.best === 0 ? 'Act Now' : `${survivalWindow.best}mo`, color: 'var(--emerald)' },
                      { label: 'Most Likely', value: survivalWindow.likely === 0 ? 'Act Now' : `${survivalWindow.likely}mo`, color: 'var(--cyan)' },
                      { label: 'Worst Case', value: survivalWindow.worst === 0 ? 'Act Now' : `${survivalWindow.worst}mo`, color: survivalWindow.worst <= 36 ? 'var(--red)' : 'var(--amber)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: '0.5rem', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>{label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>
                    Confidence: <span style={{ color: survivalWindow.confidence === 'High' ? 'var(--emerald)' : survivalWindow.confidence === 'Medium' ? 'var(--amber)' : 'var(--red)', fontWeight: 700 }}>{survivalWindow.confidence}</span>
                    {' — '}based on ±18 point scenario spread around your score of {result.total}
                  </div>
                </div>
              )}

              {agenticScore && trajectory && (
                <StructuralRiskPanel currentScore={result.total} trajectory={trajectory} agenticScore={agenticScore} thresholdForecast={trajectory.thresholdForecast} />
              )}

              {trajectory && automationTimeline && (
                <CapabilityThresholdPanel trajectory={trajectory} timeline={automationTimeline} scoreColor={scoreColor} thresholdForecast={trajectory.thresholdForecast} />
              )}

              {automationTimeline && (
                <EarlyWarningSignals timeline={automationTimeline} industryRisk={industryRiskEntry} scoreColor={scoreColor} industryLabel={industryLabel} />
              )}

              {agenticScore && automationTimeline && (
                <PsychologicalFramingPanel score={result.total} agenticTier={agenticScore.tier} impactTimeline={automationTimeline.impactTimeline} verdict={getVerdict(result.total)} d7Score={d7Score} />
              )}

              {/* What-if sensitivity */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginTop: '20px', overflow: 'hidden' }}>
                <button type="button" onClick={() => setShowWhatIf(v => !v)} aria-expanded={showWhatIf} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SlidersHorizontal size={13} style={{ color: 'var(--cyan)' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>WHAT-IF EXPLORER</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>— how does experience or country change your score?</span>
                  </div>
                  {showWhatIf ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {showWhatIf && (
                  <div id="what-if-panel" style={{ padding: '18px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 180px' }}>
                        <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '8px' }}>EXPERIENCE</div>
                        <div role="radiogroup" aria-label="What-if experience level" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {EXPERIENCE_LEVELS.map((lvl) => (
                            <button type="button" key={lvl.key} role="radio" aria-checked={wiExperience === lvl.key} onClick={() => setWiExperience(lvl.key)} style={{ padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, background: wiExperience === lvl.key ? 'rgba(0,245,255,0.18)' : 'rgba(255,255,255,0.05)', color: wiExperience === lvl.key ? 'var(--cyan)' : 'var(--text-3)', outline: wiExperience === lvl.key ? '1px solid var(--cyan)' : 'none', transition: 'all 0.15s' }}>{lvl.key}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: '1 1 180px' }}>
                        <label className="label-xs" style={{ color: 'var(--text-3)', display: 'block', marginBottom: '8px' }}>COUNTRY</label>
                        <PremiumSelect options={countryOptions} value={wiCountry} onChange={setWiCountry} placeholder="Select country" />
                      </div>
                      <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: '110px' }}>
                        {whatIfResult ? (
                          <div style={{ padding: '10px 16px', borderRadius: '10px', background: `${getScoreColor(whatIfResult.total)}12`, border: `1px solid ${getScoreColor(whatIfResult.total)}30` }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>WHAT-IF SCORE</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: getScoreColor(whatIfResult.total), lineHeight: 1 }}>{whatIfResult.total}</div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: wiColor, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{wiDelta > 0 ? `▲ +${wiDelta}` : wiDelta < 0 ? `▼ ${wiDelta}` : '— no change'}</div>
                          </div>
                        ) : (
                          <div style={{ padding: '12px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-3)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>Adjust<br />to compare</div>
                        )}
                      </div>
                    </div>
                    {whatIfResult && (
                      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                        <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '10px' }}>DIMENSION IMPACT</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                          {whatIfResult.dimensions.map((wd) => {
                            const orig = result!.dimensions.find((d) => d.key === wd.key);
                            const diff = wd.score - (orig?.score ?? wd.score);
                            if (Math.abs(diff) < 1) return null;
                            const dc = getScoreColor(wd.score);
                            return (
                              <div key={wd.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                                <span style={{ width: 22, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: '0.62rem', fontWeight: 700 }}>{wd.key}</span>
                                <span style={{ flex: 1, color: 'var(--text-2)' }}>{DIM_INFO[wd.key]?.label ?? wd.label}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: dc, fontWeight: 700, minWidth: 26, textAlign: 'right' }}>{wd.score}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: diff < 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700, minWidth: 32, textAlign: 'right', fontSize: '0.68rem' }}>{diff > 0 ? `+${diff}` : diff}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Narrative transition */}
              <div style={{ marginTop: '40px', padding: '16px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${scoreColor}40` }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  The timeline tells you <em>when</em>. But it's the specific tasks in your daily work that tell you <strong style={{ color: 'var(--text-2)' }}>what</strong> — which parts of your job are already in AI's crosshairs today versus which parts will take years to reach.
                </p>
                <button type="button" onClick={() => scrollToSection('tasks')} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '5px', border: `1px solid ${scoreColor}35`, background: 'transparent', color: scoreColor, fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                  WHICH TASKS ARE TARGETS? →
                </button>
              </div>
            </motion.div>

            {/* ── Chapter divider ── */}
            <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${scoreColor}15, transparent)`, margin: '56px 0' }} />

            {/* ═══════════════════════════════════════════════════════════════
                CHAPTER 03 — WHICH TASKS ARE TARGETS
                Question: What specific work is AI already doing in your field?
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
              ref={sectionRefs.tasks}
              id="section-tasks"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.06 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ scrollMarginTop: '88px' }}
            >
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '0.46rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '8px' }}>CHAPTER 03 OF 05</div>
                <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>Which Tasks Are Targets</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  Not your whole role — specific tasks. Some are already partially automated. Others won't be touched for years.
                </p>
              </div>

              {/* Phase 5: YOUR ROLE IN THE AI ERA — role-specific narrative block */}
              {roleNarrative && (
                <div style={{ marginBottom: '28px', padding: '20px 24px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${scoreColor}` }}>
                  <div style={{ fontSize: '0.52rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '12px' }}>YOUR ROLE IN THE AI ERA</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    {roleNarrative.uniqueRisks?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.56rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '6px' }}>ROLE-SPECIFIC RISKS</div>
                        <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {roleNarrative.uniqueRisks.map((r, i) => (
                            <li key={i} style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {roleNarrative.uniqueOpportunities?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.56rem', fontWeight: 700, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '6px' }}>ROLE-SPECIFIC OPPORTUNITIES</div>
                        <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {roleNarrative.uniqueOpportunities.map((o, i) => (
                            <li key={i} style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {roleNarrative.aiToolsImpacting?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.56rem', fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '6px' }}>AI TOOLS IMPACTING THIS ROLE</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {roleNarrative.aiToolsImpacting.map((tool) => (
                            <span key={tool} style={{ padding: '2px 7px', borderRadius: '4px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: '0.6rem', color: 'var(--amber)', fontWeight: 600 }}>{tool}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {roleNarrative.humanEdge && (
                      <div>
                        <div style={{ fontSize: '0.56rem', fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '6px' }}>YOUR HUMAN EDGE</div>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.55 }}>{roleNarrative.humanEdge}</p>
                      </div>
                    )}
                  </div>
                  {roleNarrative.evolutionBy2030 && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5, fontStyle: 'italic' }}>
                      <strong style={{ color: 'var(--text-2)', fontStyle: 'normal' }}>By 2030:</strong> {roleNarrative.evolutionBy2030}
                    </div>
                  )}
                </div>
              )}

              {automationTimeline && (
                <TaskExposureMatrix
                  timeline={automationTimeline}
                  d1Score={result.dimensions.find(d => d.key === 'D1')?.score ?? 50}
                  techStack={techStack || undefined}
                  countryKey={countryKey}
                  experience={experience}
                  d7Score={d7Score}
                />
              )}

              {intel && (
                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '14px' }}>SKILL RISK MATRIX — WHICH SKILLS ARE MOST EXPOSED</div>
                  <AIRiskSkillMatrix intel={intel} scoreColor={scoreColor} roleKey={workTypeKey} />
                </div>
              )}

              {!intel && !automationTimeline && (
                <div style={{ textAlign: 'center', padding: '40px 28px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Cpu size={36} style={{ marginBottom: '10px', color: scoreColor }} />
                  <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '6px', fontSize: '0.85rem' }}>Task data estimated from role heuristics</p>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    Confidence: {result.confidence === 'HIGH' ? 'Strong' : result.confidence === 'MODERATE' ? 'Moderate' : 'Limited'} — {result.dataQuality === 'DQ_FULL' ? 'full role data available' : 'some estimates used'}
                  </div>
                </div>
              )}

              {/* Narrative transition */}
              <div style={{ marginTop: '40px', padding: '16px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${scoreColor}40` }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  You've seen what's under pressure. Now the opposite — <strong style={{ color: 'var(--text-2)' }}>what still protects you</strong>. The dimensions where your score is strongest are the most important to understand and intentionally expand.
                </p>
                <button type="button" onClick={() => scrollToSection('protection')} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '5px', border: `1px solid ${scoreColor}35`, background: 'transparent', color: scoreColor, fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                  WHERE YOU STILL HAVE AN EDGE →
                </button>
              </div>
            </motion.div>

            {/* ── Chapter divider ── */}
            <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${scoreColor}15, transparent)`, margin: '56px 0' }} />

            {/* ═══════════════════════════════════════════════════════════════
                CHAPTER 04 — WHERE YOU STILL HAVE AN EDGE
                Question: What still protects you — and why?
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
              ref={sectionRefs.protection}
              id="section-protection"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.06 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ scrollMarginTop: '88px' }}
            >
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '0.46rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '8px' }}>CHAPTER 04 OF 05</div>
                <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>Where You Still Have an Edge</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  Your Career Protection Grade is <strong style={{ color: careerGrade === 'A' ? 'var(--emerald)' : careerGrade === 'B' ? 'var(--cyan)' : careerGrade === 'C' ? 'var(--amber)' : 'var(--red)' }}>{careerGrade}</strong>. Here's what's holding you up — and how to strengthen it.
                </p>
              </div>

              {/* GAP #7 FIX: Compressed peer comparison — rank + 2 lines only */}
              {survivalPct != null && (() => {
                const peers = [
                  { role: 'AI-Augmented Specialist', pct: Math.min(95, survivalPct + 14), above: true },
                  { role: 'Senior Domain Expert', pct: Math.min(95, survivalPct + 6), above: true },
                  { role: roleLabel, pct: survivalPct, isUser: true },
                  { role: 'General Practitioner', pct: Math.max(5, survivalPct - 8), above: false },
                  { role: 'Routine Task Worker', pct: Math.max(5, survivalPct - 18), above: false },
                ].sort((a, b) => b.pct - a.pct);
                const userRank = peers.findIndex(p => p.isUser) + 1;
                const saferThan = peers.filter(p => !p.isUser && p.pct < survivalPct).map(p => p.role);
                const safferAbove = peers.filter(p => !p.isUser && p.pct > survivalPct).map(p => p.role);
                return (
                  <div style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '10px' }}>YOUR MARKET POSITION VS SIMILAR ROLES</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                      <div style={{ textAlign: 'center', padding: '12px 18px', borderRadius: '8px', background: `${scoreColor}10`, border: `1px solid ${scoreColor}25` }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: scoreColor, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>#{userRank}</div>
                        <div style={{ fontSize: '0.5rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>OF {peers.length}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {safferAbove.length > 0 && <div style={{ fontSize: '0.65rem', color: 'var(--emerald)', marginBottom: '4px' }}>↑ Safer above you: {safferAbove.join(', ')}</div>}
                        {saferThan.length > 0 && <div style={{ fontSize: '0.65rem', color: 'var(--amber)' }}>↓ More exposed below: {saferThan.join(', ')}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {peers.map((p) => {
                        const pColor = p.pct >= 70 ? 'var(--emerald)' : p.pct >= 50 ? 'var(--cyan)' : p.pct >= 35 ? 'var(--amber)' : 'var(--red)';
                        return (
                          <div key={p.role} style={{ display: 'grid', gridTemplateColumns: '1fr 40px', alignItems: 'center', gap: '8px', padding: p.isUser ? '5px 8px' : '3px 8px', borderRadius: '5px', background: p.isUser ? `${scoreColor}08` : 'transparent', border: p.isUser ? `1px solid ${scoreColor}20` : 'none' }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', fontWeight: p.isUser ? 800 : 500, color: p.isUser ? scoreColor : 'var(--text-3)', marginBottom: '2px' }}>{p.role}{p.isUser ? ' ← You' : ''}</div>
                              <div style={{ height: '2px', borderRadius: 1, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${p.pct}%`, background: pColor, borderRadius: 1, transition: 'width 0.7s ease' }} />
                              </div>
                            </div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: pColor, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{p.pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* FIX #11 — Career Protection Journey: current → target progress */}
              {survivalPct != null && (() => {
                const currentPct = survivalPct;
                const targetPct  = Math.min(95, currentPct + (result.total >= 65 ? 20 : result.total >= 45 ? 14 : 9));
                const potentialGain = targetPct - currentPct;
                const barColor = currentPct >= 70 ? 'var(--emerald)' : currentPct >= 50 ? 'var(--cyan)' : currentPct >= 35 ? 'var(--amber)' : 'var(--red)';
                const gradeLabel = careerGrade === 'A' ? 'Strong' : careerGrade === 'B' ? 'Good' : careerGrade === 'C' ? 'Moderate' : 'Low';
                const gradeColor = careerGrade === 'A' ? 'var(--emerald)' : careerGrade === 'B' ? 'var(--cyan)' : careerGrade === 'C' ? 'var(--amber)' : 'var(--red)';
                return (
                  <div style={{ marginBottom: '20px', padding: '20px 22px', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '16px' }}>YOUR CAREER PROTECTION JOURNEY</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                      {[
                        { label: 'Current Protection', pct: currentPct, color: barColor, sub: `Grade ${careerGrade ?? '—'} · ${gradeLabel}` },
                        { label: 'Potential Gain', pct: potentialGain, color: 'var(--violet)', sub: `+${potentialGain}% if plan followed`, isGain: true },
                        { label: 'Target Protection', pct: targetPct, color: 'var(--emerald)', sub: 'With full action plan' },
                      ].map(({ label, pct, color, sub, isGain }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.48rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: '6px' }}>{label.toUpperCase()}</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                            {isGain ? `+${pct}%` : `${pct}%`}
                          </div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', marginTop: '4px', lineHeight: 1.3 }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                    {/* Progress bar: current vs target */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '5px' }}>
                        <span>0%</span><span>Today: {currentPct}%</span><span>Target: {targetPct}%</span><span>100%</span>
                      </div>
                      <div style={{ position: 'relative', height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        {/* Current */}
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${currentPct}%`, background: barColor, borderRadius: '5px', transition: 'width 0.8s ease' }} />
                        {/* Potential gain overlay */}
                        <div style={{ position: 'absolute', left: `${currentPct}%`, top: 0, height: '100%', width: `${potentialGain}%`, background: 'rgba(139,92,246,0.45)', borderRadius: '0 5px 5px 0', transition: 'width 0.8s ease' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: barColor }} />
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>Current ({currentPct}%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(139,92,246,0.6)' }} />
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>Potential gain (+{potentialGain}%)</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '7px', background: `${gradeColor}08`, border: `1px solid ${gradeColor}20`, fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.55 }}>
                      Your protection is currently <strong style={{ color: gradeColor }}>Grade {careerGrade} ({gradeLabel})</strong>. Following the action plan in Chapter 05 could increase this by up to <strong style={{ color: 'var(--violet)' }}>{potentialGain} percentage points</strong>, reaching the <strong style={{ color: 'var(--emerald)' }}>target of {targetPct}%</strong>.
                    </div>
                  </div>
                );
              })()}

              <CareerProtectionScorecard result={result} />

              <SurvivalFactorsPanel
                dimensions={result.dimensions}
                intel={intel}
                experience={experience}
                scoreColor={scoreColor}
                hasManagement={hasManagement}
              />

              <RoleEvolutionPath
                roleKey={workTypeKey}
                roleLabel={roleLabel}
                intel={intel}
                scoreColor={scoreColor}
                evolutionPath={evolutionPath}
                countryKey={countryKey}
                experience={experience}
                d7Score={d7Score}
              />

              {/* Phase 10: Opportunity Engine — equal emphasis on growth paths */}
              {masterIntel && (
                <OpportunityPanel
                  intel={masterIntel}
                  result={result}
                  roleKey={workTypeKey}
                  roleLabel={roleLabel}
                  experience={experience}
                />
              )}

              {/* Narrative transition */}
              <div style={{ marginTop: '40px', padding: '16px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${scoreColor}40` }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  Understanding your edge matters only if you act on it. The next section converts everything you've just read into a <strong style={{ color: 'var(--text-2)' }}>concrete sequence of actions</strong> — each one mapped to the specific threats and advantages in your profile.
                </p>
                <button type="button" onClick={() => scrollToSection('strategy')} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '5px', border: `1px solid ${scoreColor}35`, background: 'transparent', color: scoreColor, fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                  SEE YOUR PROTECTION PLAN →
                </button>
              </div>
            </motion.div>

            {/* ── Chapter divider ── */}
            <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${scoreColor}15, transparent)`, margin: '56px 0' }} />

            {/* ═══════════════════════════════════════════════════════════════
                CHAPTER 05 — YOUR PROTECTION PLAN
                Question: What should you do, in what order?
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
              ref={sectionRefs.strategy}
              id="section-strategy"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.06 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ scrollMarginTop: '88px' }}
            >
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '0.46rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '8px' }}>CHAPTER 05 OF 05</div>
                <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>Your Protection Plan</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  Each action below directly addresses a threat identified in your profile. The sequence matters — do them in order.
                </p>
              </div>

              {/* GAP #14 visible in action plan context */}
              {primaryRecommendation && (
                <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '10px', background: `${scoreColor}0c`, border: `1px solid ${scoreColor}30`, borderLeft: `3px solid ${scoreColor}` }}>
                  <div style={{ fontSize: '0.48rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '6px' }}>YOUR SINGLE MOST IMPORTANT ACTION</div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.6, fontWeight: 600 }}>{primaryRecommendation}</p>
                </div>
              )}

              <EnhancedActionPlan
                intel={intel}
                experience={experience}
                score={result.total}
                trajectory={trajectory}
                scoreColor={scoreColor}
                salaryRange={salaryRange || undefined}
                countryKey={countryKey}
                industryKey={industryKey}
                roleKey={workTypeKey}
                d7Score={d7Score}
                automationTimeline={automationTimeline}
              />
            </motion.div>

            {/* ── Final divider ── */}
            <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${scoreColor}20, transparent)`, margin: '56px 0' }} />

            {/* ═══════════════════════════════════════════════════════════════
                EXECUTIVE SUMMARY — YOUR CAREER IN ONE MINUTE
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
              ref={summaryRef}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.08 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: '32px', padding: '36px', borderRadius: 'var(--radius-xl)', background: `linear-gradient(135deg, ${scoreColor}07 0%, rgba(255,255,255,0.02) 60%)`, border: `1px solid ${scoreColor}20`, position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', background: `radial-gradient(circle at 100% 0%, ${scoreColor}09, transparent 70%)`, pointerEvents: 'none' }} />

              <div style={{ fontSize: '0.52rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', marginBottom: '20px' }}>
                YOUR CAREER IN ONE MINUTE — EXECUTIVE SUMMARY
              </div>

              {/* Phase 12: Executive Summary — all 6 cards traced to MasterIntelligence + NarrativeState */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  {
                    label: 'Current Position',
                    value: narrative?.riskLabel ? narrative.riskLabel.replace(/\b\w/g, c => c.toUpperCase()) : survivalVerdict,
                    sub: masterIntel
                      ? `Survival: ${masterIntel.survivalRange[0]}–${masterIntel.survivalRange[1]}% · ${roleLabel}`
                      : `${roleLabel} · ${experience} yrs`,
                    color: scoreColor,
                  },
                  {
                    label: 'Biggest Threat',
                    value: (() => {
                      const d1 = result.dimensions.find(d => d.key === 'D1')?.score ?? 50;
                      const d2 = result.dimensions.find(d => d.key === 'D2')?.score ?? 50;
                      if (d1 >= 65) return 'Task automation';
                      if (d2 >= 55) return 'Market saturation';
                      return 'Sector contagion';
                    })(),
                    sub: narrative?.primaryThreat?.slice(0, 80) ?? (rankedThreats[0]?.name ?? 'See threat analysis'),
                    color: 'var(--red)',
                  },
                  {
                    label: 'Strongest Advantage',
                    value: (() => {
                      const d3 = result.dimensions.find(d => d.key === 'D3')?.score ?? 50;
                      const d4 = result.dimensions.find(d => d.key === 'D4')?.score ?? 50;
                      if (d3 >= 65) return 'Human skills';
                      if (d4 >= 60) return 'Experience depth';
                      return 'Role structure';
                    })(),
                    sub: narrative?.primaryStrength?.slice(0, 80) ?? 'Your primary protection',
                    color: 'var(--emerald)',
                  },
                  {
                    label: 'Time Horizon',
                    value: masterIntel?.forecastWindow ?? (prepWindowMonths === 0 ? 'Act Now' : prepWindowMonths ? `${prepWindowMonths}mo` : '—'),
                    sub: narrative?.timeHorizon ?? (prepWindowMonths === 0 ? 'Window is closing' : 'to take meaningful action'),
                    color: prepWindowMonths === 0 ? 'var(--red)' : prepWindowMonths && prepWindowMonths <= 18 ? 'var(--amber)' : 'var(--cyan)',
                  },
                  {
                    label: 'Top Action',
                    value: narrative?.actionVerb ?? 'See Plan →',
                    sub: primaryRecommendation ?? 'Chapter 05 has your full plan',
                    color: scoreColor,
                    onClick: () => scrollToSection('strategy'),
                  },
                  {
                    label: 'Expected Outcome',
                    value: masterIntel
                      ? `${masterIntel.survivalRange[0]}–${masterIntel.survivalRange[1]}%`
                      : (() => {
                          const sNow = riskToSurvival(result.total);
                          const growth = trajectory ? Math.max(1.5, trajectory.growthPerYear) : 2.5;
                          const sAct = riskToSurvival(Math.round(Math.min(95, result.total + growth * 5 * 0.45)));
                          return `${sNow}% → ${sAct}%`;
                        })(),
                    sub: narrative
                      ? `If you ${narrative.actionVerb.toLowerCase()} — survival range if plan followed`
                      : 'Survival if you follow the plan',
                    color: 'var(--emerald)',
                  },
                ].map(({ label, value, sub, color, onClick }) => (
                  <div key={label} onClick={onClick} style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: onClick ? 'pointer' : 'default' }}>
                    <div style={{ fontSize: '0.5rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '6px' }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginBottom: '5px' }}>{value}</div>
                    <p style={{ margin: 0, fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{sub}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-3)', fontStyle: 'italic', maxWidth: '480px' }}>
                  {narrative?.primaryThreat ?? biggestThreat}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button type="button" onClick={() => scrollToSection('strategy')} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: scoreColor, color: '#000', fontWeight: 800, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', cursor: 'pointer' }}>
                    SEE ACTION PLAN →
                  </button>
                  <button type="button" onClick={handleShare} style={{ padding: '9px 14px', borderRadius: '7px', border: `1px solid ${scoreColor}40`, background: 'transparent', color: scoreColor, fontWeight: 700, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                    {shareCopied ? '✓ COPIED' : 'SHARE'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Bottom widgets */}
            <div style={{ marginTop: '16px' }}>
              <DataFreshnessBadge roleKey={workTypeKey} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      <OutcomeFeedbackPrompt />
    </div>
  );
};

export default AuditTerminalPage;
