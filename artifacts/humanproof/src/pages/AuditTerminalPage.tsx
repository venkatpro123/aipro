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
} from '../data/riskFormula';
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
import { DimensionRadar } from '../components/DimensionRadar';
import { AIRiskSkillMatrix } from '../components/AIRiskSkillMatrix';
import { RoleRiskComparison } from '../components/RoleRiskComparison';
import { ScoreComparison } from '../components/ScoreComparison';
import { PortfolioShield } from '../components/PortfolioShield';
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
import { computeTrajectory }       from '../services/DisplacementTrajectoryEngine';
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
  const resultRef = useRef<HTMLDivElement>(null);
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
      `Score: ${result.total}/100 — ${getVerdict(result.total)}`,
      `Exposure Horizon: ${getTimeline(result.total)}`,
      `Action Urgency: ${getUrgency(result.total)}`,
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
  const roleLabel     = workTypeKey === '__custom__' ? (customRoleTitle || 'Custom Role') : (workTypeOptions.find((o) => o.key === workTypeKey)?.label ?? workTypeKey);
  const industryLabel = industryOptions.find((o) => o.key === industryKey)?.label ?? industryKey;

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview',     label: 'Overview' },
    { key: 'intelligence', label: 'AI Intelligence' },
    { key: 'tasks',        label: 'Task Analysis' },
    { key: 'protection',   label: 'Protection' },
    { key: 'strategy',     label: 'Action Strategy' },
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
          onClick={handleCalculate}
          disabled={!workTypeKey || !industryKey || isCalculating}
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
            {/* Score header */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '24px',
              padding: '32px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              marginBottom: '16px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 20% 50%, ${scoreColor}08, transparent 60%)` }} />

              {/* Score ring — responsive size via clamp */}
              <div
                role="img"
                aria-label={`Risk score: ${result.total} out of 100 — ${getVerdict(result.total)}`}
                style={{ position: 'relative', flexShrink: 0, width: 'clamp(90px,22vw,120px)', height: 'clamp(90px,22vw,120px)' }}
              >
                <svg width="100%" height="100%" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.total / 100) * 326.7} 326.7`}
                    strokeDashoffset="81.7"
                    style={{ filter: `drop-shadow(0 0 8px ${scoreColor}66)` }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{result.total}</span>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: '2px' }}>RISK SCORE</span>
                </div>
              </div>

              {/* Verdict + confidence + delta */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                {/* Verdict chip */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '6px 14px', borderRadius: '6px',
                  background: `${scoreColor}15`, border: `1px solid ${scoreColor}33`,
                  marginBottom: '10px',
                }}>
                  <Shield className="w-4 h-4" style={{ color: scoreColor }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                    {getVerdict(result.total).toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '8px', marginTop: '-4px' }}>
                  {result.total < 25 ? 'AI is unlikely to displace your role in the near term'
                    : result.total < 50 ? 'You have some exposure but strong enough protection to adapt'
                    : result.total < 70 ? 'A meaningful part of your work will be automated — adapting now matters'
                    : 'Significant automation is likely within 2 years — act now'}
                </div>

                {/* ── Role context row: role label + category badge ── */}
                {roleLabel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>{roleLabel}</span>
                    <RoleCategoryBadge
                      category={intel?.roleCategory ?? (workTypeKey === '__custom__' ? 'emerging_unknown' : undefined)}
                      isDynamic={workTypeKey === '__custom__'}
                    />
                  </div>
                )}

                {/* ── Confidence badge — ENHANCEMENT #1 ── */}
                {(() => {
                  const conf   = result.confidence;
                  const dq     = result.dataQuality;
                  const pct    = result.content_confidence ?? (conf === 'HIGH' ? 88 : conf === 'MODERATE' ? 68 : 48);
                  const cColor = conf === 'HIGH' ? 'var(--emerald)' : conf === 'MODERATE' ? 'var(--amber)' : 'var(--red)';
                  const cLabel = conf === 'HIGH' ? 'Strong confidence' : conf === 'MODERATE' ? 'Moderate confidence' : 'Limited data';
                  const cDesc  = dq === 'DQ_FULL' ? 'Detailed role data available' : dq === 'DQ_PARTIAL' ? 'Partial data — some estimates used' : 'Estimated — limited data for this role';
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 10px', borderRadius: '6px', marginBottom: '12px',
                      background: `${cColor}10`, border: `1px solid ${cColor}28`,
                    }}>
                      {/* Mini confidence bar */}
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cColor, borderRadius: 2, transition: 'width 0.6s ease', boxShadow: `0 0 5px ${cColor}88` }} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: cColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>{cLabel}</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginLeft: 6 }}>{cDesc}</span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '4px' }}>Exposure Horizon</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>{getTimeline(result.total)}</div>
                  </div>
                  <div>
                    <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '4px' }}>Action Urgency</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: scoreColor }}>{getUrgency(result.total)}</div>
                  </div>
                </div>

                {/* §1 — Current Risk Metrics pills */}
                <CurrentRiskMetrics
                  d1Score={result.dimensions.find(d => d.key === 'D1')?.score ?? 50}
                  industryRisk={industryRiskEntry}
                  timeline={automationTimeline}
                  scoreColor={scoreColor}
                />
                {delta && Math.abs(delta.delta) >= 1 && (
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: delta.delta > 0 ? 'var(--red)' : 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                    {delta.delta > 0 ? '▲' : '▼'} {Math.abs(delta.delta).toFixed(1)} pts since last audit
                  </div>
                )}
              </div>

              {currentIndustry && (
                <div style={{ padding: '10px 18px', borderRadius: '8px', background: `${catColor}12`, border: `1px solid ${catColor}33`, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>SECTOR</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: catColor }}>{currentIndustry.cat}</div>
                </div>
              )}

              {/* ── New Analysis / Reset ── */}
              <button
                onClick={handleReset}
                aria-label="Start a new Risk Oracle analysis"
                title="Clear results and run a new analysis"
                style={{
                  alignSelf: 'flex-start', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
                  fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />NEW
              </button>

              {/* ── Share button — ENHANCEMENT #2 ── */}
              <button
                onClick={handleShare}
                aria-label="Copy result summary and permalink to clipboard"
                title="Copy result summary + permalink"
                style={{
                  alignSelf: 'flex-start', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
                  background: shareCopied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                  color: shareCopied ? 'var(--emerald)' : 'var(--text-2)',
                  fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              >
                {shareCopied
                  ? <><Check className="w-3.5 h-3.5" />COPIED</>
                  : <><Share2 className="w-3.5 h-3.5" />SHARE</>}
              </button>
            </div>

            {/* ── What-if sensitivity panel — ENHANCEMENT #3 ── */}
            <div style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              marginBottom: '16px', overflow: 'hidden',
            }}>
              <button
                onClick={() => setShowWhatIf(v => !v)}
                aria-expanded={showWhatIf}
                aria-controls="what-if-panel"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px', background: 'rgba(255,255,255,0.02)',
                  border: 'none', cursor: 'pointer', color: 'var(--text-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal size={14} style={{ color: 'var(--cyan)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: 'var(--cyan)' }}>
                    WHAT-IF SENSITIVITY
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    — explore how experience or country changes your risk
                  </span>
                </div>
                {showWhatIf ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showWhatIf && (
                <div id="what-if-panel" style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end' }}>
                    {/* Experience pill buttons */}
                    <div style={{ flex: '1 1 200px' }}>
                      <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '8px' }}>EXPERIENCE</div>
                      <div role="radiogroup" aria-label="What-if experience level" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {EXPERIENCE_LEVELS.map((lvl) => (
                          <button
                            key={lvl.key}
                            role="radio"
                            aria-checked={wiExperience === lvl.key}
                            onClick={() => setWiExperience(lvl.key)}
                            style={{
                              padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                              fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                              background: wiExperience === lvl.key ? 'rgba(0,245,255,0.18)' : 'rgba(255,255,255,0.05)',
                              color: wiExperience === lvl.key ? 'var(--cyan)' : 'var(--text-3)',
                              outline: wiExperience === lvl.key ? '1px solid var(--cyan)' : 'none',
                              transition: 'all 0.15s',
                            }}
                          >
                            {lvl.key}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Country — PremiumSelect for UI consistency */}
                    <div style={{ flex: '1 1 200px' }}>
                      <label className="label-xs" style={{ color: 'var(--text-3)', display: 'block', marginBottom: '8px' }}>COUNTRY</label>
                      <PremiumSelect
                        options={countryOptions}
                        value={wiCountry}
                        onChange={setWiCountry}
                        placeholder="Select country"
                      />
                    </div>

                    {/* Live result chip */}
                    <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: '120px' }}>
                      {whatIfResult ? (
                        <div style={{
                          padding: '12px 20px', borderRadius: '10px',
                          background: `${getScoreColor(whatIfResult.total)}12`,
                          border: `1px solid ${getScoreColor(whatIfResult.total)}30`,
                        }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>WHAT-IF SCORE</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: getScoreColor(whatIfResult.total), lineHeight: 1 }}>
                            {whatIfResult.total}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: wiColor, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                            {wiDelta > 0 ? `▲ +${wiDelta}` : wiDelta < 0 ? `▼ ${wiDelta}` : '— no change'}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>
                            {getVerdict(whatIfResult.total)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '12px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                          Adjust sliders<br />to compare
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Per-dimension what-if bars */}
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
                              <span style={{ fontFamily: 'var(--font-mono)', color: diff < 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700, minWidth: 36, textAlign: 'right', fontSize: '0.7rem' }}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tab switcher */}
            <div role="tablist" aria-label="Risk Oracle result sections" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`tabpanel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 16px', minHeight: '44px', borderRadius: '6px', border: 'none',
                    background: activeTab === tab.key ? scoreColor : 'rgba(255,255,255,0.05)',
                    color: activeTab === tab.key ? '#000' : 'rgba(255,255,255,0.5)',
                    fontWeight: 700, fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content panel */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '32px' }}>

              {/* ── TAB 1: OVERVIEW ─────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div>
                  {/* D1–D6 dimension bars + radar */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                      <h3 className="label-xs" style={{ marginBottom: '20px', color: 'var(--text-3)' }}>DIMENSION BREAKDOWN</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {result.dimensions.map((dim) => {
                          const info = DIM_INFO[dim.key];
                          const dc = getScoreColor(dim.score);
                          return (
                            <div key={dim.key}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{info?.label ?? dim.label}</div>
                                  {info?.desc && <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '2px' }}>{info.desc}</div>}
                                </div>
                                <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: dc, fontSize: '0.9rem', marginLeft: '12px', flexShrink: 0 }}>{dim.score}</span>
                              </div>
                              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${dim.score}%`, background: dc, borderRadius: '2px', transition: 'width 0.8s ease', boxShadow: `0 0 6px ${dc}66` }} />
                              </div>
                              {dim.reason && <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '4px', fontStyle: 'italic' }}>{dim.reason}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      <div>
                        <h3 className="label-xs" style={{ marginBottom: '20px', color: 'var(--text-3)' }}>RADAR</h3>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <DimensionRadar
                            dimensions={result.dimensions.map((d) => ({ key: d.key, label: DIM_INFO[d.key]?.label ?? d.label, score: d.score }))}
                            size={280}
                            color={scoreColor}
                          />
                        </div>
                      </div>

                      {synthesis && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <h3 className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>ORACLE SYNTHESIS</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,212,224,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0,212,224,0.2)' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse 2s infinite' }} />
                              <span style={{ fontSize: '0.6rem', color: 'var(--cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>ORACLE</span>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '2px', height: '100%', background: 'var(--cyan)' }} />
                            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.75, fontStyle: 'italic', margin: 0 }}>"{synthesis}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* §2 — Agentic AI Wave Exposure */}
                  {agenticScore && (
                    <AgenticExposurePanel
                      result={agenticScore}
                      currentScore={result.total}
                      currentScoreColor={scoreColor}
                    />
                  )}
                </div>
              )}

              {/* ── TAB 2: AI INTELLIGENCE ──────────────────────────────────── */}
              {activeTab === 'intelligence' && (
                <div>
                  {/* §2b — Future AI Wave Assessment (structural risk card) */}
                  {agenticScore && trajectory && (
                    <StructuralRiskPanel
                      currentScore={result.total}
                      trajectory={trajectory}
                      agenticScore={agenticScore}
                      thresholdForecast={trajectory.thresholdForecast}
                    />
                  )}

                  {/* §3 — Capability Threshold Forecast */}
                  {trajectory && automationTimeline ? (
                    <CapabilityThresholdPanel
                      trajectory={trajectory}
                      timeline={automationTimeline}
                      scoreColor={scoreColor}
                      thresholdForecast={trajectory.thresholdForecast}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px', opacity: 0.4 }}>
                      <Clock size={36} style={{ marginBottom: '12px' }} />
                      <p className="label-xs">Run the oracle to see capability threshold data.</p>
                    </div>
                  )}

                  {/* §7 — Early Warning Signals */}
                  {automationTimeline && (
                    <EarlyWarningSignals
                      timeline={automationTimeline}
                      industryRisk={industryRiskEntry}
                      scoreColor={scoreColor}
                      industryLabel={industryLabel}
                    />
                  )}

                  {/* §9 — Psychological Framing */}
                  {agenticScore && automationTimeline && (
                    <PsychologicalFramingPanel
                      score={result.total}
                      agenticTier={agenticScore.tier}
                      impactTimeline={automationTimeline.impactTimeline}
                      verdict={getVerdict(result.total)}
                      d7Score={d7Score}
                    />
                  )}
                </div>
              )}

              {/* ── TAB 3: TASK ANALYSIS ────────────────────────────────────── */}
              {activeTab === 'tasks' && (
                <div>
                  {/* §4 — Task Exposure Matrix */}
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

                  {/* Existing skill matrix */}
                  {intel && (
                    <div style={{ marginTop: '32px', paddingTop: '28px', borderTop: '1px solid var(--border)' }}>
                      <h3 className="label-xs" style={{ marginBottom: '16px', color: 'var(--text-3)' }}>SKILL RISK MATRIX</h3>
                      <AIRiskSkillMatrix intel={intel} scoreColor={scoreColor} roleKey={workTypeKey} />
                    </div>
                  )}
                  {!intel && !automationTimeline && (
                    <div style={{ textAlign: 'center', padding: '48px 32px', opacity: 0.7 }}>
                      <Cpu size={40} style={{ marginBottom: '12px', color: scoreColor }} />
                      <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                        Heuristic estimate — no seeded skill data for this role
                      </p>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        Data quality: {result.dataQuality === 'DQ_FULL' ? 'Full' : result.dataQuality === 'DQ_PARTIAL' ? 'Partial' : 'Estimated'}
                        {' · '}Confidence: {result.confidence}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: PROTECTION ───────────────────────────────────────── */}
              {activeTab === 'protection' && (
                <div>
                  {/* §5 — Survival Factors */}
                  <SurvivalFactorsPanel
                    dimensions={result.dimensions}
                    intel={intel}
                    experience={experience}
                    scoreColor={scoreColor}
                    hasManagement={hasManagement}
                  />

                  {/* §6 — Role Evolution Path */}
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
                </div>
              )}

              {/* ── TAB 5: ACTION STRATEGY ──────────────────────────────────── */}
              {activeTab === 'strategy' && (
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
              )}
            </div>

            {/* Bottom widgets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
              <div style={{ flex: '2 1 320px' }}>
                {/* Pass experience + country so comparison scores use the same parameters */}
                <RoleRiskComparison
                  currentRoleKey={workTypeKey}
                  currentScore={result.total}
                  experience={experience}
                  country={countryKey}
                />
              </div>
              <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <PortfolioShield />
                <DataFreshnessBadge roleKey={workTypeKey} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default AuditTerminalPage;
