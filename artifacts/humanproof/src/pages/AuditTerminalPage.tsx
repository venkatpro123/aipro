// AuditTerminalPage — Risk Oracle
// Deterministic 6-dimension AI displacement risk calculator.
// Completely separate from the Layoff Audit (swarm pipeline).
// Uses calculateScore() from riskFormula — client-side, no external calls.

import React, { useState, useRef, useMemo } from 'react';
import { INDUSTRIES, WORK_TYPES, COUNTRIES } from '../data/catalogData';
import {
  calculateScore,
  getScoreColor,
  getVerdict,
  getTimeline,
  getUrgency,
} from '../data/riskEngine';
import type { ScoreResult } from '../data/riskFormula';
import { getCachedRisk, setCachedRisk } from '../services/cache/riskCache';
import { recordScore, getScoreDelta, type ScoreDelta } from '../services/scoreDeltaService';
import { PremiumSelect, type SelectOption } from '../components/ui/PremiumSelect';
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
  Search,
} from 'lucide-react';

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

type TabKey = 'analysis' | 'matrix' | 'roadmap' | 'forecast';

// ── Component ─────────────────────────────────────────────────────────────────

const AuditTerminalPage: React.FC = () => {
  const [industryKey, setIndustryKey] = useState('');
  const [workTypeKey, setWorkTypeKey] = useState('');
  const [experience, setExperience]   = useState('5-10');
  const [countryKey, setCountryKey]   = useState('usa');
  const [result, setResult]           = useState<ScoreResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab]     = useState<TabKey>('analysis');
  const [delta, setDelta]             = useState<ScoreDelta | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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

  const handleCalculate = async () => {
    if (!workTypeKey || !industryKey) return;
    setIsCalculating(true);

    const cacheParams = { roleKey: workTypeKey, industry: industryKey, country: countryKey, experience };
    const cached = getCachedRisk(cacheParams);
    if (cached) {
      setResult(cached);
      const d = getScoreDelta(workTypeKey, cached.total, experience, countryKey);
      setDelta(d);
      // Build breakdown from Oracle dimensions (D1-D6, normalized 0-1)
      const cachedBreakdown = Object.fromEntries(
        (cached.dimensions ?? []).map(dim => [dim.key, dim.score / 100])
      );
      recordScore({ roleKey: workTypeKey, industryKey, countryKey, experience, score: cached.total, timestamp: Date.now(), isGrounded: false, breakdown: cachedBreakdown });
      setActiveTab('analysis');
      setIsCalculating(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    }

    await new Promise((r) => setTimeout(r, 600)); // UX delay

    const score = calculateScore(workTypeKey, industryKey, experience, countryKey);
    setCachedRisk(cacheParams, score);
    setResult(score);

    const d = getScoreDelta(workTypeKey, score.total, experience, countryKey);
    setDelta(d);
    const freshBreakdown = Object.fromEntries(
      (score.dimensions ?? []).map(dim => [dim.key, dim.score / 100])
    );
    recordScore({ roleKey: workTypeKey, industryKey, countryKey, experience, score: score.total, timestamp: Date.now(), isGrounded: true, breakdown: freshBreakdown });

    setActiveTab('analysis');
    setIsCalculating(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  };

  // Handle industry change: clear work type since options change
  const handleIndustryChange = (key: string) => {
    setIndustryKey(key);
    setWorkTypeKey('');
  };

  const scoreColor       = result ? getScoreColor(result.total) : 'var(--cyan)';
  const intel            = workTypeKey ? getCareerIntelligence(workTypeKey) : null;
  const currentIndustry  = INDUSTRIES.find((i) => i.key === industryKey);
  const catColor         = currentIndustry ? (CAT_COLORS[currentIndustry.cat] ?? 'var(--cyan)') : 'var(--cyan)';
  const synthesis        = result?.inaction_scenario ?? null;

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'analysis', label: 'Dimension Analysis' },
    { key: 'matrix',   label: 'Skill Matrix' },
    { key: 'roadmap',  label: 'Upskilling Roadmap' },
    { key: 'forecast', label: 'Risk Forecast' },
  ];

  return (
    <div className="page-wrap" style={{ fontFamily: 'var(--font-sans)' }}>
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

              {/* Score ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
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
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{result.total}</span>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: '2px' }}>RISK SCORE</span>
                </div>
              </div>

              {/* Verdict */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '6px 14px', borderRadius: '6px',
                  background: `${scoreColor}15`, border: `1px solid ${scoreColor}33`,
                  marginBottom: '12px',
                }}>
                  <Shield className="w-4 h-4" style={{ color: scoreColor }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                    {getVerdict(result.total).toUpperCase()}
                  </span>
                </div>
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
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>SECTOR</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: catColor }}>{currentIndustry.cat}</div>
                </div>
              )}
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
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

              {/* ANALYSIS */}
              {activeTab === 'analysis' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
                  {/* Dimension bars */}
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

                  {/* Radar + synthesis */}
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
              )}

              {/* MATRIX */}
              {activeTab === 'matrix' && (
                intel
                  ? <AIRiskSkillMatrix intel={intel} scoreColor={scoreColor} roleKey={workTypeKey} />
                  : <div style={{ textAlign: 'center', padding: '64px', opacity: 0.5 }}>
                      <Cpu size={48} style={{ marginBottom: '16px' }} />
                      <p className="label-xs">No deep skill intelligence available for this role.</p>
                    </div>
              )}

              {/* ROADMAP */}
              {activeTab === 'roadmap' && (
                intel
                  ? <StrategicRoadmap intel={intel} experience={experience} scoreColor={scoreColor} score={result.total} />
                  : <div style={{ textAlign: 'center', padding: '64px', opacity: 0.5 }}>
                      <ShieldCheck size={48} style={{ marginBottom: '16px' }} />
                      <p className="label-xs">Strategic Roadmap unavailable for this role.</p>
                    </div>
              )}

              {/* FORECAST */}
              {activeTab === 'forecast' && (
                <div>
                  <h3 className="label-xs" style={{ marginBottom: '24px', color: 'var(--text-3)' }}>TEMPORAL DISPLACEMENT TRAJECTORY</h3>
                  {result.riskTrend && result.riskTrend.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginBottom: '32px' }}>
                      {result.riskTrend.map((t: any, i: number) => {
                        const val: number = t.score ?? t.riskScore ?? 0;
                        const c = getScoreColor(val);
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="glass-panel"
                            style={{ padding: '20px 12px', textAlign: 'center', borderRadius: '12px' }}
                          >
                            <div style={{ color: 'var(--text-3)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>{t.year}</div>
                            <div style={{ fontWeight: 900, fontSize: '1.4rem', color: c }}>{val}%</div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '32px', opacity: 0.4 }}>
                      <Clock size={36} style={{ marginBottom: '12px' }} />
                      <p className="label-xs">No forecast trajectory data for this role.</p>
                    </div>
                  )}
                  <ScoreComparison />
                </div>
              )}
            </div>

            {/* Bottom widgets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
              <div style={{ flex: '2 1 320px' }}>
                <RoleRiskComparison currentRoleKey={workTypeKey} currentScore={result.total} />
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
