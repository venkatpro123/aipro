import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLayoff } from "../../context/LayoffContext";
import { useHumanProof } from "../../context/HumanProofContext";
import { searchAllCompanies, resolveCompanyData } from "../../data/companyIntelligenceBridge";
import {
  searchCompanies as searchSupabaseCompanies,
  computeMatchRatio,
  computeMatchConfidence,
  FUZZY_MATCH_MIN_RATIO,
  MATCH_CONFIRMATION_THRESHOLD,
  type MatchType,
} from "../../services/companyIntelligenceService";
import { CompanyData } from "../../data/companyDatabase";
import { profileUnknownCompany } from "../../services/ensemble/quickProfilerAgent";
import { Zap, Shield, TrendingUp, TrendingDown, Minus, Search } from "lucide-react";
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

// Pre-loaded company suggestions — replaces CSP-blocked Clearbit autocomplete
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

interface Props {
  onNext: () => void;
}

// ── Step progress dots ───────────────────────────────────────────────────────
const StepProgress: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="audit-step-progress">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`audit-step-dot${i + 1 === current ? ' active' : i + 1 < current ? ' done' : ''}`}
      />
    ))}
  </div>
);

// ── Wizard toggle group (replaces inline-styled ToggleGroup) ─────────────────
interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  desc?: string;
}

const ToggleGroup: React.FC<{
  options: ToggleOption[];
  value: string;
  onChange: (val: string) => void;
  ariaLabel: string;
}> = ({ options, value, onChange, ariaLabel }) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={options.length > 2 ? 'audit-grid-3col' : 'audit-grid-2col'}
    style={{ marginBottom: 'var(--space-5)' }}
  >
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          role="radio"
          aria-checked={active}
          onClick={() => onChange(opt.value)}
          className={`wizard-toggle-btn${active ? ' active' : ''}`}
        >
          {opt.icon && <span className="toggle-icon">{opt.icon}</span>}
          <span className="toggle-label">{opt.label}</span>
          {opt.desc && <span className="toggle-desc">{opt.desc}</span>}
        </button>
      );
    })}
  </div>
);

