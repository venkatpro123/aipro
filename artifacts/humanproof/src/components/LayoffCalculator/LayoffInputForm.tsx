import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLayoff } from "../../context/LayoffContext";
import { useHumanProof } from "../../context/HumanProofContext";
import { searchAllCompanies, resolveCompanyData } from "../../data/companyIntelligenceBridge";
import {
  searchCompanies as searchSupabaseCompanies,
  searchVerifiedCompanyIntelligence,
  computeMatchRatio,
  computeMatchConfidence,
  FUZZY_MATCH_MIN_RATIO,
  MATCH_CONFIRMATION_THRESHOLD,
  type MatchType,
} from "../../services/companyIntelligenceService";
import { CompanyData } from "../../data/companyDatabase";
import { profileUnknownCompany } from "../../services/ensemble/quickProfilerAgent";
import {
  TrendingUp, TrendingDown, Minus, Search, CheckCircle2, ArrowRight, ChevronRight,
  Sprout, Calendar, Briefcase, Trophy, GraduationCap, Target, Star, Sparkles,
  AlertTriangle, RefreshCw, Gem, Laptop, Handshake, ClipboardList, Microscope, Crown, Zap,
} from "lucide-react";
import type { UniquenessDepth, KnowledgeType } from "../../services/layoffScoreEngine";
import {
  searchOracleRoles,
  getAutoDeducedDepartment,
  riskScoreColor,
  riskScoreLabel,
  OracleRoleEntry,
} from "../../data/oracleRoleIndex";
import { motion, AnimatePresence } from "framer-motion";
import { getCareerIntelligence } from "../../data/careerIntelligenceDB";
import { resolveRoleInput } from "../../services/roleResolution";

const LOCAL_COMPANY_SUGGESTIONS: string[] = [
  'Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Tesla', 'NVIDIA',
  'Intel', 'AMD', 'Qualcomm', 'Dell', 'HP', 'IBM', 'Oracle', 'SAP', 'Cisco',
  'Salesforce', 'Adobe', 'Intuit', 'ServiceNow', 'Workday', 'Snowflake', 'Palantir',
  'Cloudflare', 'Datadog', 'Okta', 'Twilio', 'HubSpot', 'Zendesk', 'Stripe',
  'Infosys', 'TCS', 'Wipro', 'HCL Technologies', 'Tech Mahindra', 'Persistent Systems',
  'Mphasis', 'Hexaware', 'Mindtree', 'L&T Technology Services', 'Cyient',
  'Accenture', 'Cognizant', 'Capgemini', 'Deloitte', 'McKinsey', 'BCG', 'Bain',
  'PwC', 'EY', 'KPMG', 'Booz Allen Hamilton',
  'JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Bank of America', 'Citigroup',
  'Wells Fargo', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
  'Barclays', 'Deutsche Bank', 'HSBC', 'UBS', 'BNP Paribas',
  'Walmart', 'Target', 'Nike', 'Samsung', 'Sony',
  'Uber', 'Airbnb', 'Lyft', 'Spotify', 'Twitter', 'LinkedIn',
  'Databricks', 'OpenAI', 'Anthropic', 'ByteDance', 'Grab', 'Gojek',
];

interface Props { onNext: () => void; }

// ── Premium Option Card ───────────────────────────────────────────────────────
const OptionCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  desc?: string;
  accent?: string;
}> = ({ selected, onClick, icon, label, desc, accent = '#22d3ee' }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left"
    style={{
      background: selected ? `${accent}12` : 'var(--alpha-bg-04)',
      border: `1.5px solid ${selected ? `${accent}55` : 'var(--alpha-bg-08)'}`,
      cursor: 'pointer',
      transition: 'all 0.18s ease',
    }}
  >
    {icon && (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: selected ? `${accent}22` : 'var(--alpha-bg-06)' }}
      >
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold leading-snug" style={{ color: selected ? '#fff' : 'var(--alpha-text-70)' }}>
        {label}
      </p>
      {desc && (
        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--alpha-text-35)' }}>
          {desc}
        </p>
      )}
    </div>
    <div
      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
      style={{
        border: `2px solid ${selected ? accent : 'var(--alpha-text-25)'}`,
        background: selected ? accent : 'transparent',
        transition: 'all 0.15s ease',
      }}
    >
      {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  </motion.button>
);

