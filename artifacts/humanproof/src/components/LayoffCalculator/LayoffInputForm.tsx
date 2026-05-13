import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLayoff } from "../../context/LayoffContext";
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
import { Building, Info, Zap, Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { UniquenessDepth } from "../../services/layoffScoreEngine";
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

interface Props {
  onNext: () => void;
}

const ToggleGroup: React.FC<{
  options: { value: string; label: string; icon?: React.ReactNode; desc?: string }[];
  value: string;
  onChange: (val: string) => void;
  ariaLabel: string;
}> = ({ options, value, onChange, ariaLabel }) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    style={{
      display: "grid",
      gridTemplateColumns: options.length > 2 ? "repeat(auto-fit, minmax(120px, 1fr))" : "1fr 1fr",
      gap: "10px",
      marginBottom: "20px",
    }}
  >
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          role="radio"
          aria-checked={active}
          onClick={() => onChange(opt.value)}
          className={`card card-hover ${active ? "glow-border" : ""}`}
          style={{
            padding: "12px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            background: active ? "var(--cyan-dim)" : "rgba(255,255,255,0.03)",
            borderColor: active ? "var(--cyan)" : "var(--border)",
            cursor: "pointer",
            transition: "all 0.2s ease-out",
          }}
        >
          {opt.icon && <div style={{ fontSize: "1.2rem", color: active ? "var(--cyan)" : "var(--text-3)" }}>{opt.icon}</div>}
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: active ? "var(--text)" : "var(--text-2)" }}>{opt.label}</div>
          {opt.desc && <div style={{ fontSize: "0.65rem", color: "var(--text-3)", lineHeight: 1.2 }}>{opt.desc}</div>}
        </button>
      );
    })}
  </div>
);

const RiskPulse: React.FC<{ score: number }> = ({ score }) => {
  const color = riskScoreColor(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
      <div style={{ position: 'relative', width: 12, height: 12 }}>
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: color }} 
        />
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-3)' }}>LIVE RISK PULSE</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color }}>{score}%</span>
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