// ── Live risk pulse bar ───────────────────────────────────────────────────────
const RiskPulse: React.FC<{ score: number }> = ({ score }) => {
  const color = riskScoreColor(score);
  return (
    <div className="signal-card" data-tone={score >= 65 ? 'red' : score >= 45 ? 'amber' : 'emerald'}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}
    >
      <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
        <motion.div
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: color }}
        />
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Live Risk Pulse
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{score}%</span>
        </div>
        <div className="gauge-track" style={{ height: 4 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ type: "spring", damping: 20 }}
            className="gauge-fill"
            style={{ background: color }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Mini risk trend sparkline ────────────────────────────────────────────────
const MiniSparkline: React.FC<{ trend: { riskScore: number }[]; color: string }> = ({ trend, color }) => {
  if (!trend || trend.length < 2) return null;
  const W = 52, H = 20;
  const min = Math.min(...trend.map((t) => t.riskScore));
  const max = Math.max(...trend.map((t) => t.riskScore));
  const range = max - min || 1;
  const toX = (i: number) => (i / (trend.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / range) * H;
  const path = trend
    .map((t, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(t.riskScore).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ── Risk direction icon ──────────────────────────────────────────────────────
const DirectionIcon: React.FC<{ direction: OracleRoleEntry["riskDirection"]; size?: number }> = ({
  direction, size = 12,
}) => {
  if (direction === "rising")  return <TrendingUp size={size} color="#ef4444" />;
  if (direction === "falling") return <TrendingDown size={size} color="#10b981" />;
  return <Minus size={size} color="#f59e0b" />;
};

// ── Role Intelligence Preview Card ───────────────────────────────────────────
const RoleIntelPreviewCard: React.FC<{ entry: OracleRoleEntry }> = ({ entry }) => {
  const riskColor = riskScoreColor(entry.currentRiskScore);
  const tone = entry.currentRiskScore >= 65 ? 'red' : entry.currentRiskScore >= 45 ? 'amber' : 'emerald';
  return (
    <div
      className="signal-card"
      data-tone={tone}
      style={{ margin: 'var(--space-2) 0 var(--space-5)', animation: 'slideDown 0.25s ease-out' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
        <div>
          <div style={{ color: riskColor, fontSize: '0.6rem', letterSpacing: '1.5px', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', fontWeight: 700 }}>
            Oracle Role Intelligence
          </div>
          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem' }}>
            {entry.displayTitle}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)' }}>
          <div
            className={`audit-role-displacement ${entry.currentRiskScore >= 65 ? 'high' : entry.currentRiskScore >= 45 ? 'medium' : 'low'}`}
            style={{ fontSize: '0.875rem', padding: '4px 12px' }}
          >
            {entry.currentRiskScore}%
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
            {riskScoreLabel(entry.currentRiskScore)}
          </div>
        </div>
      </div>

      <p style={{ margin: '0 0 var(--space-3)', color: 'var(--text-3)', fontSize: '0.82rem', lineHeight: 1.5 }}>
        {entry.summary.length > 120 ? entry.summary.slice(0, 120) + '…' : entry.summary}
      </p>

      <div className="audit-stat-row" style={{ marginBottom: 'var(--space-3)' }}>
        {entry.topSafeSkill && (
          <div className="signal-chip signal-chip-live">
            <Shield size={10} />
            {entry.topSafeSkill.length > 28 ? entry.topSafeSkill.slice(0, 28) + '…' : entry.topSafeSkill}
          </div>
        )}
        {entry.topAtRiskSkill && entry.topAtRiskSkill !== 'None' && (
          <div className="signal-chip signal-chip-mixed">
            <Zap size={10} />
            {entry.topAtRiskSkill.length > 28 ? entry.topAtRiskSkill.slice(0, 28) + '…' : entry.topAtRiskSkill}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <MiniSparkline trend={entry.riskTrend} color={riskColor} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <DirectionIcon direction={entry.riskDirection} size={11} />
            <span style={{
              color: entry.riskDirection === 'rising' ? '#ef4444' : entry.riskDirection === 'falling' ? '#10b981' : '#f59e0b',
              fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
            }}>
              {entry.riskDirection === 'rising' ? 'Risk rising' : entry.riskDirection === 'falling' ? 'Risk falling' : 'Stable'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {entry.contextTags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                background: 'rgba(124,58,255,0.12)',
                border: '1px solid rgba(124,58,255,0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
                fontSize: '0.6rem',
                color: '#a78bfa',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.5px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-2)', fontSize: '0.62rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        Oracle confidence: {entry.confidenceScore}%
      </div>
    </div>
  );
};

// ── Role Resolution Banner ────────────────────────────────────────────────────
const RoleResolutionBanner: React.FC<{ entry: OracleRoleEntry }> = ({ entry }) => {
  const intel = useMemo(() => getCareerIntelligence(entry.oracleKey), [entry.oracleKey]);

  if (intel) {
    const atRiskCount = intel.skills.at_risk?.length ?? 0;
    const safeCount   = intel.skills.safe?.length ?? 0;
    const pathCount   = intel.careerPaths?.length ?? 0;
    return (
      <div className="signal-card" data-tone="emerald" style={{ marginTop: 'calc(var(--space-2) * -1)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
          <span className="signal-chip signal-chip-live">✓ Resolved</span>
          <span style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600 }}>
            Analyzing as: {intel.displayRole}
          </span>
          <span style={{
            color: 'var(--text-3)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-sm)', padding: '1px 6px',
          }}>
            {entry.oracleKey}
          </span>
        </div>
        <div className="audit-stat-row">
          <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>Coverage:</span>
          {atRiskCount > 0 && (
            <span style={{ color: 'var(--amber)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              {atRiskCount} at-risk skill{atRiskCount !== 1 ? 's' : ''}
            </span>
          )}
          {safeCount > 0 && (
            <span style={{ color: 'var(--emerald)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              {safeCount} safe skill{safeCount !== 1 ? 's' : ''}
            </span>
          )}
          {pathCount > 0 && (
            <span style={{ color: '#818cf8', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              {pathCount} transition path{pathCount !== 1 ? 's' : ''}
            </span>
          )}
          {atRiskCount === 0 && safeCount === 0 && pathCount === 0 && (
            <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>basic</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="signal-card" data-tone="amber" style={{ marginTop: 'calc(var(--space-2) * -1)', marginBottom: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
        <span className="signal-chip signal-chip-mixed">⚠ Limited Coverage</span>
        <span style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>
          Role not in database — analysis from risk score.
        </span>
      </div>
      <div style={{ color: 'var(--text-3)', fontSize: '0.72rem', lineHeight: 1.5 }}>
        Skills &amp; Career tab will show general guidance.{' '}
        <a
          href="/contact"
          style={{ color: '#818cf8', textDecoration: 'underline', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); window.open('/contact', '_blank'); }}
        >
          Request coverage →
        </a>
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
export const LayoffInputForm: React.FC<Props> = ({ onNext }) => {
  const { state, dispatch } = useLayoff();
  const { userProfile } = useHumanProof();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [companySearch, setCompanySearch] = useState(state.companyName || "");
  const [searchResults, setSearchResults] = useState<
    (CompanyData & { logo?: string; domain?: string; isExternal?: boolean })[]
  >([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(
    state.companyData || null
  );
  const [isProfiling, setIsProfiling] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<Array<{
    name: string; industry: string; region: string; riskScore: number;
  }>>([]);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [pendingMatchConfirmation, setPendingMatchConfirmation] = useState<{
    company: any;
    matchedName: string;
    confidence: number;
    matchType: MatchType;
    userQuery: string;
  } | null>(null);

  // Role search state
  const [roleTitle, setRoleTitle] = useState(state.roleTitle || "");
  const [selectedOracleEntry, setSelectedOracleEntry] = useState<OracleRoleEntry | null>(null);
  const [roleSuggestions, setRoleSuggestions] = useState<OracleRoleEntry[]>([]);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const [oracleSelectionCleared, setOracleSelectionCleared] = useState(false);
  const roleInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [tenureYears, setTenureYears] = useState(state.userFactors?.tenureYears || 1.5);
  const [careerYears, setCareerYears] = useState(state.userFactors?.careerYears ?? 5);
  const [uniquenessDepth, setUniquenessDepth] = useState<UniquenessDepth>(
    state.userFactors?.uniquenessDepth ??
    (state.userFactors?.isUniqueRole ? 'critical_knowledge' : 'generic')
  );
  const [knowledgeType, setKnowledgeType] = useState<KnowledgeType>(
    (state.userFactors as any)?.knowledgeType
    ?? (userProfile?.uniquenessKnowledgeType as KnowledgeType | undefined)
    ?? 'system_specific'
  );
  const isUniqueRole = uniquenessDepth === 'critical_knowledge';
  const [performanceTier, setPerformanceTier] = useState(
    state.userFactors?.performanceTier || "average"
  );
  const [hasRecentPromotion, setHasRecentPromotion] = useState(
    state.userFactors?.hasRecentPromotion ?? false
  );
  const [financialRunwayMonths, setFinancialRunwayMonths] = useState<number>(0);
  const [hasKeyRelationships, setHasKeyRelationships] = useState(
    state.userFactors?.hasKeyRelationships ?? false
  );

  const pulseScore = useMemo(() => {
    let base = selectedOracleEntry?.currentRiskScore || 45;
    if (performanceTier === 'top') base -= 15;
    if (performanceTier === 'below') base += 25;
    if (tenureYears < 1) base += 10;
    if (tenureYears > 8) base -= 12;
    if (uniquenessDepth === 'critical_knowledge') base -= 10;
    else if (uniquenessDepth === 'functional_specialist') base -= 5;
    if (hasRecentPromotion) base -= 8;
    if (hasKeyRelationships) base -= 5;
    return Math.min(99, Math.max(1, base));
  }, [selectedOracleEntry, performanceTier, tenureYears, uniquenessDepth, hasRecentPromotion, hasKeyRelationships]);

  // ── Company search with debounce ──────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const tid = setTimeout(async () => {
      if (!companySearch || companySearch.length < 2 || selectedCompany) {
        setSearchResults([]);
        return;
      }
      const trimmed = companySearch.trim();
      if (trimmed.length === 0 || trimmed.length > 100) {
        setSearchResults([]);
        return;
      }

      let merged: any[] = [];

      // 1. Supabase company_intelligence (2000 companies)
      try {
        const supabaseResults = await searchSupabaseCompanies(companySearch, 10);
        const rootWord = (companySearch ?? '').split(' ')[0].toLowerCase();
        const sameRootCount = supabaseResults.filter(r =>
          r.name != null && r.name.toLowerCase().startsWith(rootWord)
        ).length;
        if (sameRootCount >= 3) {
          setDisambiguationCandidates(supabaseResults.slice(0, 5).map(r => ({
            name: r.name, industry: r.industry, region: 'GLOBAL', riskScore: r.riskScore,
          })));
          setShowDisambiguation(true);
        } else {
          setShowDisambiguation(false);
          setDisambiguationCandidates([]);
        }
        supabaseResults
          .filter(r => r.name != null && r.name.length > 0)
          .slice(0, 8)
          .forEach(r => {
            merged.push({
              name: r.name, industry: r.industry, isPublic: false, region: "GLOBAL",
              employeeCount: 0, layoffsLast24Months: [], layoffRounds: 0,
              lastLayoffPercent: null, revenuePerEmployee: 150000,
              aiInvestmentSignal: "medium", source: "Supabase Intelligence",
              lastUpdated: new Date().toISOString(), riskScore: r.riskScore,
              isExternal: false, fromSupabase: true,
            } as any);
          });
      } catch (_) { /* Supabase unavailable */ }

      // 2. Local code-side bridge (50 companies)
      const local = searchAllCompanies(companySearch).map((c) => {
        const fullData = resolveCompanyData(c.key);
        return { ...(fullData as any), isExternal: false, fromSupabase: false };
      });
      local.forEach(loc => {
        if (loc.name && !merged.find(m => m.name != null && m.name.toLowerCase() === loc.name.toLowerCase())) {
          merged.push(loc);
        }
      });

      // 3. Local fallback suggestions (replaces CSP-blocked Clearbit)
      if (merged.length < 3) {
        const q = companySearch.toLowerCase();
        LOCAL_COMPANY_SUGGESTIONS
          .filter(n => n.toLowerCase().includes(q))
          .slice(0, Math.max(0, 5 - merged.length))
          .forEach(name => {
            if (!merged.find(m => m.name != null && m.name.toLowerCase() === name.toLowerCase())) {
              merged.push({
                name, isPublic: false, industry: "Company",
                region: "GLOBAL", employeeCount: 0,
                layoffsLast24Months: [], layoffRounds: 0,
                lastLayoffPercent: null, revenuePerEmployee: 150000,
                aiInvestmentSignal: "medium", source: "Suggestions",
                lastUpdated: new Date().toISOString(), isExternal: true,
              } as any);
            }
          });
      }

      if (!controller.signal.aborted) {
        setSearchResults(merged.slice(0, 10));
      }
    }, 300);
    return () => { clearTimeout(tid); controller.abort(); };
  }, [companySearch, selectedCompany]);

  // ── Oracle role search with debounce ──────────────────────────────────────
  useEffect(() => {
    const tid = setTimeout(() => {
      if (roleTitle.length >= 2) {
        const results = searchOracleRoles(roleTitle, 8);
        setRoleSuggestions(results);
        setShowRoleSuggestions(results.length > 0);
        setFocusedSuggestionIndex(-1);
        if (selectedOracleEntry && roleTitle && !selectedOracleEntry.displayTitle.toLowerCase().includes(roleTitle.toLowerCase())) {
          setSelectedOracleEntry(null);
          setOracleSelectionCleared(true);
        }
      } else {
        setShowRoleSuggestions(false);
        setRoleSuggestions([]);
        setFocusedSuggestionIndex(-1);
      }
    }, 180);
    return () => clearTimeout(tid);
  }, [roleTitle]);

  const selectRole = (entry: OracleRoleEntry) => {
    setRoleTitle(entry.displayTitle);
    setSelectedOracleEntry(entry);
    setOracleSelectionCleared(false);
    setShowRoleSuggestions(false);
  };

  // Keyboard navigation for role suggestions
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!showRoleSuggestions || roleSuggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedSuggestionIndex(prev => (prev < roleSuggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedSuggestionIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && focusedSuggestionIndex >= 0) {
        e.preventDefault();
        selectRole(roleSuggestions[focusedSuggestionIndex]);
      } else if (e.key === "Escape") {
        setShowRoleSuggestions(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showRoleSuggestions, roleSuggestions, focusedSuggestionIndex]);

  // Close role suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleInputRef.current && !roleInputRef.current.contains(e.target as Node)) {
        setShowRoleSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Company select handler ────────────────────────────────────────────────
  const handleCompanySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanySearch(val);
    setSelectedCompany(null);
    setPendingMatchConfirmation(null);
  };

  const selectCompany = async (comp: any, skipConfidenceCheck = false) => {
    if (!skipConfidenceCheck && companySearch && comp.name) {
      const { score: confidence, matchType } = computeMatchConfidence(companySearch, comp.name);
      if (confidence < MATCH_CONFIRMATION_THRESHOLD) {
        setPendingMatchConfirmation({
          company: comp, matchedName: comp.name,
          confidence, matchType, userQuery: companySearch,
        });
        setSearchResults([]);
        return;
      }
    }
    setPendingMatchConfirmation(null);
    setCompanySearch(comp.name);
    setSearchResults([]);
    if (comp.isExternal) {
      const localMatch = resolveCompanyData(comp.name);
      if (localMatch && localMatch.name && comp.name && localMatch.name.toLowerCase() === comp.name.toLowerCase()) {
        setSelectedCompany(localMatch);
        return;
      }
      setIsProfiling(true);
      const profile = await profileUnknownCompany(comp.name);
      setIsProfiling(false);
      if (profile) {
        const fullComp: CompanyData = {
          ...comp, industry: profile.industry, isPublic: profile.isPublic,
          employeeCount: profile.employeeCount, region: profile.region,
          ticker: profile.ticker, source: `AI Profile (${comp.name})`,
        };
        setSelectedCompany(fullComp);
      } else {
        setSelectedCompany({ ...comp, industry: "Technology", employeeCount: 500, source: "User Entry" } as CompanyData);
      }
    } else {
      setSelectedCompany(comp);
    }
  };

  const handleNextStep1 = async () => {
    if (!companySearch || !roleTitle.trim()) return;
    const resolvedRole = resolveRoleInput(roleTitle.trim(), {
      oracleKey: selectedOracleEntry?.oracleKey ?? null,
    });
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
        industry: profile?.industry ?? "Technology", region: profile?.region ?? "GLOBAL",
        employeeCount: profile?.employeeCount ?? 500, ticker: profile?.ticker,
        revenueGrowthYoY: null, stock90DayChange: null,
        layoffsLast24Months: [], layoffRounds: 0, lastLayoffPercent: null,
        revenuePerEmployee: 150000, aiInvestmentSignal: "medium",
        source: profile ? `AI Profile (${companySearch})` : "User Input",
        lastUpdated: new Date().toISOString(),
      };
    }

    const department = resolvedRole.canonicalKey
      ? getAutoDeducedDepartment(resolvedRole.canonicalKey)
      : "Operations";

    dispatch({ type: "SET_COMPANY_DATA", payload: finalCompany });
    dispatch({
      type: "SET_INPUTS",
      payload: {
        companyName: finalCompany.name, roleTitle: roleTitle.trim(),
        department, oracleKey: resolvedRole.canonicalKey,
      },
    });
    setStep(2);
  };

  const handleCalculate = () => {
    let validatedCareerYears = careerYears;
    if (careerYears < tenureYears) {
      validatedCareerYears = tenureYears;
      setCareerYears(tenureYears);
    }
    dispatch({
      type: "SET_INPUTS",
      payload: {
        userFactors: {
          tenureYears, careerYears: validatedCareerYears, isUniqueRole, uniquenessDepth,
          knowledgeType: uniquenessDepth === 'critical_knowledge' ? knowledgeType : undefined,
          performanceTier: performanceTier as "top" | "average" | "below" | "unknown",
          hasRecentPromotion, hasKeyRelationships, financialRunwayMonths,
        } as any,
      },
    });
    onNext();
  };

  const resolvedRolePreview = resolveRoleInput(roleTitle.trim(), {
    oracleKey: selectedOracleEntry?.oracleKey ?? null,
  });
  const canProceedStep1 =
    companySearch.trim().length > 0 &&
    roleTitle.trim().length > 0 &&
    !!resolvedRolePreview.canonicalKey;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="audit-wizard-shell">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: step === 1 ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: step === 1 ? 12 : -12 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="audit-wizard-card"
        >
          <StepProgress current={step} total={2} />

          {step === 1 ? (
            <div>
              {/* Step header */}
              <div className="audit-step-header">
                <div className="audit-step-number">Step 1 of 2</div>
                <h2 className="audit-step-title">Target Identification</h2>
                <p className="audit-step-sub">Specify the company and role to initialize the Oracle sensors.</p>
              </div>

              {profileFailed && (
                <div className="signal-card" data-tone="amber" style={{ marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                  <span>⚠</span>
                  <p style={{ fontSize: '0.82rem', color: 'var(--amber)', margin: 0 }}>
                    Company not found in our verified database. Using industry defaults.
                  </p>
                </div>
              )}

              {/* Company input */}
              <div className="audit-field-group" style={{ position: 'relative' }}>
                <label htmlFor="company-input">Company Name</label>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={15}
                    style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-3)', pointerEvents: 'none', zIndex: 1,
                    }}
                  />
                  <input
                    id="company-input"
                    type="text"
                    placeholder="Search company..."
                    value={companySearch}
                    onChange={handleCompanySearch}
                    className="input"
                    style={{ paddingLeft: 38, paddingRight: isProfiling ? 100 : selectedCompany ? 90 : 16 }}
                    autoComplete="off"
                  />
                  {isProfiling && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
                      className="spinner" />
                  )}
                  {selectedCompany && !isProfiling && (
                    <span style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.62rem', color: 'var(--cyan)', fontWeight: 800,
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                    }}>
                      VERIFIED
                    </span>
                  )}
                </div>

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="audit-suggest-list">
                    {searchResults.map(res => {
                      const ratio = computeMatchRatio(companySearch, res.name);
                      const isPartialMatch = ratio < 0.80 && ratio >= FUZZY_MATCH_MIN_RATIO;
                      const isBelowThreshold = ratio < FUZZY_MATCH_MIN_RATIO;
                      return (
                        <div
                          key={res.name}
                          onClick={() => selectCompany(res)}
                          className="audit-suggest-item"
                          style={{ opacity: isBelowThreshold ? 0.45 : 1 }}
                        >
                          <div className="company-meta">
                            <div className="company-name">{res.name}</div>
                            <div className="company-industry">
                              {res.industry}
                              {(res as any).fromSupabase && (
                                <span style={{ marginLeft: 6, color: 'var(--cyan)', fontWeight: 700 }}>· Intelligence DB</span>
                              )}
                              {isPartialMatch && (
                                <span style={{ marginLeft: 6, color: 'var(--amber)', fontWeight: 700 }}>· partial match</span>
                              )}
                            </div>
                          </div>
                          {(res as any).riskScore != null && (
                            <span
                              className={`company-chip ${(res as any).riskScore >= 65 ? 'high' : (res as any).riskScore >= 45 ? 'medium' : 'low'}`}
                              style={{
                                background: (res as any).riskScore >= 65 ? 'rgba(239,68,68,0.15)' : (res as any).riskScore >= 45 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                color: (res as any).riskScore >= 65 ? 'var(--red)' : (res as any).riskScore >= 45 ? 'var(--amber)' : 'var(--emerald)',
                              }}
                            >
                              {(res as any).riskScore}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Match confirmation prompt */}
                {pendingMatchConfirmation && (
                  <div className="signal-card" data-tone="amber" style={{ marginTop: 'var(--space-2)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--amber)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                      Confirm company match
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                      You typed <strong style={{ color: 'var(--text)' }}>"{pendingMatchConfirmation.userQuery}"</strong>.
                      {' '}Closest match: <strong style={{ color: 'var(--text)' }}>{pendingMatchConfirmation.matchedName}</strong>.
                      {pendingMatchConfirmation.matchType === 'word_overlap' && (
                        <span style={{ color: 'var(--amber)' }}> These may be different entities.</span>
                      )}
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button
                        onClick={() => selectCompany(pendingMatchConfirmation.company, true)}
                        className="btn btn-ghost btn-sm"
                        style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', color: 'var(--amber)', fontWeight: 700 }}
                      >
                        Yes, use {pendingMatchConfirmation.matchedName}
                      </button>
                      <button
                        onClick={() => { setPendingMatchConfirmation(null); setSearchResults([]); setSelectedCompany(null); }}
                        className="btn btn-ghost btn-sm"
                      >
                        Search again
                      </button>
                    </div>
                    <p style={{ marginTop: 'var(--space-2)', fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.4 }}>
                      Without confirmation, company is treated as unknown and scored via role + industry signals only.
                    </p>
                  </div>
                )}

                {/* Disambiguation */}
                {showDisambiguation && disambiguationCandidates.length > 0 && (
                  <div className="signal-card" data-tone="amber" style={{ marginTop: 'var(--space-2)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--amber)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                      Multiple entities found — confirm which one:
                    </div>
                    {disambiguationCandidates.map(c => (
                      <button
                        key={c.name}
                        onClick={() => { setCompanySearch(c.name); setShowDisambiguation(false); setDisambiguationCandidates([]); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 'var(--space-1) 0', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 600 }}
                      >
                        → {c.name} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({c.industry})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Role input */}
              <div className="audit-field-group" style={{ position: 'relative', marginBottom: 'var(--space-8)' }} ref={roleInputRef}>
                <label htmlFor="role-input">Job Role</label>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={15}
                    style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-3)', pointerEvents: 'none', zIndex: 1,
                    }}
                  />
                  <input
                    id="role-input"
                    type="text"
                    placeholder="Search role..."
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="input"
                    style={{ paddingLeft: 38 }}
                    autoComplete="off"
                  />
                </div>

                {/* Role suggestions dropdown */}
                {showRoleSuggestions && (
                  <div className="audit-suggest-list">
                    {roleSuggestions.map((entry, idx) => {
                      const rColor = riskScoreColor(entry.currentRiskScore);
                      const dispClass = entry.currentRiskScore >= 65 ? 'high' : entry.currentRiskScore >= 45 ? 'medium' : 'low';
                      return (
                        <div
                          key={entry.oracleKey}
                          onClick={() => selectRole(entry)}
                          className={`audit-role-item${idx === focusedSuggestionIndex ? ' highlighted' : ''}`}
                        >
                          <div>
                            <div className="role-name">{entry.displayTitle}</div>
                            <div className="role-desc">{entry.summary.slice(0, 50)}…</div>
                          </div>
                          <span className={`audit-role-displacement ${dispClass}`}>
                            {entry.currentRiskScore}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Oracle preview cards */}
              {selectedOracleEntry && <RoleIntelPreviewCard entry={selectedOracleEntry} />}
              {selectedOracleEntry && <RoleResolutionBanner entry={selectedOracleEntry} />}

              {/* Warning states */}
              {oracleSelectionCleared && !selectedOracleEntry && (
                <div className="signal-card" data-tone="amber" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <span className="signal-chip signal-chip-mixed">No role linked</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    Pick from suggestions to restore calibrated data.
                  </span>
                </div>
              )}
              {!selectedOracleEntry && roleTitle.trim().length > 1 && !resolvedRolePreview.canonicalKey && (
                <div className="signal-card" data-tone="red" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <span className="signal-chip" style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)' }}>Unresolved role</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    Select a suggestion or use a title like "Software Developer" or "Data Analyst".
                  </span>
                </div>
              )}

              <button
                onClick={handleNextStep1}
                disabled={!canProceedStep1}
                className="btn btn-cyan btn-lg btn-full"
                style={{ marginTop: 'var(--space-6)' }}
              >
                Continue Analysis →
              </button>
            </div>
          ) : (
            <div>
              {/* Step header */}
              <div className="audit-step-header">
                <div className="audit-step-number">Step 2 of 2</div>
                <h2 className="audit-step-title">Individual Factors</h2>
                <p className="audit-step-sub">Contextual data for personalized risk amplification and shield metrics.</p>
              </div>

              <RiskPulse score={pulseScore} />

              {/* Tenure + Experience row */}
              <div className="audit-field-row" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="audit-field-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="tenure-select">Company Tenure</label>
                  <select id="tenure-select" value={tenureYears} onChange={(e) => setTenureYears(Number(e.target.value))} className="input">
                    <option value={0.3}>&lt; 6 months</option>
                    <option value={1.5}>1–2 years</option>
                    <option value={5}>5+ years</option>
                  </select>
                </div>
                <div className="audit-field-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="career-select">Total Experience</label>
                  <select id="career-select" value={careerYears} onChange={(e) => setCareerYears(Number(e.target.value))} className="input">
                    <option value={2}>&lt; 2 years</option>
                    <option value={7}>5–10 years</option>
                    <option value={15}>15+ years</option>
                  </select>
                </div>
              </div>

              {/* Performance tier */}
              <div className="audit-field-group" style={{ marginBottom: 'var(--space-1)' }}>
                <label>Performance Tier</label>
              </div>
              <ToggleGroup
                ariaLabel="Performance"
                options={[
                  { value: 'top',     label: 'Top',    icon: '★', desc: 'Exceeding targets' },
                  { value: 'average', label: 'High',   icon: '✔', desc: 'Meeting goals' },
                  { value: 'below',   label: 'Dev',    icon: '⚠', desc: 'Needs improvement' },
                ]}
                value={performanceTier}
                onChange={v => setPerformanceTier(v as "top" | "average" | "below" | "unknown")}
              />

              {/* Role uniqueness */}
              <div className="audit-field-group" style={{ marginBottom: uniquenessDepth === 'critical_knowledge' ? 'var(--space-1)' : 'var(--space-1)' }}>
                <label>Role Uniqueness</label>
              </div>
              <ToggleGroup
                ariaLabel="Role uniqueness depth"
                options={[
                  { value: 'generic',               label: 'Generic',    desc: 'Role exists at thousands of companies' },
                  { value: 'functional_specialist',  label: 'Specialist', desc: 'Unique expertise, replaceable with hiring' },
                  { value: 'critical_knowledge',     label: 'Critical',   desc: 'Irreplaceable institutional knowledge' },
                ]}
                value={uniquenessDepth}
                onChange={v => setUniquenessDepth(v as UniquenessDepth)}
              />

              {/* Knowledge type sub-classification */}
              {uniquenessDepth === 'critical_knowledge' && (
                <div style={{ marginBottom: 'var(--space-5)', paddingLeft: 'var(--space-4)', borderLeft: '2px solid rgba(0,212,224,0.2)' }}>
                  <div className="audit-field-group" style={{ marginBottom: 'var(--space-1)' }}>
                    <label>Type of institutional knowledge</label>
                  </div>
                  <ToggleGroup
                    ariaLabel="Knowledge type"
                    options={[
                      { value: 'system_specific',       label: 'System',     desc: 'Legacy code / proprietary system' },
                      { value: 'client_relationship',   label: 'Clients',    desc: 'Personal client trust — portable' },
                      { value: 'process_institutional', label: 'Process',    desc: 'Undocumented tribal knowledge' },
                      { value: 'domain_expert',         label: 'Domain',     desc: 'Regulatory / deep-domain expertise' },
                      { value: 'leadership_capital',    label: 'Leadership', desc: 'Org authority and team trust' },
                    ]}
                    value={knowledgeType}
                    onChange={v => setKnowledgeType(v as KnowledgeType)}
                  />
                </div>
              )}

              {/* Signal toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                {[
                  { key: 'promo',  label: 'Recent Promotion',  active: hasRecentPromotion,   setter: setHasRecentPromotion,   icon: '↗', desc: 'Promoted in the last 12 months' },
                  { key: 'stake',  label: 'Key Relationships', active: hasKeyRelationships,  setter: setHasKeyRelationships,  icon: '🤝', desc: 'Own critical client/stakeholder relationships' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => item.setter(!item.active)}
                    className={`signal-card${item.active ? '' : ''}`}
                    data-tone={item.active ? 'cyan' : 'slate'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      transition: 'all var(--dur-base) var(--ease-out)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{item.desc}</div>
                    </div>
                    {item.active && (
                      <span className="signal-chip signal-chip-live" style={{ flexShrink: 0 }}>Active</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Financial runway */}
              <div style={{ marginBottom: 'var(--space-7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <div className="audit-section-title">Financial Runway <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800,
                    color: financialRunwayMonths === 0 ? 'var(--text-3)'
                      : financialRunwayMonths < 3  ? 'var(--red)'
                      : financialRunwayMonths < 6  ? 'var(--orange)'
                      : financialRunwayMonths < 12 ? 'var(--amber)'
                      : 'var(--emerald)',
                    padding: 'var(--space-1) var(--space-3)',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {financialRunwayMonths === 0 ? 'Not specified'
                      : financialRunwayMonths < 3  ? `${financialRunwayMonths}mo — Critical`
                      : financialRunwayMonths < 6  ? `${financialRunwayMonths}mo — Elevated`
                      : financialRunwayMonths < 12 ? `${financialRunwayMonths}mo — Comfortable`
                      : `${financialRunwayMonths}mo — Strong`}
                  </div>
                </div>

                <input
                  type="range" min={0} max={24} step={1}
                  value={financialRunwayMonths}
                  onChange={e => setFinancialRunwayMonths(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: financialRunwayMonths === 0 ? 'var(--text-3)'
                      : financialRunwayMonths < 3  ? '#ef4444'
                      : financialRunwayMonths < 6  ? '#f97316'
                      : financialRunwayMonths < 12 ? '#f59e0b'
                      : '#10b981',
                    cursor: 'pointer', height: '6px', borderRadius: '3px',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                  {[
                    { label: 'Not set',    val: 0 },
                    { label: 'Critical',   val: 3,  color: 'var(--red)' },
                    { label: 'Elevated',   val: 6,  color: 'var(--orange)' },
                    { label: 'Comfortable',val: 12, color: 'var(--amber)' },
                    { label: '24+ Strong', val: 24, color: 'var(--emerald)' },
                  ].map(m => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setFinancialRunwayMonths(m.val)}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700,
                        color: financialRunwayMonths >= m.val && m.val > 0 ? (m.color ?? 'var(--text-2)') : 'var(--text-3)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 'var(--space-1) 0',
                        opacity: financialRunwayMonths === m.val ? 1 : 0.5,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 'var(--space-2)', lineHeight: 1.4, opacity: 0.7 }}>
                  Months of living expenses saved. Personalizes your job search strategy and move sequence.
                </p>
              </div>

              {/* CTA row */}
              <div className="audit-cta-row">
                <button onClick={() => setStep(1)} className="btn-back">
                  ← Back
                </button>
                <button
                  onClick={handleCalculate}
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                >
                  Execute Full Audit →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
