// FinancialImpactCalculator.tsx
// Quantifies the actual financial cost of a potential layoff for THIS specific
// user — in THEIR currency, off THEIR reported income / savings / expenses.
//
// Moves from abstract risk to concrete monetary impact — the most motivating
// signal in the whole audit.
//
// v2 rewrite — fixes the following bugs in the original:
//   1. The component was rendered as <FinancialImpactCalculator result={result} />
//      with no salary prop, so it ALWAYS defaulted to a hardcoded $100,000 and
//      ignored the real financial context the app already collects. It now reads
//      loadFinancialContext() and prefills salary, savings, expenses, currency.
//   2. Everything was hardcoded USD ($, "K"). The app's largest user base is in
//      India (₹/INR). It is now fully currency-aware via currencyService.
//   3. Burn rate was approximated as salary × 0.7 even when the user had entered
//      their actual monthly expenses. It now uses reported expenses when present.
//   4. It invented a THIRD layoff-probability formula (1/(1+e^-0.06(score-45)))
//      that disagreed with the canonical layoffSurvivalPredictor shown in the
//      "Your Odds" card directly above it. It now reads
//      result.survivalProbability.probability12m (the calibrated engine value)
//      and only falls back to a local sigmoid when that is absent.
//   5. US-only concepts ("401k", $1,200 job-search, $1,000/mo savings) and a
//      fabricated "LinkedIn Q4 2024 survey" citation are removed / PPP-scaled /
//      labelled MODELED.

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, Clock, Shield, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { HybridResult } from '../types/hybridResult';
import {
  loadFinancialContext,
} from '../services/financialContextService';
import {
  CURRENCY_META,
  formatCurrency as fmtLocal,
  pppCalibrate,
  convertToUsd,
} from '../services/currencyService';

// ── Reemployment time data by role (weeks to re-employment) ───────────────────
// MODELED — pooled estimates; not live data. Currency-neutral (time, not money).

const REEMPLOYMENT_WEEKS: Record<string, { median: number; p25: number; p75: number }> = {
  sw:      { median: 8,  p25: 5,  p75: 14 },
  ds:      { median: 10, p25: 6,  p75: 16 },
  pm:      { median: 12, p25: 7,  p75: 18 },
  hr:      { median: 16, p25: 10, p75: 24 },
  sales:   { median: 10, p25: 6,  p75: 16 },
  fin:     { median: 14, p25: 8,  p75: 20 },
  legal:   { median: 16, p25: 10, p75: 24 },
  design:  { median: 12, p25: 7,  p75: 18 },
  ops:     { median: 13, p25: 8,  p75: 19 },
  default: { median: 13, p25: 8,  p75: 20 },
};

// Benefits-as-%-of-base differs sharply by market. In the US, employer-paid
// health + retirement match adds ~25% on top of base. In most other markets
// (India, SE Asia, MENA) statutory + employer benefits are a smaller share of
// total comp, so the "benefits lost on layoff" line should not assume a US 1.25×.
// Keyed by currency as a proxy for the benefits regime.
const BENEFITS_PCT_BY_CURRENCY: Record<string, number> = {
  USD: 0.25,  // health insurance + 401k match — large in the US
  CAD: 0.18,
  GBP: 0.15,
  EUR: 0.15,
  CHF: 0.16,
  AUD: 0.14,  // superannuation is portable, so layoff-loss is smaller
  SGD: 0.14,
  INR: 0.10,  // PF/gratuity largely portable; main loss is health cover + variable
  AED: 0.08, SAR: 0.08, QAR: 0.08, KWD: 0.08, BHD: 0.08, OMR: 0.08, // gratuity handled separately
  PHP: 0.10, MYR: 0.10, IDR: 0.09, VND: 0.08, THB: 0.10,
  JPY: 0.16, KRW: 0.15, TWD: 0.12, HKD: 0.12, CNY: 0.12,
};
const DEFAULT_BENEFITS_PCT = 0.12;

function benefitsPct(currency: string): number {
  return BENEFITS_PCT_BY_CURRENCY[currency] ?? DEFAULT_BENEFITS_PCT;
}