// ── Mini risk trend sparkline ────────────────────────────────────────────
const MiniSparkline: React.FC<{ trend: { riskScore: number }[]; color: string }> = ({
  trend,
  color,
}) => {
  if (!trend || trend.length < 2) return null;
  const W = 52,
    H = 20;
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

// ── Risk direction icon ──────────────────────────────────────────────────
const DirectionIcon: React.FC<{ direction: OracleRoleEntry["riskDirection"]; size?: number }> = ({
  direction,
  size = 12,
}) => {
  if (direction === "rising")
    return <TrendingUp size={size} color="#ef4444" />;
  if (direction === "falling")
    return <TrendingDown size={size} color="#10b981" />;
  return <Minus size={size} color="#f59e0b" />;
};

// ── Role Intelligence Preview Card (shown after role selection) ──────────
const RoleIntelPreviewCard: React.FC<{ entry: OracleRoleEntry }> = ({ entry }) => {
  const riskColor = riskScoreColor(entry.currentRiskScore);
  return (
    <div
      style={{
        margin: "8px 0 20px",
        padding: "14px 16px",
        background: `${riskColor}08`,
        border: `1px solid ${riskColor}30`,
        borderRadius: "10px",
        animation: "slideDown 0.25s ease-out",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div
            style={{
              color: riskColor,
              fontSize: "0.62rem",
              letterSpacing: "1.5px",
              fontFamily: "monospace",
              marginBottom: "2px",
              textTransform: "uppercase",
            }}
          >
            ORACLE ROLE INTELLIGENCE
          </div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>
            {entry.displayTitle}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <div
            style={{
              background: `${riskColor}18`,
              border: `1px solid ${riskColor}40`,
              borderRadius: "6px",
              padding: "3px 10px",
              color: riskColor,
              fontSize: "0.85rem",
              fontWeight: 800,
              fontFamily: "monospace",
            }}
          >
            {entry.currentRiskScore}%
          </div>
          <div style={{ color: "#6b7280", fontSize: "0.62rem", fontFamily: "monospace" }}>
            {riskScoreLabel(entry.currentRiskScore)}
          </div>
        </div>
      </div>

      {/* Summary */}
      <p style={{ margin: "0 0 10px", color: "#9ba5b4", fontSize: "0.82rem", lineHeight: 1.5 }}>
        {entry.summary.length > 120 ? entry.summary.slice(0, 120) + "…" : entry.summary}
      </p>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
        {/* Safe skill */}
        {entry.topSafeSkill && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "0.72rem",
              color: "#10b981",
            }}
          >
            <Shield size={10} />
            {entry.topSafeSkill.length > 28 ? entry.topSafeSkill.slice(0, 28) + "…" : entry.topSafeSkill}
          </div>
        )}
        {/* At-risk skill */}
        {entry.topAtRiskSkill && entry.topAtRiskSkill !== "None" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "0.72rem",
              color: "#f59e0b",
            }}
          >
            <Zap size={10} />
            {entry.topAtRiskSkill.length > 28 ? entry.topAtRiskSkill.slice(0, 28) + "…" : entry.topAtRiskSkill}
          </div>
        )}
      </div>

      {/* Trend + tags */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MiniSparkline trend={entry.riskTrend} color={riskColor} />
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <DirectionIcon direction={entry.riskDirection} size={11} />
            <span
              style={{
                color: entry.riskDirection === "rising" ? "#ef4444" : entry.riskDirection === "falling" ? "#10b981" : "#f59e0b",
                fontSize: "0.65rem",
                fontFamily: "monospace",
              }}
            >
              {entry.riskDirection === "rising" ? "Risk rising" : entry.riskDirection === "falling" ? "Risk falling" : "Stable"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {entry.contextTags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                background: "rgba(124,58,255,0.12)",
                border: "1px solid rgba(124,58,255,0.25)",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "0.6rem",
                color: "#a78bfa",
                fontFamily: "monospace",
                letterSpacing: "0.5px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Confidence */}
      <div
        style={{
          marginTop: "8px",
          fontSize: "0.62rem",
          color: "#4b5563",
          fontFamily: "monospace",
          textAlign: "right",
        }}
      >
        Oracle confidence: {entry.confidenceScore}%
      </div>
    </div>
  );
};

// ── RoleResolutionBanner ──────────────────────────────────────────────────────
// Shown below RoleIntelPreviewCard after the user selects a role.
// Two states:
//   found    → confirms the resolved key + coverage stats so the user knows
//              what the Skills & Career tab will show before they submit.
//   fallback → the oracle key has no career intelligence entry; the dashboard
//              will use buildFallbackIntel (score-derived generic content).
//              Shows a feedback link so users can request database coverage.

const RoleResolutionBanner: React.FC<{ entry: OracleRoleEntry }> = ({ entry }) => {
  const intel = useMemo(() => getCareerIntelligence(entry.oracleKey), [entry.oracleKey]);

  if (intel) {
    const atRiskCount = intel.skills.at_risk?.length ?? 0;
    const safeCount   = intel.skills.safe?.length ?? 0;
    const pathCount   = intel.careerPaths?.length ?? 0;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.22)',
          marginTop: '-12px',
          marginBottom: '16px',
        }}
      >
        {/* Resolution confirmation line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#10b981', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            ✓ Resolved
          </span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 600 }}>
            Analyzing as: {intel.displayRole}
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '0.65rem',
              fontFamily: 'monospace',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '4px',
              padding: '1px 6px',
            }}
          >
            key: {entry.oracleKey}
          </span>
        </div>
        {/* Coverage stats */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>Intelligence coverage:</span>
          {atRiskCount > 0 && (
            <span style={{ color: '#f59e0b', fontSize: '0.72rem', fontFamily: 'monospace' }}>
              {atRiskCount} at-risk skill{atRiskCount !== 1 ? 's' : ''}
            </span>
          )}
          {safeCount > 0 && (
            <span style={{ color: '#10b981', fontSize: '0.72rem', fontFamily: 'monospace' }}>
              {safeCount} safe skill{safeCount !== 1 ? 's' : ''}
            </span>
          )}
          {pathCount > 0 && (
            <span style={{ color: '#818cf8', fontSize: '0.72rem', fontFamily: 'monospace' }}>
              {pathCount} transition path{pathCount !== 1 ? 's' : ''}
            </span>
          )}
          {atRiskCount === 0 && safeCount === 0 && pathCount === 0 && (
            <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>basic</span>
          )}
        </div>
      </div>
    );
  }

  // Fallback — no CareerIntelligence entry for this oracle key
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.25)',
        marginTop: '-12px',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ color: '#f59e0b', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
          ⚠ Limited Coverage
        </span>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>
          Role not in our database — analysis generated from risk score.
        </span>
      </div>
      <div style={{ color: '#6b7280', fontSize: '0.72rem', lineHeight: 1.5 }}>
        Coverage: <span style={{ color: '#f59e0b' }}>basic</span>. Skills &amp; Career tab will show general guidance, not role-specific intelligence.{' '}
        <a
          href="/contact"
          style={{ color: '#818cf8', textDecoration: 'underline', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); window.open('/contact', '_blank'); }}
        >
          Request coverage for your role →
        </a>
      </div>
    </div>
  );
};

