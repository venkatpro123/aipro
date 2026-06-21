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
} from '../data/riskFormula';
// normalizeExperience used internally in riskFormula; not needed at the page level.
import type { ScoreResult } from '../data/riskFormula';
import RiskCalculatorNeuralLoader from '../components/RiskOracle/RiskCalculatorNeuralLoader';
import { getCachedRisk, setCachedRisk } from '../services/cache/riskCache';
import { recordScore, getScoreDelta, type ScoreDelta } from '../services/scoreDeltaService';
import { PremiumSelect, type SelectOption } from '../components/ui/PremiumSelect';
import { getCareerIntelligence } from '../data/intelligence/index';
import { RoleRiskComparison } from '../components/RoleRiskComparison';
import { PortfolioShield } from '../components/PortfolioShield';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Cpu, Database, Globe, Layout, Lock, Smartphone,
  Users, BarChart, PenTool, Stethoscope, Gavel,
  GraduationCap, Factory, ShoppingBag, Zap, Star, Shield,
  Search, Share2, Check, SlidersHorizontal, ChevronDown, ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { calculateScore as calculateScoreFn } from '../data/riskFormula';
import { computeAgenticWaveEngine } from '../data/agenticWaveEngine';
import type { AgenticWaveResult } from '../data/agenticWaveTypes';
import { IntelligenceHeader } from '../components/DisplacementEngine/IntelligenceHeader';
import { Section1_CurrentRisk } from '../components/DisplacementEngine/Section1_CurrentRisk';
import { Section2_AgenticWaveExposure } from '../components/DisplacementEngine/Section2_AgenticWaveExposure';
import { Section3_CapabilityThreshold } from '../components/DisplacementEngine/Section3_CapabilityThreshold';
import { Section4_TaskExposure } from '../components/DisplacementEngine/Section4_TaskExposure';
import { Section5_SurvivalFactors } from '../components/DisplacementEngine/Section5_SurvivalFactors';
import { Section6_FutureRoleEvolution } from '../components/DisplacementEngine/Section6_FutureRoleEvolution';
import { Section7_EarlyWarningSignals } from '../components/DisplacementEngine/Section7_EarlyWarningSignals';
import { Section8_PersonalActionPlan } from '../components/DisplacementEngine/Section8_PersonalActionPlan';
import { Section9_PsychologicalFraming } from '../components/DisplacementEngine/Section9_PsychologicalFraming';

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
  D1: { label: 'Task Automatability', desc: 'What fraction of your daily tasks can AI fully automate today?' },
  D2: { label: 'AI Tool Maturity',    desc: 'How mature and widely deployed are AI tools targeting your role?' },
  D3: { label: 'Human Amplification', desc: 'How much does your role uniquely benefit from human judgment, empathy, or creativity?' },
  D4: { label: 'Experience Shield',   desc: 'How much does seniority and track record protect you from replacement?' },
  D5: { label: 'Country Exposure',    desc: "How aggressively is AI being adopted in your country's labour market?" },
  D6: { label: 'Social Capital Moat', desc: 'How much do your professional network and relationships protect you?' },
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

type TabKey = 'risk-intel' | 'wave-analysis' | 'career-defense' | 'action-plan';

// ── Component ─────────────────────────────────────────────────────────────────