// Whether the "benefits" line should mention 401k (US-only retirement vehicle).
function benefitsLabel(currency: string): string {
  if (currency === 'USD') return 'health insurance, 401(k) match, variable pay';
  if (currency === 'GBP') return 'private health cover, pension match, bonus';
  if (currency === 'INR') return 'health cover, variable pay (PF/gratuity stay portable)';
  if (['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'].includes(currency)) return 'health cover, allowances (gratuity counted in runway)';
  return 'health cover, employer benefits, variable pay';
}

function getRolePrefix(workTypeKey: string): string {
  const k = (workTypeKey ?? '').toLowerCase();
  if (/^sw_|software|engineer|dev/.test(k)) return 'sw';
  if (/^ds_|data.sci|ml_/.test(k)) return 'ds';
  if (/^pm_|product.manager/.test(k)) return 'pm';
  if (/^hr_|human.resources|recruiter/.test(k)) return 'hr';
  if (/^sales_|account.exec/.test(k)) return 'sales';
  if (/^finance_|fin_/.test(k)) return 'fin';
  if (/legal/.test(k)) return 'legal';
  if (/design/.test(k)) return 'design';
  if (/^ops_|operations/.test(k)) return 'ops';
  return 'default';
}

// ── Impact calculator logic ───────────────────────────────────────────────────

interface FinancialImpact {
  incomeLossMed: number;            // net income lost over the median search (local currency)
  incomeLossP75: number;
  totalCostMedian: number;
  totalCostP75: number;
  /** Monthly cost of living the user must cover while unemployed (local currency). */
  monthlyBurn: number;
  benefitsLossMonthly: number;
  jobSearchCosts: number;
  salaryDiscountOnPanic: number;
  emergencyFundGap: number;         // local currency
  monthsOfRunwayNeeded: number;
  monthlySavingsToClose: number;    // PPP-calibrated target monthly savings (local currency)
  monthsToClose: number;            // at monthlySavingsToClose, how long to close the gap
}

interface ImpactInputs {
  annualSalary: number;       // local currency
  /** Reported monthly expenses in local currency, or null to derive from salary. */
  monthlyExpenses: number | null;
  savingsMonths: number;
  rolePrefix: string;
  currency: string;
}

