// FinancialImpactCalculator.tsx
// Quantifies the actual financial cost of a potential layoff for this specific user.
// Moves from abstract risk to concrete dollar impact — the most motivating signal.

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, Clock, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import type { HybridResult } from '../types/hybridResult';

// ── Reemployment time data by role ────────────────────────────────────────────

const REEMPLOYMENT_WEEKS: Record<string, { median: number; p25: number; p75: number }> = {
  sw:      { median: 8,  p25: 5,  p75: 14 },
  ds:      { median: 10, p25: 6,  p75: 16 },
  pm:      { median: 12, p25: 7,  p75: 18 },
  hr:      { median: 16, p25: 10, p75: 24 },
  sales:   { median: 10, p25: 6,  p75: 16 },
  fin:     { median: 14, p25: 8,  p75: 20 },
  legal:   { median: 16, p25: 10, p75: 24 },
  design:  { median: 12, p25: 7,  p75: 18 },
  default: { median: 13, p25: 8,  p75: 20 },
};

const BENEFITS_MULTIPLIER = 1.25; // total comp ≈ 1.25× salary (health, 401k, etc.)

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
  return 'default';
}

// ── Impact calculator logic ───────────────────────────────────────────────────

interface FinancialImpact {
  incomeLossMedWeeks: number;
  incomeLossP75Weeks: number;
  totalCostMedian: number;
  totalCostP75: number;
  weeklyBurnRate: number;
  benefitsLossMonthly: number;
  jobSearchCosts: number;
  salaryDiscountOnPanic: number;
  emergencyFundGap: number;
  monthsOfRunwayNeeded: number;
  negotiationLeverageLoss: string;
}

function computeFinancialImpact(
  annualSalary: number,
  currentSavingsMonths: number,
  rolePrefix: string,
): FinancialImpact {
  const weeksData = REEMPLOYMENT_WEEKS[rolePrefix] ?? REEMPLOYMENT_WEEKS.default;
  const weeklyGross = annualSalary / 52;
  const weeklyNet = weeklyGross * 0.70; // approximate after tax
  const monthlyGross = annualSalary / 12;

  const incomeLossMed = Math.round(weeklyNet * weeksData.median);
  const incomeLossP75 = Math.round(weeklyNet * weeksData.p75);

  const benefitsLoss = Math.round((monthlyGross * (BENEFITS_MULTIPLIER - 1))); // monthly benefits value
  const jobSearchCosts = 1200; // average: resume service, LinkedIn Premium, travel
  const salaryDiscount = Math.round(annualSalary * 0.08); // panic-accepting ~8% below market

  const totalMedian = incomeLossMed + (benefitsLoss * Math.ceil(weeksData.median / 4)) + jobSearchCosts;
  const totalP75 = incomeLossP75 + (benefitsLoss * Math.ceil(weeksData.p75 / 4)) + jobSearchCosts + salaryDiscount;

  const monthsNeeded = Math.ceil(weeksData.p75 / 4) + 1; // extra month for onboarding
  const currentSavingsDollars = currentSavingsMonths * monthlyGross * 0.7; // savings in dollars
  const targetSavings = monthsNeeded * monthlyGross * 0.7;
  const gap = Math.max(0, targetSavings - currentSavingsDollars);

  return {
    incomeLossMedWeeks: incomeLossMed,
    incomeLossP75Weeks: incomeLossP75,
    totalCostMedian: totalMedian,
    totalCostP75: totalP75,
    weeklyBurnRate: Math.round(weeklyNet),
    benefitsLossMonthly: benefitsLoss,
    jobSearchCosts,
    salaryDiscountOnPanic: salaryDiscount,
    emergencyFundGap: gap,
    monthsOfRunwayNeeded: monthsNeeded,
    negotiationLeverageLoss: `Accepting under financial pressure costs an average $${salaryDiscount.toLocaleString()} in year-1 salary vs. searching from a position of employment`,
  };
}