const AuditTerminalPage: React.FC = () => {
  const [industryKey, setIndustryKey] = useState('');
  const [workTypeKey, setWorkTypeKey] = useState('');
  const [experience, setExperience]   = useState('5-10');
  const [countryKey, setCountryKey]   = useState('usa');
  const [result, setResult]           = useState<ScoreResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab]     = useState<TabKey>('risk-intel');
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
    setActiveTab('risk-intel');
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
  const intel            = workTypeKey ? getCareerIntelligence(workTypeKey) : null;
  const currentIndustry  = INDUSTRIES.find((i) => i.key === industryKey);
  const catColor         = currentIndustry ? (CAT_COLORS[currentIndustry.cat] ?? 'var(--cyan)') : 'var(--cyan)';
  const synthesis        = result?.inaction_scenario ?? null;

  // Agentic wave intelligence — derived synchronously from existing score + intel corpus
  const agenticResult = useMemo<AgenticWaveResult | null>(() => {
    if (!result || !workTypeKey || !industryKey) return null;
    return computeAgenticWaveEngine(result, intel, workTypeKey, industryKey, experience);
  }, [result, intel, workTypeKey, industryKey, experience]);

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
      `🤖 Risk Calculator Result`,
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

  const TABS: { key: TabKey; label: string; sub: string }[] = [
    { key: 'risk-intel',     label: 'Your Risk',      sub: 'Score · Skill Floor · Early Warnings' },
    { key: 'wave-analysis',  label: 'AI Impact',       sub: 'Your 2030 Exposure · What AI Targets' },
    { key: 'career-defense', label: 'Career Defense', sub: 'What Protects You · Your Future Role' },
    { key: 'action-plan',    label: 'Action Plan',    sub: 'Next Steps · Perspective' },
  ];

  return (
    <div className="page-wrap" style={{ fontFamily: 'var(--font-sans)' }}>
      {loaderActive && (
        <RiskCalculatorNeuralLoader
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
        padding: 'clamp(16px, 4vw, 32px)',
        marginBottom: '24px',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--cyan)' }}>
            RISK ORACLE
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            See how AI could affect your job · No company data required
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
            <PremiumSelect
              options={workTypeOptions}
              value={workTypeKey}
              onChange={setWorkTypeKey}
              placeholder={industryKey ? 'Select your role' : 'Select industry first'}
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
              gap: '16px',
              padding: 'clamp(16px, 4vw, 32px)',
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
              <div style={{ flex: 1, minWidth: 'min(200px, calc(100vw - 160px))' }}>
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

                {/* ── Confidence badge — ENHANCEMENT #1 ── */}
                {(() => {
                  const conf   = result.confidence;
                  const dq     = result.dataQuality;
                  const pct    = result.content_confidence ?? (conf === 'HIGH' ? 88 : conf === 'MODERATE' ? 68 : 48);
                  const cColor = conf === 'HIGH' ? 'var(--emerald)' : conf === 'MODERATE' ? 'var(--amber)' : 'var(--red)';
                  const cLabel = conf === 'HIGH' ? 'High Confidence' : conf === 'MODERATE' ? 'Moderate Confidence' : 'Low Confidence';
                  const cDesc  = dq === 'DQ_FULL' ? 'Deep role intelligence · seeded data' : dq === 'DQ_PARTIAL' ? 'Mixed signals · industry heuristics' : 'Estimated · limited role data';
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
                {delta && Math.abs(delta.delta) >= 1 && (
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: delta.delta > 0 ? 'var(--red)' : 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                    {delta.delta > 0 ? '▲' : '▼'} {Math.abs(delta.delta).toFixed(1)} pts since last audit
                  </div>
                )}
              </div>

              {currentIndustry && (
                <div style={{ padding: '10px 18px', borderRadius: '8px', background: `${catColor}12`, border: `1px solid ${catColor}33`, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>Your Industry</div>
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
                  <span className="hidden sm:inline" style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
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
                      <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '12px' }}>Changes by factor:</div>
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

            {/* Intelligence Header — sticky bar with score + wave status */}
            {agenticResult && (
              <div className="intel-bleed-header">
                <IntelligenceHeader result={result} agentic={agenticResult} />
              </div>
            )}

            {/* Tab switcher */}
            <div role="tablist" aria-label="AI Displacement Intelligence sections" style={{ display: 'flex', gap: '6px', margin: '16px 0', flexWrap: 'wrap' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`tabpanel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 16px', minHeight: '44px', borderRadius: '8px', border: 'none',
                    background: activeTab === tab.key ? scoreColor : 'rgba(255,255,255,0.05)',
                    color: activeTab === tab.key ? '#000' : 'rgba(255,255,255,0.5)',
                    fontWeight: 700, fontSize: '0.73rem', fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                  }}
                >
                  <span>{tab.label}</span>
                  <span className="hidden sm:block" style={{ fontSize: '0.60rem', fontWeight: 500, opacity: 0.65, letterSpacing: '0.03em' }}>{tab.sub}</span>
                </button>
              ))}
            </div>

            {/* Tab content panel */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'clamp(12px, 3vw, 24px)' }}>

              {/* TAB 1: RISK INTEL — Current Risk + Capability Threshold + Early Warning */}
              {activeTab === 'risk-intel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <Section1_CurrentRisk result={result} />
                  {agenticResult && (
                    <>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 28 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
                          Your Skill Safety Floor
                        </div>
                        <Section3_CapabilityThreshold threshold={agenticResult.capabilityThreshold} />
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 28 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
                          Early Warning Signals
                        </div>
                        <Section7_EarlyWarningSignals waveStatusDetail={agenticResult.waveStatusDetail} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: WAVE ANALYSIS — Agentic Wave Exposure + Task Exposure */}
              {activeTab === 'wave-analysis' && agenticResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <Section2_AgenticWaveExposure waveScore={agenticResult.waveScore} />
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 28 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
                      Task-Level AI Exposure
                    </div>
                    <Section4_TaskExposure tasks={agenticResult.taskExposure} />
                  </div>
                </div>
              )}

              {/* TAB 3: CAREER DEFENSE — Survival Factors + Future Role Evolution */}
              {activeTab === 'career-defense' && agenticResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <Section5_SurvivalFactors factors={agenticResult.survivalFactors} />
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 28 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
                      Future Role Evolution Path
                    </div>
                    <Section6_FutureRoleEvolution steps={agenticResult.futureRoleEvolution} />
                  </div>
                </div>
              )}

              {/* TAB 4: ACTION PLAN — Personal Action Plan + Psychological Framing */}
              {activeTab === 'action-plan' && agenticResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <Section8_PersonalActionPlan actionPlan={agenticResult.actionPlan} />
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 28 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
                      Your Situation In Context
                    </div>
                    <Section9_PsychologicalFraming frame={agenticResult.psychFrame} />
                  </div>
                </div>
              )}

              {/* Fallback while agenticResult is computing (should be instant) */}
              {!agenticResult && (activeTab !== 'risk-intel') && (
                <div style={{ textAlign: 'center', padding: '48px 24px', opacity: 0.5 }}>
                  <Cpu size={32} style={{ marginBottom: 12, color: scoreColor }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Computing intelligence…</p>
                </div>
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