function computeFinancialImpact(inp: ImpactInputs): FinancialImpact {
  const { annualSalary, monthlyExpenses, savingsMonths, rolePrefix, currency } = inp;
  const weeksData = REEMPLOYMENT_WEEKS[rolePrefix] ?? REEMPLOYMENT_WEEKS.default;
  const monthlyGross = annualSalary / 12;
  const weeklyGross = annualSalary / 52;
  // Net take-home ≈ 70% of gross (rough, currency-neutral).
  const weeklyNet = weeklyGross * 0.70;

  // The cost of being unemployed is the cost of LIVING, not the salary forgone.
  // If the user told us their monthly expenses, use that. Otherwise fall back to
  // ~55% of net income as a living-cost proxy (people don't spend 100% of net).
  const monthlyBurn = monthlyExpenses != null && monthlyExpenses > 0
    ? monthlyExpenses
    : Math.round((monthlyGross * 0.70) * 0.55);
  const weeklyBurn = (monthlyBurn * 12) / 52;

  // Income gap = living cost incurred with no incoming salary over the search.
  const incomeLossMed = Math.round(weeklyBurn * weeksData.median);
  const incomeLossP75 = Math.round(weeklyBurn * weeksData.p75);

  // Benefits lost while unemployed (regime-aware share of gross).
  const benefitsLoss = Math.round(monthlyGross * benefitsPct(currency));

  // Job search costs — PPP-calibrated from a $400 USD base (resume help, premium
  // job-board tier, a little travel). $400 in the US ≈ ₹8.3k in India by PPP.
  const jobSearchCosts = pppCalibrate(400, currency);

  // Panic discount: accepting ~8% under market when searching under pressure,
  // costing that share of year-1 salary.
  const salaryDiscount = Math.round(annualSalary * 0.08);

  const benefitMonthsMed = Math.ceil(weeksData.median / 4);
  const benefitMonthsP75 = Math.ceil(weeksData.p75 / 4);
  const totalMedian = incomeLossMed + benefitsLoss * benefitMonthsMed + jobSearchCosts;
  const totalP75 = incomeLossP75 + benefitsLoss * benefitMonthsP75 + jobSearchCosts + salaryDiscount;

  // Runway target: P75 search length + 1 month onboarding buffer.
  const monthsNeeded = benefitMonthsP75 + 1;
  // Current liquid savings expressed in money = months of expenses already saved.
  const currentSavings = savingsMonths * monthlyBurn;
  const targetSavings = monthsNeeded * monthlyBurn;
  const gap = Math.max(0, Math.round(targetSavings - currentSavings));

  // Recommended monthly savings to close the gap — PPP-calibrated from a $1,000
  // USD base, but never more than 35% of net monthly income (otherwise the plan
  // is unrealistic for the user's actual earnings).
  const monthlyNet = monthlyGross * 0.70;
  const savingsTargetBase = pppCalibrate(1000, currency);
  const monthlySavingsToClose = Math.max(
    1,
    Math.round(Math.min(savingsTargetBase, monthlyNet * 0.35)),
  );
  const monthsToClose = gap > 0 ? Math.ceil(gap / monthlySavingsToClose) : 0;

  return {
    incomeLossMed,
    incomeLossP75,
    totalCostMedian: totalMedian,
    totalCostP75: totalP75,
    monthlyBurn: Math.round(monthlyBurn),
    benefitsLossMonthly: benefitsLoss,
    jobSearchCosts,
    salaryDiscountOnPanic: salaryDiscount,
    emergencyFundGap: gap,
    monthsOfRunwayNeeded: monthsNeeded,
    monthlySavingsToClose,
    monthsToClose,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FinancialImpactCalculatorProps {
  result: HybridResult;
  /** Pre-loaded annual salary (local currency) if the caller has it. Optional —
   *  the component otherwise reads it from the stored financial context. */
  annualSalary?: number | null;
}

// Default salary per currency when the user has entered nothing — set to a
// plausible mid-market local annual figure so the first render isn't a wildly
// wrong USD number for, say, an Indian user.
const DEFAULT_SALARY_BY_CURRENCY: Record<string, number> = {
  USD: 100_000, CAD: 95_000, GBP: 55_000, EUR: 60_000, INR: 1_500_000,
  SGD: 90_000, AUD: 110_000, PHP: 900_000, AED: 240_000, SAR: 220_000,
  JPY: 6_000_000, KRW: 60_000_000,
};

export const FinancialImpactCalculator: React.FC<FinancialImpactCalculatorProps> = ({
  result,
  annualSalary: propSalary,
}) => {
  const rolePrefix = getRolePrefix(result.workTypeKey ?? '');
  const weeksData = REEMPLOYMENT_WEEKS[rolePrefix] ?? REEMPLOYMENT_WEEKS.default;
  const score = result.total;

  // ── Read the real financial context the app already collected ───────────────
  // This is the central fix: the component previously ignored this entirely.
  const ctx = useMemo(() => loadFinancialContext(), []);
  const currency = ctx?.currency && CURRENCY_META[ctx.currency] ? ctx.currency : 'USD';
  const meta = CURRENCY_META[currency];

  const initialSalary =
    propSalary ??
    ctx?.currentAnnualIncome ??
    DEFAULT_SALARY_BY_CURRENCY[currency] ??
    100_000;
  const initialExpenses = ctx?.monthlyExpenses ?? null;
  const initialSavings = ctx?.emergencyFundMonths ?? 2;

  // User inputs (seeded from stored context, editable here)
  const [salary, setSalary] = useState<number>(initialSalary);
  const [savingsMonths, setSavingsMonths] = useState<number>(Math.round(initialSavings));
  const [monthlyExpenses, setMonthlyExpenses] = useState<number | null>(initialExpenses);
  const [showDetails, setShowDetails] = useState(false);

  // Re-seed when stored context changes (e.g. the user edits it elsewhere and
  // returns to this tab without a full remount).
  useEffect(() => {
    if (propSalary == null && ctx?.currentAnnualIncome != null) setSalary(ctx.currentAnnualIncome);
    if (ctx?.emergencyFundMonths != null) setSavingsMonths(Math.round(ctx.emergencyFundMonths));
    if (ctx?.monthlyExpenses != null) setMonthlyExpenses(ctx.monthlyExpenses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.currentAnnualIncome, ctx?.emergencyFundMonths, ctx?.monthlyExpenses]);

  const impact = useMemo(
    () => computeFinancialImpact({ annualSalary: salary, monthlyExpenses, savingsMonths, rolePrefix, currency }),
    [salary, monthlyExpenses, savingsMonths, rolePrefix, currency],
  );

  // ── Layoff probability — use the canonical engine value, not a local guess ──
  // result.survivalProbability.probability12m is what the "Your Odds" card and the
  // rest of the app use. Falling back to a local sigmoid only when it's absent
  // keeps this card CONSISTENT with everything around it.
  const enginePr = result.survivalProbability?.probability12m;
  const layoffProbability = enginePr != null
    ? Math.round(enginePr * 100)
    : Math.round((1 / (1 + Math.exp(-0.06 * (score - 45)))) * 100);
  const probabilityIsEngine = enginePr != null;
  const expectedCost = Math.round(impact.totalCostMedian * (layoffProbability / 100));
  const isInsufficientRunway = savingsMonths < impact.monthsOfRunwayNeeded;

  // Local formatter + USD reference for non-USD currencies.
  const fmt = (n: number) => fmtLocal(n, currency);
  const usdRef = (n: number): string | null => {
    if (currency === 'USD') return null;
    const usd = convertToUsd(n, currency);
    return usd >= 1000 ? `≈$${(usd / 1000).toFixed(1)}k` : `≈$${Math.round(usd)}`;
  };

  const expensesKnown = monthlyExpenses != null && monthlyExpenses > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <DollarSign className="w-5 h-5 text-emerald-400" />
        <h3 className="text-sm font-black uppercase tracking-widest">Financial Impact Calculator</h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-white/6 text-muted-foreground font-mono">
          {ctx ? `From your ${meta.name} profile` : 'Estimate — add your financial context for accuracy'}
        </span>
      </div>

      {/* Inputs */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Annual Base Salary
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{meta.symbol}</span>
            <input
              type="number"
              value={salary}
              onChange={e => setSalary(Number(e.target.value) || 0)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold focus:outline-none focus:border-white/20"
              step={currency === 'INR' ? 50000 : 5000}
              min={0}
              aria-label="Annual base salary"
            />
          </div>
          {usdRef(salary) && (
            <p className="text-[9px] text-muted-foreground mt-1">{usdRef(salary)} USD/yr</p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Monthly Expenses
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{meta.symbol}</span>
            <input
              type="number"
              value={monthlyExpenses ?? ''}
              placeholder={String(impact.monthlyBurn)}
              onChange={e => {
                const v = Number(e.target.value);
                setMonthlyExpenses(e.target.value === '' ? null : (v || 0));
              }}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold focus:outline-none focus:border-white/20"
              step={currency === 'INR' ? 5000 : 250}
              min={0}
              aria-label="Monthly living expenses"
            />
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            {expensesKnown ? 'Your reported burn rate' : `Estimated ${fmt(impact.monthlyBurn)}/mo — enter to refine`}
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Emergency Fund (months)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={12}
              value={savingsMonths}
              onChange={e => setSavingsMonths(Number(e.target.value))}
              className="flex-1 accent-emerald-500"
              aria-label="Emergency fund in months of expenses"
            />
            <span className="w-8 text-sm font-black text-center">{savingsMonths}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {savingsMonths === 0 ? '⚠ No buffer'
              : savingsMonths < impact.monthsOfRunwayNeeded ? '⚠ Below your role’s search length'
              : '✓ Covers the typical search'}
          </p>
        </div>
      </div>

      {/* Key impact metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Income Gap',
            value: fmt(impact.incomeLossMed),
            sub: `${weeksData.median}-wk median search`,
            color: 'text-amber-400',
            icon: <Clock className="w-4 h-4" />,
          },
          {
            label: 'Total Layoff Cost',
            value: fmt(impact.totalCostMedian),
            sub: 'living + benefits + search',
            color: 'text-red-400',
            icon: <TrendingDown className="w-4 h-4" />,
          },
          {
            label: 'Panic Discount',
            value: fmt(impact.salaryDiscountOnPanic),
            sub: 'avg under-offer if rushed',
            color: 'text-orange-400',
            icon: <DollarSign className="w-4 h-4" />,
          },
          {
            label: 'Expected Cost',
            value: fmt(expectedCost),
            sub: `risk-weighted (${layoffProbability}%${probabilityIsEngine ? '' : ' est.'})`,
            color: 'text-violet-400',
            icon: <Shield className="w-4 h-4" />,
          },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-panel p-3 space-y-1"
          >
            <div className={`flex items-center gap-1.5 ${metric.color}`}>
              {metric.icon}
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{metric.label}</span>
            </div>
            <p className={`text-xl font-black tracking-tight ${metric.color}`}>{metric.value}</p>
            <p className="text-[9px] text-muted-foreground">{metric.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Probability source disclosure — keeps the card honest + consistent */}
      <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span>
          {probabilityIsEngine
            ? `Expected cost uses your calibrated 12-month layoff probability (${layoffProbability}%) — the same figure as the "Your Odds" card above.`
            : `Expected cost uses a modelled probability (${layoffProbability}%) derived from your risk score. Add your financial context for a fuller model.`}
        </span>
      </div>

      {/* Emergency fund gap warning */}
      {isInsufficientRunway && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-300 mb-1">Insufficient Financial Runway</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your emergency fund covers {savingsMonths} month{savingsMonths !== 1 ? 's' : ''} of expenses, but the
                median search for your role takes {weeksData.median} weeks ({Math.ceil(weeksData.median / 4)} months),
                and the P75 case runs to {Math.ceil(weeksData.p75 / 4)} months.
                {impact.emergencyFundGap > 0 && ` You need approximately ${fmt(impact.emergencyFundGap)} more in liquid savings to reach a ${impact.monthsOfRunwayNeeded}-month buffer.`}
              </p>
              {impact.emergencyFundGap > 0 && (
                <p className="text-[10px] text-red-300/70 mt-1 font-semibold">
                  Gap to close: {fmt(impact.emergencyFundGap)} · Saving {fmt(impact.monthlySavingsToClose)}/month closes it in {impact.monthsToClose} month{impact.monthsToClose !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed breakdown */}
      <div>
        <button
          onClick={() => setShowDetails(d => !d)}
          className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-white transition-colors"
        >
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showDetails ? 'Hide' : 'Show'} cost breakdown
        </button>

        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 rounded-xl border border-white/8 overflow-hidden"
          >
            <div className="p-4 space-y-2 text-[11px]">
              {[
                { label: `Living costs (${weeksData.median}-week median search × ${fmt(impact.monthlyBurn)}/mo)`, value: fmt(impact.incomeLossMed) },
                { label: `Benefits lost (${benefitsLabel(currency)} — ${Math.ceil(weeksData.median / 4)} months)`, value: fmt(impact.benefitsLossMonthly * Math.ceil(weeksData.median / 4)) },
                { label: 'Job search costs (services, premium listings, travel)', value: fmt(impact.jobSearchCosts) },
                { label: 'Panic-acceptance salary discount (year 1 only)', value: fmt(impact.salaryDiscountOnPanic), note: 'Avoidable with adequate runway' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-white/5 gap-3">
                  <span className="text-muted-foreground">{row.label}</span>
                  <div className="text-right flex-shrink-0">
                    <span className="font-semibold">{row.value}</span>
                    {row.note && <span className="block text-[9px] text-emerald-400">{row.note}</span>}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold">Total (P75 scenario)</span>
                <span className="font-black text-red-400">{fmt(impact.totalCostP75)}</span>
              </div>
            </div>
            <div className="px-4 py-3 bg-white/[0.015] border-t border-white/6">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                P75 = 75th-percentile search duration for your role. The panic discount is largely avoidable:
                candidates with 3+ months of runway can decline low offers and wait for the right role.
                Figures are MODELED estimates in {meta.name} from pooled reemployment data and your reported
                income / expenses — not live market data.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FinancialImpactCalculator;
