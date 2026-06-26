// CareerTwinCard.tsx — v2.0
//
// v2.0 fixes:
//  1. "Submit your transition" was a dead <span> — now opens a real modal form
//     that calls addTransition() and persists to localStorage + Supabase.
//  2. Template literal bug: '{userCountry} equivalents' rendered as literal text.
//  3. matchReasons now reference the user's own role for context.
//  4. Low similarity % shown with "best available" framing instead of raw number.

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, TrendingUp, Clock, ArrowRight, Sparkles,
  X, ChevronDown, CheckCircle, Send,
} from "lucide-react";
import {
  findCareerTwins,
  addTransition,
  normaliseRoleForMatching,
  type CareerTwinMatch,
} from "../services/careerTwinNetwork";

interface CareerTwinCardProps {
  userRole: string;
  userExperience: number;
  userRiskScore: number;
  userCountry?: string;
  topN?: number;
}

// ── Income change badge ───────────────────────────────────────────────────────

const IncomeChangeBadge: React.FC<{ pct: number | null }> = ({ pct }) => {
  if (pct === null) return null;
  const positive = pct >= 0;
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
      positive
        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
        : "bg-red-500/15 text-red-400 border border-red-500/25"
    }`}>
      {positive ? "+" : ""}{pct}% income
    </span>
  );
};

// ── Market label helper ───────────────────────────────────────────────────────

const DIFFERENT_MARKET_REGIONS: Record<string, string> = {
  usa: 'US', canada: 'US/Canada', uk: 'UK', germany: 'Germany/EU',
  france: 'EU', netherlands: 'EU', sweden: 'EU', ireland: 'EU',
  australia: 'Australia/NZ', 'new zealand': 'Australia/NZ',
};
function getMarketLabel(country: string): string {
  return DIFFERENT_MARKET_REGIONS[country.toLowerCase()] ?? country;
}

// ── Submission form ───────────────────────────────────────────────────────────

interface SubmitFormProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultFromRole: string;
  defaultFromCountry: string;
}

const COUNTRY_OPTIONS = [
  'India', 'USA', 'UK', 'Australia', 'Canada', 'Singapore', 'Germany',
  'Netherlands', 'Philippines', 'UAE', 'South Africa', 'Brazil', 'Japan',
  'Global / Remote',
];

const SubmitTransitionForm: React.FC<SubmitFormProps> = ({
  onClose, onSuccess, defaultFromRole, defaultFromCountry,
}) => {
  const [fromRole,   setFromRole]   = useState(defaultFromRole);
  const [fromIndustry, setFromIndustry] = useState('');
  const [fromExp,    setFromExp]    = useState('');
  const [fromCountry,setFromCountry]= useState(defaultFromCountry === 'global' ? 'India' : defaultFromCountry);
  const [toRole,     setToRole]     = useState('');
  const [toIndustry, setToIndustry] = useState('');
  const [incomeChg,  setIncomeChg]  = useState('');
  const [months,     setMonths]     = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  const valid =
    fromRole.trim().length > 0 &&
    toRole.trim().length > 0 &&
    whatWorked.trim().length >= 20 &&
    months.trim().length > 0;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      addTransition({
        fromRole:          fromRole.trim(),
        fromIndustry:      fromIndustry.trim() || 'Unknown',
        fromRiskScore:     60,  // anonymous — don't ask for risk score in form
        fromExperienceYears: Number(fromExp) || 5,
        fromCountry:       fromCountry === 'Global / Remote' ? 'global' : fromCountry,
        toRole:            toRole.trim(),
        toIndustry:        toIndustry.trim() || 'Unknown',
        incomeChangePct:   incomeChg.trim() !== '' ? Number(incomeChg) : null,
        monthsToTransition:Number(months),
        whatWorked:        whatWorked.trim(),
      });
      setSubmitted(true);
      setTimeout(onSuccess, 1500);
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d1424, #0a101e)',
          border: '1px solid rgba(0,212,224,0.22)',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '1px solid var(--alpha-bg-08)' }}>
          <div>
            <p className="text-[13px] font-black tracking-tight" style={{ color: 'var(--color-cyan-text)' }}>
              Share your transition
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--alpha-text-45)' }}>
              Help others who are where you were · Your name is never stored
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transition form"
            title="Close"
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-50)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <CheckCircle className="w-10 h-10 mb-3" style={{ color: '#10b981' }} />
            <p className="text-[14px] font-bold mb-1" style={{ color: '#10b981' }}>
              Thank you — transition added!
            </p>
            <p className="text-[11px]" style={{ color: 'var(--alpha-text-45)' }}>
              Your story will help others navigate a similar situation.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {/* FROM */}
            <div className="rounded-xl p-3.5"
              style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
              <p className="text-[10px] font-black tracking-widest mb-2.5"
                style={{ color: 'var(--alpha-text-25)' }}>WHERE YOU CAME FROM</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                    Previous role *
                  </label>
                  <input
                    className="input w-full text-[11px]"
                    value={fromRole}
                    onChange={e => setFromRole(e.target.value)}
                    placeholder="e.g. Data Analyst"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                    Industry
                  </label>
                  <input
                    className="input w-full text-[11px]"
                    value={fromIndustry}
                    onChange={e => setFromIndustry(e.target.value)}
                    placeholder="e.g. Banking"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                    Years experience
                  </label>
                  <input
                    className="input w-full text-[11px]"
                    type="number" min={0} max={40}
                    value={fromExp}
                    onChange={e => setFromExp(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                    Country
                  </label>
                  <select
                    className="input w-full text-[11px]"
                    aria-label="Country"
                    title="Country"
                    value={fromCountry}
                    onChange={e => setFromCountry(e.target.value)}
                  >
                    {COUNTRY_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TO */}
            <div className="rounded-xl p-3.5"
              style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="text-[10px] font-black tracking-widest mb-2.5"
                style={{ color: 'rgba(16,185,129,0.50)' }}>WHERE YOU LANDED</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                    New role *
                  </label>
                  <input
                    className="input w-full text-[11px]"
                    value={toRole}
                    onChange={e => setToRole(e.target.value)}
                    placeholder="e.g. AI Engineer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                    New industry
                  </label>
                  <input
                    className="input w-full text-[11px]"
                    value={toIndustry}
                    onChange={e => setToIndustry(e.target.value)}
                    placeholder="e.g. AI/ML"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                    Months to transition *
                  </label>
                  <input
                    className="input w-full text-[11px]"
                    type="number" min={1} max={36}
                    value={months}
                    onChange={e => setMonths(e.target.value)}
                    placeholder="e.g. 6"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                    Income change (%)
                  </label>
                  <input
                    className="input w-full text-[11px]"
                    type="number" min={-80} max={300}
                    value={incomeChg}
                    onChange={e => setIncomeChg(e.target.value)}
                    placeholder="e.g. +45 or -10"
                  />
                </div>
              </div>
            </div>

            {/* What worked */}
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--alpha-text-45)' }}>
                What specifically worked? * <span style={{ color: 'var(--alpha-text-25)' }}>(min 20 chars)</span>
              </label>
              <textarea
                className="input w-full text-[11px] resize-none"
                rows={3}
                value={whatWorked}
                onChange={e => setWhatWorked(e.target.value)}
                placeholder="e.g. Built a RAG side project on GitHub, wrote a Medium article, got a LinkedIn inbound from an AI startup..."
              />
              <p className="text-[9px] mt-1" style={{ color: whatWorked.length < 20 ? 'rgba(249,115,22,0.70)' : 'var(--alpha-text-25)' }}>
                {whatWorked.length}/20 minimum · Be specific — vague advice doesn't help others
              </p>
            </div>

            {error && (
              <p className="text-[11px]" style={{ color: '#ef4444' }}>{error}</p>
            )}

            <button
              type="button"
              disabled={!valid || submitting}
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[12px] transition-all"
              style={{
                background: valid ? 'rgba(0,212,224,0.18)' : 'var(--alpha-bg-04)',
                border: `1px solid ${valid ? 'rgba(0,212,224,0.35)' : 'var(--alpha-bg-08)'}`,
                color: valid ? '#00d4e0' : 'var(--alpha-text-25)',
                cursor: valid ? 'pointer' : 'not-allowed',
              }}
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting…' : 'Share my transition'}
            </button>

            <p className="text-center text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>
              No personal data stored · Transitions are anonymised
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ── Main card ─────────────────────────────────────────────────────────────────

export const CareerTwinCard: React.FC<CareerTwinCardProps> = ({
  userRole,
  userExperience,
  userRiskScore,
  userCountry = "global",
  topN = 3,
}) => {
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Normalise oracle key to human-readable role for both display and matching
  const displayRole = normaliseRoleForMatching(userRole);

  const twins: CareerTwinMatch[] = useMemo(
    () => findCareerTwins(userRole, userExperience, userRiskScore, userCountry, topN),
    [userRole, userExperience, userRiskScore, userCountry, topN],
  );

  if (twins.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-[var(--alpha-bg-10)] bg-[var(--alpha-bg-04)] p-5 flex flex-col items-center text-center gap-2">
          <Users className="w-5 h-5" style={{ color: 'var(--alpha-text-35)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--alpha-text-85)' }}>
            No matches for {displayRole} yet
          </p>
          <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
            Nobody in your role has shared their transition story yet. Be the first — your story helps the next person in your position.
          </p>
          <button
            type="button"
            onClick={() => setShowSubmitForm(true)}
            className="mt-1 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: 'rgba(0,212,224,0.12)', color: 'var(--color-cyan-text)', border: '1px solid rgba(0,212,224,0.28)' }}
          >
            <Send className="w-3 h-3" />
            Share your transition
          </button>
        </div>

        <AnimatePresence>
          {showSubmitForm && (
            <SubmitTransitionForm
              onClose={() => setShowSubmitForm(false)}
              onSuccess={() => {
                setShowSubmitForm(false);
                setJustSubmitted(true);
                setTimeout(() => setJustSubmitted(false), 5000);
              }}
              defaultFromRole={displayRole}
              defaultFromCountry={userCountry === 'global' ? 'India' : userCountry}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  const hasGeographicFallback = twins.some(t => t.isGeographicFallback);
  const crossMarketCount = twins.filter(t => t.isDifferentMarket).length;
  const bestSimilarity = twins[0]?.similarityPct ?? 0;

  return (
    <>
      <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[var(--alpha-bg-10)]">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-cyan-400" />
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-tight">
                People who navigated from <span className="text-cyan-400">{displayRole}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Real transitions · matched to your role, experience & risk level
              </div>
            </div>
            <span className="ml-auto text-[10px] font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded flex-shrink-0">
              {twins.length} MATCH{twins.length !== 1 ? 'ES' : ''}
            </span>
          </div>
        </div>

        {/* Low match quality notice */}
        {bestSimilarity < 45 && (
          <div className="px-5 pt-3 pb-1">
            <div className="rounded-lg px-3 py-2 text-[10px] leading-relaxed"
              style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.18)', color: 'rgba(34,211,238,0.80)' }}>
              No exact matches for <strong>{displayRole}</strong> yet — showing closest available.
              The skills-transfer principles still apply. <span className="underline cursor-pointer" onClick={() => setShowSubmitForm(true)}>Add yours</span> to help others.
            </div>
          </div>
        )}

        {/* Geographic fallback banner */}
        {hasGeographicFallback && bestSimilarity >= 45 && (
          <div className="px-5 pt-3 pb-1">
            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2 text-[10px] text-amber-300 leading-relaxed">
              No close matches in {userCountry === 'global' ? 'your region' : userCountry}.
              Showing best available from other markets — location-specific steps may need adaptation.
            </div>
          </div>
        )}

        {/* Cross-market notice */}
        {!hasGeographicFallback && crossMarketCount > 0 && (
          <div className="px-5 pt-3 pb-1">
            <div className="rounded-lg bg-[var(--alpha-bg-04)] border border-[var(--alpha-bg-10)] px-3 py-2 text-[10px] text-muted-foreground leading-relaxed">
              {crossMarketCount === twins.length ? 'All' : crossMarketCount}{' '}
              match{crossMarketCount !== 1 ? 'es' : ''} from a different market —
              steps marked ⚠ may not transfer directly to{' '}
              {userCountry === 'global' ? 'your region' : userCountry}.
            </div>
          </div>
        )}

        {/* Twin rows */}
        <div className="divide-y divide-[var(--alpha-bg-05)]">
          {twins.map((match, i) => {
            const { twin, similarityPct, matchReasons, isDifferentMarket, isGeographicFallback } = match;
            const twinMarket = getMarketLabel(twin.fromCountry);
            const showContextWarning = isDifferentMarket && twin.fromCountry !== 'global';
            // Show "Best available" framing when similarity is low
            const showBestAvailable = isGeographicFallback && similarityPct < 45;

            return (
              <motion.div
                key={twin.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-5"
              >
                {/* Role transition headline */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">{twin.fromRole}</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs font-bold">{twin.toRole}</span>
                  {twin.isVerified && (
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      ✓ Verified
                    </span>
                  )}
                  {/* Country badge */}
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono ml-auto flex-shrink-0"
                    style={{
                      background: showContextWarning ? 'rgba(245,158,11,0.10)' : 'var(--alpha-bg-06)',
                      color:      showContextWarning ? '#fbbf24' : 'var(--alpha-text-45)',
                      border:     showContextWarning ? '1px solid rgba(245,158,11,0.25)' : '1px solid var(--alpha-bg-08)',
                    }}
                  >
                    {twin.fromCountry === 'global' ? '🌐 Global' : `📍 ${twin.fromCountry}`}
                  </span>
                </div>

                {/* Metrics row */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    {showBestAvailable ? (
                      <span className="text-cyan-400/70 font-semibold">
                        Best available ({similarityPct}% match)
                      </span>
                    ) : (
                      <><span className="font-bold text-cyan-400">{similarityPct}%</span> match</>
                    )}
                  </div>
                  <IncomeChangeBadge pct={twin.incomeChangePct} />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {twin.monthsToTransition}mo to transition
                  </div>
                </div>

                {/* What worked */}
                <div className="text-xs text-muted-foreground leading-relaxed bg-[var(--alpha-bg-05)] rounded-lg px-3 py-2 mb-2">
                  <TrendingUp className="w-3 h-3 text-emerald-400 inline mr-1.5 mb-0.5" />
                  {twin.whatWorked}
                </div>

                {/* Cross-market context note — Bug 2 fix: proper template literal */}
                {showContextWarning && (
                  <div className="mt-2 text-[10px] leading-relaxed rounded px-2 py-1.5"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', color: 'var(--color-amber-text)' }}>
                    ⚠ {twinMarket} market context — location-specific steps (events, platforms, hiring norms)
                    may not apply in {userCountry === 'global' ? 'your region' : userCountry}.
                    Focus on the transferable parts: credentials, portfolio, and skill signals.
                    {isGeographicFallback && ` Best available match — no close ${userCountry === 'global' ? 'regional' : userCountry} equivalents in the network yet.`}
                  </div>
                )}

                {/* Match reasons */}
                {matchReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {matchReasons.map((r, j) => (
                      <span key={j}
                        className="text-[9px] bg-[var(--alpha-bg-05)] text-muted-foreground border border-[var(--alpha-bg-10)] px-1.5 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer CTA — now wires to submit form */}
        <div className="p-4 border-t border-[var(--alpha-bg-10)] bg-[var(--alpha-bg-02)] flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Matched to: {displayRole} · {userCountry === 'global' ? 'Global' : userCountry}
          </p>
          <button
            type="button"
            onClick={() => setShowSubmitForm(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{
              background: 'rgba(0,212,224,0.12)',
              color: 'var(--color-cyan-text)',
              border: '1px solid rgba(0,212,224,0.28)',
            }}
          >
            <ChevronDown className="w-3 h-3 rotate-180" />
            Share your transition
          </button>
        </div>

        {/* Success flash */}
        <AnimatePresence>
          {justSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mx-4 mb-3 rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10b981' }} />
              <p className="text-[11px] font-semibold" style={{ color: '#10b981' }}>
                Transition added — thank you for helping the community!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submission modal */}
      <AnimatePresence>
        {showSubmitForm && (
          <SubmitTransitionForm
            onClose={() => setShowSubmitForm(false)}
            onSuccess={() => {
              setShowSubmitForm(false);
              setJustSubmitted(true);
              setTimeout(() => setJustSubmitted(false), 5000);
            }}
            defaultFromRole={displayRole}
            defaultFromCountry={userCountry === 'global' ? 'India' : userCountry}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default CareerTwinCard;