// ── Mini sparkline ────────────────────────────────────────────────────────────
const MiniSparkline: React.FC<{ trend: { riskScore: number }[]; color: string }> = ({ trend, color }) => {
  if (!trend || trend.length < 2) return null;
  const W = 40, H = 16;
  const min = Math.min(...trend.map(t => t.riskScore));
  const max = Math.max(...trend.map(t => t.riskScore));
  const range = max - min || 1;
  const path = trend.map((t, i) =>
    `${i === 0 ? 'M' : 'L'} ${((i / (trend.length - 1)) * W).toFixed(1)} ${(H - ((t.riskScore - min) / range) * H).toFixed(1)}`
  ).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const DirectionIcon: React.FC<{ direction: OracleRoleEntry['riskDirection']; size?: number }> = ({ direction, size = 11 }) => {
  if (direction === 'rising')  return <TrendingUp size={size} color="#ef4444" />;
  if (direction === 'falling') return <TrendingDown size={size} color="#10b981" />;
  return <Minus size={size} color="#f59e0b" />;
};

// ── Compact role intelligence preview ────────────────────────────────────────
const RoleIntelCard: React.FC<{ entry: OracleRoleEntry }> = ({ entry }) => {
  const color = riskScoreColor(entry.currentRiskScore);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl px-3.5 py-3 mt-3"
      style={{ background: `${color}09`, border: `1px solid ${color}25` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-bold" style={{ color: 'var(--alpha-text-85)' }}>{entry.displayTitle}</p>
        <div className="flex items-center gap-2">
          <MiniSparkline trend={entry.riskTrend} color={color} />
          <span className="text-xs font-black px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>{entry.currentRiskScore}%</span>
        </div>
      </div>
      <p className="text-[11px] leading-snug" style={{ color: 'var(--alpha-text-45)' }}>
        {entry.summary.slice(0, 100)}{entry.summary.length > 100 ? '…' : ''}
      </p>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {entry.topSafeSkill && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={11} strokeWidth={2} />{entry.topSafeSkill.slice(0, 22)}
          </span>
        )}
        {entry.topAtRiskSkill && entry.topAtRiskSkill !== 'None' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Zap size={11} strokeWidth={2} />{entry.topAtRiskSkill.slice(0, 22)}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <DirectionIcon direction={entry.riskDirection} />
          <span className="text-[10px]" style={{ color: entry.riskDirection === 'rising' ? '#ef4444' : entry.riskDirection === 'falling' ? '#10b981' : '#f59e0b' }}>
            {entry.riskDirection === 'rising' ? 'Rising' : entry.riskDirection === 'falling' ? 'Falling' : 'Stable'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const RoleResolutionBanner: React.FC<{ entry: OracleRoleEntry }> = ({ entry }) => {
  const intel = useMemo(() => getCareerIntelligence(entry.oracleKey), [entry.oracleKey]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1.5 px-3 py-2 rounded-xl flex items-center gap-2"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.20)' }}
    >
      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10b981' }} />
      <span className="text-xs font-semibold" style={{ color: '#6ee7b7' }}>
        Analyzing as: {intel?.displayRole ?? entry.displayTitle}
      </span>
      {intel && (
        <span className="text-[10px] ml-auto" style={{ color: 'var(--alpha-text-35)' }}>
          {(intel.skills.at_risk?.length ?? 0) + (intel.skills.safe?.length ?? 0)} skills mapped
        </span>
      )}
    </motion.div>
  );
};

// ── Step question config ──────────────────────────────────────────────────────
const STEPS = [
  { q: 'Where do you work?',                    sub: 'We\'ll analyze layoff signals and company health' },
  { q: 'What\'s your role?',                    sub: 'We\'ll pull your AI displacement risk profile' },
  { q: 'How long have you been there?',          sub: 'Newer employees typically face higher layoff risk' },
  { q: 'Total career experience?',              sub: 'Across all companies and roles' },
  { q: 'How\'s your recent performance?',       sub: 'Be honest — this personalizes your risk score' },
  { q: 'How replaceable are you?',              sub: 'How hard would it be to replace you in 60 days?' },
  { q: 'Any of these apply to you?',            sub: 'Select all that apply — they lower your risk' },
  { q: 'What\'s your financial safety net?',    sub: 'Optional — helps personalize your action plan' },
];

const TOTAL_STEPS = STEPS.length;

// ── Main Export ───────────────────────────────────────────────────────────────
export const LayoffInputForm: React.FC<Props> = ({ onNext }) => {
  const { state, dispatch } = useLayoff();
  const { userProfile } = useHumanProof();

  // Navigation
  const [qStep, setQStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Step 0: Company
  const [companySearch, setCompanySearch] = useState(state.companyName || '');
  const [searchResults, setSearchResults] = useState<(CompanyData & { logo?: string; domain?: string; isExternal?: boolean })[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(state.companyData || null);
  const [isProfiling, setIsProfiling] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<Array<{ name: string; industry: string; region: string; riskScore: number }>>([]);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [pendingMatchConfirmation, setPendingMatchConfirmation] = useState<{
    company: any; matchedName: string; confidence: number; matchType: MatchType; userQuery: string;
  } | null>(null);

  // Step 1: Role
  const [roleTitle, setRoleTitle] = useState(state.roleTitle || '');
  const [selectedOracleEntry, setSelectedOracleEntry] = useState<OracleRoleEntry | null>(null);
  const [roleSuggestions, setRoleSuggestions] = useState<OracleRoleEntry[]>([]);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const [oracleSelectionCleared, setOracleSelectionCleared] = useState(false);
  const roleInputRef = useRef<HTMLInputElement>(null);

  // Steps 2–7: Personal factors
  const [tenureYears, setTenureYears] = useState(state.userFactors?.tenureYears || 1.5);
  // 3.5 matches the "2 – 5 years" option value below so the default renders as
  // a visibly selected radio instead of leaving all four options unselected.
  const [careerYears, setCareerYears] = useState(state.userFactors?.careerYears ?? 3.5);
  const [uniquenessDepth, setUniquenessDepth] = useState<UniquenessDepth>(
    state.userFactors?.uniquenessDepth ?? (state.userFactors?.isUniqueRole ? 'critical_knowledge' : 'generic')
  );
  const [knowledgeType, setKnowledgeType] = useState<KnowledgeType>(
    (state.userFactors as any)?.knowledgeType ?? (userProfile?.uniquenessKnowledgeType as KnowledgeType | undefined) ?? 'system_specific'
  );
  const isUniqueRole = uniquenessDepth === 'critical_knowledge';
  const [performanceTier, setPerformanceTier] = useState<'top' | 'average' | 'below' | 'unknown'>(
    state.userFactors?.performanceTier || 'average'
  );
  const [hasRecentPromotion, setHasRecentPromotion] = useState(state.userFactors?.hasRecentPromotion ?? false);
  const [financialRunwayMonths, setFinancialRunwayMonths] = useState<number>(0);
  const [hasKeyRelationships, setHasKeyRelationships] = useState(state.userFactors?.hasKeyRelationships ?? false);

  // ── Company search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!companySearch || companySearch.length < 2 || selectedCompany) {
      setSearchResults([]);
      return;
    }
    const trimmed = companySearch.trim();
    if (!trimmed || trimmed.length > 100) { setSearchResults([]); return; }

    const q = trimmed.toLowerCase();
    const localEntries = searchAllCompanies(trimmed);
    const localMerged: any[] = localEntries.map(c => {
      const fullData = resolveCompanyData(c.key);
      if (!fullData?.name) return null;
      return { ...fullData, isExternal: false, fromSupabase: false };
    }).filter(Boolean);
    const seenNames = new Set(localMerged.map((m: any) => (m.name ?? '').toLowerCase()));
    LOCAL_COMPANY_SUGGESTIONS.filter(n => n.toLowerCase().includes(q)).slice(0, 5).forEach(name => {
      if (!seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        localMerged.push({
          name, isPublic: false, industry: 'Company', region: 'GLOBAL', employeeCount: 0,
          layoffsLast24Months: [], layoffRounds: 0, lastLayoffPercent: null,
          revenuePerEmployee: 150000, aiInvestmentSignal: 'medium',
          source: 'Suggestions', lastUpdated: new Date().toISOString(), isExternal: true,
        } as any);
      }
    });
    setSearchResults(localMerged.slice(0, 10));

    const controller = new AbortController();
    searchSupabaseCompanies(trimmed, 10, controller.signal).then(async supabaseResults => {
      if (controller.signal.aborted) return;
      let effectiveResults = supabaseResults;
      if (supabaseResults.length === 0 && !controller.signal.aborted) {
        try {
          const vci = await searchVerifiedCompanyIntelligence(trimmed, 10, controller.signal);
          if (vci.length > 0 && !controller.signal.aborted) effectiveResults = vci;
        } catch { /* non-fatal */ }
      }
      if (controller.signal.aborted) return;
      const rootWord = trimmed.split(' ')[0].toLowerCase();
      const sameRootCount = effectiveResults.filter(r => r.name?.toLowerCase().startsWith(rootWord)).length;
      if (sameRootCount >= 3) {
        setDisambiguationCandidates(effectiveResults.slice(0, 5).map(r => ({ name: r.name, industry: r.industry, region: 'GLOBAL', riskScore: r.riskScore })));
        setShowDisambiguation(true);
      } else {
        setShowDisambiguation(false);
        setDisambiguationCandidates([]);
      }
      const sbMapped: any[] = effectiveResults.filter(r => r.name?.length > 0).slice(0, 8).map(r => ({
        name: r.name, industry: r.industry, isPublic: false, region: 'GLOBAL', employeeCount: 0,
        layoffsLast24Months: [], layoffRounds: 0, lastLayoffPercent: null, revenuePerEmployee: 150000,
        aiInvestmentSignal: 'medium', source: 'Supabase Intelligence', lastUpdated: new Date().toISOString(),
        riskScore: r.riskScore, isExternal: false, fromSupabase: true,
      } as any));
      const sbNames = new Set(sbMapped.map((r: any) => (r.name ?? '').toLowerCase()));
      setSearchResults([...sbMapped, ...localMerged.filter((m: any) => !sbNames.has((m.name ?? '').toLowerCase()))].slice(0, 10));
    }).catch(() => {});
    return () => controller.abort();
  }, [companySearch, selectedCompany]);

  // ── Role search ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (roleTitle.length >= 2) {
      const results = searchOracleRoles(roleTitle, 8);
      setRoleSuggestions(results);
      setShowRoleSuggestions(results.length > 0);
      setFocusedSuggestionIndex(-1);
      if (selectedOracleEntry && !selectedOracleEntry.displayTitle.toLowerCase().includes(roleTitle.toLowerCase())) {
        setSelectedOracleEntry(null);
        setOracleSelectionCleared(true);
      }
    } else {
      setShowRoleSuggestions(false);
      setRoleSuggestions([]);
    }
  }, [roleTitle]);

  const selectRole = (entry: OracleRoleEntry) => {
    setRoleTitle(entry.displayTitle);
    setSelectedOracleEntry(entry);
    setOracleSelectionCleared(false);
    setShowRoleSuggestions(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!showRoleSuggestions || roleSuggestions.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedSuggestionIndex(p => Math.min(p + 1, roleSuggestions.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedSuggestionIndex(p => Math.max(p - 1, 0)); }
      else if (e.key === 'Enter' && focusedSuggestionIndex >= 0) { e.preventDefault(); selectRole(roleSuggestions[focusedSuggestionIndex]); }
      else if (e.key === 'Escape') setShowRoleSuggestions(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showRoleSuggestions, roleSuggestions, focusedSuggestionIndex]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleInputRef.current && !roleInputRef.current.contains(e.target as Node)) setShowRoleSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Company select ────────────────────────────────────────────────────────
  const handleCompanySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanySearch(e.target.value);
    setSelectedCompany(null);
    setPendingMatchConfirmation(null);
  };

  const selectCompany = async (comp: any, skipConfidenceCheck = false) => {
    if (!skipConfidenceCheck && companySearch && comp.name) {
      const { score: confidence, matchType } = computeMatchConfidence(companySearch, comp.name);
      if (confidence < MATCH_CONFIRMATION_THRESHOLD) {
        setPendingMatchConfirmation({ company: comp, matchedName: comp.name, confidence, matchType, userQuery: companySearch });
        setSearchResults([]);
        return;
      }
    }
    setPendingMatchConfirmation(null);
    setCompanySearch(comp.name);
    setSearchResults([]);
    if (comp.isExternal) {
      const localMatch = resolveCompanyData(comp.name);
      if (localMatch?.name?.toLowerCase() === comp.name?.toLowerCase()) { setSelectedCompany(localMatch); return; }
      setIsProfiling(true);
      const profile = await profileUnknownCompany(comp.name);
      setIsProfiling(false);
      setSelectedCompany(profile
        ? { ...comp, industry: profile.industry, isPublic: profile.isPublic, employeeCount: profile.employeeCount, region: profile.region, ticker: profile.ticker, source: `AI Profile (${comp.name})` }
        : { ...comp, industry: 'Technology', employeeCount: 500, source: 'User Entry' } as CompanyData
      );
    } else {
      setSelectedCompany(comp);
    }
  };

  // ── Resolved role preview ─────────────────────────────────────────────────
  const resolvedRolePreview = resolveRoleInput(roleTitle.trim(), { oracleKey: selectedOracleEntry?.oracleKey ?? null });

  // ── Can-proceed per step ──────────────────────────────────────────────────
  const canProceed = useMemo(() => {
    switch (qStep) {
      case 0: return companySearch.trim().length > 0;
      case 1: return roleTitle.trim().length > 0 && !!resolvedRolePreview.canonicalKey;
      default: return true; // all other steps always allow continue (optional or auto-selected)
    }
  }, [qStep, companySearch, roleTitle, resolvedRolePreview.canonicalKey]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = async () => {
    if (qStep === 1) {
      // Resolve company + role, dispatch
      if (!companySearch || !roleTitle.trim()) return;
      const resolvedRole = resolveRoleInput(roleTitle.trim(), { oracleKey: selectedOracleEntry?.oracleKey ?? null });
      if (!resolvedRole.canonicalKey) return;
      let finalCompany = selectedCompany;
      if (!finalCompany) {
        setIsProfiling(true);
        const profile = await profileUnknownCompany(companySearch);
        setIsProfiling(false);
        if (!profile) setProfileFailed(true);
        else setProfileFailed(false);
        finalCompany = {
          name: companySearch, isPublic: profile?.isPublic ?? false,
          industry: profile?.industry ?? 'Technology', region: profile?.region ?? 'GLOBAL',
          employeeCount: profile?.employeeCount ?? 500, ticker: profile?.ticker,
          revenueGrowthYoY: null, stock90DayChange: null,
          layoffsLast24Months: [], layoffRounds: 0, lastLayoffPercent: null,
          revenuePerEmployee: 150000, aiInvestmentSignal: 'medium',
          source: profile ? `AI Profile (${companySearch})` : 'User Input',
          lastUpdated: new Date().toISOString(),
        };
      }
      dispatch({ type: 'SET_COMPANY_DATA', payload: finalCompany });
      dispatch({
        type: 'SET_INPUTS',
        payload: {
          companyName: finalCompany.name, roleTitle: roleTitle.trim(),
          department: resolvedRole.canonicalKey ? getAutoDeducedDepartment(resolvedRole.canonicalKey) : 'Operations',
          oracleKey: resolvedRole.canonicalKey,
        },
      });
    }

    if (qStep === TOTAL_STEPS - 1) {
      // Final step — calculate
      const validatedCareerYears = careerYears < tenureYears ? tenureYears : careerYears;
      dispatch({
        type: 'SET_INPUTS',
        payload: {
          userFactors: {
            tenureYears, careerYears: validatedCareerYears, isUniqueRole, uniquenessDepth,
            knowledgeType: isUniqueRole ? knowledgeType : undefined,
            performanceTier: performanceTier as any,
            hasRecentPromotion, hasKeyRelationships, financialRunwayMonths,
          } as any,
        },
      });
      onNext();
      return;
    }

    setDirection(1);
    setQStep(s => s + 1);
  };

  const goBack = () => {
    if (qStep === 0) return;
    setDirection(-1);
    setQStep(s => s - 1);
  };

  // Auto-advance for single-select steps after short delay
  const autoAdvance = (nextStep?: number) => {
    setTimeout(() => {
      setDirection(1);
      setQStep(s => nextStep ?? s + 1);
    }, 280);
  };

  const progress = Math.round((qStep / (TOTAL_STEPS - 1)) * 100);
  const { q, sub } = STEPS[qStep];

  const runwayLabel = (m: number) =>
    m === 0 ? 'Not specified' : m < 3 ? `${m} months — Critical` : m < 6 ? `${m} months — Elevated` : m < 12 ? `${m} months — Comfortable` : `${m} months — Strong`;
  const runwayColor = (m: number) =>
    m === 0 ? 'var(--alpha-text-35)' : m < 3 ? '#ef4444' : m < 6 ? '#f97316' : m < 12 ? '#f59e0b' : '#10b981';

  return (
    <div
      className="flex flex-col"
      // Intentionally always-dark: every label/border in this wizard is a
      // literal rgba(255,255,255,…) value tuned for a dark surface, so the
      // card stays dark in both themes rather than flipping to a near-white
      // background that would make its own text illegible. The border/shadow
      // below exist so this reads as a deliberate dark panel against a light
      // page, not a leftover light-mode bug.
      style={{
        minHeight: 520,
        background: 'rgba(9,12,20,1)',
        border: '1px solid var(--alpha-bg-08)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div style={{ height: 3, background: 'var(--alpha-bg-06)', flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #22d3ee, #0ea5e9)', borderRadius: 2 }}
        />
      </div>

      {/* ── Step counter ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0" style={{ flexShrink: 0 }}>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === qStep ? 16 : 5, height: 5, borderRadius: 3,
                background: i < qStep ? '#22d3ee' : i === qStep ? '#22d3ee' : 'var(--alpha-bg-08)',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
        <span className="text-[11px] font-mono" style={{ color: 'var(--alpha-text-30)' }}>
          {qStep + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* ── Question area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={qStep}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 32 : -32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Question title */}
            <h2 className="text-xl font-bold mb-1 leading-snug" style={{ color: 'var(--text)' }}>{q}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--alpha-text-45)' }}>{sub}</p>

            {/* ── Step 0: Company ───────────────────────────────────────── */}
            {qStep === 0 && (
              <div>
                {profileFailed && (
                  <div className="rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <AlertTriangle size={14} strokeWidth={2} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: '#f59e0b' }}>Not in our database — using industry defaults.</p>
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--alpha-text-30)' }} />
                    <input
                      type="text"
                      placeholder="Type your company name..."
                      value={companySearch}
                      onChange={handleCompanySearch}
                      autoComplete="off"
                      autoFocus
                      className="w-full rounded-2xl text-sm font-medium pl-10 pr-12 py-3.5 outline-none"
                      style={{
                        background: 'var(--alpha-bg-06)', border: '1.5px solid var(--alpha-bg-08)',
                        color: 'var(--text)', caretColor: '#22d3ee',
                      }}
                    />
                    {isProfiling && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 spinner" />
                    )}
                    {selectedCompany && !isProfiling && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />
                      </div>
                    )}
                  </div>

                  {/* Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(15,18,28,0.98)', border: '1px solid var(--alpha-bg-08)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                      {searchResults.map(res => {
                        const ratio = computeMatchRatio(companySearch, res.name);
                        const isPartial = ratio < 0.80 && ratio >= FUZZY_MATCH_MIN_RATIO;
                        return (
                          <div
                            key={res.name}
                            onClick={() => selectCompany(res)}
                            className="flex items-center justify-between px-4 py-3 cursor-pointer"
                            style={{ borderBottom: '1px solid var(--alpha-bg-06)', opacity: ratio < FUZZY_MATCH_MIN_RATIO ? 0.4 : 1 }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--alpha-bg-06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{res.name}</p>
                              <p className="text-xs" style={{ color: 'var(--alpha-text-45)' }}>
                                {res.industry}
                                {(res as any).fromSupabase && <span style={{ color: '#22d3ee' }}> · DB</span>}
                                {isPartial && <span style={{ color: '#f59e0b' }}> · partial</span>}
                              </p>
                            </div>
                            {(res as any).riskScore != null && (
                              <span className="text-xs font-black px-2 py-0.5 rounded-lg" style={{
                                background: (res as any).riskScore >= 65 ? 'rgba(239,68,68,0.15)' : (res as any).riskScore >= 45 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                color: (res as any).riskScore >= 65 ? '#ef4444' : (res as any).riskScore >= 45 ? '#f59e0b' : '#10b981',
                              }}>
                                {(res as any).riskScore}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Match confirmation */}
                  {pendingMatchConfirmation && (
                    <div className="mt-2 rounded-2xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: '#f59e0b' }}>Confirm company match</p>
                      <p className="text-xs mb-3" style={{ color: 'var(--alpha-text-50)' }}>
                        You typed <strong style={{ color: 'var(--text)' }}>"{pendingMatchConfirmation.userQuery}"</strong>.
                        {' '}Closest match: <strong style={{ color: 'var(--text)' }}>{pendingMatchConfirmation.matchedName}</strong>.
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => selectCompany(pendingMatchConfirmation.company, true)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.30)' }}>
                          Yes, use {pendingMatchConfirmation.matchedName}
                        </button>
                        <button type="button" onClick={() => { setPendingMatchConfirmation(null); setSearchResults([]); setSelectedCompany(null); }}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl"
                          style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-55)', border: '1px solid var(--alpha-bg-08)' }}>
                          Search again
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Disambiguation */}
                  {showDisambiguation && disambiguationCandidates.length > 0 && (
                    <div className="mt-2 rounded-2xl px-4 py-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: '#f59e0b' }}>Multiple entities — pick one:</p>
                      {disambiguationCandidates.map(c => (
                        <button key={c.name} type="button"
                          onClick={() => { setCompanySearch(c.name); setShowDisambiguation(false); setDisambiguationCandidates([]); }}
                          className="flex items-center gap-2 w-full py-1.5 text-left"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                          <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: '#f59e0b' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--alpha-text-70)' }}>{c.name}</span>
                          <span className="text-xs" style={{ color: 'var(--alpha-text-35)' }}>({c.industry})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCompany && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.22)' }}
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#6ee7b7' }}>{selectedCompany.name}</p>
                      <p className="text-xs" style={{ color: 'var(--alpha-text-45)' }}>{selectedCompany.industry} · Verified</p>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Step 1: Role ────────────────────────────────────────────── */}
            {qStep === 1 && (
              <div ref={roleInputRef}>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--alpha-text-30)' }} />
                  <input
                    ref={roleInputRef as any}
                    type="text"
                    placeholder="e.g. Software Engineer, Data Analyst..."
                    value={roleTitle}
                    onChange={e => setRoleTitle(e.target.value)}
                    autoComplete="off"
                    autoFocus
                    className="w-full rounded-2xl text-sm font-medium pl-10 pr-4 py-3.5 outline-none"
                    style={{
                      background: 'var(--alpha-bg-06)', border: '1.5px solid var(--alpha-bg-08)',
                      color: 'var(--text)', caretColor: '#22d3ee',
                    }}
                  />
                </div>

                {showRoleSuggestions && (
                  <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(15,18,28,0.98)', border: '1px solid var(--alpha-bg-08)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                    {roleSuggestions.map((entry, idx) => {
                      const color = riskScoreColor(entry.currentRiskScore);
                      return (
                        <div
                          key={entry.oracleKey}
                          onClick={() => selectRole(entry)}
                          className="flex items-center justify-between px-4 py-3 cursor-pointer"
                          style={{
                            borderBottom: '1px solid var(--alpha-bg-06)',
                            background: idx === focusedSuggestionIndex ? 'rgba(34,211,238,0.08)' : 'transparent',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--alpha-bg-06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = idx === focusedSuggestionIndex ? 'rgba(34,211,238,0.08)' : 'transparent')}
                        >
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{entry.displayTitle}</p>
                            <p className="text-xs" style={{ color: 'var(--alpha-text-35)' }}>{entry.summary.slice(0, 48)}…</p>
                          </div>
                          <span className="text-xs font-black px-2 py-0.5 rounded-lg flex-shrink-0 ml-2" style={{ background: `${color}20`, color }}>
                            {entry.currentRiskScore}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedOracleEntry && <RoleIntelCard entry={selectedOracleEntry} />}
                {selectedOracleEntry && <RoleResolutionBanner entry={selectedOracleEntry} />}

                {oracleSelectionCleared && !selectedOracleEntry && (
                  <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
                    <p className="text-xs" style={{ color: '#f59e0b' }}>Pick from suggestions to restore calibrated data.</p>
                  </div>
                )}
                {!selectedOracleEntry && roleTitle.trim().length > 1 && !resolvedRolePreview.canonicalKey && (
                  <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                    <p className="text-xs" style={{ color: '#f87171' }}>Select a suggestion or use a title like "Software Developer".</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Tenure ──────────────────────────────────────────── */}
            {qStep === 2 && (
              <div className="flex flex-col gap-3">
                {[
                  { val: 0.3, label: 'Less than 6 months', desc: 'Still in probation period', icon: <Sprout size={18} strokeWidth={1.8} /> },
                  { val: 1.5, label: '1 – 2 years',         desc: 'Building credibility',       icon: <Calendar size={18} strokeWidth={1.8} /> },
                  { val: 3.5, label: '3 – 5 years',         desc: 'Established contributor',    icon: <Briefcase size={18} strokeWidth={1.8} /> },
                  { val: 7,   label: '5+ years',             desc: 'Long-term institutional asset', icon: <Trophy size={18} strokeWidth={1.8} /> },
                ].map(opt => (
                  <OptionCard
                    key={opt.val}
                    selected={tenureYears === opt.val}
                    onClick={() => { setTenureYears(opt.val); autoAdvance(); }}
                    icon={opt.icon}
                    label={opt.label}
                    desc={opt.desc}
                  />
                ))}
              </div>
            )}

            {/* ── Step 3: Experience ───────────────────────────────────────── */}
            {qStep === 3 && (
              <div className="flex flex-col gap-3">
                {[
                  { val: 1,   label: '0 – 2 years',   desc: 'Early career',            icon: <GraduationCap size={18} strokeWidth={1.8} /> },
                  { val: 3.5, label: '2 – 5 years',   desc: 'Mid-level professional',  icon: <TrendingUp size={18} strokeWidth={1.8} /> },
                  { val: 7,   label: '5 – 10 years',  desc: 'Experienced professional', icon: <Target size={18} strokeWidth={1.8} /> },
                  { val: 15,  label: '15+ years',      desc: 'Senior / expert',          icon: <Star size={18} strokeWidth={1.8} /> },
                ].map(opt => (
                  <OptionCard
                    key={opt.val}
                    selected={careerYears === opt.val}
                    onClick={() => { setCareerYears(opt.val); autoAdvance(); }}
                    icon={opt.icon}
                    label={opt.label}
                    desc={opt.desc}
                  />
                ))}
              </div>
            )}

            {/* ── Step 4: Performance ─────────────────────────────────────── */}
            {qStep === 4 && (
              <div className="flex flex-col gap-3">
                {[
                  { val: 'top' as const,     label: 'Top performer',        desc: 'Exceeding targets consistently', icon: <Sparkles size={18} strokeWidth={1.8} />, accent: '#10b981' },
                  { val: 'average' as const, label: 'Meeting expectations', desc: 'Solid contributor, on track',     icon: <CheckCircle2 size={18} strokeWidth={1.8} />, accent: '#22d3ee' },
                  { val: 'below' as const,   label: 'Needs improvement',    desc: 'Below expectations recently',    icon: <AlertTriangle size={18} strokeWidth={1.8} />, accent: '#f59e0b' },
                ].map(opt => (
                  <OptionCard
                    key={opt.val}
                    selected={performanceTier === opt.val}
                    onClick={() => { setPerformanceTier(opt.val); autoAdvance(); }}
                    icon={opt.icon}
                    label={opt.label}
                    desc={opt.desc}
                    accent={opt.accent}
                  />
                ))}
              </div>
            )}

            {/* ── Step 5: Role uniqueness + knowledge type ─────────────────── */}
            {qStep === 5 && (
              <div>
                <div className="flex flex-col gap-3">
                  {[
                    { val: 'generic',              label: 'Easily replaceable',       desc: 'Role exists at thousands of companies', icon: <RefreshCw size={18} strokeWidth={1.8} />, accent: '#94a3b8' },
                    { val: 'functional_specialist', label: 'Specialist',               desc: 'Unique expertise but hireable',         icon: <Target size={18} strokeWidth={1.8} />, accent: '#22d3ee' },
                    { val: 'critical_knowledge',   label: 'Irreplaceable knowledge',  desc: 'Institutional knowledge that lives in you', icon: <Gem size={18} strokeWidth={1.8} />, accent: '#a78bfa' },
                  ].map(opt => (
                    <OptionCard
                      key={opt.val}
                      selected={uniquenessDepth === (opt.val as UniquenessDepth)}
                      onClick={() => setUniquenessDepth(opt.val as UniquenessDepth)}
                      icon={opt.icon}
                      label={opt.label}
                      desc={opt.desc}
                      accent={opt.accent}
                    />
                  ))}
                </div>

                {/* Knowledge type sub-question */}
                <AnimatePresence>
                  {uniquenessDepth === 'critical_knowledge' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5">
                        <p className="text-sm font-semibold mb-3" style={{ color: 'rgba(167,139,250,0.90)' }}>
                          What kind of knowledge makes you irreplaceable?
                        </p>
                        <div className="flex flex-col gap-2.5">
                          {[
                            { val: 'system_specific',       label: 'Systems',      desc: 'Legacy code or proprietary tech',       icon: <Laptop size={18} strokeWidth={1.8} /> },
                            { val: 'client_relationship',   label: 'Client trust', desc: 'Personal client relationships',          icon: <Handshake size={18} strokeWidth={1.8} /> },
                            { val: 'process_institutional', label: 'Process',      desc: 'Undocumented tribal knowledge',           icon: <ClipboardList size={18} strokeWidth={1.8} /> },
                            { val: 'domain_expert',         label: 'Domain',       desc: 'Deep regulatory or domain expertise',    icon: <Microscope size={18} strokeWidth={1.8} /> },
                            { val: 'leadership_capital',    label: 'Leadership',   desc: 'Org authority and team trust',            icon: <Crown size={18} strokeWidth={1.8} /> },
                          ].map(opt => (
                            <OptionCard
                              key={opt.val}
                              selected={knowledgeType === opt.val}
                              onClick={() => setKnowledgeType(opt.val as KnowledgeType)}
                              icon={opt.icon}
                              label={opt.label}
                              desc={opt.desc}
                              accent="#a78bfa"
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Step 6: Signals ─────────────────────────────────────────── */}
            {qStep === 6 && (
              <div className="flex flex-col gap-3">
                <OptionCard
                  selected={hasRecentPromotion}
                  onClick={() => setHasRecentPromotion(v => !v)}
                  icon="↗️"
                  label="Recent promotion"
                  desc="Promoted in the last 12 months"
                  accent="#10b981"
                />
                <OptionCard
                  selected={hasKeyRelationships}
                  onClick={() => setHasKeyRelationships(v => !v)}
                  icon="🤝"
                  label="Key stakeholder relationships"
                  desc="You own critical client or executive relationships"
                  accent="#22d3ee"
                />
                <p className="text-xs text-center mt-1" style={{ color: 'var(--alpha-text-25)' }}>
                  Select any that apply — or tap Continue to skip
                </p>
              </div>
            )}

            {/* ── Step 7: Financial runway ─────────────────────────────────── */}
            {qStep === 7 && (
              <div>
                {/* Value display */}
                <div className="rounded-2xl px-4 py-4 mb-5 text-center" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
                  <p className="text-3xl font-black mb-1" style={{ color: runwayColor(financialRunwayMonths) }}>
                    {financialRunwayMonths === 0 ? '—' : `${financialRunwayMonths}`}
                    <span className="text-base font-semibold ml-1" style={{ color: 'var(--alpha-text-45)' }}>
                      {financialRunwayMonths > 0 ? 'months' : ''}
                    </span>
                  </p>
                  <p className="text-xs font-semibold" style={{ color: runwayColor(financialRunwayMonths) }}>
                    {runwayLabel(financialRunwayMonths)}
                  </p>
                </div>

                {/* Slider */}
                <input
                  type="range" min={0} max={24} step={1}
                  value={financialRunwayMonths}
                  onChange={e => setFinancialRunwayMonths(Number(e.target.value))}
                  className="w-full mb-4"
                  style={{ accentColor: runwayColor(financialRunwayMonths), cursor: 'pointer', height: 6, borderRadius: 3 }}
                />

                {/* Quick select pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { val: 0,  label: 'Not set',    color: 'var(--alpha-text-35)' },
                    { val: 3,  label: '3 mo',       color: '#ef4444' },
                    { val: 6,  label: '6 mo',       color: '#f97316' },
                    { val: 12, label: '12 mo',      color: '#f59e0b' },
                    { val: 24, label: '24+ mo',     color: '#10b981' },
                  ].map(m => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setFinancialRunwayMonths(m.val)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                      style={{
                        background: financialRunwayMonths === m.val ? `${m.color}22` : 'var(--alpha-bg-06)',
                        color: financialRunwayMonths === m.val ? m.color : 'var(--alpha-text-45)',
                        border: `1px solid ${financialRunwayMonths === m.val ? `${m.color}50` : 'var(--alpha-bg-08)'}`,
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs" style={{ color: 'var(--alpha-text-25)', lineHeight: 1.5 }}>
                  Months of living expenses saved. Helps personalize your job search strategy and urgency.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderTop: '1px solid var(--alpha-bg-06)', background: 'rgba(9,12,20,0.95)', flexShrink: 0 }}
      >
        {/* Back */}
        <button
          type="button"
          onClick={goBack}
          className="text-sm font-semibold px-3 py-2 rounded-xl transition-all"
          style={{
            color: qStep === 0 ? 'var(--alpha-bg-08)' : 'var(--alpha-text-50)',
            background: 'transparent', border: 'none', cursor: qStep === 0 ? 'default' : 'pointer',
          }}
          disabled={qStep === 0}
        >
          ← Back
        </button>

        {/* Continue / Get Score */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={goNext}
          disabled={!canProceed || isProfiling}
          className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl transition-all"
          style={{
            background: canProceed && !isProfiling
              ? 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)'
              : 'var(--alpha-bg-06)',
            color: canProceed && !isProfiling ? '#09090b' : 'var(--alpha-text-25)',
            border: 'none',
            cursor: canProceed && !isProfiling ? 'pointer' : 'default',
            boxShadow: canProceed && !isProfiling ? '0 0 20px rgba(34,211,238,0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {isProfiling ? (
            <>Analyzing<span className="opacity-60">…</span></>
          ) : qStep === TOTAL_STEPS - 1 ? (
            <>Get My Risk Score <ArrowRight className="w-4 h-4" /></>
          ) : (
            <>Continue <ArrowRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </div>
  );
};
