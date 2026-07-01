// JobMarketLiquidityCard.tsx — v2.0
//
// Enhanced: surfaces cityMarketIntelligence, geoSupplySurge, remoteFirstAdvantage,
// barriers/accelerators, salary preservation, and a new Location-Based Suggestions
// section that auto-detects the user's browser location and ranks nearby cities
// by opportunity score for their role.
//
// Previous version only used 8 of the ~20 fields the engine computed.

import React, { useState, useEffect, useCallback } from 'react';
import { Waves, MapPin, ChevronDown, ChevronUp, AlertTriangle, Globe, Navigation, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  US_CITY_MARKET_PROFILES,
  resolveUSCityMarket,
  resolveRoleCategoryKey,
  type USCityMarketProfile,
  type USCityRoleData,
} from '../../../data/usCityMarketIntelligence';

// ── Types (full shape from jobMarketLiquidityService) ─────────────────────────

interface LiquidityFactor {
  name: string;
  value: number;
  weight: number;
  label: string;
  detail: string;
}

interface JobMarketLiquidity {
  // Core
  reemploymentWeeks?: number;
  reemploymentWeeksLow?: number;
  reemploymentWeeksHigh?: number;
  marketFriction?: 'low' | 'moderate' | 'high' | 'very_high';
  activePostings?: number;
  demandRatio?: number;
  roleInRegionTrend?: 'rising' | 'stable' | 'declining';
  liquidityScore?: number;
  marketNote?: string;
  // Extended fields now consumed
  factors?: LiquidityFactor[];
  keyBarriers?: string[];
  keyAccelerators?: string[];
  salaryPreservation?: number;
  marketDemandTrend?: 'rising' | 'stable' | 'falling';
  confidenceNote?: string | null;
  tier?: 'Fast' | 'Moderate' | 'Slow' | 'Very Slow';
  monthsToReemploy?: number;
  geoSupplySurge?: {
    metroName: string;
    geoConcentrationScore: number;
    geoClusterActiveCuts: number;
    surgeMonthsAdded: number;
    surgeNarrative: string;
  };
  cityMarketIntelligence?: {
    cityName: string;
    tier: 1 | 2 | 3;
    marketDepthScore: number;
    employerCount: number;
    avgPlacementWeeks: number;
    salaryPremiumPct: number;
    relocationPressure: string;
    post2023FreezeAdjustment: number;
    cityNarrative: string;
    labeledAs: 'ESTIMATED';
  };
  remoteFirstAdvantage?: {
    accessibleOpenings: number;
    localOpenings: number;
    accessLift: number;
    timelineFactor: number;
    monthsBeforeAdjustment: number;
    monthsAfterAdjustment: number;
    narrative: string;
    labeledAs: 'ESTIMATED';
  };
}