export const LayoffInputForm: React.FC<Props> = ({ onNext }) => {
  const { state, dispatch } = useLayoff();
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
  // v6.0 Audit Fix: Disambiguation state — when Supabase returns multiple fuzzy matches
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<Array<{
    name: string; industry: string; region: string; riskScore: number;
  }>>([]);
  const [showDisambiguation, setShowDisambiguation] = useState(false);

  // Match confirmation prompt — shown when user clicks a result with confidence < 0.8.
  // The pending company is held here; it is NOT committed to selectedCompany until
  // the user explicitly confirms. This prevents a word_overlap match from driving a
  // score without the user knowing which company was actually matched.
  const [pendingMatchConfirmation, setPendingMatchConfirmation] = useState<{
    company:     any;           // the search result object
    matchedName: string;        // the DB company name that was matched
    confidence:  number;        // 0.5 or 0.7
    matchType:   MatchType;
    userQuery:   string;        // what the user originally typed
  } | null>(null);

  // Role search state — oracle-backed
  const [roleTitle, setRoleTitle] = useState(state.roleTitle || "");
  const [selectedOracleEntry, setSelectedOracleEntry] = useState<OracleRoleEntry | null>(null);
  const [roleSuggestions, setRoleSuggestions] = useState<OracleRoleEntry[]>([]);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  // Tracks whether a previously confirmed selection was cleared by editing the field.
  // When true, a warning badge is shown so the user knows calibrated data is no longer linked.
  const [oracleSelectionCleared, setOracleSelectionCleared] = useState(false);
  const roleInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [tenureYears, setTenureYears] = useState(state.userFactors?.tenureYears || 1.5);
  /** BUG-C1 FIX: Total career years across ALL jobs (not just current company) */
  const [careerYears, setCareerYears] = useState(state.userFactors?.careerYears ?? 5);
  // Priority 3: 3-level uniqueness depth replaces Yes/No toggle
  const [uniquenessDepth, setUniquenessDepth] = useState<UniquenessDepth>(
    state.userFactors?.uniquenessDepth ??
    (state.userFactors?.isUniqueRole ? 'critical_knowledge' : 'generic')
  );
  // Keep isUniqueRole derived for backward compat
  const isUniqueRole = uniquenessDepth === 'critical_knowledge';
  const [performanceTier, setPerformanceTier] = useState(
    state.userFactors?.performanceTier || "average"
  );
  const [hasRecentPromotion, setHasRecentPromotion] = useState(
    state.userFactors?.hasRecentPromotion ?? false
  );
  // v10.0: Financial runway — months of expenses covered. 0 = not provided.
  const [financialRunwayMonths, setFinancialRunwayMonths] = useState<number>(0);

  const [hasKeyRelationships, setHasKeyRelationships] = useState(
    state.userFactors?.hasKeyRelationships ?? false
  );

  // ── Step 2 Logic Hits Unconditionally ────────────────────────────────
  // Simple heuristic for "Pulse" score calculation
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

  // ── Company search with debounce — queries Supabase 2000-company table first ──
  // Resolution order: Supabase (2000 companies) → local bridge (50) → Clearbit (name/logo only)
  // v13.0 fix: AbortController cancels in-flight requests when the query changes,
  // preventing stale results from a slow previous request from overwriting fresh ones.
  useEffect(() => {
    const controller = new AbortController();
    const tid = setTimeout(async () => {
      if (!companySearch || companySearch.length < 2 || selectedCompany) {
        setSearchResults([]);
        return;
      }
      // Reject queries that are pure whitespace or excessively long (prevents ILIKE abuse)
      const trimmed = companySearch.trim();
      if (trimmed.length === 0 || trimmed.length > 100) {
        setSearchResults([]);
        return;
      }

      // 1. Supabase company_intelligence (2000 companies) — try first
      // If multiple candidates with the same root name exist, surface disambiguation
      let merged: any[] = [];
      try {
        const supabaseResults = await searchSupabaseCompanies(companySearch, 10);
        // Disambiguation: if ≥2 results share the first word of the query, let the user pick
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
        // Only push entries with valid names — null company_name from DB would
        // crash every subsequent .name.toLowerCase() call in this effect.
        supabaseResults.filter(r => r.name != null && r.name.length > 0).slice(0, 8).forEach(r => {
          merged.push({
            name: r.name,
            industry: r.industry,
            isPublic: false,
            region: "GLOBAL",
            employeeCount: 0,
            layoffsLast24Months: [],
            layoffRounds: 0,
            lastLayoffPercent: null,
            revenuePerEmployee: 150000,
            aiInvestmentSignal: "medium",
            source: "Supabase Intelligence",
            lastUpdated: new Date().toISOString(),
            riskScore: r.riskScore,
            isExternal: false,
            fromSupabase: true,
          } as any);
        });
      } catch (_) { /* Supabase unavailable — fall through */ }

      // 2. Local code-side bridge (50 companies) — supplement Supabase results
      const local = searchAllCompanies(companySearch).map((c) => {
        const fullData = resolveCompanyData(c.key);
        return { ...(fullData as any), isExternal: false, fromSupabase: false };
      });
      local.forEach(loc => {
        if (loc.name && !merged.find(m => m.name != null && m.name.toLowerCase() === loc.name.toLowerCase())) {
          merged.push(loc);
        }
      });

      // 3. Clearbit fallback for name/logo only (when Supabase + local have < 3 results)
      if (merged.length < 3) {
        try {
          const resp = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companySearch)}`);
          if (resp.ok) {
            const external = await resp.json();
            external.forEach((ext: any) => {
              if (ext.name && !merged.find((m) => m.name != null && m.name.toLowerCase() === ext.name.toLowerCase())) {
                merged.push({
                  name: ext.name,
                  logo: ext.logo,
                  domain: ext.domain,
                  isPublic: false,
                  industry: "Unknown — full analysis on submit",
                  region: "GLOBAL",
                  employeeCount: 0,
                  layoffsLast24Months: [],
                  layoffRounds: 0,
                  lastLayoffPercent: null,
                  revenuePerEmployee: 150000,
                  aiInvestmentSignal: "medium",
                  source: "Clearbit",
                  lastUpdated: new Date().toISOString(),
                  isExternal: true,
                } as any);
              }
            });
          }
        } catch (_) { /* Clearbit unavailable */ }
      }

      // Only update state if this request was not cancelled by a newer search
      if (!controller.signal.aborted) {
        setSearchResults(merged.slice(0, 10));
      }
    }, 300);
    return () => {
      clearTimeout(tid);
      controller.abort(); // cancel any in-flight async operations from this effect
    };
  }, [companySearch, selectedCompany]);


  // ── Oracle role search with debounce ─────────────────────────────────
  useEffect(() => {
    const tid = setTimeout(() => {
      if (roleTitle.length >= 2) {
        const results = searchOracleRoles(roleTitle, 8);
        setRoleSuggestions(results);
        setShowRoleSuggestions(results.length > 0);
        setFocusedSuggestionIndex(-1);
        // If user edited the field past the point where it still matches the confirmed
        // selection, clear it and raise the warning flag so the UI can tell the user.
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

  // Handle keyboard navigation for role suggestions — ENHANCEMENT-E3
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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleInputRef.current && !roleInputRef.current.contains(e.target as Node)) {
        setShowRoleSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Company search trigger ──────────────────────────────────────────
  const handleCompanySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanySearch(val);
    setSelectedCompany(null);
    setPendingMatchConfirmation(null);  // dismiss stale prompt when user retypes
  };

  const selectCompany = async (comp: any, skipConfidenceCheck = false) => {
    // Compute match confidence between what the user typed and the result name.
    // word_overlap (0.5) must never drive a score without explicit confirmation —
    // "Wipro BPO" → "Wipro" is a different legal entity and a different risk profile.
    if (!skipConfidenceCheck && companySearch && comp.name) {
      const { score: confidence, matchType } = computeMatchConfidence(companySearch, comp.name);
      if (confidence < MATCH_CONFIRMATION_THRESHOLD) {
        // Hold the result pending user confirmation; do not commit yet.
        setPendingMatchConfirmation({
          company:     comp,
          matchedName: comp.name,
          confidence,
          matchType,
          userQuery:   companySearch,
        });
        setSearchResults([]);
        return;
      }
    }
    setPendingMatchConfirmation(null);
    setCompanySearch(comp.name);
    setSearchResults([]);
    if (comp.isExternal) {
      // BUG-B20 FIX: Quick re-lookup in local DB before firing expensive profile API.
      // Clearbit might return "Meta" while DB has "Meta Platforms" — we want to find the DB entry if possible.
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
          ...comp,
          industry: profile.industry,
          isPublic: profile.isPublic,
          employeeCount: profile.employeeCount,
          region: profile.region,
          ticker: profile.ticker,
          source: `AI Profile (${comp.name})`,
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
        name: companySearch,
        isPublic: profile?.isPublic ?? false,
        industry: profile?.industry ?? "Technology",
        region: profile?.region ?? "GLOBAL",
        employeeCount: profile?.employeeCount ?? 500,
        ticker: profile?.ticker,
        revenueGrowthYoY: null,
        stock90DayChange: null,
        layoffsLast24Months: [],
        layoffRounds: 0,
        lastLayoffPercent: null,
        revenuePerEmployee: 150000,
        aiInvestmentSignal: "medium",
        source: profile ? `AI Profile (${companySearch})` : "User Input",
        lastUpdated: new Date().toISOString(),
      };
    }

    // Auto-derive department from oracle key
    const department = resolvedRole.canonicalKey
      ? getAutoDeducedDepartment(resolvedRole.canonicalKey)
      : "Operations";

    dispatch({ type: "SET_COMPANY_DATA", payload: finalCompany });
    dispatch({
      type: "SET_INPUTS",
      payload: {
        companyName: finalCompany.name,
        roleTitle: roleTitle.trim(),
        department,
        oracleKey: resolvedRole.canonicalKey,
      },
    });
    setStep(2);
  };

  const handleCalculate = () => {
    // BUG-GAP8 FIX: Logic validation — career years cannot be less than company tenure
    let validatedCareerYears = careerYears;
    if (careerYears < tenureYears) {
      validatedCareerYears = tenureYears;
      setCareerYears(tenureYears);
    }

    dispatch({
      type: "SET_INPUTS",
      payload: {
        userFactors: {
          tenureYears,
          careerYears: validatedCareerYears,
          isUniqueRole,
          uniquenessDepth,
          performanceTier: performanceTier as "top" | "average" | "below" | "unknown",
          hasRecentPromotion,
          hasKeyRelationships,
          financialRunwayMonths, // v10.0: passed to fetchAuditData for personalized strategy
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#fff",
    marginBottom: "16px",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "8px",
    color: "#d1d5db",
    fontSize: "0.9rem",
  };


  return (
    <div style={{ maxWidth: "520px", margin: "0 auto" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3 }}
          className="glass-panel"
          style={{ padding: 'clamp(20px, 5vw, 32px)', borderRadius: 'var(--radius-xl)' }}
        >
          {step === 1 ? (
             <div>
              <header style={{ marginBottom: '32px' }}>
                <div className="badge badge-cyan" style={{ marginBottom: '12px' }}>STEP 01/02</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '8px' }}>Target Identification</h2>
                <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Specify the company and role to initialize the Oracle sensors.</p>
              </header>

              {profileFailed && (
                <div style={{
                  background: "rgba(245,158,11,0.1)", border: "1px solid #f59e0b",
                  borderRadius: "8px", padding: "12px", marginBottom: "20px",
                  fontSize: "0.82rem", color: "#f59e0b", display: "flex", gap: "10px",
                }}>
                  <span>⚠</span>
                  <p>Company not found in our verified database. Using industry defaults.</p>
                </div>
              )}

              <div className="input-wrap" style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>COMPANY NAME</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search company..."
                    value={companySearch}
                    onChange={handleCompanySearch}
                    className="input"
                    style={{ paddingRight: '100px' }}
                  />
                  {isProfiling && <div style={{ position: 'absolute', right: '12px', top: '16px' }} className="spinner" />}
                  {selectedCompany && !isProfiling && <span style={{ position: 'absolute', right: '12px', top: '16px', fontSize: '0.65rem', color: 'var(--cyan)', fontWeight: 800 }}>VERIFIED</span>}
                </div>
                {searchResults.length > 0 && (
                  <div className="glass-panel-heavy" style={{ position: "absolute", zIndex: 100, width: '100%', marginTop: '56px', borderRadius: '12px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                    {searchResults.map(res => {
                      // Compute match ratio between what the user typed and this result name.
                      // Shown as a subtle indicator so users can spot when the result
                      // is a partial/parent-company match (e.g. "Wipro BPO" → "Wipro").
                      const ratio = computeMatchRatio(companySearch, res.name);
                      const isPartialMatch = ratio < 0.80 && ratio >= FUZZY_MATCH_MIN_RATIO;
                      const isBelowThreshold = ratio < FUZZY_MATCH_MIN_RATIO;
                      return (
                        <div key={res.name} onClick={() => selectCompany(res)} className="tab-btn" style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', height: 'auto', borderRadius: 0, borderBottom: '1px solid var(--border)', opacity: isBelowThreshold ? 0.45 : 1 }}>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontWeight: 700 }}>{res.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                              {res.industry}
                              {(res as any).fromSupabase && (
                                <span style={{ marginLeft: 6, color: 'var(--cyan)', fontWeight: 700 }}>· Intelligence DB</span>
                              )}
                              {isPartialMatch && (
                                <span style={{ marginLeft: 6, color: '#f59e0b', fontWeight: 700 }}>· partial match</span>
                              )}
                            </div>
                          </div>
                          {(res as any).riskScore != null && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: (res as any).riskScore >= 65 ? '#ef4444' : (res as any).riskScore >= 45 ? '#f59e0b' : '#10b981' }}>
                              {(res as any).riskScore}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Match confirmation prompt — shown when confidence < 0.8 */}
                {pendingMatchConfirmation && (
                  <div style={{ marginTop: '4px', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Confirm company match
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
                      You typed <span style={{ fontWeight: 700, color: 'var(--text)' }}>"{pendingMatchConfirmation.userQuery}"</span>.
                      {' '}The closest match is <span style={{ fontWeight: 700, color: 'var(--text)' }}>{pendingMatchConfirmation.matchedName}</span>.
                      {pendingMatchConfirmation.matchType === 'word_overlap' && (
                        <span style={{ color: '#f59e0b' }}> These may be different entities — confirm before scores are calculated.</span>
                      )}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          // User confirmed — proceed with the matched company
                          selectCompany(pendingMatchConfirmation.company, true);
                        }}
                        style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Yes, use {pendingMatchConfirmation.matchedName}
                      </button>
                      <button
                        onClick={() => {
                          // User rejected — fall back to unknown company using their original query.
                          // This triggers the Tier C scoring path (scope framing, no hallucinated data).
                          setPendingMatchConfirmation(null);
                          setSearchResults([]);
                          // Keep companySearch as the user's original text so they can refine it,
                          // but clear selectedCompany so no matched data feeds the score.
                          setSelectedCompany(null);
                        }}
                        style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        No, search again
                      </button>
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.4 }}>
                      If you proceed without confirming, your company will be treated as unknown and scored using role and industry signals only.
                    </div>
                  </div>
                )}

                {/* v6.0 Audit Fix: Disambiguation banner — multiple Supabase entities share this name */}
                {showDisambiguation && disambiguationCandidates.length > 0 && (
                  <div style={{ marginTop: '4px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--amber, #f59e0b)', background: 'rgba(245,158,11,0.08)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--amber, #f59e0b)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Multiple entities found — confirm which one:
                    </div>
                    {disambiguationCandidates.map(c => (
                      <button key={c.name} onClick={() => {
                        setCompanySearch(c.name);
                        setShowDisambiguation(false);
                        setDisambiguationCandidates([]);
                      }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}
                      >
                        → {c.name} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({c.industry})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="input-wrap" style={{ marginBottom: '32px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>JOB ROLE</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search role..."
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="input"
                  />
                </div>
                {showRoleSuggestions && (
                   <div className="glass-panel-heavy" style={{ position: "absolute", zIndex: 100, width: '100%', marginTop: '80px', borderRadius: '12px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                    {roleSuggestions.map(entry => (
                      <div key={entry.oracleKey} onClick={() => selectRole(entry)} className="tab-btn" style={{ width: '100%', justifyContent: 'space-between', padding: '12px 16px', height: 'auto', borderRadius: 0, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700 }}>{entry.displayTitle}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{entry.summary.slice(0, 40)}...</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: riskScoreColor(entry.currentRiskScore) }}>{entry.currentRiskScore}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedOracleEntry && <RoleIntelPreviewCard entry={selectedOracleEntry} />}
              {selectedOracleEntry && <RoleResolutionBanner entry={selectedOracleEntry} />}
              {oracleSelectionCleared && !selectedOracleEntry && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>No role linked</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Your edit cleared the selected role. Pick from the suggestions to restore calibrated data.</span>
                </div>
              )}
              {!selectedOracleEntry && roleTitle.trim().length > 1 && !resolvedRolePreview.canonicalKey && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unresolved role</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Select a suggested role or use a canonical title like Software Developer, Backend Developer, or Database Administrator.</span>
                </div>
              )}

              <button
                onClick={handleNextStep1}
                disabled={!canProceedStep1}
                className="btn btn-cyan btn-lg btn-full"
                style={{ marginTop: '24px' }}
              >
                Continue Analysis →
              </button>
            </div>
          ) : (
            <div>
              <header style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                   <div className="badge badge-cyan">STEP 02/02</div>
                   <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm" style={{ padding: 0, color: 'var(--text-3)' }}>← Back</button>
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '8px' }}>Individual Factors</h2>
                <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Contextual data for human amplification and shield metrics.</p>
              </header>

              <RiskPulse score={pulseScore} />

              <div className="grid-2" style={{ gap: '20px', marginBottom: '24px' }}>
                 <div className="input-wrap">
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)' }}>COMPANY TENURE</label>
                    <select value={tenureYears} onChange={(e) => setTenureYears(Number(e.target.value))} className="input">
                      <option value={0.3}>&lt; 6 months</option>
                      <option value={1.5}>1–2 years</option>
                      <option value={5}>5+ years</option>
                    </select>
                 </div>
                 <div className="input-wrap">
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)' }}>TOTAL EXPERIENCE</label>
                    <select value={careerYears} onChange={(e) => setCareerYears(Number(e.target.value))} className="input">
                      <option value={2}>&lt; 2 years</option>
                      <option value={7}>5–10 years</option>
                      <option value={15}>15+ years</option>
                    </select>
                 </div>
              </div>

              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: '8px' }}>PERFORMANCE TIER</label>
              <ToggleGroup
                ariaLabel="Performance"
                options={[
                  { value: 'top', label: 'Top', icon: '★', desc: 'Exceeding targets' },
                  { value: 'average', label: 'High', icon: '✔', desc: 'Meeting goals' },
                  { value: 'below', label: 'Dev', icon: '⚠', desc: 'Needs improvement' }
                ]}
                value={performanceTier}
                onChange={v => setPerformanceTier(v as "top" | "average" | "below" | "unknown")}
              />

              {/* Priority 3: 3-Level Uniqueness Depth (replaces Yes/No toggle) */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Role Uniqueness 💎
                </div>
                <ToggleGroup
                  ariaLabel="Role uniqueness depth"
                  options={[
                    { value: 'generic', label: 'Generic', desc: 'Role exists at thousands of companies' },
                    { value: 'functional_specialist', label: 'Specialist', desc: 'Unique expertise, replaceable with hiring' },
                    { value: 'critical_knowledge', label: 'Critical', desc: 'Irreplaceable institutional knowledge' },
                  ]}
                  value={uniquenessDepth}
                  onChange={v => setUniquenessDepth(v as UniquenessDepth)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {[
                    { key: 'promo', label: 'Recent Promotion', active: hasRecentPromotion, setter: setHasRecentPromotion, icon: '↗' },
                    { key: 'stake', label: 'Key Relationships', active: hasKeyRelationships, setter: setHasKeyRelationships, icon: '🤝' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => item.setter(!item.active)}
                      className="card card-hover"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                        background: item.active ? 'var(--cyan-dim)' : 'rgba(255,255,255,0.03)',
                        borderColor: item.active ? 'var(--cyan)' : 'var(--border)',
                        justifyContent: 'flex-start'
                      }}
                    >
                      <div style={{ fontSize: '1rem' }}>{item.icon}</div>
                      <div style={{ flex: 1, textAlign: 'left', fontSize: '0.85rem', fontWeight: 700 }}>{item.label}</div>
                      {item.active && <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 800 }}>ACTIVE</div>}
                    </button>
                  ))}
              </div>

              {/* v10.0: Financial Runway — personalizes job search strategy */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Financial Runway 💰 <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800,
                    color: financialRunwayMonths === 0 ? 'var(--text-3)'
                      : financialRunwayMonths < 3 ? '#ef4444'
                      : financialRunwayMonths < 6 ? '#f97316'
                      : financialRunwayMonths < 12 ? '#f59e0b'
                      : '#10b981',
                    padding: '2px 8px', borderRadius: '5px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {financialRunwayMonths === 0 ? 'Not specified'
                      : financialRunwayMonths < 3 ? `${financialRunwayMonths}mo — Critical`
                      : financialRunwayMonths < 6 ? `${financialRunwayMonths}mo — Elevated`
                      : financialRunwayMonths < 12 ? `${financialRunwayMonths}mo — Comfortable`
                      : `${financialRunwayMonths}mo — Strong`}
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={financialRunwayMonths}
                  onChange={e => setFinancialRunwayMonths(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: financialRunwayMonths === 0 ? 'var(--text-3)'
                      : financialRunwayMonths < 3 ? '#ef4444'
                      : financialRunwayMonths < 6 ? '#f97316'
                      : financialRunwayMonths < 12 ? '#f59e0b'
                      : '#10b981',
                    cursor: 'pointer',
                    height: '6px',
                    borderRadius: '3px',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  {[
                    { label: 'Not set', val: 0 },
                    { label: 'Critical', val: 3, color: '#ef4444' },
                    { label: 'Elevated', val: 6, color: '#f97316' },
                    { label: 'Comfortable', val: 12, color: '#f59e0b' },
                    { label: 'Strong 24+', val: 24, color: '#10b981' },
                  ].map(m => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setFinancialRunwayMonths(m.val)}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700,
                        color: financialRunwayMonths >= m.val && m.val > 0 ? (m.color ?? 'var(--text-2)') : 'var(--text-3)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '2px 0', opacity: financialRunwayMonths === m.val ? 1 : 0.5,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '6px', lineHeight: 1.4, opacity: 0.7 }}>
                  Months of living expenses you have saved. Personalizes your job search strategy and move sequence.
                </p>
              </div>

              <button
                onClick={handleCalculate}
                className="btn btn-primary btn-lg btn-full"
                style={{ background: 'var(--text)', color: 'var(--bg)' }}
              >
                Execute Full Audit →
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