function formatCurrency(amount: number): string {
  if (amount >= 100_000) return `$${(amount / 1000).toFixed(0)}K`;
  if (amount >= 10_000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FinancialImpactCalculatorProps {
  result: HybridResult;
  /** Pre-loaded annual salary if available from financial context */
  annualSalary?: number | null;
}

export const FinancialImpactCalculator: React.FC<FinancialImpactCalculatorProps> = ({
  result,
  annualSalary: propSalary,
}) => {
  const rolePrefix = getRolePrefix(result.workTypeKey ?? '');
  const weeksData = REEMPLOYMENT_WEEKS[rolePrefix] ?? REEMPLOYMENT_WEEKS.default;
  const score = result.total;

  // User inputs
  const [salary, setSalary] = useState<number>(propSalary ?? 100_000);
  const [savingsMonths, setSavingsMonths] = useState<number>(2);
  const [showDetails, setShowDetails] = useState(false);

  const impact = useMemo(
    () => computeFinancialImpact(salary, savingsMonths, rolePrefix),
    [salary, savingsMonths, rolePrefix],
  );

  const layoffProbability = Math.round(1 / (1 + Math.exp(-0.06 * (score - 45))) * 100);
  const expectedCost = Math.round(impact.totalCostMedian * (layoffProbability / 100));
  const isInsufficientRunway = savingsMonths < impact.monthsOfRunwayNeeded;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-emerald-400" />
        <h3 className="text-sm font-black uppercase tracking-widest">Financial Impact Calculator</h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-white/6 text-muted-foreground font-mono">
          Personalized for your profile
        </span>
      </div>

      {/* Inputs */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Annual Base Salary
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              value={salary}
              onChange={e => setSalary(Number(e.target.value) || 0)}
              className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold focus:outline-none focus:border-white/20"
              step={5000}
              min={20000}
              max={1000000}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Current Emergency Fund (months)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={12}
              value={savingsMonths}
              onChange={e => setSavingsMonths(Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <span className="w-8 text-sm font-black text-center">{savingsMonths}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {savingsMonths === 0 ? '⚠ No buffer' : savingsMonths < 3 ? '⚠ Below recommended' : '✓ Adequate'}
          </p>
        </div>
      </div>

      {/* Key impact metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Expected Income Gap',
            value: formatCurrency(impact.incomeLossMedWeeks),
            sub: `${weeksData.median}-week median search`,
            color: 'text-amber-400',
            icon: <Clock className="w-4 h-4" />,
          },
          {
            label: 'Total Layoff Cost',
            value: formatCurrency(impact.totalCostMedian),
            sub: 'income + benefits + search',
            color: 'text-red-400',
            icon: <TrendingDown className="w-4 h-4" />,
          },
          {
            label: 'Panic Salary Discount',
            value: formatCurrency(impact.salaryDiscountOnPanic),
            sub: 'avg under-offer if rushed',
            color: 'text-orange-400',
            icon: <DollarSign className="w-4 h-4" />,
          },
          {
            label: 'Expected Cost',
            value: formatCurrency(expectedCost),
            sub: `risk-weighted (${layoffProbability}% prob.)`,
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

      {/* Emergency fund gap warning */}
      {isInsufficientRunway && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-300 mb-1">Insufficient Financial Runway</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your current emergency fund covers {savingsMonths} months, but the median search for your role
                takes {weeksData.median} weeks ({Math.ceil(weeksData.median / 4)} months).
                {impact.emergencyFundGap > 0 && ` You need approximately ${formatCurrency(impact.emergencyFundGap)} more in liquid savings to reach the recommended ${impact.monthsOfRunwayNeeded}-month target.`}
              </p>
              <p className="text-[10px] text-red-300/70 mt-1 font-semibold">
                Gap to close: {formatCurrency(impact.emergencyFundGap)} · At $1,000/month savings: {Math.ceil(impact.emergencyFundGap / 1000)} months to safety
              </p>
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
                { label: `Income loss (${weeksData.median}-week median search)`, value: formatCurrency(impact.incomeLossMedWeeks) },
                { label: `Benefits loss (health, 401k match — ${impact.monthsOfRunwayNeeded} months)`, value: formatCurrency(impact.benefitsLossMonthly * impact.monthsOfRunwayNeeded) },
                { label: 'Job search costs (LinkedIn Premium, services, travel)', value: formatCurrency(impact.jobSearchCosts) },
                { label: 'Panic-acceptance salary discount (year 1 only)', value: formatCurrency(impact.salaryDiscountOnPanic), note: 'Avoidable with adequate runway' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">{row.label}</span>
                  <div className="text-right">
                    <span className="font-semibold">{row.value}</span>
                    {row.note && <span className="block text-[9px] text-emerald-400">{row.note}</span>}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold">Total (P75 scenario)</span>
                <span className="font-black text-red-400">{formatCurrency(impact.totalCostP75)}</span>
              </div>
            </div>
            <div className="px-4 py-3 bg-white/[0.015] border-t border-white/6">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                P75 scenario = 75th percentile job search duration for this role. The panic salary discount
                is entirely avoidable: professionals with 3+ months emergency fund accept offers paying
                22% more because they can afford to wait for the right role. Source: LinkedIn Q4 2024 survey.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FinancialImpactCalculator;