interface Props {
  jobMarketLiquidity: JobMarketLiquidity;
  /** Oracle role key — drives city role-category lookup. From result.workTypeKey */
  roleKey?: string;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const FRICTION_CONFIG = {
  low:      { label: 'EASY ACCESS',       color: 'var(--color-emerald-text)', desc: 'Strong market — quick transitions possible' },
  moderate: { label: 'MODERATE FRICTION', color: 'var(--color-amber500-text)', desc: 'Typical job search timeline applies'        },
  high:     { label: 'TIGHT MARKET',      color: 'var(--color-orange-text)', desc: 'Longer timeline — start positioning now'   },
  very_high:{ label: 'VERY TIGHT',        color: 'var(--color-red600-text)', desc: 'Difficult market — hedge with internal moves'},
};

// ── Location-based opportunity model ─────────────────────────────────────────

interface CityOpportunity {
  profile: USCityMarketProfile;
  roleData: USCityRoleData;
  isUserCity: boolean;
  opportunityScore: number; // composite 0–100
}

function buildCityOpportunities(
  userCityProfile: USCityMarketProfile | null,
  roleCategoryKey: string,
  currentScore: number,
): CityOpportunity[] {
  // Score each city for this role: lower placement weeks + higher employer count + salary premium
  const all = US_CITY_MARKET_PROFILES.map(profile => {
    const roleData = profile.roles[roleCategoryKey] ?? profile.roles['general'];
    if (!roleData) return null;

    // Opportunity score: blend of market depth, placement speed, salary premium, employer count
    const speedScore   = Math.max(0, 100 - roleData.avgPlacementWeeks * 3);  // 26w = 22pts, 10w = 70pts
    const depthScore   = profile.marketDepthScore * 80;
    const salaryScore  = Math.min(100, 50 + roleData.salaryPremiumPct);
    const volumeScore  = Math.min(100, Math.log10(Math.max(1, roleData.employerCount)) * 22);

    const opportunityScore = Math.round(
      speedScore * 0.35 + depthScore * 0.30 + salaryScore * 0.20 + volumeScore * 0.15
    );

    return {
      profile,
      roleData,
      isUserCity: userCityProfile?.cityName === profile.cityName,
      opportunityScore,
    };
  }).filter(Boolean) as CityOpportunity[];

  // Sort: user city first, then by opportunity score desc
  return all
    .sort((a, b) => {
      if (a.isUserCity && !b.isUserCity) return -1;
      if (!a.isUserCity && b.isUserCity) return 1;
      return b.opportunityScore - a.opportunityScore;
    })
    .slice(0, 7);
}

// ── Geolocation hook ──────────────────────────────────────────────────────────

type GeoState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'resolved'; city: string; source: 'browser' | 'profile' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

function useBrowserCity(profileMetro: string | undefined): {
  geo: GeoState;
  requestLocation: () => void;
  resolvedCityName: string | null;
} {
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });

  // Auto-resolve from profile metro if available (no browser prompt needed)
  useEffect(() => {
    if (profileMetro && geo.status === 'idle') {
      setGeo({ status: 'resolved', city: profileMetro, source: 'profile' });
    }
  }, [profileMetro]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ status: 'error', message: 'Geolocation not supported by this browser' });
      return;
    }
    setGeo({ status: 'requesting' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Reverse-geocode via a free endpoint (no API key required)
        const { latitude, longitude } = position.coords;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'en' } },
          );
          if (!resp.ok) throw new Error('geocode failed');
          const data = await resp.json();
          // Prefer city, then town, then state
          const city =
            data.address?.city ??
            data.address?.town ??
            data.address?.county ??
            data.address?.state ??
            'Unknown';
          setGeo({ status: 'resolved', city, source: 'browser' });
        } catch {
          // Fallback: use raw coordinates as a rough region indicator
          setGeo({ status: 'resolved', city: `${latitude.toFixed(1)}, ${longitude.toFixed(1)}`, source: 'browser' });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeo({ status: 'denied' });
        } else {
          setGeo({ status: 'error', message: err.message });
        }
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }, []);

  const resolvedCityName = geo.status === 'resolved' ? geo.city : null;
  return { geo, requestLocation, resolvedCityName };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const CityCard: React.FC<{
  opp: CityOpportunity;
  isHighlighted: boolean;
}> = ({ opp, isHighlighted }) => {
  const color = opp.opportunityScore >= 70 ? 'var(--color-emerald-text)' :
    opp.opportunityScore >= 50 ? 'var(--color-amber500-text)' : 'var(--color-orange-text)';
  const salaryColor = opp.roleData.salaryPremiumPct > 10 ? 'var(--color-emerald-text)' :
    opp.roleData.salaryPremiumPct < -5 ? 'var(--color-orange-text)' : '#94a3b8';

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1.5"
      style={{
        background: isHighlighted ? 'rgba(0,212,224,0.06)' : 'var(--alpha-bg-04)',
        border: `1px solid ${isHighlighted ? 'rgba(0,212,224,0.28)' : 'var(--alpha-bg-08)'}`,
      }}
    >
      {/* City name + state + score */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin style={{ width: 10, height: 10, color, flexShrink: 0 }} />
          <span className="text-[11px] font-bold truncate" style={{ color: 'var(--alpha-text-92)' }}>
            {opp.profile.cityName}
          </span>
          {isHighlighted && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: 'rgba(0,212,224,0.18)', color: 'var(--color-cyan-text)' }}>
              YOU
            </span>
          )}
          <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--alpha-text-25)' }}>
            T{opp.profile.tier}
          </span>
        </div>
        <span className="text-[11px] font-black flex-shrink-0" style={{ color }}>
          {opp.opportunityScore}
        </span>
      </div>

      {/* Key metrics row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-50)' }}>
          ~{opp.roleData.avgPlacementWeeks}w to offer
        </span>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-50)' }}>
          {opp.roleData.employerCount.toLocaleString()} employers
        </span>
        {opp.roleData.salaryPremiumPct !== 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${salaryColor}14`, color: salaryColor }}>
            {opp.roleData.salaryPremiumPct > 0 ? '+' : ''}{opp.roleData.salaryPremiumPct}% salary
          </span>
        )}
        {opp.roleData.remoteAdoptionRate > 0.60 && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(148,163,184,0.10)', color: 'var(--color-slate400-text)' }}>
            {Math.round(opp.roleData.remoteAdoptionRate * 100)}% remote
          </span>
        )}
      </div>

      {/* Relocation note */}
      {opp.profile.relocationPressure === 'high' && (
        <p className="text-[9px]" style={{ color: 'rgba(249,115,22,0.70)' }}>
          ⚠ Many Staff+ roles require relocation
        </p>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export const JobMarketLiquidityCard: React.FC<Props> = ({ jobMarketLiquidity, roleKey = 'sw_backend' }) => {
  const {
    reemploymentWeeks,
    reemploymentWeeksLow,
    reemploymentWeeksHigh,
    marketFriction = 'moderate',
    activePostings,
    demandRatio,
    roleInRegionTrend,
    liquidityScore,
    marketNote,
    // Extended fields
    factors,
    keyBarriers,
    keyAccelerators,
    salaryPreservation,
    confidenceNote,
    geoSupplySurge,
    cityMarketIntelligence,
    remoteFirstAdvantage,
    monthsToReemploy,
  } = jobMarketLiquidity;

  const [showFactors, setShowFactors] = useState(false);
  const [showLocation, setShowLocation] = useState(Boolean(cityMarketIntelligence));

  // Profile metro comes from cityMarketIntelligence.cityName when the pipeline ran with a city
  const profileMetro = cityMarketIntelligence?.cityName;
  const { geo, requestLocation, resolvedCityName } = useBrowserCity(profileMetro);

  // Resolve city profile from browser/profile city name
  const detectedCityProfile: USCityMarketProfile | null = resolvedCityName
    ? resolveUSCityMarket(resolvedCityName)
    : null;

  // Fall back to pipeline-computed city when browser hasn't been asked yet
  const activeCityProfile = detectedCityProfile ?? (cityMarketIntelligence ? { cityName: cityMarketIntelligence.cityName } as USCityMarketProfile : null);

  const roleCategoryKey = resolveRoleCategoryKey(roleKey);

  // Build location opportunities
  const locationOpps = React.useMemo(() => {
    if (!resolvedCityName && !cityMarketIntelligence) return [];
    return buildCityOpportunities(detectedCityProfile, roleCategoryKey, liquidityScore ?? 50);
  }, [resolvedCityName, cityMarketIntelligence, detectedCityProfile, roleCategoryKey, liquidityScore]);

  const cfg = FRICTION_CONFIG[marketFriction] ?? FRICTION_CONFIG.moderate;

  // Build weeks display — Bug 7 fix: handle both "X weeks" and "X–Y weeks" correctly
  const weeksDisplay = reemploymentWeeksLow && reemploymentWeeksHigh
    ? `${reemploymentWeeksLow}–${reemploymentWeeksHigh} weeks`
    : reemploymentWeeks
    ? `${reemploymentWeeks} weeks`
    : null;

  // Correct split for practical anchor: take before first dash/em-dash
  const weeksLowerBound = weeksDisplay
    ? (weeksDisplay.match(/^(\d+)/) ?? [])[1] ?? weeksDisplay.split(/[–-]/)[0].trim()
    : null;

  const trendIcon = roleInRegionTrend === 'rising' ? '↑' : roleInRegionTrend === 'declining' ? '↓' : '→';
  const trendColor = roleInRegionTrend === 'rising' ? 'var(--color-emerald-text)' : roleInRegionTrend === 'declining' ? 'var(--color-orange-text)' : '#94a3b8';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
        >
          <Waves className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.15em]" style={{ color: 'var(--alpha-text-30)' }}>
            JOB MARKET LIQUIDITY
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            {liquidityScore != null && (
              <span className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>
                · {liquidityScore}/100
              </span>
            )}
            {salaryPreservation != null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--color-emerald-text)' }}>
                ~{salaryPreservation}% salary preserved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Core metric: reemployment weeks ───────────────────────────────── */}
      {weeksDisplay && (
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}
          >
            <div>
              <p className="text-[10px] font-bold mb-0.5" style={{ color: `${cfg.color}70` }}>
                TIME TO COMPARABLE ROLE
              </p>
              <p className="text-[16px] font-black" style={{ color: 'var(--alpha-text-85)' }}>
                {weeksDisplay}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
                est. if actively searching
                {monthsToReemploy != null && ` · ${monthsToReemploy}mo median`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Supporting data chips ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-2">
        {activePostings != null && (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-45)', border: '1px solid var(--alpha-bg-08)' }}>
            {activePostings.toLocaleString()} active postings
          </span>
        )}
        {demandRatio != null && (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-45)', border: '1px solid var(--alpha-bg-08)' }}>
            {demandRatio.toFixed(1)}× demand ratio
          </span>
        )}
        {roleInRegionTrend && (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--alpha-bg-06)', color: trendColor, border: '1px solid var(--alpha-bg-08)' }}>
            {trendIcon} demand {roleInRegionTrend}
          </span>
        )}
      </div>

      {/* ── Narrative / market note ───────────────────────────────────────── */}
      <p className="text-[10px] leading-relaxed px-4 pb-2" style={{ color: 'var(--alpha-text-45)' }}>
        {marketNote ?? cfg.desc}
      </p>

      {/* ── Practical anchor ──────────────────────────────────────────────── */}
      {weeksLowerBound && (
        <div className="px-4 pb-3">
          <div
            className="flex items-start gap-1.5 rounded-lg px-2.5 py-2"
            style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.12)' }}
          >
            <span className="text-[10px] font-black flex-shrink-0" style={{ color: 'var(--color-cyan-text)' }}>↳</span>
            <p className="text-[10px] leading-snug italic" style={{ color: 'rgba(34,211,238,0.70)' }}>
              If laid off tomorrow, you have {weeksLowerBound} weeks before job search pressure becomes acute.
            </p>
          </div>
        </div>
      )}

      {/* ── Geo supply surge warning ──────────────────────────────────────── */}
      {geoSupplySurge && geoSupplySurge.geoClusterActiveCuts > 0 && (
        <div className="px-4 pb-3">
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.25)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle style={{ width: 11, height: 11, color: 'var(--color-orange-text)', flexShrink: 0 }} />
              <p className="text-[10px] font-black" style={{ color: 'var(--color-orange-text)' }}>
                SUPPLY SURGE — {geoSupplySurge.metroName}
              </p>
            </div>
            <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-55)' }}>
              {geoSupplySurge.surgeNarrative}
            </p>
          </div>
        </div>
      )}

      {/* ── Remote-first advantage ────────────────────────────────────────── */}
      {remoteFirstAdvantage && (
        <div className="px-4 pb-3">
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.22)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Globe style={{ width: 11, height: 11, color: 'var(--color-emerald-text)', flexShrink: 0 }} />
              <p className="text-[10px] font-black" style={{ color: 'var(--color-emerald-text)' }}>
                REMOTE-FIRST ADVANTAGE
              </p>
            </div>
            <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-55)' }}>
              {remoteFirstAdvantage.narrative}
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-[9px] px-2 py-1 rounded"
                style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--color-emerald-text)' }}>
                {remoteFirstAdvantage.monthsBeforeAdjustment}mo → {remoteFirstAdvantage.monthsAfterAdjustment}mo timeline
              </span>
              {remoteFirstAdvantage.accessLift > 1 && (
                <span className="text-[9px] px-2 py-1 rounded"
                  style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--color-emerald-text)' }}>
                  {remoteFirstAdvantage.accessLift}× market access
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Key barriers and accelerators ─────────────────────────────────── */}
      {((keyBarriers?.length ?? 0) > 0 || (keyAccelerators?.length ?? 0) > 0) && (
        <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(keyBarriers ?? []).slice(0, 1).map((b, i) => (
            <div key={i} className="rounded-lg px-2.5 py-2"
              style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.16)' }}>
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown style={{ width: 10, height: 10, color: 'var(--color-orange-text)' }} />
                <span className="text-[9px] font-black tracking-wide" style={{ color: 'var(--color-orange-text)' }}>BARRIER</span>
              </div>
              <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-50)' }}>{b}</p>
            </div>
          ))}
          {(keyAccelerators ?? []).slice(0, 1).map((a, i) => (
            <div key={i} className="rounded-lg px-2.5 py-2"
              style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp style={{ width: 10, height: 10, color: 'var(--color-emerald-text)' }} />
                <span className="text-[9px] font-black tracking-wide" style={{ color: 'var(--color-emerald-text)' }}>ACCELERATOR</span>
              </div>
              <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-50)' }}>{a}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Factor detail disclosure ──────────────────────────────────────── */}
      {(factors?.length ?? 0) > 0 && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => setShowFactors(f => !f)}
            className="flex items-center gap-1.5 text-[10px] font-semibold"
            style={{ color: 'var(--alpha-text-35)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            {showFactors ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
            {showFactors ? 'Hide factor breakdown' : `Show ${factors!.length} liquidity factors`}
          </button>
          <AnimatePresence initial={false}>
            {showFactors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="mt-2 space-y-1.5">
                  {factors!.map((f) => {
                    const barColor = f.value >= 0.65 ? 'var(--color-emerald-text)' : f.value >= 0.45 ? 'var(--color-amber500-text)' : 'var(--color-orange-text)';
                    return (
                      <div key={f.name} className="rounded-lg px-2.5 py-2"
                        style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-70)' }}>
                            {f.name}
                          </span>
                          <span className="text-[10px] font-black" style={{ color: barColor }}>
                            {f.label}
                          </span>
                        </div>
                        <div className="h-1 rounded-full mb-1" style={{ background: 'var(--alpha-bg-08)' }}>
                          <motion.div
                            className="h-1 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(f.value * 100)}%` }}
                            transition={{ duration: 0.5 }}
                            style={{ background: barColor }}
                          />
                        </div>
                        <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-45)' }}>
                          {f.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Confidence note ───────────────────────────────────────────────── */}
      {confidenceNote && (
        <p className="text-[10px] px-4 pb-3" style={{ color: 'var(--alpha-text-25)' }}>
          ⚠ {confidenceNote}
        </p>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOCATION-BASED SUGGESTIONS
          Collapsible section. Opens automatically when city data is available.
          Browser geolocation used as enhancement; profile metro as fallback.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{ borderTop: '1px solid var(--alpha-bg-06)' }}
      >
        <button
          type="button"
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
          onClick={() => setShowLocation(l => !l)}
          style={{ cursor: 'pointer', background: 'none', border: 'none' }}
        >
          <MapPin style={{ width: 12, height: 12, color: 'var(--color-cyan-text)', flexShrink: 0 }} />
          <span className="text-[10px] font-bold tracking-[0.10em]" style={{ color: 'var(--alpha-text-45)' }}>
            LOCATION-BASED SUGGESTIONS
          </span>
          {cityMarketIntelligence?.cityName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-1"
              style={{ background: 'rgba(0,212,224,0.12)', color: 'var(--color-cyan-text)' }}>
              {cityMarketIntelligence.cityName}
            </span>
          )}
          <span className="ml-auto" style={{ color: 'var(--alpha-text-25)' }}>
            {showLocation
              ? <ChevronUp style={{ width: 13, height: 13 }} />
              : <ChevronDown style={{ width: 13, height: 13 }} />
            }
          </span>
        </button>

        <AnimatePresence initial={false}>
          {showLocation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-4">

                {/* Pipeline-computed city intelligence */}
                {cityMarketIntelligence && (
                  <div className="rounded-xl px-3 py-2.5 mb-3"
                    style={{ background: 'rgba(0,212,224,0.05)', border: '1px solid rgba(0,212,224,0.18)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-black" style={{ color: 'var(--color-cyan-text)' }}>
                        YOUR MARKET — {cityMarketIntelligence.cityName.toUpperCase()}
                      </p>
                      <span className="text-[9px] px-1 rounded"
                        style={{ background: 'rgba(148,163,184,0.14)', color: 'var(--color-slate400-text)' }}>
                        ESTIMATED
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {[
                        { label: 'Employers', value: cityMarketIntelligence.employerCount.toLocaleString() },
                        { label: 'Avg weeks', value: `${cityMarketIntelligence.avgPlacementWeeks}w` },
                        { label: 'Salary', value: `${cityMarketIntelligence.salaryPremiumPct > 0 ? '+' : ''}${cityMarketIntelligence.salaryPremiumPct}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg py-1.5 text-center"
                          style={{ background: 'var(--alpha-bg-04)' }}>
                          <p className="text-[11px] font-black" style={{ color: 'var(--alpha-text-85)' }}>{value}</p>
                          <p className="text-[9px]" style={{ color: 'var(--alpha-text-30)' }}>{label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-50)' }}>
                      {cityMarketIntelligence.cityNarrative}
                    </p>
                    {cityMarketIntelligence.relocationPressure === 'high' && (
                      <p className="text-[10px] mt-1" style={{ color: 'rgba(249,115,22,0.75)' }}>
                        ⚠ Many specialized roles in this city require relocation consideration.
                      </p>
                    )}
                  </div>
                )}

                {/* Browser geolocation CTA — only when profile city isn't available */}
                {!cityMarketIntelligence && geo.status === 'idle' && (
                  <div className="rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2"
                    style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.18)' }}>
                    <Navigation style={{ width: 14, height: 14, color: 'var(--color-cyan-text)', flexShrink: 0, marginTop: 1 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--alpha-text-85)' }}>
                        Get personalized city rankings
                      </p>
                      <p className="text-[10px] leading-snug mb-2" style={{ color: 'var(--alpha-text-45)' }}>
                        Allow location access to see hiring demand, placement timelines, and salary premiums for cities near you.
                        Your location is not stored.
                      </p>
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--color-cyan-text)', border: '1px solid rgba(34,211,238,0.30)', cursor: 'pointer' }}
                      >
                        Detect my location →
                      </button>
                    </div>
                  </div>
                )}

                {geo.status === 'requesting' && (
                  <div className="rounded-xl px-3 py-3 mb-3 flex items-center gap-2"
                    style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}>
                    <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
                      style={{ borderColor: 'var(--color-cyan-text)', borderTopColor: 'transparent' }} />
                    <p className="text-[11px]" style={{ color: 'var(--alpha-text-55)' }}>
                      Detecting your location…
                    </p>
                  </div>
                )}

                {geo.status === 'denied' && (
                  <div className="rounded-xl px-3 py-2.5 mb-3"
                    style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)' }}>
                    <p className="text-[10px]" style={{ color: 'rgba(245,158,11,0.80)' }}>
                      Location access denied. Set your city in your profile to unlock city-specific market intelligence.
                    </p>
                    <button
                      type="button"
                      onClick={() => { try { window.dispatchEvent(new CustomEvent('hp.profile.open', { detail: { step: 'core' } })); } catch { /* SSR */ } }}
                      className="mt-1.5 text-[10px] font-bold"
                      style={{ color: 'var(--color-cyan-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Set city in profile →
                    </button>
                  </div>
                )}

                {geo.status === 'resolved' && (
                  <div className="flex items-center gap-2 mb-2.5">
                    <Navigation style={{ width: 10, height: 10, color: 'var(--color-cyan-text)' }} />
                    <p className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-50)' }}>
                      {geo.source === 'browser' ? `Detected: ${geo.city}` : `From profile: ${geo.city}`}
                      {!detectedCityProfile && ' · No US city profile available'}
                    </p>
                    {geo.source === 'profile' && !detectedCityProfile && (
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="text-[10px] font-bold"
                        style={{ color: 'var(--color-cyan-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Use browser location
                      </button>
                    )}
                  </div>
                )}

                {/* City opportunity cards */}
                {locationOpps.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold tracking-wider mb-2"
                      style={{ color: 'var(--alpha-text-25)' }}>
                      US CITIES RANKED BY OPPORTUNITY FOR YOUR ROLE
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {locationOpps.map(opp => (
                        <CityCard
                          key={opp.profile.cityName}
                          opp={opp}
                          isHighlighted={opp.isUserCity}
                        />
                      ))}
                    </div>
                    <p className="text-[9px] mt-2" style={{ color: 'var(--alpha-text-25)' }}>
                      Opportunity score = placement speed + employer depth + salary premium + volume.
                      ESTIMATED — LinkedIn Workforce Report 2024, Indeed US Hiring Lab 2025.
                    </p>
                  </>
                )}

                {/* Fallback when no location + no city resolved */}
                {locationOpps.length === 0 && geo.status !== 'requesting' && !cityMarketIntelligence && (
                  <p className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
                    Set your city in your profile or allow location access to see personalized city rankings.
                  </p>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default JobMarketLiquidityCard;
